'use server';

import { revalidatePath } from 'next/cache';
import {
  createStudentAccount,
  deleteStudentAccount,
  setStudentCourses,
  setStudentStatus,
  updateStudentAccount,
} from '@/lib/students';
import { createAdminAccount, deleteAdminAccount, updateAdminRole } from '@/lib/admins';
import { requirePrimaryAdmin, type AdminRole } from '@/lib/admin-auth';
import {
  deleteBatch as removeBatch,
  recordAdminAudit,
  recordStudentPayment,
  saveBatch,
  updateStudentPayment,
  deleteStudentPayment,
  updateStudentProfile,
} from '@/lib/student-management';

export async function createStudent(formData: FormData) {
  const actor = await requirePrimaryAdmin();
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const organizationId = (formData.get('organizationId') as string) || null;
  const courseIds = formData.getAll('courseIds').map(String);
  const totalFees = Number(formData.get('totalFees') || 0);
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const course = String(formData.get('course') ?? '').trim();
  const enrollmentDate = String(formData.get('enrollmentDate') ?? '');

  if (!username || !email || !password) {
    throw new Error('Username, email and password are required');
  }
  if (!firstName || !lastName || !course) throw new Error('First name, last name and course are required.');
  validateOptionalDate(enrollmentDate, 'Enrollment date');
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!Number.isFinite(totalFees) || totalFees < 0) throw new Error('Enter a valid total fee amount.');

  const { uid } = await createStudentAccount({
    username,
    email,
    password,
    organizationId,
    allowedCourseIds: courseIds,
    firstName,
    lastName,
    phone: String(formData.get('phone') ?? ''),
    course,
    currentBand: String(formData.get('currentBand') ?? ''),
    targetBand: String(formData.get('targetBand') ?? ''),
    enrollmentDate,
    batchId: String(formData.get('batchId') ?? ''),
    totalFees,
  });
  await recordAdminAudit(actor, 'student.created', 'student', uid);
  revalidatePath('/admin/students');
}

export async function toggleStudentStatus(uid: string, currentStatus: string) {
  const actor = await requirePrimaryAdmin();
  if (currentStatus !== 'active' && currentStatus !== 'suspended') {
    throw new Error('Invalid student account status.');
  }
  const next = currentStatus === 'active' ? 'suspended' : 'active';
  await setStudentStatus(uid, next as 'active' | 'suspended');
  await recordAdminAudit(actor, 'student.account-status.updated', 'student', uid, { status: next });
  revalidatePath('/admin/students');
}

export async function updateStudent(uid: string, formData: FormData) {
  const actor = await requirePrimaryAdmin();
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!username || !email) {
    throw new Error('Username and email are required');
  }

  await updateStudentAccount(uid, { username, email });
  await recordAdminAudit(actor, 'student.account.updated', 'student', uid);
  revalidatePath(`/admin/students/${uid}`);
  revalidatePath('/admin/students');
}

export async function updateStudentCourses(uid: string, formData: FormData) {
  const actor = await requirePrimaryAdmin();
  const courseIds = formData.getAll('courseIds').map(String);
  await setStudentCourses(uid, courseIds);
  await recordAdminAudit(actor, 'student.course-access.updated', 'student', uid, { courseCount: courseIds.length });
  revalidatePath('/admin/students');
}

export async function resetAttempts(uid: string) {
  const actor = await requirePrimaryAdmin();
  const { resetStudentAttempts } = await import('@/lib/students');
  const result = await resetStudentAttempts(uid);
  await recordAdminAudit(actor, 'student.attempts.reset', 'student', uid, { deleted: result.deleted });
  revalidatePath('/admin/students');
}

export async function deleteStudent(uid: string) {
  const actor = await requirePrimaryAdmin();
  await deleteStudentAccount(uid);
  await recordAdminAudit(actor, 'student.deleted', 'student', uid);
  revalidatePath('/admin/students');
}

export async function createAdmin(formData: FormData) {
  const actor = await requirePrimaryAdmin();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();
  const role = String(formData.get('adminRole') ?? '');
  if (role !== 'PRIMARY_ADMIN' && role !== 'SECONDARY_ADMIN') {
    throw new Error('Choose a valid administrator role.');
  }

  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const { uid } = await createAdminAccount({ email, password, displayName, phoneNumber, role: role as AdminRole });
  await recordAdminAudit(actor, 'admin.created', 'admin', uid, { role });
  revalidatePath('/admin/students');
}

export async function deleteAdmin(uid: string) {
  const actor = await requirePrimaryAdmin();
  await deleteAdminAccount(uid, actor.uid);
  await recordAdminAudit(actor, 'admin.deleted', 'admin', uid);
  revalidatePath('/admin/students');
}

export async function changeAdminRole(uid: string, formData: FormData) {
  const actor = await requirePrimaryAdmin();
  const nextRole = String(formData.get('adminRole') ?? '');
  if (nextRole !== 'PRIMARY_ADMIN' && nextRole !== 'SECONDARY_ADMIN') {
    throw new Error('Choose a valid administrator role.');
  }
  await updateAdminRole(uid, nextRole as AdminRole, actor.uid);
  await recordAdminAudit(actor, 'admin.role.updated', 'admin', uid, { role: nextRole });
  revalidatePath('/admin/students');
}

export async function saveBatchAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '');
  if (status !== 'active' && status !== 'inactive') throw new Error('Choose a valid batch status.');
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  validateOptionalDate(startDate, 'Batch start date');
  validateOptionalDate(endDate, 'Batch end date');
  await saveBatch({
    ...(id ? { id } : {}),
    name: String(formData.get('name') ?? ''),
    course: String(formData.get('course') ?? ''),
    instructor: String(formData.get('instructor') ?? ''),
    status,
    startDate,
    endDate,
  });
  revalidatePath('/admin/students/batches');
  revalidatePath('/admin/students');
}

export async function deleteBatchAction(id: string) {
  await removeBatch(id);
  revalidatePath('/admin/students/batches');
  revalidatePath('/admin/students');
}

export async function updateStudentProfileAction(uid: string, formData: FormData) {
  const status = String(formData.get('status') ?? '');
  if (status !== 'Active' && status !== 'Completed' && status !== 'Dropped') {
    throw new Error('Choose a valid student status.');
  }
  const enrollmentDate = String(formData.get('enrollmentDate') ?? '');
  const totalFeesRaw = String(formData.get('totalFees') ?? '');
  validateOptionalDate(enrollmentDate, 'Enrollment date');
  if (!totalFeesRaw.trim()) throw new Error('Total fees are required.');
  await updateStudentProfile(uid, {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    course: String(formData.get('course') ?? ''),
    currentBand: String(formData.get('currentBand') ?? ''),
    targetBand: String(formData.get('targetBand') ?? ''),
    enrollmentDate,
    batchId: String(formData.get('batchId') ?? ''),
    status,
    totalFees: Number(totalFeesRaw),
  });
  revalidatePath(`/admin/students/${uid}`);
  revalidatePath('/admin/students');
  revalidatePath('/admin/students/payments');
}

export async function recordPaymentAction(uid: string, formData: FormData) {
  await recordStudentPayment(uid, {
    amount: Number(formData.get('amount') ?? NaN),
    method: String(formData.get('method') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
    paidAt: String(formData.get('paidAt') ?? ''),
  });
  revalidatePath(`/admin/students/${uid}`);
  revalidatePath('/admin/students');
  revalidatePath('/admin/students/payments');
}

export async function updatePaymentAction(uid: string, paymentId: string, formData: FormData) {
  await updateStudentPayment(uid, paymentId, {
    amount: Number(formData.get('amount') ?? NaN),
    method: String(formData.get('method') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
    paidAt: String(formData.get('paidAt') ?? ''),
  });
  revalidatePath(`/admin/students/${uid}`);
  revalidatePath('/admin/students');
  revalidatePath('/admin/students/payments');
}

export async function deletePaymentAction(uid: string, paymentId: string) {
  await deleteStudentPayment(uid, paymentId);
  revalidatePath(`/admin/students/${uid}`);
  revalidatePath('/admin/students');
  revalidatePath('/admin/students/payments');
}

function validateOptionalDate(value: string, label: string): void {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a valid date.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid date.`);
  }
}