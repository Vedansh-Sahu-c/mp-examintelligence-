# Architecture: MP ExamIntelligence

## System Pipeline
1. **Upload & Identity Masking**: The examiner uploads an answer sheet. The system strips metadata and masks the top 12% to ensure candidate anonymity, generating a secure display copy.
2. **OCR & Segmentation**: The `OcrEngine` (Gemini Vision or Google Cloud Vision) extracts lines of text along with bounding boxes, confidence scores, and language tags. The `segmentation` service deterministically clusters lines into specific questions based on predefined regex markers.
3. **Retrieval**: For each question, `intfloat/multilingual-e5-small` embeds the OCR text and rubric criteria to calculate semantic similarity, providing a context-aware signal to the evaluator.
4. **Evaluation**: Gemini models (called twice for agreement measurement) evaluate the response against the rubric. Output is forced into a structured JSON schema citing only verified OCR lines.
5. **Deterministic Validation**: Pure Python logic validates the LLM's structured output. It enforces maximum scores, score-step rules, evidence requirements, and OCR fuzzy-matching.
6. **Examiner Decisions & Tabulation**: An examiner reviews the verified results and makes final decisions. Totals are securely tabulated.

## Deterministic vs ML vs LLM
- **Deterministic**: Identity masking, question segmentation, JSON schema validation, score bounding, score tabulation, hash chaining, rule-based flagging.
- **Machine Learning (ML)**: OCR line extraction, OCR confidence scoring, semantic similarity retrieval (`sentence-transformers`).
- **LLM**: Criterion-level grading, reasoning, extraction of specific quoted text.
