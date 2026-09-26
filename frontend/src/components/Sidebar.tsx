'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  ScrollText,
  CreditCard,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, currentOrg, organizations, setCurrentOrg, logout } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Logo */}
      <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--gradient-1)' }}>
          S
        </div>
        <span className="text-lg font-bold gradient-text">Scalix</span>
      </div>

      {/* Organization Selector */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="relative">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: 'var(--gradient-2)', color: 'white' }}>
              {currentOrg?.name?.charAt(0) || 'O'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium truncate">{currentOrg?.name || 'Select Org'}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentOrg?.plan || 'FREE'}</div>
            </div>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          </button>

          {orgDropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setCurrentOrg(org);
                    setOrgDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-all hover:opacity-80"
                  style={{
                    background: org.id === currentOrg?.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    borderLeft: org.id === currentOrg?.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}
                >
                  <Building2 size={14} />
                  <span className="truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
              }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--gradient-3)', color: 'white' }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-all hover:bg-red-500/10"
            style={{ color: 'var(--text-muted)' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
