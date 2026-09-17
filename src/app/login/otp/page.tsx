'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase-client';
import { loginStep2 } from '../actions';

export default function OtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const uid = sessionStorage.getItem('pendingUid');
      if (!uid) throw new Error('Session expired. Please login again.');

      const { customToken } = await loginStep2(uid, otp);

      const cred = await signInWithCustomToken(clientAuth, customToken);
      const idToken = await cred.user.getIdToken();

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
      sessionStorage.removeItem('pendingUid');
      sessionStorage.removeItem('isAdmin');
      router.push(isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <h1 className="text-xl font-semibold text-center">Enter OTP</h1>
        <input
          className="w-full border rounded p-2"
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-black text-white rounded p-2">Verify</button>
      </form>
    </div>
  );
}