// API base URL - reads from Vite env or defaults to localhost backend
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// JWT stored in module memory only — never in localStorage or sessionStorage
let _token: string | null = null;

export function setToken(token: string | null) {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

// Typed API error
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(res.status, message);
  }

  // Check for cached result header
  const cached = res.headers.get('X-Cache') === 'HIT';
  const data = await res.json();
  if (cached && typeof data === 'object' && data !== null) {
    (data as Record<string, unknown>)._cached = true;
  }
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  user_id: number;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams({ username, password });
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? 'Login failed');
  }
  return res.json();
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export interface Exam {
  id: number;
  title: string;
  description: string;
}

export async function getExam(id: number): Promise<Exam> {
  return request<Exam>(`/api/exams/${id}`);
}

export async function listExams(): Promise<Exam[]> {
  return request<Exam[]>('/api/exams');
}

// ── Sheets ────────────────────────────────────────────────────────────────────

export interface SheetLine {
  id: number;
  line_index: number;
  text: string;
  language: 'EN' | 'HI' | 'MIXED';
  confidence: number;
  box_json: { x: number; y: number; w: number; h: number };
  question_id: number | null;
}

export interface Sheet {
  id: number;
  exam_id: number;
  candidate_token: string;
  status: string;
  masked_image_url: string;
  lines: SheetLine[];
}

export async function getSheet(id: number): Promise<Sheet> {
  return request<Sheet>(`/api/sheets/${id}`);
}

// ── Evaluations ───────────────────────────────────────────────────────────────

export interface CriterionResult {
  criterion_id: number;
  criterion_name: string;
  max_marks: number;
  step: number;
  verdict: 'met' | 'partial' | 'missing';
  score: number;
  evidence_line_ids: number[];
  quoted_text: string[];
  reason: string;
}

export interface QuestionEvaluation {
  question_id: number;
  question_text: string;
  max_marks: number;
  status: 'AI_PROPOSED' | 'REVIEW_REQUIRED' | 'ACCEPTED' | 'MODIFIED' | 'FLAGGED';
  validation_errors: string[];
  criteria: CriterionResult[];
  total_ai_score: number;
  confidence: number;
  confidence_breakdown: {
    ocr: number;
    coverage: number;
    agreement: number;
    semantic: number;
  };
  _cached?: boolean;
}

export interface SheetEvaluation {
  sheet_id: number;
  questions: QuestionEvaluation[];
}

export async function getSheetEvaluation(id: number): Promise<SheetEvaluation> {
  return request<SheetEvaluation>(`/api/sheets/${id}/evaluation`);
}

export async function triggerEvaluation(id: number, force = false): Promise<SheetEvaluation> {
  return request<SheetEvaluation>(`/api/sheets/${id}/evaluate${force ? '?force=true' : ''}`, { method: 'POST' });
}

// ── Decisions ─────────────────────────────────────────────────────────────────

export type DecisionAction = 'accept' | 'modify' | 'flag' | 'moderate';
export type ReasonCode = 'AI_MISSED_VALID_EXPLANATION' | 'OCR_ERROR' | 'RUBRIC_MISAPPLIED' | 'OTHER';

export interface DecisionBody {
  action: DecisionAction;
  criterion_scores?: { criterion_id: number; score: number }[];
  reason_code?: ReasonCode;
  reason_text?: string;
  started_at: string; // ISO timestamp of when examiner opened the question
}

export async function postDecision(sheetId: number, qid: number, body: DecisionBody) {
  return request(`/api/sheets/${sheetId}/questions/${qid}/decision`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function finalizeSheet(id: number) {
  return request(`/api/sheets/${id}/finalize`, { method: 'POST' });
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: number;
  seq: number;
  event_type: string;
  actor_id: number | null;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
  created_at: string;
}

export async function getAuditTrail(sheetId: number): Promise<AuditEvent[]> {
  return request<AuditEvent[]>(`/api/sheets/${sheetId}/audit`);
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  first_broken_seq: number | null;
  reason: string | null;
}

export async function verifyAuditChain(sheetId: number): Promise<ChainVerification> {
  return request<ChainVerification>(`/api/sheets/${sheetId}/audit/verify`);
}

// ── Review Queue ──────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: number;
  sheet_id: number;
  question_id: number | null;
  reason: string;
  status: string;
  created_at: string;
}

export async function getReviewQueue(): Promise<ReviewItem[]> {
  return request<ReviewItem[]>('/api/review-queue');
}

export async function resolveReviewItem(id: number, note: string) {
  return request(`/api/review-queue/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  questions: {
    question_id: number;
    question_text: string;
    mean_score: number;
    max_marks: number;
    distribution: Record<string, number>;
    criteria: {
      criterion_id: number;
      name: string;
      miss_rate: number;
    }[];
  }[];
  histogram: { bucket: string; count: number }[];
  status_counts: Record<string, number>;
}

export async function getAnalytics(examId: number): Promise<AnalyticsData> {
  return request<AnalyticsData>(`/api/analytics/exam/${examId}`);
}

export interface QualityMetrics {
  examiners: {
    examiner_id: number;
    username: string;
    n: number;
    mean_normalized: number;
    sd_normalized: number;
    agreement_rate: number;
    override_rate: number;
    avg_time_seconds: number;
    drift_flag: boolean;
    flags: string[];
  }[];
}

export async function getQualityMetrics(examId: number): Promise<QualityMetrics> {
  return request<QualityMetrics>(`/api/quality/examiners?exam_id=${examId}`);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_sheets: number;
  evaluated: number;
  pending: number;
  review_required: number;
  agreement_rate: number;
  avg_time_seconds: number;
  quality_alerts: { examiner: string; flag: string }[];
}

export async function getDashboardStats(examId?: number): Promise<DashboardStats> {
  const q = examId ? `?exam_id=${examId}` : '';
  return request<DashboardStats>(`/api/dashboard${q}`);
}
