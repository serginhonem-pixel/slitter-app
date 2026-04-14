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
  // Formato "Janeiro 26" ou "Janeiro/26" (suporta acentos: Março, Fevereiro etc.)
  const m = mes.trim().match(/^([^\s\/]+)[\s\/](\d{2,4})$/);
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

// Calcula a média de necessidade dos últimos N meses com valor > 0 para um produto
function mediaNecessidade(produto, estoqueBase, n = 3) {
  const hoje = new Date();
  // Pega todos os registros do produto com necessidade > 0, ordenados do mais recente
  const historico = estoqueBase
    .filter((e) => e.produto === produto && (e.necessidadeProd || 0) > 0)
    .map((e) => {
      // Converte mes para Date para ordenação
      const parts = normalizeMes(e.mes).split("/"); // ["Jan","26"]
      const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const mIdx = mesesAbrev.indexOf(parts[0]);
      const ano = mIdx >= 0 && parts[1] ? 2000 + parseInt(parts[1], 10) : 0;
      return { ...e, _date: new Date(ano, mIdx, 1) };
    })
    .filter((e) => e._date < hoje) // apenas meses passados
    .sort((a, b) => b._date - a._date)
    .slice(0, n);

  if (historico.length === 0) return { media: 0, mesesUsados: 0 };
  const total = historico.reduce((s, e) => s + (e.necessidadeProd || 0), 0);
  return { media: Math.round(total / historico.length), mesesUsados: historico.length };
}

// Converte "DD/MM/YYYY" para Date
function parseDateBR(str) {
  if (!str || str === "-" || str.toLowerCase().includes("definir")) return null;
  const p = String(str).split("/");
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[1] - 1, +p[0]);
  return isNaN(d) ? null : d;
}

// Retorna o mes no formato "Jan/26" a partir de uma Date
function dateToMes(d) {
  if (!d) return null;
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[d.getMonth()]}/${String(d.getFullYear()).substring(2)}`;
}

// Para pedidos sem mesChegada definido, estima a chegada:
// "Embarque Confirmado" com data de embarque → embarque + 30d
// Caso contrário: previsaoChegada → aprovacao+90d → hoje+90d
function mesChegadaEfetivo(pedido) {
  const mc = normalizeMes(pedido.mesChegada || "");
  if (mc && mc !== "" && !pedido.mesChegada?.toLowerCase().includes("definir")) {
    // Verifica se o mês previsto já passou
    const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const parts = mc.split("/");
    const mIdx = mesesAbrev.indexOf(parts[0]);
    const ano = mIdx >= 0 && parts[1] ? 2000 + parseInt(parts[1], 10) : 0;
    if (mIdx === -1 || ano === 0) return { mes: mc, estimado: false, criterio: null }; // fallback se parsing falhar
    const mesDate = new Date(ano, mIdx, 1);
    const hoje = new Date();
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    if (mesDate < mesAtual) {
      const mesAtualStr = `${mesesAbrev[hoje.getMonth()]}/${String(hoje.getFullYear()).substring(2)}`;
      const mesesAtraso = (hoje.getFullYear() - ano) * 12 + hoje.getMonth() - mIdx;
      return { mes: mesAtualStr, estimado: true, criterio: "atrasado", atrasado: true, mesOriginal: mc, mesesAtraso };
    }
    return { mes: mc, estimado: false, criterio: null };
  }

  // Previsão de chegada direta (ETD = chegada no Brasil) — prioridade máxima após mesChegada
  const prev = parseDateBR(pedido.previsaoChegada);
  if (prev && prev > new Date()) return { mes: dateToMes(prev), estimado: true, criterio: "previsão chegada" };

  // Se há data de embarque (ETA = saída da China) → +30d como estimativa de chegada
  const emb = parseDateBR(pedido.embarque);
  if (emb) {
    const est = new Date(emb.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { mes: dateToMes(est), estimado: true, criterio: "embarque+30d" };
  }

  // Previsão de chegada mesmo que passada (último recurso antes de aprovação)
  if (prev) return { mes: dateToMes(prev), estimado: true, criterio: "previsão chegada" };

  // Aprovação + 90 dias
  const aprov = parseDateBR(pedido.aprovacao);
  if (aprov) {
    const est = new Date(aprov.getTime() + 90 * 24 * 60 * 60 * 1000);
    return { mes: dateToMes(est), estimado: true, criterio: "aprovação+90d" };
  }

  // Último recurso: hoje + 90 dias
  const hoje90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  return { mes: dateToMes(hoje90), estimado: true, criterio: "hoje+90d" };
}

// Calcula estoque projetado para um produto ao longo dos meses
export function calcularProjecao(produto, pedidos, estoqueBase) {
  const meses = gerarProximosMeses(12);
  let rows = [];
  let saldoAnterior = null;

  // Calcula média dos últimos 3 meses uma vez só
  const { media: mediaDefault, mesesUsados } = mediaNecessidade(produto, estoqueBase, 3);

  // Pré-computa o mês efetivo de cada pedido em aberto do produto
  const pedidosAtivos = pedidos
    .filter((p) => p.produto === produto && p.status !== "Entregue")
    .map((p) => ({ ...p, _mesEfetivo: mesChegadaEfetivo(p) }));

  for (const mes of meses) {
    const baseRow = estoqueBase.find(
      (e) => normalizeMes(e.mes) === mes && e.produto === produto
    );

    const comprasHHT = pedidosAtivos
      .filter((p) => p._mesEfetivo.mes === mes && p.fornecedor === "HUATIAN")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    const comprasEAS = pedidosAtivos
      .filter((p) => p._mesEfetivo.mes === mes && p.fornecedor === "EASTERN")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    const comprasGRN = pedidosAtivos
      .filter((p) => p._mesEfetivo.mes === mes && p.fornecedor === "GUANRUI")
      .reduce((s, p) => s + (p.quantidade || 0), 0);

    // Conta quantos pedidos do mês são estimados e agrupa por critério
    const estimadosDoMes = pedidosAtivos.filter((p) => p._mesEfetivo.mes === mes && p._mesEfetivo.estimado);
    const qtdEstimados = estimadosDoMes.length;
    const criteriosUsados = [...new Set(estimadosDoMes.map((p) => p._mesEfetivo.criterio).filter(Boolean))];

    const totalCompras = comprasHHT + comprasEAS + comprasGRN;

    // Consumo real tem prioridade; senão usa necessidadeProd cadastrado; senão usa média
    const consumoReal = baseRow?.consumoReal || 0;
    const isConsumoReal = consumoReal > 0;
    const temValorCadastrado = baseRow && (baseRow.necessidadeProd || 0) > 0;
    const necessidade = isConsumoReal ? consumoReal : (temValorCadastrado ? baseRow.necessidadeProd : mediaDefault);
    const isMedia = !isConsumoReal && !temValorCadastrado && mediaDefault > 0;

    const estoqueInicial = saldoAnterior !== null ? saldoAnterior : (baseRow?.estoqueInicial || 0);
    const saldo = estoqueInicial + totalCompras - necessidade;

    const pedidosDoMes = pedidosAtivos.filter((p) => p._mesEfetivo.mes === mes);
    rows.push({ mes, estoqueInicial, comprasHHT, comprasEAS, comprasGRN, totalCompras, necessidade, saldo, isMedia, isConsumoReal, mesesUsados, qtdEstimados, criteriosUsados, pedidosDoMes });
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
  const [consumoHistorico, setConsumoHistorico] = useState([]);

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
    const pedidoAtual = pedidos.find((p) => p.id === id);
    const novaLista = pedidos.map((p) => p.id === id ? { ...p, ...data } : p);
    savePedidos(novaLista);

    // Quando marcado como Entregue, soma a quantidade ao estoqueInicial do mês atual
    if (data.status === "Entregue" && pedidoAtual && pedidoAtual.status !== "Entregue") {
      const { produto, quantidade } = pedidoAtual;
      const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const hoje = new Date();
      const mesAtual = `${mesesAbrev[hoje.getMonth()]}/${String(hoje.getFullYear()).substring(2)}`;
      const existente = estoqueBase.find((e) => e.produto === produto && normalizeMes(e.mes) === mesAtual);
      let novaEstoqueBase;
      if (existente) {
        novaEstoqueBase = estoqueBase.map((e) =>
          e.produto === produto && normalizeMes(e.mes) === mesAtual
            ? { ...e, estoqueInicial: (e.estoqueInicial || 0) + (quantidade || 0) }
            : e
        );
      } else {
        novaEstoqueBase = [...estoqueBase, {
          mes: mesAtual, produto,
          estoqueInicial: quantidade || 0,
          comprasHHT: 0, comprasEAS: 0, comprasGRN: 0,
          totalCompras: 0, necessidadeProd: 0, saldo: quantidade || 0,
        }];
      }
      saveEstoque(novaEstoqueBase);
    }

    try {
      if (!id.startsWith("init-") && !id.startsWith("LOCAL-")) {
        await updateInDb("tiresPedidos", id, data);
      }
    } catch { /* silent */ }
  }, [pedidos, savePedidos, estoqueBase, saveEstoque]);

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

  const updateConsumoReal = useCallback((produto, mes, valor) => {
    const mesNorm = normalizeMes(mes);
    const existente = estoqueBase.find((e) => e.produto === produto && normalizeMes(e.mes) === mesNorm);
    let novaLista;
    if (existente) {
      novaLista = estoqueBase.map((e) =>
        e.produto === produto && normalizeMes(e.mes) === mesNorm
          ? { ...e, consumoReal: valor }
          : e
      );
    } else {
      novaLista = [...estoqueBase, { mes: mesNorm, produto, estoqueInicial: 0, comprasHHT: 0, comprasEAS: 0, comprasGRN: 0, totalCompras: 0, necessidadeProd: 0, consumoReal: valor, saldo: -valor }];
    }
    saveEstoque(novaLista);
    const registro = { produto, mes: mesNorm, valor, timestamp: new Date().toISOString() };
    setConsumoHistorico((prev) => [registro, ...prev].slice(0, 20));
    try { saveToDb("tiresConsumoReal", registro); } catch { /* silent */ }
  }, [estoqueBase, saveEstoque]);

  const produtos = useMemo(() => [...new Set(pedidos.map((p) => p.produto).filter(Boolean))].sort(), [pedidos]);

  return {
    pedidos, estoqueBase, loading, syncStatus, prodHistorico, consumoHistorico,
    produtos,
    addPedido, updatePedido, deletePedido, updateNecessidade, updateConsumoReal,
    syncAllToFirebase,
  };
}
