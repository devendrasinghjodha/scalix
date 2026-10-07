'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { memberApi } from '@/lib/api';
import { UserPlus, Trash2, Mail, X } from 'lucide-react';

export default function TeamPage() {
  const { currentOrg, user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link: string } | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadMembers();
      loadInvitations();
    }
  }, [currentOrg]);

  const loadMembers = async () => {
    if (!currentOrg) return;
    try {
      const res = await memberApi.list(currentOrg.id);
      setMembers(res.data.data || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!currentOrg) return;
    try {
      const res = await memberApi.listInvitations(currentOrg.id);
      setInvitations(res.data.data || []);
    } catch {
      // User may not have permissions
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !currentOrg) return;
    setInviting(true);
    try {
      const res = await memberApi.invite(currentOrg.id, { email: inviteEmail, role: inviteRole });
      setInviteResult({ link: res.data.data.invitationLink });
      setInviteEmail('');
      loadInvitations();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (memberId: string, role: string) => {
    if (!currentOrg) return;
    try {
      await memberApi.changeRole(currentOrg.id, memberId, { role });
      loadMembers();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to change role');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!currentOrg || !confirm('Remove this member?')) return;
    try {
      await memberApi.remove(currentOrg.id, memberId);
      loadMembers();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to remove');
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!currentOrg) return;
    try {
      await memberApi.revokeInvitation(currentOrg.id, invitationId);
      loadInvitations();
    } catch (error) {
      console.error('Failed to revoke:', error);
    }
  };

  const roleColors: Record<string, string> = {
    OWNER: 'badge-purple', ADMIN: 'badge-blue', MANAGER: 'badge-teal', MEMBER: 'badge-green',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage members and invitations</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Invite Member</h2>
            
            {inviteResult ? (
              <div>
                <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--accent-green)' }}>✅ Invitation created!</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Share this link (displayed in console/logs):</p>
                  <code className="text-xs break-all block p-2 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-blue)' }}>
                    {inviteResult.link}
                  </code>
                </div>
                <button onClick={() => { setInviteResult(null); setShowInvite(false); }} className="btn-primary w-full">Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <input className="input-field" placeholder="Email address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} autoFocus />
                  <select className="input-field" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
                  <button onClick={inviteMember} disabled={inviting} className="btn-primary">
                    {inviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Members ({members.length})</h2>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="shimmer h-14 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg group" style={{ border: '1px solid var(--border-color)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--gradient-1)', color: 'white' }}>
                  {member.user.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{member.user.name} {member.user.id === user?.id && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(you)</span>}</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{member.user.email}</div>
                </div>
                <span className={roleColors[member.role]}>{member.role}</span>
                {member.role !== 'OWNER' && member.user.id !== user?.id && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      className="input-field w-auto text-xs py-1 px-2"
                      value={member.role}
                      onChange={(e) => changeRole(member.id, e.target.value)}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button onClick={() => removeMember(member.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--accent-red)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations ({invitations.length})</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ border: '1px solid var(--border-color)' }}>
                <Mail size={18} style={{ color: 'var(--text-muted)' }} />
                <div className="flex-1">
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Invited by {inv.invitedBy?.name}</div>
                </div>
                <span className={roleColors[inv.role]}>{inv.role}</span>
                <button onClick={() => revokeInvitation(inv.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--accent-red)' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
