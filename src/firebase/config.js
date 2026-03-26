import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAXbAVlp3oryVMmPaXGL7azpTma2ao3GE",
  authDomain: "financasapp-149dc.firebaseapp.com",
  projectId: "financasapp-149dc",
  storageBucket: "financasapp-149dc.firebasestorage.app",
  messagingSenderId: "488930851890",
  appId: "1:488930851890:web:fecacb3612e0fa11b7d02b",
  measurementId: "G-1HRELXZW1Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();