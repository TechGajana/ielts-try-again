import { adminAuth } from './firebase-admin';
import { getAdminRole, requirePrimaryAdmin, type AdminRole } from './admin-auth';

export type AdminAccount = {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: AdminRole;
  createdAt: number | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listAdmins(): Promise<AdminAccount[]> {
  await requirePrimaryAdmin();
  const admins: AdminAccount[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const role = getAdminRole(user.customClaims ?? {});
      if (role) {
        admins.push({
          uid: user.uid,
          email: user.email ?? '(no email)',
          displayName: user.displayName ?? '',
          phoneNumber: user.phoneNumber ?? '',
          role,
          createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : null,
        });
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  admins.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return admins;
}

export async function createAdminAccount(input: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  role: AdminRole;
}): Promise<{ uid: string }> {
  await requirePrimaryAdmin();
  const email = input.email.trim().toLowerCase();

  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!input.displayName.trim()) throw new Error('Name is required.');
  if (input.phoneNumber.trim() && !/^\+[1-9]\d{6,14}$/.test(input.phoneNumber.trim())) {
    throw new Error('Enter the phone number in international format, such as +14155550123.');
  }

  const userRecord = await adminAuth.createUser({
    email,
    password: input.password,
    emailVerified: true,
    displayName: input.displayName.trim(),
    ...(input.phoneNumber.trim() ? { phoneNumber: input.phoneNumber.trim() } : {}),
  });

  try {
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'admin', adminRole: input.role });
  } catch (err) {
    try {
      await adminAuth.deleteUser(userRecord.uid);
    } catch (rollbackError) {
      console.error('Failed to roll back admin account after claim assignment failed.', rollbackError);
    }
    throw err;
  }

  return { uid: userRecord.uid };
}

export async function updateAdminRole(uid: string, role: AdminRole, actorUid: string): Promise<void> {
  const actor = await requirePrimaryAdmin();
  if (actor.uid !== actorUid) throw new Error('Administrator identity mismatch.');
  if (uid === actorUid) throw new Error('You cannot change your own administrator role.');
  const target = await adminAuth.getUser(uid);
  if (getAdminRole(target.customClaims ?? {}) === null) throw new Error('Administrator not found.');
  if (getAdminRole(target.customClaims ?? {}) === 'PRIMARY_ADMIN' && role === 'SECONDARY_ADMIN') {
    const admins = await listAdmins();
    if (admins.filter((admin) => admin.role === 'PRIMARY_ADMIN').length <= 1) {
      throw new Error('The last primary administrator cannot be demoted.');
    }
  }
  await adminAuth.setCustomUserClaims(uid, {
    ...target.customClaims,
    role: 'admin',
    adminRole: role,
  });
  await adminAuth.revokeRefreshTokens(uid);
}

export async function deleteAdminAccount(uid: string, actorUid: string): Promise<void> {
  const actor = await requirePrimaryAdmin();
  if (actor.uid !== actorUid) throw new Error('Administrator identity mismatch.');
  if (uid === actorUid) throw new Error('You cannot delete your own administrator account.');
  const target = await adminAuth.getUser(uid);
  const targetRole = getAdminRole(target.customClaims ?? {});
  if (!targetRole) throw new Error('Administrator not found.');
  if (targetRole === 'PRIMARY_ADMIN') {
    const admins = await listAdmins();
    if (admins.filter((admin) => admin.role === 'PRIMARY_ADMIN').length <= 1) {
      throw new Error('The last primary administrator cannot be deleted.');
    }
  }
  await adminAuth.deleteUser(uid);
}