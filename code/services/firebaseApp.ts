import { initializeApp } from 'firebase/app';

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const getFirebaseConfig = () => {
  const env = import.meta.env as Record<typeof REQUIRED_KEYS[number], string | undefined>;

  const providedKeys = REQUIRED_KEYS.filter((key) => Boolean(env[key]));

  if (providedKeys.length === 0) {
    console.warn(
      'Missing Firebase environment variables. Falling back to default configuration for local development.',
    );
    return {
      apiKey: 'AIzaSyAhKbzdAvg2O8GmKrKV-3v1Z2CxFvei7Ts',
      authDomain: 'creative-atlas.firebaseapp.com',
      projectId: 'creative-atlas',
      storageBucket: 'creative-atlas.firebasestorage.app',
      messagingSenderId: '1022663431069',
      appId: '1:1022663431069:web:f939af8b0378d692995574',
    } as const;
  }

  if (providedKeys.length !== REQUIRED_KEYS.length) {
    const missing = REQUIRED_KEYS.filter((key) => !env[key]);
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(
        ', ',
      )}. Google sign-in requires a complete configuration.`,
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY!,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: env.VITE_FIREBASE_APP_ID!,
  };
};

export const firebaseApp = initializeApp(getFirebaseConfig());

export default firebaseApp;
