// src/services/api.js
// 1. Importe db E auth do seu arquivo de configuração
import { db, auth } from "../firebaseConfig"; 
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";

// 2. Importe as funções de login
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

// --- EXPORTAÇÕES ESSENCIAIS PARA O APP.JSX ---
export { db, auth }; 

// ============================================================
// FUNÇÕES DE AUTENTICAÇÃO (LOGIN / LOGOUT)
// ============================================================

export const loginUser = async (email, password) => {
  try {
    // Tenta logar no Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no login:", error.code);
    throw error; // Joga o erro pra tela (pra aparecer "Senha inválida")
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao sair:", error);
  }
};

// ============================================================
// FUNÇÕES DE BANCO DE DADOS (CRUD)
// ============================================================

// --- BUSCAR (LÊ TUDO) ---
export const loadFromDb = async (collectionName) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error(`Erro ao ler ${collectionName}:`, error);
    return [];
  }
};

// --- ADICIONAR ---
export const saveToDb = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { ...data, id: docRef.id };
  } catch (error) {
    console.error(`Erro ao salvar em ${collectionName}:`, error);
    throw error;
  }
};

// --- DELETAR ---
export const deleteFromDb = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Erro ao deletar de ${collectionName}:`, error);
    throw error;
  }
};

// --- ATUALIZAR ---
export const updateInDb = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Erro ao atualizar em ${collectionName}:`, error);
    throw error;
  }
};