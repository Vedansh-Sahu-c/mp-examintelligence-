import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle, BarChart2, Users } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { StatusChip } from '../components/ui/StatusChip';
import { getDashboardStats, getReviewQueue } from '../api/client';
import type { DashboardStats, ReviewItem } from '../api/client';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, q] = await Promise.all([getDashboardStats(), getReviewQueue()]);
      setStats(s);
      setQueue(q.slice(0, 5));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0B1F4B' }}>
        Dashboard
      </h1>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {loading ? (
        <LoadingSkeleton lines={8} height={100} />
      ) : stats ? (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <KpiCard title="Total Papers"        value={stats.total_sheets}  icon={FileText}     accentColor="#3B4BA8" />
            <KpiCard title="Evaluated"           value={stats.evaluated}     icon={CheckCircle}  accentColor="#1E8E5A" trend="up" />
            <KpiCard title="Pending"             value={stats.pending}       icon={Clock}        accentColor="#D99A1C" />
            <KpiCard title="Review Required"     value={stats.review_required} icon={AlertTriangle} accentColor="#C0392B" />
            <KpiCard title="AI/Examiner Agreement" value={`${Math.round(stats.agreement_rate * 100)}%`} icon={BarChart2} accentColor="#3B4BA8" subtitle="illustrative" />
            <KpiCard title="Avg Time / Answer"  value={`${Math.round(stats.avg_time_seconds)}s`} icon={Clock} accentColor="#0B1F4B" />
          </div>

          {/* Progress bar */}
          <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0B1F4B' }}>Evaluation Progress</span>
              <span style={{ fontSize: 13, color: '#6B7C93' }}>
                {stats.evaluated} / {stats.total_sheets}
              </span>
            </div>
            <div style={{ height: 8, background: '#E2E6EE', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: stats.total_sheets > 0 ? `${(stats.evaluated / stats.total_sheets) * 100}%` : '0%',
                background: '#1E8E5A',
                borderRadius: 4,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Review Queue Preview */}
          <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0B1F4B' }}>
              Recent Review Items
            </h2>
            {queue.length === 0 ? (
              <p style={{ color: '#9BA8B8', fontSize: 13 }}>No open review items.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E6EE' }}>
                    {['Sheet', 'Reason', 'Status', 'Created'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#9BA8B8', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                      <td style={{ padding: '10px 12px', color: '#0B1F4B' }}>#{item.sheet_id}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{item.reason}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusChip status={item.status.toLowerCase() as any} />
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9BA8B8' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
