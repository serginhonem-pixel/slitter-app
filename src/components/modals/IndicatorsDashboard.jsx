import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
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
  const [typeFilter, setTypeFilter] = useState('ALL'); // tipo MP
  const [windowDays, setWindowDays] = useState(15); // 15 / 30 / 60

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

  // ---------- APLICA FILTRO DE TIPO ----------
  const filteredMotherStock = stockOnly.filter((c) => {
    const t = c.type || 'OUTROS';
    if (typeFilter === 'ALL') return true;
    return t === typeFilter;
  });

  // Estoque total em kg (MP) — usa remainingWeight, se tiver
  const estoqueTotalKgReal = filteredMotherStock.reduce((acc, item) => {
    const peso = Number(item.remainingWeight) || Number(item.weight) || 0;
    return acc + peso;
  }, 0);

  const filteredMotherForFlow = safeMother.filter((c) => {
    const t = c.type || 'OUTROS';
    if (typeFilter === 'ALL') return true;
    return t === typeFilter;
  });

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
    safeCutting,
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
    });

    const data = [
      { name: '0-30 dias', peso: buckets['0-30'], fill: '#10b981' },
      { name: '30-60 dias', peso: buckets['30-60'], fill: '#3b82f6' },
      { name: '60-90 dias', peso: buckets['60-90'], fill: '#f59e0b' },
      { name: '+90 dias', peso: buckets['+90'], fill: '#ef4444' },
    ];

    const totalWeightWithDate = Object.values(bucketsRaw).reduce(
      (sum, w) => sum + w,
      0
    );

    return { data, bucketsRaw, totalWeightWithDate };
  };

   const {
    data: agingMother,
    bucketsRaw: bucketsMother,
  } = calculateSimpleAging(
    filteredMotherStock,
    'entryDate',
    'remainingWeight'
  );

  const { data: agingB2 } = calculateSimpleAging(
    b2Stock,
    'createdAt',
    'weight'
  );


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
                  onClick={() => setWindowDays(opt)}
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
          </div>

          {/* Filtro de tipo de MP */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase text-gray-500 tracking-wide">
              Tipo de MP
            </span>
            <select
              className="bg-slate-900/80 border border-slate-700 text-xs text-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Todos os tipos</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
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
        })} kg/dia`}
      />
      <KpiCard
        title="Consumo Medio"
        value={consumoMedioDiario.toLocaleString('pt-BR', {
          maximumFractionDigits: 0,
        })}
        unit="kg/dia"
        color="text-indigo-400"
        subText={`Total de ${formatKg(consumoTotalJanela)} em ${windowDays} dias`}
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
        Janela de {windowDays} dias • saldo acumulado em kg
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
      {typeFilter === 'ALL' ? 'Todos os tipos' : `Tipo ${typeFilter}`}
    </span>
  </div>
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
        <Bar dataKey="peso" radius={[0, 6, 6, 0]} barSize={18}>
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
          <Bar dataKey="peso" radius={[0, 6, 6, 0]} barSize={12}>
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
    </div>
  );
};

export default IndicatorsDashboard;
