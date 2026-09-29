# MP ExamIntelligence

**Smarter Evaluation. Transparent Assessment.**

Prototype built for the **MPOnline Idea & Innovation Hackathon 2026** — Problem Statement 3:
*AI-Driven Examination & On-Screen Marking Transformation.*

An evidence-grounded, examiner-controlled On-Screen Marking (OSM) platform. AI proposes
criterion-level marks with cited evidence from the actual answer script; a deterministic
validator checks every recommendation before it reaches a human; the examiner always makes
the final decision; every change is recorded in a tamper-evident audit trail.

> **Philosophy:** AI recommends → software validates → examiner decides → system records.

---

## What this is (and isn't)

This is a **prototype**, built in ~48 hours for a hackathon. All exam data, candidate
identities, and evaluations shown in the demo are **synthetic**. It is not an official
Madhya Pradesh Government system and makes no claims of certification, accreditation, or
production-grade security.

---

## Core features

- **Evidence-grounded evaluation** — every AI-suggested mark cites the exact OCR lines on
  the script that justify it; if no evidence exists, the question is routed to
  **Review Required** instead of a guessed score.
- **Criterion-level partial credit** — rubrics are broken into individual criteria
  (e.g. Formula, Substitution, Calculation, Conclusion) rather than one binary judgement.
- **Deterministic validation layer** — schema checks, score bounds, evidence existence, and
  quote-matching run before any AI output is shown to an examiner. The AI is never trusted
  blindly.
- **Human-in-the-loop decisions** — examiners accept, modify (with a mandatory reason), flag,
  or send to moderation. Nothing is auto-finalized.
- **Tamper-evident audit trail** — every action on a sheet is hash-chained
  (`SHA-256(prev_hash + payload)`); a "Verify chain" check detects any tampering and points to
  the exact broken event.
- **Evaluation quality & calibration engine** — benchmark spot-checks, examiner-vs-cohort
  variance, and AI/examiner agreement rates, surfaced as "consistency review suggested" flags
  (never as accusations of bias or fatigue).
- **Candidate anonymization** — header regions are masked and candidates are shown only by a
  random token; identity mapping is restricted to the admin role.
- **Multilingual support** — English, Hindi (Devanagari), and Hinglish answers are OCR'd,
  language-tagged, and evaluated against the same rubric.
- **Analytics** — per-question means, criterion-level "which step loses the most marks"
  insights, and score distributions.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 |
| Database | PostgreSQL (via Docker) |
| AI | Google Gemini (vision + evaluation), multilingual-e5-small (local embeddings for retrieval, never for final scoring) |
| Auth | JWT, role-based (examiner / moderator / admin / auditor) |

---

## Project structure

```
mp-examintelligence/
├── backend/
│   ├── app/
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # evaluator, validator, audit chain, quality engine, OCR
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── core/           # config, database, security
│   ├── tests/              # pytest suite (validator, audit chain, tabulation)
│   ├── seed.py              # creates demo users, exam, rubrics, synthetic evaluations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, Evaluation, Review Queue, Analytics, Integrity
│       └── components/ui/   # StatusChip, ConfidenceMeter, EvidenceOverlay, HashBadge...
├── sample_data/             # synthetic rubrics and sample answer sheets
├── docker-compose.yml
└── .env.example
```

---

## Running it locally

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker Desktop
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Start the database
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # Windows PowerShell
# source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt

# Copy .env.example to .env and fill in your real GEMINI_API_KEY
cp .env.example .env

python seed.py                   # creates demo users + sample exam + synthetic evaluations
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` — API docs at `http://localhost:8000/docs`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Demo login credentials
All seeded accounts use the password `demo1234`:

| Username | Role |
|---|---|
| `admin1` | Admin |
| `examiner1`, `examiner2`, `examiner3` | Examiner |
| `moderator1` | Moderator |
| `auditor1` | Auditor (read-only) |

---

## Running tests

```bash
cd backend
venv\Scripts\Activate.ps1
pytest -q
```

Covers: validator rules (score bounds, evidence requirements, quote matching), audit hash
chain integrity (tamper and deletion detection), and tabulation checks.

---

## Known limitations

- OCR accuracy on handwritten Devanagari script is imperfect; low-confidence lines are
  surfaced to the examiner rather than silently trusted.
- Confidence scores are a **prototype indicator**, not a calibrated statistical probability.
- The audit chain provides **tamper-evidence** (detecting changes after the fact), not
  tamper-**prevention** or non-repudiation — that would need digital signatures and external
  anchoring, listed as future work.
- All data in this prototype is synthetic; no real candidate or examination data was used.

---

## Roadmap (not built in this prototype)

Stylometric proxy-writing detection, examiner typing-cadence telemetry, NAAC-style
accreditation reporting, a mobile examiner app, and digital-signature-based audit anchoring.

---

## Team-SetuAI
Leader-Vedansh Sahu
Member-Roopal Kushwaha
Member-Vedant Tiwari
Member-Sakshi Dhurwey

*MPOnline Idea & Innovation Hackathon 2026 — Problem Statement 3*
