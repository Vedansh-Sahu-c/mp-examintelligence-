"""
Confidence indicator service.
Formula from SPEC.md:
  0.30 * mean OCR confidence of cited lines
+ 0.25 * evidence coverage
+ 0.25 * agreement between 2 LLM runs
+ 0.20 * semantic support

Label in UI: "Confidence indicator (not a probability)"
Never use the word "probability" in any output.
Default threshold: 0.70 (configurable).
"""
from typing import Dict, List, Any

DEFAULT_THRESHOLD = 0.70


def compute_confidence(
    cited_line_confidences: List[float],   # OCR confidence of cited lines
    total_lines_in_question: int,          # total OCR lines for context
    run1_scores: Dict[int, float],         # criterion_id -> score (run 1)
    run2_scores: Dict[int, float],         # criterion_id -> score (run 2)
    question_max_marks: float,
    semantic_similarities: List[float],    # cosine sim between criterion and cited lines
    threshold: float = DEFAULT_THRESHOLD,
) -> Dict[str, Any]:
    """
    Compute the confidence indicator and its component breakdown.

    Returns:
        {
          "score": float,          # composite 0-1
          "components": {...},     # breakdown for UI tooltip
          "above_threshold": bool,
        }
    """
    # Component 1: mean OCR confidence of cited lines
    ocr_component = (
        sum(cited_line_confidences) / len(cited_line_confidences)
        if cited_line_confidences else 0.0
    )

    # Component 2: evidence coverage = cited lines / total lines (capped at 1)
    cited_count = len(cited_line_confidences)
    coverage_component = (
        min(cited_count / total_lines_in_question, 1.0)
        if total_lines_in_question > 0 else 0.0
    )

    # Component 3: agreement between the two LLM runs
    # = share of criteria where |run1 - run2| <= 10% of combined max (treat as binary)
    if run1_scores and run2_scores:
        agreement_count = 0
        for cid in run1_scores:
            if cid in run2_scores:
                diff = abs(run1_scores[cid] - run2_scores[cid])
                if diff <= 0.1 * question_max_marks:
                    agreement_count += 1
        agreement_component = agreement_count / len(run1_scores) if run1_scores else 0.0
    else:
        agreement_component = 0.0

    # Component 4: semantic support (mean cosine similarity)
    semantic_component = (
        sum(semantic_similarities) / len(semantic_similarities)
        if semantic_similarities else 0.0
    )

    # Weighted composite
    score = (
        0.30 * ocr_component
        + 0.25 * coverage_component
        + 0.25 * agreement_component
        + 0.20 * semantic_component
    )
    score = min(max(score, 0.0), 1.0)

    return {
        "score": round(score, 4),
        "components": {
            "ocr": round(ocr_component, 4),
            "coverage": round(coverage_component, 4),
            "agreement": round(agreement_component, 4),
            "semantic": round(semantic_component, 4),
        },
        "above_threshold": score >= threshold,
    }
