// src/components/IndicatorsDashboard.jsx
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

const CustomFlowTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entrada = payload.find(p => p.dataKey === 'entrada')?.value || 0;
    const consumo = payload.find(p => p.dataKey === 'consumo')?.value || 0;
    const saldo = payload.find(p => p.dataKey === 'saldo')?.value || 0;

    return (
      <div className="bg-gray-900/90 p-3 border border-gray-700 rounded shadow-xl text-sm text-white">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-blue-400">Entrada: {formatKg(entrada)}</p>
        <p className="text-red-400">Consumo: {formatKg(consumo)}</p>
        <p className={`mt-1 font-bold ${saldo >= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
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
  const [windowDays, setWindowDays] = useState(15);    // 15 / 30 / 60

  // listas seguras
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeChild = Array.isArray(childCoils) ? childCoils : [];
  const safeCutting = Array.isArray(cuttingLogs) ? cuttingLogs : [];
  const safeShipping = Array.isArray(shippingLogs) ? shippingLogs : [];
  const safeProd = Array.isArray(productionLogs) ? productionLogs : [];

  const totalRecords = safeMother.length + safeChild.length + safeProd.length;

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const normalizeDateBR = (raw) => {
    if (!raw) return null;
    let dateStr = String(raw).trim();

    // corta hora ISO
    if (dateStr.length >= 10 && dateStr.includes('T')) {
      dateStr = dateStr.slice(0, 10);
    }

    // yyyy-mm-dd
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      if (y && y.length === 4 && m && d) {
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }

    // dd/mm/yyyy
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      if (d && m && y) {
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.padStart(4, '0')}`;
      }
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

  const groupByDate = (list, dateField, valueField) => {
    const map = {};
    list.forEach(item => {
      const d = normalizeDateBR(item[dateField]);
      if (!d) return;
      const rawVal = item[valueField];
      const val = Number(rawVal) || 0;
      map[d] = (map[d] || 0) + val;
    });
    return map;
  };

  // ---------- TIPOS MP PARA O SELECT ----------
  const stockOnly = safeMother.filter(c => c.status === 'stock');
  const typeOptionsSet = new Set(stockOnly.map(c => c.type || 'OUTROS'));
  const typeOptions = Array.from(typeOptionsSet).sort();

  // ---------- APLICA FILTRO DE TIPO ----------
  const filteredMotherStock = stockOnly.filter(c => {
    const t = c.type || 'OUTROS';
    if (typeFilter === 'ALL') return true;
    return t === typeFilter;
  });

  const filteredMotherForFlow = safeMother.filter(c => {
    const t = c.type || 'OUTROS';
    if (typeFilter === 'ALL') return true;
    return t === typeFilter;
  });

  // ---------- JANELA DE DATAS ----------
  const lastDays = getLastNDays(windowDays);
  const dateLabels = lastDays.map(d => d.dateBR);

  // ---------- FLUXO DE AÇO ----------
  const entryMap = groupByDate(filteredMotherForFlow, 'entryDate', 'weight');
  const cutMap = groupByDate(safeCutting, 'date', 'inputWeight');

  let saldoAcumulado = 0;
  const flowData = dateLabels.map(dateBR => {
    const entrada = entryMap[dateBR] || 0;
    const consumo = cutMap[dateBR] || 0;
    saldoAcumulado += (entrada - consumo);
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

    list.forEach(item => {
      if (item.status !== 'stock' && item.status !== 'in_process') return;

      const rawDate = item[dateField] || item.date || item.createdAt;
      const norm = normalizeDateBR(rawDate);
      if (!norm) return;

      const [d, m, y] = norm.split('/');
      const entryDate = new Date(Number(y), Number(m) - 1, Number(d));
      if (isNaN(entryDate.getTime())) return;

      const diffDays = Math.max(
        0,
        Math.ceil((now - entryDate) / MS_PER_DAY)
      );

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

    const totalWeight = Object.values(bucketsRaw).reduce((sum, w) => sum + w, 0);

    return { data, bucketsRaw, totalWeight };
  };

  const {
    data: agingMother,
    bucketsRaw: bucketsMother,
    totalWeight: estoqueTotalKg,
  } = calculateSimpleAging(
    filteredMotherStock,
    'entryDate',
    'remainingWeight'
  );

  const {
    data: agingB2,
    totalWeight: totalB2Kg,
  } = calculateSimpleAging(
    safeChild.filter(c => c.status === 'in_process'),
    'createdAt',
    'weight'
  );

  // ---------- ESTOQUE POR TIPO ----------
  const stockByType = {};
  filteredMotherStock.forEach(c => {
    const t = c.type || 'OUTROS';
    const rawW = c.remainingWeight ?? c.weight ?? 0;
    const w = Number(rawW) || 0;
    stockByType[t] = (stockByType[t] || 0) + w;
  });

  const typeData = Object.keys(stockByType)
    .map(k => ({ name: k, value: stockByType[k] }))
    .sort((a, b) => b.value - a.value);

  // ---------- EXPEDIÇÃO ----------
  const shippingDestMap = {};
  safeShipping.forEach(l => {
    const logDate = normalizeDateBR(l.date);
    if (!logDate || !dateLabels.includes(logDate)) return;

    const d = (l.destination || 'ND').toUpperCase();
    if (d.includes('AJUSTE')) return;
    const q = Number(l.quantity) || 0;
    shippingDestMap[d] = (shippingDestMap[d] || 0) + q;
  });

  const shippingData = Object.keys(shippingDestMap)
    .map(k => ({ name: k, value: shippingDestMap[k] }))
    .sort((a, b) => b.value - a.value);

  // ---------- KPIs ----------
  const consumoTotalJanela = flowData.reduce((acc, curr) => acc + curr.consumo, 0);
  const consumoMedioDiario = windowDays > 0 ? (consumoTotalJanela / windowDays) : 0;
  const estoqueTotalT = formatKgToT(estoqueTotalKg).replace('t', '');
  const coberturaEstoqueDiasNum =
    consumoMedioDiario > 0 ? (estoqueTotalKg / consumoMedioDiario) : null;
  const coberturaEstoqueDias = coberturaEstoqueDiasNum != null
    ? coberturaEstoqueDiasNum.toFixed(1)
    : 'N/A';
  const pesoMais90 = bucketsMother['+90'] || 0;
  const percentualMais90 = estoqueTotalKg > 0
    ? ((pesoMais90 / estoqueTotalKg) * 100).toFixed(1)
    : 0;
  const totalB2T = formatKgToT(totalB2Kg).replace('t', '');
  const expedicaoTotalJanela = shippingData.reduce((acc, curr) => acc + curr.value, 0);

  // ---------- KpiCard ----------
  const KpiCard = ({ title, value, unit, color = 'text-blue-400', subText = '' }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between h-28">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <div className="flex items-end justify-between">
        <span className={`text-4xl font-extrabold ${color}`}>
          {value}
        </span>
        <span className="text-lg font-semibold text-gray-500 ml-2">{unit}</span>
      </div>
      {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
    </div>
  );

  // ---------- RENDER ----------
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Título + filtros */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <PieIcon size={28} className="text-cyan-500" /> Dashboard Tático PCP
          </h2>
          <p className="text-gray-400 text-sm">
            Visão tática baseada em {totalRecords.toLocaleString('pt-BR')} registros
          </p>
        </div>

        <div className="flex gap-4">
          {/* Filtro Tipo MP */}
          <select
            className="bg-gray-700 text-white p-2 rounded text-sm border border-gray-600"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Todos os Tipos</option>
            {typeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Filtro Janela */}
          <select
            className="bg-gray-700 text-white p-2 rounded text-sm border border-gray-600"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
          >
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Estoque MP"
          value={estoqueTotalT}
          unit="t"
          color="text-blue-400"
          subText={`Total de ${formatKg(estoqueTotalKg)}`}
        />
        <KpiCard
          title="Consumo Médio"
          value={consumoMedioDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          unit="kg/dia"
          color="text-indigo-400"
          subText={`Total de ${formatKg(consumoTotalJanela)} em ${windowDays}d`}
        />
        <KpiCard
          title="Cobertura"
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
          subText="Estoque / Consumo Médio"
        />
        <KpiCard
          title="% Estoque > 90d"
          value={percentualMais90}
          unit="%"
          color={percentualMais90 > 5 ? 'text-red-400' : percentualMais90 > 1 ? 'text-yellow-400' : 'text-green-400'}
          subText={`Peso: ${formatKgToT(pesoMais90)}`}
        />
        <KpiCard
          title="B2 em Processo"
          value={totalB2T}
          unit="t"
          color="text-purple-400"
          subText={`Total de ${formatKg(totalB2Kg)}`}
        />
        <KpiCard
          title={`Expedição (${windowDays}d)`}
          value={expedicaoTotalJanela.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          unit="pçs"
          color="text-amber-400"
          subText={`Média: ${(expedicaoTotalJanela / windowDays || 0).toFixed(0)} pçs/dia`}
        />
      </div>

      {/* Fluxo de Aço */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-[450px] flex flex-col">
        <h3 className="font-bold text-gray-200 mb-4 pl-2 border-l-4 border-blue-500">
          Fluxo de Aço: Entrada vs Consumo ({windowDays}d)
        </h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={flowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(val) => formatKgToT(val)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#f59e0b', fontSize: 12 }}
                tickFormatter={(val) => formatKgToT(val)}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <Tooltip content={<CustomFlowTooltip />} />
              <Legend verticalAlign="top" height={36} />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="entrada"
                name="Entrada (kg)"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorEntrada)"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="consumo"
                name="Consumo (kg)"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorConsumo)"
              />
              <Bar
                yAxisId="right"
                dataKey="saldoDiario"
                name="Saldo Diário (kg)"
                fill="#f59e0b"
                barSize={5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging / Estoque / Expedição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging MP */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-200 pl-2 border-l-4 border-purple-500">
              Aging: Bobinas Mãe (MP)
            </h3>
            <span className="text-xs text-purple-400 bg-purple-900/20 px-2 py-1 rounded">
              {typeFilter === 'ALL' ? 'Todos os tipos' : `Tipo ${typeFilter}`}
            </span>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingMother} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  tickFormatter={(val) => formatKgToT(val)}
                />
                <YAxis dataKey="name" type="category" stroke="#fff" width={80} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: '#ffffff10' }}
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                  formatter={(value) => [`${formatKg(value)}`, 'Peso']}
                />
                <Bar dataKey="peso" radius={[0, 4, 4, 0]} barSize={20}>
                  {agingMother.map((entry, index) => (
                    <Cell key={`cell-mother-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estoque MP por Tipo */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-[350px] flex flex-col">
          <h3 className="font-bold text-gray-200 mb-4 pl-2 border-l-4 border-blue-500">
            Estoque MP por Tipo (Top 5)
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData.slice(0, 5)} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  tickFormatter={(val) => formatKgToT(val)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#fff"
                  width={60}
                  tick={{ fontSize: 12, fontWeight: 'bold' }}
                />
                <Tooltip
                  cursor={{ fill: '#ffffff10' }}
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                  formatter={(value) => [`${formatKg(value)}`, 'Peso']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                  {typeData.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-type-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aging B2 + Expedição */}
        <div className="space-y-6">
          {/* Aging B2 */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-[163px] flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-200 pl-2 border-l-4 border-indigo-500 text-sm">
                Aging: Bobinas Slitter (B2)
              </h3>
              <span className="text-xs text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
                Em Processo
              </span>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingB2} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide tickFormatter={(val) => formatKgToT(val)} />
                  <YAxis dataKey="name" type="category" stroke="#fff" width={60} tick={{ fontSize: 10 }} />
                  <Tooltip
                    cursor={{ fill: '#ffffff10' }}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                    formatter={(value) => [`${formatKg(value)}`, 'Peso']}
                  />
                  <Bar dataKey="peso" radius={[0, 4, 4, 0]} barSize={10}>
                    {agingB2.map((entry, index) => (
                      <Cell key={`cell-b2-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expedição por destino */}
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-[163px] flex flex-col">
            <h3 className="font-bold text-gray-200 mb-2 pl-2 border-l-4 border-amber-500 text-sm">
              Expedição por Destino ({windowDays}d)
            </h3>
            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
              {shippingData.length === 0 ? (
                <span className="text-gray-500 text-sm">
                  Sem dados de expedição no período.
                </span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={shippingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                        backgroundColor: '#1f2937',
                        borderColor: '#374151',
                      }}
                      formatter={(value, name) => [`${formatPcs(value)}`, name]}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsDashboard;
