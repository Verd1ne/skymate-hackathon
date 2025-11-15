import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, update, remove, Database, get } from 'firebase/database';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
  ];

  const missing = required.filter(key => !import.meta.env[key] || import.meta.env[key].includes('your_'));
  
  if (missing.length > 0) {
    console.warn('⚠️ Firebase configuration incomplete. Missing:', missing);
    console.warn('Please add these to your .env file and restart the dev server.');
    return false;
  }
  return true;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;

// Initialize Firebase only if config is valid
if (validateFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);

    // Auto sign-in with error handling
    signInAnonymously(auth)
      .then(() => {
        console.log('✅ Firebase authenticated successfully');
      })
      .catch((error) => {
        console.error('❌ Firebase auth error:', error);
        if (error.code === 'auth/operation-not-allowed') {
          console.error('⚠️ Anonymous authentication is not enabled. Please enable it in Firebase Console.');
        }
      });

    // Test database connection
    const testRef = ref(db, '.info/connected');
    onValue(testRef, (snapshot) => {
      if (snapshot.val() === true) {
        console.log('✅ Firebase Realtime Database connected');
      } else {
        console.warn('⚠️ Firebase Realtime Database disconnected');
      }
    }, { onlyOnce: false });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
  }
} else {
  console.warn('⚠️ Firebase not initialized due to missing configuration');
  // Create placeholder objects to prevent crashes
  // @ts-ignore
  db = null;
  // @ts-ignore
  auth = null;
}

export { db, ref, push, onValue, update, remove, get, Database };

