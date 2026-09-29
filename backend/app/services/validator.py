"""
Deterministic validator — NO LLM calls.
Implements exactly the rules listed in SPEC.md under "Validator rules".
Returns {valid: bool, errors: list[str]}.
Never mutates or "fixes" the model output.
"""
from difflib import SequenceMatcher
from typing import Any, Dict, List


def _fuzzy_ratio(a: str, b: str) -> float:
    """SequenceMatcher ratio between two strings, case-insensitive."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def validate_evaluation(
    criterion_outputs: List[Dict[str, Any]],
    criteria_map: Dict[int, Dict[str, Any]],   # criterion_id -> {max_marks, step}
    line_map: Dict[int, str],                   # line_id -> ocr_text for this question
    question_max_marks: float,
) -> Dict[str, Any]:
    """
    Validate one question's AI evaluation output.

    Args:
        criterion_outputs: list of dicts matching the AI JSON schema.
        criteria_map: rubric criteria keyed by id with max_marks and step.
        line_map: OCR lines available for this question keyed by line id.
        question_max_marks: the question's total max marks.

    Returns:
        {"valid": bool, "errors": list[str]}
    """
    errors: List[str] = []
    total_score = 0.0

    for output in criterion_outputs:
        cid = output.get("criterion_id")
        verdict = output.get("verdict")
        score = output.get("score")
        evidence_ids = output.get("evidence_line_ids", [])
        quoted_texts = output.get("quoted_text", [])

        criterion = criteria_map.get(cid)
        if criterion is None:
            errors.append(f"Unknown criterion_id {cid}")
            continue

        max_marks = criterion["max_marks"]
        step = criterion["step"]

        # Rule 1: score bounds
        if score is None or not (0 <= score <= max_marks):
            errors.append(
                f"Criterion {cid}: score {score} out of bounds [0, {max_marks}]"
            )
        else:
            # Rule 2: score must be a multiple of the step
            if step > 0 and round(score % step, 8) != 0:
                errors.append(
                    f"Criterion {cid}: score {score} is not a multiple of step {step}"
                )
            total_score += score

        # Rule 3: met/partial requires evidence
        if verdict in ("met", "partial") and len(evidence_ids) == 0:
            errors.append(
                f"Criterion {cid}: verdict '{verdict}' requires at least one evidence_line_id"
            )

        # Rule 4: every evidence_line_id must exist in this question's lines
        for lid in evidence_ids:
            if lid not in line_map:
                errors.append(
                    f"Criterion {cid}: evidence_line_id {lid} does not exist in this question's lines"
                )

        # Rule 5: quoted_text must fuzzy-match (>=85%) the cited OCR lines
        for quote in quoted_texts:
            # Check if the quote matches any of the cited lines
            matched = any(
                _fuzzy_ratio(quote, line_map[lid]) >= 0.85
                for lid in evidence_ids
                if lid in line_map
            )
            if not matched:
                errors.append(
                    f"Criterion {cid}: quoted text '{quote[:40]}...' does not match cited OCR lines (threshold 85%)"
                )

    # Rule 6: sum of criterion scores must not exceed question max
    if round(total_score, 6) > round(question_max_marks, 6):
        errors.append(
            f"Sum of criterion scores ({total_score}) exceeds question max marks ({question_max_marks})"
        )

    return {"valid": len(errors) == 0, "errors": errors}
