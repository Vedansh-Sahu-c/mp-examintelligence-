import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, BarChart2, ArrowRight } from 'lucide-react';

const STEPS = [
  { num: 1, title: 'Scan',       desc: 'Upload answer sheet image or PDF. Header is automatically masked.' },
  { num: 2, title: 'Understand', desc: 'AI-powered OCR extracts lines with language tags and confidence scores.' },
  { num: 3, title: 'Evaluate',   desc: 'Gemini evaluates each criterion against the rubric, citing evidence line IDs only.' },
  { num: 4, title: 'Verify',     desc: 'Deterministic validator checks every output before it reaches the examiner.' },
  { num: 5, title: 'Analyze',    desc: 'Quality engine tracks consistency. Tamper-evident audit trail records every action.' },
];

const TRUST_CARDS = [
  {
    icon: Eye,
    title: 'Evidence-Grounded',
    desc: 'Every AI recommendation cites specific OCR line IDs. Examiners see exactly which text was used.',
  },
  {
    icon: ShieldCheck,
    title: 'Deterministic Validation',
    desc: 'Pure Python rules check scores, step sizes, evidence presence, and fuzzy-matched quotes before any result is shown.',
  },
  {
    icon: BarChart2,
    title: 'Tamper-Evident Audit',
    desc: 'SHA-256 hash chaining links every evaluation event. Any modification to history is detectable.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0B1F4B', background: '#F5F7FA', minHeight: '100vh' }}>
      {/* Top banner */}
      <div style={{
        background: '#0B1F4B', color: '#fff', fontSize: 12,
        textAlign: 'center', padding: '6px', fontWeight: 500,
      }}>
        Prototype for MPOnline Idea &amp; Innovation Hackathon 2026.&nbsp;
        <span style={{ opacity: 0.7 }}>Sample data (synthetic). Not for production use.</span>
      </div>

      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E2E6EE',
        padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0B1F4B', letterSpacing: '0.04em' }}>
            MP EXAMINTELLIGENCE
          </div>
          <div style={{ fontSize: 11, color: '#9BA8B8', fontWeight: 500 }}>
            AI-Assisted On-Screen Evaluation Platform
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['Overview', 'Evaluation', 'Analytics', 'Integrity', 'About'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              style={{ fontSize: 14, color: '#6B7C93', textDecoration: 'none', fontWeight: 500 }}>
              {item}
            </a>
          ))}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#F28C28', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
            Launch Demo
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section id="overview" style={{
        maxWidth: 1100, margin: '0 auto', padding: '80px 48px 60px',
        display: 'flex', gap: 48, alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#3B4BA8',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
          }}>
            AI-Assisted · Evidence-Grounded · Human-in-the-Loop
          </div>
          <h1 style={{ margin: '0 0 20px', fontSize: 42, fontWeight: 800, lineHeight: 1.2 }}>
            Smarter Evaluation.<br />Transparent Assessment.
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 16, color: '#6B7C93', lineHeight: 1.6, maxWidth: 460 }}>
            An AI-assisted marking system where AI recommends, software validates,
            and the examiner decides. Every action is logged in a tamper-evident audit trail.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/login')}
              style={{
                background: '#F28C28', color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
              Launch Demo →
            </button>
            <a href="#about"
              style={{
                background: '#fff', color: '#0B1F4B', border: '1px solid #E2E6EE', borderRadius: 8,
                padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none',
              }}>
              Read Limitations
            </a>
          </div>
        </div>

        {/* Static SVG illustration */}
        <div style={{ flex: '0 0 380px' }}>
          <svg viewBox="0 0 380 480" style={{ width: '100%', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.10))' }}>
            {/* Answer sheet background */}
            <rect x="20" y="20" width="340" height="440" rx="10" fill="white" stroke="#E2E6EE" strokeWidth="1.5" />
            {/* Header masked region */}
            <rect x="20" y="20" width="340" height="58" rx="10" fill="#0B1F4B" />
            <text x="190" y="53" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12" fontWeight="600">MASKED HEADER</text>
            {/* OCR lines */}
            {[100, 120, 140, 160, 180, 200, 220].map((y, i) => (
              <rect key={y} x="50" y={y} width={i % 3 === 2 ? 180 : 260} height="10" rx="3"
                fill={i === 2 ? '#3B4BA818' : '#F5F7FA'} stroke={i === 2 ? '#3B4BA8' : '#E2E6EE'} strokeWidth="1" />
            ))}
            {/* Evidence highlight box */}
            <rect x="46" y="136" width="268" height="12" rx="3" fill="#3B4BA820" stroke="#3B4BA8" strokeWidth="1.5" />
            {/* Mark chip */}
            <rect x="260" y="260" width="80" height="36" rx="8" fill="#1E8E5A" />
            <text x="300" y="282" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">4.5/5</text>
            {/* Verdict chip */}
            <rect x="52" y="262" width="52" height="22" rx="11" fill="#D1F0E2" />
            <text x="78" y="277" textAnchor="middle" fill="#1E8E5A" fontSize="10" fontWeight="700">met</text>
            {/* Evidence lines */}
            <line x1="46" y1="142" x2="260" y2="262" stroke="#3B4BA840" strokeWidth="1" strokeDasharray="4 3" />
            {/* Candidate token */}
            <rect x="50" y="380" width="100" height="20" rx="4" fill="#F0F2FF" />
            <text x="100" y="394" textAnchor="middle" fill="#3B4BA8" fontSize="9" fontFamily="JetBrains Mono">CAND-7F3K2</text>
          </svg>
        </div>
      </section>

      {/* 5-step flow */}
      <section id="evaluation" style={{ background: '#fff', borderTop: '1px solid #E2E6EE', borderBottom: '1px solid #E2E6EE', padding: '60px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 40 }}>How It Works</h2>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            {STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <div style={{ flex: 1, textAlign: 'center', padding: '0 12px' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#0B1F4B', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, margin: '0 auto 12px',
                  }}>{step.num}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: '#6B7C93', lineHeight: 1.5 }}>{step.desc}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ paddingTop: 14, color: '#E2E6EE' }}>
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section id="integrity" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 48px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Built for Trust</h2>
        <p style={{ textAlign: 'center', color: '#9BA8B8', marginBottom: 40, fontSize: 15 }}>
          Every design decision prioritises transparency, evidence, and human control.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {TRUST_CARDS.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10, padding: '24px 20px',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#F0F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Icon size={20} color="#3B4BA8" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7C93', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section id="about" style={{ background: '#FEF3CD', borderTop: '1px solid #D99A1C', padding: '36px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#7A5700', marginBottom: 10 }}>
            ⚠ Limitations &amp; Honest Caveats
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#7A5700', fontSize: 13, lineHeight: 2 }}>
            <li>OCR accuracy depends on image quality and handwriting legibility.</li>
            <li>AI evaluation outputs vary — the system runs two passes and measures agreement as a confidence indicator (not a probability).</li>
            <li>SHA-256 hash chaining detects tampering; it does not provide digital signatures or guarantee network-level security.</li>
            <li>All data in this prototype is synthetic. No real candidates, examiners, or exam results are used.</li>
            <li>This is a prototype for the MPOnline Hackathon 2026. It is not validated for production use.</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0B1F4B', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px', fontSize: 12 }}>
        Prototype for MPOnline Idea &amp; Innovation Hackathon 2026 · Challenge 3: AI-Driven Examination &amp; OSM Transformation ·
        Sample data (synthetic) · Not an official MPOnline product.
      </footer>
    </div>
  );
}
