// ─────────────────────────────────────────────────────────────────────────────
// NexDesk — Firebase Configuration
// Replace the firebaseConfig values with YOUR Firebase project credentials.
// Steps: https://console.firebase.google.com → New Project → Web App → Copy config
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

// ── YOUR FIREBASE CONFIG ─────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create project "nexdesk-prod" (or any name)
// 3. Add Web App → copy the config below
// 4. Enable: Authentication → Google sign-in
// 5. Enable: Firestore Database → Start in test mode
// 6. Paste your values here (or use environment variables via .env)

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'YOUR_API_KEY',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'YOUR_PROJECT.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'YOUR_PROJECT_ID',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| 'YOUR_SENDER_ID',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || 'YOUR_APP_ID',
}

// ── INIT ─────────────────────────────────────────────────────────────────────
const app       = initializeApp(firebaseConfig)
const auth      = getAuth(app)
const db        = getFirestore(app)
const functions = getFunctions(app)
const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({ prompt: 'select_account' })

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signOutUser      = () => signOut(auth)
export const onAuthChange     = (callback) => onAuthStateChanged(auth, callback)

// ── FIRESTORE HELPERS ─────────────────────────────────────────────────────────
export const fsTimestamp = serverTimestamp
export const fsNow       = () => Timestamp.now()

// ── EXPORTS ──────────────────────────────────────────────────────────────────
export {
  app, auth, db, functions,
  // Firestore ops
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp,
  // Functions
  httpsCallable,
}
