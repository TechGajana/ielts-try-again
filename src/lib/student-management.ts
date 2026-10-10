import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { requirePrimaryAdmin, type AdminContext } from './admin-auth';

export type Batch = {
  id: string;
  name: string;
  course: string;
  instructor: string;
  status: 'active' | 'inactive';
  startDate: string;
  endDate: string;
  createdAt: number | null;
  studentCount: number;
};

export type Payment = {
  id: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
  paidAt: number | null;
  recordedBy: string;
};

export type StudentProfile = {
  uid: string;
  studentId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  course: string;
  currentBand: string;
  targetBand: string;
  enrollmentDate: string;
  batchId: string;
  batchName: string;
  status: 'Active' | 'Completed' | 'Dropped';
  accountStatus: string;
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  feeStatus: 'Unpaid' | 'Partial' | 'Paid';
  payments: Payment[];
};

export async function listBatches(): Promise<Batch[]> {
  await requirePrimaryAdmin();
  const [snapshot, studentsSnapshot] = await Promise.all([
    adminDb.collection('batches').orderBy('name').get(),
    adminDb.collection('students').select('batchId').get(),
  ]);
  const studentCounts = new Map<string, number>();
  for (const student of studentsSnapshot.docs) {
    const batchId = String(student.get('batchId') ?? '');
    if (batchId) studentCounts.set(batchId, (studentCounts.get(batchId) ?? 0) + 1);
  }
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : null;
    return {
      id: doc.id,
      name: String(data.name ?? ''),
      course: String(data.course ?? ''),
      instructor: String(data.instructor ?? ''),
      status: data.status === 'inactive' ? 'inactive' : 'active',
      startDate: String(data.startDate ?? ''),
      endDate: String(data.endDate ?? ''),
      createdAt,
      studentCount: studentCounts.get(doc.id) ?? 0,
    };
  });
}

export async function getBatchDetails(id: string): Promise<{
  batch: Batch;
  students: Array<{ uid: string; studentId: string; fullName: string; email: string; course: string; feeStatus: string }>;
  totalFees: number;
  paidFees: number;
  pendingFees: number;
} | null> {
  await requirePrimaryAdmin();
  const [batchSnapshot, studentsSnapshot] = await Promise.all([
    adminDb.collection('batches').doc(id).get(),
    adminDb.collection('students').where('batchId', '==', id).get(),
  ]);
  if (!batchSnapshot.exists) return null;
  const batchData = batchSnapshot.data()!;
  const batch: Batch = {
    id,
    name: String(batchData.name ?? ''),
    course: String(batchData.course ?? ''),
    instructor: String(batchData.instructor ?? ''),
    status: batchData.status === 'inactive' ? 'inactive' : 'active',
    startDate: String(batchData.startDate ?? ''),
    endDate: String(batchData.endDate ?? ''),
    createdAt: batchData.createdAt?.toDate ? batchData.createdAt.toDate().getTime() : null,
    studentCount: studentsSnapshot.size,
  };
  const students = studentsSnapshot.docs.map((doc) => ({
    uid: doc.id,
    studentId: String(doc.get('studentId') ?? `ST-${doc.id.toUpperCase()}`),
    fullName: String(doc.get('fullName') ?? doc.get('username') ?? ''),
    email: String(doc.get('email') ?? ''),
    course: String(doc.get('course') ?? ''),
    feeStatus: String(doc.get('feeStatus') ?? 'Unpaid'),
  }));
  const totalFees = money(studentsSnapshot.docs.reduce((total, doc) => total + money(doc.get('totalFees')), 0));
  const paidFees = money(studentsSnapshot.docs.reduce((total, doc) => total + money(doc.get('paidFees')), 0));
  return { batch, students, totalFees, paidFees, pendingFees: money(Math.max(totalFees - paidFees, 0)) };
}

export async function saveBatch(input: {
  id?: string;
  name: string;
  course: string;
  instructor: string;
  status: 'active' | 'inactive';
  startDate: string;
  endDate: string;
}): Promise<string> {
  const admin = await requirePrimaryAdmin();
  const name = input.name.trim();
  const course = input.course.trim();
  if (!name) throw new Error('Batch name is required.');
  if (!course) throw new Error('Course is required.');
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new Error('End date cannot be before the start date.');
  }

  const batchRef = input.id
    ? adminDb.collection('batches').doc(input.id)
    : adminDb.collection('batches').doc();
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    if (input.id) {
      const existing = await transaction.get(batchRef);
      if (!existing.exists) throw new Error('Batch not found.');
    }
    transaction.set(batchRef, {
      name,
      course,
      instructor: input.instructor.trim(),
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedAt: FieldValue.serverTimestamp(),
      ...(input.id ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    transaction.create(auditRef, auditData(admin, input.id ? 'batch.updated' : 'batch.created', 'batch', batchRef.id));
  });
  return batchRef.id;
}

export async function deleteBatch(id: string): Promise<void> {
  const admin = await requirePrimaryAdmin();
  const batchRef = adminDb.collection('batches').doc(id);
  const assignedStudents = adminDb.collection('students').where('batchId', '==', id).limit(1);
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    const [batch, students] = await Promise.all([
      transaction.get(batchRef),
      transaction.get(assignedStudents),
    ]);
    if (!batch.exists) throw new Error('Batch not found.');
    if (!students.empty) throw new Error('Move students to another batch before deleting this batch.');
    transaction.delete(batchRef);
    transaction.create(auditRef, auditData(admin, 'batch.deleted', 'batch', id));
  });
}

export async function getStudentProfile(uid: string): Promise<StudentProfile | null> {
  await requirePrimaryAdmin();
  const studentRef = adminDb.collection('students').doc(uid);
  const studentSnapshot = await studentRef.get();
  if (!studentSnapshot.exists) return null;

  const data = studentSnapshot.data()!;
  const [batchSnapshot, paymentsSnapshot] = await Promise.all([
    data.batchId ? adminDb.collection('batches').doc(String(data.batchId)).get() : Promise.resolve(null),
    studentRef.collection('payments').orderBy('paidAt', 'desc').get(),
  ]);
  const payments = paymentsSnapshot.docs.map((doc) => {
    const payment = doc.data();
    return {
      id: doc.id,
      amount: Number(payment.amount ?? 0),
      method: String(payment.method ?? ''),
      reference: String(payment.reference ?? ''),
      note: String(payment.note ?? ''),
      paidAt: payment.paidAt?.toDate ? payment.paidAt.toDate().getTime() : null,
      recordedBy: String(payment.recordedBy ?? ''),
    };
  });
  const totalFees = money(data.totalFees);
  const paidFees = money(data.paidFees);

  return {
    uid,
    studentId: String(data.studentId ?? `ST-${uid.toUpperCase()}`),
    username: String(data.username ?? ''),
    firstName: String(data.firstName ?? ''),
    lastName: String(data.lastName ?? ''),
    fullName: String(data.fullName ?? (`${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.username || '')),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    course: String(data.course ?? ''),
    currentBand: String(data.currentBand ?? ''),
    targetBand: String(data.targetBand ?? ''),
    enrollmentDate: String(data.enrollmentDate ?? ''),
    batchId: String(data.batchId ?? ''),
    batchName: batchSnapshot?.exists ? String(batchSnapshot.get('name') ?? '') : '',
    status: data.studentStatus === 'Completed' || data.studentStatus === 'Dropped' ? data.studentStatus : 'Active',
    accountStatus: String(data.accountStatus ?? 'active'),
    totalFees,
    paidFees,
    pendingFees: money(Math.max(totalFees - paidFees, 0)),
    feeStatus: feeStatus(totalFees, paidFees),
    payments,
  };
}

export async function updateStudentProfile(uid: string, input: {
  firstName: string;
  lastName: string;
  phone: string;
  course: string;
  currentBand: string;
  targetBand: string;
  enrollmentDate: string;
  batchId: string;
  status: 'Active' | 'Completed' | 'Dropped';
  totalFees: number;
}): Promise<void> {
  const admin = await requirePrimaryAdmin();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (input.status !== 'Active' && input.status !== 'Completed' && input.status !== 'Dropped') {
    throw new Error('Choose a valid student status.');
  }
  if (!Number.isFinite(input.totalFees)) throw new Error('Enter a valid total fee amount.');
  const totalFees = money(input.totalFees);
  if (!firstName || !lastName) throw new Error('First and last name are required.');
  if (totalFees < 0) throw new Error('Total fees cannot be negative.');

  const studentRef = adminDb.collection('students').doc(uid);
  const batchRef = input.batchId ? adminDb.collection('batches').doc(input.batchId) : null;
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    const [studentSnapshot, batchSnapshot] = await Promise.all([
      transaction.get(studentRef),
      batchRef ? transaction.get(batchRef) : Promise.resolve(null),
    ]);
    if (!studentSnapshot.exists) throw new Error('Student not found.');
    if (batchRef && !batchSnapshot?.exists) throw new Error('Selected batch was not found.');
    if (
      batchRef &&
      batchSnapshot?.get('status') === 'inactive' &&
      studentSnapshot.get('batchId') !== input.batchId
    ) {
      throw new Error('Inactive batches cannot be assigned to a student.');
    }
    const paidFees = money(studentSnapshot.get('paidFees'));
    if (totalFees < paidFees) throw new Error('Total fees cannot be less than the fees already paid.');

    transaction.update(studentRef, {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone: input.phone.trim(),
      course: input.course.trim(),
      currentBand: input.currentBand.trim(),
      targetBand: input.targetBand.trim(),
      enrollmentDate: input.enrollmentDate,
      batchId: input.batchId || null,
      studentStatus: input.status,
      totalFees,
      pendingFees: money(totalFees - paidFees),
      feeStatus: feeStatus(totalFees, paidFees),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, auditData(admin, 'student.profile.updated', 'student', uid));
  });
}

export async function recordStudentPayment(uid: string, input: {
  amount: number;
  method: string;
  reference: string;
  note: string;
  paidAt: string;
}): Promise<void> {
  const admin = await requirePrimaryAdmin();
  if (!Number.isFinite(input.amount)) throw new Error('Enter a valid payment amount.');
  const amount = money(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payment amount must be greater than zero.');
  if (!input.method.trim()) throw new Error('Payment method is required.');
  const paidAt = parsePaidAt(input.paidAt);

  const studentRef = adminDb.collection('students').doc(uid);
  const paymentRef = studentRef.collection('payments').doc();
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists) throw new Error('Student not found.');
    const totalFees = money(studentSnapshot.get('totalFees'));
    const paidFees = money(studentSnapshot.get('paidFees'));
    const pendingFees = money(Math.max(totalFees - paidFees, 0));
    if (amount > pendingFees) throw new Error(`Payment cannot exceed the outstanding balance of ${pendingFees.toFixed(2)}.`);

    const nextPaidFees = money(paidFees + amount);
    const nextPendingFees = money(Math.max(totalFees - nextPaidFees, 0));
    transaction.create(paymentRef, {
      amount,
      method: input.method.trim(),
      reference: input.reference.trim(),
      note: input.note.trim(),
      paidAt: Timestamp.fromDate(paidAt),
      recordedBy: admin.email,
      recordedByUid: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.update(studentRef, {
      paidFees: nextPaidFees,
      pendingFees: nextPendingFees,
      feeStatus: feeStatus(totalFees, nextPaidFees),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, auditData(admin, 'student.payment.recorded', 'student', uid, { paymentId: paymentRef.id, amount }));
  });
}

export async function updateStudentPayment(uid: string, paymentId: string, input: {
  amount: number;
  method: string;
  reference: string;
  note: string;
  paidAt: string;
}): Promise<void> {
  const admin = await requirePrimaryAdmin();
  if (!Number.isFinite(input.amount)) throw new Error('Enter a valid payment amount.');
  const amount = money(input.amount);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
  if (!input.method.trim()) throw new Error('Payment method is required.');
  const paidAt = parsePaidAt(input.paidAt);

  const studentRef = adminDb.collection('students').doc(uid);
  const paymentsRef = studentRef.collection('payments');
  const paymentRef = paymentsRef.doc(paymentId);
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    const [studentSnapshot, paymentsSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(paymentsRef),
    ]);
    if (!studentSnapshot.exists) throw new Error('Student not found.');
    const currentPayment = paymentsSnapshot.docs.find((doc) => doc.id === paymentId);
    if (!currentPayment) throw new Error('Payment not found.');

    const totalFees = money(studentSnapshot.get('totalFees'));
    const ledgerPaid = money(paymentsSnapshot.docs.reduce((sum, doc) => sum + money(doc.get('amount')), 0));
    const openingPaid = Math.max(money(studentSnapshot.get('paidFees')) - ledgerPaid, 0);
    const nextLedgerPaid = money(ledgerPaid - money(currentPayment.get('amount')) + amount);
    const nextPaidFees = money(openingPaid + nextLedgerPaid);
    if (nextPaidFees > totalFees) throw new Error('The edited payment would exceed the student’s total fees.');
    const nextPendingFees = money(Math.max(totalFees - nextPaidFees, 0));

    transaction.update(paymentRef, {
      amount,
      method: input.method.trim(),
      reference: input.reference.trim(),
      note: input.note.trim(),
      paidAt: Timestamp.fromDate(paidAt),
      editedAt: FieldValue.serverTimestamp(),
      editedBy: admin.email,
      editedByUid: admin.uid,
    });
    transaction.update(studentRef, {
      paidFees: nextPaidFees,
      pendingFees: nextPendingFees,
      feeStatus: feeStatus(totalFees, nextPaidFees),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, auditData(admin, 'student.payment.updated', 'payment', `${uid}/${paymentId}`, { amount }));
  });
}

export async function deleteStudentPayment(uid: string, paymentId: string): Promise<void> {
  const admin = await requirePrimaryAdmin();
  const studentRef = adminDb.collection('students').doc(uid);
  const paymentsRef = studentRef.collection('payments');
  const paymentRef = paymentsRef.doc(paymentId);
  const auditRef = adminDb.collection('adminAuditLogs').doc();
  await adminDb.runTransaction(async (transaction) => {
    const [studentSnapshot, paymentsSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(paymentsRef),
    ]);
    if (!studentSnapshot.exists) throw new Error('Student not found.');
    const currentPayment = paymentsSnapshot.docs.find((doc) => doc.id === paymentId);
    if (!currentPayment) throw new Error('Payment not found.');

    const totalFees = money(studentSnapshot.get('totalFees'));
    const ledgerPaid = money(paymentsSnapshot.docs.reduce((sum, doc) => sum + money(doc.get('amount')), 0));
    const openingPaid = Math.max(money(studentSnapshot.get('paidFees')) - ledgerPaid, 0);
    const nextPaidFees = money(openingPaid + ledgerPaid - money(currentPayment.get('amount')));
    const nextPendingFees = money(Math.max(totalFees - nextPaidFees, 0));
    transaction.delete(paymentRef);
    transaction.update(studentRef, {
      paidFees: nextPaidFees,
      pendingFees: nextPendingFees,
      feeStatus: feeStatus(totalFees, nextPaidFees),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, auditData(admin, 'student.payment.deleted', 'payment', `${uid}/${paymentId}`, {
      amount: money(currentPayment.get('amount')),
    }));
  });
}

export async function listPaymentLedger(): Promise<Array<Payment & { studentId: string; studentName: string; email: string }>> {
  await requirePrimaryAdmin();
  const snapshot = await adminDb.collectionGroup('payments').get();
  const records = snapshot.docs.map((doc) => {
    const data = doc.data();
    const uid = doc.ref.parent.parent?.id ?? '';
    return {
      id: doc.id,
      studentId: uid,
      studentName: '',
      email: '',
      amount: Number(data.amount ?? 0),
      method: String(data.method ?? ''),
      reference: String(data.reference ?? ''),
      note: String(data.note ?? ''),
      paidAt: data.paidAt?.toDate ? data.paidAt.toDate().getTime() : null,
      recordedBy: String(data.recordedBy ?? ''),
    };
  });
  const studentIds = [...new Set(records.map((record) => record.studentId).filter(Boolean))];
  const studentSnapshots = await Promise.all(studentIds.map((id) => adminDb.collection('students').doc(id).get()));
  const students = new Map(studentSnapshots.filter((doc) => doc.exists).map((doc) => [
    doc.id,
    { fullName: String(doc.get('fullName') ?? doc.get('username') ?? ''), email: String(doc.get('email') ?? '') },
  ]));

  return records
    .map((record) => ({
      ...record,
      studentName: students.get(record.studentId)?.fullName ?? '(deleted student)',
      email: students.get(record.studentId)?.email ?? '',
    }))
    .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));
}

export async function recordAdminAudit(
  admin: AdminContext,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, string | number | boolean> = {},
): Promise<void> {
  await adminDb.collection('adminAuditLogs').add(auditData(admin, action, targetType, targetId, details));
}

function auditData(
  admin: AdminContext,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, string | number | boolean> = {},
) {
  return {
    actorUid: admin.uid,
    actorEmail: admin.email,
    action,
    targetType,
    targetId,
    details,
    createdAt: FieldValue.serverTimestamp(),
  };
}

function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function parsePaidAt(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid payment date.');
  const [year, month, day] = value.split('-').map(Number);
  const paidAt = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    paidAt.getUTCFullYear() !== year ||
    paidAt.getUTCMonth() !== month - 1 ||
    paidAt.getUTCDate() !== day
  ) {
    throw new Error('Enter a valid payment date.');
  }
  if (!Number.isFinite(paidAt.getTime()) || paidAt.getTime() > Date.now() + 60_000) {
    throw new Error('Enter a valid payment date that is not in the future.');
  }
  return paidAt;
}

function feeStatus(totalFees: number, paidFees: number): StudentProfile['feeStatus'] {
  if (totalFees <= 0 || paidFees <= 0) return 'Unpaid';
  return paidFees >= totalFees ? 'Paid' : 'Partial';
}
