// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// CONFIG DE DESENVOLVIMENTO (localhost)
const devConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY_DEV,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_DEV,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_DEV,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_DEV,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_DEV,
  appId: import.meta.env.VITE_FIREBASE_APP_ID_DEV,
};

// CONFIG DE PRODUCAO (site na Vercel)
const prodConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY_PROD,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_PROD,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_PROD,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_PROD,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_PROD,
  appId: import.meta.env.VITE_FIREBASE_APP_ID_PROD,
};

// SELECIONA CONFIG CONFORME AMBIENTE
// npm run dev  -> import.meta.env.DEV === true -> usa DEV
// build/Vercel -> import.meta.env.DEV === false -> usa PROD
const firebaseConfig = import.meta.env.DEV ? devConfig : prodConfig;

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
