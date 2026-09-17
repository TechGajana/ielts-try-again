'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { verifyPasswordViaRest } from '@/lib/firebase-rest';
import { createAndSendOtp, verifyOtp } from '@/lib/otp';

export async function loginStep1(usernameOrEmail: string, password: string) {
  let email: string;
  let uid: string;
  let isAdmin = false;

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
      isAdmin = true;
    } catch {
      throw new Error('Invalid username or password.');
    }
  }

  try {
    await verifyPasswordViaRest(email, password);
  } catch {
    throw new Error('Invalid username or password.');
  }

  await createAndSendOtp(uid, email);

  return { uid, isAdmin };
}

export async function loginStep2(uid: string, otp: string) {
  await verifyOtp(uid, otp);
  const customToken = await adminAuth.createCustomToken(uid);
  return { customToken };
}