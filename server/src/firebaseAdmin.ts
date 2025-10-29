import admin from 'firebase-admin';

let app: admin.app.App;

if (admin.apps.length > 0) {
  app = admin.app();
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = admin.initializeApp();
  }
}

export const firestore = admin.firestore(app);
export const auth = admin.auth(app);

export default app;
