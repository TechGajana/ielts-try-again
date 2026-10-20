import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type RecordingComment = {
  id: string;
  studentId: string;
  studentName: string;
  text: string;
  createdAt: number | null;
};

export async function listComments(recordingId: string): Promise<RecordingComment[]> {
  const snap = await adminDb
    .collection('recordingComments')
    .where('recordingId', '==', recordingId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId as string,
      studentName: (data.studentName as string) ?? 'Student',
      text: data.text as string,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : null,
    };
  });
}

export async function addComment(input: {
  recordingId: string;
  studentId: string;
  studentName: string;
  text: string;
}): Promise<RecordingComment> {
  const text = input.text.trim();
  if (!text) throw new Error('Write something before posting.');
  if (text.length > 1000) throw new Error('Comments are limited to 1000 characters.');

  const ref = await adminDb.collection('recordingComments').add({
    recordingId: input.recordingId,
    studentId: input.studentId,
    studentName: input.studentName,
    text,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    studentId: input.studentId,
    studentName: input.studentName,
    text,
    createdAt: Date.now(), // optimistic: close enough for immediate UI display
  };
}

/** A student can only delete their own comment. */
export async function deleteComment(commentId: string, studentId: string): Promise<void> {
  const ref = adminDb.collection('recordingComments').doc(commentId);
  const doc = await ref.get();
  if (!doc.exists) return;
  if (doc.get('studentId') !== studentId) throw new Error('You can only delete your own comments.');
  await ref.delete();
}