"""
Exam, Question, and Rubric management endpoints.
Writes are restricted to admin role only.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import require_role, get_current_user
from app.models.exam import Exam, Question, RubricCriterion
from app.models.user import User

router = APIRouter(prefix="/api", tags=["exams"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = ""

class QuestionCreate(BaseModel):
    text: str
    max_marks: float

class CriterionCreate(BaseModel):
    name: str
    description: str
    max_marks: float
    step: float
    order: int
    model_answer: Optional[str] = ""

class RubricCreate(BaseModel):
    criteria: List[CriterionCreate]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/exams", status_code=201)
def create_exam(
    body: ExamCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    exam = Exam(title=body.title, description=body.description)
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get("/exams")
def list_exams(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(Exam).all()


@router.get("/exams/{exam_id}")
def get_exam(exam_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


@router.post("/exams/{exam_id}/questions", status_code=201)
def create_question(
    exam_id: int,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    q = Question(exam_id=exam_id, text=body.text, max_marks=body.max_marks)
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.post("/questions/{question_id}/rubric", status_code=201)
def set_rubric(
    question_id: int,
    body: RubricCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # ── Trust-critical validation: criterion marks must sum to question max ──
    total = sum(c.max_marks for c in body.criteria)
    if round(total, 6) != round(question.max_marks, 6):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Sum of criterion max_marks ({total}) must equal "
                f"question max_marks ({question.max_marks})."
            ),
        )

    # Delete existing criteria and replace
    db.query(RubricCriterion).filter(RubricCriterion.question_id == question_id).delete()

    for c in body.criteria:
        criterion = RubricCriterion(
            question_id=question_id,
            name=c.name,
            description=c.description,
            max_marks=c.max_marks,
            step=c.step,
            order=c.order,
            model_answer=c.model_answer,
        )
        db.add(criterion)

    db.commit()
    criteria = db.query(RubricCriterion).filter(RubricCriterion.question_id == question_id).all()
    return {"question_id": question_id, "criteria": criteria}
