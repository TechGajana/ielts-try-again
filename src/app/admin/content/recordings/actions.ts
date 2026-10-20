'use server';

import { revalidatePath } from 'next/cache';
import { createRecording, deleteRecording, getThumbnailUploadUrl, getVideoUploadUrl } from '@/lib/recordings';

export async function getRecordingUploadUrl(fileName: string, contentType: string) {
  return getVideoUploadUrl(fileName, contentType);
}

export async function getRecordingThumbnailUploadUrl(fileName: string, contentType: string) {
  return getThumbnailUploadUrl(fileName, contentType);
}

export async function createRecordingAction(formData: FormData) {
  const title = (formData.get('title') as string) ?? '';
  const description = (formData.get('description') as string) ?? '';
  const videoKey = (formData.get('videoKey') as string) ?? '';
  const thumbnailKey = (formData.get('thumbnailKey') as string) || undefined;

  await createRecording({ title, description, videoKey, thumbnailKey });
  revalidatePath('/admin/content/recordings');
  revalidatePath('/admin/students');
  revalidatePath('/practice/recordings');
}

export async function deleteRecordingAction(id: string) {
  await deleteRecording(id);
  revalidatePath('/admin/content/recordings');
  revalidatePath('/admin/students');
  revalidatePath('/practice/recordings');
}