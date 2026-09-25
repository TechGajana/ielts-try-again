import { adminAuth } from './firebase-admin';

export type AdminAccount = {
  uid: string;
  email: string;
  createdAt: number | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ASSUMPTION: an admin is a Firebase Auth user with a custom claim
 * { role: 'admin' }, matching the check in login/actions.ts:
 *   const claims = userRecord.customClaims;
 *   if (claims?.role !== 'admin') throw new Error('not admin');
 * If set-admin-claim.ts uses a different claim shape, tell me and I'll
 * update createAdminAccount and listAdmins to match.
 */
export async function listAdmins(): Promise<AdminAccount[]> {
  const admins: AdminAccount[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.customClaims?.role === 'admin') {
        admins.push({
          uid: user.uid,
          email: user.email ?? '(no email)',
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : null,
        });
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  admins.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return admins;
}

export async function createAdminAccount(input: { email: string; password: string }): Promise<{ uid: string }> {
  const email = input.email.trim().toLowerCase();

  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');

  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) throw new Error('An account with that email already exists.');

  const userRecord = await adminAuth.createUser({
    email,
    password: input.password,
    emailVerified: true,
  });

  try {
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
  } catch (err) {
    // Roll back so a failed claim write doesn't leave a non-admin orphaned account
    await adminAuth.deleteUser(userRecord.uid).catch(() => {});
    throw err;
  }

  return { uid: userRecord.uid };
}

export async function deleteAdminAccount(uid: string): Promise<void> {
  await adminAuth.deleteUser(uid);
}