import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { getReviewQueue, resolveReviewItem } from '../api/client';
import type { ReviewItem } from '../api/client';
import { ClipboardList } from 'lucide-react';

const REASON_CHIPS = [
  'Insufficient evidence',
  'Low OCR confidence',
  'Validation failed',
  'AI/examiner gap',
  'Similarity',
  'Calibration deviation',
  'CALIBRATION_DEVIATION',
];

const REASON_COLORS: Record<string, string> = {
  'Insufficient evidence': '#C0392B',
  'Low OCR confidence': '#D99A1C',
  'Validation failed': '#C0392B',
  'AI/examiner gap': '#3B4BA8',
  'Similarity': '#D99A1C',
  'Calibration deviation': '#D99A1C',
  'CALIBRATION_DEVIATION': '#D99A1C',
};

export function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [resolveModal, setResolveModal] = useState<{ id: number } | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReviewQueue();
      setItems(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter
    ? items.filter(i => i.reason.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const handleResolve = async () => {
    if (!resolveModal || !resolveNote.trim()) return;
    setResolving(true);
    try {
      await resolveReviewItem(resolveModal.id, resolveNote);
      setResolveModal(null);
      setResolveNote('');
      await fetchData();
    } catch (e: any) {
      setError(e.message ?? 'Failed to resolve item');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#0B1F4B' }}>Review Queue</h1>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <Filter size={14} color="#9BA8B8" />
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: !filter ? '#0B1F4B' : '#F5F7FA',
            color: !filter ? '#fff' : '#6B7C93',
            border: '1px solid #E2E6EE',
          }}
        >All</button>
        {REASON_CHIPS.map(r => (
          <button key={r}
            onClick={() => setFilter(r === filter ? '' : r)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === r ? `${REASON_COLORS[r] ?? '#3B4BA8'}18` : '#F5F7FA',
              color: REASON_COLORS[r] ?? '#6B7C93',
              border: `1px solid ${filter === r ? (REASON_COLORS[r] ?? '#3B4BA8') : '#E2E6EE'}`,
            }}
          >{r}</button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {loading ? <LoadingSkeleton lines={6} height={50} /> : (
        filtered.length === 0 ? (
          <EmptyState title="No review items" description="All items have been resolved." icon={ClipboardList} />
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#F5F7FA' }}>
                <tr>
                  {['ID', 'Sheet', 'Question', 'Reason', 'Status', 'Created', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#9BA8B8', fontWeight: 600, borderBottom: '1px solid #E2E6EE' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                    <td style={{ padding: '12px 14px', color: '#9BA8B8' }}>#{item.id}</td>
                    <td style={{ padding: '12px 14px', color: '#0B1F4B', fontWeight: 500 }}>#{item.sheet_id}</td>
                    <td style={{ padding: '12px 14px', color: '#6B7C93' }}>{item.question_id ? `Q${item.question_id}` : '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: `${REASON_COLORS[item.reason] ?? '#3B4BA8'}18`,
                        color: REASON_COLORS[item.reason] ?? '#3B4BA8',
                      }}>{item.reason}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: item.status === 'RESOLVED' ? '#D1F0E2' : '#FEF3CD',
                        color: item.status === 'RESOLVED' ? '#1E8E5A' : '#D99A1C',
                      }}>{item.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9BA8B8' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setResolveModal({ id: item.id })}
                          style={{
                            background: '#F28C28', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(11,31,75,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 28, width: 420,
            border: '1px solid #E2E6EE',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0B1F4B' }}>
              Resolve Review Item #{resolveModal.id}
            </h3>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#0B1F4B', marginBottom: 6 }}>
              Resolution note <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              rows={3}
              placeholder="Describe the resolution..."
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #E2E6EE', fontSize: 13, resize: 'vertical',
                boxSizing: 'border-box', color: '#0B1F4B',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => { setResolveModal(null); setResolveNote(''); }}
                style={{ background: '#F5F7FA', border: '1px solid #E2E6EE', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveNote.trim() || resolving}
                style={{
                  background: resolveNote.trim() ? '#1E8E5A' : '#E2E6EE',
                  color: resolveNote.trim() ? '#fff' : '#9BA8B8',
                  border: 'none', borderRadius: 8, padding: '8px 16px',
                  cursor: resolveNote.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {resolving ? 'Saving…' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
