// src/services/api.js
// 1. Importe db E auth do seu arquivo de configuração
import { db, auth } from "../firebaseConfig"; 
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch
} from "firebase/firestore";

// 2. Importe as funções de login
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";

// --- EXPORTAÇÕES ESSENCIAIS PARA O APP.JSX ---
const isLocalHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

const isFirestoreBlocked = () => isLocalHost();

export { db, auth, isLocalHost }; 

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

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Erro ao enviar reset de senha:", error);
    throw error;
  }
};

// ============================================================
// FUNÇÕES DE BANCO DE DADOS (CRUD)
// ============================================================

// --- BUSCAR (LÊ TUDO) ---
export const loadFromDb = async (collectionName) => {
  try {
    // Permite leitura em localhost para auditoria/rastreio.
    // Escrita continua bloqueada em save/update/delete.
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
    const { id: _ignoredId, ...payload } = data || {};
    if (isFirestoreBlocked()) {
      console.warn("[FIREBASE] saveToDb bloqueado no localhost:", collectionName);
      return { ...payload, id: `LOCAL-${Date.now()}` };
    }
    const docRef = await addDoc(collection(db, collectionName), payload);
    return { ...payload, id: docRef.id };
  } catch (error) {
    console.error(`Erro ao salvar em ${collectionName}:`, error);
    throw error;
  }
};

// --- DELETAR ---
export const deleteFromDb = async (collectionName, id) => {
  try {
    if (isFirestoreBlocked()) {
      console.warn("[FIREBASE] deleteFromDb bloqueado no localhost:", collectionName);
      return;
    }
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Erro ao deletar de ${collectionName}:`, error);
    throw error;
  }
};

// --- CORTE ATÔMICO (mãe + log + filhas em uma única transação) ---
// Evita o cenário em que a bobina mãe é debitada e o log de corte é salvo
// com N peças, mas a gravação das bobinas filhas falha no meio do caminho
// (ex: queda de rede), deixando peças "fantasmas" descontadas do estoque
// sem nunca terem sido criadas como registro de bobina filha.
export const saveCutAtomic = async ({ motherId, motherUpdateData, cutLogData, childCoilsData }) => {
  if (isFirestoreBlocked()) {
    console.warn("[FIREBASE] saveCutAtomic bloqueado no localhost");
    const children = childCoilsData.map((data, i) => ({ ...data, id: `LOCAL-CHILD-${Date.now()}-${i}` }));
    return { cuttingLogId: `LOCAL-LOG-${Date.now()}`, children };
  }
  try {
    const batch = writeBatch(db);

    const motherRef = doc(db, 'motherCoils', motherId);
    batch.update(motherRef, motherUpdateData);

    const logRef = doc(collection(db, 'cuttingLogs'));
    const childRefs = childCoilsData.map(() => doc(collection(db, 'childCoils')));
    const childIds = childRefs.map(ref => ref.id);

    batch.set(logRef, { ...cutLogData, motherId, childIds });
    childCoilsData.forEach((data, i) => batch.set(childRefs[i], data));

    await batch.commit();

    return {
      cuttingLogId: logRef.id,
      children: childCoilsData.map((data, i) => ({ ...data, id: childIds[i] })),
    };
  } catch (error) {
    console.error("Erro ao salvar corte atomicamente:", error);
    throw error;
  }
};

// --- ATUALIZAR ---
export const updateInDb = async (collectionName, id, data) => {
  try {
    if (isFirestoreBlocked()) {
      console.warn("[FIREBASE] updateInDb bloqueado no localhost:", collectionName);
      return;
    }
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error(`Erro ao atualizar em ${collectionName}:`, error);
    throw error;
  }
};
