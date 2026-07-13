import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Shared appsplosh Firebase project — HONE data is isolated in the
// `hone_users` collection by security rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCRseZ2YiIU-thua_CmpF5j2iCPIgnjueA',
  authDomain: 'appsplosh.com',
  projectId: 'appsplosh-86e73',
  storageBucket: 'appsplosh-86e73.firebasestorage.app',
  messagingSenderId: '1081771279286',
  appId: '1:1081771279286:web:9680040d9a72802538b717',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
