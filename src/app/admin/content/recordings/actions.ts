'use server';

import { revalidatePath } from 'next/cache';
import { createRecording, deleteRecording, getVideoUploadUrl } from '@/lib/recordings';

export async function getRecordingUploadUrl(fileName: string, contentType: string) {
  return getVideoUploadUrl(fileName, contentType);
}

export async function createRecordingAction(formData: FormData) {
  const title = (formData.get('title') as string) ?? '';
  const description = (formData.get('description') as string) ?? '';
  const videoKey = (formData.get('videoKey') as string) ?? '';

  await createRecording({ title, description, videoKey });
  revalidatePath('/admin/content/recordings');
  revalidatePath('/admin/students');
}

export async function deleteRecordingAction(id: string) {
  await deleteRecording(id);
  revalidatePath('/admin/content/recordings');
  revalidatePath('/admin/students');
}