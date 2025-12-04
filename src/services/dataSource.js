// src/services/dataSource.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

// true -> usa JSON (localhost/dev)
// false -> usa Firebase (site/prod ou quando você quiser)
const USE_JSON_BACKUP = import.meta.env.DEV; 
// se quiser, pode trocar pra `true`/`false` na mão

// --- FUNÇÕES DE CARREGAMENTO ---

export async function loadMotherStock() {
  if (USE_JSON_BACKUP) {
    const res = await fetch("/backups/motherStock.json");
    const data = await res.json();
    // ajusta aqui se o formato do JSON for diferente
    return data;
  } else {
    const snap = await getDocs(collection(db, "motherStock"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

export async function loadB2Stock() {
  if (USE_JSON_BACKUP) {
    const res = await fetch("/backups/b2Stock.json");
    const data = await res.json();
    return data;
  } else {
    const snap = await getDocs(collection(db, "b2Stock"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

// e assim por diante para o que você precisar
