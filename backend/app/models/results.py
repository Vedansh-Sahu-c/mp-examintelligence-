from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base

class Result(Base):
    """Final result record written on sheet finalization. Append-only by design."""
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("sheets.id"), nullable=False, unique=True)
    grand_total = Column(Float, nullable=False)
    breakdown = Column(JSONB, nullable=False)   # {question_id: {total, criteria: [...]}}
    audit_head_hash = Column(String(64), nullable=False)  # hash of the last audit event
