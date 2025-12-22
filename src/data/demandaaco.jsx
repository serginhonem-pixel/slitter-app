import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Truck, AlertTriangle, CheckCircle2, TrendingUp, Package, 
  BarChart3, Calendar, Save, ArrowRight, Settings2, Box, Scroll, 
  History, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import estruturaMpPiPa from './estrutura_mp_pi_pa.json';

// --- DADOS DE EXEMPLO (Focados em Carrinhos) ---
const MOCK_PRODUCTS = [
  { id: 1, name: "CARRINHO POP CINZA", mix: 7.34, weight: 2.384, plate: "BF 0.40" },
  { id: 2, name: "CARRINHO POP GALV.", mix: 21.41, weight: 2.384, plate: "BF 0.40" },
  { id: 3, name: "CARRINHO CONSTR. CINZA", mix: 6.94, weight: 2.364, plate: "BF 0.40" },
  { id: 4, name: "CARRINHO CONSTR. GALV.", mix: 37.74, weight: 2.364, plate: "BF 0.40" },
  { id: 8, name: "CARRO PLATAFORMA", mix: 6.00, weight: 10.60, plate: "BF 1.40" }
];

const INITIAL_STOCK = [
  { material: "BF 0.40", qty: 25000 },
  { material: "BF 1.40", qty: 50000 },
  { material: "BF 0.60", qty: 0 },
  { material: "BF 0.75", qty: 0 }
];


const ESTRUTURA_DATA = estruturaMpPiPa || {};
const ESTRUTURA_ITEMS = ESTRUTURA_DATA.items || {};
const ESTRUTURA_EDGES = Array.isArray(ESTRUTURA_DATA.edges) ? ESTRUTURA_DATA.edges : [];
const ESTRUTURA_ROOTS = Array.isArray(ESTRUTURA_DATA.roots) ? ESTRUTURA_DATA.roots : [];

const buildEdgeMap = () => {
  return ESTRUTURA_EDGES.reduce((acc, edge) => {
    const parent = String(edge?.parent || '').trim();
    if (!parent) return acc;
    if (!acc[parent]) acc[parent] = [];
    acc[parent].push(edge);
    return acc;
  }, {});
};

const explodeBom = (rootCode, edgesByParent) => {
  const aggregated = {};
  const stack = [{ code: String(rootCode || '').trim(), factor: 1, lastPiLevel: null }];

  while (stack.length) {
    const current = stack.pop();
    const edges = edgesByParent[current.code] || [];
    edges.forEach((edge) => {
      const child = String(edge?.child || '').trim();
      if (!child) return;
      const qtdNec = Number(edge.qtdNec || 0);
      const qtdBase = Number(edge.qtdBase || 1) || 1;
      const perdaPct = Number(edge.perdaPct || 0);
      const factor = current.factor * (qtdNec / qtdBase) * (1 + perdaPct / 100);
      const tp = String(edge.tp || ESTRUTURA_ITEMS[child]?.tp || '').trim();
      const nivel = Number(edge.nivel || 0) || null;

      if (tp === 'MP') {
        if (!aggregated[child]) {
          aggregated[child] = {
            cod: child,
            desc: String(ESTRUTURA_ITEMS[child]?.desc || ''),
            porUnidade: 0,
            nivelMp: nivel,
            nivelPi: current.lastPiLevel,
          };
        }
        aggregated[child].porUnidade += factor;
        if (nivel && !aggregated[child].nivelMp) aggregated[child].nivelMp = nivel;
        if (current.lastPiLevel && !aggregated[child].nivelPi) aggregated[child].nivelPi = current.lastPiLevel;
      } else {
        const nextPiLevel = tp === 'PI' ? nivel : current.lastPiLevel;
        stack.push({ code: child, factor, lastPiLevel: nextPiLevel });
      }
    });
  }

  return Object.values(aggregated);
};

const LS_KEYS = {
  categoryOverrides: 'demandaaco.categoryOverrides.v1',
  stockSnapshot_2025_12_01: 'demandaaco.stockSnapshot.2025-12-01.v1',
};

export default function ModuloPCP({ initialProducts = MOCK_PRODUCTS }) {
  // --- ESTADOS ---
  const [products, setProducts] = useState(initialProducts);
  const [stockItems, setStockItems] = useState(INITIAL_STOCK);

  const [calcMode, setCalcMode] = useState('monthly');
  const [metaTotalInput, setMetaTotalInput] = useState(66000);
  const [metaDailyInput, setMetaDailyInput] = useState(3300);
  const [workDays, setWorkDays] = useState(20);
  const [activeTab, setActiveTab] = useState('mrp'); 
  const [scenarioSaved, setScenarioSaved] = useState(false);
  const [avgCoilWeight, setAvgCoilWeight] = useState(10000);
  
  const [produtoSearch, setProdutoSearch] = useState('');
  const [qtdPorProduto, setQtdPorProduto] = useState({});
  const [mostrarSomenteSelecionados, setMostrarSomenteSelecionados] = useState(true);
  const [agruparPorCategoria, setAgruparPorCategoria] = useState(true);
  const [importSomarAoExistente, setImportSomarAoExistente] = useState(false);
  const [importResumo, setImportResumo] = useState(null);
  const carteiraInputRef = useRef(null);
  const estoque0112InputRef = useRef(null);

  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [categorySaveOk, setCategorySaveOk] = useState(false);

  const [useEstoque0112, setUseEstoque0112] = useState(false);
  const [estoque0112, setEstoque0112] = useState({});
  const [estoque0112Resumo, setEstoque0112Resumo] = useState(null);

  // Controle de drill-down (Expandir detalhes)
  const [expandedItems, setExpandedItems] = useState({});

  // --- HANDLERS ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEYS.categoryOverrides);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setCategoryOverrides(parsed);
      }
    } catch {}

    try {
      const raw = localStorage.getItem(LS_KEYS.stockSnapshot_2025_12_01);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setEstoque0112(parsed);
          setUseEstoque0112(true);
        }
      }
    } catch {}
  }, []);

  const handleMixChange = (id, newMix) => {
    const updated = products.map(p => 
      p.id === id ? { ...p, mix: parseFloat(newMix) || 0 } : p
    );
    setProducts(updated);
  };

  const handleStockChange = (materialName, newQty) => {
    const qty = parseFloat(newQty) || 0;
    const exists = stockItems.find(s => s.material === materialName);
    if (exists) {
      setStockItems(stockItems.map(s => s.material === materialName ? { ...s, qty } : s));
    } else {
      setStockItems([...stockItems, { material: materialName, qty }]);
    }
  };

  const toggleExpand = (plate) => {
    setExpandedItems(prev => ({...prev, [plate]: !prev[plate]}));
  };

  const handleSaveScenario = () => {
    setScenarioSaved(true);
    setTimeout(() => setScenarioSaved(false), 3000);
  };

  const handleQtdProdutoChange = (produto, newQty) => {
    const qty = Number(newQty);
    setQtdPorProduto(prev => ({ ...prev, [produto]: Number.isFinite(qty) ? qty : 0 }));
  };

  const handleCategoriaProdutoChange = (produto, categoriaKey) => {
    const next = String(categoriaKey || '').trim();
    setCategoryOverrides(prev => ({ ...prev, [produto]: next }));
  };

  const handleSalvarCategoriasLocal = () => {
    try {
      localStorage.setItem(LS_KEYS.categoryOverrides, JSON.stringify(categoryOverrides || {}));
      setCategorySaveOk(true);
      setTimeout(() => setCategorySaveOk(false), 2500);
    } catch {}
  };

  const handleResetCategoriasLocal = () => {
    setCategoryOverrides({});
    try {
      localStorage.removeItem(LS_KEYS.categoryOverrides);
    } catch {}
  };

  const handleEstoque0112Change = (cod, newQty) => {
    const qty = parseQty(newQty);
    setEstoque0112(prev => {
      const next = { ...prev, [String(cod)]: qty };
      try {
        localStorage.setItem(LS_KEYS.stockSnapshot_2025_12_01, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  function parseQty(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = String(value).trim();
    if (!raw) return 0;

    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    let normalized = raw;
    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }
    normalized = normalized.replace(/\s/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const mergeImported = (rows) => {
    const produtoSet = new Set((Array.isArray(ESTRUTURA_ROOTS) ? ESTRUTURA_ROOTS : []).map(p => String(p ?? '')));

    const imported = {};
    let importedCount = 0;
    let unknownCount = 0;

    rows.forEach(r => {
      const produto = String(r.produto ?? '').trim();
      if (!produto) return;
      const qty = parseQty(r.quantidade);
      if (!(qty > 0)) return;

      if (!produtoSet.has(produto)) unknownCount += 1;
      if (!imported[produto]) importedCount += 1;
      imported[produto] = (imported[produto] || 0) + qty;
    });

    setQtdPorProduto(prev => {
      const base = importSomarAoExistente ? { ...prev } : {};
      Object.entries(imported).forEach(([produto, qty]) => {
        base[produto] = (base[produto] || 0) + qty;
      });
      return base;
    });

    setMostrarSomenteSelecionados(true);
    setImportResumo({
      importedProducts: importedCount,
      unknownProducts: unknownCount,
      totalLines: rows.length,
      mode: importSomarAoExistente ? 'somar' : 'substituir'
    });
  };

  const parseStockRows = (rows) => {
    const snapshot = {};
    let lines = 0;
    rows.forEach(r => {
      const cod = String(r.cod ?? r.material ?? r.bobina ?? '').trim();
      if (!cod) return;
      const qty = parseQty(r.qty ?? r.saldo ?? r.estoque ?? r.quantidade);
      if (!(qty >= 0)) return;
      snapshot[cod] = qty;
      lines += 1;
    });
    return { snapshot, lines };
  };

  const parseStockCsvText = (text) => {
    const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const sepCandidates = [',', ';', '\t'];
    const headerLine = lines[0];
    const sep = sepCandidates
      .map(s => ({ s, c: headerLine.split(s).length }))
      .sort((a, b) => b.c - a.c)[0].s;

    const headers = headerLine.split(sep).map(h => h.trim().toLowerCase());
    const findIndex = (names) => headers.findIndex(h => names.includes(h));

    const codIdx = findIndex(['cod', 'código', 'codigo', 'material', 'bobina']);
    const qtyIdx = findIndex(['saldo', 'estoque', 'qty', 'quantidade']);
    if (codIdx < 0 || qtyIdx < 0) return [];

    return lines.slice(1).map(line => {
      const cols = line.split(sep);
      return {
        cod: cols[codIdx],
        qty: cols[qtyIdx],
      };
    });
  };

  const parseStockXlsxFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (!Array.isArray(data) || data.length === 0) return [];

    const header = data[0].map(v => String(v || '').trim().toLowerCase());
    const findIndex = (names) => header.findIndex(h => names.includes(h));
    const codIdx = findIndex(['cod', 'código', 'codigo', 'material', 'bobina']);
    const qtyIdx = findIndex(['saldo', 'estoque', 'qty', 'quantidade']);
    if (codIdx < 0 || qtyIdx < 0) return [];

    return data.slice(1).map(row => ({
      cod: row[codIdx],
      qty: row[qtyIdx],
    }));
  };

  const handleEstoque0112Picked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const name = String(file.name || '').toLowerCase();
      let rows = [];
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text();
        rows = parseStockCsvText(text);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        rows = await parseStockXlsxFile(file);
      }

      if (rows.length === 0) {
        setEstoque0112Resumo({ error: 'Arquivo inválido: precisa ter colunas cod/material e saldo/estoque.' });
        return;
      }

      const { snapshot, lines } = parseStockRows(rows);
      setEstoque0112(snapshot);
      setUseEstoque0112(true);
      setEstoque0112Resumo({ lines, items: Object.keys(snapshot).length });
      try {
        localStorage.setItem(LS_KEYS.stockSnapshot_2025_12_01, JSON.stringify(snapshot));
      } catch {}
    } catch (err) {
      setEstoque0112Resumo({ error: `Falha ao importar: ${err?.message || String(err)}` });
    } finally {
      e.target.value = '';
    }
  };

  const parseCsvText = (text) => {
    const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const sepCandidates = [',', ';', '\t'];
    const headerLine = lines[0];
    const sep = sepCandidates
      .map(s => ({ s, c: headerLine.split(s).length }))
      .sort((a, b) => b.c - a.c)[0].s;

    const headers = headerLine.split(sep).map(h => h.trim().toLowerCase());
    const findIndex = (names) => headers.findIndex(h => names.includes(h));

    const produtoIdx = findIndex(['produto', 'codigo', 'código', 'cod', 'item']);
    const qtdIdx = findIndex(['quantidade', 'qtd', 'qtde', 'demanda']);
    if (produtoIdx < 0 || qtdIdx < 0) return [];

    return lines.slice(1).map(line => {
      const cols = line.split(sep);
      return {
        produto: cols[produtoIdx],
        quantidade: cols[qtdIdx],
      };
    });
  };

  const parseXlsxFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (!Array.isArray(data) || data.length === 0) return [];

    const header = data[0].map(v => String(v || '').trim().toLowerCase());
    const findIndex = (names) => header.findIndex(h => names.includes(h));
    const produtoIdx = findIndex(['produto', 'codigo', 'código', 'cod', 'item']);
    const qtdIdx = findIndex(['quantidade', 'qtd', 'qtde', 'demanda']);
    if (produtoIdx < 0 || qtdIdx < 0) return [];

    return data.slice(1).map(row => ({
      produto: row[produtoIdx],
      quantidade: row[qtdIdx],
    }));
  };

  const handleCarteiraFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const name = String(file.name || '').toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text();
        const rows = parseCsvText(text);
        if (rows.length === 0) {
          setImportResumo({ error: 'CSV inválido: precisa ter colunas produto e quantidade.' });
          return;
        }
        mergeImported(rows);
        return;
      }

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const rows = await parseXlsxFile(file);
        if (rows.length === 0) {
          setImportResumo({ error: 'Excel inválido: precisa ter colunas produto e quantidade na primeira aba.' });
          return;
        }
        mergeImported(rows);
        return;
      }

      setImportResumo({ error: 'Formato não suportado. Use CSV ou Excel (.xlsx).' });
    } catch (err) {
      setImportResumo({ error: `Falha ao importar: ${err?.message || String(err)}` });
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadCarteiraModelo = () => {
    const csv = [
      'produto,quantidade,observacao',
      '00107,1000,exemplo',
      '02613,500,'
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_carteira_demanda.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // --- ENGINE DE CÁLCULO ---
  const simulation = useMemo(() => {
    let effectiveTotalProduction = 0;
    if (calcMode === 'monthly') {
      effectiveTotalProduction = metaTotalInput;
    } else {
      effectiveTotalProduction = metaDailyInput * workDays;
    }

    // 1. Plano de Produção
    const productionPlan = products.map(prod => {
      const mixDecimal = prod.mix / 100;
      const quantity = Math.round(mixDecimal * effectiveTotalProduction);
      const daily = Math.round(quantity / workDays);
      const steelDemand = quantity * prod.weight;
      return { ...prod, quantity, daily, steelDemand };
    });

    // 2. Demanda Agrupada e Rastreabilidade
    const materialData = {}; 

    productionPlan.forEach(item => {
      if (!materialData[item.plate]) {
        materialData[item.plate] = { totalDemand: 0, consumers: [] };
      }
      materialData[item.plate].totalDemand += item.steelDemand;
      materialData[item.plate].consumers.push({
        name: item.name,
        qtyProd: item.quantity,
        steelUsed: item.steelDemand
      });
    });

    // 3. Cálculo de MRP e Projeção
    const mrpResult = Object.keys(materialData).map(plate => {
      const data = materialData[plate];
      const demandM1 = data.totalDemand;
      
      const demandM2 = demandM1; 
      const demandM3 = demandM1; 

      const stockItem = stockItems.find(s => s.material === plate);
      const currentStock = stockItem ? stockItem.qty : 0;

      // Cálculo de Saldos
      const balanceM1 = currentStock - demandM1;
      const surplusM1 = balanceM1 > 0 ? balanceM1 : 0;
      const statusM1 = balanceM1 < 0 ? "CRITICAL" : "OK";

      const balanceM2 = surplusM1 - demandM2;
      const surplusM2 = balanceM2 > 0 ? balanceM2 : 0;
      const statusM2 = balanceM2 < 0 ? "WARNING" : "OK";

      const balanceM3 = surplusM2 - demandM3;
      const statusM3 = balanceM3 < 0 ? "WARNING" : "OK";

      let globalStatus = "OK";
      if (statusM1 === "CRITICAL") globalStatus = "URGENT";
      else if (statusM2 === "WARNING" || statusM3 === "WARNING") globalStatus = "ATTENTION";

      return { 
        plate, 
        currentStock,
        consumers: data.consumers.sort((a,b) => b.steelUsed - a.steelUsed),
        m1: { demand: demandM1, balance: balanceM1 },
        m2: { demand: demandM2, balance: balanceM2 },
        m3: { demand: demandM3, balance: balanceM3 },
        globalStatus
      };
    });

    mrpResult.sort((a, b) => {
      const score = { "URGENT": 3, "ATTENTION": 2, "OK": 1 };
      return score[b.globalStatus] - score[a.globalStatus];
    });

    const totalSteel = productionPlan.reduce((acc, curr) => acc + curr.steelDemand, 0);
    const criticalItems = mrpResult.filter(i => i.globalStatus === "URGENT").length;

    return { 
      productionPlan, mrpResult, totalSteel, criticalItems, effectiveTotalProduction
    };
  }, [calcMode, metaTotalInput, metaDailyInput, workDays, products, stockItems]);

  const bomSummary = useMemo(() => {
    const produtos = (Array.isArray(ESTRUTURA_ROOTS) ? ESTRUTURA_ROOTS : [])
      .map((code) => {
        const key = String(code ?? '').trim();
        const item = ESTRUTURA_ITEMS[key] || {};
        return {
          produto: key,
          desc: String(item.desc || ''),
          tp: String(item.tp || ''),
        };
      })
      .filter((p) => p.produto);

    const edgesByParent = buildEdgeMap();

    const produtoRows = produtos
      .map(p => ({
        produto: String(p.produto ?? ''),
        desc: String(p.desc ?? ''),
        bobinas: explodeBom(p.produto, edgesByParent),
        categoriaKey: String(categoryOverrides[String(p.produto ?? '')] ?? p.categoriaKey ?? '').trim()
      }))
      .filter(p => p.produto);


    const withQtyAndDemand = produtoRows.map(p => {
      const qty = Number(qtdPorProduto[p.produto] || 0);
      const totalKg = p.bobinas.reduce((acc, b) => acc + (Number(b.porUnidade || 0) * qty), 0);
      return { ...p, qty, totalKg };
    });

    const search = String(produtoSearch || '').trim().toLowerCase();
    const filteredProdutos = search
      ? withQtyAndDemand.filter(p =>
          p.produto.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search)
        )
      : withQtyAndDemand;

    const selected = withQtyAndDemand.filter(p => p.qty > 0);

    const selectedFiltered = search
      ? selected.filter(p =>
          p.produto.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search)
        )
      : selected;

    const byBobina = {};
    let totalUnits = 0;
    let totalKg = 0;

    selected.forEach(p => {
      totalUnits += p.qty;
      totalKg += p.totalKg;
      p.bobinas.forEach(b => {
        const cod = String(b.cod ?? '').trim();
        if (!cod) return;

        const porUnidade = Number(b.porUnidade || 0);
        const demandKg = porUnidade * p.qty;

        if (!byBobina[cod]) {
          byBobina[cod] = {
            cod,
            desc: String(b.desc ?? ''),
            totalKg: 0,
            consumers: []
          };
        }
        byBobina[cod].totalKg += demandKg;
        byBobina[cod].consumers.push({
          produto: p.produto,
          desc: p.desc,
          qty: p.qty,
          porUnidade,
          demandKg,
          nivelMp: b.nivelMp ?? null,
          nivelPi: b.nivelPi ?? null,
        });
      });
    });

    const bobinasAgg = Object.values(byBobina).sort((a, b) => b.totalKg - a.totalKg);
    return {
      produtoRows: withQtyAndDemand,
      filteredProdutos,
      selected,
      selectedFiltered,
      bobinasAgg,
      totalUnits,
      totalKg,
      uniqueBobinas: bobinasAgg.length
    };
  }, [produtoSearch, qtdPorProduto, categoryOverrides]);

  const carteiraMrpResult = useMemo(() => {
    if (bomSummary.bobinasAgg.length === 0) return [];

    const stockByMaterial = useEstoque0112
      ? new Map(Object.entries(estoque0112 || {}).map(([k, v]) => [String(k), Number(v || 0)]))
      : new Map((Array.isArray(stockItems) ? stockItems : []).map(s => [String(s.material ?? ''), Number(s.qty || 0)]));

    const result = bomSummary.bobinasAgg.map(b => {
      const cod = String(b.cod ?? '');
      const demandM1 = Number(b.totalKg || 0);
      const demandM2 = demandM1;
      const demandM3 = demandM1;

      const currentStock = stockByMaterial.get(cod) || 0;

      const balanceM1 = currentStock - demandM1;
      const surplusM1 = balanceM1 > 0 ? balanceM1 : 0;
      const statusM1 = balanceM1 < 0 ? "CRITICAL" : "OK";

      const balanceM2 = surplusM1 - demandM2;
      const surplusM2 = balanceM2 > 0 ? balanceM2 : 0;
      const statusM2 = balanceM2 < 0 ? "WARNING" : "OK";

      const balanceM3 = surplusM2 - demandM3;
      const statusM3 = balanceM3 < 0 ? "WARNING" : "OK";

      const consumers = (Array.isArray(b.consumers) ? b.consumers : []).map(c => ({
        name: `${String(c.produto ?? '').trim()} - ${String(c.desc ?? '').trim()}`.trim(),
        qtyProd: Number(c.qty || 0),
        steelUsed: Number(c.demandKg || 0),
      }));

      let globalStatus = "OK";
      if (statusM1 === "CRITICAL") globalStatus = "URGENT";
      else if (statusM2 === "WARNING" || statusM3 === "WARNING") globalStatus = "ATTENTION";

      return {
        plate: cod,
        desc: String(b.desc ?? ''),
        consumers,
        currentStock,
        m1: { demand: demandM1, balance: balanceM1 },
        m2: { demand: demandM2, balance: balanceM2 },
        m3: { demand: demandM3, balance: balanceM3 },
        globalStatus,
      };
    });

    result.sort((a, b) => {
      const score = { "URGENT": 3, "ATTENTION": 2, "OK": 1 };
      return score[b.globalStatus] - score[a.globalStatus];
    });

    return result;
  }, [bomSummary.bobinasAgg, estoque0112, stockItems, useEstoque0112]);

  // --- HELPERS ---
  const fmtNum = (n) => n.toLocaleString('pt-BR');
  const fmtKg = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const isBomTab = activeTab === 'bom';
  const produtosVisiveis = mostrarSomenteSelecionados ? bomSummary.selectedFiltered : bomSummary.filteredProdutos;
  const useCarteira = bomSummary.totalUnits > 0;
  const mrpItems = useCarteira ? carteiraMrpResult : simulation.mrpResult;

  const categoriasAgg = useMemo(() => {
    const groups = new Map();
    produtosVisiveis.forEach(p => {
      const categoriaKey = (p.categoriaKey || 'Sem categoria').trim() || 'Sem categoria';
      if (!groups.has(categoriaKey)) {
        groups.set(categoriaKey, { categoriaKey, totalKg: 0, totalUnits: 0, products: [] });
      }
      const g = groups.get(categoriaKey);
      g.totalKg += Number(p.totalKg || 0);
      g.totalUnits += Number(p.qty || 0);
      g.products.push(p);
    });

    return Array.from(groups.values())
      .filter(g => !mostrarSomenteSelecionados || g.totalUnits > 0)
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [produtosVisiveis, mostrarSomenteSelecionados]);

  const categoriaOptions = useMemo(() => {
    const set = new Set();
    (Array.isArray(bomSummary.produtoRows) ? bomSummary.produtoRows : []).forEach(p => {
      const key = String(p.categoriaKey || '').trim();
      if (key) set.add(key);
    });
    categoriasAgg.forEach(c => {
      const key = String(c.categoriaKey || '').trim();
      if (key) set.add(key);
    });
    set.add('Sem categoria');
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [bomSummary.produtoRows, categoriasAgg]);

  return (
    <div className="font-sans text-slate-600 bg-slate-50 rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-6xl mx-auto my-8">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-10 -translate-x-10"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
              <Truck size={28} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-indigo-200 text-sm font-medium">PCP & Gestão de Materiais</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
            <div className="px-3 border-r border-white/10">
               <label className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">Modo</label>
               <select 
                  value={calcMode} onChange={(e) => setCalcMode(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-indigo-300 transition-colors"
               >
                 <option value="monthly" className="text-slate-900">Meta Mensal</option>
                 <option value="daily" className="text-slate-900">Meta Diária</option>
               </select>
            </div>

            <div className="px-3 border-r border-white/10">
               <label className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">Volume</label>
               <input 
                 type="number"
                 value={calcMode === 'monthly' ? metaTotalInput : metaDailyInput}
                 onChange={(e) => calcMode === 'monthly' ? setMetaTotalInput(Number(e.target.value)) : setMetaDailyInput(Number(e.target.value))}
                 className="bg-transparent text-lg font-mono font-bold text-white w-24 outline-none border-b border-transparent focus:border-indigo-400 transition-all placeholder-white/50"
               />
            </div>

            <div className="px-3">
               <label className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">Dias</label>
               <input 
                 type="number" value={workDays} onChange={(e) => setWorkDays(Number(e.target.value))}
                 className="bg-transparent text-lg font-mono font-bold text-white w-12 text-center outline-none border-b border-transparent focus:border-indigo-400 transition-all"
               />
            </div>

            <button 
              onClick={handleSaveScenario}
              className={`ml-2 p-3 rounded-xl transition-all shadow-lg ${scenarioSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              {scenarioSaved ? <CheckCircle2 size={20}/> : <Save size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-8 bg-white">
        
        {/* KPI CARDS */}
        {useCarteira && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCardPremium 
              title="Produção Planejada" 
              value={fmtNum(bomSummary.totalUnits)}
              unit="unidades"
              icon={<Box size={24} />}
              gradient="from-blue-600 to-indigo-600"
              subtext="Total digitado"
            />
            <KpiCardPremium 
              title="Consumo de Bobinas" 
              value={fmtKg((bomSummary.totalKg || 0) / 1000)} 
              unit="Ton"
              icon={<Settings2 size={24} />}
              gradient="from-violet-600 to-purple-600"
              subtext="Necessidade bruta"
            />
            <KpiCardPremium 
              title="Itens de Bobina" 
              value={fmtNum(bomSummary.uniqueBobinas)}
              unit="diferentes"
              icon={<AlertTriangle size={24} />}
              gradient={bomSummary.uniqueBobinas > 0 ? "from-emerald-500 to-teal-500" : "from-slate-500 to-slate-600"}
              subtext="No cálculo atual"
            />
          </div>
        )}

        {!useCarteira && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCardPremium 
            title="Produção Projetada" 
            value={fmtNum(simulation.effectiveTotalProduction)}
            unit="carrinhos"
            icon={<Box size={24} />}
            gradient="from-blue-600 to-indigo-600"
            subtext="Volume total"
          />
          <KpiCardPremium 
            title="Consumo de Chapa" 
            value={fmtKg(simulation.totalSteel / 1000)} 
            unit="Ton"
            icon={<Settings2 size={24} />}
            gradient="from-violet-600 to-purple-600"
            subtext="Necessidade bruta"
          />
          <KpiCardPremium 
            title="Situação de Compra" 
            value={simulation.criticalItems === 0 ? "Estável" : `${simulation.criticalItems} Itens`}
            unit={simulation.criticalItems === 0 ? "Coberto" : "Críticos"}
            icon={<AlertTriangle size={24} />}
            gradient={simulation.criticalItems > 0 ? "from-red-500 to-orange-500" : "from-emerald-500 to-teal-500"}
            subtext="Baseado no estoque"
          />
        </div>
        )}

        {/* NAVEGAÇÃO */}
        <div>
          <div className="flex items-center gap-6 border-b border-slate-100 mb-6 overflow-x-auto">
             <TabButton active={activeTab === 'mrp'} onClick={() => setActiveTab('mrp')} label="Projeção & Estoque" icon={<History size={18} />} />
             <TabButton active={activeTab === 'pcp'} onClick={() => setActiveTab('pcp')} label="Mix de Modelos" icon={<Calendar size={18} />} />
             <TabButton active={activeTab === 'bom'} onClick={() => setActiveTab('bom')} label="Por Produto" icon={<Package size={18} />} />
             <TabButton active={activeTab === 'coils'} onClick={() => setActiveTab('coils')} label="Bobinas" icon={<Scroll size={18} />} />
             <TabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} label="Gráficos" icon={<BarChart3 size={18} />} />
          </div>

          <div className="min-h-[400px] animate-in fade-in duration-500">
             
             {/* LISTA DE MRP COM DRILL-DOWN */}
             {activeTab === 'mrp' && (
               <div className="grid grid-cols-1 gap-4">
                 <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2 gap-4">
                    <div className="flex items-center gap-2 text-blue-800 text-sm font-bold">
                        <AlertCircle size={18} />
                        Dica: Digite o "Estoque Atual" para ver o saldo líquido projetado.
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <input
                        ref={estoque0112InputRef}
                        type="file"
                        accept=".csv,.txt,.xlsx,.xls"
                        onChange={handleEstoque0112Picked}
                        className="hidden"
                      />
                      <button
                        onClick={() => estoque0112InputRef.current?.click()}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 transition-colors"
                      >
                        Subir estoque 01/12
                      </button>
                      <label className="flex items-center gap-2 text-xs font-bold text-blue-700 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={useEstoque0112}
                          onChange={(e) => setUseEstoque0112(e.target.checked)}
                          className="accent-blue-600"
                        />
                        Usar estoque 01/12
                      </label>
                      {estoque0112Resumo?.error ? (
                        <span className="text-xs font-bold text-red-600">{estoque0112Resumo.error}</span>
                      ) : estoque0112Resumo ? (
                        <span className="text-xs text-blue-700/80">{fmtNum(estoque0112Resumo.items)} itens</span>
                      ) : null}
                    </div>
                 </div>

                 {mrpItems.map((item, idx) => (
                   <div 
                     key={idx} 
                     className={`flex flex-col p-5 rounded-2xl border transition-all hover:shadow-md 
                        ${item.globalStatus === 'URGENT' ? 'bg-red-50/40 border-red-200' : 
                          item.globalStatus === 'ATTENTION' ? 'bg-amber-50/40 border-amber-200' : 
                          'bg-white border-slate-100'}`}
                   >
                     {/* Header do Item */}
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(item.plate)}>
                            <div className={`p-3 rounded-xl ${
                                item.globalStatus === 'URGENT' ? 'bg-red-100 text-red-600' : 
                                item.globalStatus === 'ATTENTION' ? 'bg-amber-100 text-amber-600' : 
                                'bg-slate-100 text-slate-500'
                            }`}>
                                <Package size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                                    {item.plate}
                                    {expandedItems[item.plate] ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    {item.consumers.length} Produtos consomem
                                </p>
                                <div className="text-[11px] flex items-center gap-2 text-slate-500 mt-1">
                                  <span>Saldo atual:</span>
                                  <span className="font-mono text-slate-700">{fmtKg(Math.max(item.currentStock || 0, 0))} kg</span>
                                </div>
                                {useCarteira && item.desc && (
                                  <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Input de Estoque */}
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                <label className="text-xs font-bold text-slate-400 uppercase px-2">Estoque (kg):</label>
                                <input 
                                    type="number" 
                                    value={useEstoque0112 ? (estoque0112[item.plate] ?? 0) : item.currentStock}
                                    onChange={(e) => useEstoque0112 ? handleEstoque0112Change(item.plate, e.target.value) : handleStockChange(item.plate, e.target.value)}
                                    className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-right font-mono font-bold text-indigo-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                     </div>

                     {/* Drill-down (Quem consome?) */}
                     {expandedItems[item.plate] && (
                        <div className="mb-6 bg-slate-50/80 rounded-xl p-4 border border-slate-100 animate-in slide-in-from-top-2">
                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <TrendingUp size={14}/> Detalhamento de Consumo
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.consumers.map((cons, cIdx) => (
                                    <div key={cIdx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-slate-100">
                                        <span className="text-slate-700 font-medium truncate pr-2" title={cons.name}>{cons.name}</span>
                                        <div className="text-right">
                                            <div className="font-mono text-xs text-slate-500">{fmtKg(cons.steelUsed)}</div>
                                            <div className="text-[10px] text-slate-400">{fmtNum(cons.qtyProd)} un</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}

                     {/* Timeline de Projeção */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TimelineCard 
                            title="Mês Atual" 
                            demand={item.m1.demand} 
                            balance={item.m1.balance} 
                            status={item.m1.balance < 0 ? 'critical' : 'ok'}
                            isCurrent={true}
                        />
                        <TimelineCard 
                            title="Mês Seguinte (+30d)" 
                            demand={item.m2.demand} 
                            balance={item.m2.balance} 
                            status={item.m2.balance < 0 ? 'warning' : 'ok'}
                            stockIncoming={item.m1.balance > 0}
                        />
                        <TimelineCard 
                            title="Mês Futuro (+60d)" 
                            demand={item.m3.demand} 
                            balance={item.m3.balance} 
                            status={item.m3.balance < 0 ? 'warning' : 'ok'}
                            stockIncoming={item.m2.balance > 0}
                        />
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {/* MANTER OUTRAS ABAS IGUAIS... */}
             {activeTab === 'pcp' && (
               useCarteira ? (
               <div className="space-y-4">
                 <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                   <div className="flex flex-col md:flex-row md:items-center gap-3">
                     <input
                       value={produtoSearch}
                       onChange={(e) => setProdutoSearch(e.target.value)}
                       placeholder="Buscar por código ou descrição..."
                       className="w-full md:w-96 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                     />
                     <label className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
                       <input
                         type="checkbox"
                         checked={mostrarSomenteSelecionados}
                         onChange={(e) => setMostrarSomenteSelecionados(e.target.checked)}
                         className="accent-indigo-600"
                       />
                       Mostrar só selecionados
                     </label>
                     <label className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
                       <input
                         type="checkbox"
                         checked={agruparPorCategoria}
                         onChange={(e) => setAgruparPorCategoria(e.target.checked)}
                         className="accent-indigo-600"
                       />
                       Agrupar por categoria
                     </label>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={handleSalvarCategoriasLocal}
                         className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${categorySaveOk ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                       >
                         {categorySaveOk ? 'Salvo' : 'Salvar categorias'}
                       </button>
                       <button
                         onClick={handleResetCategoriasLocal}
                         className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                       >
                         Reset
                       </button>
                     </div>
                   </div>
                   <div className="text-xs text-slate-500 font-bold">
                     Total: {fmtNum(bomSummary.totalUnits)} un • {fmtKg(bomSummary.totalKg)} kg
                   </div>
                 </div>

                 <datalist id="categoria-options">
                   {categoriaOptions.map((c) => (
                     <option key={c} value={c} />
                   ))}
                 </datalist>

                 {agruparPorCategoria ? (
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                     <div className="divide-y divide-slate-100">
                       {categoriasAgg.map((cat) => {
                         const catKey = `cat:${cat.categoriaKey}`;
                         const open = !!expandedItems[catKey];
                         return (
                           <div key={cat.categoriaKey} className="p-5">
                             <button
                               onClick={() => setExpandedItems(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                               className="w-full flex items-start justify-between gap-4 text-left"
                             >
                               <div className="min-w-0">
                                 <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                   <span className="truncate" title={cat.categoriaKey}>{cat.categoriaKey}</span>
                                   {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                 </div>
                                 <div className="text-xs text-slate-400 mt-1">{cat.products.length} produtos</div>
                               </div>
                               <div className="text-right shrink-0">
                                 <div className="font-mono font-bold text-indigo-700">{fmtKg(cat.totalKg)} kg</div>
                                 <div className="text-xs text-slate-400">{fmtNum(cat.totalUnits)} un</div>
                               </div>
                             </button>

                             {open && (
                               <div className="mt-4 bg-slate-50/70 border border-slate-100 rounded-xl overflow-hidden">
                                 <table className="w-full text-left border-collapse">
                                   <thead>
                                     <tr className="bg-white/60 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                                       <th className="p-4">Produto</th>
                                       <th className="p-4">Descrição</th>
                                       <th className="p-4 w-56">Categoria</th>
                                       <th className="p-4 text-right w-40">Qtd</th>
                                       <th className="p-4 text-right w-40">Consumo</th>
                                     </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                     {cat.products
                                       .slice()
                                       .sort((a, b) => (Number(b.totalKg || 0) - Number(a.totalKg || 0)))
                                       .map((p) => (
                                         <tr key={p.produto} className="hover:bg-white transition-colors">
                                           <td className="p-4">
                                             <div className="font-mono font-bold text-slate-700">{p.produto}</div>
                                           </td>
                                           <td className="p-4">
                                             <div className="text-sm font-medium text-slate-700">{p.desc}</div>
                                             <div className="text-[11px] text-slate-400 mt-1">{p.bobinas.length} bobinas</div>
                                           </td>
                                           <td className="p-4">
                                             <input
                                               list="categoria-options"
                                               value={categoryOverrides[p.produto] ?? p.categoriaKey ?? ''}
                                               onChange={(e) => handleCategoriaProdutoChange(p.produto, e.target.value)}
                                               className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                               placeholder="Sem categoria"
                                             />
                                           </td>
                                           <td className="p-4 text-right">
                                             <input
                                               type="number"
                                               min="0"
                                               step="1"
                                               value={qtdPorProduto[p.produto] ?? ''}
                                               onChange={(e) => handleQtdProdutoChange(p.produto, e.target.value)}
                                               className="w-28 text-right font-mono font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                               placeholder="0"
                                             />
                                           </td>
                                           <td className="p-4 text-right">
                                             <div className="font-mono font-bold text-slate-700">{fmtKg(p.totalKg || 0)} kg</div>
                                           </td>
                                         </tr>
                                       ))}
                                   </tbody>
                                 </table>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ) : (
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                           <th className="p-5">Produto</th>
                           <th className="p-5">Descrição</th>
                           <th className="p-5 w-56">Categoria</th>
                           <th className="p-5 text-right w-40">Qtd. Carteira</th>
                           <th className="p-5 text-right w-48">Consumo (kg)</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {produtosVisiveis.slice(0, 200).map((p) => (
                           <tr key={p.produto} className="hover:bg-slate-50/80 transition-colors">
                             <td className="p-5">
                               <div className="font-mono font-bold text-slate-700">{p.produto}</div>
                             </td>
                             <td className="p-5">
                               <div className="font-bold text-slate-700 text-sm">{p.desc}</div>
                               <div className="text-xs text-slate-400 mt-1">{p.bobinas.length} bobinas no BOM</div>
                             </td>
                             <td className="p-5">
                               <input
                                 list="categoria-options"
                                 value={categoryOverrides[p.produto] ?? p.categoriaKey ?? ''}
                                 onChange={(e) => handleCategoriaProdutoChange(p.produto, e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                 placeholder="Sem categoria"
                               />
                             </td>
                             <td className="p-5 text-right">
                               <input
                                 type="number"
                                 min="0"
                                 step="1"
                                 value={qtdPorProduto[p.produto] ?? ''}
                                 onChange={(e) => handleQtdProdutoChange(p.produto, e.target.value)}
                                 className="w-32 text-right font-mono font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                 placeholder="0"
                               />
                             </td>
                             <td className="p-5 text-right">
                               <div className="font-mono font-bold text-slate-700">{fmtKg(p.totalKg || 0)}</div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
               ) : (
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                       <th className="p-5">Modelo de Carrinho</th>
                       <th className="p-5 text-center w-32">Mix %</th>
                       <th className="p-5 text-right">Qtd. Plan.</th>
                       <th className="p-5 text-right">Demanda Aço</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {simulation.productionPlan.map((item) => (
                       <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                         <td className="p-5">
                           <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{item.name}</div>
                           <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                             <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">{item.plate}</span>
                             <span>• {item.weight} kg/un</span>
                           </div>
                         </td>
                         <td className="p-5 text-center">
                           <div className="relative inline-block">
                             <input 
                               type="number"
                               step="0.1"
                               value={item.mix}
                               onChange={(e) => handleMixChange(item.id, e.target.value)}
                               className="w-20 text-center font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-lg py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:outline-none transition-all"
                             />
                             <span className="absolute right-2 top-2 text-[10px] text-indigo-300 pointer-events-none">%</span>
                           </div>
                         </td>
                         <td className="p-5 text-right">
                           <div className="font-mono font-bold text-slate-700">{fmtNum(item.quantity)}</div>
                         </td>
                         <td className="p-5 text-right">
                           <div className="font-mono text-slate-500">{fmtKg(item.steelDemand)} <span className="text-xs text-slate-300">kg</span></div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               )
             )}

             {activeTab === 'bom' && (
               <div className="space-y-6">
                 <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-indigo-800 font-bold">
                     <Package size={18} />
                     <span>Cálculo por Produto (BOM) — </span>
                     <span className="font-mono">bobinas_por_produto.json</span>
                     <span> v{String(ESTRUTURA_DATA?.meta?.generated_at || '')}</span>
                   </div>
                   <div className="text-sm text-indigo-700/80">
                     Base: consumo <span className="font-mono">porUnidade</span> × quantidade planejada por produto.
                   </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                     <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                       <div className="flex items-center justify-between gap-3">
                         <div>
                           <div className="font-bold text-slate-700">Produtos</div>
                           <div className="text-xs text-slate-400">
                             {mostrarSomenteSelecionados ? `${bomSummary.selected.length} selecionados` : `${bomSummary.produtoRows.length} no arquivo`}
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <input
                             ref={carteiraInputRef}
                             type="file"
                             accept=".csv,.txt,.xlsx,.xls"
                             onChange={handleCarteiraFilePicked}
                             className="hidden"
                           />
                           <button
                             onClick={() => carteiraInputRef.current?.click()}
                             className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                           >
                             Subir carteira
                           </button>
                           <button
                             onClick={handleDownloadCarteiraModelo}
                             className="px-3 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                           >
                             Baixar modelo
                           </button>
                           <button
                             onClick={() => setQtdPorProduto({})}
                             className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                           >
                             Limpar quantidades
                           </button>
                         </div>
                       </div>

                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                         <label className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
                           <input
                             type="checkbox"
                             checked={importSomarAoExistente}
                             onChange={(e) => setImportSomarAoExistente(e.target.checked)}
                             className="accent-emerald-600"
                           />
                           Somar ao existente
                         </label>

                         {importResumo?.error ? (
                           <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                             {importResumo.error}
                           </div>
                         ) : importResumo ? (
                           <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                             Importado: {fmtNum(importResumo.importedProducts)} produtos ({fmtNum(importResumo.totalLines)} linhas) • Desconhecidos: {fmtNum(importResumo.unknownProducts)} • Modo: {importResumo.mode}
                           </div>
                         ) : null}
                       </div>

                       <div className="flex flex-col md:flex-row gap-3 md:items-center">
                         <input
                           value={produtoSearch}
                           onChange={(e) => setProdutoSearch(e.target.value)}
                           placeholder="Buscar por código ou descrição..."
                           className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                         />
                         <label className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
                           <input
                             type="checkbox"
                             checked={mostrarSomenteSelecionados}
                             onChange={(e) => setMostrarSomenteSelecionados(e.target.checked)}
                             className="accent-indigo-600"
                           />
                           Mostrar só selecionados
                         </label>
                       </div>

                       <div className="text-xs text-slate-400">
                         Mostrando {Math.min(produtosVisiveis.length, 80)} de {produtosVisiveis.length} (use a busca para filtrar)
                       </div>
                     </div>

                     <div className="max-h-[460px] overflow-auto">
                       <table className="w-full text-left border-collapse">
                         <thead>
                           <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
                             <th className="p-4">Produto</th>
                             <th className="p-4">Descrição</th>
                             <th className="p-4 text-right w-36">Qtd</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                           {produtosVisiveis.slice(0, 80).map((p) => (
                             <tr key={p.produto} className="hover:bg-slate-50/80 transition-colors">
                               <td className="p-4">
                                 <div className="font-mono font-bold text-slate-700">{p.produto}</div>
                               </td>
                               <td className="p-4">
                                 <div className="text-sm font-medium text-slate-600">{p.desc}</div>
                                 <div className="text-[11px] text-slate-400 mt-1">{p.bobinas.length} bobinas no BOM</div>
                               </td>
                               <td className="p-4 text-right">
                                 <input
                                   type="number"
                                   min="0"
                                   step="1"
                                   value={qtdPorProduto[p.produto] ?? ''}
                                   onChange={(e) => handleQtdProdutoChange(p.produto, e.target.value)}
                                   className="w-28 text-right font-mono font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
                                   placeholder="0"
                                 />
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>

                   <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                     <div className="p-5 border-b border-slate-100">
                       <div className="font-bold text-slate-700 flex items-center gap-2">
                         <Scroll size={18} className="text-indigo-500" />
                         Bobinas Necessárias (somatório)
                       </div>
                       <div className="text-xs text-slate-400 mt-1">
                         Estimativa de bobinas usa peso médio configurado na aba “Bobinas” ({fmtNum(avgCoilWeight)} kg).
                       </div>
                     </div>

                     {bomSummary.bobinasAgg.length === 0 ? (
                       <div className="p-6 text-sm text-slate-500">
                         Digite quantidades em produtos para calcular a demanda por bobina.
                       </div>
                     ) : (
                       <div className="divide-y divide-slate-100">
                         {bomSummary.bobinasAgg.map((b) => {
                           const coilsNeeded = avgCoilWeight > 0 ? Math.ceil((b.totalKg || 0) / avgCoilWeight) : 0;
                           return (
                             <div key={b.cod} className="p-5">
                               <button
                                 onClick={() => toggleExpand(b.cod)}
                                 className="w-full flex items-start justify-between gap-4 text-left"
                               >
                                 <div>
                                   <div className="font-bold text-slate-800 flex items-center gap-2">
                                     <span className="font-mono">{b.cod}</span>
                                     <span className="text-slate-600 font-medium">{b.desc}</span>
                                     {expandedItems[b.cod] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                   </div>
                                   <div className="text-xs text-slate-400 mt-1">{b.consumers.length} produtos consomem</div>
                                 </div>
                                 <div className="text-right shrink-0">
                                   <div className="font-mono font-bold text-indigo-700">{fmtKg(b.totalKg)} kg</div>
                                   <div className="text-xs text-slate-400">{fmtNum(coilsNeeded)} bobinas</div>
                                 </div>
                               </button>

                               {expandedItems[b.cod] && (
                                 <div className="mt-4 bg-slate-50/70 border border-slate-100 rounded-xl p-4">
                                   <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                     <TrendingUp size={14} /> Detalhamento por produto
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     {b.consumers
                                       .slice()
                                       .sort((x, y) => (y.demandKg || 0) - (x.demandKg || 0))
                                       .map((c) => (
                                         <div key={`${b.cod}-${c.produto}`} className="bg-white border border-slate-100 rounded-lg p-3 flex justify-between gap-3">
                                           <div className="min-w-0">
                                             <div className="font-mono font-bold text-slate-700">{c.produto}</div>
                                             <div className="text-xs text-slate-500 truncate" title={c.desc}>{c.desc}</div>
                                             <div className="text-[11px] text-slate-400 mt-1">{fmtNum(c.qty)} un - {fmtKg(c.porUnidade)} kg/un - PI N{c.nivelPi ?? "-"} - MP N{c.nivelMp ?? "-"}</div>
                                           </div>
                                           <div className="text-right">
                                             <div className="font-mono font-bold text-slate-700">{fmtKg(c.demandKg)} kg</div>
                                           </div>
                                         </div>
                                       ))}
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'coils' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <div>
                           <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <Scroll size={22} className="text-indigo-500"/>
                            Cálculo de Bobinas
                           </h4>
                           <p className="text-sm text-slate-500">Estimativa baseada na necessidade líquida do mês atual.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Peso Médio (kg):</label>
                            <input 
                                type="number" 
                                value={avgCoilWeight}
                                onChange={(e) => setAvgCoilWeight(Number(e.target.value))}
                                className="w-28 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-indigo-700 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mrpItems.map((item, idx) => {
                            const balanceM1 = item.m1.balance;
                            const coilsNeeded = balanceM1 < 0 ? Math.ceil(Math.abs(balanceM1) / avgCoilWeight) : 0;
                            const weightNeeded = Math.abs(balanceM1);

                            return (
                            <div key={idx} className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-lg ${balanceM1 < 0 ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 bg-white opacity-60'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-800 text-xl">{item.plate}</div>
                                      {useCarteira && item.desc && (
                                        <div className="text-xs text-slate-500 mt-1 truncate" title={item.desc}>{item.desc}</div>
                                      )}
                                    </div>
                                    {balanceM1 < 0 ? (
                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Comprar</span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">OK</span>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm border-t border-b border-dashed border-slate-200 py-3">
                                    <div>
                                        <div className="text-[10px] uppercase text-slate-400 font-bold">Falta (Mês Atual)</div>
                                        <div className={`font-mono font-bold ${balanceM1 < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {balanceM1 < 0 ? fmtKg(weightNeeded) : '0,0'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                         <div className="text-[10px] uppercase text-slate-400 font-bold">Bobinas</div>
                                         <div className={`text-xl font-bold tracking-tighter ${balanceM1 < 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            {coilsNeeded}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })}
                    </div>
                </div>
             )}

             {activeTab === 'charts' && (
                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-500"/>
                      {useCarteira ? 'Consumo por Produto (Top 10)' : 'Volume por Modelo (Top 5)'}
                    </h4>
                    <div className="space-y-5">
                      {(useCarteira
                        ? bomSummary.selected
                            .slice()
                            .sort((a, b) => (b.totalKg || 0) - (a.totalKg || 0))
                            .slice(0, 10)
                            .map(p => ({
                              key: p.produto,
                              label: `${p.produto} - ${p.desc}`,
                              value: Number(p.totalKg || 0),
                              suffix: 'kg',
                              pctBase: Number(bomSummary.totalKg || 0) || 1
                            }))
                        : simulation.productionPlan
                            .slice()
                            .sort((a, b) => b.quantity - a.quantity)
                            .slice(0, 5)
                            .map(item => ({
                              key: item.id,
                              label: item.name,
                              value: Number(item.quantity || 0),
                              suffix: 'un',
                              pctBase: Number(simulation.effectiveTotalProduction || 0) || 1
                            }))
                      ).map((row, idx) => (
                        <div key={idx} className="group">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate pr-4" title={row.label}>{row.label}</span>
                            <span className="font-mono font-bold text-slate-400">{useCarteira ? fmtKg(row.value) : fmtNum(row.value)} {row.suffix}</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full group-hover:from-indigo-400 group-hover:to-blue-400 transition-all duration-500 shadow-sm"
                              style={{ width: `${Math.min(100, (row.value / row.pctBase) * 100 * 1.2)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {useCarteira && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Scroll size={20} className="text-indigo-500"/>
                        Consumo por Bobina (Top 10)
                      </h4>
                      <div className="space-y-5">
                        {bomSummary.bobinasAgg.slice(0, 10).map((b) => (
                          <div key={b.cod} className="group">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate pr-4" title={`${b.cod} - ${b.desc}`}>{b.cod} - {b.desc}</span>
                              <span className="font-mono font-bold text-slate-400">{fmtKg(b.totalKg)} kg</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full group-hover:from-violet-400 group-hover:to-purple-400 transition-all duration-500 shadow-sm"
                                style={{ width: `${Math.min(100, (Number(b.totalKg || 0) / (Number(bomSummary.totalKg || 0) || 1)) * 100 * 1.2)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {useCarteira && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Package size={20} className="text-indigo-500"/>
                        Consumo por Categoria (Top 10)
                      </h4>
                      <div className="space-y-5">
                        {categoriasAgg.slice(0, 10).map((cat) => (
                          <div key={cat.categoriaKey} className="group">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-bold text-slate-600 group-hover:text-indigo-600 transition-colors truncate pr-4" title={cat.categoriaKey}>{cat.categoriaKey}</span>
                              <span className="font-mono font-bold text-slate-400">{fmtKg(cat.totalKg)} kg</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full group-hover:from-emerald-400 group-hover:to-teal-400 transition-all duration-500 shadow-sm"
                                style={{ width: `${Math.min(100, (Number(cat.totalKg || 0) / (Number(bomSummary.totalKg || 0) || 1)) * 100 * 1.2)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function TimelineCard({ title, demand, balance, status, isCurrent, stockIncoming }) {
    const fmtKg = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    
    let bgClass = "bg-slate-50 border-slate-100";
    let textClass = "text-slate-500";
    let balanceClass = "text-slate-600";

    if (status === 'critical') {
        bgClass = "bg-red-50 border-red-200";
        textClass = "text-red-600";
        balanceClass = "text-red-700";
    } else if (status === 'warning') {
        bgClass = "bg-amber-50 border-amber-200";
        textClass = "text-amber-600";
        balanceClass = "text-amber-700";
    } else if (status === 'ok') {
        bgClass = "bg-emerald-50 border-emerald-100";
        textClass = "text-emerald-600";
        balanceClass = "text-emerald-700";
    }

    return (
        <div className={`p-4 rounded-xl border ${bgClass} relative`}>
            {isCurrent && (
                <span className="absolute -top-2 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    AGORA
                </span>
            )}
            <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${textClass}`}>{title}</span>
                {status === 'critical' && <AlertCircle size={14} className="text-red-500" />}
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Demanda:</span>
                    <span className="font-mono">{fmtKg(demand)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200/50 pt-1 mt-1">
                    <span className={balanceClass}>{balance < 0 ? 'Falta:' : 'Sobra:'}</span>
                    <span className={`font-mono ${balanceClass}`}>{fmtKg(Math.abs(balance))}</span>
                </div>
            </div>
        </div>
    );
}

function KpiCardPremium({ title, value, unit, icon, gradient, subtext }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} text-white shadow-lg shadow-indigo-200/50 group`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform duration-500">
        <Package size={80} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">{icon}</div>
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
           <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
           <span className="text-sm font-medium text-white/70">{unit}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-white/60">
           <ArrowRight size={12} /> {subtext}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-1 pb-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${active ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-200'}`}>
      {icon} {label}
    </button>
  );
}
