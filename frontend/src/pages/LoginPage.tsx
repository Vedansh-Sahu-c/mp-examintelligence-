import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../api/client';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername('examiner1');
    setPassword('demo1234');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5F7FA',
    }}>
      {/* Prototype banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: '#0B1F4B', color: '#fff', fontSize: 12,
        textAlign: 'center', padding: '6px', fontWeight: 500,
      }}>
        Prototype for MPOnline Idea &amp; Innovation Hackathon 2026. Sample data (synthetic).
      </div>

      <div style={{
        background: '#fff', border: '1px solid #E2E6EE', borderRadius: 10,
        padding: '40px 36px', width: '100%', maxWidth: 380, marginTop: 40,
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0B1F4B' }}>
          MP ExamIntelligence
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#9BA8B8' }}>
          AI-Assisted On-Screen Evaluation Platform
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#0B1F4B', marginBottom: 6 }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #E2E6EE', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', color: '#0B1F4B',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#0B1F4B', marginBottom: 6 }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: '1px solid #E2E6EE', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', color: '#0B1F4B',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#FADADD', border: '1px solid #C0392B',
              borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#C0392B',
            }}>
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            style={{
              background: '#F28C28', color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <button
            id="demo-login-btn"
            type="button"
            onClick={fillDemo}
            style={{
              background: '#F5F7FA', color: '#3B4BA8', border: '1px solid #E2E6EE',
              borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Demo Login (examiner1 / demo1234)
          </button>
        </form>
      </div>
    </div>
  );
}
