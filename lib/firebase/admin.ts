import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Validate admin config
const requiredVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY"
]
const missingVars = requiredVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.warn(
    "[Firebase Admin] Missing environment variables:",
    missingVars.join(", ")
  )
  console.warn(
    "[Firebase Admin] Server-side Firestore operations will not work"
  )
}

let adminDb: any = null

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      })
    })
    console.log("[Firebase Admin] Initialized successfully")

    // Get Firestore instance and configure it immediately (before any other calls)
    adminDb = getFirestore()
    adminDb.settings({
      ignoreUndefinedProperties: true
    })
  } else {
    // App already initialized, just get the existing Firestore instance
    adminDb = getFirestore()
  }
} catch (error) {
  console.error("[Firebase Admin] Initialization error:", error)
  // Deliberately NOT retrying getFirestore() here.
  //
  // If initializeApp failed there is no default app, so getFirestore() throws
  // "The default Firebase app does not exist" - and that second throw is
  // inside the catch, so nothing handles it. In any environment without a
  // service account that turned a warning into a hard crash: it is what fails
  // `next build` in CI, during page-data collection for the API routes, long
  // before any request is served.
  //
  // Leaving adminDb null keeps the failure where it belongs - at the call
  // site, at request time, in an environment that was never configured -
  // instead of taking down the build. Wherever credentials ARE present the
  // try above succeeds and this path never runs.
  adminDb = null
}

export { adminDb }
