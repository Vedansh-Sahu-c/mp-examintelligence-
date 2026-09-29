"""
Review queue router.
GET  /api/review-queue        — list open review items
POST /api/review-queue/{id}/resolve — resolve with required note (logged to audit)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User
from app.models.quality import ReviewItem
from app.services import audit as audit_svc

router = APIRouter(prefix="/api", tags=["review"])


class ResolveBody(BaseModel):
    note: str


@router.get("/review-queue")
def get_review_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(ReviewItem).order_by(ReviewItem.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "sheet_id": i.sheet_id,
            "question_id": i.question_id,
            "reason": i.reason,
            "status": i.status,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in items
    ]


@router.post("/review-queue/{item_id}/resolve")
def resolve_review_item(
    item_id: int,
    body: ResolveBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("moderator", "admin")),
):
    if not body.note or not body.note.strip():
        raise HTTPException(status_code=422, detail="A resolution note is required")

    item = db.query(ReviewItem).filter(ReviewItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    if item.status == "RESOLVED":
        raise HTTPException(status_code=409, detail="Already resolved")

    item.status = "RESOLVED"
    db.commit()

    # Log resolution note to audit trail
    audit_svc.append_event(
        db, item.sheet_id, "REVIEW_RESOLVED", current_user.id,
        {"review_item_id": item_id, "note": body.note, "reason": item.reason}
    )

    return {"status": "RESOLVED", "item_id": item_id}
