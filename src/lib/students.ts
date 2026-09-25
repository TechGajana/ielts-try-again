import { adminAuth, adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type StudentStats = {
  uid: string;
  username: string;
  email: string;
  accountStatus: string;
  createdAt: number | null;
  reading: { done: number; total: number };
  listening: { done: number; total: number };
  scoredAttempts: number;
  avgScorePercent: number | null; // null when the student has no scored attempts yet
};

/**
 * ASSUMPTION: a top-level "students" collection, doc id = Firebase Auth uid,
 * with fields { username, email, accountStatus, createdAt }. This matches
 * login/actions.ts (loginStep1 reads data.email and data.accountStatus off
 * this collection), but please confirm against create-test-student.ts too.
 */
export async function listStudentsWithStats(): Promise<StudentStats[]> {
  const [studentsSnap, readingSnap, listeningSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('students').orderBy('createdAt', 'desc').get(),
    adminDb.collection('readingTasks').count().get(),
    adminDb.collection('listeningTasks').count().get(),
    adminDb.collection('attempts').select('studentId', 'module', 'taskId', 'score', 'total').get(),
  ]);

  const totalReadingTasks = readingSnap.data().count;
  const totalListeningTasks = listeningSnap.data().count;

  // studentId -> module -> Set of taskIds completed (scored)
  const doneByStudent = new Map<string, { reading: Set<string>; listening: Set<string> }>();
  // studentId -> { sumPercent, count } for average score
  const scoreByStudent = new Map<string, { sumPercent: number; count: number }>();

  for (const doc of attemptsSnap.docs) {
    const studentId = doc.get('studentId') as string | undefined;
    const module = doc.get('module') as 'reading' | 'listening' | undefined;
    const taskId = doc.get('taskId') as string | undefined;
    const score = doc.get('score') as number | undefined;
    const total = doc.get('total') as number | undefined;
    if (!studentId || !module || !taskId) continue;

    if (!doneByStudent.has(studentId)) {
      doneByStudent.set(studentId, { reading: new Set(), listening: new Set() });
    }
    if (score != null) {
      doneByStudent.get(studentId)![module].add(taskId);

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

    return {
      uid: doc.id,
      username: (data.username as string) ?? '(unknown)',
      email: (data.email as string) ?? '(unknown)',
      accountStatus: (data.accountStatus as string) ?? 'unknown',
      createdAt,
      reading: { done: done.reading.size, total: totalReadingTasks },
      listening: { done: done.listening.size, total: totalListeningTasks },
      scoredAttempts: scores?.count ?? 0,
      avgScorePercent: scores && scores.count > 0 ? Math.round(scores.sumPercent / scores.count) : null,
    };
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStudentAccount(input: {
  username: string;
  email: string;
  password: string;
}): Promise<{ uid: string }> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  if (!username) throw new Error('Username is required.');
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');

  const [existingUsername, existingEmail] = await Promise.all([
    adminDb.collection('students').where('username', '==', username).limit(1).get(),
    adminDb.collection('students').where('email', '==', email).limit(1).get(),
  ]);
  if (!existingUsername.empty) throw new Error('That username is already taken.');
  if (!existingEmail.empty) throw new Error('A student with that email already exists.');

  // Real email, so createAndSendOtp in login/actions.ts can actually reach the student.
  const userRecord = await adminAuth.createUser({
    email,
    password: input.password,
    emailVerified: false,
  });

  try {
    await adminDb.collection('students').doc(userRecord.uid).set({
      username,
      email,
      accountStatus: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Roll back the auth user so a failed write doesn't leave an orphaned login
    await adminAuth.deleteUser(userRecord.uid).catch(() => {});
    throw err;
  }

  return { uid: userRecord.uid };
}

export async function setStudentStatus(uid: string, accountStatus: 'active' | 'suspended') {
  await adminDb.collection('students').doc(uid).update({ accountStatus });
}

export async function deleteStudentAccount(uid: string): Promise<void> {
  await adminDb.collection('students').doc(uid).delete();
  await adminAuth.deleteUser(uid).catch(() => {}); // ignore if already gone
}
export async function updateStudentAccount(
  uid: string,
  input: { username: string; email: string },
): Promise<void> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  if (!username) throw new Error('Username is required.');
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address.');

  const studentRef = adminDb.collection('students').doc(uid);
  const current = await studentRef.get();
  if (!current.exists) throw new Error('Student not found.');

  const currentData = current.data()!;

  // Only check uniqueness if the value actually changed
  if (username !== currentData.username) {
    const dupe = await adminDb.collection('students').where('username', '==', username).limit(1).get();
    if (!dupe.empty) throw new Error('That username is already taken.');
  }

  if (email !== currentData.email) {
    const dupe = await adminDb.collection('students').where('email', '==', email).limit(1).get();
    if (!dupe.empty) throw new Error('A student with that email already exists.');

    // Firebase Auth is the source of truth for login, so it must be updated too,
    // or verifyPasswordViaRest in login/actions.ts would check against the old email.
    await adminAuth.updateUser(uid, { email, emailVerified: false });
  }

  await studentRef.update({ username, email });
}

export async function resetStudentAttempts(uid: string): Promise<{ deleted: number }> {
  const attemptsRef = adminDb.collection('attempts').where('studentId', '==', uid);
  let deleted = 0;

  // Deletes in batches of 400 to stay well under Firestore's 500-write limit per batch
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