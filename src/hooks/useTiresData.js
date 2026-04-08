import { useState, useCallback, useMemo, useEffect } from "react";
import { loadFromDb, saveToDb, updateInDb, deleteFromDb } from "../services/api";
import { db } from "../services/api";
import { collection, writeBatch, doc } from "firebase/firestore";
import INITIAL_PEDIDOS from "../data/tiresPedidos.json";
import INITIAL_ESTOQUE from "../data/tiresEstoque.json";

// Normaliza string de mês para comparação: "Janeiro 26" -> "Jan/26", "Jan/26" -> "Jan/26"
export function normalizeMes(mes) {
  if (!mes) return "";
  const meses = {
    Janeiro: "Jan", Fevereiro: "Fev", Março: "Mar", Abril: "Abr",
    Maio: "Mai", Junho: "Jun", Julho: "Jul", Agosto: "Ago",
    Setembro: "Set", Outubro: "Out", Novembro: "Nov", Dezembro: "Dez",
  };
  // Já está no formato abreviado (Jan/26)
  if (/^[A-Za-z]{3}\/\d{2}$/.test(mes.trim())) return mes.trim();
  // Formato "Janeiro 26" ou "Janeiro/26"
  const m = mes.trim().match(/^(\w+)[\s\/](\d{2,4})$/);
  if (m) {
    const abrev = meses[m[1]] || m[1].substring(0, 3);
    const ano = m[2].length === 4 ? m[2].substring(2) : m[2];
    return `${abrev}/${ano}`;
  }
  return mes.trim();
}

// Gera lista dos próximos N meses a partir de hoje no formato "Jan/26"
export function gerarProximosMeses(n = 12) {
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const result = [];
  const hoje = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    result.push(`${meses[d.getMonth()]}/${String(d.getFullYear()).substring(2)}`);
  }
  return result;
}

// Calcula estoque projetado para um produto ao longo dos meses
export function calcularProjecao(produto, pedidos, estoqueBase) {
  const meses = gerarProximosMeses(12);
  let rows = [];
  let saldoAnterior = null;

  for (const mes of meses) {
    const baseRow = estoqueBase.find(
      (e) => normalizeMes(e.mes) === mes && e.produto === produto
    );

    const comprasHHT = pedidos
      .filter((p) => p.produto === produto && normalizeMes(p.mesChegada) === mes && p.fornecedor === "HUATIAN" && p.status !== "Entregue")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    const comprasEAS = pedidos
      .filter((p) => p.produto === produto && normalizeMes(p.mesChegada) === mes && p.fornecedor === "EASTERN" && p.status !== "Entregue")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    const comprasGRN = pedidos
      .filter((p) => p.produto === produto && normalizeMes(p.mesChegada) === mes && p.fornecedor === "GUANRUI" && p.status !== "Entregue")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    const totalCompras = comprasHHT + comprasEAS + comprasGRN;
    const necessidade = baseRow?.necessidadeProd || 0;
    const estoqueInicial = saldoAnterior !== null ? saldoAnterior : (baseRow?.estoqueInicial || 0);
    const saldo = estoqueInicial + totalCompras - necessidade;

    rows.push({ mes, estoqueInicial, comprasHHT, comprasEAS, comprasGRN, totalCompras, necessidade, saldo });
    saldoAnterior = saldo;
  }
  return rows;
}

export function useTiresData() {
  const [pedidos, setPedidos] = useState(() => {
    try {
      const saved = localStorage.getItem("tires_pedidos");
      return saved ? JSON.parse(saved) : INITIAL_PEDIDOS.map((p, i) => ({ ...p, id: `init-${i}` }));
    } catch {
      return INITIAL_PEDIDOS.map((p, i) => ({ ...p, id: `init-${i}` }));
    }
  });

  const [estoqueBase, setEstoqueBase] = useState(() => {
    try {
      const saved = localStorage.getItem("tires_estoque");
      return saved ? JSON.parse(saved) : INITIAL_ESTOQUE;
    } catch {
      return INITIAL_ESTOQUE;
    }
  });

  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "ok" | "error"
  const [prodHistorico, setProdHistorico] = useState([]);

  // Ao montar: tenta carregar do Firebase (só em produção)
  useEffect(() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) return; // Em produção apenas
    (async () => {
      try {
        const [fbPedidos, fbEstoque] = await Promise.all([
          loadFromDb("tiresPedidos"),
          loadFromDb("tiresEstoque"),
        ]);
        if (fbPedidos.length > 0) {
          setPedidos(fbPedidos);
          localStorage.setItem("tires_pedidos", JSON.stringify(fbPedidos));
        }
        if (fbEstoque.length > 0) {
          setEstoqueBase(fbEstoque);
          localStorage.setItem("tires_estoque", JSON.stringify(fbEstoque));
        }
      } catch (e) {
        console.warn("[Pneus] Falha ao carregar do Firebase, usando cache local.", e);
      }
    })();
  }, []);

  const savePedidos = useCallback((list) => {
    setPedidos(list);
    localStorage.setItem("tires_pedidos", JSON.stringify(list));
  }, []);

  const saveEstoque = useCallback((list) => {
    setEstoqueBase(list);
    localStorage.setItem("tires_estoque", JSON.stringify(list));
  }, []);

  // Faz upload de todos os dados atuais pro Firebase em batch
  const syncAllToFirebase = useCallback(async (currentPedidos, currentEstoque) => {
    setSyncStatus("syncing");
    try {
      // Batch para pedidos (limite Firestore: 500 por batch)
      const chunkSize = 400;
      const upload = async (colName, items) => {
        for (let i = 0; i < items.length; i += chunkSize) {
          const batch = writeBatch(db);
          items.slice(i, i + chunkSize).forEach((item) => {
            const { id, ...data } = item;
            const ref = (id && !id.startsWith("init-") && !id.startsWith("LOCAL-"))
              ? doc(db, colName, id)
              : doc(collection(db, colName));
            batch.set(ref, data);
          });
          await batch.commit();
        }
      };
      await upload("tiresPedidos", currentPedidos);
      await upload("tiresEstoque", currentEstoque);
      setSyncStatus("ok");
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (e) {
      console.error("[Pneus] Erro ao sincronizar:", e);
      setSyncStatus("error");
    }
  }, []);

  const addPedido = useCallback(async (pedido) => {
    const novo = { ...pedido, id: `tire-${Date.now()}` };
    try {
      const saved = await saveToDb("tiresPedidos", novo);
      const novaLista = [...pedidos, { ...novo, id: saved.id }];
      savePedidos(novaLista);
    } catch {
      savePedidos([...pedidos, novo]);
    }
  }, [pedidos, savePedidos]);

  const updatePedido = useCallback(async (id, data) => {
    const novaLista = pedidos.map((p) => p.id === id ? { ...p, ...data } : p);
    savePedidos(novaLista);
    try {
      if (!id.startsWith("init-") && !id.startsWith("LOCAL-")) {
        await updateInDb("tiresPedidos", id, data);
      }
    } catch { /* silent */ }
  }, [pedidos, savePedidos]);

  const deletePedido = useCallback(async (id) => {
    savePedidos(pedidos.filter((p) => p.id !== id));
    try {
      if (!id.startsWith("init-") && !id.startsWith("LOCAL-")) {
        await deleteFromDb("tiresPedidos", id);
      }
    } catch { /* silent */ }
  }, [pedidos, savePedidos]);

  const updateNecessidade = useCallback((produto, mes, valor) => {
    const mesNorm = normalizeMes(mes);
    const existente = estoqueBase.find((e) => e.produto === produto && normalizeMes(e.mes) === mesNorm);
    let novaLista;
    if (existente) {
      novaLista = estoqueBase.map((e) =>
        e.produto === produto && normalizeMes(e.mes) === mesNorm
          ? { ...e, necessidadeProd: valor }
          : e
      );
    } else {
      novaLista = [...estoqueBase, { mes: mesNorm, produto, estoqueInicial: 0, comprasHHT: 0, comprasEAS: 0, comprasGRN: 0, totalCompras: 0, necessidadeProd: valor, saldo: -valor }];
    }
    saveEstoque(novaLista);
    const registro = { produto, mes: mesNorm, valor, timestamp: new Date().toISOString() };
    setProdHistorico((prev) => [registro, ...prev].slice(0, 20));
    try { saveToDb("tiresNecessidade", registro); } catch { /* silent */ }
  }, [estoqueBase, saveEstoque]);

  const produtos = useMemo(() => [...new Set(pedidos.map((p) => p.produto).filter(Boolean))].sort(), [pedidos]);

  return {
    pedidos, estoqueBase, loading, syncStatus, prodHistorico,
    produtos,
    addPedido, updatePedido, deletePedido, updateNecessidade,
    syncAllToFirebase,
  };
}
