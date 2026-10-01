import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { fetchDocsByIds } from './student-access';

import { LIVE_PLATFORMS } from './live-platforms';

export type LiveClass = {
  id: string;
  title: string;
  platform: string;
  meetingUrl: string;
  details: string;
  scheduledAt: number;
};

function toLiveClass(d: DocumentSnapshot): LiveClass {
  return {
    id: d.id,
    title: d.get('title') as string,
    platform: (d.get('platform') as string) ?? 'Other',
    meetingUrl: d.get('meetingUrl') as string,
    details: (d.get('details') as string) ?? '',
    scheduledAt: (d.get('scheduledAt') as number) ?? 0,
  };
}

export async function listLiveClasses(): Promise<LiveClass[]> {
  const snap = await adminDb.collection('liveClasses').orderBy('scheduledAt', 'desc').get();
  return snap.docs.map(toLiveClass);
}

export async function createLiveClass(input: {
  title: string;
  platform: string;
  meetingUrl: string;
  details: string;
  scheduledAt: number;
}) {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');
  if (!Number.isFinite(input.scheduledAt) || input.scheduledAt <= 0) throw new Error('Pick a date and time.');

  let url: URL;
  try {
    url = new URL(input.meetingUrl.trim());
  } catch {
    throw new Error('Enter a valid meeting link.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('The meeting link must start with https://');

  const platform = (LIVE_PLATFORMS as readonly string[]).includes(input.platform) ? input.platform : 'Other';

  await adminDb.collection('liveClasses').add({
    title,
    platform,
    meetingUrl: url.toString(),
    details: input.details.trim(),
    scheduledAt: input.scheduledAt,
    createdAt: Date.now(),
  });
}

export async function deleteLiveClass(id: string) {
  await adminDb.collection('liveClasses').doc(id).delete();
}

export async function listLiveClassesForStudent(allowedIds: string[]): Promise<LiveClass[]> {
  const docs = await fetchDocsByIds('liveClasses', allowedIds);
  return docs.map(toLiveClass).sort((a, b) => b.scheduledAt - a.scheduledAt);
}