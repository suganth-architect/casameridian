import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton instances (not exported directly)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;

const initFirebase = () => {
    if (typeof window === "undefined") return; // Never init on server/build
    if (!app) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
    }
};

export const getFirebaseApp = () => {
    initFirebase();
    return app;
};

export const getFirebaseAuth = () => {
    initFirebase();
    return auth;
};

export const getFirestoreDb = () => {
    initFirebase();
    return db;
};

export const getGoogleProvider = () => {
    initFirebase();
    return googleProvider;
};

export const getFirebaseStorage = () => {
    initFirebase();
    return app ? getStorage(app) : undefined;
};
