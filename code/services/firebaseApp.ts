import { initializeApp } from 'firebase/app';

const getFirebaseConfig = () => {
  const cleanEnvValue = (value: string | undefined) => value?.trim();

  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID,
  } = import.meta.env;

  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_PROJECT_ID || !VITE_FIREBASE_APP_ID) {
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

  return {
    apiKey: cleanEnvValue(VITE_FIREBASE_API_KEY),
    authDomain: cleanEnvValue(VITE_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnvValue(VITE_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnvValue(VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnvValue(VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnvValue(VITE_FIREBASE_APP_ID),
  };
};

export const firebaseApp = initializeApp(getFirebaseConfig());

export default firebaseApp;
