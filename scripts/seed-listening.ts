import 'dotenv/config';
import { adminDb } from '../src/lib/firebase-admin';

async function main() {
  const task = {
    questionType: 'Multiple Choice',
    taskNumber: 1,
    audioKey: 'listening/task-1.mp3',
    instructions: 'Listen to the audio and choose the correct answer, A, B, C or D.',
    questions: [
      { id: 'q1', text: 'What is the speaker\'s main topic?', options: ['A Weather', 'B Travel', 'C Food', 'D Sports'] },
      // fill q2-q10 to match your actual test audio content, or use placeholders for now
      { id: 'q2', text: 'Placeholder question 2', options: ['A', 'B', 'C', 'D'] },
      { id: 'q3', text: 'Placeholder question 3', options: ['A', 'B', 'C', 'D'] },
      { id: 'q4', text: 'Placeholder question 4', options: ['A', 'B', 'C', 'D'] },
      { id: 'q5', text: 'Placeholder question 5', options: ['A', 'B', 'C', 'D'] },
      { id: 'q6', text: 'Placeholder question 6', options: ['A', 'B', 'C', 'D'] },
      { id: 'q7', text: 'Placeholder question 7', options: ['A', 'B', 'C', 'D'] },
      { id: 'q8', text: 'Placeholder question 8', options: ['A', 'B', 'C', 'D'] },
      { id: 'q9', text: 'Placeholder question 9', options: ['A', 'B', 'C', 'D'] },
      { id: 'q10', text: 'Placeholder question 10', options: ['A', 'B', 'C', 'D'] },
    ],
    correctAnswers: {
      q1: 'B Travel', q2: 'A', q3: 'A', q4: 'A', q5: 'A',
      q6: 'A', q7: 'A', q8: 'A', q9: 'A', q10: 'A',
    },
    timerMinutes: 8,
  };

  const ref = await adminDb.collection('listeningTasks').add(task);
  console.log('Created listening task:', ref.id);
}

main().catch(console.error);