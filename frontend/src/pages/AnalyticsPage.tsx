import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { getAnalytics, getQualityMetrics } from '../api/client';
import type { AnalyticsData, QualityMetrics } from '../api/client';
import { BarChart2 } from 'lucide-react';

export function AnalyticsPage() {
  const [examId, setExamId] = useState(1);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [quality, setQuality] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, q] = await Promise.all([getAnalytics(examId), getQualityMetrics(examId)]);
      setAnalytics(a);
      setQuality(q);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [examId]);

  // Find criterion with highest miss rate
  const worstCriterion = analytics?.questions
    .flatMap(q => q.criteria)
    .sort((a, b) => b.miss_rate - a.miss_rate)[0];

  const qMeanData = analytics?.questions.map(q => ({
    name: `Q${q.question_id}`,
    mean: q.mean_score,
    max: q.max_marks,
    pct: q.max_marks > 0 ? Math.round((q.mean_score / q.max_marks) * 100) : 0,
  }));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0B1F4B' }}>Analytics</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#6B7C93' }}>Exam:</label>
          <input type="number" value={examId} min={1} onChange={e => setExamId(Number(e.target.value))}
            style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E6EE', fontSize: 13 }} />
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {loading ? <LoadingSkeleton lines={10} height={80} /> : (
        analytics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Headline insight */}
            {worstCriterion && worstCriterion.miss_rate > 0 && (
              <div style={{
                background: '#FEF3CD', border: '1px solid #D99A1C', borderRadius: 10,
                padding: '14px 20px', color: '#7A5700', fontSize: 14, fontWeight: 500,
              }}>
                💡 <strong>{worstCriterion.name}</strong> accounts for the most mark loss
                (miss rate: {Math.round(worstCriterion.miss_rate * 100)}%).
                Consider reviewing model answers for this criterion.
              </div>
            )}

            {/* Per-question means */}
            <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: 20 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0B1F4B' }}>Per-Question Mean Score</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={qMeanData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9BA8B8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#9BA8B8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E6EE', fontSize: 12 }}
                    formatter={(v: any) => [`${v} marks`, 'Mean score']}
                  />
                  <Bar dataKey="mean" fill="#3B4BA8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Score histogram */}
            {analytics.histogram.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: 20 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0B1F4B' }}>Score Distribution</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#9BA8B8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9BA8B8' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E6EE', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#1E8E5A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Examiner consistency */}
            {quality && quality.examiners.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: 20 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#0B1F4B' }}>Examiner Consistency</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E6EE' }}>
                      {['Examiner', 'N', 'Mean (norm.)', 'Agreement', 'Override Rate', 'Avg Time', 'Flag'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#9BA8B8', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quality.examiners.map(ex => (
                      <tr key={ex.examiner_id} style={{ borderBottom: '1px solid #F5F7FA' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0B1F4B' }}>{ex.username}</td>
                        <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{ex.n}</td>
                        <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{Math.round(ex.mean_normalized * 100)}%</td>
                        <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{Math.round(ex.agreement_rate * 100)}%</td>
                        <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{Math.round(ex.override_rate * 100)}%</td>
                        <td style={{ padding: '10px 12px', color: '#6B7C93' }}>{ex.avg_time_seconds}s</td>
                        <td style={{ padding: '10px 12px' }}>
                          {ex.drift_flag ? (
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                              background: '#FEF3CD', color: '#D99A1C',
                            }}>Consistency review suggested</span>
                          ) : (
                            <span style={{ color: '#1E8E5A', fontSize: 12 }}>✓ Consistent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="No analytics data" description="Select an exam to view analytics." icon={BarChart2} />
        )
      )}
    </div>
  );
}
