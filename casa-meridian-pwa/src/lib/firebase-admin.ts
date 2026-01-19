import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Handle Vercel environment variable newlines for private keys
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

export function getAdminDb() {
    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    }
    return getFirestore();
}

export const adminDb = getAdminDb();


