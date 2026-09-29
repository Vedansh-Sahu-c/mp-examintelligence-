from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    text = Column(String, nullable=False)
    max_marks = Column(Float, nullable=False)

    exam = relationship("Exam")
    rubric_criteria = relationship("RubricCriterion", back_populates="question")

class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    max_marks = Column(Float, nullable=False)
    step = Column(Float, nullable=False)
    order = Column(Integer, nullable=False)
    model_answer = Column(String)

    question = relationship("Question", back_populates="rubric_criteria")
