import { adminAuth, adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requirePrimaryAdmin } from './admin-auth';

export type StudentStats = {
  uid: string;
  studentId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  course: string;
  batchId: string;
  batchName: string;
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  feeStatus: string;
  accountStatus: string;
  organizationId: string | null;
  allowedCourseIds: string[];
  createdAt: number | null;
  reading: { done: number; total: number };
  listening: { done: number; total: number };
  scoredAttempts: number;
  avgScorePercent: number | null;
};

export async function listStudentsWithStats(): Promise<StudentStats[]> {
  await requirePrimaryAdmin();
  const [studentsSnap, readingSnap, listeningSnap, attemptsSnap, batchesSnap] = await Promise.all([
    adminDb.collection('students').orderBy('createdAt', 'desc').get(),
    adminDb.collection('readingTasks').select('status').get(),
    adminDb.collection('listeningTasks').count().get(),
    adminDb.collection('attempts').select('studentId', 'module', 'taskId', 'score', 'total').get(),
    adminDb.collection('batches').get(),
  ]);

  const totalReadingTasks = readingSnap.docs.filter((doc) => doc.get('status') !== 'Draft').length;
  const totalListeningTasks = listeningSnap.data().count;
  const batchNames = new Map(batchesSnap.docs.map((doc) => [doc.id, String(doc.get('name') ?? '')]));

  const doneByStudent = new Map<string, { reading: Set<string>; listening: Set<string> }>();
  const scoreByStudent = new Map<string, { sumPercent: number; count: number }>();

  for (const doc of attemptsSnap.docs) {
    const studentId = doc.get('studentId') as string | undefined;
    const rawModule = doc.get('module');
    const attemptModule: 'reading' | 'listening' | undefined =
      rawModule === 'reading' || rawModule === 'listening' ? rawModule : undefined;
    const taskId = doc.get('taskId') as string | undefined;
    const score = doc.get('score') as number | undefined;
    const total = doc.get('total') as number | undefined;
    if (!studentId || !attemptModule || !taskId) continue;

    if (!doneByStudent.has(studentId)) {
      doneByStudent.set(studentId, { reading: new Set(), listening: new Set() });
    }
    if (score != null) {
      doneByStudent.get(studentId)![attemptModule].add(taskId);
      if (total) {
        if (!scoreByStudent.has(studentId)) scoreByStudent.set(studentId, { sumPercent: 0, count: 0 });
        const s = scoreByStudent.get(studentId)!;
        s.sumPercent += (score / total) * 100;
        s.count += 1;
      }
    }
  }

  return studentsSnap.docs.map((doc) => {
    const data = doc.data();
    const done = doneByStudent.get(doc.id) ?? { reading: new Set<string>(), listening: new Set<string>() };
    const scores = scoreByStudent.get(doc.id);
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : null;
    const totalFees = toMoney(data.totalFees);
    const paidFees = toMoney(data.paidFees);
    const storedPending = Number(data.pendingFees);
    const pendingFees = Number.isFinite(storedPending)
      ? Math.max(toMoney(storedPending), 0)
      : Math.max(totalFees - paidFees, 0);

    return {
      uid: doc.id,
      studentId: String(data.studentId ?? `ST-${doc.id.toUpperCase()}`),
      username: (data.username as string) ?? '(unknown)',
      fullName: String(data.fullName ?? data.username ?? '(unknown)'),
      email: (data.email as string) ?? '(unknown)',
      phone: String(data.phone ?? ''),
      course: String(data.course ?? ''),
      batchId: String(data.batchId ?? ''),
      batchName: batchNames.get(String(data.batchId ?? '')) ?? '',
      totalFees,
      paidFees,
      pendingFees,
      feeStatus: String(data.feeStatus ?? 'Unpaid'),
      accountStatus: data.accountStatus === 'active' ? 'active' : 'suspended',
      organizationId: (data.organizationId as string | undefined) ?? null,
      allowedCourseIds: (data.allowedCourseIds as string[] | undefined) ?? [],
      createdAt,
      reading: { done: done.reading.size, total: totalReadingTasks },
      listening: { done: done.listening.size, total: totalListeningTasks },
      scoredAttempts: scores?.count ?? 0,
      avgScorePercent: scores && scores.count > 0 ? Math.round(scores.sumPercent / scores.count) : null,
    };
  });
}

function toMoney(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStudentAccount(input: {
  username: string;
  email: string;
  password: string;
  organizationId?: string | null;
  allowedCourseIds?: string[];
  firstName?: string;
  lastName?: string;
  phone?: string;
  course?: string;
  currentBand?: string;
  targetBand?: string;
  enrollmentDate?: string;
  batchId?: string;
  totalFees?: number;
}): Promise<{ uid: string }> {
  await requirePrimaryAdmin();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName?.trim() ?? '';
  const lastName = input.lastName?.trim() ?? '';
  const requestedTotalFees = input.totalFees ?? 0;

  if (!username) throw new Error('Username is required.');
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
  if (!Number.isFinite(requestedTotalFees) || requestedTotalFees < 0) throw new Error('Enter a valid total fee amount.');
  const totalFees = Math.round(requestedTotalFees * 100) / 100;
  if (input.batchId) {
    const batch = await adminDb.collection('batches').doc(input.batchId).get();
    if (!batch.exists || batch.get('status') === 'inactive') throw new Error('Selected batch is not available.');
  }

  const [existingUsername, existingEmail] = await Promise.all([
    adminDb.collection('students').where('username', '==', username).limit(1).get(),
    adminDb.collection('students').where('email', '==', email).limit(1).get(),
  ]);
  if (!existingUsername.empty) throw new Error('That username is already taken.');
  if (!existingEmail.empty) throw new Error('A student with that email already exists.');

  const userRecord = await adminAuth.createUser({
    email,
    password: input.password,
    emailVerified: false,
  });

  try {
    await adminDb.collection('students').doc(userRecord.uid).set({
      username,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || username,
      studentId: `ST-${userRecord.uid.toUpperCase()}`,
      phone: input.phone?.trim() ?? '',
      course: input.course?.trim() ?? '',
      currentBand: input.currentBand?.trim() ?? '',
      targetBand: input.targetBand?.trim() ?? '',
      enrollmentDate: input.enrollmentDate ?? '',
      batchId: input.batchId || null,
      studentStatus: 'Active',
      totalFees,
      paidFees: 0,
      pendingFees: totalFees,
      feeStatus: 'Unpaid',
      accountStatus: 'active',
      organizationId: input.organizationId || null,
      allowedCourseIds: input.allowedCourseIds ?? [],
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    await adminAuth.deleteUser(userRecord.uid).catch(() => {});
    throw err;
  }

  return { uid: userRecord.uid };
}

export async function setStudentStatus(uid: string, accountStatus: 'active' | 'suspended') {
  await requirePrimaryAdmin();
  await adminDb.collection('students').doc(uid).update({ accountStatus });
}

export async function setStudentCourses(uid: string, courseIds: string[]): Promise<void> {
  await requirePrimaryAdmin();
  await adminDb.collection('students').doc(uid).update({ allowedCourseIds: courseIds });
}

export async function deleteStudentAccount(uid: string): Promise<void> {
  await requirePrimaryAdmin();
  await adminDb.collection('students').doc(uid).delete();
  await adminAuth.deleteUser(uid).catch(() => {});
}

export async function updateStudentAccount(
  uid: string,
  input: { username: string; email: string },
): Promise<void> {
  await requirePrimaryAdmin();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  if (!username) throw new Error('Username is required.');
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');

  const studentRef = adminDb.collection('students').doc(uid);
  const current = await studentRef.get();
  if (!current.exists) throw new Error('Student not found.');

  const currentData = current.data()!;

  if (username !== currentData.username) {
    const dupe = await adminDb.collection('students').where('username', '==', username).limit(1).get();
    if (!dupe.empty) throw new Error('That username is already taken.');
  }

  if (email !== currentData.email) {
    const dupe = await adminDb.collection('students').where('email', '==', email).limit(1).get();
    if (!dupe.empty) throw new Error('A student with that email already exists.');
    await adminAuth.updateUser(uid, { email, emailVerified: false });
  }

  await studentRef.update({ username, email });
}

export async function setStudentOrganization(uid: string, organizationId: string | null): Promise<void> {
  await requirePrimaryAdmin();
  await adminDb.collection('students').doc(uid).update({ organizationId: organizationId || null });
}

export async function resetStudentAttempts(uid: string): Promise<{ deleted: number }> {
  await requirePrimaryAdmin();
  const attemptsRef = adminDb.collection('attempts').where('studentId', '==', uid);
  let deleted = 0;

  while (true) {
    const snap = await attemptsRef.limit(400).get();
    if (snap.empty) break;

    const batch = adminDb.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();

    deleted += snap.size;
    if (snap.size < 400) break;
  }

  return { deleted };
}