import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsJgl6tnw7-GLJlWYu619LoM0bhUh2MG8",
  authDomain: "stream-bebe5.firebaseapp.com",
  projectId: "stream-bebe5",
  storageBucket: "stream-bebe5.firebasestorage.app",
  messagingSenderId: "585478810665",
  appId: "1:585478810665:web:e20198b1502ca2e79b4038",
  measurementId: "G-961EDVN8C6",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
