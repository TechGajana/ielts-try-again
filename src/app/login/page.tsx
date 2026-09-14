'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStep1 } from './actions';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { uid } = await loginStep1(username, password);
      sessionStorage.setItem('pendingUid', uid);
      router.push('/login/otp');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <h1 className="text-xl font-semibold text-center">IELTS Try Again</h1>
        <input
          className="w-full border rounded p-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-black text-white rounded p-2">Login</button>
      </form>
    </div>
  );
}