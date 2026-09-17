import 'dotenv/config';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function main() {
  const email = 'ieltstryagain@gmail.com'; // use your own email, separate from the test student

  let user;
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch {
    user = await adminAuth.createUser({ email, password: 'AdminPass123!' });
  }

  await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });

  // Also create an admin doc so we can query/display admin info later if needed
  await adminDb.collection('admins').doc(user.uid).set({
    email,
    createdAt: new Date().toISOString(),
  });

  console.log('Admin set for UID:', user.uid, '| login with:', email, '/ AdminPass123!');
}

main().catch(console.error);