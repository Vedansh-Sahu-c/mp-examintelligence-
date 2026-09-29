from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.audit import verify_chain
from typing import Dict, Any

router = APIRouter(prefix="/api/sheets/{id}/audit", tags=["audit"])

@router.get("/verify")
def verify_sheet_chain(id: int, db: Session = Depends(get_db)):
    result = verify_chain(db, id)
    if not result:
        raise HTTPException(status_code=404, detail="Sheet audit trail not found")
    return result

@router.get("")
def get_sheet_audit_trail(id: int, db: Session = Depends(get_db)):
    from app.models.audit import AuditEvent
    events = db.query(AuditEvent).filter(AuditEvent.sheet_id == id).order_by(AuditEvent.seq.asc()).all()
    return events
