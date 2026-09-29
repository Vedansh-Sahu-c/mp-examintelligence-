import React, { useState } from 'react';

interface BreakdownProps {
  ocr: number;
  coverage: number;
  agreement: number;
  semantic: number;
}

interface ConfidenceMeterProps {
  score: number;
  breakdown?: BreakdownProps;
}

export function ConfidenceMeter({ score, breakdown }: ConfidenceMeterProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? '#1E8E5A' : score >= 0.5 ? '#D99A1C' : '#C0392B';

  return (
    <div style={{ position: 'relative' }}>
      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#6B7C93', fontWeight: 500 }}>
          Confidence indicator <em style={{ fontStyle: 'normal', color: '#9BA8B8' }}>(not a probability)</em>
        </span>
        <span
          style={{ fontSize: 12, fontWeight: 700, color, cursor: breakdown ? 'help' : 'default' }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {pct}%
        </span>
      </div>

      {/* Bar */}
      <div
        style={{
          height: 6,
          background: '#E2E6EE',
          borderRadius: 4,
          overflow: 'hidden',
          cursor: breakdown ? 'help' : 'default',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Breakdown Tooltip */}
      {showTooltip && breakdown && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            background: '#0B1F4B',
            color: '#fff',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            zIndex: 50,
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <p style={{ margin: '0 0 6px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 6 }}>Indicator breakdown</p>
          {[
            { label: 'OCR confidence (×0.30)', val: breakdown.ocr },
            { label: 'Evidence coverage (×0.25)', val: breakdown.coverage },
            { label: 'Run agreement (×0.25)', val: breakdown.agreement },
            { label: 'Semantic support (×0.20)', val: breakdown.semantic },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, gap: 12 }}>
              <span style={{ color: '#B0BDD4' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{Math.round(val * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
