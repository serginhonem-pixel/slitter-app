// src/services/api.js
import { db } from "../firebaseConfig"; // Você já importa aqui
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";

// --- ADICIONE ESTA LINHA AQUI ---
// Isso permite que o App.jsx use a conexão para o Tempo Real
export { db }; 
// --------------------------------

// --- FUNÇÃO PARA BUSCAR (LÊ TUDO DE UMA COLEÇÃO) ---
export const loadFromDb = async (collectionName) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error(`Erro ao ler ${collectionName}:`, error);
    return [];
  }
};

// ... (O resto das suas funções saveToDb, deleteFromDb, updateInDb continuam iguais)
export const saveToDb = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { ...data, id: docRef.id };
  } catch (error) {
    console.error(`Erro ao salvar em ${collectionName}:`, error);
    throw error;
  }
};

export const deleteFromDb = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Erro ao deletar de ${collectionName}:`, error);
    throw error;
  }
};

export const updateInDb = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Erro ao atualizar em ${collectionName}:`, error);
    throw error;
  }
};