'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('scalix_token', token);
      router.push('/dashboard');
    } else {
      router.push('/login?error=google_auth_failed');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="w-10 h-10 mx-auto border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
        <p style={{ color: 'var(--text-muted)' }}>Completing login...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
