const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function verifyPasswordViaRest(email: string, password: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Invalid credentials');
  }
  return data; // contains localId (uid), idToken, etc.
}