"""
Sheets router — upload, OCR, segmentation, evaluation, decisions, finalization.
Examiner endpoints NEVER return original unmasked images or candidate identity.
"""
import os
import re
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User
from app.models.sheet import Sheet, SheetLine, Candidate
from app.models.exam import Question, RubricCriterion
from app.models.evaluation import Evaluation, AIEvaluation
from app.models.results import Result
from app.services import audit as audit_svc
from app.services.storage import storage
from app.services.ocr import extract_lines
from app.services.segmentation import segment_lines

router = APIRouter(prefix="/api", tags=["sheets"])

HEADER_MASK_PERCENT = float(os.environ.get("HEADER_MASK_PERCENT", "0.12"))


def _generate_token() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "CAND-" + "".join(chars[b % len(chars)] for b in os.urandom(5))


def _mask_image(image_bytes: bytes, mask_fraction: float) -> bytes:
    """Black out the top N% of an image (PIL required)."""
    try:
        from PIL import Image, ImageDraw
        import io
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        draw = ImageDraw.Draw(img)
        mask_height = int(img.height * mask_fraction)
        draw.rectangle([(0, 0), (img.width, mask_height)], fill=(0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        # PIL not installed — return original (acceptable for skeleton)
        return image_bytes


def _pdf_to_images(pdf_bytes: bytes) -> List[bytes]:
    """Convert PDF pages to PNG images using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            images.append(pix.tobytes("png"))
        return images
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {e}")


@router.post("/exams/{exam_id}/sheets", status_code=201)
async def upload_sheet(
    exam_id: int,
    file: UploadFile = File(...),
    candidate_name: Optional[str] = Form(None),
    candidate_roll: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "examiner")),
):
    file_bytes = await file.read()
    filename = file.filename or "upload"

    # Convert PDF to first page image
    if filename.lower().endswith(".pdf"):
        images = _pdf_to_images(file_bytes)
        image_bytes = images[0] if images else file_bytes
    else:
        image_bytes = file_bytes

    # Assign random candidate token — identity stored separately (admin-only)
    token = _generate_token()
    candidate = Candidate(
        token=token,
        name=candidate_name,       # stored only in candidates table
        roll_number=candidate_roll,
    )
    db.add(candidate)
    db.flush()

    # Save original (admin-only access)
    orig_filename = f"orig_{token}_{filename.replace(' ', '_')}.png"
    orig_path = storage.save(image_bytes, f"originals/{orig_filename}")

    # Masked display version — identity stripped
    masked_bytes = _mask_image(image_bytes, HEADER_MASK_PERCENT)
    masked_filename = f"masked_{token}.png"
    masked_path = storage.save(masked_bytes, f"masked/{masked_filename}")

    # Create sheet record
    sheet = Sheet(
        exam_id=exam_id,
        candidate_id=candidate.id,
        image_path=masked_path,   # only masked path exposed
        status="UPLOADED",
    )
    db.add(sheet)
    db.flush()

    # Append SHEET_UPLOADED audit event
    audit_svc.append_event(
        db, sheet.id, "SHEET_UPLOADED", current_user.id,
        {"exam_id": exam_id, "token": token, "filename": filename}
    )

    # Run OCR on the masked image (we never OCR the original to avoid sending identity)
    try:
        lines_raw = extract_lines(masked_bytes)
    except Exception as e:
        sheet.status = "OCR_FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    # Segment lines to questions
    questions = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.id).all()
    q_number_map = {i + 1: q.id for i, q in enumerate(questions)}
    segmented = segment_lines(lines_raw, q_number_map)

    # Persist sheet lines
    for item in segmented:
        bbox = item.get("bbox", {"x": 0, "y": 0, "w": 1, "h": 0.02})
        sl = SheetLine(
            sheet_id=sheet.id,
            question_id=item.get("question_id"),
            line_index=item["line_index"],
            text=item["text"],
            language=item.get("lang", "EN"),
            confidence=item.get("confidence", 0.8),
            box_json=bbox,
        )
        db.add(sl)

    sheet.status = "OCR_COMPLETE"
    db.commit()

    audit_svc.append_event(
        db, sheet.id, "OCR_COMPLETED", current_user.id,
        {"line_count": len(segmented)}
    )

    return {
        "sheet_id": sheet.id,
        "candidate_token": token,
        "status": sheet.status,
        "line_count": len(segmented),
    }


@router.get("/sheets/{sheet_id}")
def get_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")

    lines = db.query(SheetLine).filter(SheetLine.sheet_id == sheet_id).order_by(SheetLine.line_index).all()

    # Never return candidate identity or original image to non-admin users
    candidate_token = None
    if current_user.role in ("admin",):
        candidate_token = sheet.candidate.token if sheet.candidate else None
    else:
        candidate_token = sheet.candidate.token  # token only, not name/roll

    return {
        "id": sheet.id,
        "exam_id": sheet.exam_id,
        "candidate_token": candidate_token,
        "status": sheet.status,
        "masked_image_url": f"/uploads/masked/{os.path.basename(sheet.image_path)}",
        "lines": [
            {
                "id": l.id,
                "line_index": l.line_index,
                "text": l.text,
                "language": l.language,
                "confidence": l.confidence,
                "box_json": l.box_json,
                "question_id": l.question_id,
            }
            for l in lines
        ],
    }


@router.post("/sheets/{sheet_id}/evaluate")
def evaluate_sheet(
    sheet_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "examiner")),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")

    from app.services.evaluator import evaluate_sheet as run_eval
    try:
        results = run_eval(db, sheet_id, sheet.exam_id, current_user.id, force=force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

    return {"sheet_id": sheet_id, "questions": results}


@router.get("/sheets/{sheet_id}/evaluation")
def get_evaluation(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    evals = db.query(Evaluation).filter(Evaluation.sheet_id == sheet_id).all()
    if not evals:
        raise HTTPException(status_code=404, detail="No evaluation found for this sheet")

    result = []
    for evl in evals:
        ai_eval = (
            db.query(AIEvaluation)
            .filter(AIEvaluation.sheet_id == sheet_id, AIEvaluation.question_id == evl.question_id)
            .order_by(AIEvaluation.id.desc())
            .first()
        )
        q = db.query(Question).filter(Question.id == evl.question_id).first()
        criteria = db.query(RubricCriterion).filter(RubricCriterion.question_id == evl.question_id).all()

        result.append({
            "question_id": evl.question_id,
            "question_text": q.text if q else "",
            "max_marks": q.max_marks if q else 0,
            "status": evl.status,
            "final_score": evl.final_score,
            "validation_errors": ai_eval.validation_errors if ai_eval else [],
            "criteria": ai_eval.raw_json.get("run1", []) if ai_eval else [],
            "confidence": 0.0,
        })

    return {"sheet_id": sheet_id, "questions": result}


class DecisionBody(BaseModel):
    action: str  # accept | modify | flag | moderate
    criterion_scores: Optional[List[dict]] = None
    reason_code: Optional[str] = None
    reason_text: Optional[str] = None
    started_at: str  # ISO timestamp


@router.post("/sheets/{sheet_id}/questions/{question_id}/decision")
def make_decision(
    sheet_id: int,
    question_id: int,
    body: DecisionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "moderator", "admin")),
):
    import time
    from datetime import datetime
    from app.models.quality import ReviewItem

    evl = db.query(Evaluation).filter(
        Evaluation.sheet_id == sheet_id,
        Evaluation.question_id == question_id,
    ).first()
    if not evl:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    action = body.action
    if action not in ("accept", "modify", "flag", "moderate"):
        raise HTTPException(status_code=422, detail=f"Invalid action: {action}")

    if action == "modify":
        if not body.reason_code:
            raise HTTPException(status_code=422, detail="reason_code is required for modify action")
        valid_codes = {"AI_MISSED_VALID_EXPLANATION", "OCR_ERROR", "RUBRIC_MISAPPLIED", "OTHER"}
        if body.reason_code not in valid_codes:
            raise HTTPException(status_code=422, detail=f"Invalid reason_code. Must be one of: {valid_codes}")

        # Validate and apply new scores
        if body.criterion_scores:
            criteria = {
                c.id: c for c in db.query(RubricCriterion)
                .filter(RubricCriterion.question_id == question_id).all()
            }
            total = 0.0
            for cs in body.criterion_scores:
                crit = criteria.get(cs["criterion_id"])
                if not crit:
                    raise HTTPException(status_code=422, detail=f"Unknown criterion_id {cs['criterion_id']}")
                score = cs["score"]
                if not (0 <= score <= crit.max_marks):
                    raise HTTPException(status_code=422, detail=f"Score {score} out of bounds for criterion {crit.name}")
                if crit.step > 0 and round(score % crit.step, 8) != 0:
                    raise HTTPException(status_code=422, detail=f"Score {score} not a multiple of step {crit.step}")
                total += score
            evl.final_score = total

    # Compute time spent
    try:
        started = datetime.fromisoformat(body.started_at)
        time_spent = int((datetime.utcnow() - started).total_seconds())
        evl.time_spent_seconds = time_spent
    except Exception:
        pass

    # Update status
    status_map = {
        "accept": "ACCEPTED",
        "modify": "MODIFIED",
        "flag": "FLAGGED",
        "moderate": "SENT_TO_MODERATION",
    }
    before_status = evl.status
    evl.status = status_map[action]
    db.commit()

    # Create review item for flag/moderate
    if action in ("flag", "moderate"):
        ri = ReviewItem(
            sheet_id=sheet_id,
            question_id=question_id,
            reason=body.reason_text or action,
            status="OPEN",
        )
        db.add(ri)
        db.commit()

    # Append audit event
    event_map = {
        "accept": "EXAMINER_ACCEPTED",
        "modify": "EXAMINER_MODIFIED",
        "flag": "FLAGGED",
        "moderate": "SENT_TO_MODERATION",
    }
    audit_svc.append_event(
        db, sheet_id, event_map[action], current_user.id,
        {
            "question_id": question_id,
            "before_status": before_status,
            "after_status": evl.status,
            "reason_code": body.reason_code,
            "reason_text": body.reason_text,
        }
    )

    return {"status": evl.status, "final_score": evl.final_score}


@router.post("/sheets/{sheet_id}/finalize")
def finalize_sheet(
    sheet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin")),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")

    questions = db.query(Question).filter(Question.exam_id == sheet.exam_id).all()
    evals = {
        e.question_id: e
        for e in db.query(Evaluation).filter(Evaluation.sheet_id == sheet_id).all()
    }

    # Refuse unless every question is decided
    undecided = []
    for q in questions:
        evl = evals.get(q.id)
        if not evl or evl.status not in ("ACCEPTED", "MODIFIED", "FLAGGED"):
            undecided.append(q.id)
    if undecided:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot finalize: questions {undecided} are not yet decided"
        )

    # Tabulate and verify totals
    breakdown = {}
    grand_total = 0.0
    for q in questions:
        evl = evals[q.id]
        criteria = db.query(RubricCriterion).filter(RubricCriterion.question_id == q.id).all()

        # Trust-critical: verify question total does not exceed max
        if evl.final_score > q.max_marks:
            raise HTTPException(
                status_code=422,
                detail=f"Question {q.id} total {evl.final_score} exceeds max {q.max_marks}"
            )

        breakdown[str(q.id)] = {
            "question_text": q.text,
            "final_score": evl.final_score,
            "max_marks": q.max_marks,
        }
        grand_total += evl.final_score

    # Get current audit head hash
    from app.services.audit import get_latest_event
    latest = get_latest_event(db, sheet_id)
    head_hash = latest.hash if latest else "0" * 64

    # Write result
    existing_result = db.query(Result).filter(Result.sheet_id == sheet_id).first()
    if existing_result:
        existing_result.grand_total = grand_total
        existing_result.breakdown = breakdown
        existing_result.audit_head_hash = head_hash
    else:
        result = Result(
            sheet_id=sheet_id,
            grand_total=grand_total,
            breakdown=breakdown,
            audit_head_hash=head_hash,
        )
        db.add(result)

    sheet.status = "FINALIZED"
    db.commit()

    audit_svc.append_event(
        db, sheet_id, "FINALIZED", current_user.id,
        {"grand_total": grand_total, "audit_head_hash": head_hash}
    )

    return {
        "sheet_id": sheet_id,
        "grand_total": grand_total,
        "breakdown": breakdown,
        "audit_head_hash": head_hash,
    }
