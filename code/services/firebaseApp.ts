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
  // Helper from 'main' branch to trim whitespace
  const cleanEnvValue = (value: string | undefined) => value?.trim();

  // Logic from 'codex' branch to read all keys dynamically
  const env = import.meta.env as Record<typeof REQUIRED_KEYS[number], string | undefined>;

  // Check for *cleaned* keys
  const providedKeys = REQUIRED_KEYS.filter((key) => Boolean(cleanEnvValue(env[key])));

  // Fallback logic (from both branches)
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

  // Robust error logic from 'codex' branch
  if (providedKeys.length !== REQUIRED_KEYS.length) {
    // Check cleaned keys to find missing ones
    const missing = REQUIRED_KEYS.filter((key) => !cleanEnvValue(env[key]));
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(
        ', ',
      )}. Google sign-in requires a complete configuration.`,
    );
  }

  // Return object using cleaned values
  return {
    apiKey: cleanEnvValue(env.VITE_FIREBASE_API_KEY)!,
    authDomain: cleanEnvValue(env.VITE_FIREBASE_AUTH_DOMAIN)!,
    projectId: cleanEnvValue(env.VITE_FIREBASE_PROJECT_ID)!,
    storageBucket: cleanEnvValue(env.VITE_FIREBASE_STORAGE_BUCKET)!,
    messagingSenderId: cleanEnvValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID)!,
    appId: cleanEnvValue(env.VITE_FIREBASE_APP_ID)!,
  };
};

export const firebaseApp = initializeApp(getFirebaseConfig());

export default firebaseApp;