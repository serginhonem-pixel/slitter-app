import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import bobinasPorProdutoData from './bobinas_por_produto.json';

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
  { id: 'produtos', title: 'Produtos', description: 'Controle das quantidades e categorias.' },
  { id: 'bobinas', title: 'Bobinas', description: 'Consumo por bobina e necessidades.' },
  { id: 'componentes', title: 'Itens & Componentes', description: 'Itens pai com seus componentes e bobinas.' },
];

const screenOptions = [
  { id: 'grupos', title: 'Grupos' },
  { id: 'tabela', title: 'Tabela geral' },
];

const DemandFocus = () => {
  const [qtdPorProduto, setQtdPorProduto] = useState({});
  const [importResumo, setImportResumo] = useState(null);
  const [mostrarSelecionados, setMostrarSelecionados] = useState(true);
  const [categoriaOverrides, setCategoriaOverrides] = useState({});
  const [viewMode, setViewMode] = useState('produtos');
  const [screenMode, setScreenMode] = useState('grupos');
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

  const produtosVisiveis = useMemo(() => {
    let list = bomSummary.produtoRows;
    if (mostrarSelecionados) {
      list = list.filter((item) => (item.demanded || 0) > 0 || (item.produced || 0) > 0);
    }
    if (filtroProgresso === 'pendentes') {
      list = list.filter((item) => item.qty > 0);
    } else if (filtroProgresso === 'concluidos') {
      list = list.filter((item) => item.qty <= 0);
    }
    return list;
  }, [bomSummary.produtoRows, bomSummary.totalDemanded, mostrarSelecionados, filtroProgresso]);
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
    () => bomSummary.selected.slice().sort((a, b) => b.totalKg - a.totalKg),
    [bomSummary.selected],
  );
  const getEstoquePorBobina = (code) => motherStock.byCode?.[String(code || '').trim()] || 0;
  const metaMensal = Math.max(0, metaDiaria * diasUteis);
  const demandaTotal = bomSummary.totalUnits;
  const faltaProduzir = Math.max(0, demandaTotal - metaMensal);
  const sobraCapacidade = Math.max(0, metaMensal - demandaTotal);
  const diasNecessarios = metaDiaria > 0 ? Math.ceil(demandaTotal / metaDiaria) : 0;
  const totalDemandado = bomSummary.totalDemanded || 0;
  const totalProduzido = bomSummary.totalProduced || 0;

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
    <div className="min-h-screen bg-[#0d152c] text-slate-100 py-8 px-3 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-7">
        <div className="bg-[#0f1729] text-white rounded-3xl border border-white/5 p-6 sm:p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200 font-semibold">Carteira de Demanda</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Demanda de Aço</h1>
                <span className="px-3 py-1 text-[11px] uppercase tracking-wide rounded-full bg-white/10 border border-white/10">
                  Controle de produção
                </span>
              </div>
              <p className="text-sm text-slate-200 max-w-3xl">Suba o arquivo da carteira para ver o BOM por produto, bobina e categoria. Os totais aparecem por aqui mesmo.</p>
            </div>
            <div className="flex flex-wrap gap-3">
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
            <div className={`rounded-2xl p-3 text-sm font-semibold border ${importResumo.error ? 'bg-rose-100/90 text-rose-800 border-rose-200/60' : 'bg-emerald-50 text-emerald-900 border-emerald-100/70'}`}>
              {importResumo.error ? (
                importResumo.error
              ) : (
                <div className="flex flex-col gap-1">
                  <span>Importado {fmtNum(importResumo.imported)} produtos ({fmtNum(importResumo.rowsCounted)} linhas válidas de {fmtNum(importResumo.lines)}).</span>
                  {(importResumo.invalidProduto > 0 || importResumo.invalidQty > 0) && (
                    <span className="text-xs font-normal text-slate-700">
                      Ignorado: {fmtNum(importResumo.invalidProduto)} linha(s) sem código + {fmtNum(importResumo.invalidQty)} linha(s) com quantidade inválida/zero.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Produtos ativos</p>
              <p className="text-3xl font-bold mt-1">{fmtNum(bomSummary.totalUnits)} un</p>
              <p className="text-xs text-slate-300">Com quantidade positiva</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Consumo estimado</p>
              <p className="text-3xl font-bold mt-1">{fmtKg(bomSummary.totalKg)} kg</p>
              <p className="text-xs text-slate-300">Baseado no BOM por unidade</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Categorias</p>
              <p className="text-3xl font-bold mt-1">{fmtNum(bomSummary.categoriasAgg.length)} grupos</p>
              <p className="text-xs text-slate-300">Agrupadas por categoria atual</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner">
              <p className="text-[11px] uppercase tracking-wide text-slate-200/80">Estoque de bobinas</p>
              <p className="text-3xl font-bold mt-1">{fmtKg(motherStock.totalKg)} kg</p>
              <p className="text-xs text-slate-300">Saldo atual em estoque (mãe)</p>
            </div>
            <div className="rounded-2xl bg-amber-50/70 border border-amber-200 px-4 py-3 shadow-inner text-amber-800">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">Sugestão de produção</p>
              <p className="text-2xl font-semibold">
                {fmtNum(Math.max(0, extraCapacidade.totalExtra))} un
              </p>
              <p className="text-xs text-amber-700">Produzir além da carteira para atingir a capacidade</p>
            </div>
          </div>
        </div>
        <input
          ref={carteiraRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          className="hidden"
        />
        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5 text-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Planejamento mensal</h2>
              <p className="text-xs text-slate-500">Capacidade vs. demanda carregada.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 shadow-inner">
                <span className="font-semibold">Dias úteis</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diasUteis}
                  onChange={(e) => setDiasUteis(Math.max(1, parseQty(e.target.value)))}
                  className="w-16 text-right font-mono text-sm bg-white border border-slate-200 rounded-full px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 shadow-inner">
                <span className="font-semibold">Capacidade diária</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={metaDiaria}
                  onChange={(e) => setMetaDiaria(Math.max(0, parseQty(e.target.value)))}
                  className="w-24 text-right font-mono text-sm bg-white border border-slate-200 rounded-full px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Meta diária</p>
              <p className="text-2xl font-semibold text-slate-900">{fmtNum(metaDiaria)} un</p>
              <p className="text-xs text-slate-500">Produção alvo por dia</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Meta mensal</p>
              <p className="text-2xl font-semibold text-slate-900">{fmtNum(metaMensal)} un</p>
              <p className="text-xs text-slate-500">{fmtNum(diasUteis)} dias úteis</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Demanda carregada</p>
              <p className="text-2xl font-semibold text-slate-900">{fmtNum(totalDemandado)} un</p>
              <p className="text-xs text-slate-500">Subtotal da carteira</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Produzido (informado)</p>
              <p className="text-2xl font-semibold text-slate-900">{fmtNum(totalProduzido)} un</p>
              <p className="text-xs text-slate-500">Abatido da demanda</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{faltaProduzir > 0 ? 'Falta produzir' : 'Capacidade ociosa'}</p>
              <p className={`text-2xl font-semibold ${faltaProduzir > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {fmtNum(faltaProduzir > 0 ? faltaProduzir : sobraCapacidade)} un
              </p>
              <p className="text-xs text-slate-500">Dias necessários: {diasNecessarios || '-'}d</p>
              {extraCapacidade.totalExtra > 0 && (
                <p className="mt-1 text-[11px] text-amber-700 font-semibold">
                  Distribua +{fmtNum(extraCapacidade.totalExtra)} un para preencher a capacidade.
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5 text-slate-900">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Visão profissional</h2>
              <p className="text-xs text-slate-500">Acompanhe a demanda como um controle de produção completo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {screenOptions.map((screen) => (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setScreenMode(screen.id)}
                  className={`text-xs font-semibold px-4 py-2 rounded-2xl border transition ${
                    screenMode === screen.id
                      ? 'bg-[#4f46e5] text-white border-indigo-200 shadow-md shadow-indigo-200/40'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'
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
                {bomSummary.categoriasAgg.map((category) => (
                  <div key={category.categoriaKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{category.categoriaKey}</p>
                    <p className="text-2xl font-semibold text-slate-900">{fmtKg(category.totalKg || 0)} kg</p>
                    <p className="text-xs text-slate-500">({fmtNum(category.products)} produtos)</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setScreenMode('tabela')}
                  className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold transition hover:bg-indigo-500"
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
                          ? 'bg-[#4f46e5] text-white border-indigo-200 shadow-md shadow-indigo-200/40'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'
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
                  <div className="space-y-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Produtos</h3>
                        <p className="text-xs text-slate-500">Controle das quantidades e categorias.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600 items-center">
                        <label className="flex items-center gap-2 font-bold">
                          <input
                            type="checkbox"
                            checked={mostrarSelecionados}
                            onChange={(e) => setMostrarSelecionados(e.target.checked)}
                            className="accent-indigo-600"
                          />
                          Mostrar só selecionados
                        </label>
                        <select
                          value={filtroProgresso}
                          onChange={(e) => setFiltroProgresso(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-1 font-semibold text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="todos">Todos</option>
                          <option value="pendentes">Só pendentes</option>
                          <option value="concluidos">Só concluídos</option>
                        </select>
                        <label className="flex items-center gap-1 font-bold">
                          <input
                            type="checkbox"
                            checked={filtroEstoqueFaltante}
                            onChange={(e) => setFiltroEstoqueFaltante(e.target.checked)}
                            className="accent-rose-600"
                          />
                          Só faltando estoque
                        </label>
                      </div>
                    </div>
                    {produtosVisiveis.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                        Nenhum produto: suba a carteira para visualizar o BOM.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                          <tr className="text-[11px] uppercase tracking-[0.12em] text-slate-500 border-b border-slate-200">
                            <th className="py-3 pl-3 pr-2 text-left">Categoria</th>
                            <th className="py-3 px-2 text-left">Produtos</th>
                            <th className="py-3 px-2 text-right">Demanda</th>
                            <th className="py-3 px-2 text-right">Produzido</th>
                            <th className="py-3 px-2 text-right">Restante</th>
                            <th className="py-3 pr-3 pl-2 text-right">Itens</th>
                          </tr>
                        </thead>
                          <tbody className="divide-y divide-slate-100">
                            {produtosAgrupados.slice(0, 50).map((group) => {
                              const totalGrupoDemandado = group.items.reduce((sum, item) => sum + (item.demanded || 0), 0);
                              const totalGrupoProduzido = group.items.reduce(
                                (sum, item) => sum + Math.min(item.produced || 0, item.demanded || 0),
                                0,
                              );
                              const totalGrupoQtd = group.items.reduce((sum, item) => sum + (item.qty || 0), 0);
                              const totalGrupoKg = group.items.reduce((sum, item) => sum + (item.totalKg || 0), 0);
                              const isOpen = categoriasAbertas.has(group.categoria);
                              const filteredItems = group.items.filter((item) => {
                                if (filtroEstoqueFaltante) {
                                  const faltaEstoque = item.bobinas?.some((b) => getEstoquePorBobina(b.cod) < (b.porUnidade || 0) * item.qty);
                                  if (!faltaEstoque) return false;
                                }
                                if (filtroProgresso === 'pendentes') return item.qty > 0;
                                if (filtroProgresso === 'concluidos') return item.qty <= 0;
                                return true;
                              });
                              return (
                                <React.Fragment key={group.categoria}>
                                  <tr
                                    className={`transition-colors ${
                                      isOpen
                                        ? 'bg-white border border-indigo-200 shadow-md shadow-indigo-100/60 ring-1 ring-indigo-100'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <td className="py-3 pl-3 pr-2 font-semibold text-slate-900">
                                      <button
                                        type="button"
                                        onClick={() => toggleCategoriaOpen(group.categoria)}
                                        className="inline-flex items-center gap-2 text-left"
                                      >
                                        <span
                                          className={`h-5 w-5 rounded-full border border-slate-200 flex items-center justify-center text-[11px] font-bold ${
                                            isOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'
                                          }`}
                                        >
                                          {isOpen ? '-' : '+'}
                                        </span>
                                        <span>{group.categoria || 'Sem categoria'}</span>
                                      </button>
                                    </td>
                                    <td className="py-3 px-2 text-slate-600">{fmtNum(group.items.length)} produtos</td>
                                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900">
                                      {fmtNum(totalGrupoDemandado)}
                                    </td>
                                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900">
                                      {fmtNum(totalGrupoProduzido)}
                                    </td>
                                    <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900">
                                      {fmtNum(totalGrupoQtd)}
                                    </td>
                                    <td className="py-3 pr-3 pl-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => toggleCategoriaOpen(group.categoria)}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                      >
                                        {isOpen ? 'Fechar itens' : 'Ver itens'}
                                      </button>
                                    </td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="bg-slate-50/70">
                                      <td colSpan={5} className="p-3">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2">
                                          <div className="flex flex-col gap-1 text-xs text-slate-600">
                                            <p className="font-semibold text-slate-800">Atualizações em lote</p>
                                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                              <input
                                                list="categoria-options"
                                                value={categoriaGrupoDrafts[group.categoria] ?? group.categoria ?? ''}
                                                onChange={(e) => handleCategoriaGrupoChange(group.categoria, e.target.value)}
                                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition min-w-[220px]"
                                                placeholder="Nova categoria"
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleAplicarCategoriaGrupo(
                                                    group.categoria,
                                                    categoriaGrupoDrafts[group.categoria] ?? group.categoria,
                                                  )
                                                }
                                                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md hover:bg-indigo-500 transition"
                                              >
                                                Aplicar ao grupo
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setProducaoPorProduto((prev) => {
                                                    const next = { ...prev };
                                                    filteredItems.forEach((it) => {
                                                      next[it.produto] = Math.max(prev[it.produto] || 0, it.demanded || 0);
                                                    });
                                                    return next;
                                                  })
                                                }
                                                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-md hover:bg-emerald-500 transition"
                                              >
                                                Produzir restante
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          {group.items.slice(0, 200).map((item) => {
                                            const isDone = (item.demanded || 0) > 0 && item.qty <= 0;
                                            return (
                                              <div
                                                key={item.produto}
                                                className={`rounded-2xl border p-4 transition shadow-sm flex flex-col gap-3 ${
                                                  isDone
                                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                                                }`}
                                              >
                                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                  <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                      <p className="text-xs uppercase tracking-wide text-slate-400">{item.produto}</p>
                                                      {isDone && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                                          Concluído
                                                        </span>
                                                      )}
                                                      {extraCapacidade.byProd[item.produto] > 0 && (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold border border-amber-200">
                                                          +{fmtNum(extraCapacidade.byProd[item.produto])} sug. produção
                                                        </span>
                                                      )}
                                                    </div>
                                                <p className="text-sm font-semibold text-slate-900">{item.desc}</p>
                                                <p className="text-xs text-slate-600">
                                                  <span className="font-semibold text-slate-700">Demandado:</span> {fmtNum(item.demanded)} ·{' '}
                                                  <span className="font-semibold text-emerald-700">Produzido:</span>{' '}
                                                  {fmtNum(Math.min(item.produced, item.demanded))} ·{' '}
                                                  <span className={`font-semibold ${item.qty > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                    Restante: {fmtNum(item.qty)}
                                                  </span>
                                                    </p>
                                                  </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                      <div className="text-right">
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Qtd</p>
                                        <p className="text-lg font-semibold text-slate-900">{fmtNum(item.qty)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Consumo</p>
                                        <p className="text-lg font-semibold text-slate-900">{fmtKg(item.totalKg)}</p>
                                      </div>
                                    </div>
                                  </div>
                                                  <div className="grid gap-3 md:grid-cols-4 items-end">
                                                    <label className="flex flex-col text-xs text-slate-500">
                                                      Categoria
                                                      <input
                                                        list="categoria-options"
                                                      value={categoriaOverrides[item.produto] ?? item.categoriaKey ?? ''}
                                                      onChange={(e) => handleCategoriaChange(item.produto, e.target.value)}
                                                      className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                                                      placeholder="Sem categoria"
                                                    />
                                                  </label>
                                                    <label className="flex flex-col text-xs text-slate-500">
                                                      Demanda total
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                      value={qtdPorProduto[item.produto] ?? ''}
                                                      onChange={(e) =>
                                                        setQtdPorProduto((prev) => ({
                                                          ...prev,
                                                          [item.produto]: Math.round(parseQty(e.target.value)),
                                                        }))
                                                      }
                                                      className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                                                      />
                                                      <span className="mt-1 text-[11px] text-slate-500">Valor total carregado</span>
                                                    </label>
                                                    <label className="flex flex-col text-xs text-slate-500">
                                                      Produzido
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                      value={producaoPorProduto[item.produto] ?? ''}
                                                      onChange={(e) =>
                                                        setProducaoPorProduto((prev) => ({
                                                          ...prev,
                                                          [item.produto]: Math.round(parseQty(e.target.value)),
                                                        }))
                                                      }
                                                      className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
                                                      />
                                                      <span className="mt-1 text-[11px] text-slate-500">O que já saiu do chão</span>
                                                    </label>
                                                    <div className="flex gap-2 text-xs">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setProducaoPorProduto((prev) => ({
                                                            ...prev,
                                                            [item.produto]: Math.round(parseQty(producaoPorProduto[item.produto] || 0) + 100),
                                                          }))
                                                        }
                                                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                                                      >
                                                        +100
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setProducaoPorProduto((prev) => ({
                                                            ...prev,
                                                            [item.produto]: Math.max(0, Math.round(parseQty(producaoPorProduto[item.produto] || 0) - 100)),
                                                          }))
                                                        }
                                                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                                                      >
                                                        -100
                                                      </button>
                                                      {extraCapacidade.byProd[item.produto] > 0 && (
                                                        <button
                                                          type="button"
                                                          onClick={() => applySugestaoItem(item.produto, extraCapacidade.byProd[item.produto])}
                                                          className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 transition font-semibold"
                                                        >
                                                          Aplicar +{fmtNum(extraCapacidade.byProd[item.produto])}
                                                        </button>
                                                      )}
                                                    </div>
                                                    <div className="flex flex-col text-xs text-slate-500">
                                                      <span className="uppercase tracking-wide text-slate-400">Consumo estimado</span>
                                                      <span className="mt-2 text-sm font-semibold text-slate-800">{fmtKg(item.totalKg || 0)}</span>
                                                    </div>
                                                  </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                        <datalist id="categoria-options">
                          {categoriaOptions.map((value) => (
                            <option key={value} value={value} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>
                )}
                {viewMode === 'bobinas' && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Bobinas</h3>
                        <p className="text-xs text-slate-500">Consumo por código</p>
                      </div>
                      <div className="text-right text-xs text-slate-400 space-y-1">
                        <p>{fmtKg(bomSummary.totalKg)} kg totais</p>
                        <p>{fmtKg(motherStock.totalKg)} kg em estoque</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <th className="p-3">Bobina</th>
                            <th className="p-3">Descrição</th>
                            <th className="p-3 text-right">Consumo (kg)</th>
                            <th className="p-3 text-right">Estoque (kg)</th>
                            <th className="p-3 text-right">Diferença</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bomSummary.bobinasAgg.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-sm text-slate-400">
                                Nenhum dado carregado. Suba uma carteira para calcular o consumo por bobina.
                              </td>
                            </tr>
                            ) : (
                              bomSummary.bobinasAgg.map((bobina) => {
                                const weight = bobina.totalKg || 0;
                                const stock = getEstoquePorBobina(bobina.cod);
                                const diff = stock - weight;
                                return (
                                  <tr key={bobina.cod} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-mono text-slate-700">{bobina.cod}</td>
                                    <td className="p-3 text-sm text-slate-700">{bobina.desc}</td>
                                    <td className="p-3 text-right font-mono">{fmtKg(weight)} kg</td>
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
                    <div className="text-sm text-slate-500">
                      Listei aqui todos os itens pai e os componentes que cada um consome.
                    </div>
                    {parentItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                        Nenhum produto com quantidade positiva. Faça o upload da carteira para ativar este painel.
                      </div>
                    ) : (
                      parentItems.map((item) => {
                        const sortedBobinas = item.bobinas.slice().sort((a, b) => (b.porUnidade || 0) - (a.porUnidade || 0));
                        return (
                          <details key={item.produto} className="group rounded-2xl border border-slate-200 bg-slate-50">
                            <summary className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between list-none cursor-pointer">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400">Produto pai</p>
                                <p className="text-sm font-semibold text-slate-900">{item.produto} — {item.desc}</p>
                                <p className="text-xs text-slate-500">{item.categoriaKey}</p>
                              </div>
                              <div className="text-right text-sm text-slate-500 space-y-1">
                                <p>{fmtNum(item.qty)} un</p>
                                <p>{fmtKg(item.totalKg)} kg</p>
                              </div>
                            </summary>
                            <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left border-collapse">
                                  <thead>
                                    <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                      <th className="p-2 text-left">Bobina</th>
                                      <th className="p-2 text-left">Descrição</th>
                                      <th className="p-2 text-right">Kg/un</th>
                                      <th className="p-2 text-right">Kg total</th>
                                      <th className="p-2 text-right">Estoque (kg)</th>
                                      <th className="p-2 text-right">Diferença</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {sortedBobinas.map((bobina) => {
                                      const perUnit = Number(bobina.porUnidade || 0);
                                      const total = perUnit * item.qty;
                                      const stock = getEstoquePorBobina(bobina.cod);
                                      const diff = stock - total;
                                      return (
                                        <tr key={`${item.produto}-${bobina.cod ?? bobina.desc}`} className="text-sm text-slate-700">
                                          <td className="p-2 font-mono">{bobina.cod}</td>
                                          <td className="p-2">{bobina.desc}</td>
                                          <td className="p-2 text-right font-mono">{fmtKg(perUnit)} kg</td>
                                          <td className="p-2 text-right font-mono">{fmtKg(total)} kg</td>
                                          <td className="p-2 text-right font-mono">{fmtKg(stock)} kg</td>
                                          <td className={`p-2 text-right font-mono ${diff < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{fmtKg(diff)} kg</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5 text-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Categorias</h2>
              <p className="text-xs text-slate-500">Resumo agrupado</p>
            </div>
            <span className="text-xs text-slate-400">{fmtNum(bomSummary.categoriasAgg.length)} agrupamentos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Consumo (kg)</th>
                  <th className="p-3 text-right">Produtos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bomSummary.categoriasAgg.map((category) => (
                  <tr key={category.categoriaKey} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-sm text-slate-700">{category.categoriaKey}</td>
                    <td className="p-3 text-right font-mono">{fmtKg(category.totalKg || 0)} kg</td>
                    <td className="p-3 text-right">{fmtNum(category.products)}</td>
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
