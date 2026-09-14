import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function main() {
  const email = 'ieltstryagain@example.com'; // use an email you can actually check
  const password = 'TestPass123!';

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: 'Test Student',
  });

  await adminDb.collection('students').doc(userRecord.uid).set({
    name: 'Test Student',
    username: 'teststudent1',
    email,
    instituteId: 'own-institute',
    accountStatus: 'active',
    paymentStatus: 'success',
    modulesEnabled: {
      recordedSessions: true,
      liveClasses: true,
      notes: true,
      reading: true,
      listening: true,
      writing: true,
      speaking: true,
      fullMock: true,
    },
    createdAt: new Date().toISOString(),
  });

  console.log('Created student with UID:', userRecord.uid);
}

main().catch(console.error);