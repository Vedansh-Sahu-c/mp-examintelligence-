"""
OCR service with two engine implementations:
  - GeminiOcrEngine  (OCR_ENGINE=gemini): calls Gemini Vision with structured JSON output
  - VisionOcrEngine  (OCR_ENGINE=vision): Google Cloud Vision stub with TODO

Language is detected per line via Unicode-range check (not via LLM).
Results are cached by SHA-256 of the image bytes to avoid re-calling APIs.
"""
import os
import json
import hashlib
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List

from app.core.config import settings
from app.services.segmentation import detect_language

# In-memory cache: image_sha256 -> list of line dicts
_ocr_cache: Dict[str, List[Dict[str, Any]]] = {}


def _image_hash(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


class OcrEngine(ABC):
    @abstractmethod
    def extract(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract OCR lines from an image.
        Returns list of:
          {text, lang, confidence, bbox: {x, y, w, h} (normalized 0-1)}
        """


class GeminiOcrEngine(OcrEngine):
    """
    Calls Gemini Vision with a structured JSON response schema.
    Never sends candidate identity — only the image bytes.
    """

    def __init__(self):
        from google import genai
        from google.genai import types
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = settings.GEMINI_MODEL
        self._types = types

    def extract(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        cache_key = _image_hash(image_bytes)
        if cache_key in _ocr_cache:
            return _ocr_cache[cache_key]

        # Prompt instructs Gemini to output structured line data
        prompt = (
            "You are an OCR engine. Extract every line of handwritten or printed text "
            "from the image. For each line return a JSON object with:\n"
            "  - text: the exact text on that line\n"
            "  - confidence: float 0-1 (your certainty)\n"
            "  - bbox: {x, y, w, h} normalized 0-1 (top-left origin)\n"
            "Return a JSON array of these objects only. No other output."
        )

        import base64
        b64 = base64.b64encode(image_bytes).decode()

        response = self._client.models.generate_content(
            model=self._model,
            contents=[
                {"role": "user", "parts": [
                    {"inline_data": {"mime_type": "image/png", "data": b64}},
                    {"text": prompt}
                ]}
            ],
        )

        raw = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

        lines_raw = json.loads(raw)
        lines = []
        for i, item in enumerate(lines_raw):
            lines.append({
                "line_index": i,
                "text": item.get("text", ""),
                "confidence": float(item.get("confidence", 0.8)),
                "bbox": item.get("bbox", {"x": 0, "y": 0, "w": 1, "h": 0.02}),
                "lang": detect_language(item.get("text", "")),
            })

        _ocr_cache[cache_key] = lines
        return lines


class VisionOcrEngine(OcrEngine):
    """
    Google Cloud Vision document text detection.
    TODO: Implement when Cloud Vision credentials are available.
    Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON.
    """

    def extract(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        # TODO: Implement using google-cloud-vision:
        # from google.cloud import vision
        # client = vision.ImageAnnotatorClient()
        # image = vision.Image(content=image_bytes)
        # response = client.document_text_detection(image=image)
        # Parse response.full_text_annotation.pages[0].blocks[*].paragraphs[*].words
        raise NotImplementedError(
            "VisionOcrEngine is a stub. Set OCR_ENGINE=gemini or implement Cloud Vision credentials."
        )


def get_ocr_engine() -> OcrEngine:
    if settings.OCR_ENGINE == "vision":
        return VisionOcrEngine()
    return GeminiOcrEngine()


def extract_lines(image_bytes: bytes) -> List[Dict[str, Any]]:
    """Public entry point: returns cached or freshly extracted lines."""
    cache_key = _image_hash(image_bytes)
    if cache_key in _ocr_cache:
        return _ocr_cache[cache_key]
    engine = get_ocr_engine()
    result = engine.extract(image_bytes)
    _ocr_cache[cache_key] = result
    return result
