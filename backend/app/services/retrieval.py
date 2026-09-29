"""
Retrieval service — uses multilingual-e5-small (local, cached in memory)
to embed OCR lines and rubric criteria. Semantic similarity is a SIGNAL only,
never the final score.
"""
from typing import Dict, List, Any
import hashlib

_model = None
_embedding_cache: Dict[str, List[float]] = {}


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("intfloat/multilingual-e5-small")
    return _model


def _embed(text: str) -> List[float]:
    key = hashlib.md5(text.encode()).hexdigest()
    if key not in _embedding_cache:
        model = _get_model()
        _embedding_cache[key] = model.encode(text, normalize_embeddings=True).tolist()
    return _embedding_cache[key]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    # Vectors are already L2-normalized by the model
    return max(0.0, min(1.0, dot))


def top_k_lines(
    criterion_text: str,
    lines: List[Dict[str, Any]],
    k: int = 10,
) -> List[Dict[str, Any]]:
    """
    Return top-k lines most similar to the criterion, plus their neighbours.
    For short answers (<= 2*k lines) return all lines.
    Semantic similarity is a SIGNAL only — used for context selection, not scoring.
    """
    if len(lines) <= 2 * k:
        return lines

    crit_emb = _embed(f"query: {criterion_text}")
    scored = []
    for i, line in enumerate(lines):
        line_emb = _embed(f"passage: {line['text']}")
        sim = cosine_similarity(crit_emb, line_emb)
        scored.append((sim, i))

    scored.sort(reverse=True)
    indices = set()
    for _, idx in scored[:k]:
        # Include the line and its neighbours
        for neighbor in range(max(0, idx - 1), min(len(lines), idx + 2)):
            indices.add(neighbor)

    return [lines[i] for i in sorted(indices)]


def semantic_support_score(
    criterion_text: str,
    cited_lines: List[str],
) -> float:
    """
    Mean cosine similarity between a criterion and its cited answer lines.
    Used as one component (×0.20) of the confidence indicator.
    Semantic similarity is a SIGNAL — never used alone as a score.
    """
    if not cited_lines:
        return 0.0
    crit_emb = _embed(f"query: {criterion_text}")
    sims = [
        cosine_similarity(crit_emb, _embed(f"passage: {line}"))
        for line in cited_lines
    ]
    return sum(sims) / len(sims)
