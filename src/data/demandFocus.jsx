import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import bobinasPorProdutoData from './bobinas_por_produto.json';
import estruturaData from './estrutura_mp_pi_pa.json';

const parseQty = (value) => {
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
  // Detect formato brasileiro de milhar (27.000) e limpar pontos se não houver decimal
  if (!hasComma && hasDot) {
    const thousandPattern = /^\d{1,3}(\.\d{3})+$/;
    if (thousandPattern.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    }
  }
  normalized = normalized.replace(/\s/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const detectDelimiter = (headerLine) => {
  const candidates = [',', ';', '\t'];
  return candidates
    .map((sep) => ({ sep, count: headerLine.split(sep).length }))
    .sort((a, b) => b.count - a.count)[0].sep;
};

const handleDownloadModelo = () => {
  const csv = ['produto,quantidade', '00107,1000', '02613,500'];
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_carteira_demanda.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const parseCsvText = (text) => {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const sep = detectDelimiter(headerLine);
  const headers = headerLine.split(sep).map((h) => h.trim().toLowerCase());
  const findIndex = (names) => headers.findIndex((h) => names.includes(h));
  const produtoIdx = findIndex(['produto', 'codigo', 'código', 'cod', 'item']);
  const qtdIdx = findIndex(['quantidade', 'qtd', 'qtde', 'demanda']);
  if (produtoIdx < 0 || qtdIdx < 0) return [];
  return lines.slice(1).map((line) => {
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
  const header = data[0].map((value) => String(value || '').trim().toLowerCase());
  const findIndex = (names) => header.findIndex((h) => names.includes(h));
  const produtoIdx = findIndex(['produto', 'codigo', 'código', 'cod', 'item']);
  const qtdIdx = findIndex(['quantidade', 'qtd', 'qtde', 'demanda']);
  if (produtoIdx < 0 || qtdIdx < 0) return [];
  return data.slice(1).map((row) => ({ produto: row[produtoIdx], quantidade: row[qtdIdx] }));
};

const aggregateRows = (rows) => {
  const result = {};
  const stats = { total: rows.length, rowsCounted: 0, invalidProduto: 0, invalidQty: 0 };
  rows.forEach((row) => {
    const produto = String(row.produto ?? '').trim();
    const qtd = Math.round(parseQty(row.quantidade));
    if (!produto) {
      stats.invalidProduto += 1;
      return;
    }
    if (!(qtd > 0)) {
      stats.invalidQty += 1;
      return;
    }
    result[produto] = (result[produto] || 0) + qtd;
    stats.rowsCounted += 1;
  });
  return { aggregated: result, stats };
};

const tabOptions = [
  { id: 'produtos', title: 'Produtos', description: 'Componentes agrupados por código.' },
  { id: 'bobinas', title: 'Bobinas', description: 'Consumo por bobina e necessidades.' },
  { id: 'componentes', title: 'Itens & Componentes', description: 'Itens pai com seus componentes e bobinas.' },
];

const screenOptions = [
  { id: 'grupos', title: 'Grupos' },
  { id: 'tabela', title: 'Tabela geral' },
];

const ESTRUTURA_EDGES = Array.isArray(estruturaData?.edges) ? estruturaData.edges : [];
const ESTRUTURA_ITEMS = estruturaData?.items || {};
const buildEdgeMap = (edges) => {
  const byParent = new Map();
  edges.forEach((edge) => {
    const parent = String(edge?.parent ?? '').trim();
    if (!parent) return;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(edge);
  });
  return byParent;
};

const collectMpEdges = (rootCode, edgesByParent) => {
  const root = String(rootCode ?? '').trim();
  if (!root) return [];
  const result = [];
  const stack = [root];
  const visited = new Set();
  while (stack.length > 0) {
    const code = stack.pop();
    if (!code) continue;
    if (visited.has(code)) continue;
    visited.add(code);
    const edges = edgesByParent.get(code) || [];
    edges.forEach((edge) => {
      const child = String(edge?.child ?? '').trim();
      if (!child) return;
      const tp = String(edge?.tp ?? '').trim().toUpperCase();
      if (tp === 'MP') {
        result.push(edge);
        return;
      }
      if (tp === 'PA' || tp === 'PI') {
        stack.push(child);
      }
    });
  }
  return result;
};

const aggregateMpEdges = (edges) => {
  const map = new Map();
  edges.forEach((edge) => {
    const child = String(edge?.child ?? '').trim();
    if (!child) return;
    const key = child;
    if (!map.has(key)) {
      map.set(key, { ...edge });
      return;
    }
    const current = map.get(key);
    current.qtdNec = Number(current.qtdNec || 0) + Number(edge?.qtdNec || 0);
    const currentNivel = Number(current.nivel || 0);
    const nextNivel = Number(edge?.nivel || 0);
    if (nextNivel > currentNivel) current.nivel = nextNivel;
  });
  return Array.from(map.values());
};

const getItemDesc = (code) => {
  const key = String(code ?? '').trim();
  if (!key) return '';
  return ESTRUTURA_ITEMS?.[key]?.desc || '';
};

const DemandFocus = () => {
  const [qtdPorProduto, setQtdPorProduto] = useState({});
  const [importResumo, setImportResumo] = useState(null);
  const [mostrarSelecionados, setMostrarSelecionados] = useState(true);
  const [categoriaOverrides, setCategoriaOverrides] = useState({});
  const [viewMode, setViewMode] = useState('produtos');
  const [screenMode, setScreenMode] = useState('grupos');
  const [planMode, setPlanMode] = useState('carteira');
  const [categoriasAbertas, setCategoriasAbertas] = useState(new Set());
  const [categoriaGrupoDrafts, setCategoriaGrupoDrafts] = useState({});
  const [producaoPorProduto, setProducaoPorProduto] = useState({});
  const [motherStock, setMotherStock] = useState({ byCode: {}, totalKg: 0 });
  const [metaDiaria, setMetaDiaria] = useState(3300);
  const [diasUteis, setDiasUteis] = useState(20);
  const [filtroProgresso, setFiltroProgresso] = useState('todos'); // todos | pendentes | concluídos
  const [filtroEstoqueFaltante, setFiltroEstoqueFaltante] = useState(false);
  const applySugestaoItem = (produto, extra) => {
    const inc = Math.max(0, Math.round(extra || 0));
    if (!inc) return;
    setQtdPorProduto((prev) => ({
      ...prev,
      [produto]: Math.max(0, Math.round(parseQty(prev[produto] ?? 0) + inc)),
    }));
  };
  const carteiraRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('motherCoils');
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const byCode = {};
      let totalKg = 0;
      list.forEach((coil) => {
        const status = String(coil?.status || '').toLowerCase();
        if (status && status !== 'stock') return;
        const code = String(coil?.code || coil?.motherCode || '').trim();
        const weight = Number(coil?.remainingWeight ?? coil?.weight ?? coil?.initialWeight ?? 0) || 0;
        if (!code || weight <= 0) return;
        byCode[code] = (byCode[code] || 0) + weight;
        totalKg += weight;
      });
      setMotherStock({ byCode, totalKg });
    } catch (err) {
      setMotherStock({ byCode: {}, totalKg: 0 });
    }
  }, []);

  const produtos = useMemo(() => {
    const list = Array.isArray(bobinasPorProdutoData?.produtos) ? bobinasPorProdutoData.produtos : [];
    return list.map((item) => ({
      ...item,
      categoriaKey: String(item.categoriaKey ?? item.categoria?.categoriaKey ?? 'Sem categoria').trim(),
    }));
  }, []);

  const bomSummary = useMemo(() => {
    const enriched = produtos.map((item) => {
      const demanded = Number(qtdPorProduto[item.produto] || 0);
      const producedRaw = Number(producaoPorProduto[item.produto] || 0);
      const produced = Number.isFinite(producedRaw) ? Math.max(0, Math.round(producedRaw)) : 0;
      const qty = Math.max(demanded - produced, 0);
      const totalKg = item.bobinas.reduce((acc, bobina) => acc + Number(bobina.porUnidade || 0) * qty, 0);
      const categoriaKey = categoriaOverrides[item.produto] || item.categoriaKey || 'Sem categoria';
      return { ...item, qty, demanded, produced, totalKg, categoriaKey };
    });
    const selected = enriched.filter((item) => item.qty > 0);
    const bobinasAgg = selected.reduce((acc, item) => {
      item.bobinas.forEach((bobina) => {
        const cod = String(bobina.cod ?? '').trim();
        if (!cod) return;
        if (!acc[cod]) {
          acc[cod] = { cod, desc: bobina.desc, totalKg: 0 };
        }
        acc[cod].totalKg += Number(bobina.porUnidade || 0) * item.qty;
      });
      return acc;
    }, {});

    const categoriasAgg = selected.reduce((acc, item) => {
      const key = item.categoriaKey || 'Sem categoria';
      if (!acc[key]) {
        acc[key] = { categoriaKey: key, totalKg: 0, products: 0 };
      }
      acc[key].totalKg += item.totalKg;
      acc[key].products += 1;
      return acc;
    }, {});

    return {
      produtoRows: enriched,
      selected,
      bobinasAgg: Object.values(bobinasAgg).sort((a, b) => b.totalKg - a.totalKg),
      categoriasAgg: Object.values(categoriasAgg).sort((a, b) => b.totalKg - a.totalKg),
      totalUnits: selected.reduce((sum, item) => sum + item.qty, 0),
      totalKg: selected.reduce((sum, item) => sum + item.totalKg, 0),
      totalDemanded: enriched.reduce((sum, item) => sum + item.demanded, 0),
      totalProduced: enriched.reduce((sum, item) => sum + Math.min(item.produced, item.demanded), 0),
    };
  }, [produtos, qtdPorProduto, categoriaOverrides, producaoPorProduto]);

  const metaMensal = Math.max(0, metaDiaria * diasUteis);
  const totalDemandado = bomSummary.totalDemanded || 0;
  const totalProduzido = bomSummary.totalProduced || 0;

  const getEstoquePorBobina = (code) => motherStock.byCode?.[String(code || '').trim()] || 0;

  const extraCapacidade = useMemo(() => {
    const extra = Math.max(0, metaMensal - totalDemandado);
    if (extra <= 0 || totalDemandado <= 0) return { byProd: {}, totalExtra: 0 };
    const items = bomSummary.produtoRows.filter((it) => (it.demanded || 0) > 0);
    const shares = items.map((it) => ({
      produto: it.produto,
      share: (it.demanded || 0) / totalDemandado,
    }));
    let allocated = 0;
    const byProd = {};
    shares.forEach((s) => {
      const base = Math.floor(extra * s.share);
      byProd[s.produto] = base;
      allocated += base;
    });
    let remainder = extra - allocated;
    shares
      .slice()
      .sort((a, b) => b.share - a.share)
      .forEach((s) => {
        if (remainder > 0) {
          byProd[s.produto] += 1;
          remainder -= 1;
        }
      });
    return { byProd, totalExtra: extra };
  }, [metaMensal, totalDemandado, bomSummary.produtoRows]);

  const pmpSummary = useMemo(() => {
    const enriched = produtos.map((item) => {
      const demanded = Number(qtdPorProduto[item.produto] || 0);
      const producedRaw = Number(producaoPorProduto[item.produto] || 0);
      const produced = Number.isFinite(producedRaw) ? Math.max(0, Math.round(producedRaw)) : 0;
      const extra = Number(extraCapacidade.byProd?.[item.produto] || 0);
      const pmpDemanded = demanded + extra;
      const qty = Math.max(pmpDemanded - produced, 0);
      const totalKg = item.bobinas.reduce((acc, bobina) => acc + Number(bobina.porUnidade || 0) * qty, 0);
      const categoriaKey = categoriaOverrides[item.produto] || item.categoriaKey || 'Sem categoria';
      return { ...item, qty, demanded: pmpDemanded, produced, totalKg, categoriaKey };
    });
    const selected = enriched.filter((item) => item.qty > 0 || item.demanded > 0);
    const bobinasAgg = selected.reduce((acc, item) => {
      item.bobinas.forEach((bobina) => {
        const cod = String(bobina.cod ?? '').trim();
        if (!cod) return;
        if (!acc[cod]) {
          acc[cod] = { cod, desc: bobina.desc, totalKg: 0 };
        }
        acc[cod].totalKg += Number(bobina.porUnidade || 0) * item.qty;
      });
      return acc;
    }, {});

    const categoriasAgg = selected.reduce((acc, item) => {
      const key = item.categoriaKey || 'Sem categoria';
      if (!acc[key]) {
        acc[key] = { categoriaKey: key, totalKg: 0, products: 0 };
      }
      acc[key].totalKg += item.totalKg;
      acc[key].products += 1;
      return acc;
    }, {});

    return {
      produtoRows: enriched,
      selected,
      bobinasAgg: Object.values(bobinasAgg).sort((a, b) => b.totalKg - a.totalKg),
      categoriasAgg: Object.values(categoriasAgg).sort((a, b) => b.totalKg - a.totalKg),
      totalUnits: selected.reduce((sum, item) => sum + item.qty, 0),
      totalKg: selected.reduce((sum, item) => sum + item.totalKg, 0),
      totalDemanded: enriched.reduce((sum, item) => sum + item.demanded, 0),
      totalProduced: enriched.reduce((sum, item) => sum + Math.min(item.produced, item.demanded), 0),
    };
  }, [produtos, qtdPorProduto, producaoPorProduto, categoriaOverrides, extraCapacidade.byProd]);

  const demandaBase = planMode === 'pmp' ? pmpSummary.totalUnits : bomSummary.totalUnits;
  const faltaProduzir = Math.max(0, demandaBase - metaMensal);
  const sobraCapacidade = Math.max(0, metaMensal - demandaBase);
  const diasNecessarios = metaDiaria > 0 ? Math.ceil(demandaBase / metaDiaria) : 0;

  const isPmp = planMode === 'pmp';
  const viewFactor = 1;
  const viewSummary = isPmp ? pmpSummary : bomSummary;
  const fmtUnits = (value) => {
    const scaled = Number(value || 0) * viewFactor;
    const rounded = isPmp ? Math.ceil(scaled) : Math.round(scaled);
    return fmtNum(rounded);
  };
  const fmtKgScaled = (value) => fmtKg(Number(value || 0) * viewFactor);
  const unitLabel = 'un';
  const kgLabel = 'kg';
  const produtosVisiveis = useMemo(() => {
    let list = viewSummary.produtoRows;
    if (mostrarSelecionados) {
      list = list.filter((item) => (item.demanded || 0) > 0 || (item.produced || 0) > 0);
    }
    if (filtroProgresso === 'pendentes') {
      list = list.filter((item) => item.qty > 0);
    } else if (filtroProgresso === 'concluidos') {
      list = list.filter((item) => item.qty <= 0);
    }
    return list;
  }, [viewSummary.produtoRows, viewSummary.totalDemanded, mostrarSelecionados, filtroProgresso]);
  const categoriaOptions = useMemo(() => {
    const set = new Set(produtos.map((p) => p.categoriaKey || 'Sem categoria'));
    set.add('Sem categoria');
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [produtos]);

  const produtosAgrupados = useMemo(() => {
    const map = new Map();
    produtosVisiveis.forEach((item) => {
      const key = item.categoriaKey || 'Sem categoria';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    const groups = Array.from(map.entries()).map(([categoria, items]) => ({
      categoria,
      items: items.slice().sort((a, b) => b.totalKg - a.totalKg),
    }));
    groups.sort((a, b) => {
      const totalA = a.items.reduce((sum, i) => sum + i.totalKg, 0);
      const totalB = b.items.reduce((sum, i) => sum + i.totalKg, 0);
      if (totalB !== totalA) return totalB - totalA;
      return a.categoria.localeCompare(b.categoria, 'pt-BR');
    });
    return groups;
  }, [produtosVisiveis]);

  const parentItems = useMemo(
    () => viewSummary.selected.slice().sort((a, b) => b.totalKg - a.totalKg),
    [viewSummary.selected],
  );
  const edgesByParent = useMemo(() => buildEdgeMap(ESTRUTURA_EDGES), []);
  const componentesAgrupados = useMemo(() => {
    const map = new Map();
    parentItems.forEach((item) => {
      const parentCode = String(item.produto ?? '').trim();
      const parentQty = Number(item.qty || 0);
      if (!parentCode || parentQty <= 0) return;
      const edges = edgesByParent.get(parentCode) || [];
      edges.forEach((edge) => {
        const child = String(edge?.child ?? '').trim();
        if (!child) return;
        const tp = String(edge?.tp ?? '').toUpperCase();
        if (!tp) return;
        const qtdNec = Number(edge?.qtdNec || 0) || 0;
        const needed = qtdNec * parentQty;
        if (!map.has(child)) {
          map.set(child, {
            code: child,
            desc: getItemDesc(child),
            tpSet: new Set(),
            umSet: new Set(),
            total: 0,
            nivel: Number(edge?.nivel || 0) || 0,
            parents: new Set(),
          });
        }
        const entry = map.get(child);
        entry.total += needed;
        if (tp) entry.tpSet.add(tp);
        if (edge?.um) entry.umSet.add(edge.um);
        const nivel = Number(edge?.nivel || 0) || 0;
        if (nivel > entry.nivel) entry.nivel = nivel;
        entry.parents.add(parentCode);
      });
    });
    return Array.from(map.values())
      .map((entry) => ({
        code: entry.code,
        desc: entry.desc,
        tipo: entry.tpSet.size > 1 ? 'MIX' : Array.from(entry.tpSet)[0] || '-',
        um: entry.umSet.size > 1 ? 'MIX' : Array.from(entry.umSet)[0] || '',
        total: entry.total,
        nivel: entry.nivel || '-',
        parents: entry.parents.size,
      }))
      .sort((a, b) => b.total - a.total);
  }, [parentItems, edgesByParent]);
  const estruturaByParent = useMemo(() => {
    if (!edgesByParent || edgesByParent.size === 0) return {};
    const result = {};
    parentItems.forEach((item) => {
      const parentCode = String(item.produto ?? '').trim();
      if (!parentCode) return;
      const edges = edgesByParent.get(parentCode) || [];
      const children = edges.filter((edge) => {
        const tp = String(edge?.tp ?? '').toUpperCase();
        return tp === 'PA' || tp === 'PI';
      });
      const directMps = edges.filter((edge) => String(edge?.tp ?? '').toUpperCase() === 'MP');
      result[parentCode] = {
        children: children.map((edge) => {
          const childCode = String(edge?.child ?? '').trim();
          const childMps = aggregateMpEdges(collectMpEdges(childCode, edgesByParent));
          return {
            edge,
            code: childCode,
            desc: getItemDesc(childCode),
            tp: String(edge?.tp ?? '').toUpperCase(),
            mps: childMps,
          };
        }),
        directMps: aggregateMpEdges(directMps),
      };
    });
    return result;
  }, [parentItems, edgesByParent]);

  const handleUpload = async (file) => {
    if (!file) return;
    let rows = [];
    const lower = String(file.name || '').toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      const text = await file.text();
      rows = parseCsvText(text);
    } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      rows = await parseXlsxFile(file);
    }
    if (rows.length === 0) {
      setImportResumo({ error: 'Arquivo inv lido. Use CSV/Excel com produto + quantidade.' });
      return;
    }
    const { aggregated, stats } = aggregateRows(rows);
    setQtdPorProduto(aggregated);
    setImportResumo({
      imported: Object.keys(aggregated).length,
      lines: rows.length,
      rowsCounted: stats.rowsCounted,
      invalidProduto: stats.invalidProduto,
      invalidQty: stats.invalidQty,
    });
  };

  const handleCategoriaChange = (produto, value) => {
    setCategoriaOverrides((prev) => ({ ...prev, [produto]: value }));
  };

  const handleCategoriaGrupoChange = (categoria, value) => {
    setCategoriaGrupoDrafts((prev) => ({ ...prev, [categoria]: value }));
  };

  const handleAplicarCategoriaGrupo = (categoria, novoValor) => {
    const target = String(novoValor || '').trim();
    if (!target) return;
    const grupo = produtosAgrupados.find((g) => g.categoria === categoria);
    if (!grupo) return;
    setCategoriaOverrides((prev) => {
      const next = { ...prev };
      grupo.items.forEach((item) => {
        next[item.produto] = target;
      });
      return next;
    });
  };

  const toggleCategoriaOpen = (categoria) => {
    setCategoriasAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(categoria)) {
        next.delete(categoria);
      } else {
        next.add(categoria);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0d152c] text-slate-100 py-5 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
        <div className="bg-[#0f1729] text-white rounded-3xl border border-white/5 p-5 sm:p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Carteira de demanda</h1>
                <span className="px-3 py-1 text-[11px] uppercase tracking-wide rounded-full bg-white/10 border border-white/10 text-slate-200">
                  Controle de producao
                </span>
              </div>
              <p className="text-sm text-slate-300 max-w-3xl">Suba o arquivo da carteira para ver o BOM por produto, bobina e categoria. Os totais aparecem por aqui mesmo.</p>
              {isPmp && (
                <p className="text-xs text-slate-400">PMP: valores distribuídos por dia usando a capacidade diária.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full bg-white/5 border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setPlanMode('carteira')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    planMode === 'carteira'
                      ? 'bg-[#2f6fed] text-white'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  Carteira
                </button>
                <button
                  type="button"
                  onClick={() => setPlanMode('pmp')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    planMode === 'pmp'
                      ? 'bg-[#2f6fed] text-white'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  PMP
                </button>
              </div>
              <button
                onClick={handleDownloadModelo}
                className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold shadow-lg shadow-indigo-900/40 transition"
              >
                Baixar modelo
              </button>
              <button
                onClick={() => carteiraRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white text-[#0f1729] text-sm font-semibold border border-white/30 hover:border-white/60 shadow-lg shadow-black/10 transition"
              >
                Subir carteira
              </button>
            </div>
          </div>
          {importResumo && (
            <div className={`rounded-2xl p-2 text-sm font-semibold border ${importResumo.error ? 'bg-rose-100/90 text-rose-800 border-rose-200/60' : 'bg-emerald-50 text-emerald-900 border-emerald-100/70'}`}>
              {importResumo.error ? (
                importResumo.error
              ) : (
                <div className="flex flex-col gap-1">
                  <span>Importado {fmtNum(importResumo.imported)} produtos ({fmtNum(importResumo.rowsCounted)} linhas válidas de {fmtNum(importResumo.lines)}).</span>
                  {(importResumo.invalidProduto > 0 || importResumo.invalidQty > 0) && (
                    <span className="text-xs font-normal text-slate-200">
                      Ignorado: {fmtNum(importResumo.invalidProduto)} linha(s) sem código + {fmtNum(importResumo.invalidQty)} linha(s) com quantidade inválida/zero.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Produtos ativos</p>
              <p className="text-3xl font-bold mt-1">{fmtUnits(viewSummary.totalUnits)} {unitLabel}</p>
              <p className="text-xs text-slate-300">Com quantidade positiva</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Consumo estimado</p>
              <p className="text-3xl font-bold mt-1">{fmtKgScaled(viewSummary.totalKg)} {kgLabel}</p>
              <p className="text-xs text-slate-300">Baseado no BOM por unidade</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Categorias</p>
              <p className="text-3xl font-bold mt-1">{fmtNum(viewSummary.categoriasAgg.length)} grupos</p>
              <p className="text-xs text-slate-300">Agrupadas por categoria atual</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Estoque de bobinas</p>
              <p className="text-3xl font-bold mt-1">{fmtKg(motherStock.totalKg)} kg</p>
              <p className="text-xs text-slate-300">Saldo atual em estoque (mãe)</p>
            </div>
            {!isPmp && (
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200 px-4 py-3 shadow-inner text-amber-800">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">Sugestão de produção</p>
              <p className="text-2xl font-semibold">
                {fmtUnits(Math.max(0, extraCapacidade.totalExtra))} {unitLabel}
              </p>
              <p className="text-xs text-amber-700">Produzir além da carteira para atingir a capacidade</p>
              </div>
            )}
          </div>
        </div>
        <input
          ref={carteiraRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          className="hidden"
        />
        <section className="bg-[#0f1729] rounded-3xl border border-white/10 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-5 text-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Planejamento mensal</h2>
              <p className="text-xs text-slate-300">Capacidade vs. demanda carregada.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 shadow-inner">
                <span className="font-semibold text-slate-200">Dias úteis</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diasUteis}
                  onChange={(e) => setDiasUteis(Math.max(1, parseQty(e.target.value)))}
                  className="w-16 text-right font-mono text-sm bg-[#0b1220] border border-white/10 rounded-full px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 text-slate-100"
                />
              </label>
              <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 shadow-inner">
                <span className="font-semibold text-slate-200">Capacidade diária</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={metaDiaria}
                  onChange={(e) => setMetaDiaria(Math.max(0, parseQty(e.target.value)))}
                  className="w-24 text-right font-mono text-sm bg-[#0b1220] border border-white/10 rounded-full px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 text-slate-100"
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">Meta diária</p>
              <p className="text-2xl font-semibold text-slate-100">{fmtNum(metaDiaria)} un</p>
              <p className="text-xs text-slate-300">Produção alvo por dia</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">Meta mensal</p>
              <p className="text-2xl font-semibold text-slate-100">{fmtNum(metaMensal)} un</p>
              <p className="text-xs text-slate-300">{fmtNum(diasUteis)} dias úteis</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">Demanda carregada</p>
              <p className="text-2xl font-semibold text-slate-100">{fmtUnits(viewSummary.totalDemanded)} {unitLabel}</p>
              <p className="text-xs text-slate-300">Subtotal da carteira</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">Produzido (informado)</p>
              <p className="text-2xl font-semibold text-slate-100">{fmtUnits(viewSummary.totalProduced)} {unitLabel}</p>
              <p className="text-xs text-slate-300">Abatido da demanda</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">{faltaProduzir > 0 ? 'Falta produzir' : 'Capacidade ociosa'}</p>
              <p className={`text-2xl font-semibold ${faltaProduzir > 0 ? 'text-rose-300' : 'text-emerald-200'}`}>
                {fmtUnits(faltaProduzir > 0 ? faltaProduzir : sobraCapacidade)} {unitLabel}
              </p>
              <p className="text-xs text-slate-300">Dias necessários: {diasNecessarios || '-'}d</p>
              {!isPmp && extraCapacidade.totalExtra > 0 && (
                <p className="mt-1 text-[11px] text-amber-200 font-semibold">
                  Distribua +{fmtNum(extraCapacidade.totalExtra)} un para preencher a capacidade.
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="bg-[#0f1729] rounded-3xl border border-white/10 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-5 text-slate-100">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Visão profissional</h2>
              <p className="text-xs text-slate-300">Acompanhe a demanda como um controle de produção completo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {screenOptions.map((screen) => (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setScreenMode(screen.id)}
                  className={`text-xs font-semibold px-4 py-2 rounded-2xl border transition ${
                    screenMode === screen.id
                      ? 'bg-[#2f6fed] text-white border-[#2f6fed]/40 shadow-md shadow-[#2f6fed]/30'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 shadow-sm'
                  }`}
                  aria-pressed={screenMode === screen.id}
                >
                  {screen.title}
                </button>
              ))}
            </div>
          </div>
          {screenMode === 'grupos' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {viewSummary.categoriasAgg.map((category) => (
                  <div key={category.categoriaKey} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-300">{category.categoriaKey}</p>
                    <p className="text-2xl font-semibold text-slate-100">{fmtKg(category.totalKg || 0)} kg</p>
                    <p className="text-xs text-slate-400">({fmtNum(category.products)} produtos)</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setScreenMode('tabela')}
                  className="px-4 py-2 rounded-2xl bg-[#2f6fed] text-white text-xs font-semibold transition hover:bg-[#2559c9]"
                >
                  Ir para tabela geral
                </button>
              </div>
            </div>
          )}
          {screenMode === 'tabela' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {tabOptions.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setViewMode(tab.id)}
                      className={`text-xs font-semibold px-4 py-2 rounded-2xl border transition ${
                        viewMode === tab.id
                          ? 'bg-[#2f6fed] text-white border-[#2f6fed]/40 shadow-md shadow-[#2f6fed]/30'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 shadow-sm'
                      }`}
                      aria-pressed={viewMode === tab.id}
                    >
                      {tab.title}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-400">{tabOptions.find((tab) => tab.id === viewMode)?.description}</div>
              </div>
              <div className="mt-2">
                {viewMode === 'produtos' && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Componentes (por código)</h3>
                        <p className="text-xs text-slate-300">Agrupa todos os componentes dos itens pai selecionados.</p>
                      </div>
                      <div className="text-xs text-slate-400">{fmtNum(componentesAgrupados.length)} itens</div>
                    </div>
                    {componentesAgrupados.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b1220] p-6 text-center text-sm text-slate-300">
                        Nenhum componente encontrado para a carteira atual.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr className="text-[11px] uppercase tracking-[0.12em] text-slate-300 border-b border-white/10">
                              <th className="py-3 pl-3 pr-2 text-left">Código</th>
                              <th className="py-3 px-2 text-left">Descrição</th>
                              <th className="py-3 px-2 text-left">Tipo</th>
                              <th className="py-3 px-2 text-right">Qtd</th>
                              <th className="py-3 px-2 text-left">UM</th>
                              <th className="py-3 pr-3 pl-2 text-right">Pais</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {componentesAgrupados.slice(0, 300).map((comp) => (
                              <tr key={comp.code} className="hover:bg-white/5">
                                <td className="py-3 pl-3 pr-2 font-mono font-semibold text-slate-100">{comp.code}</td>
                                <td className="py-3 px-2 text-slate-300">{comp.desc || 'Sem descrição'}</td>
                                <td className="py-3 px-2 text-slate-300">{comp.tipo}</td>
                                <td className="py-3 px-2 text-right font-mono font-semibold text-slate-100">{fmtUnits(comp.total)}</td>
                                <td className="py-3 px-2 text-slate-300">{comp.um || '-'}</td>
                                <td className="py-3 pr-3 pl-2 text-right text-slate-300">{fmtNum(comp.parents)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {viewMode === 'bobinas' && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">Bobinas</h3>
                        <p className="text-xs text-slate-300">Consumo por código</p>
                      </div>
                      <div className="text-right text-xs text-slate-400 space-y-1">
                        <p>{fmtKgScaled(viewSummary.totalKg)} {kgLabel} totais</p>
                        <p>{fmtKg(motherStock.totalKg)} kg em estoque</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xs uppercase tracking-wider text-slate-300 border-b border-white/10">
                            <th className="p-3">Bobina</th>
                            <th className="p-3">Descrição</th>
                            <th className="p-3 text-right">Consumo (kg)</th>
                            <th className="p-3 text-right">Estoque (kg)</th>
                            <th className="p-3 text-right">Diferença</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {viewSummary.bobinasAgg.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-sm text-slate-400">
                                Nenhum dado carregado. Suba uma carteira para calcular o consumo por bobina.
                              </td>
                            </tr>
                            ) : (
                              viewSummary.bobinasAgg.map((bobina) => {
                                const weight = bobina.totalKg || 0;
                                const displayWeight = weight * viewFactor;
                                const stock = getEstoquePorBobina(bobina.cod);
                                const diff = stock - displayWeight;
                                return (
                          <tr key={bobina.cod} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-mono text-slate-200">{bobina.cod}</td>
                                    <td className="p-3 text-sm text-slate-200">{bobina.desc}</td>
                                    <td className="p-3 text-right font-mono">{fmtKg(displayWeight)} {kgLabel}</td>
                                    <td className="p-3 text-right font-mono">{fmtKg(stock)} kg</td>
                                    <td className={`p-3 text-right font-mono ${diff < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                      {fmtKg(diff)} kg
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {viewMode === 'componentes' && (
                  <div className="space-y-4">
                    {parentItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b1220] p-6 text-center text-sm text-slate-400">
                        Nenhum produto com quantidade positiva. Faça o upload da carteira para ativar este painel.
                      </div>
                    ) : (
                      parentItems.map((item) => {
                        return (
                          <details key={item.produto} className="group rounded-2xl border border-white/10 bg-[#0b1220]">
                            <summary className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between list-none cursor-pointer">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{item.produto} — {item.desc}</p>
                                <p className="text-xs text-slate-300">{item.categoriaKey}</p>
                              </div>
                              <div className="text-right text-sm text-slate-300 space-y-1">
                                <p className="text-slate-100 font-semibold">{fmtUnits(item.qty)} un</p>
                                <p className="text-slate-200 font-mono">{fmtKgScaled(item.totalKg)} kg</p>
                              </div>
                            </summary>
                            <div className="border-t border-white/10 px-4 pb-4 pt-3">
                              <div className="space-y-3">
                                {estruturaByParent[item.produto]?.children?.length ? (
                                  estruturaByParent[item.produto].children.map((child) => (
                                    <details key={`${item.produto}-${child.code}`} className="rounded-lg border border-white/10 bg-[#0f1729] p-3">
                                      <summary className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-base list-none cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs uppercase text-slate-400">{child.tp || '-'}</span>
                                          <span className="font-mono font-bold text-slate-100">{child.code || '-'}</span>
                                          <span className="text-sm text-slate-300 truncate">{child.desc || 'Sem descricao'}</span>
                                        </div>
                                        <div className="text-sm text-slate-300 flex items-center gap-3">
                                          <span className="font-semibold text-slate-200">N{child.edge?.nivel ?? '-'}</span>
                                          <span className="font-mono text-slate-100">
                                            {fmtUnits((Number(child.edge?.qtdNec || 0) || 0) * (Number(item.qty || 0) || 0))} {child.edge?.um ?? ''}
                                          </span>
                                        </div>
                                      </summary>
                                      <div className="mt-3">
                                        {child.mps?.length ? (
                                          <div className="flex flex-col gap-2">
                                            {child.mps.map((mp) => (
                                              <div
                                                key={`${child.code}-${mp.child}`}
                                                className="flex items-center justify-between gap-3 rounded-lg bg-[#0b1220] border border-white/10 px-3 py-2 text-sm"
                                              >
                                                <div className="min-w-0">
                                                  <div className="font-mono font-semibold text-slate-100">{mp.child}</div>
                                                  <div className="text-sm text-slate-300 truncate">
                                                    {getItemDesc(mp.child) || 'Bobina'}
                                                  </div>
                                                </div>
                                                <div className="text-right text-sm text-slate-200 shrink-0">
                                                  <div className="font-semibold">N{mp.nivel ?? '-'}</div>
                                                  <div className="font-mono">
                                                    {fmtNum(mp.qtdNec ?? 0)} {mp.um ?? ''}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-slate-400">Sem bobinas vinculadas</div>
                                        )}
                                      </div>
                                    </details>
                                  ))
                                ) : (
                                  <div className="text-xs text-slate-400">Sem estrutura de itens para este produto.</div>
                                )}

                                {estruturaByParent[item.produto]?.directMps?.length ? (
                                  <div className="rounded-lg border border-white/10 bg-[#0f1729] p-3">
                                    <div className="text-xs uppercase text-slate-300 mb-2">
                                      Bobinas diretas ({fmtNum(estruturaByParent[item.produto].directMps.length)})
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {estruturaByParent[item.produto].directMps.map((mp) => (
                                        <div
                                          key={`${item.produto}-mp-${mp.child}`}
                                          className="flex items-center justify-between gap-3 rounded-lg bg-[#0b1220] border border-white/10 px-3 py-2 text-sm"
                                        >
                                          <div className="min-w-0">
                                            <div className="font-mono font-semibold text-slate-100">{mp.child}</div>
                                            <div className="text-sm text-slate-300 truncate">
                                              {getItemDesc(mp.child) || 'Bobina'}
                                            </div>
                                          </div>
                                          <div className="text-right text-sm text-slate-200 shrink-0">
                                            <div className="font-semibold">N{mp.nivel ?? '-'}</div>
                                            <div className="font-mono">
                                              {fmtNum(mp.qtdNec ?? 0)} {mp.um ?? ''}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </details>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        <section className="bg-[#0f1729] rounded-3xl border border-white/10 shadow-[0_25px_60px_-40px_rgba(0,0,0,0.8)] p-5 sm:p-6 space-y-5 text-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categorias</h2>
              <p className="text-xs text-slate-300">Resumo agrupado</p>
            </div>
            <span className="text-xs text-slate-300">{fmtNum(viewSummary.categoriasAgg.length)} agrupamentos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-300 border-b border-white/10">
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Consumo (kg)</th>
                  <th className="p-3 text-right">Produtos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {viewSummary.categoriasAgg.map((category) => (
                  <tr key={category.categoriaKey} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-sm text-slate-100">{category.categoriaKey}</td>
                    <td className="p-3 text-right font-mono text-slate-100">{fmtKg(category.totalKg || 0)} kg</td>
                    <td className="p-3 text-right text-slate-200">{fmtNum(category.products)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
const fmtNum = (value) => Number(value || 0).toLocaleString('pt-BR');
const fmtKg = (value) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default DemandFocus;
