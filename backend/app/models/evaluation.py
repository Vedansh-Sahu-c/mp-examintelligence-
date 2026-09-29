from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import Base

class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("sheets.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    raw_json = Column(JSONB, nullable=False)
    is_valid = Column(Boolean, nullable=False)
    validation_errors = Column(JSONB)
    
class CriterionScore(Base):
    __tablename__ = "criterion_scores"
    id = Column(Integer, primary_key=True, index=True)
    ai_eval_id = Column(Integer, ForeignKey("ai_evaluations.id"), nullable=False)
    rubric_criterion_id = Column(Integer, ForeignKey("rubric_criteria.id"), nullable=False)
    score = Column(Float, nullable=False)
    evidence_line_ids = Column(ARRAY(Integer), nullable=False)
    confidence_indicator = Column(Float, nullable=False)
    
class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("sheets.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    examiner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False)
    final_score = Column(Float, nullable=False)
    time_spent_seconds = Column(Integer)
