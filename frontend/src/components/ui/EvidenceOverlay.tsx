import React from 'react';

interface BBox { x: number; y: number; w: number; h: number; }
interface Line { id: number; box_json: BBox; text: string; }

interface EvidenceOverlayProps {
  lines: Line[];
  selectedLineIds: number[];
  width: number;
  height: number;
}

export function EvidenceOverlay({ lines, selectedLineIds, width, height }: EvidenceOverlayProps) {
  const selectedSet = new Set(selectedLineIds);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {lines.filter(l => selectedSet.has(l.id)).map(line => {
        const { x, y, w, h } = line.box_json;
        return (
          <rect
            key={line.id}
            x={x * width}
            y={y * height}
            width={w * width}
            height={h * height}
            fill="rgba(59,75,168,0.12)"
            stroke="#3B4BA8"
            strokeWidth={1.5}
            rx={3}
          />
        );
      })}
    </svg>
  );
}
