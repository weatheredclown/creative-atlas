import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyAhKbzdAvg2O8GmKrKV-3v1Z2CxFvei7Ts',
  authDomain: 'creative-atlas.firebaseapp.com',
  projectId: 'creative-atlas',
  storageBucket: 'creative-atlas.firebasestorage.app',
  messagingSenderId: '1022663431069',
  appId: '1:1022663431069:web:f939af8b0378d692995574',
};

export const firebaseApp = initializeApp(firebaseConfig);

export default firebaseApp;
