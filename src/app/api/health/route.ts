import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { r2 } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { openai } from '@/lib/openai';

export async function GET() {
  const results: Record<string, string> = {};

  // 1. Firestore write test
  try {
    await adminDb.collection('_health').doc('test').set({ checkedAt: new Date().toISOString() });
    results.firestore = 'OK';
  } catch (e: any) {
    results.firestore = `FAIL: ${e.message}`;
  }

  // 2. R2 upload test
  try {
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: '_health/test.txt',
      Body: 'health check',
    }));
    results.r2 = 'OK';
  } catch (e: any) {
    results.r2 = `FAIL: ${e.message}`;
  }

  // 3. OpenAI test
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5,
    });
    results.openai = res.choices[0]?.message?.content ?? 'FAIL: empty response';
  } catch (e: any) {
    results.openai = `FAIL: ${e.message}`;
  }

  return NextResponse.json(results);
}