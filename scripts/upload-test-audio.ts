import 'dotenv/config';
import { r2 } from '../src/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

async function main() {
  const fileBuffer = fs.readFileSync('scripts/assets/test-audio.mp3');
  const key = 'listening/task-1.mp3';

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg',
  }));

  console.log('Uploaded to R2 with key:', key);
}

main().catch(console.error);