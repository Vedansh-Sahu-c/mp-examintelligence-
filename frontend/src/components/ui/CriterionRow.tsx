import React from 'react';
import { StatusChip } from './StatusChip';

interface CriterionRowProps {
  name: string;
  description?: string;
  maxMarks: number;
  aiScore?: number;
  verdict?: 'met' | 'partial' | 'missing';
  reason?: string;
  evidenceLineIds?: number[];
  isSelected: boolean;
  isReviewRequired?: boolean;
  onClick: () => void;
}

export function CriterionRow({
  name,
  maxMarks,
  aiScore,
  verdict,
  reason,
  evidenceLineIds = [],
  isSelected,
  isReviewRequired,
  onClick,
}: CriterionRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: `1px solid ${isSelected ? '#3B4BA8' : '#E2E6EE'}`,
        borderRadius: 8,
        background: isSelected ? '#EEF0FB' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0B1F4B' }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isReviewRequired && verdict && <StatusChip status={verdict} />}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4B' }}>
            {isReviewRequired ? '?' : (aiScore ?? 0)}/{maxMarks}
          </span>
        </div>
      </div>

      {!isReviewRequired && reason && (
        <p style={{ margin: 0, fontSize: 12, color: '#6B7C93', lineHeight: 1.4 }}>
          {reason}
        </p>
      )}

      {!isReviewRequired && evidenceLineIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {evidenceLineIds.map(id => (
            <span
              key={id}
              style={{
                fontSize: 10,
                padding: '1px 6px',
                background: '#E8EAF6',
                color: '#3B4BA8',
                borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              L{id}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
