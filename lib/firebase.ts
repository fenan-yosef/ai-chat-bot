// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"

/**
 * Firebase is initialised *once* per bundle.
 * We also ensure `auth` is created only in the browser
 * to avoid the “Component auth has not been registered yet” error.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate required config
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    console.error(`Missing Firebase config: NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`)
  }
}

// Re-use the existing app if it’s already been initialised
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Firestore can run on both client & server
export const db = getFirestore(app)

// Auth **must** only run on the client
export const auth: Auth | null = typeof window !== "undefined" ? getAuth(app) : null
