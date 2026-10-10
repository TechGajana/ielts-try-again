'use server';

import { cookies } from 'next/headers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { exchangeCustomToken, verifyPasswordViaRest } from '@/lib/firebase-rest';
import { createAndSendOtp, verifyOtp } from '@/lib/otp';

export async function loginStep1(usernameOrEmail: string, password: string) {
  let email: string;
  let uid: string;

  // Try student username lookup first
  const snap = await adminDb
    .collection('students')
    .where('username', '==', usernameOrEmail)
    .limit(1)
    .get();

  if (!snap.empty) {
    const studentDoc = snap.docs[0];
    const data = studentDoc.data();
    if (data.accountStatus !== 'active') {
      throw new Error('Account is not active. Contact your administrator.');
    }
    email = data.email;
    uid = studentDoc.id;
  } else {
    // Fall back: treat input as an admin email
    try {
      const userRecord = await adminAuth.getUserByEmail(usernameOrEmail);
      const claims = userRecord.customClaims;
      if (claims?.role !== 'admin') throw new Error('not admin');
      email = usernameOrEmail;
      uid = userRecord.uid;
    } catch {
      throw new Error('Invalid username or password.');
    }
  }

  try {
    const identity = await verifyPasswordViaRest(email, password);
    if (identity.uid !== uid) throw new Error('Invalid credentials.');
  } catch {
    throw new Error('Invalid username or password.');
  }

  await createAndSendOtp(uid, email);

  return { uid };
}

export async function loginStep2(uid: string, otp: string) {
  if (!uid) throw new Error('Your login session expired. Return to login and try again.');

  const customToken = await adminAuth.createCustomToken(uid);
  const identity = await exchangeCustomToken(customToken);
  const decodedToken = await adminAuth.verifyIdToken(identity.idToken, true);
  if (decodedToken.uid !== uid) throw new Error('The signed-in account did not match. Please login again.');

  const user = await adminAuth.getUser(uid);
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  const sessionCookie = await adminAuth.createSessionCookie(identity.idToken, { expiresIn });
  await verifyOtp(uid, otp);

  (await cookies()).set('session', sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return { isAdmin: user.customClaims?.role === 'admin' };
}