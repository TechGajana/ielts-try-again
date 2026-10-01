'use server';

import { revalidatePath } from 'next/cache';
import { createLiveClass, deleteLiveClass } from '@/lib/live-classes';

export async function createLiveClassAction(formData: FormData) {
  await createLiveClass({
    title: String(formData.get('title') ?? ''),
    platform: String(formData.get('platform') ?? 'Other'),
    meetingUrl: String(formData.get('meetingUrl') ?? ''),
    details: String(formData.get('details') ?? ''),
    scheduledAt: Number(formData.get('scheduledAt')),
  });
  revalidatePath('/admin/content/live-classes');
  revalidatePath('/admin/students');
}

export async function deleteLiveClassAction(id: string) {
  await deleteLiveClass(id);
  revalidatePath('/admin/content/live-classes');
  revalidatePath('/admin/students');
}