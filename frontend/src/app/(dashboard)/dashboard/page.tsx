'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { orgApi, projectApi, taskApi } from '@/lib/api';
import { FolderKanban, CheckSquare, Users, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, currentOrg, organizations, refreshOrgs } = useAuth();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, members: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadStats();
    }
  }, [currentOrg]);

  const loadStats = async () => {
    if (!currentOrg) return;
    try {
      const [projRes, taskRes] = await Promise.all([
        projectApi.list(currentOrg.id, { limit: 5 }),
        taskApi.list(currentOrg.id, { limit: '5' }),
      ]);
      setStats({
        projects: projRes.data.pagination?.total || 0,
        tasks: taskRes.data.pagination?.total || 0,
        members: currentOrg._count?.members || 0,
      });
      setRecentTasks(taskRes.data.data || []);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const createOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      await orgApi.create({ name: newOrgName });
      setNewOrgName('');
      setShowCreateOrg(false);
      await refreshOrgs();
    } catch (error) {
      console.error('Failed to create org:', error);
    } finally {
      setCreating(false);
    }
  };

  const statusColors: Record<string, string> = {
    TODO: 'badge-blue',
    IN_PROGRESS: 'badge-orange',
    IN_REVIEW: 'badge-purple',
    DONE: 'badge-green',
    CANCELLED: 'badge-red',
  };

  const priorityColors: Record<string, string> = {
    LOW: 'badge-teal',
    MEDIUM: 'badge-blue',
    HIGH: 'badge-orange',
    URGENT: 'badge-red',
  };

  if (!currentOrg) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Welcome to Scalix, {user?.name}!</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Create your first organization to get started.</p>

        <div className="card max-w-md">
          <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createOrg()}
            />
            <button onClick={createOrg} disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{currentOrg.name} overview</p>
        </div>
        <button onClick={() => setShowCreateOrg(true)} className="btn-secondary flex items-center gap-2">
          <Plus size={16} />
          New Organization
        </button>
      </div>

      {/* Create Org Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
            <input
              className="input-field mb-4"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreateOrg(false)} className="btn-secondary">Cancel</button>
              <button onClick={createOrg} disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/projects" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <FolderKanban size={24} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.projects}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Projects</div>
          </div>
        </Link>

        <Link href="/tasks" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <CheckSquare size={24} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.tasks}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tasks</div>
          </div>
        </Link>

        <Link href="/team" className="card-hover flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
            <Users size={24} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.members}</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Members</div>
          </div>
        </Link>
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <Link href="/tasks" className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>View all →</Link>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No tasks yet. Create your first project and task!</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-white/5"
                style={{ border: '1px solid var(--border-color)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {task.project?.name} • {task.assignee?.name || 'Unassigned'}
                  </div>
                </div>
                <span className={statusColors[task.status] || 'badge-blue'}>{task.status.replace('_', ' ')}</span>
                <span className={priorityColors[task.priority] || 'badge-blue'}>{task.priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
