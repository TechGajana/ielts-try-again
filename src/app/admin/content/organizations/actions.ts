'use server';

import { revalidatePath } from 'next/cache';
import { createOrganization, deleteOrganization, getLogoUploadUrl } from '@/lib/organizations';

export async function getOrgLogoUploadUrl(fileName: string, contentType: string) {
  return getLogoUploadUrl(fileName, contentType);
}

export async function createOrganizationAction(formData: FormData) {
  const name = (formData.get('name') as string) ?? '';
  const logoKey = (formData.get('logoKey') as string) ?? '';
  await createOrganization({ name, logoKey });
  revalidatePath('/admin/content/organizations');
  revalidatePath('/admin/students');
}

export async function deleteOrganizationAction(id: string) {
  await deleteOrganization(id);
  revalidatePath('/admin/content/organizations');
  revalidatePath('/admin/students');
}