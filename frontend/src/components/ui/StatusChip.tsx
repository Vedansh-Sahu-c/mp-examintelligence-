import React from 'react';

type Status = 'met' | 'partial' | 'missing' | 'review' | 'verified' | 'finalized' | 'ai_proposed' | 'review_required';

const CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  met:             { label: 'Met',             bg: '#D1F0E2', color: '#1E8E5A' },
  partial:         { label: 'Partial',         bg: '#FEF3CD', color: '#D99A1C' },
  missing:         { label: 'Missing',         bg: '#FADADD', color: '#C0392B' },
  review:          { label: 'Review',          bg: '#FEF3CD', color: '#D99A1C' },
  verified:        { label: 'Verified',        bg: '#D1F0E2', color: '#1E8E5A' },
  finalized:       { label: 'Finalized',       bg: '#D6DCF5', color: '#3B4BA8' },
  ai_proposed:     { label: 'AI Proposed',     bg: '#E8EAF6', color: '#3B4BA8' },
  review_required: { label: 'Review Required', bg: '#FEF3CD', color: '#D99A1C' },
};

export function StatusChip({ status }: { status: Status }) {
  const cfg = CONFIG[status] ?? CONFIG.review;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}
