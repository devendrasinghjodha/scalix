'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auditLogApi } from '@/lib/api';
import { ScrollText, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const { currentOrg } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    if (currentOrg) loadLogs();
  }, [currentOrg, page, actionFilter]);

  const loadLogs = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (actionFilter) params.action = actionFilter;

      const res = await auditLogApi.list(currentOrg.id, params);
      setLogs(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const actionLabels: Record<string, { label: string; color: string }> = {
    USER_LOGIN: { label: '🔑 Login', color: 'badge-blue' },
    USER_INVITED: { label: '📧 Invited', color: 'badge-purple' },
    USER_REMOVED: { label: '🚪 Removed', color: 'badge-red' },
    ROLE_CHANGED: { label: '🔄 Role Changed', color: 'badge-orange' },
    PROJECT_CREATED: { label: '📁 Project Created', color: 'badge-green' },
    PROJECT_UPDATED: { label: '✏️ Project Updated', color: 'badge-blue' },
    PROJECT_DELETED: { label: '🗑️ Project Deleted', color: 'badge-red' },
    TASK_CREATED: { label: '✅ Task Created', color: 'badge-green' },
    TASK_UPDATED: { label: '✏️ Task Updated', color: 'badge-blue' },
    TASK_DELETED: { label: '🗑️ Task Deleted', color: 'badge-red' },
    SUBSCRIPTION_CREATED: { label: '💳 Subscription Created', color: 'badge-green' },
    SUBSCRIPTION_UPDATED: { label: '💳 Subscription Updated', color: 'badge-blue' },
    SUBSCRIPTION_CANCELLED: { label: '❌ Subscription Cancelled', color: 'badge-red' },
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track all activity in your organization</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select className="input-field w-auto" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {Object.entries(actionLabels).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log List */}
      <div className="card">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-14 rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No audit logs found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const actionInfo = actionLabels[log.action] || { label: log.action, color: 'badge-blue' };
              return (
                <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg transition-all hover:bg-white/5" style={{ border: '1px solid var(--border-color)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--gradient-3)', color: 'white' }}>
                    {log.actor?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{log.actor?.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> — {log.entity}</span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {JSON.stringify(log.metadata).slice(0, 100)}
                      </div>
                    )}
                  </div>
                  <span className={actionInfo.color}>{actionInfo.label}</span>
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-30">← Prev</button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-30">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
