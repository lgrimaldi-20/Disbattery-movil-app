// Polyfill para React Native
import './firebase-polyfill';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCs73uDqTGuoy2u0fnZgngTqRWhuyIU5l8",
  authDomain: "disbattery-trade.firebaseapp.com",
  projectId: "disbattery-trade",
  storageBucket: "disbattery-trade.firebasestorage.app",
  messagingSenderId: "614937382806",
  appId: "1:614937382806:web:5df489972e5eb4365117b7",
  measurementId: "G-0G1K71M1BV"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);