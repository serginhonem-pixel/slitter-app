import React, { useMemo, useRef, useState } from 'react';
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
  rows.forEach((row) => {
    const produto = String(row.produto ?? '').trim();
    const qtd = parseQty(row.quantidade);
    if (!produto || qtd <= 0) return;
    result[produto] = (result[produto] || 0) + qtd;
  });
  return result;
};

const DemandFocus = () => {
  const [qtdPorProduto, setQtdPorProduto] = useState({});
  const [importResumo, setImportResumo] = useState(null);
  const [mostrarSelecionados, setMostrarSelecionados] = useState(true);
  const [categoriaOverrides, setCategoriaOverrides] = useState({});
  const carteiraRef = useRef(null);

  const produtos = useMemo(() => {
    const list = Array.isArray(bobinasPorProdutoData?.produtos) ? bobinasPorProdutoData.produtos : [];
    return list.map((item) => ({
      ...item,
      categoriaKey: String(item.categoriaKey ?? item.categoria?.categoriaKey ?? 'Sem categoria').trim(),
    }));
  }, []);

  const bomSummary = useMemo(() => {
    const enriched = produtos.map((item) => {
      const qty = Number(qtdPorProduto[item.produto] || 0);
      const totalKg = item.bobinas.reduce((acc, bobina) => acc + Number(bobina.porUnidade || 0) * qty, 0);
      const categoriaKey = categoriaOverrides[item.produto] || item.categoriaKey || 'Sem categoria';
      return { ...item, qty, totalKg, categoriaKey };
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
    };
  }, [produtos, qtdPorProduto, categoriaOverrides]);

  const produtosVisiveis = mostrarSelecionados ? bomSummary.selected : bomSummary.produtoRows;
  const categoriaOptions = useMemo(() => {
    const set = new Set(produtos.map((p) => p.categoriaKey || 'Sem categoria'));
    set.add('Sem categoria');
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [produtos]);

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
      setImportResumo({ error: 'Arquivo inválido. Use CSV/Excel com produto + quantidade.' });
      return;
    }
    const aggregated = aggregateRows(rows);
    setQtdPorProduto(aggregated);
    setImportResumo({ imported: Object.keys(aggregated).length, lines: rows.length });
  };

  const handleCategoriaChange = (produto, value) => {
    setCategoriaOverrides((prev) => ({ ...prev, [produto]: value }));
  };

  const [viewMode, setViewMode] = useState('produtos');

  return (
    <div className="font-sans text-slate-900 bg-slate-100 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-200 font-semibold mb-1">Carteira de Demanda</p>
              <h1 className="text-3xl font-bold tracking-tight">Demanda de Aço</h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Suba o arquivo da carteira para ver o BOM por produto, bobina e categoria. Os totais aparecem por aqui mesmo.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadModelo}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition"
              >
                Baixar modelo
              </button>
              <button
                onClick={() => carteiraRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-semibold border border-white/30 hover:border-white/60 transition"
              >
                Subir carteira
              </button>
            </div>
          </div>
          {importResumo && (
            <div className={`rounded-2xl p-3 text-sm font-semibold ${importResumo.error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-900'}`}>
              {importResumo.error
                ? importResumo.error
                : `Importado ${fmtNum(importResumo.imported)} produtos (${fmtNum(importResumo.lines)} linhas).`}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/40">
              <p className="text-xs uppercase text-slate-500">Produtos ativos</p>
              <p className="text-3xl font-bold text-slate-900">{fmtNum(bomSummary.totalUnits)} un</p>
              <p className="text-xs text-slate-400 mt-1">Com quantidade positiva</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/40">
              <p className="text-xs uppercase text-slate-500">Consumo estimado</p>
              <p className="text-3xl font-bold text-slate-900">{fmtKg(bomSummary.totalKg)} kg</p>
              <p className="text-xs text-slate-400 mt-1">Baseado no BOM por unidade</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white/40">
              <p className="text-xs uppercase text-slate-500">Categorias</p>
              <p className="text-3xl font-bold text-slate-900">{fmtNum(bomSummary.categoriasAgg.length)} grupos</p>
              <p className="text-xs text-slate-400 mt-1">Agrupadas por categoria atual</p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Produtos</h2>
              <p className="text-xs text-slate-500">Controle das quantidades e categorias.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <input
                  type="checkbox"
                  checked={mostrarSelecionados}
                  onChange={(e) => setMostrarSelecionados(e.target.checked)}
                  className="accent-indigo-600"
                />
                Mostrar só selecionados
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <input
              ref={carteiraRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              className="hidden"
            />
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Qtd</th>
                  <th className="p-3 text-right">Consumo (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {produtosVisiveis.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-slate-400">
                      Nenhum produto: suba a carteira para visualizar o BOM.
                    </td>
                  </tr>
                )}
                {produtosVisiveis.slice(0, 200).map((item) => (
                  <tr key={item.produto} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-700">{item.produto}</td>
                    <td className="p-3 text-sm text-slate-700">{item.desc}</td>
                    <td className="p-3">
                      <input
                        list="categoria-options"
                        value={categoriaOverrides[item.produto] ?? item.categoriaKey ?? ''}
                        onChange={(e) => handleCategoriaChange(item.produto, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                        placeholder="Sem categoria"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={qtdPorProduto[item.produto] ?? ''}
                        onChange={(e) => setQtdPorProduto((prev) => ({ ...prev, [item.produto]: parseQty(e.target.value) }))}
                        className="w-24 text-right font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                      />
                    </td>
                    <td className="p-3 text-right font-mono text-slate-800">{fmtKg(item.totalKg || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <datalist id="categoria-options">
            {categoriaOptions.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Bobinas</h2>
              <p className="text-xs text-slate-500">Consumo por código</p>
            </div>
            <div className="text-xs text-slate-400">{fmtKg(bomSummary.totalKg)} kg totais</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="p-3">Bobina</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Consumo (kg)</th>
                  <th className="p-3 text-right">Bobinas (±)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bomSummary.bobinasAgg.map((bobina) => {
                  const weight = bobina.totalKg || 0;
                  const coilsNeeded = Math.ceil(weight / 1000);
                  return (
                    <tr key={bobina.cod} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-700">{bobina.cod}</td>
                      <td className="p-3 text-sm text-slate-700">{bobina.desc}</td>
                      <td className="p-3 text-right font-mono">{fmtKg(weight)} kg</td>
                      <td className="p-3 text-right font-mono">{fmtNum(coilsNeeded)} un</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
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

const fmtNum = (value) => value.toLocaleString('pt-BR');
const fmtKg = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default DemandFocus;
