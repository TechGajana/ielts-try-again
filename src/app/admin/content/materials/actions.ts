'use server';

import { revalidatePath } from 'next/cache';
import { createMaterial, deleteMaterial, getMaterialUploadUrl } from '@/lib/materials';

export async function getMaterialUpload(fileName: string, contentType: string) {
  return getMaterialUploadUrl(fileName, contentType);
}

export async function createMaterialAction(formData: FormData) {
  await createMaterial({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    fileKey: String(formData.get('fileKey') ?? ''),
    fileName: String(formData.get('fileName') ?? ''),
  });
  revalidatePath('/admin/content/materials');
  revalidatePath('/admin/students');
}

export async function deleteMaterialAction(id: string) {
  await deleteMaterial(id);
  revalidatePath('/admin/content/materials');
  revalidatePath('/admin/students');
}