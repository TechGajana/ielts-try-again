import 'server-only';

import { cookies } from 'next/headers';
import { adminAuth } from './firebase-admin';

export type AdminRole = 'PRIMARY_ADMIN' | 'SECONDARY_ADMIN';
export type AdminContext = {
  uid: string;
  email: string;
  role: AdminRole;
};

export function getAdminRole(claims: Record<string, unknown>): AdminRole | null {
  if (claims.role !== 'admin') return null;
  if (claims.adminRole === 'SECONDARY_ADMIN') return 'SECONDARY_ADMIN';
  if (claims.adminRole === undefined || claims.adminRole === 'PRIMARY_ADMIN') return 'PRIMARY_ADMIN';
  return null;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  const decoded = await adminAuth.verifySessionCookie(session, true).catch(() => null);
  if (!decoded) return null;
  const role = getAdminRole(decoded as unknown as Record<string, unknown>);
  if (!role) return null;
  return { uid: decoded.uid, email: decoded.email ?? '', role };
}

export async function requireAdmin(): Promise<AdminContext> {
  const context = await getAdminContext();
  if (!context) throw new Error('Administrator access is required.');
  return context;
}

export async function requirePrimaryAdmin(): Promise<AdminContext> {
  const context = await requireAdmin();
  if (context.role !== 'PRIMARY_ADMIN') {
    throw new Error('Primary administrator access is required for this action.');
  }
  return context;
}
