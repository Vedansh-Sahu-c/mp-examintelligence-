import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashBadgeProps {
  hash: string;
}

export function HashBadge({ hash }: HashBadgeProps) {
  const [copied, setCopied] = useState(false);

  const display = hash.length >= 16
    ? `${hash.slice(0, 8)}…${hash.slice(-8)}`
    : hash;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title={hash}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        background: '#F5F7FA',
        border: '1px solid #E2E6EE',
        borderRadius: 6,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        color: '#3B4BA8',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {display}
      {copied ? <Check size={12} color="#1E8E5A" /> : <Copy size={12} color="#9BA8B8" />}
    </button>
  );
}
