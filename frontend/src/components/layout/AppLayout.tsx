import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, ClipboardList,
  BarChart2, Shield, Settings, LogOut, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/evaluation/1', label: 'Evaluation',   icon: CheckSquare },
  { to: '/review-queue', label: 'Review Queue', icon: ClipboardList },
  { to: '/analytics',    label: 'Analytics',    icon: BarChart2 },
  { to: '/integrity',    label: 'Integrity',    icon: Shield },
  { to: '#',             label: 'Settings',     icon: Settings },
];

const ROLE_COLORS: Record<string, string> = {
  admin:     '#C0392B',
  examiner:  '#1E8E5A',
  moderator: '#3B4BA8',
  auditor:   '#D99A1C',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarW = collapsed ? 64 : 240;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F7FA' }}>
      {/* Persistent top banner */}
      <div style={{
        background: '#0B1F4B',
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
        padding: '6px 16px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        flexShrink: 0,
      }}>
        Prototype for MPOnline Idea &amp; Innovation Hackathon 2026.&nbsp;
        <span style={{ opacity: 0.75 }}>Sample data (synthetic).</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarW,
          background: '#FFFFFF',
          borderRight: '1px solid #E2E6EE',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Logo row */}
          <div style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 16px' : '0 20px',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid #E2E6EE',
          }}>
            {!collapsed && (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4B', letterSpacing: '0.02em' }}>
                EXAMINTELLECT
              </span>
            )}
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9BA8B8' }}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? '#0B1F4B' : '#6B7C93',
                  background: isActive ? '#F0F2FF' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  transition: 'all 0.15s',
                })}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div style={{ padding: '8px', borderTop: '1px solid #E2E6EE' }}>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%', borderRadius: 8, border: 'none', background: 'none',
                cursor: 'pointer', color: '#C0392B', fontSize: 14, fontWeight: 500,
              }}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <header style={{
            height: 56,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E6EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            gap: 12,
            flexShrink: 0,
          }}>
            {user && (
              <>
                <span style={{ fontSize: 13, color: '#6B7C93' }}>{user.username}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  background: `${ROLE_COLORS[user.role] ?? '#3B4BA8'}18`,
                  color: ROLE_COLORS[user.role] ?? '#3B4BA8',
                  textTransform: 'capitalize',
                }}>
                  {user.role}
                </span>
              </>
            )}
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
