import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { HashBadge } from '../components/ui/HashBadge';
import { getAuditTrail, verifyAuditChain } from '../api/client';
import type { AuditEvent, ChainVerification } from '../api/client';

const EVENT_COLORS: Record<string, string> = {
  SHEET_UPLOADED:       '#3B4BA8',
  OCR_COMPLETED:        '#1E8E5A',
  AI_PROPOSED:          '#D99A1C',
  EXAMINER_ACCEPTED:    '#1E8E5A',
  EXAMINER_MODIFIED:    '#F28C28',
  FLAGGED:              '#F28C28',
  SENT_TO_MODERATION:   '#C0392B',
  FINALIZED:            '#0B1F4B',
  REVIEW_RESOLVED:      '#1E8E5A',
};

export function IntegrityPage() {
  const [sheetId, setSheetId] = useState(1);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState<ChainVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    setError('');
    setVerifyResult(null);
    try {
      const data = await getAuditTrail(sheetId);
      setEvents(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyAuditChain(sheetId);
      setVerifyResult(result);
    } catch (e: any) {
      setError(e.message ?? 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#0B1F4B' }}>
        Integrity &amp; Audit Trail
      </h1>

      {/* Sheet selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#0B1F4B' }}>Sheet ID:</label>
        <input
          type="number" value={sheetId} min={1}
          onChange={e => setSheetId(Number(e.target.value))}
          style={{
            width: 100, padding: '7px 10px', borderRadius: 8,
            border: '1px solid #E2E6EE', fontSize: 13,
          }}
        />
        <button onClick={fetchAudit}
          style={{
            background: '#0B1F4B', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          Load Audit Trail
        </button>
        <button onClick={handleVerify} disabled={verifying || events.length === 0}
          style={{
            background: '#F28C28', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: events.length > 0 ? 'pointer' : 'not-allowed',
            opacity: events.length === 0 ? 0.5 : 1,
          }}>
          <Shield size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {verifying ? 'Verifying…' : 'Verify Chain'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchAudit} />}

      {/* Verification result */}
      {verifyResult && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 8, marginBottom: 20,
          background: verifyResult.valid ? '#D1F0E2' : '#FADADD',
          border: `1px solid ${verifyResult.valid ? '#1E8E5A' : '#C0392B'}`,
          color: verifyResult.valid ? '#1E8E5A' : '#C0392B',
        }}>
          {verifyResult.valid
            ? <><CheckCircle size={16} /> Chain verified — {verifyResult.checked} events checked. Tamper-evident audit is intact.</>
            : <><XCircle size={16} /> Chain broken at event #{verifyResult.first_broken_seq}: {verifyResult.reason}</>
          }
        </div>
      )}

      {loading ? <LoadingSkeleton lines={6} height={60} /> : (
        events.length > 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, overflow: 'hidden' }}>
            {events.map((ev, i) => (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                borderBottom: i < events.length - 1 ? '1px solid #F5F7FA' : 'none',
              }}>
                {/* Seq badge */}
                <span style={{
                  minWidth: 28, height: 28, borderRadius: '50%',
                  background: '#F5F7FA', border: '1px solid #E2E6EE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#9BA8B8',
                }}>{ev.seq}</span>

                {/* Event type */}
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${EVENT_COLORS[ev.event_type] ?? '#3B4BA8'}18`,
                  color: EVENT_COLORS[ev.event_type] ?? '#3B4BA8',
                  whiteSpace: 'nowrap',
                }}>{ev.event_type.replace(/_/g, ' ')}</span>

                {/* Actor */}
                <span style={{ fontSize: 13, color: '#6B7C93', flex: 1 }}>
                  {ev.actor_id ? `Actor #${ev.actor_id}` : 'System'}
                </span>

                {/* Time */}
                <span style={{ fontSize: 12, color: '#9BA8B8', whiteSpace: 'nowrap' }}>
                  {new Date(ev.created_at).toLocaleString()}
                </span>

                {/* Hash */}
                <HashBadge hash={ev.hash} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9BA8B8' }}>
            Load an audit trail to inspect event integrity.
          </div>
        )
      )}
    </div>
  );
}
