import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDH12XrmIHatr1UT_wYmGDgK_5CWK_8d0M",
  authDomain: "attendance-record-system-22a8b.firebaseapp.com",
  projectId: "attendance-record-system-22a8b",
  storageBucket: "attendance-record-system-22a8b.firebasestorage.app",
  messagingSenderId: "566780109010",
  appId: "1:566780109010:web:ed3a6ce2caa876f5a5cd0b",
  measurementId: "G-KC2G56KFE5",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
