// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// COLE O SEU CÓDIGO AQUI (SUBSTITUA ESTE BLOCO PELO DO SITE)
const firebaseConfig = {
  apiKey: "AIzaSyBO4P9ycGOkaJf6HqPf0kQJetbQfHASHXg",
  authDomain: "slitter-app.firebaseapp.com",
  projectId: "slitter-app",
  storageBucket: "slitter-app.firebasestorage.app",
  messagingSenderId: "997319292404",
  appId: "1:997319292404:web:a98408731c254314ccb5a1"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// Exporta o Banco de Dados para usarmos no app
export const db = getFirestore(app);