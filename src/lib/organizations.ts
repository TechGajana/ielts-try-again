import { adminDb } from './firebase-admin';
import { getPlaybackUrl, getUploadUrl } from './r2-presign';

export type Organization = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export async function listOrganizations(): Promise<Organization[]> {
  const snap = await adminDb.collection('organizations').orderBy('name').get();
  return Promise.all(
    snap.docs.map(async (d) => {
      const logoKey = d.get('logoKey') as string | undefined;
      return {
        id: d.id,
        name: d.get('name') as string,
        logoUrl: logoKey ? await getPlaybackUrl(logoKey) : null,
      };
    }),
  );
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const doc = await adminDb.collection('organizations').doc(id).get();
  if (!doc.exists) return null;
  const logoKey = doc.get('logoKey') as string | undefined;
  return {
    id: doc.id,
    name: doc.get('name') as string,
    logoUrl: logoKey ? await getPlaybackUrl(logoKey) : null,
  };
}

export async function getLogoUploadUrl(fileName: string, contentType: string) {
  const key = `organizations/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createOrganization(input: { name: string; logoKey: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('Institute name is required.');
  if (!input.logoKey) throw new Error('A logo is required.');

  const dupe = await adminDb.collection('organizations').where('name', '==', name).limit(1).get();
  if (!dupe.empty) throw new Error('An institute with that name already exists.');

  await adminDb.collection('organizations').add({ name, logoKey: input.logoKey, createdAt: Date.now() });
}

export async function deleteOrganization(id: string) {
  await adminDb.collection('organizations').doc(id).delete();
  // Students keep their organizationId; the dashboard falls back to default
  // branding automatically if the org can no longer be found.
}