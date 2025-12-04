// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// CONFIG DE DESENVOLVIMENTO (localhost)
const devConfig = {
  apiKey: "AIzaSyAQoE6ZhJoP3NuFtw6dbxIyDCMOZz4c7N0",   // DO PROJETO slitterApp-dev
  authDomain: "slitterapp-dev.firebaseapp.com",
  projectId: "slitterapp-dev",
  storageBucket: "slitterapp-dev.firebasestorage.app",
  messagingSenderId: "54082424850",
  appId: "1:54082424850:web:262727af7f56ce160f88cb",
};

// CONFIG DE PRODUÇÃO (site na Vercel)
const prodConfig = {
  apiKey: "AIzaSyBO4P9ycGOkaJf6HqPf0kQJetbQfHASHXg", // DO PROJETO PROD
  authDomain: "slitter-app.firebaseapp.com",
  projectId: "slitter-app",
  storageBucket: "slitter-app.firebasestorage.app",
  messagingSenderId: "997319292404",
  appId: "1:997319292404:web:a98408731c254314ccb5a1",
};

// SELECIONA CONFIG CONFORME AMBIENTE
// npm run dev  -> import.meta.env.DEV === true -> usa DEV
// build/Vercel -> import.meta.env.DEV === false -> usa PROD
const firebaseConfig = import.meta.env.DEV ? devConfig : prodConfig;

console.log("[FIREBASE CONFIG]", firebaseConfig.projectId, "DEV:", import.meta.env.DEV);

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
