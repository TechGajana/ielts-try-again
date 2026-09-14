import 'dotenv/config';
import { adminDb } from '../src/lib/firebase-admin';

async function main() {
  const task = {
    questionType: 'Multiple Choice',
    taskNumber: 1,
    passage: `The history of tea drinking dates back thousands of years to ancient China, where legend attributes its discovery to Emperor Shen Nong in 2737 BCE. According to the story, tea leaves accidentally fell into boiling water, creating a fragrant beverage. Over centuries, tea spread across Asia, becoming central to Chinese and later Japanese culture, where elaborate tea ceremonies developed. Tea reached Europe in the 17th century through Dutch and Portuguese traders, and it quickly became popular in Britain, eventually leading to the establishment of tea plantations in India and Sri Lanka during the colonial era. Today, tea is the second most consumed beverage in the world after water.`,
    instructions: 'Choose the correct letter, A, B, C or D.',
    questions: [
      { id: 'q1', text: 'Who is credited with discovering tea?', options: ['A confucius', 'B Shen Nong', 'C Lao Tzu', 'D Buddha'] },
      { id: 'q2', text: 'In what year did the legendary discovery occur?', options: ['A 1737 BCE', 'B 2737 BCE', 'C 737 CE', 'D 2000 BCE'] },
      { id: 'q3', text: 'What country did tea originate in?', options: ['A Japan', 'B India', 'C China', 'D Sri Lanka'] },
      { id: 'q4', text: 'What developed in Japan around tea?', options: ['A Trade routes', 'B Tea ceremonies', 'C Plantations', 'D Export laws'] },
      { id: 'q5', text: 'When did tea reach Europe?', options: ['A 15th century', 'B 16th century', 'C 17th century', 'D 18th century'] },
      { id: 'q6', text: 'Which traders brought tea to Europe?', options: ['A British and French', 'B Dutch and Portuguese', 'C Spanish and Italian', 'D German and Russian'] },
      { id: 'q7', text: 'Where were plantations established during colonial times?', options: ['A China and Japan', 'B India and Sri Lanka', 'C Africa', 'D South America'] },
      { id: 'q8', text: 'What is tea today in terms of global consumption?', options: ['A Most consumed beverage', 'B Second most consumed', 'C Third most consumed', 'D Rarely consumed'] },
      { id: 'q9', text: 'What accidentally created the first tea?', options: ['A Leaves in boiling water', 'B Leaves in cold water', 'C Crushed leaves', 'D Dried leaves in wine'] },
      { id: 'q10', text: 'Which country besides China is mentioned for tea culture?', options: ['A Korea', 'B Japan', 'C Thailand', 'D Vietnam'] },
    ],
    correctAnswers: {
      q1: 'B Shen Nong',
      q2: 'B 2737 BCE',
      q3: 'C China',
      q4: 'B Tea ceremonies',
      q5: 'C 17th century',
      q6: 'B Dutch and Portuguese',
      q7: 'B India and Sri Lanka',
      q8: 'B Second most consumed',
      q9: 'A Leaves in boiling water',
      q10: 'B Japan',
    },
    timerMinutes: 10,
  };

  const ref = await adminDb.collection('readingTasks').add(task);
  console.log('Created reading task:', ref.id);
}

main().catch(console.error);