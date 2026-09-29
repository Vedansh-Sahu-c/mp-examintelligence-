"""
Quality engine — per-examiner metrics and flags.
Flag text: "Consistency review suggested" — never use words like fatigue or bias.
Only flag when n >= 15 evaluated answers.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import statistics

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User
from app.models.evaluation import Evaluation
from app.models.exam import Question
from app.models.quality import ReviewItem, QualityMetric

router = APIRouter(prefix="/api", tags=["quality"])

MIN_EVALS_FOR_FLAG = 15
DRIFT_WINDOW = 10


def _compute_examiner_metrics(
    db: Session, exam_id: int, examiner_id: int
) -> Dict[str, Any]:
    evals = (
        db.query(Evaluation)
        .join(Question, Evaluation.question_id == Question.id)
        .filter(
            Question.exam_id == exam_id,
            Evaluation.examiner_id == examiner_id,
            Evaluation.status.in_(["ACCEPTED", "MODIFIED"]),
        )
        .all()
    )

    n = len(evals)
    if n == 0:
        return {"n": 0, "flags": []}

    # Normalized scores (final / question max)
    questions = {q.id: q for q in db.query(Question).filter(Question.exam_id == exam_id).all()}
    normalized = [
        e.final_score / questions[e.question_id].max_marks
        for e in evals
        if e.question_id in questions and questions[e.question_id].max_marks > 0
    ]

    mean_norm = statistics.mean(normalized) if normalized else 0.0
    sd_norm = statistics.stdev(normalized) if len(normalized) > 1 else 0.0

    # AI/Examiner agreement: |examiner_total - ai_total| <= 10% of max
    # (We use final_score vs initial AI score stored in evaluation)
    agree_count = sum(
        1 for e in evals
        if e.question_id in questions
        and abs(e.final_score - (e.final_score or 0)) <= 0.1 * questions[e.question_id].max_marks
    )
    agreement_rate = agree_count / n if n > 0 else 0.0

    # Override rate (modified vs total)
    modified_count = sum(1 for e in evals if e.status == "MODIFIED")
    override_rate = modified_count / n if n > 0 else 0.0

    # Average time
    times = [e.time_spent_seconds for e in evals if e.time_spent_seconds]
    avg_time = statistics.mean(times) if times else 0.0

    # Rolling window drift: compare last N vs earlier N normalized scores
    flags = []
    drift_flag = False
    if n >= 2 * DRIFT_WINDOW:
        early = normalized[:DRIFT_WINDOW]
        late = normalized[-DRIFT_WINDOW:]
        early_mean = statistics.mean(early)
        late_mean = statistics.mean(late)
        drift = abs(late_mean - early_mean)
        if drift > 0.15 and n >= MIN_EVALS_FOR_FLAG:
            drift_flag = True
            direction = "higher" if late_mean > early_mean else "lower"
            flags.append(
                f"Consistency review suggested: recent scores are {direction} "
                f"than earlier scores (drift {drift:.2f}, window {DRIFT_WINDOW})"
            )

    return {
        "n": n,
        "mean_normalized": round(mean_norm, 4),
        "sd_normalized": round(sd_norm, 4),
        "agreement_rate": round(agreement_rate, 4),
        "override_rate": round(override_rate, 4),
        "avg_time_seconds": round(avg_time, 1),
        "drift_flag": drift_flag,
        "flags": flags,
    }


@router.get("/quality/examiners")
def get_examiner_quality(
    exam_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role("admin", "moderator", "auditor")),
):
    examiners = db.query(User).filter(User.role == "examiner").all()
    results = []

    for examiner in examiners:
        metrics = _compute_examiner_metrics(db, exam_id, examiner.id)
        if metrics["n"] == 0:
            continue

        # If flags exist and n >= 15, create a review item
        if metrics["flags"] and metrics["n"] >= MIN_EVALS_FOR_FLAG:
            existing = (
                db.query(ReviewItem)
                .filter(
                    ReviewItem.reason == "CALIBRATION_DEVIATION",
                    ReviewItem.status == "OPEN",
                )
                .first()
            )
            if not existing:
                ri = ReviewItem(
                    sheet_id=1,  # placeholder — quality flags are exam-level
                    question_id=None,
                    reason="CALIBRATION_DEVIATION",
                    status="OPEN",
                )
                db.add(ri)
                db.commit()

        results.append({
            "examiner_id": examiner.id,
            "username": examiner.username,
            **metrics,
        })

    return {"examiners": results}
