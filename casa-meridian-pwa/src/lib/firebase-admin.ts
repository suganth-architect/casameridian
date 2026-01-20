import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// 1. Validate critical environment variables
if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is not defined');
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL is not defined');
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY is not defined');
}
// Storage bucket is optional for basic auth, but required for storage features.
// We warn if missing but don't crash unless storage is used.
if (!process.env.FIREBASE_STORAGE_BUCKET) {
    console.warn('WARN: FIREBASE_STORAGE_BUCKET is not defined. Storage operations may fail.');
} else if (process.env.FIREBASE_STORAGE_BUCKET.includes("firebasestorage.app")) {
    // CRITICAL: The Admin SDK "storageBucket" option expects the BUCKET NAME (e.g. "project-id.appspot.com"),
    // NOT the download URL domain "firebasestorage.app". This is a common misconfiguration.
    throw new Error(
        `Invalid FIREBASE_STORAGE_BUCKET: "${process.env.FIREBASE_STORAGE_BUCKET}". ` +
        `It appears to be a domain. Please use the bucket name (e.g. "<project-id>.appspot.com").`
    );
}

// 2. Handle Vercel environment variable newlines for private keys
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

// 3. Singleton Initialization
let app: App;

if (getApps().length === 0) {
    app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Mandatory for proper storage utils
    });
    console.log(`[firebase-admin] Initialized new app instance: ${app.name}`);
} else {
    app = getApp();
    //   console.log(`[firebase-admin] Reusing existing app instance: ${app.name}`);
}

// 4. Export Singletons
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);
