'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { orgApi } from '@/lib/api';
import { Settings as SettingsIcon, Save, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { currentOrg, refreshOrgs, logout } = useAuth();
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveSettings = async () => {
    if (!currentOrg || !orgName.trim()) return;
    setSaving(true);
    try {
      await orgApi.update(currentOrg.id, { name: orgName });
      await refreshOrgs();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrg = async () => {
    if (!currentOrg || deleteConfirm !== currentOrg.name) return;
    setDeleting(true);
    try {
      await orgApi.delete(currentOrg.id);
      logout();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage organization settings</p>
      </div>

      {/* Organization Settings */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SettingsIcon size={20} />
          Organization
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Organization Name</label>
            <input
              className="input-field"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Slug</label>
            <input className="input-field opacity-60" value={currentOrg?.slug || ''} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Plan</label>
            <input className="input-field opacity-60" value={currentOrg?.plan || 'FREE'} disabled />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm" style={{ color: 'var(--accent-green)' }}>✓ Saved!</span>}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--accent-red)' }}>
          <AlertTriangle size={20} />
          Danger Zone
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Deleting this organization will permanently remove all projects, tasks, and member data. This action cannot be undone.
        </p>
        
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="btn-danger">
            Delete Organization
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Type <strong style={{ color: 'var(--accent-red)' }}>{currentOrg?.name}</strong> to confirm:
            </p>
            <input
              className="input-field"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={currentOrg?.name}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={deleteOrg}
                disabled={deleteConfirm !== currentOrg?.name || deleting}
                className="btn-danger disabled:opacity-30"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
