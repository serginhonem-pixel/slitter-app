import React, { useState } from 'react';
import { PieChart as PieIcon, X, ArrowUpDown, Search, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';

import { PESO_UNITARIO_PA } from '../../data/peso_unitario_pa';

// ---------- Helpers de formatação ----------
const formatKgToT = (kg) => {
  const t = (Number(kg) || 0) / 1000;
  return `${t.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`;
};

const formatKg = (kg) => {
  const v = Number(kg) || 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
};

const formatPcs = (pcs) => {
  const v = Number(pcs) || 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pçs`;
};

const toNumber = (value) => {
  if (value == null || value === '') return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getUnitWeight = (code) => {
  const c = String(code || '').trim();
  return Number(PESO_UNITARIO_PA[c]) || 0;
};

const CustomFlowTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entrada = payload.find((p) => p.dataKey === 'entrada')?.value || 0;
    const consumo = payload.find((p) => p.dataKey === 'consumo')?.value || 0;
    const saldo = payload.find((p) => p.dataKey === 'saldo')?.value || 0;

    return (
      <div className="bg-gray-900/90 p-3 border border-gray-700 rounded shadow-xl text-sm text-white">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-blue-400">Entrada: {formatKg(entrada)}</p>
        <p className="text-red-400">Consumo: {formatKg(consumo)}</p>
        <p
          className={`mt-1 font-bold ${
            saldo >= 0 ? 'text-green-400' : 'text-yellow-400'
          }`}
        >
          Saldo Acumulado: {formatKg(saldo)}
        </p>
      </div>
    );
  }
  return null;
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// =========================================================
//                 COMPONENTE PRINCIPAL
// =========================================================
const IndicatorsDashboard = ({
  motherCoils = [],
  childCoils = [],
  cuttingLogs = [],
  shippingLogs = [],
  productionLogs = [],
}) => {
  // filtros
  const [selectedTypes, setSelectedTypes] = useState([]); // tipos MP
  const [windowDays, setWindowDays] = useState(15); // 15 / 30 / 60
  const [customWindowInput, setCustomWindowInput] = useState('15');
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);

  // drill-down: { type: 'MP'|'B2', bucket: '0-30'|..., items: [...] }
  const [drillDown, setDrillDown] = useState(null);
  const [drillSort, setDrillSort] = useState({ key: 'dias', dir: 'desc' });
  const [drillSearch, setDrillSearch] = useState('');

  // listas seguras
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeChild = Array.isArray(childCoils) ? childCoils : [];
  const safeCutting = Array.isArray(cuttingLogs) ? cuttingLogs : [];
  const safeShipping = Array.isArray(shippingLogs) ? shippingLogs : [];
  const safeProd = Array.isArray(productionLogs) ? productionLogs : [];

  const totalRecords =
    safeMother.length +
    safeChild.length +
    safeProd.length +
    safeCutting.length +
    safeShipping.length;
  // --- B2 em estoque ---
  const b2Stock = safeChild.filter(
    (c) => String(c.status || '').toLowerCase() === 'stock'
  );

  const totalB2KgReal = b2Stock.reduce((acc, item) => {
    const rawWeight =
      item.weight ?? item.remainingWeight ?? item.netWeight ?? 0;
    const w = Number(rawWeight) || 0;
    return acc + w;
  }, 0);

  const totalB2Count = b2Stock.filter((item) => {
    const rawWeight =
      item.weight ?? item.remainingWeight ?? item.netWeight ?? 0;
    return Number(rawWeight) > 0;
  }).length;
  // data atual e constantes

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const normalizeDateBR = (raw) => {
    if (!raw) return null;
    let dateStr = String(raw).trim();

    if (dateStr.length >= 10 && dateStr.includes('T')) {
      dateStr = dateStr.slice(0, 10);
    }

    if (dateStr.includes(' ')) {
      dateStr = dateStr.split(' ')[0].replace(',', '');
    }

    if (dateStr.includes(',')) {
      dateStr = dateStr.split(',')[0];
    }

    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      if (y && y.length === 4 && m && d) {
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }

    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      if (d && m && y) {
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.padStart(4, '0')}`;
      }
    }

    return null;
  };

  const getDateFromItem = (item, fields) => {
    for (const field of fields) {
      const normalized = normalizeDateBR(item?.[field]);
      if (normalized) return normalized;
    }
    return null;
  };

  const getLastNDays = (days) => {
    const dates = [];
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      dates.push({
        dateBR: d.toLocaleDateString('pt-BR'),
        dateObj: d,
      });
    }
    return dates;
  };

  const groupByDate = (list, dateFields, getValue) => {
    const map = {};
    const fields = Array.isArray(dateFields) ? dateFields : [dateFields];
    list.forEach((item) => {
      const d = getDateFromItem(item, fields);
      if (!d) return;
      const val = typeof getValue === 'function' ? getValue(item) : 0;
      map[d] = (map[d] || 0) + val;
    });
    return map;
  };

  // ---------- TIPOS MP PARA O SELECT ----------
  const stockOnly = safeMother.filter((c) => c.status === 'stock');
  const typeOptionsSet = new Set(stockOnly.map((c) => c.type || 'OUTROS'));
  const typeOptions = Array.from(typeOptionsSet).sort();
  const hasTypeFilter = selectedTypes.length > 0;
  const typeFilterExportLabel = hasTypeFilter ? selectedTypes.join(', ') : 'Todos';
  const typeFilterUiLabel = !hasTypeFilter
    ? 'Todos os tipos'
    : selectedTypes.length <= 2
      ? selectedTypes.join(', ')
      : `${selectedTypes.length} tipos`;

  const isTypeSelected = (type) => selectedTypes.includes(type);

  const toggleTypeSelection = (type) => {
    setSelectedTypes((prev) => (
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type]
    ));
  };

  // ---------- APLICA FILTRO DE TIPO ----------
  const filteredMotherStock = stockOnly.filter((c) => {
    const t = c.type || 'OUTROS';
    if (!hasTypeFilter) return true;
    return selectedTypes.includes(t);
  });

  // Estoque total em kg (MP) — usa remainingWeight, se tiver
  const estoqueTotalKgReal = filteredMotherStock.reduce((acc, item) => {
    const peso = Number(item.remainingWeight) || Number(item.weight) || 0;
    return acc + peso;
  }, 0);

  const filteredMotherForFlow = safeMother.filter((c) => {
    const t = c.type || 'OUTROS';
    if (!hasTypeFilter) return true;
    return selectedTypes.includes(t);
  });

  const motherTypeById = safeMother.reduce((acc, coil) => {
    if (coil?.id != null) acc[String(coil.id)] = coil.type || 'OUTROS';
    return acc;
  }, {});

  const motherTypeByCode = safeMother.reduce((acc, coil) => {
    if (coil?.code != null) acc[String(coil.code)] = coil.type || 'OUTROS';
    return acc;
  }, {});

  const getCutLogType = (log) => {
    if (log?.motherType) return log.motherType;
    if (log?.motherId != null) {
      const byId = motherTypeById[String(log.motherId)];
      if (byId) return byId;
    }
    if (log?.motherCode != null) {
      const byCode = motherTypeByCode[String(log.motherCode)];
      if (byCode) return byCode;
    }
    return 'OUTROS';
  };

  // ---------- JANELA DE DATAS ----------
  const lastDays = getLastNDays(windowDays);
  const dateLabels = lastDays.map((d) => d.dateBR);

  // ---------- FILTROS POR JANELA (Produção / Expedição) ----------
  const filteredProdWindow = safeProd.filter((p) => {
    const d = normalizeDateBR(p.date);
    return d && dateLabels.includes(d);
  });

  const filteredShippingWindow = safeShipping.filter((s) => {
    const d = normalizeDateBR(s.date);
    return d && dateLabels.includes(d);
  });

  // PESOS DE PRODUÇÃO (window)
  const totalProdWeightKgWindow = filteredProdWindow.reduce((acc, p) => {
    const code = p.productCode || 'S/ COD';
    const qty = Number(p.pieces) || 0;
    const unit = getUnitWeight(code);
    return acc + unit * qty;
  }, 0);

  const totalProdPiecesWindow = filteredProdWindow.reduce(
    (acc, p) => acc + (Number(p.pieces) || 0),
    0
  );

  // PESOS DE EXPEDIÇÃO (window)
  const totalShippingWeightKgWindow = filteredShippingWindow.reduce((acc, s) => {
    const code = s.productCode || 'S/ COD';
    const qty = Number(s.quantity) || 0;
    const unit = getUnitWeight(code);
    return acc + unit * qty;
  }, 0);

  const totalShippingPiecesWindow = filteredShippingWindow.reduce(
    (acc, s) => acc + (Number(s.quantity) || 0),
    0
  );

  // ---------- FLUXO DE AÇO ----------
  const entryMap = groupByDate(
    filteredMotherForFlow,
    ['entryDate', 'date', 'createdAt'],
    (item) =>
      toNumber(item.weight ?? item.originalWeight ?? item.remainingWeight ?? 0)
  );
  const cutMap = groupByDate(
    safeCutting.filter((log) => {
      if (!hasTypeFilter) return true;
      return selectedTypes.includes(getCutLogType(log));
    }),
    ['date', 'createdAt', 'timestamp'],
    (item) => toNumber(item.inputWeight ?? item.totalWeight ?? item.weight ?? 0)
  );

  let saldoAcumulado = 0;
  const flowData = dateLabels.map((dateBR) => {
    const entrada = entryMap[dateBR] || 0;
    const consumo = cutMap[dateBR] || 0;
    saldoAcumulado += entrada - consumo;
    return {
      name: dateBR.slice(0, 5),
      dateBR,
      entrada,
      consumo,
      saldo: saldoAcumulado,
      saldoDiario: entrada - consumo,
    };
  });

  // ---------- AGING ----------
  const calculateSimpleAging = (list, dateField, weightField) => {
    const buckets = { '0-30': 0, '30-60': 0, '60-90': 0, '+90': 0 };
    const bucketsRaw = { '0-30': 0, '30-60': 0, '60-90': 0, '+90': 0 };
    const itemsByBucket = { '0-30': [], '30-60': [], '60-90': [], '+90': [] };

    list.forEach((item) => {
      if (item.status !== 'stock' && item.status !== 'in_process') return;

      const rawDate = item[dateField] || item.date || item.createdAt;
      const norm = normalizeDateBR(rawDate);
      if (!norm) return;

      const [d, m, y] = norm.split('/');
      const entryDate = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(entryDate.getTime())) return;

      const diffDays = Math.max(0, Math.ceil((now - entryDate) / MS_PER_DAY));

      const rawW = item[weightField] ?? item.weight ?? 0;
      const weight = Number(rawW) || 0;

      let bucketKey;
      if (diffDays <= 30) bucketKey = '0-30';
      else if (diffDays <= 60) bucketKey = '30-60';
      else if (diffDays <= 90) bucketKey = '60-90';
      else bucketKey = '+90';

      buckets[bucketKey] += weight;
      bucketsRaw[bucketKey] += weight;
      itemsByBucket[bucketKey].push({ ...item, _dias: diffDays, _peso: weight, _dataEntrada: norm });
    });

    const bucketKeyByName = { '0-30 dias': '0-30', '30-60 dias': '30-60', '60-90 dias': '60-90', '+90 dias': '+90' };

    const data = [
      { name: '0-30 dias', peso: buckets['0-30'], fill: '#10b981', bucket: '0-30' },
      { name: '30-60 dias', peso: buckets['30-60'], fill: '#3b82f6', bucket: '30-60' },
      { name: '60-90 dias', peso: buckets['60-90'], fill: '#f59e0b', bucket: '60-90' },
      { name: '+90 dias', peso: buckets['+90'], fill: '#ef4444', bucket: '+90' },
    ];

    const totalWeightWithDate = Object.values(bucketsRaw).reduce(
      (sum, w) => sum + w,
      0
    );

    return { data, bucketsRaw, totalWeightWithDate, itemsByBucket };
  };

   const {
    data: agingMother,
    bucketsRaw: bucketsMother,
    itemsByBucket: agingMotherItems,
  } = calculateSimpleAging(
    filteredMotherStock,
    'entryDate',
    'remainingWeight'
  );

  const { data: agingB2, itemsByBucket: agingB2Items } = calculateSimpleAging(
    b2Stock,
    'createdAt',
    'weight'
  );

  // handler de click no gráfico de aging
  const handleAgingBarClick = (chartType, bucketKey, items) => {
    if (!items || items.length === 0) return;
    setDrillDown({ type: chartType, bucket: bucketKey, items });
    setDrillSort({ key: 'dias', dir: 'desc' });
    setDrillSearch('');
  };


  // ---------- ESTOQUE POR TIPO ----------
  const stockByType = {};
  filteredMotherStock.forEach((c) => {
    const t = c.type || 'OUTROS';
    const rawW = c.remainingWeight ?? c.weight ?? 0;
    const w = Number(rawW) || 0;
    stockByType[t] = (stockByType[t] || 0) + w;
  });

  const typeData = Object.keys(stockByType)
    .map((k) => ({ name: k, value: stockByType[k] }))
    .sort((a, b) => b.value - a.value);

  // ---------- EXPEDIÇÃO por destino ----------
  const shippingDestMap = {};
  filteredShippingWindow.forEach((l) => {
    const d = (l.destination || 'ND').toUpperCase();
    if (d.includes('AJUSTE')) return;
    const q = Number(l.quantity) || 0;
    shippingDestMap[d] = (shippingDestMap[d] || 0) + q;
  });

  const shippingData = Object.keys(shippingDestMap)
    .map((k) => ({ name: k, value: shippingDestMap[k] }))
    .sort((a, b) => b.value - a.value);

  // ---------- KPIs ----------
  const consumoTotalJanela = flowData.reduce((acc, curr) => acc + curr.consumo, 0);
  const consumoMedioDiario =
    windowDays > 0 ? consumoTotalJanela / windowDays : 0;

  const entradaTotalJanela = flowData.reduce((acc, curr) => acc + curr.entrada, 0);
  const saldoPeriodoKg = entradaTotalJanela - consumoTotalJanela;

  const estoqueTotalT = formatKgToT(estoqueTotalKgReal).replace('t', '');

  const coberturaEstoqueDiasNum =
    consumoMedioDiario > 0 ? estoqueTotalKgReal / consumoMedioDiario : null;
  const coberturaEstoqueDias =
    coberturaEstoqueDiasNum != null
      ? coberturaEstoqueDiasNum.toFixed(1)
      : 'N/A';

  const pesoMais90 = bucketsMother['+90'] || 0;
  const percentualMais90 =
    estoqueTotalKgReal > 0
      ? ((pesoMais90 / estoqueTotalKgReal) * 100).toFixed(1)
      : 0;

const totalB2T = formatKgToT(totalB2KgReal).replace('t', '');

  const b2AvgAgeDays = (() => {
    if (b2Stock.length === 0) return null;
    let totalDays = 0;
    let count = 0;
    b2Stock.forEach((item) => {
      const norm = normalizeDateBR(item.createdAt);
      if (!norm) return;
      const [d, m, y] = norm.split('/');
      const createdDate = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(createdDate.getTime())) return;
      totalDays += Math.max(0, Math.ceil((now - createdDate) / MS_PER_DAY));
      count += 1;
    });
    if (!count) return null;
    return totalDays / count;
  })();

  // Produção e Expedição (window)
  const prodTotalT = formatKgToT(totalProdWeightKgWindow).replace('t', '');
  const expedicaoTotalT = formatKgToT(totalShippingWeightKgWindow).replace('t', '');

  const paStockMap = {};
  safeProd.forEach((log) => {
    const code = String(log.productCode || '').trim();
    if (!code) return;
    paStockMap[code] = (paStockMap[code] || 0) + toNumber(log.pieces);
  });
  safeShipping.forEach((log) => {
    const code = String(log.productCode || '').trim();
    if (!code) return;
    paStockMap[code] = (paStockMap[code] || 0) - toNumber(log.quantity);
  });
  const paStockItems = Object.keys(paStockMap).map((code) => {
    const pieces = Math.max(0, paStockMap[code] || 0);
    const unit = getUnitWeight(code);
    return { code, pieces, weight: pieces * unit };
  });
  const totalPaPieces = paStockItems.reduce((acc, item) => acc + item.pieces, 0);
  const totalPaWeightKg = paStockItems.reduce(
    (acc, item) => acc + item.weight,
    0
  );
  const paShippingPerDay =
    windowDays > 0 ? totalShippingWeightKgWindow / windowDays : 0;
  const coberturaPaDiasNum =
    paShippingPerDay > 0 ? totalPaWeightKg / paShippingPerDay : null;
  const coberturaPaDias =
    coberturaPaDiasNum != null ? coberturaPaDiasNum.toFixed(1) : 'N/A';

  const buildTopProducts = (list, qtyField) => {
    const map = {};
    list.forEach((item) => {
      const code = String(item.productCode || 'S/ COD').trim();
      const qty = toNumber(item[qtyField]);
      const unit = getUnitWeight(code);
      const weight = unit * qty;
      if (!map[code]) map[code] = { code, weight: 0, qty: 0 };
      map[code].weight += weight;
      map[code].qty += qty;
    });
    return Object.values(map)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  };

  const topProdData = buildTopProducts(filteredProdWindow, 'pieces');
  const topShipData = buildTopProducts(filteredShippingWindow, 'quantity');

  const windowOptions = [15, 30, 60];
  const applyWindowDays = (rawValue) => {
    const sanitized = Math.max(1, Math.min(365, parseInt(String(rawValue || '').replace(/\D/g, ''), 10) || windowDays));
    setWindowDays(sanitized);
    setCustomWindowInput(String(sanitized));
  };

  // ---------- FUNÇÕES DE RELATÓRIO PDF ----------
  const dateStamp = now.toISOString().slice(0, 10);

  const pdfHeader = (doc, title, subtitle) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(title, 14, 13);
    if (subtitle) {
      doc.setFontSize(8);
      doc.text(subtitle, 14, 19);
    }
    doc.setTextColor(0, 0, 0);
  };

  const handleExportKpisPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    pdfHeader(doc, 'Painel Tatico PCP - Resumo de KPIs', `Gerado em ${now.toLocaleDateString('pt-BR')} | Janela: ${windowDays} dias | Tipo MP: ${typeFilterExportLabel}`);
    autoTable(doc, {
      startY: 28,
      head: [['Indicador', 'Valor', 'Unidade', 'Observacao']],
      body: [
        ['Estoque MP', estoqueTotalT, 't', `${formatKg(estoqueTotalKgReal)}`],
        [`Consumo Total (${windowDays}d)`, formatKgToT(consumoTotalJanela).replace('t', ''), 't', `Media: ${consumoMedioDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg/dia`],
        ['Cobertura de MP', coberturaEstoqueDias, 'dias', 'Estoque / consumo medio'],
        [`Entrada MP (${windowDays}d)`, formatKgToT(entradaTotalJanela).replace('t', ''), 't', `Saldo: ${formatKgToT(saldoPeriodoKg)}`],
        [`Producao PA (${windowDays}d)`, prodTotalT, 't', `${formatPcs(totalProdPiecesWindow)}`],
        [`Expedicao PA (${windowDays}d)`, expedicaoTotalT, 't', `${formatPcs(totalShippingPiecesWindow)}`],
        ['Estoque PA', formatKgToT(totalPaWeightKg).replace('t', ''), 't', `${formatPcs(totalPaPieces)}`],
        ['Cobertura PA', coberturaPaDias, 'dias', 'Estoque / expedicao media'],
        ['B2 em estoque', totalB2T, 't', `${totalB2Count} bobinas`],
        ['Tempo medio B2', b2AvgAgeDays != null ? b2AvgAgeDays.toFixed(1) : 'N/A', 'dias', 'Bobinas em estoque'],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
    doc.save(`kpis_pcp_${dateStamp}.pdf`);
  };

  const handleExportAgingPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    pdfHeader(doc, 'Relatorio de Aging - Bobinas Mae (MP) e B2', `Gerado em ${now.toLocaleDateString('pt-BR')} | Tipo MP: ${typeFilterExportLabel}`);

    // Tabela resumo aging MP
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Aging - Bobinas Mae (MP)', 14, 30);
    autoTable(doc, {
      startY: 34,
      head: [['Faixa', 'Peso (kg)', 'Peso (t)', '% do Total']],
      body: agingMother.map((b) => [
        b.name,
        formatKg(b.peso),
        formatKgToT(b.peso),
        estoqueTotalKgReal > 0 ? `${((b.peso / estoqueTotalKgReal) * 100).toFixed(1)}%` : '0%',
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [88, 28, 135] },
      alternateRowStyles: { fillColor: [245, 243, 255] },
    });

    // Tabela resumo aging B2
    const y2 = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 80;
    doc.text('Aging - Bobinas Slitter (B2)', 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [['Faixa', 'Peso (kg)', 'Peso (t)', '% do Total']],
      body: agingB2.map((b) => [
        b.name,
        formatKg(b.peso),
        formatKgToT(b.peso),
        totalB2KgReal > 0 ? `${((b.peso / totalB2KgReal) * 100).toFixed(1)}%` : '0%',
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [67, 56, 202] },
      alternateRowStyles: { fillColor: [238, 242, 255] },
    });

    // Detalhamento bobinas MP
    const allMPItems = [...(agingMotherItems['0-30'] || []), ...(agingMotherItems['30-60'] || []), ...(agingMotherItems['60-90'] || []), ...(agingMotherItems['+90'] || [])];
    if (allMPItems.length > 0) {
      doc.addPage('a4', 'landscape');
      pdfHeader(doc, 'Detalhamento - Bobinas Mae por Aging', `Total: ${allMPItems.length} bobinas | ${formatKg(allMPItems.reduce((a, i) => a + i._peso, 0))}`);
      autoTable(doc, {
        startY: 28,
        head: [['Codigo', 'Tipo', 'Material', 'Largura', 'Espessura', 'Peso (kg)', 'Data Entrada', 'Dias', 'NF']],
        body: allMPItems.sort((a, b) => b._dias - a._dias).map((item) => [
          item.code || '-',
          item.type || '-',
          item.material || '-',
          item.width || '-',
          item.thickness || '-',
          formatKg(item._peso),
          item._dataEntrada || '-',
          `${item._dias}d`,
          item.nf || '-',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [88, 28, 135] },
        alternateRowStyles: { fillColor: [250, 245, 255] },
      });
    }

    // Detalhamento bobinas B2
    const allB2Items = [...(agingB2Items['0-30'] || []), ...(agingB2Items['30-60'] || []), ...(agingB2Items['60-90'] || []), ...(agingB2Items['+90'] || [])];
    if (allB2Items.length > 0) {
      doc.addPage('a4', 'landscape');
      pdfHeader(doc, 'Detalhamento - Bobinas B2 por Aging', `Total: ${allB2Items.length} bobinas | ${formatKg(allB2Items.reduce((a, i) => a + i._peso, 0))}`);
      autoTable(doc, {
        startY: 28,
        head: [['Codigo', 'Nome', 'Bobina Mae', 'Largura', 'Espessura', 'Peso (kg)', 'Data Entrada', 'Dias', 'NF']],
        body: allB2Items.sort((a, b) => b._dias - a._dias).map((item) => [
          item.code || item.b2Code || '-',
          item.name || item.b2Name || '-',
          item.motherCode || '-',
          item.width || '-',
          item.thickness || '-',
          formatKg(item._peso),
          item._dataEntrada || '-',
          `${item._dias}d`,
          item.nf || '-',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [67, 56, 202] },
        alternateRowStyles: { fillColor: [238, 242, 255] },
      });
    }

    doc.save(`aging_bobinas_${dateStamp}.pdf`);
  };

  const handleExportFluxoPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    pdfHeader(doc, `Fluxo de Aco - Entrada x Consumo (${windowDays} dias)`, `Gerado em ${now.toLocaleDateString('pt-BR')} | Tipo MP: ${typeFilterExportLabel}`);

    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Entrada (kg)', 'Consumo (kg)', 'Saldo Diario (kg)', 'Saldo Acumulado (kg)']],
      body: flowData.map((d) => [
        d.dateBR,
        formatKg(d.entrada),
        formatKg(d.consumo),
        formatKg(d.saldoDiario),
        formatKg(d.saldo),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      foot: [[
        'TOTAL',
        formatKg(entradaTotalJanela),
        formatKg(consumoTotalJanela),
        formatKg(saldoPeriodoKg),
        '',
      ]],
      footStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Estoque por tipo
    if (typeData.length > 0) {
      const y2 = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 100;
      doc.setFontSize(11);
      doc.text('Estoque MP por Tipo', 14, y2);
      autoTable(doc, {
        startY: y2 + 4,
        head: [['Tipo', 'Peso (kg)', 'Peso (t)', '% do Total']],
        body: typeData.map((t) => [
          t.name,
          formatKg(t.value),
          formatKgToT(t.value),
          estoqueTotalKgReal > 0 ? `${((t.value / estoqueTotalKgReal) * 100).toFixed(1)}%` : '0%',
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138] },
        alternateRowStyles: { fillColor: [239, 246, 255] },
      });
    }

    doc.save(`fluxo_aco_${windowDays}d_${dateStamp}.pdf`);
  };

  const handleExportCompletoPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    pdfHeader(doc, 'Relatorio Completo - Painel Tatico PCP', `Gerado em ${now.toLocaleDateString('pt-BR')} | Janela: ${windowDays} dias | Tipo MP: ${typeFilterExportLabel}`);

    // KPIs
    autoTable(doc, {
      startY: 28,
      head: [['Indicador', 'Valor', 'Unidade']],
      body: [
        ['Estoque MP', estoqueTotalT, 't'],
        [`Consumo Total (${windowDays}d)`, formatKgToT(consumoTotalJanela).replace('t', ''), 't'],
        ['Cobertura MP', coberturaEstoqueDias, 'dias'],
        [`Producao PA (${windowDays}d)`, prodTotalT, 't'],
        [`Expedicao PA (${windowDays}d)`, expedicaoTotalT, 't'],
        ['Estoque B2', totalB2T, 't'],
        ['Tempo medio B2', b2AvgAgeDays != null ? b2AvgAgeDays.toFixed(1) : 'N/A', 'dias'],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    // Aging MP
    let yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 80;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Aging - Bobinas Mae', 14, yPos);
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Faixa', 'Peso (kg)', '% do Total']],
      body: agingMother.map((b) => [b.name, formatKg(b.peso), estoqueTotalKgReal > 0 ? `${((b.peso / estoqueTotalKgReal) * 100).toFixed(1)}%` : '0%']),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [88, 28, 135] },
    });

    // Aging B2
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 140;
    doc.text('Aging - Bobinas B2', 14, yPos);
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Faixa', 'Peso (kg)', '% do Total']],
      body: agingB2.map((b) => [b.name, formatKg(b.peso), totalB2KgReal > 0 ? `${((b.peso / totalB2KgReal) * 100).toFixed(1)}%` : '0%']),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [67, 56, 202] },
    });

    // Fluxo de aço
    doc.addPage('a4', 'landscape');
    pdfHeader(doc, `Fluxo de Aco - Entrada x Consumo (${windowDays} dias)`, '');
    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Entrada (kg)', 'Consumo (kg)', 'Saldo Diario', 'Saldo Acumulado']],
      body: flowData.map((d) => [d.dateBR, formatKg(d.entrada), formatKg(d.consumo), formatKg(d.saldoDiario), formatKg(d.saldo)]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      foot: [['TOTAL', formatKg(entradaTotalJanela), formatKg(consumoTotalJanela), formatKg(saldoPeriodoKg), '']],
      footStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Top produtos
    if (topProdData.length > 0 || topShipData.length > 0) {
      doc.addPage('a4', 'landscape');
      pdfHeader(doc, `Top Produtos - Producao e Expedicao (${windowDays}d)`, '');
      if (topProdData.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Top 5 - Producao', 14, 30);
        autoTable(doc, {
          startY: 34,
          head: [['Codigo', 'Peso (kg)', 'Quantidade']],
          body: topProdData.map((p) => [p.code, formatKg(p.weight), formatPcs(p.qty)]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [5, 150, 105] },
        });
      }
      if (topShipData.length > 0) {
        const y3 = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 90;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Top 5 - Expedicao', 14, y3);
        autoTable(doc, {
          startY: y3 + 4,
          head: [['Codigo', 'Peso (kg)', 'Quantidade']],
          body: topShipData.map((s) => [s.code, formatKg(s.weight), formatPcs(s.qty)]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [217, 119, 6] },
        });
      }
    }

    // Detalhamento bobinas
    const allMPItems = [...(agingMotherItems['0-30'] || []), ...(agingMotherItems['30-60'] || []), ...(agingMotherItems['60-90'] || []), ...(agingMotherItems['+90'] || [])];
    if (allMPItems.length > 0) {
      doc.addPage('a4', 'landscape');
      pdfHeader(doc, 'Detalhamento - Bobinas Mae por Aging', `Total: ${allMPItems.length} bobinas`);
      autoTable(doc, {
        startY: 28,
        head: [['Codigo', 'Tipo', 'Material', 'Largura', 'Espessura', 'Peso (kg)', 'Data Entrada', 'Dias', 'NF']],
        body: allMPItems.sort((a, b) => b._dias - a._dias).map((item) => [
          item.code || '-', item.type || '-', item.material || '-', item.width || '-',
          item.thickness || '-', formatKg(item._peso), item._dataEntrada || '-', `${item._dias}d`, item.nf || '-',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [88, 28, 135] },
      });
    }

    const allB2Items = [...(agingB2Items['0-30'] || []), ...(agingB2Items['30-60'] || []), ...(agingB2Items['60-90'] || []), ...(agingB2Items['+90'] || [])];
    if (allB2Items.length > 0) {
      doc.addPage('a4', 'landscape');
      pdfHeader(doc, 'Detalhamento - Bobinas B2 por Aging', `Total: ${allB2Items.length} bobinas`);
      autoTable(doc, {
        startY: 28,
        head: [['Codigo', 'Nome', 'Bobina Mae', 'Largura', 'Espessura', 'Peso (kg)', 'Data Entrada', 'Dias', 'NF']],
        body: allB2Items.sort((a, b) => b._dias - a._dias).map((item) => [
          item.code || item.b2Code || '-', item.name || item.b2Name || '-', item.motherCode || '-',
          item.width || '-', item.thickness || '-', formatKg(item._peso), item._dataEntrada || '-', `${item._dias}d`, item.nf || '-',
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [67, 56, 202] },
      });
    }

    doc.save(`relatorio_completo_pcp_${dateStamp}.pdf`);
  };

  // ---------- KpiCard ----------
  // ---------- KpiCard ----------
const KpiCard = ({ title, value, unit, color = 'text-blue-400', subText = '', badge }) => (
  <div className="bg-gradient-to-b from-slate-900 to-slate-800/90 border border-white/5 rounded-2xl px-4 py-3 flex flex-col justify-between shadow-lg shadow-black/40">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </p>
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
          {badge}
        </span>
      )}
    </div>
    <div className="flex items-baseline justify-between">
      <span className={`text-2xl md:text-3xl font-semibold ${color}`}>{value}</span>
      <span className="text-xs font-semibold text-gray-500 ml-2">{unit}</span>
    </div>
    {subText && <p className="mt-1 text-[11px] text-gray-500">{subText}</p>}
  </div>
);

  
  // ---------- RENDER ----------
  return (
  <div className="space-y-6 pb-20">
    {/* CABEÇALHO + FILTROS */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.25em] text-cyan-400 uppercase">
          Painel Tático PCP
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
          <PieIcon size={24} className="text-cyan-500" />
          Indicadores de Aço & PA
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Baseado em {totalRecords.toLocaleString('pt-BR')} registros de bobinas, cortes,
          produção e expedição.
        </p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center gap-4">
          {/* Janela de análise */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase text-gray-500 tracking-wide">
              Janela de análise
            </span>
            <div className="inline-flex rounded-full bg-slate-900/80 border border-slate-700">
              {windowOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => applyWindowDays(opt)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-full transition
                    ${
                      windowDays === opt
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  {opt} dias
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={customWindowInput}
                onChange={(e) => setCustomWindowInput(e.target.value)}
                onBlur={() => applyWindowDays(customWindowInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyWindowDays(customWindowInput);
                  }
                }}
                className="w-20 bg-slate-900/80 border border-slate-700 text-xs text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-[10px] uppercase text-gray-500 tracking-wide">
                dias custom
              </span>
            </div>
          </div>

          {/* Filtro de tipo de MP */}
          <div className="relative flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase text-gray-500 tracking-wide">
              Tipo de MP
            </span>
            <button
              type="button"
              onClick={() => setIsTypeFilterOpen((prev) => !prev)}
              className="min-w-[180px] flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-700 text-xs text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <span className="truncate text-left">{typeFilterUiLabel}</span>
              <ArrowUpDown size={12} className="text-gray-400 shrink-0" />
            </button>
            {isTypeFilterOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTypes([]);
                    setIsTypeFilterOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition ${
                    !hasTypeFilter
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'text-gray-200 hover:bg-slate-800'
                  }`}
                >
                  Todos os tipos
                </button>
                <div className="max-h-64 overflow-y-auto border-t border-slate-800">
                  {typeOptions.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isTypeSelected(t)}
                        onChange={() => toggleTypeSelection(t)}
                        className="rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="truncate">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões de relatório PDF */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportKpisPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800/80 border border-slate-700 text-gray-300 hover:bg-cyan-900/40 hover:text-cyan-300 hover:border-cyan-700/50 transition-all"
          >
            <FileDown size={13} /> KPIs
          </button>
          <button
            onClick={handleExportAgingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800/80 border border-slate-700 text-gray-300 hover:bg-purple-900/40 hover:text-purple-300 hover:border-purple-700/50 transition-all"
          >
            <FileDown size={13} /> Aging
          </button>
          <button
            onClick={handleExportFluxoPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800/80 border border-slate-700 text-gray-300 hover:bg-blue-900/40 hover:text-blue-300 hover:border-blue-700/50 transition-all"
          >
            <FileDown size={13} /> Fluxo
          </button>
          <button
            onClick={handleExportCompletoPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-cyan-900/50 border border-cyan-700/40 text-cyan-300 hover:bg-cyan-800/60 hover:text-cyan-200 transition-all"
          >
            <FileDown size={13} /> Completo
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Dados consolidados da base operacional</span>
        </div>
      </div>
    </div>

    {/* KPIs PRINCIPAIS */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        title="Estoque MP"
        value={estoqueTotalT}
        unit="t"
        color="text-blue-400"
        subText={`Total de ${formatKg(estoqueTotalKgReal)}`}
      />
      <KpiCard
        title={`Consumo Total (${windowDays}d)`}
        value={formatKgToT(consumoTotalJanela).replace('t', '')}
        unit="t"
        color="text-red-400"
        subText={`Media: ${consumoMedioDiario.toLocaleString('pt-BR', {
          maximumFractionDigits: 0,
        })} kg/dia${hasTypeFilter ? ` • ${typeFilterUiLabel}` : ''}`}
      />
      <KpiCard
        title="Consumo Medio"
        value={consumoMedioDiario.toLocaleString('pt-BR', {
          maximumFractionDigits: 0,
        })}
        unit="kg/dia"
        color="text-indigo-400"
        subText={`Total de ${formatKg(consumoTotalJanela)} em ${windowDays} dias${hasTypeFilter ? ` • ${typeFilterUiLabel}` : ''}`}
      />
      <KpiCard
        title="Cobertura de MP"
        value={coberturaEstoqueDias}
        unit="dias"
        color={
          coberturaEstoqueDiasNum == null
            ? 'text-gray-400'
            : coberturaEstoqueDiasNum > 60
              ? 'text-green-400'
              : coberturaEstoqueDiasNum > 30
                ? 'text-yellow-400'
                : 'text-red-400'
        }
        subText="Estoque / consumo medio da janela"
      />
      <KpiCard
        title={`Entrada MP (${windowDays}d)`}
        value={formatKgToT(entradaTotalJanela).replace('t', '')}
        unit="t"
        color="text-cyan-400"
        subText={`Saldo: ${formatKgToT(saldoPeriodoKg).replace('t', '')}t`}
      />
      <KpiCard
        title="Saldo do Periodo"
        value={formatKgToT(saldoPeriodoKg).replace('t', '')}
        unit="t"
        color={saldoPeriodoKg >= 0 ? 'text-emerald-400' : 'text-amber-400'}
        subText={`Entrada - consumo (${windowDays}d)`}
      />
      <KpiCard
        title={`Producao PA (${windowDays}d)`}
        value={prodTotalT}
        unit="t"
        color="text-emerald-400"
        subText={`Qtd: ${formatPcs(totalProdPiecesWindow)}`}
      />
      <KpiCard
        title={`Expedicao PA (${windowDays}d)`}
        value={expedicaoTotalT}
        unit="t"
        color="text-amber-400"
        subText={`Qtd: ${formatPcs(totalShippingPiecesWindow)}`}
      />
      <KpiCard
        title="Estoque PA"
        value={formatKgToT(totalPaWeightKg).replace('t', '')}
        unit="t"
        color="text-emerald-300"
        subText={`Qtd: ${formatPcs(totalPaPieces)}`}
      />
      <KpiCard
        title="Cobertura PA"
        value={coberturaPaDias}
        unit="dias"
        color={
          coberturaPaDiasNum == null
            ? 'text-gray-400'
            : coberturaPaDiasNum > 30
              ? 'text-green-400'
              : coberturaPaDiasNum > 15
                ? 'text-yellow-400'
                : 'text-red-400'
        }
        subText="Estoque / expedicao media"
      />
      <KpiCard
        title="B2 em estoque"
        value={totalB2T}
        unit="t"
        color="text-purple-400"
        subText={`Total de ${totalB2Count} bobinas`}
      />
      <KpiCard
        title="Tempo medio B2"
        value={b2AvgAgeDays != null ? b2AvgAgeDays.toFixed(1) : 'N/A'}
        unit="dias"
        color={b2AvgAgeDays == null ? 'text-gray-400' : 'text-indigo-300'}
        subText="Baseado nas bobinas em estoque"
      />
    </div>

      {/* Fluxo de Aco */}
<div className="bg-gradient-to-b from-slate-900 to-slate-800/90 border border-slate-700/60 rounded-2xl px-5 py-4 shadow-xl shadow-black/40 h-[430px] flex flex-col">
  <div className="flex items-center justify-between mb-3">
    <div>
      <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
        <span className="inline-block w-1.5 h-5 rounded-full bg-blue-500" />
        Fluxo de Aço: Entrada x Consumo
      </h3>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Janela de {windowDays} dias • saldo acumulado em kg{hasTypeFilter ? ` • ${typeFilterUiLabel}` : ''}
      </p>
    </div>
    <span className="text-[11px] text-gray-500">
      Eixo esquerdo: fluxo diário • Eixo direito: saldo
    </span>
  </div>

  <div className="flex-1 w-full min-h-0">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={flowData}
        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2933"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
        />
        <YAxis
          yAxisId="left"
          stroke="#6b7280"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickFormatter={(val) => formatKgToT(val)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#f59e0b"
          tick={{ fill: '#fbbf24', fontSize: 11 }}
          tickFormatter={(val) => formatKgToT(val)}
        />
        <Tooltip content={<CustomFlowTooltip />} />
        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingBottom: 8 }}
        />

        <Area
          yAxisId="left"
          type="monotone"
          dataKey="entrada"
          name="Entrada (kg)"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorEntrada)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="consumo"
          name="Consumo (kg)"
          stroke="#ef4444"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorConsumo)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Bar
          yAxisId="right"
          dataKey="saldoDiario"
          name="Saldo Diário (kg)"
          fill="#f59e0b"
          barSize={6}
          radius={[3, 3, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
</div>


      {/* Aging / Estoque / Expedição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging MP */}
        {/* Aging MP */}
<div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-4 shadow-lg shadow-black/40 h-[340px] flex flex-col">
  <div className="flex justify-between items-center mb-3">
    <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
      <span className="inline-block w-1.5 h-5 rounded-full bg-purple-500" />
      Aging: Bobinas Mãe (MP)
    </h3>
    <span className="text-[10px] text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-full">
      {typeFilterUiLabel}
    </span>
  </div>
  <p className="text-[10px] text-gray-500 mb-1">Clique em uma barra para ver detalhes</p>
  <div className="flex-1 w-full min-h-0">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={agingMother}
        layout="vertical"
        margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2933"
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke="#9ca3af"
          tickFormatter={(val) => formatKgToT(val)}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#e5e7eb"
          width={80}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: '#ffffff08' }}
          contentStyle={{
            backgroundColor: '#020617',
            borderColor: '#1f2937',
            fontSize: 11,
          }}
          formatter={(value) => [`${formatKg(value)}`, 'Peso']}
        />
        <Bar dataKey="peso" radius={[0, 6, 6, 0]} barSize={18}
          onClick={(data) => {
            if (data && data.bucket) handleAgingBarClick('MP', data.bucket, agingMotherItems[data.bucket]);
          }}
          className="cursor-pointer"
        >
          {agingMother.map((entry, index) => (
            <Cell key={`cell-mother-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


        {/* Estoque MP por Tipo */}
        {/* Estoque MP por Tipo */}
<div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-4 shadow-lg shadow-black/40 h-[340px] flex flex-col">
  <div className="flex justify-between items-center mb-3">
    <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
      <span className="inline-block w-1.5 h-5 rounded-full bg-blue-500" />
      Estoque MP por Tipo (Top 5)
    </h3>
    <span className="text-[10px] text-gray-400">
      Ordenado por peso em estoque
    </span>
  </div>
  <div className="flex-1 w-full min-h-0">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={typeData.slice(0, 5)}
        layout="vertical"
        margin={{ left: 20, right: 30, top: 5, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1f2933"
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke="#9ca3af"
          tickFormatter={(val) => formatKgToT(val)}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#e5e7eb"
          width={60}
          tick={{ fontSize: 11, fontWeight: 'bold' }}
        />
        <Tooltip
          cursor={{ fill: '#ffffff08' }}
          contentStyle={{
            backgroundColor: '#020617',
            borderColor: '#1f2937',
            fontSize: 11,
          }}
          formatter={(value) => [`${formatKg(value)}`, 'Peso']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
          {typeData.slice(0, 5).map((entry, index) => (
            <Cell
              key={`cell-type-${index}`}
              fill={PIE_COLORS[index % PIE_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>


        {/* Aging B2 + Expedição */}
<div className="space-y-4">
  {/* Aging B2 */}
  <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-3 shadow-lg shadow-black/40 h-[160px] flex flex-col">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-semibold text-gray-100 text-xs flex items-center gap-2">
        <span className="inline-block w-1.5 h-4 rounded-full bg-indigo-500" />
        Aging: Bobinas Slitter (B2)
      </h3>
      <span className="text-[10px] text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded-full">
        Em processo
      </span>
    </div>
    <p className="text-[10px] text-gray-500 mb-1">Clique em uma barra para ver detalhes</p>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={agingB2}
          layout="vertical"
          margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#e5e7eb"
            width={65}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{
              backgroundColor: '#020617',
              borderColor: '#1f2937',
              fontSize: 11,
            }}
            formatter={(value) => [`${formatKg(value)}`, 'Peso']}
          />
          <Bar dataKey="peso" radius={[0, 6, 6, 0]} barSize={12}
            onClick={(data) => {
              if (data && data.bucket) handleAgingBarClick('B2', data.bucket, agingB2Items[data.bucket]);
            }}
            className="cursor-pointer"
          >
            {agingB2.map((entry, index) => (
              <Cell key={`cell-b2-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  {/* Expedição por destino */}
  <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-3 shadow-lg shadow-black/40 h-[160px] flex flex-col">
    <div className="flex justify-between items-center mb-1">
      <h3 className="font-semibold text-gray-100 text-xs flex items-center gap-2">
        <span className="inline-block w-1.5 h-4 rounded-full bg-amber-500" />
        Expedição por Destino ({windowDays}d)
      </h3>
    </div>
    <div className="flex-1 w-full min-h-0 flex items-center justify-center">
      {shippingData.length === 0 ? (
        <span className="text-gray-500 text-xs">
          Sem dados de expedição no período.
        </span>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={shippingData}
              cx="50%"
              cy="50%"
              innerRadius={26}
              outerRadius={48}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {shippingData.map((entry, index) => (
                <Cell
                  key={`cell-ship-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#020617',
                borderColor: '#1f2937',
                fontSize: 11,
              }}
              formatter={(value, name) => [formatPcs(value), name]}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: '9px', color: '#9ca3af' }}
            />
          </RechartsPie>
        </ResponsiveContainer>
      )}
    </div>
  </div>
</div>

      </div>

      {/* Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-4 shadow-lg shadow-black/40 h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 rounded-full bg-emerald-500" />
              Top 5 Produtos - Producao ({windowDays}d)
            </h3>
            <span className="text-[10px] text-gray-400">Peso total em kg</span>
          </div>
          <div className="flex-1 w-full min-h-0">
            {topProdData.length === 0 ? (
              <span className="text-gray-500 text-xs">Sem dados no periodo.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProdData}
                  layout="vertical"
                  margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2933"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    tickFormatter={(val) => formatKgToT(val)}
                  />
                  <YAxis
                    dataKey="code"
                    type="category"
                    stroke="#e5e7eb"
                    width={70}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#1f2937',
                      fontSize: 11,
                    }}
                    formatter={(value) => [formatKg(value), 'Peso']}
                  />
                  <Bar dataKey="weight" radius={[0, 6, 6, 0]} barSize={18}>
                    {topProdData.map((entry, index) => (
                      <Cell
                        key={`cell-top-prod-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-4 shadow-lg shadow-black/40 h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 rounded-full bg-amber-500" />
              Top 5 Produtos - Expedicao ({windowDays}d)
            </h3>
            <span className="text-[10px] text-gray-400">Peso total em kg</span>
          </div>
          <div className="flex-1 w-full min-h-0">
            {topShipData.length === 0 ? (
              <span className="text-gray-500 text-xs">Sem dados no periodo.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topShipData}
                  layout="vertical"
                  margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2933"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    tickFormatter={(val) => formatKgToT(val)}
                  />
                  <YAxis
                    dataKey="code"
                    type="category"
                    stroke="#e5e7eb"
                    width={70}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#1f2937',
                      fontSize: 11,
                    }}
                    formatter={(value) => [formatKg(value), 'Peso']}
                  />
                  <Bar dataKey="weight" radius={[0, 6, 6, 0]} barSize={18}>
                    {topShipData.map((entry, index) => (
                      <Cell
                        key={`cell-top-ship-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ===== DRILL-DOWN PANEL — Detalhes das bobinas ===== */}
      {drillDown && (() => {
        const { type, bucket, items } = drillDown;
        const isMP = type === 'MP';
        const title = isMP ? 'Bobinas Mãe (MP)' : 'Bobinas Slitter (B2)';
        const bucketColors = { '0-30': '#10b981', '30-60': '#3b82f6', '60-90': '#f59e0b', '+90': '#ef4444' };

        const filtered = items.filter((item) => {
          if (!drillSearch) return true;
          const s = drillSearch.toLowerCase();
          const code = String(item.code || item.b2Code || '').toLowerCase();
          const name = String(item.name || item.b2Name || item.material || '').toLowerCase();
          const type2 = String(item.type || '').toLowerCase();
          const nf = String(item.nf || '').toLowerCase();
          const motherCode = String(item.motherCode || '').toLowerCase();
          return code.includes(s) || name.includes(s) || type2.includes(s) || nf.includes(s) || motherCode.includes(s);
        });

        const sorted = [...filtered].sort((a, b) => {
          const { key, dir } = drillSort;
          let va, vb;
          if (key === 'dias') { va = a._dias; vb = b._dias; }
          else if (key === 'peso') { va = a._peso; vb = b._peso; }
          else if (key === 'code') { va = String(a.code || a.b2Code || ''); vb = String(b.code || b.b2Code || ''); }
          else if (key === 'type') { va = String(a.type || ''); vb = String(b.type || ''); }
          else if (key === 'width') { va = Number(a.width) || 0; vb = Number(b.width) || 0; }
          else if (key === 'thickness') { va = Number(a.thickness) || 0; vb = Number(b.thickness) || 0; }
          else { va = a[key]; vb = b[key]; }

          if (typeof va === 'string') {
            const cmp = va.localeCompare(vb);
            return dir === 'asc' ? cmp : -cmp;
          }
          return dir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
        });

        const toggleSort = (key) => {
          setDrillSort((prev) =>
            prev.key === key
              ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
              : { key, dir: 'desc' }
          );
        };

        const SortHeader = ({ label, sortKey, width }) => (
          <th
            className={`px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors select-none ${width || ''}`}
            onClick={() => toggleSort(sortKey)}
          >
            <span className="flex items-center gap-1">
              {label}
              <ArrowUpDown size={10} className={drillSort.key === sortKey ? 'text-cyan-400' : 'text-gray-600'} />
            </span>
          </th>
        );

        const totalPeso = sorted.reduce((acc, i) => acc + i._peso, 0);
        const avgDias = sorted.length > 0 ? (sorted.reduce((acc, i) => acc + i._dias, 0) / sorted.length).toFixed(1) : 0;

        return (
          <div className="bg-slate-900/95 border border-slate-600/60 rounded-2xl px-5 py-4 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="inline-block w-2 h-6 rounded-full" style={{ backgroundColor: bucketColors[bucket] }} />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {title} — Faixa {bucket} dias
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {sorted.length} bobina{sorted.length !== 1 ? 's' : ''} · {formatKg(totalPeso)} · Idade média: {avgDias} dias
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Busca */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por código, material, tipo, NF..."
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* Tabela */}
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-700/40">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/90 sticky top-0 z-10">
                  <tr>
                    <SortHeader label="Código" sortKey="code" />
                    {isMP ? (
                      <>
                        <SortHeader label="Tipo" sortKey="type" />
                        <SortHeader label="Material" sortKey="material" />
                        <SortHeader label="Larg." sortKey="width" />
                        <SortHeader label="Esp." sortKey="thickness" />
                      </>
                    ) : (
                      <>
                        <SortHeader label="Nome" sortKey="name" />
                        <SortHeader label="Mãe" sortKey="motherCode" />
                        <SortHeader label="Larg." sortKey="width" />
                        <SortHeader label="Esp." sortKey="thickness" />
                      </>
                    )}
                    <SortHeader label="Peso (kg)" sortKey="peso" />
                    <SortHeader label="Entrada" sortKey="dias" />
                    <SortHeader label="Dias" sortKey="dias" />
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase">NF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={isMP ? 9 : 9} className="text-center text-gray-500 py-6">Nenhuma bobina encontrada</td></tr>
                  ) : sorted.map((item, idx) => {
                    const code = item.code || item.b2Code || '-';
                    const diasColor = item._dias > 90 ? 'text-red-400' : item._dias > 60 ? 'text-yellow-400' : item._dias > 30 ? 'text-blue-400' : 'text-green-400';
                    return (
                      <tr key={`drill-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-3 py-2 text-cyan-300 font-mono text-xs">{code}</td>
                        {isMP ? (
                          <>
                            <td className="px-3 py-2 text-gray-300 text-xs">{item.type || '-'}</td>
                            <td className="px-3 py-2 text-gray-300 text-xs max-w-[140px] truncate" title={item.material}>{item.material || '-'}</td>
                            <td className="px-3 py-2 text-gray-300 text-xs">{item.width || '-'}</td>
                            <td className="px-3 py-2 text-gray-300 text-xs">{item.thickness || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-gray-300 text-xs max-w-[140px] truncate" title={item.name || item.b2Name}>{item.name || item.b2Name || '-'}</td>
                            <td className="px-3 py-2 text-gray-400 font-mono text-xs">{item.motherCode || '-'}</td>
                            <td className="px-3 py-2 text-gray-300 text-xs">{item.width || '-'}</td>
                            <td className="px-3 py-2 text-gray-300 text-xs">{item.thickness || '-'}</td>
                          </>
                        )}
                        <td className="px-3 py-2 text-gray-200 text-xs font-medium text-right">{formatKg(item._peso)}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{item._dataEntrada}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${diasColor}`}>{item._dias}d</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{item.nf || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo rodapé */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
              <span>Total: {sorted.length} bobina{sorted.length !== 1 ? 's' : ''}</span>
              <span>Peso total: {formatKg(totalPeso)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default IndicatorsDashboard;
