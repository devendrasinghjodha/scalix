'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { memberApi } from '@/lib/api';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshOrgs } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=/invitations/accept?token=${token}`);
      return;
    }

    if (isAuthenticated && token) {
      acceptInvitation();
    }
  }, [isAuthenticated, isLoading, token]);

  const acceptInvitation = async () => {
    if (!token) return;
    try {
      await memberApi.acceptInvitation(token);
      await refreshOrgs();
      setStatus('success');
      setMessage('Invitation accepted! Redirecting to dashboard...');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.error?.message || 'Failed to accept invitation');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="card max-w-md w-full text-center animate-fade-in">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 mx-auto border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
            <p>Accepting invitation...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2 gradient-text">Welcome!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>Failed</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">Go to Dashboard</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
