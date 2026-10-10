const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

type FirebaseAuthResponse = {
  localId?: string;
  idToken?: string;
  error?: { message?: string };
};

export async function verifyPasswordViaRest(email: string, password: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = (await res.json()) as FirebaseAuthResponse;
  if (!res.ok || !data.localId || !data.idToken) {
    throw new Error(data.error?.message ?? 'Invalid credentials');
  }
  return { uid: data.localId };
}

export async function exchangeCustomToken(customToken: string) {
  if (!API_KEY) throw new Error('Firebase API key is not configured.');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as FirebaseAuthResponse;
  if (!res.ok || !data.idToken) {
    throw new Error(data.error?.message ?? 'Unable to complete sign-in.');
  }
  return { idToken: data.idToken };
}