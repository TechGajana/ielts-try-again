import { adminDb } from './firebase-admin';
import { getPlaybackUrl, getUploadUrl } from './r2-presign';

export type Recording = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  createdAt: number | null;
};

export type RecordingWithUrl = Recording & { videoUrl: string };

const VIDEO_URL_SECONDS = 2 * 60 * 60; // 2 hours, enough to watch a full lecture
const THUMBNAIL_URL_SECONDS = 2 * 60 * 60;

export async function listRecordings(): Promise<Recording[]> {
  const snap = await adminDb.collection('recordings').orderBy('createdAt', 'desc').get();
  return Promise.all(
    snap.docs.map(async (d) => {
      const thumbnailKey = d.get('thumbnailKey') as string | undefined;
      return {
        id: d.id,
        title: d.get('title') as string,
        description: (d.get('description') as string) ?? '',
        thumbnailUrl: thumbnailKey ? await getPlaybackUrl(thumbnailKey, THUMBNAIL_URL_SECONDS) : null,
        createdAt: (d.get('createdAt') as number | undefined) ?? null,
      };
    }),
  );
}

export async function getVideoUploadUrl(fileName: string, contentType: string) {
  const key = `recordings/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function getThumbnailUploadUrl(fileName: string, contentType: string) {
  const key = `recording-thumbnails/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createRecording(input: {
  title: string;
  description: string;
  videoKey: string;
  thumbnailKey?: string;
}) {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');
  if (!input.videoKey) throw new Error('A video is required.');

  await adminDb.collection('recordings').add({
    title,
    description: input.description.trim(),
    videoKey: input.videoKey,
    ...(input.thumbnailKey ? { thumbnailKey: input.thumbnailKey } : {}),
    createdAt: Date.now(),
  });
}

export async function deleteRecording(id: string) {
  await adminDb.collection('recordings').doc(id).delete();
  // Students who had access just stop seeing it; their allowedCourseIds
  // keep the stale id, but nothing matches it anymore, so it's harmless.
}

/** Recordings a specific student has been granted, with fresh signed playback and thumbnail URLs. */
export async function listRecordingsForStudent(allowedCourseIds: string[]): Promise<RecordingWithUrl[]> {
  if (allowedCourseIds.length === 0) return [];

  // Firestore 'in' queries cap at 30 values; chunk in case a student has more than that
  const chunks: string[][] = [];
  for (let i = 0; i < allowedCourseIds.length; i += 30) chunks.push(allowedCourseIds.slice(i, i + 30));

  const results: RecordingWithUrl[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb.collection('recordings').where('__name__', 'in', chunk).get();
    for (const d of snap.docs) {
      const thumbnailKey = d.get('thumbnailKey') as string | undefined;
      results.push({
        id: d.id,
        title: d.get('title') as string,
        description: (d.get('description') as string) ?? '',
        thumbnailUrl: thumbnailKey ? await getPlaybackUrl(thumbnailKey, THUMBNAIL_URL_SECONDS) : null,
        createdAt: (d.get('createdAt') as number | undefined) ?? null,
        videoUrl: await getPlaybackUrl(d.get('videoKey') as string, VIDEO_URL_SECONDS),
      });
    }
  }
  results.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return results;
}

/** A single recording, but only if this student is actually allowed to see it. */
export async function getRecordingForStudent(
  recordingId: string,
  allowedCourseIds: string[],
): Promise<RecordingWithUrl | null> {
  if (!allowedCourseIds.includes(recordingId)) return null;

  const doc = await adminDb.collection('recordings').doc(recordingId).get();
  if (!doc.exists) return null;

  const thumbnailKey = doc.get('thumbnailKey') as string | undefined;
  return {
    id: doc.id,
    title: doc.get('title') as string,
    description: (doc.get('description') as string) ?? '',
    thumbnailUrl: thumbnailKey ? await getPlaybackUrl(thumbnailKey, THUMBNAIL_URL_SECONDS) : null,
    createdAt: (doc.get('createdAt') as number | undefined) ?? null,
    videoUrl: await getPlaybackUrl(doc.get('videoKey') as string, VIDEO_URL_SECONDS),
  };
}