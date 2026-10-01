import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getPlaybackUrl, getUploadUrl } from './r2-presign';
import { fetchDocsByIds } from './student-access';

export type Material = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: number | null;
};

function toMaterial(d: DocumentSnapshot): Material {
  return {
    id: d.id,
    title: d.get('title') as string,
    description: (d.get('description') as string) ?? '',
    fileName: (d.get('fileName') as string) ?? '',
    createdAt: (d.get('createdAt') as number | undefined) ?? null,
  };
}

export async function listMaterials(): Promise<Material[]> {
  const snap = await adminDb.collection('materials').orderBy('createdAt', 'desc').get();
  return snap.docs.map(toMaterial);
}

export async function getMaterialUploadUrl(fileName: string, contentType: string) {
  const key = `materials/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createMaterial(input: { title: string; description: string; fileKey: string; fileName: string }) {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');
  if (!input.fileKey.startsWith('materials/')) throw new Error('A file is required.');

  await adminDb.collection('materials').add({
    title,
    description: input.description.trim(),
    fileKey: input.fileKey,
    fileName: input.fileName,
    createdAt: Date.now(),
  });
}

export async function deleteMaterial(id: string) {
  await adminDb.collection('materials').doc(id).delete();
}

export async function listMaterialsForStudent(allowedIds: string[]): Promise<Material[]> {
  const docs = await fetchDocsByIds('materials', allowedIds);
  return docs.map(toMaterial).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

/** Fresh short-lived download URL, only if this student has been granted the material. */
export async function getMaterialFileUrlForStudent(id: string, allowedIds: string[]): Promise<string | null> {
  if (!allowedIds.includes(id)) return null;
  const doc = await adminDb.collection('materials').doc(id).get();
  if (!doc.exists) return null;
  return getPlaybackUrl(doc.get('fileKey') as string, 10 * 60);
}