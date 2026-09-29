"""
Seed script — run once after docker-compose up.
Creates demo users, a sample exam from rubrics.json, and 120 synthetic evaluations
(Examiner C is planted lenient in the second half for quality engine testing).

All data is clearly synthetic and does not represent real candidates.
Run: python seed.py  (from /backend directory)
"""
import json
import sys
import os
import random
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal, engine
from app.models import Base
from app.models.user import User
from app.models.exam import Exam, Question, RubricCriterion
from app.models.sheet import Candidate, Sheet, SheetLine
from app.models.evaluation import Evaluation
from app.core.security import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_users():
    users = [
        {"username": "admin1",     "role": "admin"},
        {"username": "examiner1",  "role": "examiner"},
        {"username": "examiner2",  "role": "examiner"},
        {"username": "examiner3",  "role": "examiner"},  # Examiner C — planted lenient
        {"username": "moderator1", "role": "moderator"},
        {"username": "auditor1",   "role": "auditor"},
    ]
    created = []
    for u in users:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            user = User(
                username=u["username"],
                password_hash=get_password_hash("demo1234"),
                role=u["role"],
            )
            db.add(user)
            db.flush()
            created.append(user)
            print(f"  Created user: {u['username']} ({u['role']})")
        else:
            created.append(existing)
    db.commit()
    return {u.username: u for u in db.query(User).all()}


def seed_exam(users):
    rubrics_path = Path(__file__).parent.parent / "sample_data" / "rubrics.json"
    rubrics = json.loads(rubrics_path.read_text(encoding="utf-8"))

    existing = db.query(Exam).filter(Exam.title == "MPOnline Demo Exam 2026").first()
    if existing:
        print("  Exam already exists, skipping.")
        return existing

    exam = Exam(
        title="MPOnline Demo Exam 2026",
        description="Sample data (synthetic) — Prototype for MPOnline Idea & Innovation Hackathon 2026",
    )
    db.add(exam)
    db.flush()

    for r in rubrics:
        q = Question(exam_id=exam.id, text=r["question_text"], max_marks=r["max_marks"])
        db.add(q)
        db.flush()
        for c in r["criteria"]:
            crit = RubricCriterion(
                question_id=q.id,
                name=c["name"],
                description=c["description"],
                max_marks=c["max_marks"],
                step=c["step"],
                order=c["order"],
                model_answer=c.get("model_answer", ""),
            )
            db.add(crit)

    db.commit()
    print(f"  Created exam: {exam.title}")
    return exam


def seed_synthetic_evaluations(exam, users):
    """
    Generate 120 synthetic evaluated sheets across 3 examiners.
    Examiner C (examiner3) is planted to be noticeably lenient in the second half.
    All data is synthetic and clearly labeled.
    """
    examiner_ids = [
        users["examiner1"].id,
        users["examiner2"].id,
        users["examiner3"].id,  # examiner C
    ]
    questions = db.query(Question).filter(Question.exam_id == exam.id).all()

    existing_count = db.query(Evaluation).count()
    if existing_count >= 120:
        print("  Synthetic evaluations already seeded, skipping.")
        return

    random.seed(42)
    sheet_num = 0

    for examiner_idx, examiner_id in enumerate(examiner_ids):
        is_examiner_c = examiner_id == users["examiner3"].id

        for sheet_i in range(40):
            sheet_num += 1
            # Second half for examiner C = lenient
            is_lenient = is_examiner_c and sheet_i >= 20

            token = f"SYNTH-{sheet_num:04d}"
            candidate = Candidate(token=token, name=None, roll_number=None)
            db.add(candidate)
            db.flush()

            sheet = Sheet(
                exam_id=exam.id,
                candidate_id=candidate.id,
                image_path="synthetic",
                status="FINALIZED",
            )
            db.add(sheet)
            db.flush()

            for q in questions:
                # Normal distribution centered at 70%, lenient at 85%
                center = 0.85 if is_lenient else 0.70
                norm_score = max(0.0, min(1.0, random.gauss(center, 0.12)))
                final_score = round(norm_score * q.max_marks * 2) / 2  # round to 0.5

                evl = Evaluation(
                    sheet_id=sheet.id,
                    question_id=q.id,
                    examiner_id=examiner_id,
                    status="ACCEPTED",
                    final_score=final_score,
                    time_spent_seconds=random.randint(45, 300),
                )
                db.add(evl)

        db.commit()
        print(f"  Seeded 40 synthetic sheets for examiner {examiner_id}")

    print("  120 synthetic evaluations created (Examiner C planted lenient in second half).")


if __name__ == "__main__":
    print("Seeding database...")
    users = seed_users()
    exam = seed_exam(users)
    seed_synthetic_evaluations(exam, users)
    print("\nDone! Login credentials (all passwords: demo1234):")
    print("  admin1, examiner1, examiner2, examiner3, moderator1, auditor1")
    db.close()
