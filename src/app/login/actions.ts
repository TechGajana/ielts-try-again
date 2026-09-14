'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifyPasswordViaRest } from '@/lib/firebase-rest';
import { createAndSendOtp, verifyOtp } from '@/lib/otp';
import { cookies } from 'next/headers';

export async function loginStep1(username: string, password: string) {
  // 1. Look up email from username
  const snap = await adminDb
    .collection('students')
    .where('username', '==', username)
    .limit(1)
    .get();

  if (snap.empty) throw new Error('Invalid username or password.');

  const studentDoc = snap.docs[0];
  const { email, accountStatus } = studentDoc.data();

  if (accountStatus !== 'active') {
    throw new Error('Account is not active. Contact your administrator.');
  }

  // 2. Verify password
  try {
    await verifyPasswordViaRest(email, password);
  } catch {
    throw new Error('Invalid username or password.');
  }

  // 3. Send OTP
  await createAndSendOtp(studentDoc.id, email);

  return { uid: studentDoc.id }; // pass this to the OTP step
}

export async function loginStep2(uid: string, otp: string) {
  await verifyOtp(uid, otp);

  // Create a Firebase custom token, then a session cookie
  const customToken = await adminAuth.createCustomToken(uid);

  // We'll exchange this for an ID token client-side, then call a route
  // to set the session cookie. See Step 6.
  return { customToken };
}