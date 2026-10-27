import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Incidents', to: '/incidents', icon: AlertTriangle },
  { label: 'Releases', to: '/releases', icon: Boxes },
];

function pageTitle(pathname) {
  if (pathname === '/') return 'Overview';
  if (pathname.startsWith('/incidents/')) return 'Incident details';
  if (pathname === '/incidents') return 'Incidents';
  if (pathname.startsWith('/releases/')) return 'Release details';
  if (pathname === '/releases') return 'Releases';
  if (pathname === '/admin') return 'Admin';
  return 'Workspace';
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const title = pageTitle(pathname);
  const visibleNavigation = user?.role === 'ADMIN'
    ? [...navigation, { label: 'Admin', to: '/admin', icon: Shield }]
    : navigation;
  const initials = (user?.name || user?.email || 'OB')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setLogoutError('');
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={`app-frame${collapsed ? ' app-frame--collapsed' : ''}`}>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Command size={19} strokeWidth={2.4} /></span>
          <span className="brand-name">opsboard<span className="brand-period">.</span></span>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar"><Activity size={16} /></span>
          <span className="workspace-copy"><strong>Engineering</strong><small>Workspace</small></span>
          <ChevronRight size={15} className="muted-icon" />
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleNavigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Incidents' && <ChevronLeft size={13} className="nav-trailing" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-label">ACCOUNT</div>
          <div className="profile-row">
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{user?.name || 'Workspace member'}</strong>
              <small>{user?.email || user?.role || 'Signed in'}</small>
            </span>
            <button
              className="icon-button logout-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={16} />
            </button>
          </div>
          {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}
        </div>
        <button
          className="collapse-button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span>Collapse sidebar</span>
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-avatar" aria-label={user?.name || 'User'}>{initials}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
