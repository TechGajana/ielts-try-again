import { getUploadUrl } from '../src/lib/r2-presign';

async function main() {
  const key = `speaking/test-upload-${Date.now()}.webm`;
  const uploadUrl = await getUploadUrl(key, 'audio/webm');

  console.log('Presigned URL generated. Uploading a dummy file directly (no browser, no CORS involved)...');

  const dummyData = Buffer.from('this is a test audio file placeholder');

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/webm' },
    body: dummyData,
  });

  console.log('Status:', res.status);
  console.log('OK:', res.ok);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.log('Response body:', body);
  } else {
    console.log(`Success. Check your R2 bucket for a new object at key: ${key}`);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});