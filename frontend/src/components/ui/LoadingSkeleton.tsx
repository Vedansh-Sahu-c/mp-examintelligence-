import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  height?: number;
}

export function LoadingSkeleton({ lines = 3, height = 20 }: LoadingSkeletonProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            borderRadius: 6,
            background: 'linear-gradient(90deg, #E2E6EE 25%, #F5F7FA 50%, #E2E6EE 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.5s infinite',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
