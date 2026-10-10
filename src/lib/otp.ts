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
    from: 'IELTS Try Again <noreply@mail.ieltstryagain.com>',
    to: email,
    subject: 'Your Login OTP',
    text: `Your OTP is: ${code}. It expires in 5 minutes.`,
  });
}

export async function verifyOtp(uid: string, submittedCode: string) {
  if (!/^\d{6}$/.test(submittedCode)) throw new Error('Enter the 6-digit code from your latest email.');

  const ref = adminDb.collection('otps').doc(uid);
  const error = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return 'No active verification code was found. Return to login to request a new code.';

    const data = doc.data()!;
    if (Date.now() > (data.expiresAt as number)) {
      tx.delete(ref);
      return 'This verification code has expired. Return to login to request a new code.';
    }

    const attempts = data.attempts as number;
    if (attempts >= 5) {
      tx.delete(ref);
      return 'Too many incorrect codes. Return to login to request a new code.';
    }

    if (submittedCode !== data.code) {
      tx.update(ref, { attempts: attempts + 1 });
      return 'Incorrect verification code.';
    }

    tx.delete(ref);
    return null;
  });

  if (error) throw new Error(error);
}