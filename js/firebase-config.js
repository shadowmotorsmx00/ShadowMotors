import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFMiuflfxV65oQsyKbNI5LK22SIzdAJyg",
  authDomain: "shadow-motors-b66ba.firebaseapp.com",
  projectId: "shadow-motors-b66ba",
  storageBucket: "shadow-motors-b66ba.firebasestorage.app",
  messagingSenderId: "787241613820",
  appId: "1:787241613820:web:89ea8ca4ce89f1d7755a79",
  measurementId: "G-NR0FT8EG0E"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);