import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AlertTriangle, Check, Edit2 } from 'lucide-react';
import { EvidenceOverlay } from '../components/ui/EvidenceOverlay';
import { CriterionRow } from '../components/ui/CriterionRow';
import { ConfidenceMeter } from '../components/ui/ConfidenceMeter';
import { StatusChip } from '../components/ui/StatusChip';
import { HashBadge } from '../components/ui/HashBadge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import {
  getSheet, getSheetEvaluation, postDecision, finalizeSheet,
} from '../api/client';
import type {
  Sheet, SheetEvaluation, QuestionEvaluation, DecisionAction, ReasonCode
} from '../api/client';

export function EvaluationPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const sid = Number(sheetId ?? 1);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [evaluation, setEvaluation] = useState<SheetEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [selectedCriterionIdx, setSelectedCriterionIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<'script'|'ocr'|'rubric'>('script');
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyScores, setModifyScores] = useState<Record<number, number>>({});
  const [reasonCode, setReasonCode] = useState<ReasonCode>('AI_MISSED_VALID_EXPLANATION');
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<any>(null);
  const questionStartRef = useRef<number>(Date.now());
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 800, h: 1100 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, e] = await Promise.all([getSheet(sid), getSheetEvaluation(sid)]);
        setSheet(s);
        setEvaluation(e);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load sheet');
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

  // Track time when switching questions
  useEffect(() => { questionStartRef.current = Date.now(); }, [qIndex]);

  const currentQ: QuestionEvaluation | null = evaluation?.questions[qIndex] ?? null;
  const selectedCrit = selectedCriterionIdx !== null ? currentQ?.criteria[selectedCriterionIdx] : null;
  const selectedEvidenceIds = selectedCrit?.evidence_line_ids ?? [];

  const qLines = sheet?.lines.filter(l => l.question_id === currentQ?.question_id) ?? [];
  const allDecided = evaluation?.questions.every(
    q => ['ACCEPTED', 'MODIFIED', 'FLAGGED'].includes(q.status)
  ) ?? false;

  const handleDecision = async (action: DecisionAction) => {
    if (!currentQ) return;
    setSubmitting(true);
    try {
      const body: any = {
        action,
        started_at: new Date(questionStartRef.current).toISOString(),
      };
      if (action === 'modify') {
        body.criterion_scores = Object.entries(modifyScores).map(([id, score]) => ({
          criterion_id: Number(id), score
        }));
        body.reason_code = reasonCode;
        body.reason_text = reasonText;
      }
      await postDecision(sid, currentQ.question_id, body);
      // Refresh evaluation
      const e = await getSheetEvaluation(sid);
      setEvaluation(e);
      setModifyOpen(false);
    } catch (err: any) {
      setError(err.message ?? 'Decision failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    try {
      const result = await finalizeSheet(sid);
      setFinalizeResult(result);
    } catch (err: any) {
      setError(err.message ?? 'Finalization failed');
    }
  };

  if (loading) return <LoadingSkeleton lines={10} height={60} />;
  if (error) return <ErrorBanner message={error} />;
  if (!sheet || !evaluation) return null;

  const isWide = window.innerWidth >= 1024;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Question navigator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 0', marginBottom: 12,
        borderBottom: '1px solid #E2E6EE',
      }}>
        <button onClick={() => setQIndex(i => Math.max(0, i - 1))} disabled={qIndex === 0}
          style={{ background: 'none', border: '1px solid #E2E6EE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1F4B' }}>
          Question {qIndex + 1} of {evaluation.questions.length}
        </span>
        <button onClick={() => setQIndex(i => Math.min(evaluation.questions.length - 1, i + 1))}
          disabled={qIndex === evaluation.questions.length - 1}
          style={{ background: 'none', border: '1px solid #E2E6EE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
          <ChevronRight size={16} />
        </button>
        {currentQ && <StatusChip status={currentQ.status.toLowerCase() as any} />}
        {currentQ?._cached && (
          <span style={{ fontSize: 11, color: '#9BA8B8', background: '#F5F7FA', padding: '2px 8px', borderRadius: 20, border: '1px solid #E2E6EE' }}>
            Cached result
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleFinalize}
          disabled={!allDecided}
          style={{
            background: allDecided ? '#F28C28' : '#E2E6EE',
            color: allDecided ? '#fff' : '#9BA8B8',
            border: 'none', borderRadius: 8, padding: '8px 18px',
            fontSize: 13, fontWeight: 600, cursor: allDecided ? 'pointer' : 'not-allowed',
          }}
        >Finalize Sheet</button>
      </div>

      {/* Tablet: tabs */}
      {!isWide && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
          {(['script', 'ocr', 'rubric'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                background: tab === t ? '#0B1F4B' : '#F5F7FA',
                color: tab === t ? '#fff' : '#6B7C93', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* LEFT: Script viewer */}
        {(isWide || tab === 'script') && (
          <div style={{
            flex: isWide ? '0 0 35%' : 1,
            background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10,
            overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid #E2E6EE',
              background: '#F5F7FA',
            }}>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                style={{ background: 'none', border: '1px solid #E2E6EE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                <ZoomIn size={14} />
              </button>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
                style={{ background: 'none', border: '1px solid #E2E6EE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                <ZoomOut size={14} />
              </button>
              <button onClick={() => setZoom(1)}
                style={{ background: 'none', border: '1px solid #E2E6EE', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                Reset
              </button>
              <span style={{ fontSize: 11, color: '#9BA8B8', alignSelf: 'center', marginLeft: 4 }}>
                Token: {sheet.candidate_token}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8, position: 'relative' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  ref={imgRef}
                  src={sheet.masked_image_url}
                  alt="Answer sheet (header masked)"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'block' }}
                  onLoad={e => {
                    const img = e.target as HTMLImageElement;
                    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                <EvidenceOverlay
                  lines={sheet.lines}
                  selectedLineIds={selectedEvidenceIds}
                  width={imgSize.w}
                  height={imgSize.h}
                />
              </div>
            </div>
          </div>
        )}

        {/* CENTER: OCR text */}
        {(isWide || tab === 'ocr') && (
          <div style={{
            flex: isWide ? '0 0 28%' : 1,
            background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10,
            overflow: 'auto', padding: 16,
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#0B1F4B' }}>
              OCR Text — Q{currentQ?.question_id}
            </h3>
            {qLines.length === 0 ? (
              <p style={{ color: '#9BA8B8', fontSize: 13 }}>No lines assigned to this question.</p>
            ) : (
              qLines.map(line => {
                const isCited = selectedEvidenceIds.includes(line.id);
                const isLowConf = line.confidence < 0.7;
                const isHindi = line.language === 'HI';
                return (
                  <div key={line.id} style={{
                    marginBottom: 6, padding: '6px 10px', borderRadius: 6,
                    borderLeft: isCited ? '3px solid #3B4BA8' : '3px solid transparent',
                    background: isCited ? '#EEF0FB' : isLowConf ? '#FFFBF0' : '#F9FAFB',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9BA8B8' }}>
                        L{line.id}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: line.language === 'HI' ? '#F28C2818' : line.language === 'MIXED' ? '#D99A1C18' : '#3B4BA818',
                        color: line.language === 'HI' ? '#F28C28' : line.language === 'MIXED' ? '#D99A1C' : '#3B4BA8',
                        fontWeight: 600,
                      }}>{line.language}</span>
                      {isLowConf && (
                        <span style={{ fontSize: 10, color: '#D99A1C' }}>
                          ⚠ {Math.round(line.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13, color: '#0B1F4B', lineHeight: 1.5,
                      fontFamily: isHindi ? 'Noto Sans Devanagari, sans-serif' : 'Inter, sans-serif',
                    }}>{line.text}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* RIGHT: Rubric panel */}
        {(isWide || tab === 'rubric') && (
          <div style={{
            flex: 1, background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10,
            overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {currentQ ? (
              <>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0B1F4B' }}>
                  {currentQ.question_text}
                </h3>

                {/* REVIEW_REQUIRED warning */}
                {currentQ.status === 'REVIEW_REQUIRED' && (
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 14px',
                    background: '#FEF3CD', border: '1px solid #D99A1C', borderRadius: 8,
                    color: '#7A5700', fontSize: 13,
                  }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Review Required</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {currentQ.validation_errors.map((e, i) => <li key={i} style={{ fontSize: 12 }}>{e}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Criteria */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {currentQ.criteria.map((c: any, i: number) => (
                    <CriterionRow
                      key={c.criterion_id}
                      name={c.criterion_id ? `Criterion ${c.criterion_id}` : `Criterion ${i + 1}`}
                      maxMarks={currentQ.max_marks / currentQ.criteria.length}
                      aiScore={c.score}
                      verdict={c.verdict}
                      reason={c.reason}
                      evidenceLineIds={c.evidence_line_ids}
                      isSelected={selectedCriterionIdx === i}
                      isReviewRequired={currentQ.status === 'REVIEW_REQUIRED'}
                      onClick={() => setSelectedCriterionIdx(selectedCriterionIdx === i ? null : i)}
                    />
                  ))}
                </div>

                {/* Total + Confidence */}
                <div style={{ padding: '12px 0', borderTop: '1px solid #E2E6EE', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1F4B' }}>AI Total</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#0B1F4B' }}>
                      {currentQ.status !== 'REVIEW_REQUIRED' ? currentQ.total_ai_score : '?'} / {currentQ.max_marks}
                    </span>
                  </div>
                  <ConfidenceMeter
                    score={currentQ.confidence}
                    breakdown={currentQ.confidence_breakdown}
                  />
                </div>

                {/* Decision buttons */}
                {!['ACCEPTED', 'MODIFIED', 'FLAGGED'].includes(currentQ.status) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleDecision('accept')} disabled={submitting}
                        style={{
                          flex: 1, background: '#1E8E5A', color: '#fff', border: 'none', borderRadius: 8,
                          padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                        <Check size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Accept
                      </button>
                      <button onClick={() => setModifyOpen(true)} disabled={submitting}
                        style={{
                          flex: 1, background: '#0B1F4B', color: '#fff', border: 'none', borderRadius: 8,
                          padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                        <Edit2 size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Modify
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleDecision('flag')} disabled={submitting}
                        style={{
                          flex: 1, background: '#F28C28', color: '#fff', border: 'none', borderRadius: 8,
                          padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Flag</button>
                      <button onClick={() => handleDecision('moderate')} disabled={submitting}
                        style={{
                          flex: 1, background: '#fff', color: '#0B1F4B', border: '1px solid #E2E6EE', borderRadius: 8,
                          padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Send to Moderation</button>
                    </div>
                  </div>
                )}

                {/* Decided state */}
                {['ACCEPTED', 'MODIFIED'].includes(currentQ.status) && (
                  <div style={{
                    padding: '12px', background: '#D1F0E2', borderRadius: 8,
                    color: '#1E8E5A', fontSize: 13, fontWeight: 600, textAlign: 'center',
                  }}>
                    ✓ Decision recorded: {currentQ.status}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#9BA8B8' }}>Select a question to view rubric.</p>
            )}
          </div>
        )}
      </div>

      {/* Modify inline panel */}
      {modifyOpen && currentQ && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(11,31,75,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 28, width: 460, maxWidth: '95vw',
            border: '1px solid #E2E6EE', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0B1F4B' }}>
              Modify Scores
            </h3>

            {currentQ.criteria.map((c: any, i: number) => {
              const step = 0.5;
              const maxC = currentQ.max_marks / currentQ.criteria.length;
              const val = modifyScores[c.criterion_id] ?? c.score;
              return (
                <div key={c.criterion_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#0B1F4B' }}>
                      {c.criterion_id ? `Criterion ${c.criterion_id}` : `Criterion ${i + 1}`}
                    </label>
                    <span style={{ fontSize: 12, color: '#9BA8B8' }}>{val} / {maxC}</span>
                  </div>
                  <input type="range" min={0} max={maxC} step={step}
                    value={val}
                    onChange={e => setModifyScores(s => ({ ...s, [c.criterion_id]: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>
              );
            })}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#0B1F4B', marginBottom: 6 }}>
                Reason category <span style={{ color: '#C0392B' }}>*</span>
              </label>
              <select value={reasonCode} onChange={e => setReasonCode(e.target.value as ReasonCode)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E6EE', fontSize: 13 }}>
                <option value="AI_MISSED_VALID_EXPLANATION">AI missed valid explanation</option>
                <option value="OCR_ERROR">OCR error</option>
                <option value="RUBRIC_MISAPPLIED">Rubric misapplied</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#0B1F4B', marginBottom: 6 }}>
                Reason text
              </label>
              <textarea value={reasonText} onChange={e => setReasonText(e.target.value)} rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E6EE', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModifyOpen(false)}
                style={{ background: '#F5F7FA', border: '1px solid #E2E6EE', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={() => handleDecision('modify')} disabled={submitting}
                style={{ background: '#0B1F4B', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {submitting ? 'Saving…' : 'Submit Modification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize result modal */}
      {finalizeResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(11,31,75,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 480, border: '1px solid #E2E6EE' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1E8E5A' }}>
              ✓ Sheet Finalized
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#0B1F4B' }}>
              Grand Total: <strong>{finalizeResult.grand_total}</strong>
            </p>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: '#6B7C93', marginBottom: 4 }}>Audit chain head hash:</p>
              <HashBadge hash={finalizeResult.audit_head_hash} />
            </div>
            <button onClick={() => setFinalizeResult(null)}
              style={{ background: '#0B1F4B', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
