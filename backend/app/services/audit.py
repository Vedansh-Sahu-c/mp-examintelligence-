import hashlib
import json
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent

def canonical_json(payload: Dict[str, Any]) -> str:
    """Canonicalize JSON payload (sorted keys, no whitespace)."""
    return json.dumps(payload, sort_keys=True, separators=(',', ':'))

def compute_hash(prev_hash: str, payload: Dict[str, Any]) -> str:
    """Compute SHA256 of prev_hash + canonical_json(payload)."""
    data = prev_hash + canonical_json(payload)
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def get_latest_event(db: Session, sheet_id: int) -> Optional[AuditEvent]:
    return db.query(AuditEvent).filter(AuditEvent.sheet_id == sheet_id).order_by(AuditEvent.seq.desc()).first()

def append_event(db: Session, sheet_id: int, event_type: str, actor_id: Optional[int], payload: Dict[str, Any]) -> AuditEvent:
    latest = get_latest_event(db, sheet_id)
    
    seq = 1
    prev_hash = "0" * 64
    
    if latest:
        seq = latest.seq + 1
        prev_hash = latest.hash
        
    current_hash = compute_hash(prev_hash, payload)
    
    event = AuditEvent(
        sheet_id=sheet_id,
        seq=seq,
        event_type=event_type,
        actor_id=actor_id,
        payload=payload,
        prev_hash=prev_hash,
        hash=current_hash
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def verify_chain(db: Session, sheet_id: int) -> Dict[str, Any]:
    events = db.query(AuditEvent).filter(AuditEvent.sheet_id == sheet_id).order_by(AuditEvent.seq.asc()).all()
    
    if not events:
        return {"valid": True, "checked": 0, "first_broken_seq": None, "reason": "No events"}
        
    expected_prev = "0" * 64
    
    for i, event in enumerate(events):
        if event.prev_hash != expected_prev:
            return {"valid": False, "checked": i, "first_broken_seq": event.seq, "reason": f"prev_hash mismatch at seq {event.seq}"}
            
        computed = compute_hash(event.prev_hash, event.payload)
        if event.hash != computed:
            return {"valid": False, "checked": i, "first_broken_seq": event.seq, "reason": f"hash mismatch at seq {event.seq}"}
            
        expected_prev = event.hash
        
    return {"valid": True, "checked": len(events), "first_broken_seq": None, "reason": None}
