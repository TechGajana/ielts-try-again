import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  const res = NextResponse.json({ status: 'success' });
  res.cookies.set('session', sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: true,
    path: '/',
  });
  return res;
}