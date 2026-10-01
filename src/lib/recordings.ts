import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getPlaybackUrl, getUploadUrl } from './r2-presign';
import { fetchDocsByIds } from './student-access';

export type Recording = {
  id: string;
  title: string;
  description: string;
  createdAt: number | null;
};

export type RecordingWithUrl = Recording & { videoUrl: string };

const VIDEO_URL_SECONDS = 2 * 60 * 60; // 2 hours

function toRecording(d: DocumentSnapshot): Recording {
  return {
    id: d.id,
    title: d.get('title') as string,
    description: (d.get('description') as string) ?? '',
    createdAt: (d.get('createdAt') as number | undefined) ?? null,
  };
}

async function withUrl(d: DocumentSnapshot): Promise<RecordingWithUrl> {
  return { ...toRecording(d), videoUrl: await getPlaybackUrl(d.get('videoKey') as string, VIDEO_URL_SECONDS) };
}

export async function listRecordings(): Promise<Recording[]> {
  const snap = await adminDb.collection('recordings').orderBy('createdAt', 'desc').get();
  return snap.docs.map(toRecording);
}

export async function getVideoUploadUrl(fileName: string, contentType: string) {
  const key = `recordings/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createRecording(input: { title: string; description: string; videoKey: string }) {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');
  if (!input.videoKey.startsWith('recordings/')) throw new Error('A video is required.');

  await adminDb.collection('recordings').add({
    title,
    description: input.description.trim(),
    videoKey: input.videoKey,
    createdAt: Date.now(),
  });
}

export async function deleteRecording(id: string) {
  await adminDb.collection('recordings').doc(id).delete();
}

export async function listRecordingsForStudent(allowedIds: string[]): Promise<RecordingWithUrl[]> {
  const docs = await fetchDocsByIds('recordings', allowedIds);
  const results = await Promise.all(docs.map(withUrl));
  return results.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function getRecordingForStudent(id: string, allowedIds: string[]): Promise<RecordingWithUrl | null> {
  if (!allowedIds.includes(id)) return null;
  const doc = await adminDb.collection('recordings').doc(id).get();
  if (!doc.exists) return null;
  return withUrl(doc);
}