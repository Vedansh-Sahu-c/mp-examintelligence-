import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, icon: Icon = InboxIcon }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: '#F5F7FA',
          border: '1px solid #E2E6EE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icon size={24} color="#9BA8B8" />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0B1F4B' }}>{title}</p>
      {description && (
        <p style={{ margin: 0, fontSize: 13, color: '#9BA8B8', maxWidth: 320 }}>{description}</p>
      )}
    </div>
  );
}
