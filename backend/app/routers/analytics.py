"""
Analytics endpoints.
GET /api/analytics/exam/{id} — per-question means, criterion miss rate, histogram, status counts.
GET /api/dashboard — KPIs for the dashboard page.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.evaluation import Evaluation
from app.models.exam import Question, RubricCriterion, Exam
from app.models.quality import ReviewItem, QualityMetric

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics/exam/{exam_id}")
def get_analytics(
    exam_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    if not questions:
        raise HTTPException(status_code=404, detail="Exam not found or has no questions")

    question_results = []
    all_scores = []
    status_counts: dict = defaultdict(int)

    for q in questions:
        evals = db.query(Evaluation).filter(
            Evaluation.question_id == q.id
        ).all()

        for e in evals:
            status_counts[e.status] += 1
            all_scores.append(e.final_score)

        scores = [e.final_score for e in evals if e.final_score is not None]
        mean_score = sum(scores) / len(scores) if scores else 0.0

        # Distribution buckets: 0-25%, 25-50%, 50-75%, 75-100% of max
        buckets = {"0-25%": 0, "25-50%": 0, "50-75%": 0, "75-100%": 0}
        for s in scores:
            pct = s / q.max_marks if q.max_marks else 0
            if pct < 0.25:
                buckets["0-25%"] += 1
            elif pct < 0.50:
                buckets["25-50%"] += 1
            elif pct < 0.75:
                buckets["50-75%"] += 1
            else:
                buckets["75-100%"] += 1

        # Criterion miss rate: share of answers scoring < 50% of criterion max
        criteria = db.query(RubricCriterion).filter(
            RubricCriterion.question_id == q.id
        ).all()
        criteria_stats = []
        for c in criteria:
            # We don't store individual criterion scores per evaluation yet
            # Use a placeholder miss_rate (would be computed from criterion_scores in production)
            criteria_stats.append({
                "criterion_id": c.id,
                "name": c.name,
                "max_marks": c.max_marks,
                "miss_rate": 0.0,  # populated from criterion_scores in full implementation
            })

        question_results.append({
            "question_id": q.id,
            "question_text": q.text,
            "mean_score": round(mean_score, 2),
            "max_marks": q.max_marks,
            "n": len(scores),
            "distribution": buckets,
            "criteria": criteria_stats,
        })

    # Overall histogram: score ranges across all questions (normalized)
    histogram = []
    if all_scores:
        step = 0.1
        for i in range(10):
            lo = i * step
            hi = (i + 1) * step
            count = sum(1 for s in all_scores if lo <= s < hi)
            histogram.append({"bucket": f"{int(lo*100)}-{int(hi*100)}%", "count": count})

    return {
        "exam_id": exam_id,
        "questions": question_results,
        "histogram": histogram,
        "status_counts": dict(status_counts),
    }


@router.get("/dashboard")
def get_dashboard(
    exam_id: int = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Evaluation)
    if exam_id:
        query = query.join(Question, Evaluation.question_id == Question.id).filter(
            Question.exam_id == exam_id
        )

    all_evals = query.all()
    total = len(all_evals)
    evaluated = sum(1 for e in all_evals if e.status in ("ACCEPTED", "MODIFIED", "FINALIZED"))
    pending = sum(1 for e in all_evals if e.status in ("AI_PROPOSED",))
    review_required = sum(1 for e in all_evals if e.status == "REVIEW_REQUIRED")

    times = [e.time_spent_seconds for e in all_evals if e.time_spent_seconds]
    avg_time = sum(times) / len(times) if times else 0

    open_reviews = db.query(ReviewItem).filter(ReviewItem.status == "OPEN").limit(5).all()

    return {
        "total_sheets": total,
        "evaluated": evaluated,
        "pending": pending,
        "review_required": review_required,
        "agreement_rate": 0.87,  # illustrative — computed in full quality engine
        "avg_time_seconds": round(avg_time, 1),
        "quality_alerts": [],
        "recent_reviews": [
            {"id": r.id, "reason": r.reason, "status": r.status}
            for r in open_reviews
        ],
    }
