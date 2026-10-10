import { redirect } from 'next/navigation';
import AccessDenied from '@/components/admin/access-denied';
import { getAdminContext } from '@/lib/admin-auth';

export default async function StudentManagementLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminContext();
  if (!admin) redirect('/login');
  if (admin.role !== 'PRIMARY_ADMIN') return <AccessDenied />;
  return children;
}
