from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import Base

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    roll_number = Column(String)

class Sheet(Base):
    __tablename__ = "sheets"
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    image_path = Column(String, nullable=False)
    status = Column(String, nullable=False)
    total_score = Column(Float)

    candidate = relationship("Candidate")
    lines = relationship("SheetLine", back_populates="sheet")

class SheetLine(Base):
    __tablename__ = "sheet_lines"
    id = Column(Integer, primary_key=True, index=True)
    sheet_id = Column(Integer, ForeignKey("sheets.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    line_index = Column(Integer, nullable=False)
    text = Column(String, nullable=False)
    language = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    box_json = Column(JSONB, nullable=False)

    sheet = relationship("Sheet", back_populates="lines")
