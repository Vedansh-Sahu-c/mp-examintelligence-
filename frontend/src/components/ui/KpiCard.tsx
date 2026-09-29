import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, accentColor = '#3B4BA8' }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#1E8E5A' : trend === 'down' ? '#C0392B' : '#9BA8B8';

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E6EE',
        borderRadius: 10,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 13, color: '#6B7C93', fontWeight: 500 }}>{title}</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accentColor}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={accentColor} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#0B1F4B' }}>{value}</span>
        {trend && (
          <TrendIcon size={14} color={trendColor} />
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: 12, color: '#9BA8B8' }}>{subtitle}</span>
      )}
    </div>
  );
}
