'use server';

import { revalidatePath } from 'next/cache';
import {
  createStudentAccount,
  deleteStudentAccount,
  setStudentCourses,
  setStudentStatus,
  updateStudentAccount,
} from '@/lib/students';
import { createAdminAccount, deleteAdminAccount } from '@/lib/admins';

export async function createStudent(formData: FormData) {
  const username = (formData.get('username') as string).trim();
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const organizationId = (formData.get('organizationId') as string) || null;
  const courseIds = formData.getAll('courseIds').map(String);

  if (!username || !email || !password) {
    throw new Error('Username, email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  await createStudentAccount({ username, email, password, organizationId, allowedCourseIds: courseIds });
  revalidatePath('/admin/students');
}

export async function toggleStudentStatus(uid: string, currentStatus: string) {
  const next = currentStatus === 'active' ? 'suspended' : 'active';
  await setStudentStatus(uid, next as 'active' | 'suspended');
  revalidatePath('/admin/students');
}

export async function updateStudent(uid: string, formData: FormData) {
  const username = (formData.get('username') as string).trim();
  const email = (formData.get('email') as string).trim();

  if (!username || !email) {
    throw new Error('Username and email are required');
  }

  await updateStudentAccount(uid, { username, email });
  revalidatePath('/admin/students');
}

export async function updateStudentCourses(uid: string, formData: FormData) {
  const courseIds = formData.getAll('courseIds').map(String);
  await setStudentCourses(uid, courseIds);
  revalidatePath('/admin/students');
}

export async function resetAttempts(uid: string) {
  const { resetStudentAttempts } = await import('@/lib/students');
  await resetStudentAttempts(uid);
  revalidatePath('/admin/students');
}

export async function deleteStudent(uid: string) {
  await deleteStudentAccount(uid);
  revalidatePath('/admin/students');
}

export async function createAdmin(formData: FormData) {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  await createAdminAccount({ email, password });
  revalidatePath('/admin/students');
}

export async function deleteAdmin(uid: string) {
  await deleteAdminAccount(uid);
  revalidatePath('/admin/students');
}