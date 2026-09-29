"""
Question segmentation service — fully deterministic, no ML/LLM.
Assigns each OCR line to a question based on line-start markers.

Supported markers (case-insensitive):
  English : Q1, Q.1, Q 1, 1., 1)
  Hindi   : प्रश्न 1, प्रश्न1

Falls back to "Unassigned" when no marker is detected.
"""
import re
from typing import List, Dict, Any

# Regex patterns for question markers
_PATTERNS = [
    # Hindi: प्रश्न followed by optional space and a number
    re.compile(r"^(?:प्रश्न\s*)(\d+)", re.UNICODE),
    # English: Q1 / Q.1 / Q 1
    re.compile(r"^Q[\.\s]?(\d+)", re.IGNORECASE),
    # Numbered: 1. or 1)
    re.compile(r"^(\d+)[.)]\s"),
]

LANG_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
LANG_LATIN_RE = re.compile(r"[A-Za-z]")


def detect_language(text: str) -> str:
    """Detect language of a line: HI, EN, or MIXED."""
    has_dev = bool(LANG_DEVANAGARI_RE.search(text))
    has_lat = bool(LANG_LATIN_RE.search(text))
    if has_dev and has_lat:
        return "MIXED"
    if has_dev:
        return "HI"
    return "EN"


def _extract_question_number(text: str) -> int | None:
    """Try each pattern and return the question number if found, else None."""
    stripped = text.strip()
    for pattern in _PATTERNS:
        m = pattern.match(stripped)
        if m:
            return int(m.group(1))
    return None


def segment_lines(
    lines: List[Dict[str, Any]],
    question_ids_by_number: Dict[int, int],  # question number (1-based) -> DB id
) -> List[Dict[str, Any]]:
    """
    Assign each line a question_id based on detected markers.

    Args:
        lines: list of dicts with at least {"text": str}
        question_ids_by_number: maps question number (e.g. 1, 2, 3) to DB question id

    Returns:
        Same list with "question_id" (int or None) added/updated.
    """
    current_q_number: int | None = None
    result = []

    for line in lines:
        text = line.get("text", "")
        detected = _extract_question_number(text)

        if detected is not None and detected in question_ids_by_number:
            current_q_number = detected

        line = dict(line)
        line["question_id"] = (
            question_ids_by_number.get(current_q_number)
            if current_q_number is not None
            else None
        )
        result.append(line)

    return result
