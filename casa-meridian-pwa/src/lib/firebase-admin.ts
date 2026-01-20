import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
    return getFirestore();
}

export const adminDb = getAdminDb();

export function getAdminAuth() {
    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
    return getAuth();
}

export const adminAuth = getAdminAuth();

import { getStorage } from 'firebase-admin/storage';

export function getAdminStorage() {
    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
    return getStorage();
}

export const adminStorage = getAdminStorage();


