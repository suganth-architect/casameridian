import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB-306PPqqjuvsRrPieRANVjRICqtHKCAo",
    authDomain: "casameridian-c73d6.firebaseapp.com",
    projectId: "casameridian-c73d6",
    storageBucket: "casameridian-c73d6.firebasestorage.app",
    messagingSenderId: "525270374791",
    appId: "1:525270374791:web:80d5ba8da0262fcb845b22",
    measurementId: "G-4V0YSPG5J2"
};

// Initialize Firebase safely for Next.js SSR
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analytics: any = null;

if (typeof window !== "undefined") {
    isSupported().then((yes) => {
        if (yes) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, analytics };
