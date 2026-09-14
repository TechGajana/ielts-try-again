import { adminDb } from './firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

export async function createAndSendOtp(uid: string, email: string) {
  const code = generateOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  await adminDb.collection('otps').doc(uid).set({
    code,
    expiresAt,
    attempts: 0,
  });

  await resend.emails.send({
    from: 'IELTS Try Again <onboarding@resend.dev>',
    to: email,
    subject: 'Your Login OTP',
    text: `Your OTP is: ${code}. It expires in 5 minutes.`,
  });
}

export async function verifyOtp(uid: string, submittedCode: string) {
  const ref = adminDb.collection('otps').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) throw new Error('OTP not found. Please login again.');

  const { code, expiresAt, attempts } = doc.data()!;
  if (Date.now() > expiresAt) throw new Error('OTP expired. Please login again.');
  if (attempts >= 5) throw new Error('Too many attempts. Please login again.');

  if (submittedCode !== code) {
    await ref.update({ attempts: attempts + 1 });
    throw new Error('Incorrect OTP.');
  }

  await ref.delete(); // consume it
}