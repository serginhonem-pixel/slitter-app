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
  apiKey:            "AIzaSyCdrklqrs4PO0Iv_ZkirbWMbtfOlCSL9Fk",
  authDomain:        "slitter-app.firebaseapp.com",
  projectId:         "slitter-app",
  storageBucket:     "slitter-app.firebasestorage.app",
  messagingSenderId: "997319292404",
  appId:             "1:997319292404:web:a98408731c254314ccb5a1",
};

// SELECIONA CONFIG CONFORME AMBIENTE
// npm run dev  -> import.meta.env.DEV === true -> usa DEV
// build/Vercel -> import.meta.env.DEV === false -> usa PROD
const firebaseConfig = import.meta.env.DEV ? devConfig : prodConfig;

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
