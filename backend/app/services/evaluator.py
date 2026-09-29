"""
AI Evaluation engine.
Calls Gemini twice per question (second run with higher temperature to measure agreement).
Validates output, computes confidence, persists results.

HARD RULES (from RULES.md):
- LLM never outputs coordinates — only cites line IDs.
- Never send candidate name/roll number to the LLM.
- Every result must pass the validator before reaching an examiner.
- Semantic similarity is a signal only, never the score.
"""
import json
import hashlib
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evaluation import AIEvaluation, CriterionScore, Evaluation
from app.models.sheet import SheetLine
from app.models.exam import RubricCriterion
from app.services.validator import validate_evaluation
from app.services.confidence import compute_confidence
from app.services.retrieval import top_k_lines, semantic_support_score
from app.services import audit as audit_svc

# Response cache: sha256(prompt_hash) -> evaluation result
_eval_cache: Dict[str, Any] = {}

CRITERION_PROMPT = """
You are an AI-assisted examiner evaluating a student's answer against a rubric criterion.
You have access to the answer's OCR lines. You must cite ONLY the line IDs provided.
Do NOT invent text. Do NOT output coordinates.
If the answer does not contain the required element, output verdict "missing" with empty arrays.
Evaluate the answer in whatever language it is written, against the English rubric.

Criterion: {criterion_name}
Description: {criterion_description}
Max marks: {max_marks} (step: {step})
Model answer excerpt: {model_answer}

OCR lines (cite by id):
{lines_text}

Return a single JSON object:
{{
  "criterion_id": {criterion_id},
  "verdict": "met" | "partial" | "missing",
  "score": <number, multiple of {step}, 0 to {max_marks}>,
  "evidence_line_ids": [<line ids cited>],
  "quoted_text": [<exact text from lines cited, max 25 words each>],
  "reason": "<one sentence, max 25 words>"
}}
"""


def _make_prompt(criterion: RubricCriterion, lines: List[Dict]) -> str:
    lines_text = "\n".join(
        f"[ID:{l['id']}] {l['text']}"
        for l in lines
    )
    return CRITERION_PROMPT.format(
        criterion_id=criterion.id,
        criterion_name=criterion.name,
        criterion_description=criterion.description,
        max_marks=criterion.max_marks,
        step=criterion.step,
        model_answer=criterion.model_answer or "(not provided)",
        lines_text=lines_text,
    )


def _call_gemini(prompt: str, temperature: float = 0.0) -> Dict:
    from google import genai
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[{"role": "user", "parts": [{"text": prompt}]}],
        config={"temperature": temperature},
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    return json.loads(raw)


def _prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode()).hexdigest()


def evaluate_sheet(
    db: Session,
    sheet_id: int,
    exam_id: int,
    actor_id: int,
    force: bool = False,
) -> List[Dict]:
    """
    Run AI evaluation for all questions in a sheet.
    Returns list of question evaluation summaries.
    """
    from app.models.exam import Question
    from app.models.sheet import Sheet

    sheet = db.query(Sheet).filter(Sheet.id == sheet_id).first()
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    results = []

    for question in questions:
        criteria = (
            db.query(RubricCriterion)
            .filter(RubricCriterion.question_id == question.id)
            .order_by(RubricCriterion.order)
            .all()
        )
        # Fetch OCR lines for this question only
        q_lines = (
            db.query(SheetLine)
            .filter(SheetLine.sheet_id == sheet_id, SheetLine.question_id == question.id)
            .order_by(SheetLine.line_index)
            .all()
        )
        line_dicts = [
            {"id": l.id, "text": l.text, "confidence": l.confidence, "box_json": l.box_json}
            for l in q_lines
        ]
        line_map = {l.id: l.text for l in q_lines}

        criterion_outputs_run1 = []
        criterion_outputs_run2 = []
        validation_ok = True
        validation_errors_all = []

        criteria_map = {
            c.id: {"max_marks": c.max_marks, "step": c.step}
            for c in criteria
        }

        for criterion in criteria:
            # Select relevant lines via retrieval (semantic signal only)
            relevant_lines = top_k_lines(
                f"{criterion.name}: {criterion.description}",
                line_dicts,
                k=10,
            )
            prompt = _make_prompt(criterion, relevant_lines)
            phash = _prompt_hash(prompt)

            try:
                # Run 1 (deterministic)
                if not force and phash in _eval_cache:
                    out1 = _eval_cache[phash]
                else:
                    out1 = _call_gemini(prompt, temperature=0.0)
                    _eval_cache[phash] = out1

                # Run 2 (slight temperature for agreement measurement)
                out2 = _call_gemini(prompt, temperature=0.3)

                criterion_outputs_run1.append(out1)
                criterion_outputs_run2.append(out2)

            except Exception as e:
                # Graceful failure: mark REVIEW_REQUIRED with clear error
                validation_ok = False
                validation_errors_all.append(
                    f"Criterion {criterion.id} ({criterion.name}): AI call failed — {str(e)[:120]}"
                )
                # Provide a safe stub output
                stub = {
                    "criterion_id": criterion.id,
                    "verdict": "missing",
                    "score": 0,
                    "evidence_line_ids": [],
                    "quoted_text": [],
                    "reason": "AI evaluation failed",
                }
                criterion_outputs_run1.append(stub)
                criterion_outputs_run2.append(stub)

        # Validate run 1 output
        val_result = validate_evaluation(
            criterion_outputs_run1, criteria_map, line_map, question.max_marks
        )
        if not val_result["valid"]:
            validation_ok = False
            validation_errors_all.extend(val_result["errors"])

        status = "AI_PROPOSED" if validation_ok else "REVIEW_REQUIRED"

        # Compute confidence indicator
        cited_ids = {
            lid
            for out in criterion_outputs_run1
            for lid in out.get("evidence_line_ids", [])
        }
        cited_confidences = [l.confidence for l in q_lines if l.id in cited_ids]
        run1_scores = {out["criterion_id"]: out["score"] for out in criterion_outputs_run1}
        run2_scores = {out["criterion_id"]: out["score"] for out in criterion_outputs_run2}
        semantic_sims = [
            semantic_support_score(
                c.description,
                [l.text for l in q_lines if l.id in {
                    lid for out in criterion_outputs_run1
                    if out["criterion_id"] == c.id
                    for lid in out.get("evidence_line_ids", [])
                }]
            )
            for c in criteria
        ]
        conf_result = compute_confidence(
            cited_line_confidences=cited_confidences,
            total_lines_in_question=len(q_lines),
            run1_scores=run1_scores,
            run2_scores=run2_scores,
            question_max_marks=question.max_marks,
            semantic_similarities=semantic_sims,
        )
        if not conf_result["above_threshold"]:
            status = "REVIEW_REQUIRED"
            validation_errors_all.append(
                f"Confidence indicator {conf_result['score']:.2f} below threshold 0.70"
            )

        # Persist AI evaluation
        ai_eval = AIEvaluation(
            sheet_id=sheet_id,
            question_id=question.id,
            raw_json={"run1": criterion_outputs_run1, "run2": criterion_outputs_run2},
            is_valid=validation_ok,
            validation_errors=validation_errors_all if not validation_ok else [],
        )
        db.add(ai_eval)
        db.flush()

        # Persist criterion scores (run 1 only, if valid)
        if validation_ok:
            for out in criterion_outputs_run1:
                cs = CriterionScore(
                    ai_eval_id=ai_eval.id,
                    rubric_criterion_id=out["criterion_id"],
                    score=out["score"],
                    evidence_line_ids=out.get("evidence_line_ids", []),
                    confidence_indicator=conf_result["score"],
                )
                db.add(cs)

        # Persist evaluation record
        total_ai = sum(out["score"] for out in criterion_outputs_run1)
        existing_eval = db.query(Evaluation).filter(
            Evaluation.sheet_id == sheet_id,
            Evaluation.question_id == question.id,
        ).first()
        if existing_eval:
            existing_eval.status = status
        else:
            evl = Evaluation(
                sheet_id=sheet_id,
                question_id=question.id,
                examiner_id=actor_id,
                status=status,
                final_score=total_ai,
            )
            db.add(evl)

        db.commit()

        # Append audit event
        audit_svc.append_event(
            db, sheet_id, "AI_PROPOSED", actor_id,
            {"question_id": question.id, "status": status, "ai_total": total_ai}
        )

        results.append({
            "question_id": question.id,
            "question_text": question.text,
            "max_marks": question.max_marks,
            "status": status,
            "validation_errors": validation_errors_all,
            "criteria": criterion_outputs_run1,
            "total_ai_score": total_ai,
            "confidence": conf_result["score"],
            "confidence_breakdown": conf_result["components"],
        })

    return results
