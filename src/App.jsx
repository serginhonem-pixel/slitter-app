import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import backupData from "./backups/slitter-backup.json";
import PaginationControls from './components/common/PaginationControls';
import Dashboard from './components/Dashboard/Dashboard';
import Login from './components/Login';
import IndicatorsDashboard from './components/modals/IndicatorsDashboard.jsx';
import Button from './components/ui/Button';

import { auth, db, deleteFromDb, isLocalHost, loadFromDb, logoutUser, saveToDb, updateInDb } from './services/api'; // Certifique-se de exportar 'db' no seu arquivo de configuração

import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Factory,
  FileText,
  History, LayoutDashboard,
  List,
  LogOut,
  Menu,
  PieChart,
  Plus,
  Printer,
  Scissors,
  ScrollText,
  Search,
  Camera,
  ScanLine,
  Shield,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  X,
  Zap,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';



import CutDetailsModal from './components/modals/CutDetailsModal';
import CutEventDetailsModal from './components/modals/CutEventDetailsModal';
import ProductionEventDetailsModal from './components/modals/ProductionEventDetailsModal';
import ShippingEventDetailsModal from './components/modals/ShippingEventDetailsModal';
import EditMotherCoilModal from './components/modals/EditMotherCoilModal';
import InoxBlanksPlanner from "./components/modals/InoxBlanksPlanner";
import ProductHistoryModal from './components/modals/ProductHistoryModal';
import RawMaterialRequirement from "./components/modals/RawMaterialRequirement";
import DemandFocus from "./data/demandFocus.jsx";
import { PESO_UNITARIO_PA } from './data/peso_unitario_pa';
import { ESTOQUE_PERFIL_CONSOLIDADO } from './data/estoque_perfil_consolidado';
import { useEventLogs } from './hooks/useEventLogs';




// --- IMPORTAÇÃO DOS Catalogos ---

import { INITIAL_INOX_BLANK_PRODUCTS } from "./data/inoxCatalog";
import { INITIAL_MOTHER_CATALOG } from './data/motherCatalog';
import { INITIAL_PRODUCT_CATALOG } from './data/productCatalog';
import { ITEMS_PER_PAGE, EVENT_TYPES, EVENT_TYPE_LABELS } from './utils/constants';

const ENABLE_BACKUP_BUTTON = import.meta.env.DEV; // só aparece em dev (localhost)


// --- Componentes UI ---

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}
  >
    {children}
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder = "", min, disabled = false, readOnly = false }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} disabled={disabled} readOnly={readOnly} className={`w-full border border-gray-700 rounded-lg p-3 text-sm bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600 ${disabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''} ${readOnly ? 'bg-gray-800/50 text-gray-400' : ''}`} />
  </div>
);

const ReportTabs = ({ viewMode, setViewMode }) => (
  <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
    <button
      onClick={() => setViewMode('GLOBAL')}
      className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
        viewMode === 'GLOBAL'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      Visão Geral
    </button>
    <button
      onClick={() => setViewMode('MP_KARDEX')}
      className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
        viewMode === 'MP_KARDEX'
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      Extrato MP
    </button>
    <button
      onClick={() => setViewMode('PROD_SUMMARY')}
      className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
        viewMode === 'PROD_SUMMARY'
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
    Estoque PA
    </button>
    <button
      onClick={() => setViewMode('INSIGHTS')}
      className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
        viewMode === 'INSIGHTS'
          ? 'bg-amber-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      Insights
    </button>
  </div>
);

const ReportFilters = ({
  startDate,
  endDate,
  search,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
}) => (
  <Card>
    <div className="flex flex-col md:flex-row gap-4 items-end">
      <div className="flex gap-2 flex-1">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="w-full md:w-1/3">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
        />
      </div>
    </div>
  </Card>
);

const normalizeTypeKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const GlobalStatsSummary = ({ stats }) => {
  const entries = [
    {
      key: 'entradaKg',
      label: 'Entrada MP',
      unit: 'kg',
      value: stats?.entradaKg ?? 0,
      border: 'border-blue-500',
      unitClass: 'text-blue-400',
    },
    {
      key: 'corteKg',
      label: 'Consumo Slitter',
      unit: 'kg',
      value: stats?.corteKg ?? 0,
      border: 'border-purple-500',
      unitClass: 'text-purple-400',
    },
    {
      key: 'prodPcs',
      label: 'Produção PA',
      unit: 'pcs',
      value: stats?.prodPcs ?? 0,
      border: 'border-emerald-500',
      unitClass: 'text-emerald-400',
    },
    {
      key: 'expPcs',
      label: 'Expedição PA',
      unit: 'pcs',
      value: stats?.expPcs ?? 0,
      border: 'border-amber-500',
      unitClass: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
      {entries.map((entry) => (
        <Card key={entry.key} className={`border-l-4 ${entry.border} bg-gray-800 p-4`}>
          <p className="text-gray-400 text-[10px] font-bold uppercase">
            {entry.label}
          </p>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-xl font-bold text-white">
              {entry.value.toLocaleString('pt-BR')}
            </span>
            <span className={`text-xs ${entry.unitClass} mb-1`}>{entry.unit}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

const GlobalTimelineOverview = ({ timeline, onExport, onViewDetail, getTypeColor }) => (
  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
      <h3 className="font-bold text-gray-200">Linha do Tempo Global</h3>
      <Button variant="secondary" onClick={onExport} className="h-8 text-xs">
        <Download size={14} /> Excel
      </Button>
    </div>
    <div className="flex-1 overflow-auto custom-scrollbar-dark">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10">
          <tr>
            <th className="p-3">Data</th>
            <th className="p-3 text-center">Tipo</th>
            <th className="p-3">Descrição</th>
            <th className="p-3 text-right">Qtd</th>
            <th className="p-3 text-right">Peso</th>
            <th className="p-3 text-center">Ver</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {timeline.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-8 text-center text-gray-500">
                Nenhum registro no período.
              </td>
            </tr>
          ) : (
            timeline.map((g, idx) => (
              <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                <td className="p-3 text-xs text-gray-400 font-mono">{g.date}</td>
                <td className={`p-3 font-bold text-xs ${getTypeColor(g.type)}`}>{g.type}</td>
                <td className="p-3 text-white">
                  {normalizeTypeKey(g.type) === 'ENTRADA MP' &&
                    `Entradas de MP (${g.events.length} registro${g.events.length !== 1 ? 's' : ''})`}
                  {normalizeTypeKey(g.type) === 'CORTE' &&
                    `Cortes Slitter (${g.events.length} registro${g.events.length !== 1 ? 's' : ''})`}
                  {normalizeTypeKey(g.type) === 'PRODUCAO' &&
                    `Produ\u00e7\u00f5es de PA (${g.events.length} registro${g.events.length !== 1 ? 's' : ''})`}
                  {normalizeTypeKey(g.type) === 'EXPEDICAO' &&
                    `Expedi\u00e7\u00f5es de PA (${g.events.length} registro${g.events.length !== 1 ? 's' : ''})`}
                </td>
                <td className="p-3 text-right text-gray-300">{g.totalQty}</td>
                <td className="p-3 text-right font-mono text-gray-300">
                  {g.totalWeight.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => onViewDetail(g)}
                    className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </Card>
);

const InsightCard = ({ title, value, sub, accent = 'text-amber-300', tooltip }) => (
  <Card className="bg-gray-800/70 border border-white/5 p-4">
    <p
      className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight break-words"
      title={tooltip || ''}
    >
      {title}
    </p>
    <div className="mt-2">
      <div className={`text-2xl font-bold ${accent} leading-tight break-words`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1 leading-tight break-words">{sub}</div>}
    </div>
  </Card>
);

const InsightList = ({ title, items, valueLabel }) => (
  <Card className="bg-gray-800/50 border border-white/5 p-4 flex flex-col min-h-[220px]">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
      {valueLabel && <span className="text-[10px] uppercase tracking-wide text-gray-500">{valueLabel}</span>}
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-gray-500 flex-1 flex items-center justify-center">
        Sem dados no periodo.
      </div>
    ) : (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item.id || item.code || item.date || index}`} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-200 truncate">{item.title}</p>
              {item.subtitle && (
                <p className="text-[11px] text-gray-500 truncate">{item.subtitle}</p>
              )}
            </div>
            <div className="text-xs font-semibold text-amber-300">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const DailyGlobalModal = ({ group, onClose }) => {
  const { type, date, events, totalQty, totalWeight } = group;

  const typeKey = normalizeTypeKey(type);
  const displayEvents = Array.isArray(events) ? events : [];
  const displayCount = displayEvents.length;
  const displayTotals = displayEvents.reduce(
    (acc, item) => {
      const qty = Number(item?.qty) || 0;
      const weight = Number(item?.weight) || 0;
      acc.qty += qty;
      acc.weight += weight;
      return acc;
    },
    { qty: 0, weight: 0 },
  );
  const titleMap = {
    'ENTRADA MP': 'Entradas de Mat\u00e9ria-Prima',
    CORTE: 'Cortes Slitter',
    PRODUCAO: 'Produ\u00e7\u00e3o de PA',
    EXPEDICAO: 'Expedi\u00e7\u00e3o de PA',
  };

  const title = titleMap[typeKey] || type;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <p className="text-gray-400 text-sm">
              Dia {date} - {displayCount} registro
              {displayCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
          {displayEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum registro.
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">Movimento ID</th>
                  <th className="p-2">{typeKey === 'PRODUCAO' ? 'Lote' : 'Produto'}</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayEvents.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50">
                    <td className="p-2 font-mono text-xs text-blue-300">
                      {e.movementId || '-'}
                    </td>
                    <td className="p-2 font-mono text-xs text-blue-300">
                      {typeKey === 'PRODUCAO' ? e.id : (e.code || e.id)}
                    </td>
                    <td className="p-2 text-gray-300">
                      {e.desc}
                    </td>
                    <td className="p-2 text-right text-gray-200">
                      {e.qty}
                    </td>
                    <td className="p-2 text-right font-mono text-gray-300">
                      {e.weight.toLocaleString
                        ? e.weight.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : e.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Total: {displayTotals.qty} registros -{' '}
            {displayTotals.weight.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            kg
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-gray-700 hover:bg-white hover:text-black rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const PrintLabelsModal = ({ items, onClose, type = 'coil', motherCatalog = [], productCatalog = [] }) => {
  const normalizeCode = (value) => String(value || '').trim().toUpperCase();
  const mergedProductCatalog =
    Array.isArray(productCatalog) && productCatalog.length
      ? productCatalog
      : INITIAL_PRODUCT_CATALOG;

  const getMotherDescription = (item) => {
    const catalogEntry = motherCatalog.find(
      (entry) => String(entry.code) === String(item.motherCode || item.code)
    );
    return (
      catalogEntry?.description ||
      catalogEntry?.material ||
      item.material ||
      item.description ||
      ''
    );
  };

  const normalizeThicknessValue = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      let parsed = value;
      while (parsed > 5 && parsed > 0.05) parsed /= 10;
      return parsed;
    }
    const cleaned = String(value).trim();
    if (!cleaned) return null;
    const numeric = Number(cleaned.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    let parsed = numeric;
    while (parsed > 5 && parsed > 0.05) parsed /= 10;
    return parsed;
  };

  const formatThicknessNumber = (value) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getThicknessDisplay = (item) => {
    const catalogEntry = motherCatalog.find(
      (entry) => String(entry.code) === String(item.motherCode || item.code)
    );
    const candidates = [catalogEntry?.thickness, item.thickness];
    for (const candidate of candidates) {
      const parsed = normalizeThicknessValue(candidate);
      if (parsed !== null) return formatThicknessNumber(parsed);
    }
    return '-';
  };

  const getB2CatalogEntry = (item) => {
    const code = normalizeCode(item?.b2Code || item?.code);
    if (!code) return null;
    return mergedProductCatalog.find(
      (entry) => normalizeCode(entry?.b2Code || entry?.code) === code,
    );
  };

  const normalizeNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseFloat(String(value).replace(',', '.').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getB2ThicknessDisplay = (item) => {
    const catalogEntry = getB2CatalogEntry(item);
    const candidates = [item.thickness, catalogEntry?.thickness];
    for (const candidate of candidates) {
      const parsed = normalizeThicknessValue(candidate);
      if (parsed !== null) return formatThicknessNumber(parsed);
    }
    return '-';
  };

  const getB2WidthDisplay = (item) => {
    const catalogEntry = getB2CatalogEntry(item);
    const candidates = [item.width, catalogEntry?.width];
    for (const candidate of candidates) {
      const parsed = normalizeNumber(candidate);
      if (parsed && parsed > 0) return parsed;
    }
    return '-';
  };

  const getB2TypeDisplay = (item) => {
    const catalogEntry = getB2CatalogEntry(item);
    const candidates = [item.type, catalogEntry?.type];
    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (value) return value;
    }
    return '-';
  };

  const getB2ProfileDisplay = (description) => {
    const text = String(description || '').trim();
    if (!text) return '-';

    const match = text.match(/(\d+(?:[.,]\d+)?(?:\s*[xX]\s*\d+(?:[.,]\d+)?){2,3})/);
    if (!match) return text;

    const parts = match[1]
      .split(/[xX]/)
      .map((part) => part.trim())
      .filter(Boolean);

    const profileParts = parts.length >= 4 ? parts.slice(0, 3) : parts.slice(0, 3);
    return profileParts.join('x');
  };

  const buildQrPayload = ({ code, quantity, id }) => `v1|${id}|${code}|${quantity}`;

  const getAdaptiveFontSize = (
    value,
    { max = 14, min = 8, baseChars = 6, step = 0.8 } = {},
  ) => {
    const len = String(value ?? '').trim().length;
    if (len <= baseChars) return max;
    const size = max - (len - baseChars) * step;
    return Math.max(min, Math.round(size * 10) / 10);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center overflow-hidden print:overflow-visible print:h-auto print:static">
        <div className="bg-gray-900 w-full p-4 border-b border-gray-700 flex justify-between items-center print:hidden">
        <h3 className="text-white font-bold text-lg">Imprimir Etiquetas ({items.length})</h3>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="primary"><Printer size={18} /> Imprimir</Button>
          <Button onClick={onClose} variant="secondary"><X size={18} /> Fechar</Button>
        </div>
      </div>
      <div className="flex-1 w-full overflow-y-auto bg-gray-800 p-8 print:p-0 print:bg-white print:overflow-visible print:h-auto flex flex-col items-center">
        <div className="print:block w-full flex flex-col items-center">
          {items.map((item, index) => {
            const isProduct = type === 'product' || type === 'product_stock';
            const isB2 = !isProduct && Boolean(item.b2Code || item.b2Name);

            let name = '';
            let code = '';
            let labelTitle = '';

            if (isProduct) {
                name = item.productName || item.name;
                code = item.productCode || item.code;
                labelTitle = 'Produto Final';
            } else if (item.b2Code || item.b2Name) {
                name = item.b2Name || getMotherDescription(item);
                code = item.b2Code || item.code;
                labelTitle = 'Bobina 2';
            } else {
                name = getMotherDescription(item) || `Bobina ${item.code}`;
                code = item.code;
                labelTitle = 'Matéria Prima';
            }

            const quantity = type === 'product_stock' ? `${item.count} PÇS` : (isProduct ? `${item.pieces} PÇS` : `${item.weight} KG`);
            const id = item.id || 'ESTOQUE';
            const widthDisplay = isB2 ? getB2WidthDisplay(item) : (item.width || '-');
            const thicknessDisplay = isB2 ? getB2ThicknessDisplay(item) : getThicknessDisplay(item);
            const typeDisplay = isB2 ? getB2TypeDisplay(item) : (item.type || '-');
            const firstDetailDisplay = isB2 ? getB2ProfileDisplay(name) : widthDisplay;
            const qrPayload = buildQrPayload({
              code,
              quantity,
              id,
            });

            return (
              <div key={index} className="bg-white text-black mb-2 page-break-after-always h-[3cm] w-[11cm] shadow-2xl print:shadow-none print:mb-0 print:mx-auto overflow-hidden">
                <div className="h-[2.8cm] w-[10.6cm] mx-auto my-[1mm] grid grid-cols-[1fr_2.8cm] gap-1">
                  <div className="min-w-0 flex flex-col justify-between">
                    <div className="min-w-0 flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-[8px] font-bold uppercase leading-none">{labelTitle}</p>
                        <h2
                          className="font-black leading-tight truncate"
                          style={{ fontSize: `${getAdaptiveFontSize(name, { max: 24, min: 10, baseChars: 16, step: 0.9 })}px` }}
                        >
                          {name}
                        </h2>
                      </div>
                      <img src="/logo.png" alt="Metalosa" className="h-[26px] w-auto object-contain shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                      <div className="border border-black px-1 py-0.5 text-center min-w-0">
                        <p className="text-[7px] font-bold uppercase leading-none">Codigo</p>
                        <p
                          className="font-black leading-none truncate"
                          style={{ fontSize: `${getAdaptiveFontSize(code, { max: 28, min: 14, baseChars: 6, step: 1.0 })}px` }}
                        >
                          {code}
                        </p>
                      </div>
                      <div className="border border-black px-1 py-0.5 text-center min-w-0">
                        <p className="text-[7px] font-bold uppercase leading-none">{isProduct ? 'Quantidade' : 'Peso'}</p>
                        <p
                          className="font-black leading-none truncate"
                          style={{ fontSize: `${getAdaptiveFontSize(quantity, { max: 28, min: 13, baseChars: 8, step: 1.0 })}px` }}
                        >
                          {quantity}
                        </p>
                      </div>
                    </div>

                    {!isProduct && (
                      <div className="grid grid-cols-[1.7fr_0.8fr_0.5fr] gap-0.5 text-center mt-0.5">
                        <div className="bg-gray-200 px-0.5 py-0.5 min-w-0">
                          <p
                            className="font-black leading-none truncate"
                            style={{ fontSize: `${getAdaptiveFontSize(firstDetailDisplay, { max: 22, min: 11, baseChars: 7, step: 1.0 })}px` }}
                          >
                            {firstDetailDisplay}
                          </p>
                        </div>
                        <div className="bg-gray-200 px-0.5 py-0.5 min-w-0">
                          <p
                            className="font-black leading-none truncate"
                            style={{ fontSize: `${getAdaptiveFontSize(thicknessDisplay, { max: 28, min: 15, baseChars: 6, step: 0.9 })}px` }}
                          >
                            {thicknessDisplay}
                          </p>
                        </div>
                        <div className="bg-gray-200 px-0.5 py-0.5 min-w-0">
                          <p
                            className="font-black leading-none truncate"
                            style={{ fontSize: `${getAdaptiveFontSize(typeDisplay, { max: 18, min: 10, baseChars: 4, step: 1.0 })}px` }}
                          >
                            {typeDisplay}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-l border-black pl-0.5 flex items-center justify-center min-w-0">
                    <div className="bg-white p-[2px]">
                      <QRCodeSVG value={qrPayload} size={98} includeMargin={false} level="L" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: 11cm 3cm; margin: 0; }
          body, html { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          .fixed.inset-0.bg-black\\/90.z-\\[60\\],
          .fixed.inset-0.bg-black\\/90.z-\\[60\\] * {
            visibility: visible;
          }
          .fixed.inset-0.bg-black\\/90.z-\\[60\\] {
            position: absolute !important;
            top: 0; left: 0;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            z-index: 9999;
            display: block !important;
          }
          .fixed.inset-0.bg-black\\/90.z-\\[60\\] > div {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            position: static !important;
          }
          .fixed.inset-0.bg-black\\/90.z-\\[60\\] .print\\:block {
            display: block !important;
            width: 100%;
            overflow: visible !important;
          }
          .print\\:hidden { display: none !important; }
          .page-break-after-always {
            break-after: always;
            page-break-after: always;
            overflow: visible !important;
          }
          .page-break-after-always:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
};
// --- COMPONENTE DO MODAL DE DETALHES (FORA DA FUNÇÃO APP) ---
const ReportGroupModal = ({ group, onClose }) => {
  const isMP = group.type === 'ENTRADA MP';
  const isCut = group.type === 'CORTE';
  const isProd = group.type === 'PRODUÇÃO';
  const isShip = group.type === 'EXPEDIÇÃO';

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
             <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Detalhes: {group.type}
                <span className="text-sm font-normal text-gray-400">({group.date})</span>
             </h3>
             <p className="text-xs text-gray-500">{group.items.length} registros encontrados</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
             <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Movimento</th>
                    <th className="p-3">Movimento ID</th>
                    <th className="p-3">Histórico / Documento</th>
                    <th className="p-3 text-right text-emerald-400">Entrada</th>
                    <th className="p-3 text-right text-red-400">Saída</th>
                    <th className="p-3 text-right font-bold text-white bg-gray-800 border-l border-gray-700">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {group.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      
                      {/* COLUNAS MP */}
                      {isMP && (
                          <>
                            <td className="p-3 font-bold text-blue-300">{item.id}</td>
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-xs">{item.detail}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">{item.weight.toLocaleString('pt-BR')} kg</td>
                          </>
                      )}

                      {/* COLUNAS CORTE */}
                      {isCut && (
                          <>
                            <td className="p-3 font-bold text-purple-300">{item.id}</td>
                            <td className="p-3 text-xs text-gray-300 max-w-[300px] truncate" title={item.detail}>{item.detail}</td>
                            <td className="p-3 text-right text-red-400">{item.scrap} kg</td>
                            <td className="p-3 text-right font-mono text-white">{item.weight.toLocaleString('pt-BR')} kg</td>
                          </>
                      )}

                      {/* COLUNAS PRODUÇÃO / EXPEDIÇÃO */}
                      {(isProd || isShip) && (
                          <>
                            <td className="p-3 font-bold text-white text-xs">{item.id}</td>
                            <td className="p-3 text-emerald-300">{item.description}</td>
                            <td className="p-3 text-xs text-gray-500">{item.detail}</td>
                            <td className="p-3 text-right font-bold">{item.qty}</td>
                            <td className="p-3 text-right text-gray-400">{item.weight > 0 ? item.weight.toFixed(1) : '-'}</td>
                          </>
                      )}
                    </tr>
                  ))}
                </tbody>
             </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};
const MpDetailsModal = ({ data, onClose }) => {
  // 1. Ordena cronologicamente (Antigo -> Novo)
  const movements = [...data.movements].sort((a, b) => a.timestamp - b.timestamp);
  
  // 2. Começa do Saldo Inicial que foi calculado na tela anterior
  let currentBalance = data.initialBalance || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
             <h3 className="text-white font-bold text-lg">Extrato Detalhado: {data.code}</h3>
             <p className="text-sm text-gray-400">{data.desc}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
             <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Movimento</th>
                    <th className="p-3">Movimento ID</th>
                    <th className="p-3">Hist\u00f3rico / Documento</th>
                    <th className="p-3 text-right text-emerald-400">Entrada</th>
                    <th className="p-3 text-right text-red-400">Sa\u00edda</th>
                    <th className="p-3 text-right font-bold text-white bg-gray-800 border-l border-gray-700">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  
                  {/* LINHA 0: SALDO ANTERIOR */}
                  <tr className="bg-gray-900/50">
                      <td className="p-3 text-xs text-gray-500 font-bold" colSpan="7">SALDO ANTERIOR (INÍCIO DO PERÍODO)</td>
                      <td className="p-3 text-right font-bold text-gray-400 font-mono border-l border-gray-700">
                          {data.initialBalance.toLocaleString('pt-BR')}
                      </td>
                  </tr>

                  {/* LINHAS DE MOVIMENTO */}
                  {movements.map((row, idx) => {
                    // Atualiza o saldo progressivamente
                    // weightChange é positivo para entrada e negativo para saída
                    currentBalance += row.weightChange;

                    const isEntry = row.weightChange > 0;

                    return (
                        <tr key={idx} className="hover:bg-gray-700/50">
                            <td className="p-3 font-mono text-xs">{row.date}</td>
                            <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isEntry ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                    {row.type}
                                </span>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-gray-400">{row.movementId || '-'}</td>
                            <td className="p-3">
                                <div className="text-gray-200">{isEntry ? 'Entrada Nota Fiscal' : 'Consumo Slitter'}</div>
                                <div className="text-[10px] text-gray-500">{row.detail}</div>
                            </td>
                            
                            {/* ENTRADA */}
                            <td className="p-3 text-right text-emerald-400 font-mono">
                                {isEntry ? row.weightChange.toLocaleString('pt-BR') : '-'}
                            </td>
                            
                            {/* SAÍDA */}
                            <td className="p-3 text-right text-red-400 font-mono">
                                {!isEntry ? Math.abs(row.weightChange).toLocaleString('pt-BR') : '-'}
                            </td>
                            
                            {/* SALDO PROGRESSIVO */}
                            <td className="p-3 text-right font-bold text-white font-mono bg-gray-800/30 border-l border-gray-700">
                                {currentBalance.toLocaleString('pt-BR')}
                            </td>
                        </tr>
                    );
                  })}
                </tbody>
             </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end gap-2 items-center">
            <div className="mr-auto flex gap-4 text-xs text-gray-400">
                <span>Entradas: <strong className="text-emerald-400">+{data.periodIn.toLocaleString('pt-BR')}</strong></span>
                <span>Saídas: <strong className="text-red-400">-{data.periodOut.toLocaleString('pt-BR')}</strong></span>
            </div>
            <div className="text-sm">
                Saldo Final (Calculado): <strong className="text-white text-lg">{currentBalance.toLocaleString('pt-BR')}</strong>
            </div>
            <Button variant="secondary" onClick={onClose} className="ml-4">Fechar</Button>
        </div>
      </div>
    </div>
  );
};
const ProductDetailsModal = ({ data, onClose }) => {
  // Se ainda não tem dados, nem tenta renderizar
  if (!data) return null;

  // Garante que sempre temos um array antes de ordenar
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const batches = [...rawItems].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  const totalQty = Number(data.totalQty) || 0;
  const totalWeight = Number(data.totalWeight) || 0;
  const totalScrap = Number(data.totalScrap) || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
            <h3 className="text-white font-bold text-lg">
              Histórico: {data.name ?? "-"}
            </h3>
            <p className="text-sm text-gray-400">{data.code ?? "-"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* RESUMO */}
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
          <div className="grid grid-cols-3 gap-4 mb-0 text-xs text-gray-400 bg-gray-900 p-3 border-b border-gray-800">
            <div className="text-center">
              Total:{" "}
              <strong className="text-emerald-400">{totalQty} pçs</strong>
            </div>
            <div className="text-center">
              Peso:{" "}
              <strong className="text-blue-400">
                {totalWeight.toFixed(1)} kg
              </strong>
            </div>
            <div className="text-center">
              Sucata:{" "}
              <strong className="text-red-400">
                {totalScrap.toFixed(1)} kg
              </strong>
            </div>
          </div>

          {/* TABELA */}
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Lote</th>
                <th className="p-3">Detalhes</th>
                <th className="p-3">Origem MP</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-right">Peso un.</th>
                <th className="p-3 text-right">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {batches.map((batch, idx) => {
                const pieces = Number(batch?.pieces) || 0;
                const weight = Number(batch?.weight) || 0;
                const unitWeight = Number(batch?.unitWeight) || 0;

                return (
                  <tr key={idx} className="hover:bg-gray-700/50">
                    <td className="p-3 font-mono text-xs text-gray-400">
                      {batch?.date ?? "-"}
                    </td>
                    <td className="p-3 font-bold text-white text-xs">
                      {batch?.id ?? "-"}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {(batch?.packCount ?? 0) + " vols"}
                    </td>
                    <td className="p-3 text-xs text-blue-300 truncate max-w-[150px]">
                      {batch?.motherCode || "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {pieces}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {unitWeight.toFixed(3)} kg
                    </td>
                    <td className="p-3 text-right font-mono">
                      {weight.toFixed(1)} kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

const ProductionSuggestionModal = ({
  items,
  onClose,
  onExportExcel,
  onExportPdf,
  filter,
  onFilterChange,
}) => {
  const safeItems = Array.isArray(items) ? items : [];
  const filteredItems = safeItems.filter((item) => {
    if (!filter || filter === 'ALL') return true;
    const daily = Number(item.dailyKg) || 0;
    const daysCoverage =
      daily > 0 ? (Number(item.stockWeight) || 0) / daily : 0;
    if (filter === 'SEM_DEMANDA') return daily <= 0;
    if (filter === '2M_PLUS') return daysCoverage >= 60;
    if (filter === '30_59') return daysCoverage >= 30 && daysCoverage < 60;
    if (filter === 'LT_30') return daysCoverage > 0 && daysCoverage < 30;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-5xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
            <h3 className="text-white font-bold text-lg">Sugestoes de Producao</h3>
            <p className="text-sm text-gray-400">
              Estoque atual, meta e saldo de Bobina 2
            </p>
            <div className="mt-3">
              <select
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="bg-gray-800 text-xs text-white border border-gray-600 rounded px-2 py-1"
              >
                <option value="ALL">Todos</option>
                <option value="2M_PLUS">2M+</option>
                <option value="30_59">30-59d</option>
                <option value="LT_30">&lt;30d</option>
                <option value="SEM_DEMANDA">Sem demanda</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onExportPdf}
              className="h-8 bg-gray-700 text-white hover:bg-gray-600"
            >
              <FileText size={14} /> PDF
            </Button>
            <Button
              onClick={onExportExcel}
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Download size={14} /> Excel
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md text-xs uppercase">
              <tr>
                <th className="p-3">Codigo</th>
                <th className="p-3">Descricao</th>
                <th className="p-3 text-right">Saldo (kg)</th>
                <th className="p-3 text-right">Max (kg)</th>
                <th className="p-3 text-right text-emerald-400">Sugestao (kg)</th>
                <th className="p-3 text-right">Sugestao (pcs)</th>
                <th className="p-3">B2</th>
                <th className="p-3 text-right">Saldo B2 (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredItems.map((item, idx) => {
                const b2Short = item.b2Code || '';
                const b2Label = b2Short ? `${b2Short} - ${item.b2Name || ''}` : '-';
                const b2Weight = Number(item.b2StockWeight || 0);
                const suggestionKg = Number(item.suggestionKg || 0);
                const isShort = suggestionKg > 0 && b2Weight > 0 && b2Weight < suggestionKg;
                const b2Color = isShort ? 'text-red-400' : 'text-emerald-400';
                const daily = Number(item.dailyKg) || 0;
                const daysCoverage =
                  daily > 0 ? (Number(item.stockWeight) || 0) / daily : 0;
                const coverageLabel =
                  daily <= 0
                    ? 'SEM DEMANDA'
                    : daysCoverage >= 60
                      ? '2M+'
                      : daysCoverage >= 30
                        ? '30-59d'
                        : '<30d';
                const coverageClass =
                  daily <= 0
                    ? 'text-gray-400 bg-gray-700/40 border-gray-600/40'
                    : daysCoverage >= 60
                      ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40'
                      : daysCoverage >= 30
                        ? 'text-amber-300 bg-amber-900/30 border-amber-700/40'
                        : 'text-red-400 bg-red-900/30 border-red-700/40';

                return (
                <tr key={`${item.code}-${idx}`} className="hover:bg-gray-700/40">
                  <td className="p-3 font-mono text-xs text-white">{item.code}</td>
                  <td className="p-3 text-gray-300">
                    <div>{item.name}</div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${coverageClass}`}
                      >
                        {coverageLabel}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {Number(item.stockWeight || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {Number(item.maxKg || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400">
                    {Number(item.suggestionKg || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {Number(item.suggestionPcs || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-gray-300">
                    {b2Label}
                  </td>
                  <td className={`p-3 text-right font-mono ${b2Color}`}>
                    {b2Weight.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                </tr>
              );})}
              {safeItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    Nenhuma sugestao para exibir.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};



// --- MODAL DE DETALHES DO ESTOQUE (COM DESCRIÇÃO) ---



const EditChildCoilModal = ({ coil, onClose, onSave }) => {
  const [form, setForm] = useState(coil);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h3 className="text-white font-bold text-lg">Editar Bobina 2 (NF)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="C?digo B2"
              value={form.b2Code}
              onChange={(e) => handleChange("b2Code", e.target.value)}
            />
            <Input
              label="Nota Fiscal"
              value={form.nf || ""}
              onChange={(e) => handleChange("nf", e.target.value)}
            />
          </div>

          <Input
            label="Descri??o"
            value={form.b2Name || ""}
            onChange={(e) => handleChange("b2Name", e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Largura (mm)"
              type="number"
              value={form.width}
              onChange={(e) => handleChange("width", e.target.value)}
            />
            <Input
              label="Espessura"
              value={form.thickness}
              onChange={(e) => handleChange("thickness", e.target.value)}
            />
            <Input
              label="Tipo"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
            />
          </div>

          <Input
            label="Peso (kg)"
            type="number"
            value={form.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </div>
      </div>
    </div>
  );
};

const StockDetailsModal = ({ code, coils = [], onClose, onReprint, type, motherCatalog = [] }) => {
  const isMother = type === 'mother';
  const safeCoils = Array.isArray(coils) ? coils : [];
  const catalogMatch = isMother
    ? (motherCatalog || []).find((item) => String(item.code) === String(code))
    : null;
  const description =
    (isMother ? catalogMatch?.description : safeCoils[0]?.b2Name) ||
    safeCoils[0]?.material ||
    safeCoils[0]?.b2Name ||
    (isMother ? `Bobina ${code}` : `Item ${code}`);
  const totalWeight = safeCoils.reduce(
    (sum, coil) => sum + (Number(coil.remainingWeight ?? coil.weight) || 0),
    0,
  );
  const uniqueWidths = [
    ...new Set(
      safeCoils.map((coil) => coil.width || catalogMatch?.width).filter(Boolean),
    ),
  ];
  const normalizeThicknessValue = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      let parsed = value;
      while (parsed > 5 && parsed > 0.05) parsed = parsed / 10;
      return parsed;
    }
    const cleaned = String(value).trim();
    if (!cleaned) return null;
    const numeric = Number(cleaned.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    let parsed = numeric;
    while (parsed > 5 && parsed > 0.05) parsed = parsed / 10;
    return parsed;
  };

  const formatThicknessNumber = (value) => {
    if (value === null || value === undefined) return null;
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getThicknessNumber = (coil) => {
    const candidates = [];
    if (isMother && catalogMatch?.thickness) candidates.push(catalogMatch.thickness);
    if (coil.thickness) candidates.push(coil.thickness);
    if (!isMother && catalogMatch?.thickness) candidates.push(catalogMatch.thickness);
    for (const candidate of candidates) {
      const parsed = normalizeThicknessValue(candidate);
      if (parsed !== null) return parsed;
    }
    return null;
  };

  const getThicknessDisplay = (coil) => {
    const parsed = getThicknessNumber(coil);
    return parsed !== null ? `${formatThicknessNumber(parsed)}mm` : '-';
  };

  const uniqueThickness = [
    ...new Set(
      safeCoils
        .map((coil) => {
          const parsed = getThicknessNumber(coil);
          return parsed !== null ? `${formatThicknessNumber(parsed)}mm` : null;
        })
        .filter(Boolean),
    ),
  ];
  const nfSet = [
    ...new Set(
      safeCoils
        .map((coil) => (isMother ? coil.nf : coil.motherCode))
        .filter(Boolean),
    ),
  ];
  const lastEntry =
    safeCoils
      .map((coil) => coil.entryDate || coil.date || coil.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || '-';

  const metrics = [
    {
      label: 'Peso Total',
      value: `${totalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`,
    },
    { label: 'Bobinas em Estoque', value: safeCoils.length },
    { label: 'Larguras', value: uniqueWidths.length ? uniqueWidths.join(', ') : '-' },
    {
      label: 'Espessuras',
      value: uniqueThickness.length ? uniqueThickness.join(', ') : '-',
    },
    { label: isMother ? 'Notas Fiscais' : 'Bobinas Mae', value: nfSet.length || '-' },
    { label: 'Ultima Entrada', value: lastEntry },
  ];

  const handleExport = () => {
    if (!safeCoils.length) return alert('Nada para exportar.');

    const dataToExport = safeCoils.map((coil) => ({
      'ID Rastreio': coil.id,
      'Data Entrada/Corte': coil.entryDate || coil.date || coil.createdAt || '-',
      'Codigo Item': code,
      Descricao: isMother ? catalogMatch?.description || coil.material : coil.b2Name,
      Largura: coil.width || catalogMatch?.width || '-',
      Espessura: (() => {
        const parsed = getThicknessNumber(coil);
        return parsed !== null ? formatThicknessNumber(parsed) : '-';
      })(),
      Tipo: coil.type || '-',
      [isMother ? 'Nota Fiscal' : 'Origem (Mae)']: isMother ? coil.nf || '-' : coil.motherCode || '-',
      'Peso Atual (kg)': (Number(coil.remainingWeight ?? coil.weight) || 0)
        .toFixed(1)
        .replace('.', ','),
      Status: coil.status === 'stock' ? 'EM ESTOQUE' : 'INDISPONIVEL',
    }));

    const headers = Object.keys(dataToExport[0]).join(';');
    const csvContent = [
      headers,
      ...dataToExport.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(';'),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `detalhe_estoque_${code}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-700 bg-gray-900 rounded-t-2xl flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Codigo</p>
            <h3 className="text-white font-bold text-2xl leading-tight">{code}</h3>
            <p className="text-emerald-400 font-semibold text-sm mb-1">{description}</p>
            <p className="text-xs text-gray-500">{safeCoils.length} bobinas disponiveis</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border-b border-gray-800 bg-gray-900/40">
          {metrics.map((metric, index) => (
            <div
              key={`${metric.label}-${index}`}
              className="bg-gray-800 rounded-xl p-3 border border-gray-700/50"
            >
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</p>
              <p className="text-sm font-semibold text-white truncate">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar-dark">
          <table className="w-full text-xs md:text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md text-[11px] uppercase tracking-wide">
              <tr>
                <th className="p-3">ID Rastreio</th>
                <th className="p-3">Largura</th>
                <th className="p-3">Espessura</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Data {isMother ? 'Entrada' : 'Corte'}</th>
                <th className="p-3">{isMother ? 'Nota Fiscal' : 'Origem (Mae)'}</th>
                <th className="p-3 text-right">Peso Atual (kg)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {safeCoils.map((coil) => {
                const currentWeight = Number(coil.remainingWeight ?? coil.weight) || 0;
                const statusLabel = coil.status === 'stock' ? 'Estoque' : 'Indisponivel';
                const statusColor = coil.status === 'stock' ? 'text-emerald-400' : 'text-amber-300';
                return (
                  <tr key={coil.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-blue-300">{coil.id}</td>
                    <td className="p-3 text-gray-200">
                      {coil.width || catalogMatch?.width
                        ? `${coil.width || catalogMatch?.width}mm`
                        : '-'}
                    </td>
                    <td className="p-3 text-gray-200">{getThicknessDisplay(coil)}</td>
                    <td className="p-3 text-gray-400">{coil.type || '-'}</td>
                    <td className="p-3 text-gray-400">{coil.entryDate || coil.date || coil.createdAt || '-'}</td>
                    <td className="p-3 text-gray-400">{isMother ? coil.nf || '-' : coil.motherCode || '-'}</td>
                    <td className="p-3 text-right font-semibold text-white">
                      {currentWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-[11px] font-semibold ${statusColor}`}>{statusLabel}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onReprint(coil)}
                        className="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        title="Imprimir Etiqueta"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-gray-400">
            Total:
            <span className="text-white font-semibold ml-1">
              {totalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
            </span>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
              <Download size={16} /> Baixar CSV
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const handleGeneratePDF = (title, data) => {
  const printWindow = window.open('', '_blank', 'height=800,width=1000');
  if (!printWindow) return alert("Erro: O navegador bloqueou a janela. Permita pop-ups.");

  const htmlContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { text-align: center; font-size: 20px; margin-bottom: 10px; }
          p { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>METALOSA - ${title}</h1>
        <p>Emissão: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto / Descrição</th>
              <th class="right">Quantidade / Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.name}</td>
                <td class="right">${item.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
// --- FUNÇÃO DE INVENTÁRIO (BOBINA MÃE) ---
  // --- FUNÇÃO DE INVENTÁRIO ATUALIZADA (LÊ TUDO) ---
  // ===== DADOS DE TESTE PARA ABA INOX =====
const INOX_PRODUCTS = [
  {
    id: "INOX-001",
    code: "INOX-001",
    description: "BLANK INOX 1,20 x 1000",
    unitWeightKg: 2.5, // kg por peça
  },
];

const INOX_DEMAND_ROWS = [
  {
    productId: "INOX-001",  // TEM QUE bater com o id acima
    demandQty: 1000,        // demanda em peças
  },
];

const INOX_STOCK_POSITIONS = [
  {
    productId: "INOX-001",  // mesmo id
    finishedQty: 200,       // peças prontas
    blankQty: 100,          // blanks em estoque
  },
];

    
export default function App() {
  const importFullBackupRef = useRef(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewingCutLog, setViewingCutLog] = useState(null); // Para abrir o modal de detalhes do corte
  const [viewingCutEvent, setViewingCutEvent] = useState(null);
  const [viewingProductionEvent, setViewingProductionEvent] = useState(null);
  const [viewingShippingEvent, setViewingShippingEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  // --- ESTADOS PARA O RELATÓRIO DINÂMICO B2 ---
  const [b2ReportSearch, setB2ReportSearch] = useState('');
  const [b2ReportStatus, setB2ReportStatus] = useState('ALL'); // 'ALL', 'STOCK', 'CONSUMED'
  const [expandedGroupCode, setExpandedGroupCode] = useState(null);; // Qual linha está aberta
  const [b2ReportSnapshotDate, setB2ReportSnapshotDate] = useState('');
  const [b2ThicknessFilter, setB2ThicknessFilter] = useState('');
  const [mpFilterThickness, setMpFilterThickness] = useState('all');
  const [mpFilterType, setMpFilterType] = useState('all');
  const [b2TypeFilter, setB2TypeFilter] = useState('');
  const [motherCoils, setMotherCoils] = useState([]);
  const [childCoils, setChildCoils] = useState([]);
  const [productionLogs, setProductionLogs] = useState([]);
  const [shippingLogs, setShippingLogs] = useState([]); 
  const [productCatalog, setProductCatalog] = useState(INITIAL_PRODUCT_CATALOG);
  const [motherCatalog, setMotherCatalog] = useState(INITIAL_MOTHER_CATALOG);
  const [viewingStockType, setViewingStockType] = useState('b2'); // 'mother' ou 'b2'
  const [newMotherCoil, setNewMotherCoil] = useState({ 
      code: '', 
      nf: '', // <--- CAMPO NOVO
      weight: '', 
      material: '', 
      width: '', 
      thickness: '', 
      type: '',
      entryDate: new Date().toISOString().split('T')[0],
      usina: '',
      usinaOutro: '',
      filialDestino: '',
  });
  const [showB2PurchaseForm, setShowB2PurchaseForm] = useState(false);
  const [newB2Purchase, setNewB2Purchase] = useState({
    nf: '',
    entryDate: new Date().toISOString().split('T')[0],
    b2Code: '',
    b2Name: '',
    width: '',
    thickness: '',
    type: '',
    weight: '',
    quantity: '1',
  });
  // Adicione junto com mpManualDaily, mpSimulatedPrice, etc.
  const [mpIncomingOrders, setMpIncomingOrders] = useState([]); // Lista de pedidos
  const [hoverData, setHoverData] = useState(null);
  const [mpOrderQty, setMpOrderQty] = useState(''); // Input Qtd
  const [mpOrderDate, setMpOrderDate] = useState(''); // Input Data
  const [mpLeadTime, setMpLeadTime] = useState(30);
  const [reportGroupData, setReportGroupData] = useState(null); // Para abrir o modal agrupado
  const [mpHorizonDays, setMpHorizonDays] = useState(30);       // janela de análise (dias)
  const [mpNeedSearch, setMpNeedSearch] = useState('');         // busca por código / material
  const [selectedMpCode, setSelectedMpCode] = useState(null);   // MP clicada na tabela
  const [mpScenarioMode, setMpScenarioMode] = useState('manual'); // 'historical' | 'manual' | 'file'
  const [mpSimulatedPrice, setMpSimulatedPrice] = useState('');
  const [mpManualDaily, setMpManualDaily] = useState('');       // kg/dia digitado
  const [mpManualDays, setMpManualDays] = useState(30);         // horizonte para simulação
  const [mpFileDaily, setMpFileDaily] = useState(null);         // média via arquivo
  const [selectedGlobalGroup, setSelectedGlobalGroup] = useState(null);
  const [selectedMotherForCut, setSelectedMotherForCut] = useState('');
  const [motherSearchQuery, setMotherSearchQuery] = useState('');
  const [tempChildCoils, setTempChildCoils] = useState([]);
  const [targetB2Code, setTargetB2Code] = useState(''); 
  const [cutWeight, setCutWeight] = useState('');
  const [filterB2Type, setFilterB2Type] = useState(''); 
  const [selectedChildForProd, setSelectedChildForProd] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [prodPieces, setProdPieces] = useState('');
  const [prodScrap, setProdScrap] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);
  const [b2SearchQuery, setB2SearchQuery] = useState('');
  const [reportViewMode, setReportViewMode] = useState('GLOBAL'); // 'GLOBAL' ou 'MP_KARDEX'
  const [viewingMpDetails, setViewingMpDetails] = useState(null); // Armazena o código que está sendo visto
  // Adicione junto com os outros estados (logo abaixo de mpManualDaily, por exemplo)
  const [mpManualInputType, setMpManualInputType] = useState('total'); // 'daily' ou 'total'
  const [mpManualTotal, setMpManualTotal] = useState(''); // Para guardar o valor total
  const [mpTargetDays, setMpTargetDays] = useState(90); // Meta de cobertura (ex: quero cobrir 45 dias)
  const [shipProduct, setShipProduct] = useState('');
  const [shipQty, setShipQty] = useState('');
  const [shipDest, setShipDest] = useState('COMETA');

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [newProduct, setNewProduct] = useState({ code: '', name: '', b2Code: '', b2Name: '', width: '', thickness: '', type: '' });
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [adminCreateType, setAdminCreateType] = useState('mother');
  const [adminMotherFilter, setAdminMotherFilter] = useState('');
  const [adminB2Filter, setAdminB2Filter] = useState('');
  const [adminPaFilter, setAdminPaFilter] = useState('');
  const [adminMovementsIdFilter, setAdminMovementsIdFilter] = useState('');
  const [adminStockTab, setAdminStockTab] = useState('mother');
  const [blockedCutModal, setBlockedCutModal] = useState(null);
  const [adminCatalogFilter, setAdminCatalogFilter] = useState('');
  const [adminCatalogPage, setAdminCatalogPage] = useState(1);
  const [adminCatalogEdit, setAdminCatalogEdit] = useState(null);
  const [adminCatalogEditForm, setAdminCatalogEditForm] = useState(null);
  const [adminUserMovementsModal, setAdminUserMovementsModal] = useState(null);
  const [adminMotherCatalogFilter, setAdminMotherCatalogFilter] = useState('');
  const [adminMotherCatalogPage, setAdminMotherCatalogPage] = useState(1);
  const [adminMotherCatalogEditForm, setAdminMotherCatalogEditForm] = useState(null);
  const [adminMovementEditForm, setAdminMovementEditForm] = useState(null);
  const [adminMotherPage, setAdminMotherPage] = useState(1);
  const [adminB2Page, setAdminB2Page] = useState(1);
  const [adminPaPage, setAdminPaPage] = useState(1);
  const [adminMovementsPage, setAdminMovementsPage] = useState(1);
  const [adminInventoryReport, setAdminInventoryReport] = useState(null);
  const [adminInventoryMovementsModal, setAdminInventoryMovementsModal] = useState(null);
  const [adminMotherForm, setAdminMotherForm] = useState({
    code: '',
    weight: '',
    width: '',
    thickness: '',
    material: '',
    type: '',
    nf: '',
    quantity: '1',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [adminB2Form, setAdminB2Form] = useState({
    b2Code: '',
    b2Name: '',
    weight: '',
    width: '',
    thickness: '',
    type: '',
    quantity: '1',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [adminProductForm, setAdminProductForm] = useState({
    code: '',
    name: '',
    b2Code: '',
    b2Name: '',
    width: '',
    thickness: '',
    type: '',
    motherCode: '',
  });
  const [adminPaForm, setAdminPaForm] = useState({
    productCode: '',
    productName: '',
    pieces: '',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState([]); 
  const [printType, setPrintType] = useState('coil'); 
  const [viewingStockCode, setViewingStockCode] = useState(null); 
  const [stockDetailsModalOpen, setStockDetailsModalOpen] = useState(false);
  const [editingMotherCoil, setEditingMotherCoil] = useState(null); 
  const [editingChildCoil, setEditingChildCoil] = useState(null);
  const [isSavingB2Purchase, setIsSavingB2Purchase] = useState(false);
  const isSavingB2PurchaseRef = useRef(false); // evita duplo disparo enquanto o estado ainda nÃ£o renderizou
  const [currentView, setCurrentView] = useState('dashboard'); 
// 'dashboard', 'rastreioB2', 'mpNeed', etc...

  const [logsPage, setLogsPage] = useState(1);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarHidden, setSidebarHidden] = useState(() => {
      if (typeof window === 'undefined') return false;
      return window.localStorage.getItem('sidebarHidden') === 'true';
    });
  const inventoryMotherRef = useRef(null); // <--- ADICIONE ISSO
    const adminInventoryB2FileRef = useRef(null);
    const adminInventoryPaFileRef = useRef(null);
    const adminQuickFormRef = useRef(null);
  const fileInputMotherRef = useRef(null);
  const importMotherStockRef = useRef(null);
  const importChildStockRef = useRef(null);
  const importLogsRef = useRef(null);
  const fileInputMotherCatalogRef = useRef(null);
  const importFinishedStockRef = useRef(null);
// --- ESTADOS PARA PRODUÇÃO EM LOTE (Total + Quebra) ---
  const [selectedInputCoils, setSelectedInputCoils] = useState([]);
  const [totalProducedPieces, setTotalProducedPieces] = useState(''); // Total Geral (ex: 486)
  const [standardPackSize, setStandardPackSize] = useState('');     // Padrão (ex: 100)
  const [cutQuantity, setCutQuantity] = useState(''); // Nova variável para qtd de tiras
  const [processScrap, setProcessScrap] = useState(''); // Sucata manual do processo de corte
  // Adicione esta linha junto com os outros states
  const [cuttingLogs, setCuttingLogs] = useState([]); // Novo histórico de cortes
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [isOtherMode, setIsOtherMode] = useState(false); // false = Bobina 2, true = Outros
  const [otherDescription, setOtherDescription] = useState(''); // Ex: "Telha", "Chapa"
  const [showAllB2Profiles, setShowAllB2Profiles] = useState(false);
  // Junto com os outros useState
  const [cuttingDate, setCuttingDate] = useState(new Date().toISOString().split('T')[0]);
  // --- ESTADOS DO PAINEL DE OPERAÇÕES ---
  const [opsMode, setOpsMode] = useState('entrada'); // 'entrada' | 'corte'
  const [opsEntryForm, setOpsEntryForm] = useState({ code: '', nf: '', weight: '', material: '', thickness: '', type: '', entryDate: new Date().toISOString().split('T')[0], usina: '', usinaOutro: '', filialDestino: '' });
  const [opsSelectedMother, setOpsSelectedMother] = useState('');
  const [opsMotherSearch, setOpsMotherSearch] = useState('');
  const [opsTempCuts, setOpsTempCuts] = useState([]);
  const [opsTargetB2, setOpsTargetB2] = useState('');
  const [opsCutWeight, setOpsCutWeight] = useState('');
  const [opsCutQty, setOpsCutQty] = useState('');
  const [opsCutDate, setOpsCutDate] = useState(new Date().toISOString().split('T')[0]);
  const [opsCutScrap, setOpsCutScrap] = useState('');
  const [opsShowAllB2, setOpsShowAllB2] = useState(false);
  const [opsLastAction, setOpsLastAction] = useState(null); // {type, message, timestamp}
  const [opsTimerTick, setOpsTimerTick] = useState(Date.now()); // tick para esconder botão apagar após tempo
  const [consultQrInput, setConsultQrInput] = useState('');
  const [consultResult, setConsultResult] = useState(null);
  const [consultError, setConsultError] = useState('');
  const [consultSearchCode, setConsultSearchCode] = useState('');
  const [consultSearchId, setConsultSearchId] = useState('');
  const [consultSearchType, setConsultSearchType] = useState('all');
  const [consultCameraOn, setConsultCameraOn] = useState(false);
  const [consultCameraError, setConsultCameraError] = useState('');
  const consultVideoRef = useRef(null);
  const consultStreamRef = useRef(null);
  const consultScanTimerRef = useRef(null);
  // Junto com os outros useState

  // --- ESTADOS DE RELATÓRIOS ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]); // Hoje
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);   // Hoje
  const [reportSearch, setReportSearch] = useState('');
  const [viewingProdDetails, setViewingProdDetails] = useState(null); // <--- ADICIONE ESSA LINHA
  const [expandedProdSummaryCode, setExpandedProdSummaryCode] = useState(null);
  const [showProdSuggestionModal, setShowProdSuggestionModal] = useState(false);
  const [prodSuggestionFilter, setProdSuggestionFilter] = useState('ALL');
// ... outros states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  // --- COLE ISSO JUNTO COM OS OUTROS STATES (No início da função App) ---
  const [currentFileName, setCurrentFileName] = useState(() => {
    return localStorage.getItem('currentFileName') || 'Nenhum arquivo carregado';
  });

  const USE_LOCAL_JSON = isLocalHost();
  // true no npm run dev, false no build/Vercel
  const ADMIN_EMAIL = 'pcp@metalosa.com.br';
  const LOCAL_DEV_USER = {
    uid: 'LOCALHOST-DEV',
    email: ADMIN_EMAIL,
    displayName: 'Dev Local',
  };
  const isAdminUser = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const ADMIN_PAGE_SIZE = 20;

  const {
    eventLogs,
    isLoading: eventLogsLoading,
    logMotherCoilEntry,
    logChildCoilEntry,
    logCut,
    logProduction,
    logShipping,
    loadInitialEvents,
    hydrateLocalEvents,
  } = useEventLogs({ persist: !USE_LOCAL_JSON });
  const eventLogsInitializedRef = useRef(false);

  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);

  const buildProductionGroupKey = (log = {}) => {
    if (!log) return 'PROD';
    if (log.productionLogId) return String(log.productionLogId);
    if (log.trackingId) {
      const parts = String(log.trackingId).split('-');
      if (parts.length > 1) return parts.slice(0, -1).join('-');
      return String(log.trackingId);
    }
    const id = String(log.id || '');
    if (id.startsWith('TEMP-PROD-')) return id.split('-').slice(0, -1).join('-');
    return id || String(log.productCode || 'PROD');
  };

  const dedupeProductionLogs = (logs = []) => {
    const unique = new Map();
    logs.forEach((log) => {
      const key =
        log.id ||
        `${log.productCode || ''}-${log.date || ''}-${log.packIndex || ''}-${
          log.timestamp || ''
        }`;
      if (!unique.has(key)) unique.set(key, log);
    });
    return Array.from(unique.values());
  };

  const aggregateProductionLogsForFallback = (logs = []) => {
    const groups = new Map();
    logs.forEach((log) => {
      const key = buildProductionGroupKey(log);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          reference: log,
          entries: [],
          totalPieces: 0,
          packs: [],
        });
      }
      const group = groups.get(key);
      group.entries.push(log);
      group.totalPieces += log.pieces || 0;
      if (log.packIndex) group.packs.push(log.packIndex);
    });

    return Array.from(groups.values()).map((group) => ({
      id: `prod-local-${group.key}`,
      eventType: EVENT_TYPES.PA_PRODUCTION,
      timestamp: group.reference.timestamp || new Date().toISOString(),
      sourceId: group.reference.productCode || group.reference.id || group.key,
      targetIds: group.entries.map((entry) => entry.id).filter(Boolean),
      details: {
        productCode: group.reference.productCode,
        productName: group.reference.productName,
        pieces: group.totalPieces,
        packIndex: group.packs.join(', '),
        batchCount: group.entries.length,
      },
      raw: group.reference,
    }));
  };

  // Timer para esconder botão de apagar após 10 min
  useEffect(() => {
    const interval = setInterval(() => setOpsTimerTick(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (consultScanTimerRef.current) {
        clearInterval(consultScanTimerRef.current);
      }
      if (consultStreamRef.current) {
        consultStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (newMotherCoil.code && motherCatalog.length > 0) {
      const found = motherCatalog.find(m => m.code.toString() === newMotherCoil.code.toString());
      if (found) {
        setNewMotherCoil(prev => ({ ...prev, material: found.description, thickness: found.thickness || prev.thickness, type: found.type || prev.type }));
      }
    }
  }, [newMotherCoil.code, motherCatalog]);

  useEffect(() => {
    if (USE_LOCAL_JSON) {
    const makeTimestamp = () => new Date().toISOString();
    const dedupedProductionLogs = dedupeProductionLogs(productionLogs);
    const aggregatedProductionEvents = aggregateProductionLogsForFallback(dedupedProductionLogs);

    const fallbackEvents = [
      ...cuttingLogs.map((log) => ({
        id: `cut-local-${log.id}`,
        eventType: EVENT_TYPES.B2_CUT,
        timestamp: log.timestamp || makeTimestamp(),
        sourceId: log.motherId || log.motherCode || log.id,
        targetIds: Array.isArray(log.generatedItems) ? log.generatedItems : [],
        details: {
          motherCode: log.motherCode,
          newChildCount: log.outputCount,
          scrap: log.scrap,
          totalWeight: log.inputWeight,
          generatedItems: log.generatedItems,
        },
        raw: log,
      })),
      ...aggregatedProductionEvents,
      ...shippingLogs.map((log) => ({
        id: `ship-local-${log.id}`,
        eventType: EVENT_TYPES.PA_SHIPPING,
        timestamp: log.timestamp || makeTimestamp(),
        sourceId: log.productCode || log.id,
        targetIds: [log.id],
        details: {
          productCode: log.productCode,
          productName: log.productName,
          quantity: log.quantity,
          destination: log.destination,
        },
        raw: log,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 25);
    hydrateLocalEvents(fallbackEvents);
      return;
    }

    if (!eventLogsInitializedRef.current) {
      loadInitialEvents()
        .catch(() => {})
        .finally(() => {
          eventLogsInitializedRef.current = true;
        });
    }
  }, [USE_LOCAL_JSON, cuttingLogs, productionLogs, shippingLogs, hydrateLocalEvents, loadInitialEvents]);

  const dedupeById = (list = []) => {
    const map = new Map();
    list.forEach((item) => {
      if (!item || item.id === undefined || item.id === null) return;
      map.set(String(item.id), item);
    });
    return Array.from(map.values());
  };

  const logUserAction = async (action, payload = {}) => {
    if (!user) return;
    try {
      await saveToDb('userLogs', {
        action,
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        payload
      });
    } catch (err) {
      console.error('Erro ao registrar log de usuário:', err);
    }
  };

  useEffect(() => {
    if (USE_LOCAL_JSON) {
      setUser(LOCAL_DEV_USER);
      setAuthLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        setMotherCoils([]);
        setChildCoils([]);
        setMotherCatalog([]);
        setProductCatalog([]);
        setProductionLogs([]);
        setCuttingLogs([]);
        setShippingLogs([]);
      }
    });

    return () => unsubscribe();
  }, [USE_LOCAL_JSON]);

  useEffect(() => {
    if (activeTab === 'admin' && !isAdminUser) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdminUser]);

    // CARREGAR DADOS (Firebase com fallback no localStorage)
    
  
  
  

// IMPORTANTE: Adicione estes imports do Firebase no topo do arquivo




// DADOS DO FIREBASE ATUALIZANDO !!




  // 1. CARREGAMENTO EM TEMPO REAL (Conexão Viva)
  useEffect(() => {
  if (!user) return;

  if (USE_LOCAL_JSON) {
    console.log("[DATA] Rodando com JSON local (sem Firebase)");

    const sortLogs = (arr = []) => {
      return [...arr].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0).getTime();
        const dateB = new Date(b.timestamp || b.date || 0).getTime();
        return dateB - dateA;
      });
    };

    setMotherCoils(backupData.motherCoils || []);
    setChildCoils(backupData.childCoils || []);
    setMotherCatalog(backupData.motherCatalog || []);
    setProductCatalog(backupData.productCatalog || []);
    setProductionLogs(sortLogs(backupData.productionLogs || []));
    setCuttingLogs(sortLogs(backupData.cuttingLogs || []));
    setShippingLogs(sortLogs(backupData.shippingLogs || []));

    return;
  }

  // 2) MODO PRODUÇÃO -> usa Firebase normalmente
  const unsubs = []; // conexões abertas, para limpar depois

  const setupListener = (collectionName, setter) => {
    try {
      const q = collection(db, collectionName);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (collectionName.includes('Logs')) {
            data.sort((a, b) => {
              const dateA = new Date(a.timestamp || a.date || 0).getTime();
              const dateB = new Date(b.timestamp || b.date || 0).getTime();
              return dateB - dateA;
            });
          }

          setter(data);

          try {
            localStorage.setItem(collectionName, JSON.stringify(data));
          } catch (e) {
            console.log('Erro ao salvar cache local de', collectionName);
          }
        },
        (error) => {
          console.error(`Erro de conexão com ${collectionName}:`, error);
          try {
            const saved = localStorage.getItem(collectionName);
            if (saved) setter(JSON.parse(saved));
          } catch (e) {
            console.log('Erro no fallback local de', collectionName);
          }
        }
      );

      unsubs.push(unsubscribe);
    } catch (err) {
      console.error(`Erro ao configurar listener para ${collectionName}:`, err);
    }
  };

  // aqui você liga todas as coleções que já usava no Firebase
  setupListener('motherCoils', setMotherCoils);
  setupListener('childCoils', setChildCoils);
  setupListener('motherCatalog', setMotherCatalog);
  setupListener('productCatalog', setProductCatalog);
  setupListener('productionLogs', setProductionLogs);
  setupListener('cuttingLogs', setCuttingLogs);
  setupListener('shippingLogs', setShippingLogs);

  return () => {
    unsubs.forEach((u) => u && u());
  };
}, [user]);


 // Roda apenas uma vez ao montar a tela

  // 2. BACKUP LOCAL (Mantive igual, pois é uma segurança extra)
  useEffect(() => {
    try {
      localStorage.setItem('currentFileName', currentFileName);
      localStorage.setItem('motherCoils', JSON.stringify(motherCoils));
      localStorage.setItem('childCoils', JSON.stringify(childCoils));
      localStorage.setItem('productionLogs', JSON.stringify(productionLogs));
      localStorage.setItem('shippingLogs', JSON.stringify(shippingLogs));
      localStorage.setItem('cuttingLogs', JSON.stringify(cuttingLogs));
    } catch (error) {
      console.error('Erro ao salvar backup local', error);
    }
  }, [currentFileName, motherCoils, childCoils, productionLogs, shippingLogs, cuttingLogs]);

  // ... (Sua função updateMotherCoil continua igual)

    // BACKUP LOCAL: sempre que mudar, salva cópia no navegador
  useEffect(() => {
    try {
      localStorage.setItem('currentFileName', currentFileName);
      localStorage.setItem('motherCoils', JSON.stringify(motherCoils));
      localStorage.setItem('childCoils', JSON.stringify(childCoils));
      localStorage.setItem('productionLogs', JSON.stringify(productionLogs));
      localStorage.setItem('shippingLogs', JSON.stringify(shippingLogs));
      localStorage.setItem('cuttingLogs', JSON.stringify(cuttingLogs));
    } catch (error) {
      console.error('Erro ao salvar backup local', error);
    }
  }, [currentFileName, motherCoils, childCoils, productionLogs, shippingLogs, cuttingLogs]);


      const updateMotherCoil = async (updatedCoil) => {
    // 1. Calcula quanto já foi consumido dessa bobina antes de editar
    // (Peso Original Antigo - Saldo Atual Antigo = O que já gastou)
    const consumed = (updatedCoil.originalWeight || 0) - (updatedCoil.remainingWeight || 0);
    
    // 2. Pega o NOVO peso total que você digitou no formulário
    const newTotalWeight = parseFloat(updatedCoil.weight) || 0;

    const safeCoil = {
      ...updatedCoil,
      weight: newTotalWeight,
      originalWeight: newTotalWeight, // Atualiza o peso de referência
      // 3. O novo saldo é o Novo Total menos o que já tinha sido gasto
      // (Math.max garante que não fique negativo)
      remainingWeight: Math.max(0, newTotalWeight - consumed), 
      width: parseFloat(updatedCoil.width) || 0,
    };

    // ... (o resto da função updateMotherCoil continua igual: setMotherCoils e updateInDb) 

    // Atualiza otimista no estado
    setMotherCoils(prev =>
      prev.map(m => (m.id === safeCoil.id ? safeCoil : m))
    );
    setEditingMotherCoil(null); // Fecha o modal

    if (USE_LOCAL_JSON) {
      console.log('[DATA] Atualização de bobina mãe aplicada apenas localmente (JSON).');
      return;
    }

    try {
      await updateInDb('motherCoils', safeCoil.id, safeCoil);
    } catch (error) {
      console.error('Erro ao atualizar bobina no Firebase', error);
      alert('Atualizei só localmente; não consegui salvar no servidor.');
    }
  };

// fINAL DOS DADOS ATUALIZANDO 


  const getUniqueB2Types = (motherType) => {
    const uniqueMap = new Map();
    productCatalog.forEach(p => {
      if (motherType && p.type && motherType.toUpperCase() !== p.type.toUpperCase()) return;
      if (!uniqueMap.has(p.b2Code)) uniqueMap.set(p.b2Code, { code: p.b2Code, name: p.b2Name, width: p.width, thickness: p.thickness, type: p.type });
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFinishedStock = () => {
    const stock = {};
    productionLogs.forEach(log => {
      if (!stock[log.productCode]) stock[log.productCode] = { code: log.productCode, name: log.productName, count: 0 };
      stock[log.productCode].count += log.pieces;
    });
    shippingLogs.forEach(log => {
      if (stock[log.productCode]) {
        stock[log.productCode].count -= log.quantity;
      }
    });
    return stock;
  };

    const addMotherCoil = async () => {
  const family = (newMotherCoil?.family || "").toUpperCase();
  const typeUpper = (newMotherCoil?.type || "").toUpperCase();
  const isInox =
    family === "INOX" || typeUpper === "INOX" || newMotherCoil?.form === "BLANK";

  // ========================
  // 1) VALIDAÇÕES
  // ========================

  // Peso é obrigatório sempre
  if (!newMotherCoil.weight) {
    return alert("Preencha o peso.");
  }

  if (isInox) {
    // Para inox: não obriga código, mas obriga escolher o tipo de inox
    if (!newMotherCoil.inoxGrade) {
      return alert("Selecione o tipo de inox.");
    }

    // Se quiser também obrigar quantidade, descomenta:
    // if (!newMotherCoil.qty) {
    //   return alert("Preencha a quantidade de peças.");
    // }
  } else {
    // Para bobina carbono/galv: continua exigindo código
    if (!newMotherCoil.code) {
      return alert("Preencha o código do lote.");
    }
  }

  // ========================
  // 2) DATA
  // ========================
  const isoDate =
    newMotherCoil.entryDate || new Date().toISOString().split("T")[0];
  const dateParts = isoDate.split("-");
  const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

  // 3) Gera um ID Temporário para mostrar na tela agora
  const tempId = Date.now().toString();

  const usinaFinal = newMotherCoil.usina === 'Outro' ? newMotherCoil.usinaOutro : newMotherCoil.usina;

  const newCoil = {
    id: tempId, // ID PROVISÓRIO
    ...newMotherCoil,
    type: newMotherCoil.type, // já vem "INOX" ou BQ/BF/etc
    weight: parseFloat(newMotherCoil.weight),
    originalWeight: parseFloat(newMotherCoil.weight),
    width: parseFloat(newMotherCoil.width) || 1200,
    remainingWeight: parseFloat(newMotherCoil.weight),
    status: "stock",
    date: formattedDate,
    usina: usinaFinal || '',
    filialDestino: newMotherCoil.filialDestino || '',
  };

  // 4) Atualiza otimista no front
  setMotherCoils((prev) => [...prev, newCoil]);

  // 5) Reseta formulário
  setNewMotherCoil({
    code: "",
    nf: "",
    weight: "",
    material: "",
    width: "",
    thickness: "",
    type: "",
    entryDate: new Date().toISOString().split("T")[0],
    family: "",
    form: "",
    inoxGrade: "",
    qty: "",
    length: "",
    usina: "",
    usinaOutro: "",
    filialDestino: "",
  });

  try {
    // 6) Persiste no Firebase (sem o ID provisório)
    const { id, ...coilDataToSend } = newCoil;
    const savedItem = await saveToDb("motherCoils", coilDataToSend);
    await logUserAction('ENTRADA_MP', {
      motherCode: coilDataToSend.code,
      weight: coilDataToSend.weight,
      nf: coilDataToSend.nf
    });
    await logMotherCoilEntry(savedItem, user?.uid || 'local-dev', {
      userEmail: user?.email || 'offline@local',
    });

    // 7) Troca o ID provisório pelo ID real
    setMotherCoils((prev) =>
      prev.map((item) =>
        item.id === tempId ? { ...item, id: savedItem.id } : item
      )
    );

    alert("Bobina salva na Nuvem! Data: " + formattedDate);
  } catch (error) {
    console.error("Erro ao salvar bobina no Firebase", error);
    alert(
      "Erro de conexão! A bobina está na tela, mas NÃO foi salva no banco. Se der F5 ela some."
    );
    // Se quiser remover da tela quando der erro, descomenta:
    // setMotherCoils(prev => prev.filter(m => m.id !== tempId));
  }
};


  const addPurchasedChildCoil = async () => {
    if (isSavingB2PurchaseRef.current || isSavingB2Purchase) return;
    const { nf, entryDate, b2Code, b2Name, weight, quantity, width, thickness, type } = newB2Purchase;

    if (!nf || !b2Code || !b2Name || !weight) {
      return alert("Preencha NF, tipo de bobina 2, descricao e peso total.");
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return alert("Informe a quantidade de bobinas.");
    }

    const totalWeight = parseFloat(String(weight).replace(",", "."));
    if (!totalWeight || totalWeight <= 0) {
      return alert("Informe um peso total vÇ­lido.");
    }

    const perCoilWeight = totalWeight / qty;
    const formattedDate =
      entryDate && entryDate.includes("-")
        ? (() => {
            const [y, m, d] = entryDate.split("-");
            return `${d}/${m}/${y}`;
          })()
        : new Date().toLocaleDateString();

    const tempChildren = Array.from({ length: qty }).map((_, idx) => ({
      id: `TEMP-B2NF-${Date.now()}-${idx}`,
      motherId: null,
      motherCode: nf ? `NF ${nf}` : "NF EXTERNA",
      nf,
      b2Code,
      b2Name,
      width: parseFloat(width) || 0,
      thickness: thickness || "-",
      type: type || "ND",
      weight: perCoilWeight,
      initialWeight: perCoilWeight,
      status: "stock",
      createdAt: formattedDate,
      origin: "NF",
      source: "purchase_nf",
    }));

    const prevChildren = [...childCoils];
    setChildCoils((prev) => dedupeById([...prev, ...tempChildren]));

    isSavingB2PurchaseRef.current = true;
    setIsSavingB2Purchase(true);

    try {
      if (USE_LOCAL_JSON) {
        await Promise.all(
          tempChildren.map((child) =>
            logChildCoilEntry(child, user?.uid || 'local-dev', {
              userEmail: user?.email || 'offline@local',
            }),
          ),
        );
        alert("Bobina 2 pronta registrada localmente (modo JSON).");
      } else {
        const savedChildren = [];
        for (const child of tempChildren) {
          const { id: tempId, ...payload } = child;
          const saved = await saveToDb("childCoils", payload);
          savedChildren.push(saved);
        }

        setChildCoils((prev) => {
          const others = prev.filter((c) => !tempChildren.some((t) => t.id === c.id));
          return dedupeById([...others, ...savedChildren]);
        });

        await logUserAction("ENTRADA_B2_NF", {
          nf,
          b2Code,
          qty,
          totalWeight,
        });
        await Promise.all(
          savedChildren.map((child) =>
            logChildCoilEntry(child, user?.uid || 'local-dev', {
              userEmail: user?.email || 'offline@local',
            }),
          ),
        );

        setItemsToPrint(savedChildren);
        setPrintType("coil");
        setShowPrintModal(true);
      }

      setNewB2Purchase({
        nf: "",
        entryDate: new Date().toISOString().split("T")[0],
        b2Code: "",
        b2Name: "",
        width: "",
        thickness: "",
        type: "",
        weight: "",
        quantity: "1",
      });
      setShowB2PurchaseForm(false);
      alert("Bobina 2 pronta registrada no estoque.");
    } catch (error) {
      console.error("Erro ao salvar bobina 2 comprada", error);
      alert("Erro ao salvar a bobina 2 na nuvem. Reverto a alteracao local.");
      setChildCoils(prevChildren);
    } finally {
      setIsSavingB2Purchase(false);
      isSavingB2PurchaseRef.current = false;
    }
  };

  const deleteMotherCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina permanentemente.")) {
      return;
    }

    // Remove otimista no front
    setMotherCoils(prev => prev.filter(m => m.id !== id));

    if (USE_LOCAL_JSON) {
      console.log('[DATA] Exclusão de bobina mãe realizada apenas localmente (JSON).');
      return;
    }

    try {
      await deleteFromDb('motherCoils', id);
    } catch (error) {
      console.error('Erro ao excluir bobina no Firebase', error);
      alert('Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.');

      try {
        const mothers = await loadFromDb('motherCoils');
        if (Array.isArray(mothers)) {
          setMotherCoils(mothers);
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar dados após falha de exclusão', reloadError);
      }
    }
  };

  const deleteChildCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina 2 permanentemente.")) {
      return;
    }

    setChildCoils((prev) => prev.filter((c) => c.id !== id));

    if (USE_LOCAL_JSON) return;

    try {
      await deleteFromDb("childCoils", id);
    } catch (error) {
      console.error("Erro ao excluir bobina 2 no Firebase", error);
      alert("Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.");

      try {
        const children = await loadFromDb("childCoils");
        if (Array.isArray(children)) {
          setChildCoils(children);
        }
      } catch (reloadError) {
        console.error("Erro ao recarregar dados após falha de exclusão de B2", reloadError);
      }
    }
  };

  const deleteAdminMovement = async (collectionName, id) => {
    if (!id) return;
    if (!window.confirm("Tem certeza? Isso apagar\u00e1 a movimenta\u00e7\u00e3o permanentemente.")) {
      return;
    }

    const findEventLog = (eventType, matcher) => {
      const logs = Array.isArray(eventLogs) ? eventLogs : [];
      const candidates = logs.filter((event) => event.eventType === eventType);
      if (!matcher) return candidates[0];
      return candidates.find(matcher);
    };

    const revertCuttingLog = async (log) => {
      if (!log) return false;
      const inputWeight = Number(log.inputWeight || 0);
      const scrapWeight = Number(log.scrap || 0);
      const motherCode = String(log.motherCode || '');

      const eventMatch = findEventLog(EVENT_TYPES.B2_CUT, (event) => {
        const details = event.details || {};
        const sameCode = String(details.motherCode || '') === motherCode;
        const sameWeight = Number(details.totalWeight || 0) === inputWeight;
        return sameCode && (sameWeight || details.date === log.date);
      });

      const motherId = eventMatch?.sourceId;
      let mother = motherCoils.find((m) => String(m.id) === String(motherId));

      if (!mother && motherCode) {
        const candidates = motherCoils.filter((m) => String(m.code) === motherCode);
        if (candidates.length === 1) {
          mother = candidates[0];
        }
      }

      if (!mother) {
        alert('N\u00e3o consegui identificar a bobina m\u00e3e para reverter.');
        return false;
      }

      const targetChildIds = (eventMatch?.targetIds || []).map(String);
      if (targetChildIds.length === 0) {
        alert('N\u00e3o encontrei as bobinas B2 geradas para reverter.');
        return false;
      }

      const usedChildMap = new Map();
      productionLogs.forEach((prod) => {
        (prod.childIds || []).forEach((childId) => {
          const key = String(childId);
          if (targetChildIds.includes(key)) {
            if (!usedChildMap.has(key)) usedChildMap.set(key, []);
            usedChildMap.get(key).push(prod.id || prod.productCode || 'PROD');
          }
        });
      });

      if (usedChildMap.size > 0) {
        const blockedItems = Array.from(usedChildMap.entries()).map(([childId, prodIds]) => {
          const coil = childCoils.find((c) => String(c.id) === childId);
          return {
            id: childId,
            b2Code: coil?.b2Code || coil?.code || '-',
            b2Name: coil?.b2Name || coil?.description || '-',
            prodIds,
          };
        });
        setBlockedCutModal({
          motherCode: motherCode || mother?.code || '-',
          items: blockedItems,
        });
        return false;
      }

      const currentRemaining = Number(mother.remainingWeight || 0);
      const originalWeight = Number(mother.originalWeight || 0);
      let nextRemaining = currentRemaining + inputWeight;
      if (originalWeight > 0) {
        nextRemaining = Math.min(originalWeight, nextRemaining);
      }
      const nextCutWaste = Math.max(0, Number(mother.cutWaste || 0) - scrapWeight);
      const nextStatus = nextRemaining > 0 ? 'stock' : mother.status;

      setMotherCoils((prev) =>
        prev.map((m) =>
          m.id === mother.id
            ? { ...m, remainingWeight: nextRemaining, cutWaste: nextCutWaste, status: nextStatus }
            : m,
        ),
      );
      setChildCoils((prev) => prev.filter((c) => !targetChildIds.includes(String(c.id))));

      if (USE_LOCAL_JSON) return true;

      try {
        await updateInDb('motherCoils', mother.id, {
          remainingWeight: nextRemaining,
          cutWaste: nextCutWaste,
          status: nextStatus,
        });

        for (const childId of targetChildIds) {
          await deleteFromDb('childCoils', childId);
        }
        return true;
      } catch (error) {
        console.error('Erro ao reverter corte (admin)', error);
        alert('Erro ao reverter corte no Firebase. Nada foi alterado.');
        return false;
      }
    };

    const revertProductionLog = async (log) => {
      if (!log) return false;
      const eventMatch = findEventLog(EVENT_TYPES.PA_PRODUCTION, (event) => {
        const details = event.details || {};
        const sameCode = String(details.productCode || '') === String(log.productCode || '');
        return event.targetIds?.includes(String(log.id)) || sameCode;
      });

      const childIds = [
        ...(Array.isArray(log.childIds) ? log.childIds : []),
        ...(Array.isArray(eventMatch?.details?.childIds) ? eventMatch.details.childIds : []),
      ]
        .filter(Boolean)
        .map(String);

      if (childIds.length === 0) {
        return true;
      }

      const usedElsewhere = new Set(
        productionLogs
          .filter((entry) => entry.id !== log.id)
          .flatMap((entry) => (entry.childIds || []).map(String)),
      );

      const toRestore = childIds.filter((childId) => !usedElsewhere.has(childId));

      if (toRestore.length === 0) {
        return true;
      }

      setChildCoils((prev) =>
        prev.map((coil) =>
          toRestore.includes(String(coil.id)) ? { ...coil, status: 'stock' } : coil,
        ),
      );

      if (USE_LOCAL_JSON) return true;

      try {
        for (const childId of toRestore) {
          await updateInDb('childCoils', childId, { status: 'stock' });
        }
        return true;
      } catch (error) {
        console.error('Erro ao reverter produ\u00e7\u00e3o (admin)', error);
        alert('Erro ao reverter produ\u00e7\u00e3o no Firebase.');
        return false;
      }
    };

    let log = null;
    if (collectionName === 'cuttingLogs') {
      log = cuttingLogs.find((entry) => String(entry.id) === String(id));
      if (!(await revertCuttingLog(log))) return;
    }
    if (collectionName === 'productionLogs') {
      log = productionLogs.find((entry) => String(entry.id) === String(id));
      if (!(await revertProductionLog(log))) return;
    }

    const setters = {
      cuttingLogs: setCuttingLogs,
      productionLogs: setProductionLogs,
      shippingLogs: setShippingLogs,
    };

    const setter = setters[collectionName];
    if (setter) {
      setter((prev) => prev.filter((item) => item.id !== id));
    }

    if (USE_LOCAL_JSON) {
      alert("Modo local: exclus\u00e3o aplicada apenas na tela.");
      return;
    }

    try {
      await deleteFromDb(collectionName, id);
    } catch (error) {
      console.error(`Erro ao excluir movimenta\u00e7\u00e3o em ${collectionName}`, error);
      alert("N\u00e3o consegui excluir no servidor. Vou tentar recarregar os dados.");
      try {
        const refreshed = await loadFromDb(collectionName);
        if (Array.isArray(refreshed) && setter) {
          setter(refreshed);
        }
      } catch (reloadError) {
        console.error("Erro ao recarregar dados ap\u00f3s falha de exclus\u00e3o", reloadError);
      }
    }
  };

  const startEditAdminMovement = (mov) => {
    if (!mov?.id || !mov?.collection) return;
    let log = null;
    if (mov.collection === 'cuttingLogs') {
      log = cuttingLogs.find((entry) => String(entry.id) === String(mov.id));
    }
    if (mov.collection === 'productionLogs') {
      log = productionLogs.find((entry) => String(entry.id) === String(mov.id));
    }
    if (mov.collection === 'shippingLogs') {
      log = shippingLogs.find((entry) => String(entry.id) === String(mov.id));
    }
    if (!log) return;

    if (mov.collection === 'cuttingLogs') {
      setAdminMovementEditForm({
        collection: mov.collection,
        id: log.id,
        date: log.date || log.timestamp || '',
        motherCode: log.motherCode || '',
        inputWeight: log.inputWeight ?? log.weight ?? '',
        outputCount: log.outputCount ?? log.quantity ?? '',
        scrap: log.scrap ?? '',
        generatedItems: log.generatedItems || '',
      });
      return;
    }

    if (mov.collection === 'productionLogs') {
      setAdminMovementEditForm({
        collection: mov.collection,
        id: log.id,
        date: log.date || log.timestamp || '',
        productCode: log.productCode || '',
        productName: log.productName || '',
        pieces: log.pieces ?? '',
        weight: log.weight ?? '',
        b2Code: log.b2Code || '',
        motherCode: log.motherCode || '',
        scrap: log.scrap ?? '',
      });
      return;
    }

    if (mov.collection === 'shippingLogs') {
      setAdminMovementEditForm({
        collection: mov.collection,
        id: log.id,
        date: log.date || log.timestamp || '',
        productCode: log.productCode || '',
        productName: log.productName || '',
        quantity: log.quantity ?? '',
        destination: log.destination || '',
      });
    }
  };

  const saveAdminMovementEdit = async () => {
    if (!adminMovementEditForm) return;
    const { collection, id } = adminMovementEditForm;
    if (!collection || !id) return;

    const normalizeDate = (value) => (value || '').trim();
    const payloadByCollection = {
      cuttingLogs: {
        date: normalizeDate(adminMovementEditForm.date),
        timestamp: normalizeDate(adminMovementEditForm.date),
        motherCode: adminMovementEditForm.motherCode || '',
        inputWeight: parseFloat(String(adminMovementEditForm.inputWeight || '').replace(',', '.')) || 0,
        outputCount: parseInt(adminMovementEditForm.outputCount || '0', 10) || 0,
        scrap: parseFloat(String(adminMovementEditForm.scrap || '').replace(',', '.')) || 0,
        generatedItems: adminMovementEditForm.generatedItems || '',
      },
      productionLogs: {
        date: normalizeDate(adminMovementEditForm.date),
        timestamp: normalizeDate(adminMovementEditForm.date),
        productCode: adminMovementEditForm.productCode || '',
        productName: adminMovementEditForm.productName || '',
        pieces: parseInt(adminMovementEditForm.pieces || '0', 10) || 0,
        weight: parseFloat(String(adminMovementEditForm.weight || '').replace(',', '.')) || 0,
        b2Code: adminMovementEditForm.b2Code || '',
        motherCode: adminMovementEditForm.motherCode || '',
        scrap: parseFloat(String(adminMovementEditForm.scrap || '').replace(',', '.')) || 0,
      },
      shippingLogs: {
        date: normalizeDate(adminMovementEditForm.date),
        timestamp: normalizeDate(adminMovementEditForm.date),
        productCode: adminMovementEditForm.productCode || '',
        productName: adminMovementEditForm.productName || '',
        quantity: parseInt(adminMovementEditForm.quantity || '0', 10) || 0,
        destination: adminMovementEditForm.destination || '',
      },
    };

    const payload = payloadByCollection[collection];
    if (!payload) return;

    const updateState = (setter) => {
      setter((prev) =>
        prev.map((item) =>
          String(item.id) === String(id) ? { ...item, ...payload } : item,
        ),
      );
    };

    if (collection === 'cuttingLogs') updateState(setCuttingLogs);
    if (collection === 'productionLogs') updateState(setProductionLogs);
    if (collection === 'shippingLogs') updateState(setShippingLogs);

    if (USE_LOCAL_JSON) {
      alert('Modo local: ediÃ§Ã£o aplicada apenas na tela.');
      setAdminMovementEditForm(null);
      return;
    }

    try {
      await updateInDb(collection, id, payload);
      setAdminMovementEditForm(null);
    } catch (error) {
      console.error('Erro ao editar movimentaÃ§Ã£o', error);
      alert('NÃ£o consegui salvar no Firebase. Vou tentar recarregar os dados.');
      try {
        const refreshed = await loadFromDb(collection);
        if (Array.isArray(refreshed)) {
          if (collection === 'cuttingLogs') setCuttingLogs(refreshed);
          if (collection === 'productionLogs') setProductionLogs(refreshed);
          if (collection === 'shippingLogs') setShippingLogs(refreshed);
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar movimentaÃ§Ãµes apÃ³s falha de ediÃ§Ã£o', reloadError);
      }
    }
  };

  const addAdminMotherCoil = async () => {
    const qty = Math.max(1, parseInt(adminMotherForm.quantity || '1', 10));
    const weight = parseFloat(String(adminMotherForm.weight || '').replace(',', '.'));
    if (!adminMotherForm.code || !weight) {
      return alert('Preencha c\u00f3digo e peso.');
    }

    const formattedDate = adminMotherForm.entryDate && adminMotherForm.entryDate.includes('-')
      ? (() => {
          const [y, m, d] = adminMotherForm.entryDate.split('-');
          return `${d}/${m}/${y}`;
        })()
      : new Date().toLocaleDateString();

    const basePayload = {
      code: adminMotherForm.code,
      nf: adminMotherForm.nf || '',
      weight,
      originalWeight: weight,
      remainingWeight: weight,
      width: parseFloat(String(adminMotherForm.width || '').replace(',', '.')) || 1200,
      thickness: adminMotherForm.thickness || '',
      material: adminMotherForm.material || `BOBINA ${adminMotherForm.code}`,
      type: adminMotherForm.type || '',
      status: 'stock',
      date: formattedDate,
    };

    const tempItems = Array.from({ length: qty }).map((_, idx) => ({
      id: `TEMP-ADMIN-MOTHER-${Date.now()}-${idx}`,
      ...basePayload,
    }));

    setMotherCoils((prev) => dedupeById([...prev, ...tempItems]));

    if (USE_LOCAL_JSON) {
      alert('Modo local: itens criados apenas na tela.');
      return;
    }

    try {
      const savedItems = [];
      for (const item of tempItems) {
        const { id: tempId, ...payload } = item;
        const saved = await saveToDb('motherCoils', payload);
        savedItems.push(saved);
      }

      setMotherCoils((prev) => {
        const others = prev.filter((c) => !tempItems.some((t) => t.id === c.id));
        return dedupeById([...others, ...savedItems]);
      });

      setAdminMotherForm({
        code: '',
        weight: '',
        width: '',
        thickness: '',
        material: '',
        type: '',
        nf: '',
        quantity: '1',
        entryDate: new Date().toISOString().split('T')[0],
      });

      alert('Bobina m\u00e3e criada no Firebase.');
    } catch (error) {
      console.error('Erro ao salvar bobina m\u00e3e (admin)', error);
      alert('Erro ao salvar no Firebase. Vou manter apenas localmente.');
    }
  };

  const addAdminChildCoil = async () => {
    const qty = Math.max(1, parseInt(adminB2Form.quantity || '1', 10));
    const weight = parseFloat(String(adminB2Form.weight || '').replace(',', '.'));
    if (!adminB2Form.b2Code || !adminB2Form.b2Name || !weight) {
      return alert('Preencha c\u00f3digo, descri\u00e7\u00e3o e peso.');
    }

    const formattedDate = adminB2Form.entryDate && adminB2Form.entryDate.includes('-')
      ? (() => {
          const [y, m, d] = adminB2Form.entryDate.split('-');
          return `${d}/${m}/${y}`;
        })()
      : new Date().toLocaleDateString();

    const basePayload = {
      motherId: null,
      motherCode: adminB2Form.motherCode || 'ADMIN',
      nf: adminB2Form.nf || '',
      b2Code: adminB2Form.b2Code,
      b2Name: adminB2Form.b2Name,
      width: parseFloat(String(adminB2Form.width || '').replace(',', '.')) || 0,
      thickness: adminB2Form.thickness || '-',
      type: adminB2Form.type || 'ND',
      weight,
      initialWeight: weight,
      status: 'stock',
      createdAt: formattedDate,
      origin: 'ADMIN',
      source: 'admin_manual',
    };

    const tempItems = Array.from({ length: qty }).map((_, idx) => ({
      id: `TEMP-ADMIN-B2-${Date.now()}-${idx}`,
      ...basePayload,
    }));

    setChildCoils((prev) => dedupeById([...prev, ...tempItems]));

    if (USE_LOCAL_JSON) {
      alert('Modo local: itens criados apenas na tela.');
      return;
    }

    try {
      const savedItems = [];
      for (const item of tempItems) {
        const { id: tempId, ...payload } = item;
        const saved = await saveToDb('childCoils', payload);
        savedItems.push(saved);
      }

      setChildCoils((prev) => {
        const others = prev.filter((c) => !tempItems.some((t) => t.id === c.id));
        return dedupeById([...others, ...savedItems]);
      });

      setAdminB2Form({
        b2Code: '',
        b2Name: '',
        weight: '',
        width: '',
        thickness: '',
        type: '',
        quantity: '1',
        entryDate: new Date().toISOString().split('T')[0],
      });

      alert('Bobina B2 criada no Firebase.');
    } catch (error) {
      console.error('Erro ao salvar bobina B2 (admin)', error);
      alert('Erro ao salvar no Firebase. Vou manter apenas localmente.');
    }
  };

  const addAdminProductCatalog = async () => {
    if (!adminProductForm.code || !adminProductForm.name) {
      return alert('Preencha c\u00f3digo e descri\u00e7\u00e3o.');
    }

    const payload = {
      code: adminProductForm.code,
      name: adminProductForm.name,
      b2Code: adminProductForm.b2Code || '',
      b2Name: adminProductForm.b2Name || '',
      width: parseFloat(String(adminProductForm.width || '').replace(',', '.')) || 0,
      thickness: adminProductForm.thickness || '',
      type: adminProductForm.type || '',
      motherCode: adminProductForm.motherCode || '',
    };

    const tempItem = { id: `TEMP-ADMIN-PROD-${Date.now()}`, ...payload };
    setProductCatalog((prev) => dedupeById([...prev, tempItem]));

    if (USE_LOCAL_JSON) {
      alert('Modo local: produto criado apenas na tela.');
      return;
    }

    try {
      const { id: tempId, ...data } = tempItem;
      const saved = await saveToDb('productCatalog', data);

      setProductCatalog((prev) => {
        const others = prev.filter((p) => p.id !== tempItem.id);
        return dedupeById([...others, saved]);
      });

      setAdminProductForm({
        code: '',
        name: '',
        b2Code: '',
        b2Name: '',
        width: '',
        thickness: '',
        type: '',
        motherCode: '',
      });

      alert('Produto criado no Firebase.');
    } catch (error) {
      console.error('Erro ao salvar produto (admin)', error);
      alert('Erro ao salvar no Firebase. Vou manter apenas localmente.');
    }
  };

  const addAdminPaStock = async () => {
    const pieces = parseInt(adminPaForm.pieces || '0', 10);
    if (!adminPaForm.productCode || !pieces) {
      return alert('Preencha c\u00f3digo e quantidade.');
    }

    const prodInfo = productCatalog.find((p) => p.code === adminPaForm.productCode);
    const productName = adminPaForm.productName || prodInfo?.name || adminPaForm.productCode;
    const formattedDate = adminPaForm.entryDate && adminPaForm.entryDate.includes('-')
      ? (() => {
          const [y, m, d] = adminPaForm.entryDate.split('-');
          return `${d}/${m}/${y}`;
        })()
      : new Date().toLocaleDateString();

    const timestamp = new Date().toISOString();
    const tempLog = {
      id: `TEMP-ADMIN-PA-${Date.now()}`,
      productCode: adminPaForm.productCode,
      productName,
      pieces,
      date: formattedDate,
      timestamp,
      origin: 'ADMIN',
    };

    setProductionLogs((prev) => [tempLog, ...prev]);

    if (USE_LOCAL_JSON) {
      alert('Modo local: estoque criado apenas na tela.');
      return;
    }

    try {
      const { id: tempId, ...payload } = tempLog;
      const saved = await saveToDb('productionLogs', payload);

      setProductionLogs((prev) =>
        prev.map((log) => (log.id === tempLog.id ? saved : log))
      );

      setAdminPaForm({
        productCode: '',
        productName: '',
        pieces: '',
        entryDate: new Date().toISOString().split('T')[0],
      });

      alert('Estoque de PA criado no Firebase.');
    } catch (error) {
      console.error('Erro ao salvar estoque de PA (admin)', error);
      alert('Erro ao salvar no Firebase. Vou manter apenas localmente.');
    }
  };

  const startEditCatalogItem = (item) => {
    if (!item) return;
    setAdminCatalogEdit(item);
    setAdminCatalogEditForm({
      id: item.id,
      code: item.code || '',
      name: item.name || '',
      b2Code: item.b2Code || '',
      b2Name: item.b2Name || '',
      width: item.width || '',
      thickness: item.thickness || '',
      type: item.type || '',
      motherCode: item.motherCode || '',
    });
  };

  const saveAdminCatalogEdit = async () => {
    if (!adminCatalogEditForm?.code || !adminCatalogEditForm?.name) {
      return alert('Preencha c\u00f3digo e descri\u00e7\u00e3o.');
    }

    const payload = {
      code: adminCatalogEditForm.code,
      name: adminCatalogEditForm.name,
      b2Code: adminCatalogEditForm.b2Code || '',
      b2Name: adminCatalogEditForm.b2Name || '',
      width: parseFloat(String(adminCatalogEditForm.width || '').replace(',', '.')) || 0,
      thickness: adminCatalogEditForm.thickness || '',
      type: adminCatalogEditForm.type || '',
      motherCode: adminCatalogEditForm.motherCode || '',
    };

    setProductCatalog((prev) =>
      prev.map((item) =>
        item.id === adminCatalogEditForm.id || item.code === adminCatalogEditForm.code
          ? { ...item, ...payload }
          : item,
      ),
    );

    if (USE_LOCAL_JSON) {
      setAdminCatalogEdit(null);
      setAdminCatalogEditForm(null);
      return;
    }

    if (!adminCatalogEditForm.id) {
      alert('Este item n\u00e3o possui ID do Firebase. Editei apenas localmente.');
      setAdminCatalogEdit(null);
      setAdminCatalogEditForm(null);
      return;
    }

    try {
      await updateInDb('productCatalog', adminCatalogEditForm.id, payload);
      setAdminCatalogEdit(null);
      setAdminCatalogEditForm(null);
      alert('Produto atualizado no Firebase.');
    } catch (error) {
      console.error('Erro ao atualizar produto (admin)', error);
      alert('Erro ao atualizar no Firebase.');
    }
  };

  const startEditMotherCatalogItem = (item) => {
    if (!item) return;
    setAdminMotherCatalogEditForm({
      id: item.id,
      code: item.code || '',
      description: item.description || '',
      thickness: item.thickness || '',
      type: item.type || '',
    });
  };

  const saveAdminMotherCatalogEdit = async () => {
    if (!adminMotherCatalogEditForm?.code || !adminMotherCatalogEditForm?.description) {
      return alert('Preencha c\u00f3digo e descri\u00e7\u00e3o.');
    }

    const payload = {
      code: adminMotherCatalogEditForm.code,
      description: adminMotherCatalogEditForm.description,
      thickness: adminMotherCatalogEditForm.thickness || '',
      type: adminMotherCatalogEditForm.type || '',
    };

    setMotherCatalog((prev) =>
      prev.map((item) =>
        item.id === adminMotherCatalogEditForm.id || item.code === adminMotherCatalogEditForm.code
          ? { ...item, ...payload }
          : item,
      ),
    );

    if (USE_LOCAL_JSON) {
      setAdminMotherCatalogEditForm(null);
      return;
    }

    if (!adminMotherCatalogEditForm.id) {
      alert('Este item n\u00e3o possui ID do Firebase. Editei apenas localmente.');
      setAdminMotherCatalogEditForm(null);
      return;
    }

    try {
      await updateInDb('motherCatalog', adminMotherCatalogEditForm.id, payload);
      setAdminMotherCatalogEditForm(null);
      alert('Cat\u00e1logo de bobinas atualizado no Firebase.');
    } catch (error) {
      console.error('Erro ao atualizar cat\u00e1logo de bobinas (admin)', error);
      alert('Erro ao atualizar no Firebase.');
    }
  };

  const deleteAdminProductionByCode = async (productCode) => {
    if (!productCode) return;
    if (!window.confirm(`Tem certeza? Isso apagar\u00e1 todas as produ\u00e7\u00f5es de ${productCode}.`)) {
      return;
    }

    const toRemove = productionLogs.filter((log) => log.productCode === productCode);
    if (toRemove.length === 0) return;

    setProductionLogs((prev) => prev.filter((log) => log.productCode !== productCode));

    if (USE_LOCAL_JSON) {
      alert('Modo local: exclus\u00e3o aplicada apenas na tela.');
      return;
    }

    try {
      for (const log of toRemove) {
        if (log.id) {
          await deleteFromDb('productionLogs', log.id);
        }
      }
    } catch (error) {
      console.error('Erro ao apagar produ\u00e7\u00f5es (admin)', error);
      alert('N\u00e3o consegui excluir no servidor. Vou tentar recarregar os dados.');
      try {
        const refreshed = await loadFromDb('productionLogs');
        if (Array.isArray(refreshed)) {
          setProductionLogs(refreshed);
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar produ\u00e7\u00f5es ap\u00f3s falha', reloadError);
      }
    }
  };

  const updateChildCoil = async (coil) => {
    const { entryType, ...clean } = coil || {};
    const safeCoil = {
      ...clean,
      weight: parseFloat(clean.weight) || 0,
      width: parseFloat(clean.width) || 0,
    };

    setChildCoils((prev) => prev.map((c) => (c.id === safeCoil.id ? safeCoil : c)));
    setEditingChildCoil(null);

    if (USE_LOCAL_JSON) return;

    try {
      await updateInDb("childCoils", safeCoil.id, safeCoil);
    } catch (error) {
      console.error("Erro ao atualizar bobina 2 no Firebase", error);
      alert("Atualizei só localmente; não consegui salvar no servidor.");
    }
  };

  const addTempChildCoil = () => {
    // Função auxiliar para limpar números (Aceita 2000,50 e 2000.50)
    const parseWeight = (val) => {
        if (!val) return 0;
        return parseFloat(String(val).replace(',', '.').trim());
    };

    // --- LÓGICA MODO "OUTROS" ---
    if (isOtherMode) {
        if (!cutWeight || !otherDescription) return alert("Preencha a descrição e o peso.");
        
        const pesoLimpo = parseWeight(cutWeight); // <--- LIMPEZA AQUI

        setTempChildCoils([...tempChildCoils, {
            b2Code: 'CONSUMO',
            b2Name: otherDescription.toUpperCase(),
            width: 0,
            thickness: '-',
            type: 'OUTROS',
            weight: pesoLimpo,
            id: Date.now(),
            isDirectConsumption: true
        }]);
        
        setCutWeight('');
        setOtherDescription(''); 
        return;
    }

    // --- LÓGICA MODO "BOBINA 2" (PADRÃO) ---
    if (!targetB2Code || !cutWeight || !cutQuantity) return alert("Preencha todos os campos.");
    
    // Busca no ARQUIVO NOVO
    const b2Data = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === targetB2Code);
    if (!b2Data) return alert("Erro: Produto não encontrado no catálogo.");

    const totalWeight = parseWeight(cutWeight); // <--- LIMPEZA AQUI
    const qtd = parseInt(cutQuantity);
    
    if (qtd <= 0) return alert("Qtd deve ser maior que 0");

    const individualWeight = totalWeight / qtd;
    const newItems = [];
    
    for (let i = 0; i < qtd; i++) {
        newItems.push({
            b2Code: b2Data.b2Code,
            b2Name: b2Data.b2Name,
            width: parseFloat(b2Data.width),
            thickness: b2Data.thickness,
            type: b2Data.type, 
            weight: individualWeight, 
            id: Date.now() + Math.random() 
        });
    }

    setTempChildCoils([...tempChildCoils, ...newItems]);
    setCutWeight('');
    setCutQuantity('');
  };
  const confirmCut = async () => {
    const mother = motherCoils.find(m => m.id === selectedMotherForCut);
    if (!mother) return;

    // --- 1. PREPARAÇÃO DOS DADOS ---
    const dateParts = cuttingDate.split('-');
    const dateNow = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const totalCutsWeight = tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0);
    const manualScrap = processScrap ? parseFloat(String(processScrap).replace(',', '.').trim()) : 0;
    const totalConsumed = totalCutsWeight + manualScrap;

    if (totalConsumed > mother.remainingWeight) {
      if (!window.confirm(`Peso excedido (${totalConsumed.toFixed(1)}kg). Continuar?`)) return;
    }

    const remaining = Math.max(0, mother.remainingWeight - totalConsumed);
    const isTotalConsumption = remaining < 10;

    if (!isTotalConsumption) {
      if (!window.confirm(`Vai sobrar ${remaining.toFixed(1)}kg na bobina. Confirmar mesmo assim?`)) return;
    }
    
    // Texto do Histórico
    const itemsSummary = tempChildCoils.map(t => t.isDirectConsumption ? `${t.b2Name} (${t.weight}kg)` : `${t.b2Code} - ${t.b2Name} (${t.weight.toFixed(0)}kg)`).join(', ');

    // --- 2. BACKUP DE ESTADO (Para caso dê erro) ---
    const prevMothers = [...motherCoils];
    const prevLogs = [...cuttingLogs];
    const prevChildren = [...childCoils];

    // --- 3. CRIAÇÃO DOS OBJETOS COM ID TEMPORÁRIO ---
    const tempLogId = `TEMP-LOG-${Date.now()}`;
    const newCutLog = {
      id: tempLogId,
      date: dateNow, motherCode: mother.code, motherMaterial: mother.material,
      inputWeight: totalConsumed, outputCount: tempChildCoils.length, scrap: manualScrap,
      generatedItems: itemsSummary, timestamp: new Date().toLocaleString()
    };

    const tempNewChildren = tempChildCoils
      .filter(item => !item.isDirectConsumption)
      .map((temp, index) => ({
        id: `TEMP-CHILD-${Date.now()}-${index}`, // ID Temporário
        motherId: mother.id, motherCode: mother.code,
        b2Code: temp.b2Code, b2Name: temp.b2Name, width: temp.width, thickness: temp.thickness,
        type: mother.type, weight: temp.weight, initialWeight: temp.weight, status: 'stock', createdAt: dateNow
      }));

    // Objeto de atualização da Mãe
    const motherUpdateData = {
      remainingWeight: remaining,
      status: isTotalConsumption ? 'consumed' : 'stock',
      cutWaste: (mother.cutWaste || 0) + manualScrap,
      ...(isTotalConsumption
        ? {
            consumedDate: dateNow,
            consumptionDetail: mother.consumptionDetail
              ? mother.consumptionDetail + ' + ' + itemsSummary
              : itemsSummary,
          }
        : {}),
    };

    // --- 4. ATUALIZAÇÃO OTIMISTA (NA TELA AGORA) ---
    // Atualiza Mãe
    setMotherCoils(prev => prev.map(m => m.id === mother.id ? { ...m, ...motherUpdateData } : m));
    // Adiciona Log
    setCuttingLogs(prev => [newCutLog, ...prev]);
    // Adiciona Filhas
    setChildCoils(prev => [...prev, ...tempNewChildren]);

    // Limpa formulário visualmente
    setTempChildCoils([]); setProcessScrap(''); setSelectedMotherForCut(''); setMotherSearchQuery('');

    try {
      // --- 5. PERSISTÊNCIA NO FIREBASE ---
      
      // A) Atualiza Mãe
      await updateInDb('motherCoils', mother.id, motherUpdateData);

      // B) Salva Log e pega ID Real
      const { id: logTempId, ...logData } = newCutLog;
      const savedLog = await saveToDb('cuttingLogs', logData);

      // C) Salva Filhas e pega IDs Reais
      const savedChildrenReal = [];
      for (const childTemp of tempNewChildren) {
          const { id: childTempId, ...childData } = childTemp;
          const savedChild = await saveToDb('childCoils', childData);
          savedChildrenReal.push(savedChild);
      }

      // --- 6. TROCA SILENCIOSA DE IDS (TEMP -> REAL) ---
      
      // Troca ID do Log
      setCuttingLogs(prev => prev.map(l => l.id === tempLogId ? { ...l, id: savedLog.id } : l));
      
      // Troca IDs das Filhas (Remove as Temp e bota as Reais para garantir integridade)
      setChildCoils(prev => {
          const others = prev.filter(c => !tempNewChildren.some(t => t.id === c.id));
          return [...others, ...savedChildrenReal];
      });

      // Prepara impressão com os dados reais (com ID certo para o QR Code)
      setItemsToPrint(savedChildrenReal); 
      setPrintType('coil'); 
      setShowPrintModal(true);
      await logUserAction('CORTE', {
        motherCode: mother.code,
        newChildCount: savedChildrenReal.length,
        childCodes: savedChildrenReal.map(c => c.b2Code),
        scrapKg: manualScrap
      });
      await logCut(
        mother.id,
        savedChildrenReal.map((c) => c.id),
        user?.uid || 'local-dev',
        {
          totalWeight: totalCutsWeight,
          inputWeight: totalCutsWeight,
          scrap: manualScrap,
          date: cuttingDate,
          motherCode: mother.code,
          motherMaterial: mother.material,
          originalWeight: mother.originalWeight || mother.weight,
          remainingWeight: motherUpdateData.remainingWeight,
          generatedItems: newCutLog.generatedItems,
          cuttingLogId: savedLog.id,
          childCount: savedChildrenReal.length,
          userEmail: user?.email || 'offline@local',
        },
      );
      
      alert("Corte salvo na nuvem!");

    } catch (error) {
      console.error("Erro no corte:", error);
      alert("Erro ao salvar o corte na nuvem. Revertendo alterações...");
      
      // --- 7. ROLLBACK (EM CASO DE ERRO) ---
      setMotherCoils(prevMothers);
      setCuttingLogs(prevLogs);
      setChildCoils(prevChildren);
    }
  };
  const handleImportFinishedStock = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const delimiter = text.includes(';') ? ';' : ','; // Detecta ponto e vírgula
        const rows = parseCSVLine(text, delimiter);
        
        // Pula cabeçalho e linhas vazias
        const dataRows = rows.slice(1).filter(r => r.length >= 2 && r[0]); 
        
        // --- PASSO 1: SOMAR O INVENTÁRIO DO EXCEL (AGRUPAR CÓDIGOS REPETIDOS) ---
        const inventoryMap = {}; // Vai guardar: { '00664K': 210, '00652B': 500, ... }
        
        dataRows.forEach(row => {
             const rawCode = String(row[0] || '').trim().toUpperCase();
             // Limpa o número (tira pontos de milhar e deixa apenas dígitos)
             const qtyStr = String(row[1] || '').replace(/[^0-9]/g, '');
             const qty = parseInt(qtyStr);

             if (rawCode && !isNaN(qty)) {
                 // Soma se já existir, ou cria se for novo
                 inventoryMap[rawCode] = (inventoryMap[rawCode] || 0) + qty;
             }
        });
        // -----------------------------------------------------------------------

        const newProdLogs = [...productionLogs];
        const newShipLogs = [...shippingLogs];
        const dateNow = new Date().toLocaleDateString();
        const timeNow = new Date().toLocaleString();
        
        let itemsAdjusted = 0;
        let totalQtyAdjusted = 0;
        const notFoundCodes = [];

        // --- PASSO 2: COMPARAR E AJUSTAR CADA PRODUTO ---
        Object.keys(inventoryMap).forEach(code => {
            const targetQty = inventoryMap[code]; // Quantidade TOTAL que está no Excel

            // Calcula Saldo Atual no Sistema
            const currentProd = newProdLogs
                .filter(l => String(l.productCode).trim().toUpperCase() === code)
                .reduce((acc, l) => acc + (parseInt(l.pieces)||0), 0);
                
            const currentShip = newShipLogs
                .filter(l => String(l.productCode).trim().toUpperCase() === code)
                .reduce((acc, l) => acc + (parseInt(l.quantity)||0), 0);
                
            const currentStock = currentProd - currentShip;

            // A Diferença é o Ajuste necessário
            const diff = targetQty - currentStock;

            if (diff === 0) return; // Bateu, não faz nada

            // Busca Nome do Produto
            let productData = INITIAL_PRODUCT_CATALOG.find(p => String(p.code).trim().toUpperCase() === code);
            if (!productData) {
                if (!notFoundCodes.includes(code)) notFoundCodes.push(code);
                productData = { name: `ITEM MANUAL (${code})` };
            }

            if (diff > 0) {
                // FALTA NO SISTEMA -> ENTRADA DE AJUSTE
                newProdLogs.push({
                    id: `AJUSTE-ENT-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                    date: dateNow, timestamp: timeNow,
                    productCode: code, productName: productData.name,
                    pieces: diff, weight: 0,
                    b2Code: 'INVENTARIO', motherCode: '-', scrap: 0, packIndex: 'Ajuste'
                });
            } else {
                // SOBRA NO SISTEMA -> SAÍDA DE AJUSTE
                newShipLogs.push({
                    id: `AJUSTE-SAI-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                    date: dateNow, timestamp: timeNow,
                    productCode: code, productName: productData.name,
                    quantity: Math.abs(diff),
                    destination: 'AJUSTE INVENTÁRIO'
                });
            }
            
            itemsAdjusted++;
            totalQtyAdjusted += Math.abs(diff);
        });

        setProductionLogs(newProdLogs);
        setShippingLogs(newShipLogs);
        
        let msg = `✅ Inventário Processado com Sucesso!\n\n`;
        msg += `Itens Diferentes Ajustados: ${itemsAdjusted}\n`;
        msg += `Total de Peças Movimentadas (Ajuste): ${totalQtyAdjusted}\n`;
        
        if (notFoundCodes.length > 0) {
            msg += `\n⚠️ ${notFoundCodes.length} códigos não cadastrados foram criados como manuais.`;
        }
        
        alert(msg);
        e.target.value = ''; 

      } catch (err) {
        alert("Erro ao processar: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleAdminInventoryUpload = (e, scopeOverride) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        if (rows.length < 2) return alert("Arquivo vazio ou sem cabecalho.");

        const normalizeHeader = (value) =>
          String(value || '')
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const headers = rows[0].map(normalizeHeader);
        const findIdx = (keys) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

        const idxDate = findIdx(['data']);
        const idxId = findIdx(['id', 'codigo', 'cod']);
        const idxDesc = findIdx(['descricao', 'descri']);
        const idxQty = findIdx(['peso', 'qtd', 'quantidade']);
        const idxUser = findIdx(['usuario', 'user', 'operador']);

        if (idxId === -1 || idxQty === -1) {
          return alert(`Colunas obrigatorias nao encontradas. Colunas lidas: ${headers.join(', ')}`);
        }

        const normalizeCode = (value) => String(value || '').trim().toUpperCase();
        const parseNumber = (value) => {
          if (value === undefined || value === null || value === '') return 0;
          const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleaned);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const mergedProductCatalog =
          Array.isArray(productCatalog) && productCatalog.length
            ? productCatalog
            : INITIAL_PRODUCT_CATALOG;

        const productByCode = mergedProductCatalog.reduce((acc, item) => {
          const code = normalizeCode(item?.code);
          if (code) acc[code] = item;
          return acc;
        }, {});
        const b2ByCode = mergedProductCatalog.reduce((acc, item) => {
          const code = normalizeCode(item?.b2Code || item?.code);
          if (code) acc[code] = item;
          return acc;
        }, {});

        const classifyType = (rawType, code) => {
          if (scopeOverride) return scopeOverride;
          const type = String(rawType || '').toLowerCase();
          if (type.includes('bobina') || type.includes('b2')) return 'b2';
          if (type.includes('pa') || type.includes('produto') || type.includes('acabado')) return 'pa';
          if (productByCode[code]) return 'pa';
          if (b2ByCode[code]) return 'b2';
          return null;
        };

        const b2Map = {};
        const paMap = {};
        const warnings = [];
        let skipped = 0;

        rows.slice(1).forEach((row, idx) => {
          const code = normalizeCode(row[idxId]);
          if (!code) {
            skipped += 1;
            return;
          }
          const qty = parseNumber(row[idxQty]);
          if (!qty) {
            skipped += 1;
            return;
          }

          const rawType = '';
          const scope = classifyType(rawType, code);
          if (!scope) {
            if (warnings.length < 20) warnings.push(`Linha ${idx + 2}: tipo nao identificado (${code}).`);
            skipped += 1;
            return;
          }

          const desc = idxDesc !== -1 ? String(row[idxDesc] || '').trim() : '';
          const date = idxDate !== -1 ? String(row[idxDate] || '').trim() : '';
          const user = idxUser !== -1 ? String(row[idxUser] || '').trim() : '';
          const base = { code, desc, date, user };

          if (scope === 'b2') {
            if (!b2Map[code]) b2Map[code] = { ...base, qty: 0 };
            b2Map[code].qty += qty;
          } else {
            if (!paMap[code]) paMap[code] = { ...base, qty: 0 };
            paMap[code].qty += qty;
          }
        });

        const systemB2Map = (childCoils || [])
          .filter((coil) => coil.status === 'stock')
          .reduce((acc, coil) => {
            const code = normalizeCode(coil.b2Code || coil.code);
            if (!code) return acc;
            if (!acc[code]) {
              acc[code] = {
                code,
                name: coil.b2Name || b2ByCode[code]?.b2Name || b2ByCode[code]?.name || '',
                qty: 0,
              };
            }
            acc[code].qty += Number(coil.weight) || 0;
            return acc;
          }, {});

        const finishedStock = getFinishedStock() || {};
        const systemPaMap = Object.keys(finishedStock).reduce((acc, code) => {
          const normalized = normalizeCode(code);
          acc[normalized] = {
            code: normalized,
            name: finishedStock[code]?.name || productByCode[normalized]?.name || '',
            qty: finishedStock[code]?.count || 0,
          };
          return acc;
        }, {});

        const buildRows = (fileMap, systemMap) => {
          const codes = new Set([...Object.keys(fileMap), ...Object.keys(systemMap)]);
          const rowsOut = [];
          codes.forEach((code) => {
            const fileQty = fileMap[code]?.qty || 0;
            const systemQty = systemMap[code]?.qty || 0;
            const diff = fileQty - systemQty;
            if (diff === 0) return;
            rowsOut.push({
              code,
              name: fileMap[code]?.desc || systemMap[code]?.name || '',
              fileQty,
              systemQty,
              diff,
            });
          });
          rowsOut.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
          return rowsOut;
        };

        const b2Rows = buildRows(b2Map, systemB2Map);
        const paRows = buildRows(paMap, systemPaMap);

        const totals = (map) =>
          Object.values(map).reduce((acc, item) => acc + (Number(item.qty) || 0), 0);

        setAdminInventoryReport((prev) => {
          const base = prev || {
            b2: { rows: [], totalFile: 0, totalSystem: 0 },
            pa: { rows: [], totalFile: 0, totalSystem: 0 },
          };
          const next = {
            ...base,
            warnings,
            skipped,
          };

          if (scopeOverride === 'b2' || !scopeOverride) {
            next.b2 = {
              rows: b2Rows,
              totalFile: totals(b2Map),
              totalSystem: totals(systemB2Map),
              fileName: scopeOverride === 'b2' ? file.name : base.b2.fileName,
              parsedAt: scopeOverride === 'b2' ? new Date().toLocaleString() : base.b2.parsedAt,
            };
          }
          if (scopeOverride === 'pa' || !scopeOverride) {
            next.pa = {
              rows: paRows,
              totalFile: totals(paMap),
              totalSystem: totals(systemPaMap),
              fileName: scopeOverride === 'pa' ? file.name : base.pa.fileName,
              parsedAt: scopeOverride === 'pa' ? new Date().toLocaleString() : base.pa.parsedAt,
            };
          }

          return next;
        });

        e.target.value = '';
      } catch (err) {
        alert(`Erro ao processar inventario: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const applyAdminInventoryAdjustments = (scope) => {
    if (!adminInventoryReport) return;
    const applyB2 = scope === 'b2' || scope === 'all';
    const applyPa = scope === 'pa' || scope === 'all';

    const hasB2 = adminInventoryReport.b2.rows.length > 0;
    const hasPa = adminInventoryReport.pa.rows.length > 0;
    if ((applyB2 && !hasB2) && (applyPa && !hasPa)) {
      return alert('Sem divergencias para ajustar.');
    }

    const confirmLabel =
      scope === 'b2' ? 'Confirmar ajuste de B2?' :
      scope === 'pa' ? 'Confirmar ajuste de PA?' :
      'Confirmar ajuste de B2 e PA?';
    if (!window.confirm(confirmLabel)) return;

    const mergedProductCatalog =
      Array.isArray(productCatalog) && productCatalog.length
        ? productCatalog
        : INITIAL_PRODUCT_CATALOG;
    const b2ByCode = mergedProductCatalog.reduce((acc, item) => {
      const code = String(item?.b2Code || item?.code || '').trim().toUpperCase();
      if (!code) return acc;
      acc[code] = item;
      return acc;
    }, {});
    const productByCode = mergedProductCatalog.reduce((acc, item) => {
      const code = String(item?.code || '').trim().toUpperCase();
      if (!code) return acc;
      acc[code] = item;
      return acc;
    }, {});

    const dateNow = new Date().toLocaleDateString();
    const timeNow = new Date().toLocaleString();

    if (applyB2 && hasB2) {
      const newChildCoils = [...childCoils];
      const shortages = [];

      adminInventoryReport.b2.rows.forEach((row) => {
        const code = String(row.code || '').trim().toUpperCase();
        const diff = Number(row.diff) || 0;
        if (!diff) return;

        if (diff > 0) {
          const meta = b2ByCode[code] || {};
          newChildCoils.push({
            id: `INV-B2-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            motherCode: meta.motherCode || 'INVENTARIO',
            b2Code: code,
            b2Name: row.name || meta.b2Name || meta.name || '',
            width: meta.width ?? 0,
            thickness: meta.thickness || '-',
            type: meta.type || '',
            weight: diff,
            initialWeight: diff,
            status: 'stock',
            date: dateNow,
            source: 'inventory_adjustment',
          });
          return;
        }

        let remaining = Math.abs(diff);
        const candidates = newChildCoils.filter(
          (coil) => String(coil.b2Code || coil.code).trim().toUpperCase() === code && coil.status === 'stock',
        );

        for (const coil of candidates) {
          if (remaining <= 0) break;
          const current = Number(coil.weight) || 0;
          if (current <= 0) continue;
          if (current <= remaining) {
            coil.weight = 0;
            coil.status = 'consumed';
            coil.consumedDate = dateNow;
            coil.consumptionDetail = 'AJUSTE INVENTARIO';
            remaining -= current;
          } else {
            coil.weight = current - remaining;
            remaining = 0;
          }
        }

        if (remaining > 0) shortages.push(code);
      });

      setChildCoils(newChildCoils);
      if (shortages.length > 0) {
        alert(`Ajuste B2 aplicado, mas faltou saldo para: ${shortages.join(', ')}`);
      }
    }

    if (applyPa && hasPa) {
      const newProdLogs = [...productionLogs];
      const newShipLogs = [...shippingLogs];

      adminInventoryReport.pa.rows.forEach((row) => {
        const code = String(row.code || '').trim().toUpperCase();
        const diff = Math.round(Number(row.diff) || 0);
        if (!diff) return;

        const productData = productByCode[code] || { name: row.name || `ITEM MANUAL (${code})` };

        if (diff > 0) {
          newProdLogs.push({
            id: `AJUSTE-ENT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            date: dateNow,
            timestamp: timeNow,
            productCode: code,
            productName: productData.name,
            pieces: diff,
            weight: 0,
            b2Code: 'INVENTARIO',
            motherCode: '-',
            scrap: 0,
            packIndex: 'Ajuste',
          });
        } else {
          newShipLogs.push({
            id: `AJUSTE-SAI-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            date: dateNow,
            timestamp: timeNow,
            productCode: code,
            productName: productData.name,
            quantity: Math.abs(diff),
            destination: 'AJUSTE INVENTARIO',
          });
        }
      });

      setProductionLogs(newProdLogs);
      setShippingLogs(newShipLogs);
    }
  };

  const exportInventoryDiscrepanciesPdf = (scope) => {
    if (!adminInventoryReport || !adminInventoryReport[scope]) {
      return alert('Carregue o inventario antes de gerar o PDF.');
    }
    const report = adminInventoryReport[scope];
    const rows = Array.isArray(report.rows) ? report.rows : [];
    if (rows.length === 0) {
      return alert('Sem discrepancias para exportar.');
    }

    const title = scope === 'b2'
      ? 'Inventario - Discrepancias B2'
      : 'Inventario - Discrepancias PA';
    const unit = scope === 'b2' ? 'kg' : 'pcs';
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(title, 14, 12);
    doc.setFontSize(9);
    doc.text(`Arquivo: ${report.fileName || '-'}`, 14, 18);

    const formatMovDate = (value) => {
      const parsed = parseMovementDate(value);
      if (!parsed) return '-';
      return parsed.toLocaleDateString('pt-BR');
    };

    const formatMovements = (code) => {
      const data = buildInventoryModalData(scope, code);
      const list = data?.rows || [];
      if (list.length === 0) return '-';
      const slice = list.slice(0, 4);
      return slice
        .map((item) => {
          const qty = scope === 'b2'
            ? (Number(item.qty) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : Math.round(Number(item.qty) || 0).toLocaleString('pt-BR');
          const dest = item.destination && item.destination !== '-' ? ` | ${item.destination}` : '';
          return `${formatMovDate(item.date)} | ${item.status} | ${qty}${unit}${dest}`;
        })
        .join('\n');
    };

    const body = rows.map((row) => ([
      `${row.code}\n${row.name || ''}`.trim(),
      scope === 'b2' ? row.fileQty.toFixed(1) : Math.round(row.fileQty),
      scope === 'b2' ? row.systemQty.toFixed(1) : Math.round(row.systemQty),
      scope === 'b2' ? row.diff.toFixed(1) : Math.round(row.diff),
      formatMovements(row.code),
    ]));

    autoTable(doc, {
      head: [[`Codigo / Detalhe`, `CSV (${unit})`, `Sistema (${unit})`, `Diff (${unit})`, 'Movimentos (ultimos 4)']],
      body,
      startY: 24,
      styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 70 }, 4: { cellWidth: 140 } },
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    doc.save(`inventario_discrepancias_${scope}_${dateStamp}.pdf`);
  };

  const buildInventoryModalData = (scope, code) => {
    const target = normalizeCode(code);
    const rows = [];

    if (scope === 'b2') {
      const prodByChildId = new Map();
      (productionLogs || []).forEach((log) => {
        if (!Array.isArray(log.childIds)) return;
        log.childIds.forEach((id) => {
          if (!prodByChildId.has(id)) prodByChildId.set(id, log);
        });
      });

      (childCoils || [])
        .filter((coil) => normalizeCode(coil.b2Code || coil.code) === target)
        .forEach((coil) => {
          const prodLog = prodByChildId.get(coil.id);
          const statusLabel = coil.status === 'stock' ? 'ESTOQUE' : 'BAIXADO';
          const consumedLabel = prodLog
            ? `${prodLog.date || prodLog.timestamp || ''} ${prodLog.productCode || ''} ${prodLog.productName || ''}`.trim()
            : coil.consumptionDetail || '';
          rows.push({
            date: coil.date || coil.entryDate || coil.createdAt,
            origin: coil.motherCode || '-',
            trackingId: coil.id || '-',
            qty: Number(coil.weight ?? coil.initialWeight ?? 0),
            unit: 'kg',
            status: statusLabel,
            destination: statusLabel === 'BAIXADO' ? (consumedLabel || '-') : '-',
          });
        });
    }

    if (scope === 'pa') {
      (productionLogs || [])
        .filter((log) => normalizeCode(log.productCode) === target)
        .forEach((log) => {
          rows.push({
            date: log.timestamp || log.date,
            origin: log.b2Code || '-',
            trackingId: log.trackingId || log.packIndex || log.id || '-',
            qty: Number(log.pieces) || 0,
            unit: 'pcs',
            status: 'ESTOQUE',
            destination: '-',
          });
        });

      (shippingLogs || [])
        .filter((log) => normalizeCode(log.productCode) === target)
        .forEach((log) => {
          rows.push({
            date: log.timestamp || log.date,
            origin: log.b2Code || '-',
            trackingId: log.id || '-',
            qty: Number(log.quantity) || 0,
            unit: 'pcs',
            status: 'BAIXADO',
            destination: log.destination || '-',
          });
        });
    }

    rows.sort((a, b) => {
      const dateA = parseMovementDate(a.date)?.getTime() || 0;
      const dateB = parseMovementDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });

    const totals = rows.reduce(
      (acc, row) => {
        if (row.status === 'ESTOQUE') acc.stock += row.qty || 0;
        if (row.status === 'BAIXADO') acc.consumed += row.qty || 0;
        acc.total += 1;
        return acc;
      },
      { stock: 0, consumed: 0, total: 0 },
    );

    return {
      rows,
      totals,
    };
  };
  const registerProduction = async () => {
    if (selectedInputCoils.length === 0) return alert("Selecione bobinas!");
    if (!selectedProductCode || !totalProducedPieces) return alert("Preencha dados.");

    const total = parseInt(totalProducedPieces);
    const packSize = parseInt(standardPackSize) || total;
    const fullPacksCount = Math.floor(total / packSize);
    const remainder = total % packSize;
    const totalLabels = remainder > 0 ? fullPacksCount + 1 : fullPacksCount;

    if (!window.confirm(`Produzir ${total} peças (${totalLabels} vols)?`)) return;

    // --- 1. PREPARAÇÃO ---
    const productInfo = productCatalog.find(p => p.code === selectedProductCode);
    const dateParts = productionDate.split('-');
    const date = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const timestamp = new Date().toLocaleString();
    
    const sourceIds = selectedInputCoils.map(c => c.id);
    const uniqueB2Codes = [...new Set(selectedInputCoils.map(c => c.b2Code))].join(', ');
    const uniqueMotherCodes = [...new Set(selectedInputCoils.map(c => c.motherCode))].filter(Boolean).join(', ');

    // Gerador de ID de rastreio visual
    const generateTrackingId = () => {
        const d = new Date();
        const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PROD-${ymd}-${random}`;
    };
    const baseTrackingId = generateTrackingId();

    const logsToCreate = [];
    // Cria Pacotes Cheios
    for (let i = 0; i < fullPacksCount; i++) {
        logsToCreate.push({
            id: `TEMP-PROD-${Date.now()}-${i}`, // ID Temporário para React
            trackingId: `${baseTrackingId}-${i + 1}`, // ID Visual (Etiqueta)
            childIds: sourceIds, motherCode: uniqueMotherCodes, b2Code: uniqueB2Codes, b2Name: selectedInputCoils[0].b2Name,
            productCode: productInfo.code, productName: productInfo.name, pieces: packSize,
            packIndex: `${i + 1}/${totalLabels}`, scrap: i === 0 ? parseFloat(prodScrap) || 0 : 0,
            date: date, timestamp: timestamp
        });
    }
    // Cria Pacote Resto
    if (remainder > 0) {
        logsToCreate.push({
            id: `TEMP-PROD-${Date.now()}-F`,
            trackingId: `${baseTrackingId}-F`,
            childIds: sourceIds, motherCode: uniqueMotherCodes, b2Code: uniqueB2Codes, b2Name: selectedInputCoils[0].b2Name,
            productCode: productInfo.code, productName: productInfo.name, pieces: remainder,
            packIndex: `${totalLabels}/${totalLabels}`, scrap: 0, date: date, timestamp: timestamp
        });
    }

    // --- 2. BACKUP ---
    const prevProduction = [...productionLogs];
    const prevChildren = [...childCoils];

    // --- 3. ATUALIZAÇÃO OTIMISTA ---
    // Adiciona logs na tela
    setProductionLogs(prev => [...logsToCreate, ...prev]);
    
    // Marca bobinas como consumidas na tela
    setChildCoils(prev => prev.map(c => sourceIds.includes(c.id) ? { ...c, status: 'consumed' } : c));

    // Limpa form
    setSelectedInputCoils([]); setSelectedProductCode(''); setTotalProducedPieces(''); setProdScrap('');

    try {
        // --- 4. PERSISTÊNCIA ---
        const savedLogsReal = [];
        
        // Salva Logs e Pega IDs
        for (const log of logsToCreate) {
            const { id: tempId, ...logData } = log;
            const saved = await saveToDb('productionLogs', logData);
            // Combina o ID do firebase com o trackingId visual
            savedLogsReal.push({ ...saved, trackingId: log.trackingId });
        }

        // Atualiza Bobinas (Consome)
        for (const coilId of sourceIds) {
            await updateInDb('childCoils', coilId, { status: 'consumed' });
        }

        // --- 5. TROCA SILENCIOSA DE IDS ---
        setProductionLogs(prev => {
            // Remove os temporários e adiciona os reais
            const others = prev.filter(l => !logsToCreate.some(t => t.id === l.id));
            return [...savedLogsReal, ...others];
        });

        // Manda imprimir os reais
        setItemsToPrint(savedLogsReal); setPrintType('product'); setShowPrintModal(true);
        await logUserAction('PRODUCAO', {
          productCode: productInfo ? productInfo.code : selectedProductCode,
          pieces: totalProducedPieces,
          scrapKg: prodScrap,
  sourceChildIds: sourceIds
});
        await logProduction(
          sourceIds[0] || (savedLogsReal[0]?.id ?? selectedProductCode),
          savedLogsReal.map((log) => log.id),
          user?.uid || 'local-dev',
          {
            productCode: productInfo ? productInfo.code : selectedProductCode,
            productName: productInfo ? productInfo.name : selectedProductCode,
            pieces: total,
            scrap: prodScrap,
            childIds: sourceIds,
            trackingId: baseTrackingId,
            lotBaseId: baseTrackingId,
            date,
            userEmail: user?.email || 'offline@local',
          },
        );
        alert("Produção salva na nuvem!");

    } catch (error) {
        console.error("Erro produção:", error);
        alert("Erro ao salvar produção. Revertendo...");
        setProductionLogs(prevProduction);
        setChildCoils(prevChildren);
    }
  };
  const registerShipping = async () => {
    if (!shipProduct || !shipQty) return alert("Preencha tudo");

    // Validação de Estoque (Leitura Local)
    const stock = {};
    productionLogs.forEach(log => {
      if (!stock[log.productCode]) stock[log.productCode] = 0;
      stock[log.productCode] += (parseInt(log.pieces) || 0);
    });
    shippingLogs.forEach(log => {
      if (stock[log.productCode]) stock[log.productCode] -= (parseInt(log.quantity) || 0);
    });

    const currentStock = stock[shipProduct] || 0;
    const qty = parseInt(shipQty);
    if (qty > currentStock) return alert("Estoque insuficiente.");

    const prodInfo = productCatalog.find(p => p.code === shipProduct);

    // --- 1. DADOS ---
    const tempId = `TEMP-SHIP-${Date.now()}`;
    const newShipLog = {
      id: tempId,
      productCode: shipProduct, productName: prodInfo ? prodInfo.name : shipProduct,
      quantity: qty, destination: shipDest,
      date: new Date().toLocaleDateString(), timestamp: new Date().toLocaleString()
    };

    // --- 2. BACKUP ---
    const prevShipping = [...shippingLogs];

    // --- 3. OTIMISTA ---
    setShippingLogs(prev => [newShipLog, ...prev]);
    setShipQty('');

    try {
        // --- 4. PERSISTÊNCIA ---
        const { id: temp, ...dataToSend } = newShipLog;
        const savedLog = await saveToDb('shippingLogs', dataToSend);

        // --- 5. TROCA ID ---
        setShippingLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: savedLog.id } : l));
        await logUserAction('EXPEDICAO', {
          productCode: shipProduct,
          quantity: qty,
          destination: shipDest
        });
        await logShipping(savedLog.id, user?.uid || 'local-dev', {
          productCode: shipProduct,
          productName: prodInfo ? prodInfo.name : shipProduct,
          quantity: qty,
          destination: shipDest,
          date: newShipLog.date,
          userEmail: user?.email || 'offline@local',
        });
        
        alert("Expedição salva!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar expedição.");
        setShippingLogs(prevShipping);
    }
  };

  // --- 1. BACKUP COMPLETO (SALVA TUDO) ---
  const handleFullBackup = () => {
    try {
      // Reúne TODOS os dados do sistema
      const data = { 
        motherCoils: motherCoils || [], 
        childCoils: childCoils || [], 
        productionLogs: productionLogs || [], 
        shippingLogs: shippingLogs || [], 
        productCatalog: productCatalog || [], 
        motherCatalog: motherCatalog || [],
        cuttingLogs: cuttingLogs || [] // <--- GARANTINDO O HISTÓRICO DE CORTES
      };
      
      // Formata nome do arquivo com Data
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `backup_metalosa_${dateStr}.json`;
      
      // Pega Data e Hora de AGORA para mostrar na barra azul
      const now = new Date().toLocaleString();

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Atualiza a barra azul no topo
      setCurrentFileName(`💾 ${fileName} (Gerado em: ${now})`);

      // Feedback para o usuário
      setTimeout(() => {
          const recipients = "pcp@metalosa.com.br,pcp5@metalosa.com.br,pcp3@metalosa.com.br";
          const subject = `Backup Sistema Metalosa - ${new Date().toLocaleDateString()}`;
          const body = `Backup realizado com sucesso.\nArquivo: ${fileName}`;
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipients}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

          if (window.confirm("Backup Completo baixado com sucesso!\n(Inclui Cortes, Estoques, Produção e Cadastros)\n\nDeseja abrir o Gmail para enviar?")) {
              window.open(gmailUrl, '_blank');
          }
      }, 500);

    } catch (error) {
      alert("Erro crítico ao gerar backup: " + error.message);
    }
  };

  // --- 2. RESTAURAR COMPLETO (CARREGA TUDO) --
  const handleEditLog = (log) => {
    setEditingLogId(log.id);
    setSelectedChildForProd(log.childId);
    setSelectedProductCode(log.productCode);
    setProdPieces(log.pieces);
    setProdScrap(log.scrap);
  };

  const handleDeleteLog = (logId) => {
    if(!window.confirm("Tem certeza?")) return;
    const log = productionLogs.find(l => l.id === logId);
    if (!log) return;
    const updatedChildren = childCoils.map(c => {
      if (c.id === log.childId) return { ...c, status: 'stock' };
      return c;
    });
    setChildCoils(updatedChildren);
    setProductionLogs(productionLogs.filter(l => l.id !== logId));
  };

  const generateTrackingId = () => {
    const date = new Date();
    const ymd = date.toISOString().slice(0,10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PROD-${ymd}-${random}`;
  };

  const handleViewStockDetails = (code, type) => { // <--- Adicionei 'type' aqui
    setViewingStockCode(code);
    setViewingStockType(type); // <--- Salva se é mãe ou filha
    setStockDetailsModalOpen(true);
  };

  const openProductHistoryFromCode = (code, nameHint) => {
    if (!code) return;
    const productData =
      productCatalog.find((item) => String(item.code) === String(code)) || {
        code,
        name: nameHint || `Produto ${code}`,
      };
    setSelectedGroupData(productData);
    setShowHistoryModal(true);
  };

  const handleViewEventDetails = (event) => {
    if (!event) return;
    const { eventType, sourceId, details = {}, raw = {} } = event;

    if (eventType === EVENT_TYPES.B2_CUT) {
      setViewingCutEvent(event);
      return;
    }

    if (eventType === EVENT_TYPES.MP_ENTRY) {
      const code = details.motherCode || details.code || raw.motherCode || sourceId;
      if (code) handleViewStockDetails(code, 'mother');
      return;
    }

    if (eventType === EVENT_TYPES.B2_ENTRY_NF) {
      const code = details.b2Code || raw.b2Code || sourceId;
      if (code) handleViewStockDetails(code, 'b2');
      return;
    }

    if (eventType === EVENT_TYPES.PA_PRODUCTION) {
      setViewingProductionEvent(event);
      return;
    }

    if (eventType === EVENT_TYPES.PA_SHIPPING) {
      setViewingShippingEvent(event);
      return;
    }

    console.info('Evento sem ação específica:', event);
  };

  const handleReprintSingle = (coil) => {
    setItemsToPrint([coil]);
    setPrintType('coil');
    setShowPrintModal(true);
  };

  const handleReprintProduct = (log) => {
    setItemsToPrint([log]);
    setPrintType('product');
    setShowPrintModal(true);
  };

  const handleReprintStockBalance = (item) => {
      setItemsToPrint([item]);
      setPrintType('product_stock'); 
      setShowPrintModal(true);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return alert("Nada para exportar.");
    const headers = Object.keys(data[0]).join(';');
    const csvContent = [headers, ...data.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcelXml = (sheets, filename) => {
    if (!Array.isArray(sheets) || sheets.length === 0) return alert("Nada para exportar.");

    const xmlEscape = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const sanitizeSheetName = (name) =>
      String(name || "Planilha")
        .slice(0, 31)
        .replace(/[\[\]\*\/\\?\:]/g, " ")
        .trim() || "Planilha";

    const cellXml = (value, styleId) => {
      if (value === null || value === undefined || value === "") {
        return styleId
          ? `<Cell ss:StyleID="${styleId}"><Data ss:Type="String"></Data></Cell>`
          : `<Cell><Data ss:Type="String"></Data></Cell>`;
      }
      const isNumber = typeof value === "number" && Number.isFinite(value);
      const type = isNumber ? "Number" : "String";
      const cellOpen = styleId ? `<Cell ss:StyleID="${styleId}">` : `<Cell>`;
      return `${cellOpen}<Data ss:Type="${type}">${xmlEscape(isNumber ? String(value) : String(value))}</Data></Cell>`;
    };

    const tableXml = (rows) => {
      const safeRows = Array.isArray(rows) ? rows : [];
      const headers = [];

      safeRows.forEach((row) => {
        Object.keys(row || {}).forEach((key) => {
          if (!headers.includes(key)) headers.push(key);
        });
      });

      const headerRow = `<Row>${headers.map((h) => cellXml(h)).join("")}</Row>`;
      const dataRows = safeRows
        .map((row) => {
          const cells = headers.map((h) => {
            const v = row?.[h] ?? "";
            const styleId = h === "Espessura (mm)" && typeof v === "number" ? "sDecimal2" : undefined;
            return cellXml(v, styleId);
          });
          return `<Row>${cells.join("")}</Row>`;
        })
        .join("");

      return `<Table>${headerRow}${dataRows}</Table>`;
    };

    const workbookXml =
      `<?xml version="1.0"?>` +
      `<?mso-application progid="Excel.Sheet"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">` +
      `<Styles><Style ss:ID="sDecimal2"><NumberFormat ss:Format="0.00"/></Style></Styles>` +
      sheets
        .map((sheet) => {
          const name = sanitizeSheetName(sheet?.name);
          return `<Worksheet ss:Name="${xmlEscape(name)}">${tableXml(sheet?.rows || [])}</Worksheet>`;
        })
        .join("") +
      `</Workbook>`;

    const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildFinishedStructureRows = () => {
    const stockMap = getFinishedStock() || {};
    const runtimeProductCatalog = Array.isArray(productCatalog) ? productCatalog : [];
    const fallbackProductCatalog = Array.isArray(INITIAL_PRODUCT_CATALOG)
      ? INITIAL_PRODUCT_CATALOG
      : [];
    const fallbackByCode = fallbackProductCatalog.reduce((acc, item) => {
      if (!item?.code) return acc;
      acc[String(item.code)] = item;
      return acc;
    }, {});
    const mergeCatalogItem = (base, incoming) => {
      const merged = { ...(base || {}) };
      if (!incoming) return merged;
      Object.keys(incoming).forEach((key) => {
        const value = incoming[key];
        if (value !== undefined && value !== null && value !== '') {
          merged[key] = value;
        }
      });
      return merged;
    };
    const productByCode = { ...fallbackByCode };
    runtimeProductCatalog.forEach((item) => {
      if (!item?.code) return;
      const key = String(item.code);
      productByCode[key] = mergeCatalogItem(productByCode[key], item);
    });
    const mergedProductCatalog = Object.values(productByCode);
    const runtimeMotherCatalog = Array.isArray(motherCatalog) ? motherCatalog : [];
    const mergedMotherCatalog = [...INITIAL_MOTHER_CATALOG, ...runtimeMotherCatalog];
    const motherByCode = mergedMotherCatalog.reduce((acc, item) => {
      if (item?.code) acc[String(item.code)] = item;
      return acc;
    }, {});

    const codes = new Set([
      ...mergedProductCatalog.map((item) => String(item.code || '').trim()).filter(Boolean),
      ...Object.keys(stockMap || {}).map((code) => String(code || '').trim()).filter(Boolean),
    ]);

    if (codes.size === 0) {
      alert('Nenhum produto encontrado para exportar.');
      return null;
    }

    const rows = Array.from(codes)
      .map((code) => {
        const stock = stockMap[code] || {};
        const catalogItem = productByCode[code] || {};
        const motherCode = String(catalogItem.motherCode || '');
        const motherInfo = motherByCode[motherCode] || {};

        return {
          'Codigo PA': code || '-',
          'Descricao PA': stock.name || catalogItem.name || '-',
          'Codigo B2': catalogItem.b2Code || '-',
          'Descricao B2': catalogItem.b2Name || '-',
          'Espessura B2': catalogItem.thickness || '-',
          'Tipo B2': catalogItem.type || '-',
          'Codigo Bobina Mae': motherCode || '-',
          'Descricao Bobina Mae': motherInfo.description || '-',
          'Espessura Mae': motherInfo.thickness || '-',
          'Tipo Mae': motherInfo.type || '-',
        };
      })
      .sort((a, b) =>
        String(a['Codigo PA']).localeCompare(String(b['Codigo PA']))
      );

    const dateStamp = new Date().toISOString().slice(0, 10);
    return { rows, dateStamp };
  };

  const exportFinishedStructureReport = () => {
    const data = buildFinishedStructureRows();
    if (!data) return;
    const { rows, dateStamp } = data;
    exportToExcelXml(
      [{ name: 'Estrutura PA', rows }],
      `estrutura_produtos_acabados_${dateStamp}`
    );
  };

  const exportFinishedStructureReportPdf = () => {
    const data = buildFinishedStructureRows();
    if (!data) return;
    const { rows, dateStamp } = data;

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Estrutura de Produtos Acabados', 14, 14);
    doc.setFontSize(10);
    doc.text(`Data: ${dateStamp}`, 14, 20);

    const columns = [
      { header: 'Codigo PA', dataKey: 'Codigo PA' },
      { header: 'Descricao PA', dataKey: 'Descricao PA' },
      { header: 'Codigo B2', dataKey: 'Codigo B2' },
      { header: 'Descricao B2', dataKey: 'Descricao B2' },
      { header: 'Espessura B2', dataKey: 'Espessura B2' },
      { header: 'Tipo B2', dataKey: 'Tipo B2' },
      { header: 'Codigo Bobina Mae', dataKey: 'Codigo Bobina Mae' },
      { header: 'Descricao Bobina Mae', dataKey: 'Descricao Bobina Mae' },
      { header: 'Espessura Mae', dataKey: 'Espessura Mae' },
      { header: 'Tipo Mae', dataKey: 'Tipo Mae' },
    ];

    autoTable(doc, {
      head: [columns.map((c) => c.header)],
      body: rows.map((row) => columns.map((c) => row[c.dataKey])),
      startY: 26,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`estrutura_produtos_acabados_${dateStamp}.pdf`);
  };


  const handleDownloadTemplate = (type) => {
    let headers = '';
    let filename = '';
    let sample = '';
    if (type === 'mother') { headers = 'id;code;material;weight;originalWeight;width;thickness;type;remainingWeight;status;date'; sample = '1;10644;BOBINA EXEMPLO;5000;5000;1200;0,40;BEG;5000;stock;26/11/2025'; filename = 'modelo_importacao_mae.csv'; }
    else if (type === 'b2') { headers = 'id;motherId;motherCode;b2Code;b2Name;width;thickness;type;weight;initialWeight;status;createdAt'; sample = 'B2-01;1;10644;85521B;BOB 2 PERFIL UE;170;2,00;BQ;450;450;stock;26/11/2025'; filename = 'modelo_importacao_b2.csv'; }
    else if (type === 'logs') { headers = 'id;childId;motherCode;b2Code;b2Name;productCode;productName;pieces;scrap;date;timestamp'; sample = 'LOG-01;B2-01;10644;85521B;BOB 2 PERFIL UE;00671B;PERFIL UE FINAL;100;10;26/11/2025;26/11/2025 14:00'; filename = 'modelo_importacao_logs.csv'; }
    const content = `${headers}\n${sample}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FUNÇÃO DE IMPORTAÇÃO GENÉRICA (ATUALIZADA COM LARGURA) ---

  
  const handleMotherCatalogUpload = (event) => { 
      const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      const newCatalog = [];
      rows.forEach((cols) => {
        if (cols.length >= 4) {
           const code = cols[0];
           if(code && code.match(/^\d+$/)) {
             const description = cols[3];
             const thickness = cols[4];
             const type = cols[5];
             newCatalog.push({ code, description, thickness, type });
           }
        }
      });
      if (newCatalog.length > 0) {
        const merged = [...INITIAL_MOTHER_CATALOG, ...newCatalog];
        const unique = Array.from(new Map(merged.map(item => [item.code, item])).values());
        setMotherCatalog(unique);
        alert(`${newCatalog.length} materiais importados.`);
      }
    };
    reader.readAsText(file);
  };

  const handleMotherCoilUpload = (event) => { 
      const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      const newCoils = [];
      rows.forEach((cols) => {
        let code, material, weight, width=1200, thickness='', type='';
        if (cols.length >= 3) {
           const rawCode = cols[0];
           if (rawCode && rawCode.match(/^\d+$/)) {
             code = rawCode;
             const catalogItem = motherCatalog.find(mc => mc.code === code);
             if (catalogItem) {
                material = catalogItem.description;
                thickness = catalogItem.thickness;
                type = catalogItem.type;
             } else { material = cols[1] || 'Material Desconhecido'; }
             for(let i=2; i<cols.length; i++) {
               const cleanVal = cols[i]?.replace(/\./g, '').replace(',', '.');
               const val = parseFloat(cleanVal);
               if (!isNaN(val) && val > 10) { weight = val; break; }
             }
           }
        }
        if (code && weight) {
          newCoils.push({
            id: Date.now().toString() + Math.random().toString().slice(2),
            code, material, weight, originalWeight: weight, width, thickness, type,
            remainingWeight: weight, status: 'stock', date: new Date().toLocaleDateString()
          });
        }
      });
      if (newCoils.length > 0) {
        setMotherCoils([...motherCoils, ...newCoils]);
        alert(`${newCoils.length} bobinas importadas!`);
      }
    };
    reader.readAsText(file);
  };

  // --- RENDERS ---

  // =====================================================
  // PAINEL DE OPERAÇÕES (Entrada + Corte com Impressão)
  // =====================================================
  const opsAddEntry = async () => {
    const { code, nf, weight, material, thickness, type, entryDate } = opsEntryForm;
    if (!code) return alert("Preencha o código do lote.");
    if (!weight) return alert("Preencha o peso.");

    const isoDate = entryDate || new Date().toISOString().split("T")[0];
    const dateParts = isoDate.split("-");
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    const tempId = Date.now().toString();
    const usinaFinal = opsEntryForm.usina === 'Outro' ? opsEntryForm.usinaOutro : opsEntryForm.usina;
    const newCoil = {
      id: tempId,
      code, nf, material, thickness, type,
      weight: parseFloat(weight),
      originalWeight: parseFloat(weight),
      width: 1200,
      remainingWeight: parseFloat(weight),
      status: "stock",
      date: formattedDate,
      createdAt: Date.now(),
      usina: usinaFinal || '',
      filialDestino: opsEntryForm.filialDestino || '',
    };

    setMotherCoils((prev) => [...prev, newCoil]);
    setOpsEntryForm({ code: '', nf: '', weight: '', material: '', thickness: '', type: '', entryDate: new Date().toISOString().split('T')[0], usina: '', usinaOutro: '', filialDestino: '' });

    // Imprime etiqueta imediatamente (mesmo no localhost)
    setItemsToPrint([{ ...newCoil, material, thickness, type, code }]);
    setPrintType('coil');
    setShowPrintModal(true);

    if (USE_LOCAL_JSON) {
      setOpsLastAction({ type: 'success', message: `Bobina ${code} registrada localmente! (${formattedDate}) — Modo offline, não salvou na nuvem.`, timestamp: Date.now() });
      return;
    }

    try {
      const { id, ...coilDataToSend } = newCoil;
      const savedItem = await saveToDb("motherCoils", coilDataToSend);
      await logUserAction('ENTRADA_MP', { motherCode: coilDataToSend.code, weight: coilDataToSend.weight, nf: coilDataToSend.nf });
      await logMotherCoilEntry(savedItem, user?.uid || 'local-dev', { userEmail: user?.email || 'offline@local' });

      setMotherCoils((prev) => prev.map((item) => item.id === tempId ? { ...item, id: savedItem.id } : item));

      // Atualiza etiqueta com ID real
      setItemsToPrint([{ ...savedItem, material, thickness, type, code }]);
      
      setOpsLastAction({ type: 'success', message: `Bobina ${code} registrada e salva na nuvem! (${formattedDate})`, timestamp: Date.now() });
    } catch (error) {
      console.error("Erro ao salvar bobina:", error);
      setOpsLastAction({ type: 'error', message: `Erro ao salvar bobina ${code} na nuvem. Ela aparece na tela mas pode sumir se recarregar.`, timestamp: Date.now() });
    }
  };

  const opsAddTempCut = () => {
    if (!opsTargetB2 || !opsCutWeight || !opsCutQty) return alert("Preencha todos os campos.");

    const b2Data = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === opsTargetB2);
    if (!b2Data) return alert("Produto não encontrado no catálogo.");

    const parseW = (val) => parseFloat(String(val).replace(',', '.').trim()) || 0;
    const totalWeight = parseW(opsCutWeight);
    const qtd = parseInt(opsCutQty);
    if (qtd <= 0) return alert("Qtd deve ser maior que 0");

    const individualWeight = totalWeight / qtd;
    const newItems = [];
    for (let i = 0; i < qtd; i++) {
      newItems.push({
        b2Code: b2Data.b2Code, b2Name: b2Data.b2Name,
        width: parseFloat(b2Data.width), thickness: b2Data.thickness, type: b2Data.type,
        weight: individualWeight, id: Date.now() + Math.random()
      });
    }
    setOpsTempCuts([...opsTempCuts, ...newItems]);
    setOpsCutWeight(''); setOpsCutQty('');
  };

  const opsConfirmCut = async () => {
    const mother = motherCoils.find(m => m.id === opsSelectedMother);
    if (!mother) return;
    if (opsTempCuts.length === 0) return alert("Adicione ao menos uma tira.");

    const dateParts = opsCutDate.split('-');
    const dateNow = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const totalCutsWeight = opsTempCuts.reduce((acc, curr) => acc + curr.weight, 0);
    const manualScrap = opsCutScrap ? parseFloat(String(opsCutScrap).replace(',', '.').trim()) : 0;
    const totalConsumed = totalCutsWeight + manualScrap;

    if (totalConsumed > mother.remainingWeight) {
      if (!window.confirm(`Peso excedido (${totalConsumed.toFixed(1)}kg). Continuar?`)) return;
    }

    const remaining = Math.max(0, mother.remainingWeight - totalConsumed);
    const isTotalConsumption = remaining < 10;

    if (!isTotalConsumption) {
      if (!window.confirm(`Vai sobrar ${remaining.toFixed(1)}kg na bobina. Confirmar?`)) return;
    }

    const itemsSummary = opsTempCuts.map(t => `${t.b2Code} - ${t.b2Name} (${t.weight.toFixed(0)}kg)`).join(', ');

    const prevMothers = [...motherCoils];
    const prevLogs = [...cuttingLogs];
    const prevChildren = [...childCoils];

    const tempLogId = `TEMP-LOG-${Date.now()}`;
    const newCutLog = {
      id: tempLogId, date: dateNow, motherCode: mother.code, motherMaterial: mother.material,
      inputWeight: totalConsumed, outputCount: opsTempCuts.length, scrap: manualScrap,
      generatedItems: itemsSummary, timestamp: new Date().toLocaleString()
    };

    const tempNewChildren = opsTempCuts.map((temp, index) => ({
      id: `TEMP-CHILD-${Date.now()}-${index}`,
      motherId: mother.id, motherCode: mother.code,
      b2Code: temp.b2Code, b2Name: temp.b2Name, width: temp.width, thickness: temp.thickness,
      type: mother.type, weight: temp.weight, initialWeight: temp.weight, status: 'stock', createdAt: dateNow
    }));

    const motherUpdateData = {
      remainingWeight: remaining,
      status: isTotalConsumption ? 'consumed' : 'stock',
      cutWaste: (mother.cutWaste || 0) + manualScrap,
      ...(isTotalConsumption ? { consumedDate: dateNow, consumptionDetail: mother.consumptionDetail ? mother.consumptionDetail + ' + ' + itemsSummary : itemsSummary } : {}),
    };

    setMotherCoils(prev => prev.map(m => m.id === mother.id ? { ...m, ...motherUpdateData } : m));
    setCuttingLogs(prev => [newCutLog, ...prev]);
    setChildCoils(prev => [...prev, ...tempNewChildren]);
    setOpsTempCuts([]); setOpsCutScrap(''); setOpsSelectedMother(''); setOpsMotherSearch('');

    // Imprime etiquetas imediatamente (mesmo no localhost)
    setItemsToPrint(tempNewChildren);
    setPrintType('coil');
    setShowPrintModal(true);

    if (USE_LOCAL_JSON) {
      setOpsLastAction({ type: 'success', message: `Corte de ${mother.code} registrado localmente! ${tempNewChildren.length} tiras. — Modo offline, não salvou na nuvem.`, timestamp: Date.now() });
      return;
    }

    try {
      await updateInDb('motherCoils', mother.id, motherUpdateData);
      const { id: logTempId, ...logData } = newCutLog;
      const savedLog = await saveToDb('cuttingLogs', logData);

      const savedChildrenReal = [];
      for (const childTemp of tempNewChildren) {
        const { id: childTempId, ...childData } = childTemp;
        const savedChild = await saveToDb('childCoils', childData);
        savedChildrenReal.push(savedChild);
      }

      setCuttingLogs(prev => prev.map(l => l.id === tempLogId ? { ...l, id: savedLog.id } : l));
      setChildCoils(prev => {
        const others = prev.filter(c => !tempNewChildren.some(t => t.id === c.id));
        return [...others, ...savedChildrenReal];
      });

      // Atualiza etiquetas com IDs reais
      setItemsToPrint(savedChildrenReal);

      await logUserAction('CORTE', { motherCode: mother.code, newChildCount: savedChildrenReal.length, childCodes: savedChildrenReal.map(c => c.b2Code), scrapKg: manualScrap });
      await logCut(mother.id, savedChildrenReal.map(c => c.id), user?.uid || 'local-dev', {
        totalWeight: totalCutsWeight, inputWeight: totalCutsWeight, scrap: manualScrap, date: opsCutDate,
        motherCode: mother.code, motherMaterial: mother.material, originalWeight: mother.originalWeight || mother.weight,
        remainingWeight: motherUpdateData.remainingWeight, generatedItems: newCutLog.generatedItems,
        cuttingLogId: savedLog.id, childCount: savedChildrenReal.length, userEmail: user?.email || 'offline@local',
      });

      setOpsLastAction({ type: 'success', message: `Corte de ${mother.code} salvo na nuvem! ${savedChildrenReal.length} tiras geradas.`, timestamp: Date.now() });
    } catch (error) {
      console.error("Erro no corte:", error);
      setMotherCoils(prevMothers); setCuttingLogs(prevLogs); setChildCoils(prevChildren);
      setOpsLastAction({ type: 'error', message: `Erro ao salvar corte de ${mother.code} na nuvem. Os dados podem sumir se recarregar.`, timestamp: Date.now() });
    }
  };

  const renderOperationsPanel = () => {
    // --- Filtros para corte ---
    const availableMothers = motherCoils.filter(m => m.status === 'stock');
    const filteredOpsMothers = availableMothers.filter(m => {
      if (!opsMotherSearch) return true;
      const search = opsMotherSearch.toLowerCase();
      return (String(m.code).toLowerCase().includes(search) || String(m.material).toLowerCase().includes(search));
    });

    const selectedOpsMother = motherCoils.find(m => m.id === opsSelectedMother);

    const cleanNum = (val) => { if (!val) return 0; return parseFloat(String(val).replace(',', '.').replace('mm', '').trim()); };
    const uniqueByB2 = (items) => { const map = new Map(); items.forEach((p) => { if (!map.has(p.b2Code)) map.set(p.b2Code, p); }); return Array.from(map.values()).sort((a, b) => a.b2Name.localeCompare(b.b2Name)); };

    const allB2Types = uniqueByB2(INITIAL_PRODUCT_CATALOG);
    let filteredB2ForOps = [];
    if (selectedOpsMother) {
      const motherThick = cleanNum(selectedOpsMother.thickness);
      const targetCode = String(selectedOpsMother.code).trim();
      const filtered = INITIAL_PRODUCT_CATALOG.filter(p => {
        if (p.motherCode && String(p.motherCode).trim() === targetCode) return true;
        const prodThick = cleanNum(p.thickness);
        if (Math.abs(prodThick - motherThick) < 0.05) return true;
        return false;
      });
      filteredB2ForOps = uniqueByB2(filtered);
    }
    const availableB2ForOps = opsShowAllB2 ? allB2Types : filteredB2ForOps;

    // --- Cálculos ---
    const opsCutTotal = opsTempCuts.reduce((a, b) => a + b.weight, 0);
    const opsScrapVal = parseFloat(opsCutScrap) || 0;
    const opsRemaining = selectedOpsMother ? (selectedOpsMother.remainingWeight - opsCutTotal - opsScrapVal) : 0;

    // --- Helpers visuais ---
    const StepNumber = ({ n, done }) => (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 border-2 transition-all ${done ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
        {done ? <CheckCircle size={22} /> : n}
      </div>
    );

    const entryStep1Done = !!opsEntryForm.code;
    const entryStep2Done = !!opsEntryForm.weight;
    const entryReady = entryStep1Done && entryStep2Done;

    const cutStep1Done = !!opsSelectedMother;
    const cutStep2Done = opsTempCuts.length > 0;

    return (
      <div className="space-y-5">

        {/* ============ BARRA DE SUCESSO / ERRO (BEM GRANDE) ============ */}
        {opsLastAction && (Date.now() - opsLastAction.timestamp < 60000) && (
          <div
            className={`flex items-center gap-4 p-5 rounded-2xl border-2 animate-pulse ${
              opsLastAction.type === 'success'
                ? 'bg-emerald-900/40 border-emerald-400 text-emerald-100'
                : 'bg-red-900/40 border-red-400 text-red-100'
            }`}
          >
            {opsLastAction.type === 'success'
              ? <CheckCircle size={36} className="text-emerald-400 shrink-0" />
              : <AlertTriangle size={36} className="text-red-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg">{opsLastAction.type === 'success' ? 'TUDO CERTO!' : 'DEU ERRO!'}</p>
              <p className="text-base font-medium">{opsLastAction.message}</p>
            </div>
            <button
              onClick={() => setOpsLastAction(null)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={24} />
            </button>
          </div>
        )}

        {/* ============ SELETOR DE OPERAÇÃO (BOTÕES BEM GRANDES) ============ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setOpsMode('entrada')}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl font-bold transition-all border-2 ${
              opsMode === 'entrada'
                ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-600/30 scale-[1.02]'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500'
            }`}
          >
            <ScrollText size={36} />
            <span className="text-lg tracking-wide">ENTRADA DE BOBINA</span>
            <span className="text-xs font-normal opacity-70">Recebeu bobina nova? Clique aqui</span>
          </button>
          <button
            onClick={() => setOpsMode('corte')}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl font-bold transition-all border-2 ${
              opsMode === 'corte'
                ? 'bg-purple-600 text-white border-purple-400 shadow-xl shadow-purple-600/30 scale-[1.02]'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500'
            }`}
          >
            <Scissors size={36} />
            <span className="text-lg tracking-wide">CORTE DE BOBINA 2</span>
            <span className="text-xs font-normal opacity-70">Vai cortar tiras? Clique aqui</span>
          </button>
          <button
            onClick={() => setOpsMode('consulta')}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl font-bold transition-all border-2 ${
              opsMode === 'consulta'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-xl shadow-cyan-600/30 scale-[1.02]'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500'
            }`}
          >
            <ScanLine size={36} />
            <span className="text-lg tracking-wide">CONSULTA QR</span>
            <span className="text-xs font-normal opacity-70">Leia e consulte dados completos</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODO: ENTRADA DE BOBINA — Passo a Passo                          */}
        {/* ================================================================= */}
        {opsMode === 'entrada' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* --- FORMULÁRIO (3 colunas) --- */}
            <div className="lg:col-span-3">
              <Card className="border-2 border-blue-500/20">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-700">
                  <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30">
                    <Plus size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">ENTRADA DE BOBINA</h2>
                    <p className="text-gray-400 text-sm">Preencha e clique no botão verde para salvar e imprimir</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* PASSO 1: QUAL BOBINA */}
                  <div className="flex items-start gap-4">
                    <StepNumber n="1" done={entryStep1Done} />
                    <div className="flex-1">
                      <label className="block text-sm font-black text-blue-300 uppercase tracking-wide mb-2">
                        Qual é a bobina?
                      </label>
                      <select
                        className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-base font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={opsEntryForm.code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const item = INITIAL_MOTHER_CATALOG.find(m => m.code === code);
                          if (item) {
                            setOpsEntryForm(prev => ({ ...prev, code, material: item.description, thickness: item.thickness, type: item.type }));
                          } else {
                            setOpsEntryForm(prev => ({ ...prev, code, material: '', thickness: '', type: '' }));
                          }
                        }}
                      >
                        <option value="">👆 Toque aqui para escolher...</option>
                        {INITIAL_MOTHER_CATALOG.map(m => (
                          <option key={m.code} value={m.code}>{m.code} — {m.description}</option>
                        ))}
                      </select>

                      {opsEntryForm.code && opsEntryForm.material && (
                        <div className="mt-3 bg-blue-900/30 p-3 rounded-xl border border-blue-500/30 flex items-center gap-3">
                          <CheckCircle size={18} className="text-blue-400 shrink-0" />
                          <div>
                            <p className="text-white font-bold text-sm">{opsEntryForm.material}</p>
                            <p className="text-blue-300 text-xs">Espessura: {opsEntryForm.thickness || '-'} | Tipo: {opsEntryForm.type || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PASSO 2: PESO E NF */}
                  <div className="flex items-start gap-4">
                    <StepNumber n="2" done={entryStep2Done} />
                    <div className="flex-1">
                      <label className="block text-sm font-black text-blue-300 uppercase tracking-wide mb-2">
                        Peso e Nota Fiscal
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">PESO (kg) *</label>
                          <input
                            type="number"
                            value={opsEntryForm.weight}
                            onChange={(e) => setOpsEntryForm(prev => ({ ...prev, weight: e.target.value }))}
                            placeholder="Ex: 8500"
                            className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">NF (opcional)</label>
                          <input
                            type="text"
                            value={opsEntryForm.nf}
                            onChange={(e) => setOpsEntryForm(prev => ({ ...prev, nf: e.target.value }))}
                            placeholder="Nota Fiscal"
                            className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-600"
                          />
                        </div>
                      </div>

                      {/* Data (já vem preenchida hoje) */}
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">DATA DA ENTRADA</label>
                        <input
                          type="date"
                          value={opsEntryForm.entryDate}
                          onChange={(e) => setOpsEntryForm(prev => ({ ...prev, entryDate: e.target.value }))}
                          className="w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm"
                        />
                      </div>

                      {/* Usina e Filial */}
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">USINA</label>
                          <select
                            value={opsEntryForm.usina}
                            onChange={(e) => setOpsEntryForm(prev => ({ ...prev, usina: e.target.value, usinaOutro: e.target.value !== 'Outro' ? '' : prev.usinaOutro }))}
                            className="w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm"
                          >
                            <option value="">Selecionar...</option>
                            <option value="Usiminas">Usiminas</option>
                            <option value="Arcelor">Arcelor</option>
                            <option value="CSN">CSN</option>
                            <option value="Outro">Outro...</option>
                          </select>
                          {opsEntryForm.usina === 'Outro' && (
                            <input
                              type="text"
                              value={opsEntryForm.usinaOutro}
                              onChange={(e) => setOpsEntryForm(prev => ({ ...prev, usinaOutro: e.target.value }))}
                              placeholder="Nome da usina"
                              className="w-full mt-2 p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm placeholder-gray-600"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">FILIAL DESTINO</label>
                          <input
                            type="text"
                            value={opsEntryForm.filialDestino}
                            onChange={(e) => setOpsEntryForm(prev => ({ ...prev, filialDestino: e.target.value }))}
                            placeholder="Ex: Filial SP"
                            className="w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm placeholder-gray-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PASSO 3: BOTÃO GRANDE DE CONFIRMAR */}
                  <div className="flex items-start gap-4">
                    <StepNumber n="3" done={false} />
                    <div className="flex-1">
                      <button
                        onClick={opsAddEntry}
                        disabled={!entryReady}
                        className={`w-full flex items-center justify-center gap-4 px-8 py-6 rounded-2xl font-black text-xl transition-all ${
                          entryReady
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 hover:scale-[1.01] cursor-pointer'
                            : 'bg-gray-800 text-gray-600 border-2 border-dashed border-gray-700 cursor-not-allowed'
                        }`}
                      >
                        {entryReady ? (
                          <>
                            <Printer size={28} />
                            SALVAR E IMPRIMIR ETIQUETA
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={24} />
                            Preencha os campos acima
                          </>
                        )}
                      </button>
                      {entryReady && (
                        <p className="text-center text-emerald-400/70 text-xs font-medium mt-2 animate-pulse">
                          Aperte o botão verde para registrar a bobina e imprimir a etiqueta
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* --- ÚLTIMAS ENTRADAS (2 colunas) --- */}
            <div className="lg:col-span-2">
              <Card className="flex flex-col h-full">
                <h3 className="font-black text-gray-200 flex items-center gap-2 mb-4 text-base">
                  <History size={20} className="text-blue-400" /> BOBINAS NO ESTOQUE
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[600px] custom-scrollbar-dark">
                  {motherCoils
                    .filter(m => m.status === 'stock')
                    .sort((a, b) => {
                      const parseDate = (d) => {
                        if (!d) return 0;
                        if (d.includes('/')) { const [dd, mm, yy] = d.split('/'); return new Date(`${yy}-${mm}-${dd}`).getTime(); }
                        return new Date(d).getTime();
                      };
                      return parseDate(b.date) - parseDate(a.date);
                    })
                    .slice(0, 20)
                    .map(m => (
                      <div key={m.id} className="bg-gray-900/60 p-3 rounded-xl border border-gray-700 flex justify-between items-center hover:bg-gray-800/70 transition-colors group">
                        <div className="min-w-0 flex-1">
                          <span className="font-black text-white text-base">{m.code}</span>
                          <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                            <span>{m.type}</span>
                            <span>{m.date}</span>
                            {m.nf && <span>NF {m.nf}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-1">
                            <p className="font-black text-blue-400 text-xl leading-none">{(Number(m.remainingWeight ?? m.weight) || 0).toFixed(0)}</p>
                            <p className="text-[10px] text-gray-500 font-bold">KG</p>
                          </div>
                          <button
                            onClick={() => { setItemsToPrint([m]); setPrintType('coil'); setShowPrintModal(true); }}
                            className="p-3 rounded-xl bg-gray-800 hover:bg-blue-600 text-gray-500 hover:text-white transition-all border border-gray-700 hover:border-blue-400"
                            title="Reimprimir Etiqueta"
                          >
                            <Printer size={20} />
                          </button>
                          {m.createdAt && (opsTimerTick - m.createdAt < 10 * 60 * 1000) && (
                            <button
                              onClick={() => deleteMotherCoil(m.id)}
                              className="p-3 rounded-xl bg-gray-800 hover:bg-red-600 text-gray-500 hover:text-white transition-all border border-gray-700 hover:border-red-400 animate-pulse"
                              title={`Apagar bobina (disponível por ${Math.max(0, Math.ceil((10 * 60 * 1000 - (opsTimerTick - m.createdAt)) / 60000))} min)`}
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                  {motherCoils.filter(m => m.status === 'stock').length === 0 && (
                    <div className="text-center text-gray-500 py-10 text-base">Nenhuma bobina em estoque.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODO: CORTE DE BOBINA 2 — Passo a Passo                          */}
        {/* ================================================================= */}
        {opsMode === 'corte' && (
          <div className="space-y-5">
            {/* --- PASSO 1: ESCOLHER BOBINA MÃE --- */}
            <Card className={`border-2 transition-all ${cutStep1Done ? 'border-emerald-500/30' : 'border-purple-500/30'}`}>
              <div className="flex items-center gap-4 mb-4">
                <StepNumber n="1" done={cutStep1Done} />
                <div>
                  <h3 className="font-black text-white text-lg">ESCOLHA A BOBINA QUE VAI CORTAR</h3>
                  <p className="text-gray-400 text-sm">Toque na bobina que está na máquina</p>
                </div>
              </div>

              {/* Busca */}
              <div className="relative mb-3">
                <Search className="absolute left-4 top-4 text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Digite o código para buscar..."
                  className="w-full pl-12 p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-base font-medium focus:ring-2 focus:ring-purple-500"
                  value={opsMotherSearch}
                  onChange={e => { setOpsMotherSearch(e.target.value); setOpsSelectedMother(''); }}
                />
              </div>

              {/* Lista de bobinas — Grid horizontal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[240px] overflow-y-auto custom-scrollbar-dark">
                {filteredOpsMothers.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setOpsSelectedMother(m.id); setOpsTempCuts([]); setOpsTargetB2(''); setOpsCutWeight(''); setOpsCutQty(''); }}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all select-none ${
                      opsSelectedMother === m.id
                        ? 'bg-purple-900/30 border-purple-400 shadow-lg shadow-purple-600/20 ring-1 ring-purple-400'
                        : 'bg-gray-900 border-gray-700 hover:border-purple-500/60 hover:bg-gray-800 active:scale-95'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-black text-white text-lg">{m.code}</span>
                      {opsSelectedMother === m.id && <CheckCircle size={18} className="text-purple-400 shrink-0" />}
                    </div>
                    <div className="flex justify-between items-end mt-1">
                      <span className="text-xs text-gray-500">{m.type} {m.thickness && `| ${m.thickness}`}</span>
                      <span className="font-black text-purple-400 text-lg">{(Number(m.remainingWeight ?? m.weight) || 0).toFixed(0)} <span className="text-xs font-normal text-gray-500">kg</span></span>
                    </div>
                  </div>
                ))}
                {filteredOpsMothers.length === 0 && (
                  <div className="col-span-full text-center text-gray-600 py-8 text-base">Nenhuma bobina disponível</div>
                )}
              </div>

              {/* Info da bobina selecionada — destaque */}
              {selectedOpsMother && (
                <div className="mt-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/30 p-4 rounded-xl border border-purple-500/30 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-purple-300 font-bold uppercase">Bobina selecionada</p>
                    <p className="text-white font-black text-2xl">{selectedOpsMother.code}</p>
                    <p className="text-gray-400 text-sm">{selectedOpsMother.material}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-4xl leading-none">{(Number(selectedOpsMother.remainingWeight) || 0).toFixed(0)}</p>
                    <p className="text-purple-300 text-sm font-bold">kg disponível</p>
                  </div>
                </div>
              )}
            </Card>

            {/* --- PASSO 2: ADICIONAR TIRAS --- */}
            {selectedOpsMother && (
              <Card className={`border-2 transition-all ${cutStep2Done ? 'border-emerald-500/30' : 'border-purple-500/20'}`}>
                <div className="flex items-center gap-4 mb-5">
                  <StepNumber n="2" done={cutStep2Done} />
                  <div>
                    <h3 className="font-black text-white text-lg">QUAIS TIRAS VAI CORTAR?</h3>
                    <p className="text-gray-400 text-sm">Escolha o perfil, informe o peso e a quantidade</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lado esquerdo: formulário de adição */}
                  <div className="space-y-4">
                    {/* Tipo B2 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-black text-purple-300 uppercase">Qual perfil vai sair?</label>
                        <button
                          type="button"
                          onClick={() => setOpsShowAllB2(prev => !prev)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${opsShowAllB2 ? 'bg-amber-900/30 text-amber-300 border-amber-500/40' : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'}`}
                        >
                          {opsShowAllB2 ? '✓ Mostrando todos' : 'Mostrar todos os perfis'}
                        </button>
                      </div>
                      <select
                        className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-base font-medium focus:ring-2 focus:ring-purple-500"
                        value={opsTargetB2}
                        onChange={e => setOpsTargetB2(e.target.value)}
                      >
                        <option value="">👆 Toque aqui para escolher o perfil...</option>
                        {availableB2ForOps.map(t => (
                          <option key={t.code} value={t.b2Code}>{t.b2Code} — {t.b2Name} — {t.width}mm</option>
                        ))}
                      </select>
                    </div>

                    {/* Peso e Qtd */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">PESO TOTAL (kg)</label>
                        <input
                          type="number"
                          value={opsCutWeight}
                          onChange={e => setOpsCutWeight(e.target.value)}
                          placeholder="Ex: 3000"
                          className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-xl font-bold text-center focus:ring-2 focus:ring-purple-500 placeholder-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">QUANTAS TIRAS?</label>
                        <input
                          type="number"
                          value={opsCutQty}
                          onChange={e => setOpsCutQty(e.target.value)}
                          placeholder="Ex: 3"
                          className="w-full p-4 border-2 border-gray-600 rounded-xl bg-gray-900 text-white outline-none text-xl font-bold text-center focus:ring-2 focus:ring-purple-500 placeholder-gray-600"
                        />
                      </div>
                    </div>

                    {/* Preview do peso individual */}
                    {opsTargetB2 && opsCutWeight && opsCutQty && parseInt(opsCutQty) > 0 && (
                      <div className="bg-purple-900/20 p-3 rounded-xl border border-purple-500/20 text-center">
                        <p className="text-purple-300 text-sm font-bold">
                          Cada tira vai ter <span className="text-white text-lg font-black">{(parseFloat(opsCutWeight) / parseInt(opsCutQty)).toFixed(0)} kg</span>
                        </p>
                      </div>
                    )}

                    {/* Botão Adicionar */}
                    <button
                      onClick={opsAddTempCut}
                      disabled={!opsTargetB2 || !opsCutWeight || !opsCutQty}
                      className={`w-full flex items-center justify-center gap-3 px-6 py-5 rounded-xl font-black text-base transition-all ${
                        opsTargetB2 && opsCutWeight && opsCutQty
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 hover:scale-[1.01]'
                          : 'bg-gray-800 text-gray-600 border-2 border-dashed border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={24} /> ADICIONAR ESTAS TIRAS
                    </button>
                  </div>

                  {/* Lado direito: lista de tiras adicionadas */}
                  <div className="bg-gray-900/40 rounded-xl border border-gray-700 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-black text-gray-300 text-sm uppercase">Tiras já adicionadas</h4>
                      <span className={`text-sm font-black px-3 py-1 rounded-full ${opsTempCuts.length > 0 ? 'bg-purple-900/40 text-purple-300' : 'bg-gray-800 text-gray-600'}`}>
                        {opsTempCuts.length} {opsTempCuts.length === 1 ? 'tira' : 'tiras'}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px] custom-scrollbar-dark">
                      {opsTempCuts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                          <Scissors size={40} className="mb-2 opacity-30" />
                          <p className="font-medium text-sm">Nenhuma tira ainda</p>
                          <p className="text-xs">Use o formulário ao lado para adicionar</p>
                        </div>
                      ) : (
                        opsTempCuts.map((item, idx) => (
                          <div key={idx} className="bg-gray-800 p-3 rounded-xl border border-gray-600 flex justify-between items-center">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-white text-sm truncate">{item.b2Name}</p>
                              <p className="text-purple-400 text-xs font-bold">{item.b2Code}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-white text-lg">{item.weight.toFixed(0)} <span className="text-xs text-gray-500">kg</span></span>
                              <button
                                onClick={() => setOpsTempCuts(opsTempCuts.filter((_, i) => i !== idx))}
                                className="p-2 rounded-lg text-red-500 hover:text-white hover:bg-red-600 transition-all border border-transparent hover:border-red-400"
                                title="Remover esta tira"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Peso total das tiras */}
                    {opsTempCuts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                        <span className="text-gray-500 text-xs font-bold uppercase">Peso das tiras</span>
                        <span className="text-white font-black text-lg">{opsCutTotal.toFixed(0)} kg</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* --- PASSO 3: FINALIZAR E IMPRIMIR --- */}
            {selectedOpsMother && opsTempCuts.length > 0 && (
              <Card className="border-2 border-emerald-500/30">
                <div className="flex items-center gap-4 mb-5">
                  <StepNumber n="3" done={false} />
                  <div>
                    <h3 className="font-black text-white text-lg">FINALIZAR CORTE</h3>
                    <p className="text-gray-400 text-sm">Confira os dados e aperte o botão para salvar</p>
                  </div>
                </div>

                {/* Resumo visual grande */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Bobina</p>
                    <p className="text-white font-black text-2xl">{selectedOpsMother.code}</p>
                    <p className="text-purple-400 text-sm font-bold">{(Number(selectedOpsMother.remainingWeight) || 0).toFixed(0)} kg</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Saindo</p>
                    <p className="text-purple-400 font-black text-2xl">{opsTempCuts.length}</p>
                    <p className="text-gray-400 text-sm font-bold">{opsCutTotal.toFixed(0)} kg em tiras</p>
                  </div>
                  <div className={`p-4 rounded-xl border text-center ${opsRemaining >= 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Vai sobrar</p>
                    <p className={`font-black text-2xl ${opsRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{opsRemaining.toFixed(0)} kg</p>
                    {opsRemaining < 0 && <p className="text-red-400 text-xs font-bold">⚠ Peso excedido!</p>}
                  </div>
                </div>

                {/* Data e Sucata */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">DATA DO CORTE</label>
                    <input
                      type="date"
                      value={opsCutDate}
                      onChange={e => setOpsCutDate(e.target.value)}
                      className="w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">SUCATA / PERDA (kg)</label>
                    <input
                      type="number"
                      value={opsCutScrap}
                      onChange={e => setOpsCutScrap(e.target.value)}
                      placeholder="0"
                      className="w-full p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none text-sm text-center placeholder-gray-600"
                    />
                    <p className="text-gray-600 text-[10px] mt-1 ml-1">Se não teve sucata, deixe vazio</p>
                  </div>
                </div>

                {/* BOTÃO GIGANTE FINAL */}
                <button
                  onClick={opsConfirmCut}
                  className="w-full flex items-center justify-center gap-4 px-8 py-7 rounded-2xl font-black text-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 hover:scale-[1.01] transition-all active:scale-95"
                >
                  <Printer size={32} />
                  CONFIRMAR CORTE E IMPRIMIR ETIQUETAS
                </button>
                <p className="text-center text-emerald-400/60 text-xs font-medium mt-2 animate-pulse">
                  As etiquetas de todas as tiras vão ser impressas automaticamente
                </p>
              </Card>
            )}

            {/* Mensagem se nada selecionado */}
            {!selectedOpsMother && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <Scissors size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-bold">Selecione a bobina acima para começar</p>
                <p className="text-sm mt-1 opacity-70">Toque na bobina que está na máquina</p>
              </div>
            )}
          </div>
        )}
        {opsMode === 'consulta' && (
          <div className="space-y-5">
            {renderQrConsultPanel()}
          </div>
        )}
      </div>
    );
  };

  const renderMotherCoilForm = () => {
  // --- Define se estamos cadastrando bobina "normal" ou blank inox ---
  const family = (newMotherCoil?.family || "").toUpperCase();
  const typeUpper = (newMotherCoil?.type || "").toUpperCase();
  const currentForm = (newMotherCoil?.form || "").toUpperCase();
  const isInoxSelected =
    family === "INOX" || typeUpper === "INOX" || currentForm === "BLANK";
  const isB2Industrialized = currentForm === "B2_PURCHASE";

  // Catálogo de produtos inox
  const inoxProducts = INITIAL_INOX_BLANK_PRODUCTS || [];

  // LISTA ÚNICA DE TIPOS DE INOX (SEM REPETIÇÃO)
  const inoxGrades = Array.from(
    new Set(inoxProducts.map((p) => p.inoxGrade))
  ).sort();

  const selectedInoxGrade = newMotherCoil?.inoxGrade || "";
  const defaultProductForSelectedGrade =
    inoxProducts.find((p) => p.inoxGrade === selectedInoxGrade) || null;

  const uniqueB2Catalog = Array.from(
    new Map(
      productCatalog
        .filter((p) => p.b2Code)
        .map((p) => [p.b2Code, p])
    ).values()
  ).sort((a, b) => a.b2Name.localeCompare(b.b2Name));

  const handleSelectPurchasedB2 = (code) => {
    const selected = productCatalog.find((p) => p.b2Code === code);
    setNewB2Purchase((prev) => ({
      ...prev,
      b2Code: code,
      b2Name: selected?.b2Name || prev.b2Name,
      width: selected?.width || prev.width,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
    setNewMotherCoil((prev) => ({
      ...prev,
      material: selected?.b2Name || prev.material,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
  };

  const purchaseQty = parseInt(newB2Purchase.quantity, 10) || 0;
  const purchaseTotalWeight = parseFloat(String(newB2Purchase.weight || "").replace(",", "."));
  const purchaseUnitWeight =
    purchaseQty > 0 && purchaseTotalWeight
      ? (purchaseTotalWeight / purchaseQty).toFixed(1)
      : null;

  const handleSelectInoxGrade = (e) => {
  const grade = e.target.value;

  if (!grade) {
    setNewMotherCoil({
      ...newMotherCoil,
      inoxGrade: "",
      material: "",
      family: "INOX",
      form: "BLANK",
      type: "INOX",
      thickness: "",
      width: "",
      length: "",
    });
    return;
  }

  const defaultProduct = inoxProducts.find((p) => p.inoxGrade === grade);

  let thicknessStr = "";
  let width = "";
  let length = "";

  if (defaultProduct) {
    thicknessStr =
      defaultProduct.thickness != null
        ? defaultProduct.thickness.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
    width = defaultProduct.width ?? "";
    length = defaultProduct.length ?? "";
  }

  setNewMotherCoil({
    ...newMotherCoil,
    inoxGrade: grade,                          // coluna INOX
    material: defaultProduct?.measuresLabel    // <-- AQUI MUDA O NOME LÁ EM CIMA
      ? `${grade} — ${defaultProduct.measuresLabel}`
      : grade,
    family: "INOX",
    form: "BLANK",
    type: "INOX",
    thickness: thicknessStr,
    width,
    length,
  });
};


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col justify-center">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Plus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isInoxSelected ? "Novo Blank Inox" : "Entrada de MP"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isInoxSelected
                ? "Cadastre chapas / blanks inox recebidos"
                : "Cadastre a materia-prima recebida ou bobinas 2 prontas de NF"}
            </p>
          </div>

          <div className="space-y-4">
            {/* --- LINHA 0: TIPO DE MAT?RIA-PRIMA (BOBINA x BLANK INOX x B2 NF) --- */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Tipo de Matéria-prima
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "CARBONO",
                        form: "BOBINA",
                        inoxGrade: "",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      !isInoxSelected && !isB2Industrialized
                        ? "bg-blue-600/20 border-blue-500/60 text-blue-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-blue-500/40"
                    }`}
                  >
                    Bobina (a?o / galv)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "INOX",
                        form: "BLANK",
                        type: "INOX",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isInoxSelected
                        ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-emerald-500/40"
                    }`}
                  >
                    Blank Inox
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(true);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "B2",
                        form: "B2_PURCHASE",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isB2Industrialized
                        ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-indigo-500/40"
                    }`}
                  >
                    Bobina 2 - Industrializada
                  </button>
                </div>
              </div>
            </div>

            {isB2Industrialized ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nota Fiscal"
                    value={newB2Purchase.nf}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        nf: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Data Entrada"
                    type="date"
                    value={newB2Purchase.entryDate}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        entryDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                    Tipo de Bobina 2
                  </label>
                  <select
                    className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                    value={newB2Purchase.b2Code}
                    onChange={(e) => handleSelectPurchasedB2(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {uniqueB2Catalog.map((item) => (
                      <option key={item.b2Code} value={item.b2Code}>
                        {item.b2Code} - {item.b2Name} ({item.width || "-"}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Descrição Bobina 2"
                  value={newB2Purchase.b2Name}
                  onChange={(e) =>
                    setNewB2Purchase((prev) => ({
                      ...prev,
                      b2Name: e.target.value,
                    }))
                  }
                  placeholder="Ex: BOBINA 2 PERFIL UE"
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Largura (mm)"
                    type="number"
                    value={newB2Purchase.width}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        width: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Espessura"
                    value={newB2Purchase.thickness}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        thickness: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Tipo"
                    value={newB2Purchase.type}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Peso total (kg)"
                    type="number"
                    value={newB2Purchase.weight}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Qtd de bobinas"
                    type="number"
                    value={newB2Purchase.quantity}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>

                {purchaseUnitWeight && (
                  <div className="text-xs text-gray-400">
                    Peso por bobina aproximado:{" "}
                    <span className="text-blue-300 font-bold">
                      {purchaseUnitWeight} kg
                    </span>
                  </div>
                )}

                <Button onClick={addPurchasedChildCoil} className="w-full" disabled={isSavingB2Purchase}>
                  {isSavingB2Purchase ? "Lançando..." : "Lancar Bobina 2 (NF)"}
                </Button>
              </div>
            ) : (
              <>
                {/* --- LINHA 0.1: SELETOR DE TIPO DE INOX (SEM REPETIÇÃO) --- */}
                {isInoxSelected && (
                  <div>
                    <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                      Tipo de Inox
                    </label>
                    <select
                      value={selectedInoxGrade}
                      onChange={handleSelectInoxGrade}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Selecione...</option>
                      {inoxGrades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>

                    {defaultProductForSelectedGrade && (
                      <div className="mt-2 text-[11px] text-gray-400">
                        Medidas padrão:{" "}
                        <span className="font-semibold">
                          {defaultProductForSelectedGrade.measuresLabel}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* --- LINHA 1: CÓDIGO, NF e DATA (3 Colunas) --- */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Código Lote só aparece quando NÃO é inox */}
                  {!isInoxSelected && (
                    <div className="col-span-1">
                      <Input
                        label="Código Lote"
                        value={newMotherCoil.code}
                        onChange={(e) =>
                          setNewMotherCoil({
                            ...newMotherCoil,
                            code: e.target.value,
                          })
                        }
                        placeholder="Ex: 10644"
                      />
                    </div>
                  )}

                  <div className={isInoxSelected ? "col-span-2" : "col-span-1"}>
                    <Input
                      label="Nota Fiscal"
                      value={newMotherCoil.nf}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          nf: e.target.value,
                        })
                      }
                      placeholder="Ex: 12345"
                    />
                  </div>

                  <div className="col-span-1">
                    <Input
                      label="Data Entrada"
                      type="date"
                      value={newMotherCoil.entryDate}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          entryDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* --- USINA E FILIAL DESTINO --- */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">Usina</label>
                    <select
                      value={newMotherCoil.usina}
                      onChange={(e) => setNewMotherCoil({ ...newMotherCoil, usina: e.target.value, usinaOutro: e.target.value !== 'Outro' ? '' : newMotherCoil.usinaOutro })}
                      className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                    >
                      <option value="">Selecionar...</option>
                      <option value="Usiminas">Usiminas</option>
                      <option value="Arcelor">Arcelor</option>
                      <option value="CSN">CSN</option>
                      <option value="Outro">Outro...</option>
                    </select>
                    {newMotherCoil.usina === 'Outro' && (
                      <input
                        type="text"
                        value={newMotherCoil.usinaOutro}
                        onChange={(e) => setNewMotherCoil({ ...newMotherCoil, usinaOutro: e.target.value })}
                        placeholder="Nome da usina"
                        className="w-full mt-2 p-2 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm placeholder-gray-600"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">Filial Destino</label>
                    <input
                      type="text"
                      value={newMotherCoil.filialDestino}
                      onChange={(e) => setNewMotherCoil({ ...newMotherCoil, filialDestino: e.target.value })}
                      placeholder="Ex: Filial SP"
                      className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* --- LINHA 2: 
                      - INOX: Peso + Quantidade
                      - Não INOX: Peso + Largura
                  --- */}
                {isInoxSelected ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Peso (kg)"
                      type="number"
                      value={newMotherCoil.weight}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          weight: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Quantidade (peças)"
                      type="number"
                      value={newMotherCoil.qty || ""}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          qty: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Peso (kg)"
                      type="number"
                      value={newMotherCoil.weight}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          weight: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Largura (mm)"
                      type="number"
                      value={newMotherCoil.width}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          width: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {!isB2Industrialized && (
              <Button
                onClick={addMotherCoil}
                className="w-full py-3 text-lg shadow-md mt-4"
              >
                Confirmar Entrada
              </Button>
            )}
          </div>
        </Card>
      </div>


      {/* LADO DIREITO: LISTA DE ENTRADAS */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="bg-gray-800/80 border-blue-900/30">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                Material Identificado
              </label>
              <div className="font-medium text-white text-lg truncate">
                {newMotherCoil.material || "Aguarda código..."}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Espessura
                </label>
                <div className="font-bold text-blue-400 text-xl">
                  {newMotherCoil.thickness || "-"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Tipo
                </label>
                <div className="font-bold text-blue-400 text-xl">
                  {newMotherCoil.type || "-"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
            <List size={20} className="text-gray-400" /> Entradas Recentes
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3 max-h-[calc(100vh-260px)]">
            {[
              ...motherCoils.map((m) => ({ ...m, entryType: "mother" })),
              ...childCoils
                .filter((c) => c.source === "purchase_nf" || c.origin === "NF")
                .map((c) => ({ ...c, entryType: "b2nf" })),
            ]
              .sort((a, b) => {
                const parseDateSafe = (raw) => {
                  if (!raw) return 0;
                  if (raw instanceof Date) return raw.getTime();
                  if (typeof raw === "number") return raw;
                  if (typeof raw === "string") {
                    if (raw.length === 10 && raw.includes("-")) {
                      return new Date(raw).getTime();
                    }
                    if (raw.includes("/")) {
                      const [dia, mes, ano] = raw.split("/");
                      return new Date(`${ano}-${mes}-${dia}`).getTime();
                    }
                  }
                  return 0;
                };

                const getDateValue = (item) => {
                  return (
                    parseDateSafe(item.entryDate) ||
                    parseDateSafe(item.date) ||
                    parseDateSafe(item.createdAt) ||
                    0
                  );
                };

                const timeA = getDateValue(a);
                const timeB = getDateValue(b);

                if (timeA !== timeB) {
                  return timeB - timeA;
                }

                const codeA = a.entryType === "b2nf" ? a.b2Code : a.code;
                const codeB = b.entryType === "b2nf" ? b.b2Code : b.code;

                return String(codeB || "")
                  .localeCompare(String(codeA || ""), undefined, {
                    numeric: true,
                  });
              })
              .slice(0, 50)
              .map((coil) => (
                <div
                  key={coil.id}
                  className={`p-4 rounded-xl border flex justify-between items-center transition-all hover:bg-gray-700/50 ${
                    coil.status === "stock"
                      ? "bg-gray-900 border-gray-700"
                      : "bg-gray-800 border-gray-700 opacity-50"
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-200 flex items-center gap-2 flex-wrap">
                      {coil.entryType === "b2nf" ? coil.b2Code : coil.code}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          coil.status === "stock"
                            ? "bg-emerald-900/40 text-emerald-400 border border-emerald-900"
                            : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        {coil.entryType === "b2nf"
                          ? "B2 NF"
                          : coil.status === "stock"
                          ? "EM ESTOQUE"
                          : "CONSUMIDA"}
                      </span>

                      {coil.form === "BLANK" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-500/40">
                          BLANK INOX
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      {coil.entryType === "b2nf"
                        ? `${coil.b2Name || coil.b2Code || ""}`.toUpperCase()
                        : (coil.family || coil.type || "").toUpperCase()}{" "}
                      | {coil.thickness || "-"} |{" "}
                      {coil.entryType === "b2nf" ? coil.type : coil.material}
                    </div>

                    <div className="text-[10px] text-blue-400 mt-1 font-bold">
                      NF: {coil.nf || "-"} | Entrada:{" "}
                      {coil.entryDate || coil.date || coil.createdAt || "-"}
                    </div>

                    {coil.form === "BLANK" && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {coil.width} x {coil.length} mm | Qtd:{" "}
                        {coil.qty || 0} pcs
                      </div>
                    )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-xl text-white">
                        {(Number(coil.weight) || 0).toFixed(0)}{" "}
                          <span className="text-sm text-gray-500 font-normal">
                            kg
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                        {coil.width}mm
                        </div>
                      </div>
                    {coil.status === "stock" && (
                      <div className="flex gap-2">
                        {coil.entryType === "b2nf" ? (
                          <>
                            <button
                              onClick={() => setEditingChildCoil(coil)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteChildCoil(coil.id)}
                              className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingMotherCoil(coil)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteMotherCoil(coil.id)}
                              className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};


const getUnitWeight = (code) => {
    const c = String(code || '').trim();
    return Number(PESO_UNITARIO_PA[c]) || 0;
  };




  const renderCuttingProcess = () => {
    // 1. Filtra as bobinas mães (Busca Blindada)
    const availableMothers = motherCoils.filter(m => m.status === 'stock');
    
    const filteredMothers = availableMothers.filter(m => {
        if (!motherSearchQuery) return true;
        const search = motherSearchQuery.toLowerCase();
        const code = m.code ? String(m.code).toLowerCase() : '';
        const material = m.material ? String(m.material).toLowerCase() : '';
        return code.includes(search) || material.includes(search);
    });

    const selectedMother = motherCoils.find(m => m.id === selectedMotherForCut);

    // --- LÓGICA DE FILTRO (LÊ DIRETO DO ARQUIVO) ---
    const cleanNum = (val) => {
        if (!val) return 0;
        return parseFloat(String(val).replace(',', '.').replace('mm', '').trim());
    };

    const uniqueByB2 = (items) => {
        const map = new Map();
        items.forEach((p) => { if (!map.has(p.b2Code)) map.set(p.b2Code, p); });
        return Array.from(map.values()).sort((a, b) => a.b2Name.localeCompare(b.b2Name));
    };

    const allB2Types = uniqueByB2(INITIAL_PRODUCT_CATALOG);
    let filteredB2Types = [];
    if (selectedMother) {
        const motherThick = cleanNum(selectedMother.thickness);
        const targetCode = String(selectedMother.code).trim();

        const filteredCatalog = INITIAL_PRODUCT_CATALOG.filter(p => {
            if (p.motherCode && String(p.motherCode).trim() === targetCode) return true;
            const prodThick = cleanNum(p.thickness);
            if (Math.abs(prodThick - motherThick) < 0.05) return true;
            return false;
        });

        filteredB2Types = uniqueByB2(filteredCatalog);
    }

    const availableB2Types = showAllB2Profiles ? allB2Types : filteredB2Types;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* --- COLUNA ESQUERDA --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="font-bold text-gray-200 mb-4">1. Selecionar Origem</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="text" placeholder="Buscar..." className="w-full pl-10 p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none" value={motherSearchQuery} onChange={e => { setMotherSearchQuery(e.target.value); setSelectedMotherForCut(''); }} />
             </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[calc(100vh-260px)]">
                {filteredMothers.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMotherForCut(m.id); setTempChildCoils([]); }} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedMotherForCut === m.id ? 'bg-blue-900/20 border-blue-500 shadow-sm' : 'bg-gray-900 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800'}`}>
                    <div className="flex justify-between items-center"><span className="font-bold text-gray-200">{m.code}</span><span className="text-sm font-bold text-blue-400">{(Number(m.remainingWeight ?? m.weight) || 0).toFixed(0)} kg</span></div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between"><span>{m.type}</span><span>{m.thickness}</span></div>
                    <div className="text-[10px] text-blue-400 mt-1 font-bold">Entrada: {m.date}</div>
                  </div>
                ))}
              </div>
           </Card>
        </div>

        {/* --- COLUNA DIREITA --- */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
           {selectedMother ? (
             <>
               {/* 1. INFO DA BOBINA */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-none md:col-span-2">
                    <div className="p-2"><h2 className="text-3xl font-bold">{selectedMother.code}</h2><p>{selectedMother.material}</p></div>
                 </Card>
                 <Card className="flex flex-col justify-center items-center bg-gray-800 border-gray-700"><p className="text-4xl font-bold text-white">{(Number(selectedMother.remainingWeight) || 0).toFixed(0)}</p><p className="text-gray-500 text-sm">kg</p></Card>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 2. CARD ADICIONAR (Com Switch) */}
                  <Card>
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-200 flex items-center gap-2">{isOtherMode ? <LogOut size={20} className="text-amber-500"/> : <Plus size={20} className="text-blue-500"/>}{isOtherMode ? "Consumo Direto / Outros" : "Adicionar Tiras Slitter"}</h3><label className="flex items-center cursor-pointer gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 select-none"><span className={`text-xs font-bold ${!isOtherMode ? 'text-blue-400' : 'text-gray-500'}`}>Bobina 2</span><div className="relative"><input type="checkbox" className="hidden" checked={isOtherMode} onChange={e => setIsOtherMode(e.target.checked)} /><div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isOtherMode ? 'bg-amber-600' : 'bg-blue-600'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isOtherMode ? 'translate-x-5' : 'translate-x-0'}`}></div></div></div><span className={`text-xs font-bold ${isOtherMode ? 'text-amber-400' : 'text-gray-500'}`}>Outros</span></label></div>
                    <div className="space-y-4">
                      {isOtherMode ? (
                          <div className="bg-amber-900/10 p-4 rounded-lg border border-amber-500/30"><Input label="Descrição" value={otherDescription} onChange={e => setOtherDescription(e.target.value)} /><Input label="Peso" type="number" value={cutWeight} onChange={e => setCutWeight(e.target.value)} /><Button onClick={addTempChildCoil} variant="warning" className="w-full mt-2">Adicionar</Button></div>
                      ) : (
                          <div>
                              <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-bold text-gray-500 uppercase">Tipo de Bobina 2</label>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setShowAllB2Profiles(prev => {
                                              const next = !prev;
                                              if (!next && targetB2Code) {
                                                  const stillAllowed = filteredB2Types.some(t => t.b2Code === targetB2Code);
                                                  if (!stillAllowed) setTargetB2Code('');
                                              }
                                              return next;
                                          });
                                      }}
                                      className={`text-[11px] font-bold px-2 py-1 rounded-full border transition ${showAllB2Profiles ? 'bg-amber-900/30 text-amber-300 border-amber-500/40' : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'}`}
                                  >
                                      {showAllB2Profiles ? 'Todos os perfis liberados' : 'Liberar todos os perfis'}
                                  </button>
                              </div>
                              <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm" value={targetB2Code} onChange={e => setTargetB2Code(e.target.value)}>
                                  <option value="">Selecione...</option>
                                  {availableB2Types.map(t => (
                                      <option key={t.code} value={t.b2Code}>{t.b2Code} - {t.b2Name} - {t.width}mm</option>
                                  ))}
                              </select>
                              {showAllB2Profiles && (
                                  <div className="text-[11px] text-amber-300/80 mt-1">
                                      Mostrando todos os perfis do catálogo (não filtrado pela estrutura).
                                  </div>
                              )}
                              <div className="grid grid-cols-2 gap-4 mt-4"><div><Input label="Peso" type="number" value={cutWeight} onChange={e => setCutWeight(e.target.value)} /></div><div><Input label="Qtd" type="number" value={cutQuantity} onChange={e => setCutQuantity(e.target.value)} /></div></div>
                              <Button onClick={addTempChildCoil} className="w-full mt-2" disabled={!targetB2Code || !cutWeight || !cutQuantity}>Adicionar</Button>
                          </div>
                      )}
                    </div>
                  </Card>
                  
                  {/* 3. CARD PLANO DE CORTE (COM LIXEIRA) */}
                  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-200">Plano de Corte</h3><span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full font-bold">{tempChildCoils.length} itens</span></div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar-dark space-y-2 max-h-[200px]">
                       {tempChildCoils.map((item, idx) => (
                         <div key={idx} className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 flex justify-between items-center">
                           <div className="flex-1 min-w-0 pr-2">
                               <div className="font-bold text-gray-200 text-xs truncate" title={item.b2Name}>
                                   <span className="text-emerald-400">{item.b2Code}</span>
                                   <span className="text-gray-400 ml-1">- {item.b2Name}</span>
                               </div>
                           </div>
                           <div className="flex items-center gap-3 shrink-0">
                               <span className="font-bold text-white text-sm">{item.weight.toFixed(0)} kg</span>
                               <button onClick={() => setTempChildCoils(tempChildCoils.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                           </div>
                         </div>
                       ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700 bg-gray-900/30 p-3 rounded-xl">
                       <div className="mb-2"><Input label="Data Corte" type="date" value={cuttingDate} onChange={e => setCuttingDate(e.target.value)} /></div>
                       <div className="mb-2"><Input label="Sucata" type="number" value={processScrap} onChange={e => setProcessScrap(e.target.value)} /></div>
                       <div className="flex justify-between items-end">
                          <div><p className="text-xs text-gray-500 font-bold uppercase">Saldo Final</p><p className="text-2xl font-bold text-emerald-500">{(selectedMother.remainingWeight - tempChildCoils.reduce((a,b)=>a+b.weight,0) - (parseFloat(processScrap)||0)).toFixed(1)} kg</p></div>
                          <Button onClick={confirmCut} variant="success" disabled={tempChildCoils.length === 0}>PROCESSAR</Button>
                       </div>
                    </div>
                  </Card>
               </div>
             </>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-700">Selecione uma Bobina</div>
           )}

           {/* 4. HISTÓRICO */}
           <Card className="flex-1 border-t-4 border-purple-500 min-h-[350px]">
             <h3 className="font-bold text-gray-200 p-4 flex items-center gap-2"><History size={20} className="text-purple-500"/> Histórico de Cortes Realizados</h3>
             <div className="flex-1 overflow-y-auto h-full px-4 pb-4">
                {cuttingLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">Nenhum corte registrado ainda.</div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 sticky top-0"><tr><th className="p-3">Data</th><th className="p-3">Entrada de MP</th><th className="p-3">Saída</th><th className="p-3 text-right">Sucata</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {cuttingLogs.map(log => {
                                const rawItems = log.generatedItems || '';
                                const displayItems = rawItems.split(', ').map(itemStr => {
                                    const codeMatch = itemStr.match(/^([A-Z0-9]+)/); 
                                    if (codeMatch) {
                                        const code = codeMatch[1];
                                        if (itemStr.includes(' - ')) return itemStr;
                                        let prod = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === code);
                                        if (!prod) prod = INITIAL_PRODUCT_CATALOG.find(p => p.code === code);
                                        if (prod) return itemStr.replace(code, `${prod.b2Code} - ${prod.b2Name}`);
                                    }
                                    return itemStr;
                                }).join(', ');

                                return (
                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                        <td className="p-3 text-xs text-gray-400">{log.date}</td>
                                        <td className="p-3 font-bold text-white">{log.motherCode}</td>
                                        <td className="p-3 text-xs">
                                            <div className="max-w-[400px] truncate" title={displayItems}>{displayItems}</div>
                                            <div className="text-blue-400 font-bold">{log.outputCount} tiras</div>
                                        </td>
                                        <td className="p-3 text-right text-red-400">{log.scrap} kg</td>
                                        <td className="p-3 text-right font-bold text-emerald-400">{log.inputWeight.toFixed(0)} kg</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
             </div>
           </Card>
        </div>
      </div>
    );
  };
  const renderProduction = () => {
    // 1. Filtros e Listas (Blindados contra erro de busca)
    const availableForSelect = childCoils.filter(c => {
       if (c.status !== 'stock') return false;
       if (selectedInputCoils.find(sel => sel.id === c.id)) return false; 
       if (filterB2Type && c.type !== filterB2Type) return false;
       
       if (b2SearchQuery) {
         const query = b2SearchQuery.toLowerCase();
         const matchCode = String(c.b2Code).toLowerCase().includes(query);
         const matchName = String(c.b2Name).toLowerCase().includes(query);
         if (!matchCode && !matchName) return false;
       }
       return true;
    });

    const uniqueTypes = [...new Set(childCoils.map(c => c.type).filter(Boolean))];

    // --- NOVA LÓGICA DE AGRUPAMENTO ---
    const groupedLogs = productionLogs.reduce((acc, log) => {
        const code = log.productCode;
        if (!acc[code]) {
            acc[code] = {
                productCode: code,
                productName: log.productName,
                totalPieces: 0,
                logs: [],
                lastDate: log.date,
                lastTimestamp: log.timestamp || log.date // Para ordenação
            };
        }
        acc[code].totalPieces += Number(log.pieces);
        acc[code].logs.push(log);
        // Mantém a data mais recente
        if (new Date(log.timestamp || log.date) > new Date(acc[code].lastTimestamp)) {
            acc[code].lastDate = log.date;
            acc[code].lastTimestamp = log.timestamp || log.date;
        }
        return acc;
    }, {});

    // Transforma em array e ordena pelo movimento mais recente
    const groupedList = Object.values(groupedLogs).sort((a, b) => {
        return new Date(b.lastTimestamp) - new Date(a.lastTimestamp);
    });

    // Paginação aplicada aos GRUPOS agora
    const paginatedGroups = groupedList.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);

    // Totais visuais (Mantido igual)
    const totalInputWeight = selectedInputCoils.reduce((acc, c) => acc + c.weight, 0);
    const totalPcs = parseInt(totalProducedPieces) || 0;
    const packStd = parseInt(standardPackSize) || totalPcs || 1;
    const fullPacks = Math.floor(totalPcs / packStd);
    const rest = totalPcs % packStd;

    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-7 flex flex-col gap-6">
           <Card>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2"><Factory className="text-emerald-500"/> Produção por Total</h2>
             </div>
             
             <div className="space-y-4">
                {/* --- ÁREA 1: BOBINAS (Entrada) --- */}
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                   <div className="flex justify-between mb-2 items-center">
                      <label className="text-xs font-bold text-gray-500 uppercase">1. Matéria Prima</label>
                      <span className="text-xs text-blue-400 font-bold">{selectedInputCoils.length} bobinas | {totalInputWeight} kg</span>
                   </div>

                   <div className="flex gap-2 mb-2">
                       {uniqueTypes.length > 0 && ( 
                         <select className="bg-gray-800 text-xs text-white border border-gray-600 rounded p-1" value={filterB2Type} onChange={e => setFilterB2Type(e.target.value)}>
                           <option value="">Tipo: Todos</option>
                           {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       )}
                       <input type="text" placeholder="Buscar..." value={b2SearchQuery} onChange={e => setB2SearchQuery(e.target.value)} className="flex-1 bg-gray-800 text-xs text-white border border-gray-600 rounded p-1 pl-2 outline-none"/>
                   </div>

                   <select 
                     className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-gray-200 outline-none text-sm focus:border-blue-500 transition-colors" 
                     value="" 
                     onChange={(e) => { 
                        const newId = e.target.value;
                        if (!newId) return;
                        const coilToAdd = childCoils.find(c => String(c.id) === String(newId));
                        if (coilToAdd) {
                             const newList = [...selectedInputCoils, coilToAdd];
                             setSelectedInputCoils(newList);
                             if (newList.length === 1) {
                                 const match = productCatalog.find(p => String(p.b2Code) === String(coilToAdd.b2Code));
                                 if (match) setSelectedProductCode(match.code);
                             }
                        }
                     }}
                   >
                      <option value="">+ Adicionar bobina...</option>
                      {availableForSelect.map(c => (
                        <option key={c.id} value={c.id}>{c.b2Code} - {c.b2Name} ({c.weight}kg)</option>
                      ))}
                    </select>

                    {selectedInputCoils.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar-dark">
                            {selectedInputCoils.map((coil, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-800 px-2 py-1 rounded border border-gray-600 text-xs">
                                    <span className="text-gray-300">{coil.b2Code} ({coil.weight}kg)</span>
                                    <button onClick={() => setSelectedInputCoils(selectedInputCoils.filter(c => c.id !== coil.id))} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- ÁREA 2: DADOS DE PRODUÇÃO --- */}
                <div className="animate-fade-in">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">2. Produto Final</label>
                          <select 
                            className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-200 outline-none text-sm" 
                            value={selectedProductCode} 
                            onChange={e => setSelectedProductCode(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {productCatalog.map(p => (
                                <option key={p.code} value={p.code}>
                                    {p.code} - {p.name}
                                </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="col-span-1">
                              <Input label="Data Produção" type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Total Produzido" type="number" placeholder="Ex: 486" value={totalProducedPieces} onChange={e => setTotalProducedPieces(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Padrão Pacote" type="number" placeholder="Ex: 100" value={standardPackSize} onChange={e => setStandardPackSize(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Sucata (kg)" type="number" value={prodScrap} onChange={e => setProdScrap(e.target.value)} />
                          </div>
                        </div>

                        {totalPcs > 0 && (
                            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                                <p className="text-xs text-blue-300 font-bold uppercase mb-2">Simulação de Etiquetas:</p>
                                <div className="flex flex-wrap gap-2">
                                    {fullPacks > 0 && <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center shadow-lg">{fullPacks}x pacotes de {packStd} pçs</div>}
                                    {rest > 0 && <div className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center shadow-lg">+ 1x pacote de {rest} pçs (Sobra)</div>}
                                </div>
                            </div>
                        )}

                        <Button onClick={registerProduction} variant="success" className="w-full py-4 text-lg shadow-lg mt-2" disabled={selectedInputCoils.length === 0 || !selectedProductCode || !totalProducedPieces}>
                          <Printer className="mr-2"/> Confirmar e Imprimir
                        </Button>
                      </div>
                  </div>
             </div>
           </Card>
        </div>

        {/* --- HISTÓRICO LATERAL AGRUPADO --- */}
        <div className="lg:col-span-5 h-full">
           <Card className="h-full flex flex-col bg-gray-900 border-gray-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2"><History size={20} className="text-emerald-500"/> Produção Recente</h3>
             </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3">
                 {paginatedGroups.length === 0 ? <div className="text-gray-500 text-center py-4">Nenhum registro.</div> : paginatedGroups.map(group => (
                 <div key={group.productCode} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:bg-gray-700/80 transition-colors">
                   
                   <div className="flex justify-between mb-1">
                       <span className="text-[10px] text-emerald-400 font-mono font-bold">{group.productCode}</span>
                       <span className="text-[10px] text-gray-400">{group.lastDate}</span>
                   </div>
                   
                   <p className="font-bold text-gray-200 text-sm mb-2 truncate" title={group.productName}>{group.productName}</p>
                   
                   <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase">Total Produzido</span>
                          <span className="text-emerald-400 font-bold text-lg">{group.totalPieces} <span className="text-xs font-normal text-gray-500">pçs</span></span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         <div className="text-right mr-2">
                            <span className="block text-[10px] text-gray-500 uppercase">Lotes</span>
                            <span className="font-bold text-white text-sm">{group.logs.length}</span>
                         </div>
                         <Button 
                            onClick={() => { setSelectedGroupData({code: group.productCode, name: group.productName}); setShowHistoryModal(true); }} 
                            variant="secondary" 
                            className="h-8 px-3 text-xs"
                         >
                            <List size={14} className="mr-1"/> Detalhes
                         </Button>
                      </div>
                   </div>

                 </div>
               ))}
             </div>
             <PaginationControls currentPage={logsPage} totalItems={groupedList.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setLogsPage} />
           </Card>
        </div>
      </div>
    );
  };
  const renderShipping = () => {
    const stock = getFinishedStock();
    const availableProducts = Object.values(stock).filter(i => i.count > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
         <Card>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 text-lg"><Truck className="text-amber-500"/> Nova Expedição</h3>
            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Produto em Estoque</label>
                 <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-200 outline-none text-sm" value={shipProduct} onChange={e => setShipProduct(e.target.value)}>
  <option value="">Selecione...</option>
  {/* AQUI ESTÁ A ALTERAÇÃO: Adicionei {p.code} e um traço separador */}
  {availableProducts.map(p => (
    <option key={p.code} value={p.code}>
      {p.code} - {p.name} (Saldo: {p.count})
    </option>
  ))}
</select>
               </div>
               <Input label="Quantidade" type="number" value={shipQty} onChange={e => setShipQty(e.target.value)} />
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Destino (Filial)</label>
                 <div className="flex gap-4">
                   <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dest" checked={shipDest === 'COMETA'} onChange={() => setShipDest('COMETA')} /> <span className="text-white">Cometa</span></label>
                   <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dest" checked={shipDest === 'SERRA'} onChange={() => setShipDest('SERRA')} /> <span className="text-white">Serra</span></label>
                 </div>
               </div>
               <Button onClick={registerShipping} variant="warning" className="w-full py-3 mt-4">Confirmar Baixa</Button>
            </div>
         </Card>
         <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
  <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">Histórico de Expedição</h3>
  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark space-y-2">
    {shippingLogs.map(log => (
      <div key={log.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
        <div className="flex justify-between">
          {/* AQUI A ALTERAÇÃO: Adicionando o código antes do nome */}
          <span className="font-bold text-white">
            {log.productCode} - {log.productName}
          </span>
          <span className="text-xs text-gray-500">{log.date}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-sm text-amber-400 font-bold">{log.destination}</span>
          <span className="text-sm text-gray-300">{log.quantity} pçs</span>
        </div>
      </div>
    ))}
  </div>
</Card>
      </div>
    );
  };

// --- GERADOR DE PDF PROFISSIONAL (EXTRATO MP) ---
  const handleGenerateMPReportPDF = (dataList, start, end) => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups.");

    const now = new Date().toLocaleString();

    // Gera o HTML de cada item (Bobina)
    const itemsHtml = dataList.map(item => {
        // Recalcula o saldo linha a linha para o PDF ficar perfeito
        let runningBalance = item.initialBalance;
        const movementsRows = item.movements.map(mov => {
            runningBalance += mov.weightChange;
            const isEntry = mov.weightChange > 0;
            return `
                <tr>
                    <td style="text-align:center">${mov.date}</td>
                    <td>${mov.type}</td>
                    <td>${mov.detail}</td>
                    <td style="text-align:right; color:${isEntry ? '#059669' : '#ccc'}">${isEntry ? mov.weightChange.toLocaleString('pt-BR') : '-'}</td>
                    <td style="text-align:right; color:${!isEntry ? '#dc2626' : '#ccc'}">${!isEntry ? Math.abs(mov.weightChange).toLocaleString('pt-BR') : '-'}</td>
                    <td style="text-align:right; font-weight:bold; background-color:#f3f4f6">${runningBalance.toLocaleString('pt-BR')}</td>
                </tr>
            `;
        }).join('');

        return `

        
            <div class="item-container">
                <div class="item-header">
                    <span class="item-code">${item.code}</span>
                    <span class="item-desc">${item.desc}</span>
                </div>
                
                <div class="kpi-box">
                    <div><span class="label">Saldo Anterior:</span> <span class="value">${item.initialBalance.toLocaleString('pt-BR')} kg</span></div>
                    <div><span class="label">Entradas:</span> <span class="value" style="color:#059669">+${item.periodIn.toLocaleString('pt-BR')} kg</span></div>
                    <div><span class="label">Saídas:</span> <span class="value" style="color:#dc2626">-${item.periodOut.toLocaleString('pt-BR')} kg</span></div>
                    <div style="border-left:1px solid #ccc; padding-left:10px"><span class="label">Saldo Atual:</span> <span class="value" style="font-weight:900">${item.finalBalance.toLocaleString('pt-BR')} kg</span></div>
                </div>

                ${item.movements.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th width="15%">Data</th>
                                <th width="15%">Tipo</th>
                                <th>Histórico / NF</th>
                                <th width="12%" style="text-align:right">Entrada</th>
                                <th width="12%" style="text-align:right">Saída</th>
                                <th width="15%" style="text-align:right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movementsRows}
                        </tbody>
                    </table>
                ` : '<div style="padding:10px; color:#999; font-style:italic; text-align:center; border:1px solid #eee;">Sem movimentação no período selecionado.</div>'}
            </div>
        `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Extrato de Movimentação - Metalosa</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #333; -webkit-print-color-adjust: exact; }
            .header { border-bottom: 2px solid #1f2937; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title h1 { margin: 0; font-size: 18px; text-transform: uppercase; color: #111827; }
            .title p { margin: 0; color: #6b7280; }
            .meta { text-align: right; font-size: 10px; color: #6b7280; }
            
            .item-container { margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
            .item-header { background-color: #1f2937; color: white; padding: 8px 12px; font-size: 13px; font-weight: bold; display: flex; gap: 10px; align-items: center; }
            .item-code { background: #374151; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
            
            .kpi-box { display: flex; justify-content: space-between; background: #f9fafb; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            .label { text-transform: uppercase; color: #6b7280; font-size: 9px; font-weight: bold; margin-right: 5px; }
            .value { font-size: 12px; font-weight: 600; }

            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #f3f4f6; color: #4b5563; text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; font-size: 9px; }
            td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
            tr:last-child td { border-bottom: none; }
            tr:nth-child(even) { background-color: #fff; }
            
            .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #9ca3af; padding: 10px; background: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">
                <h1>Extrato de Movimentação de Estoque</h1>
                <p>Período: <strong>${start.split('-').reverse().join('/')}</strong> até <strong>${end.split('-').reverse().join('/')}</strong></p>
            </div>
            <div class="meta">
                <p>Emissão: ${now}</p>
                <p>METALOSA INDÚSTRIA</p>
            </div>
          </div>

          ${itemsHtml}
          
          <div class="footer">Relatório gerado pelo Sistema de Controle de Produção</div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

const renderReports = () => {
  // =================================================================================
  // 1. UTILITÁRIOS E SEGURANÇA
  // =================================================================================
  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const normalizeCode = (v) => String(v ?? '').trim();

  const isValidDate = (d) =>
    d && typeof d === 'string' && (d.includes('/') || d.includes('-'));

  const toISODate = (d) => {
    if (!isValidDate(d)) return '0000-00-00';
    if (d.includes('/')) return d.split('/').reverse().join('-');
    return d;
  };

  const getTimestamp = (d) => {
    if (!isValidDate(d)) return 0;
    const iso = d.includes('/') ? d.split('/').reverse().join('-') : d;
    return new Date(`${iso}T12:00:00`).getTime();
  };

  const getTypeColor = (type) => {
    const typeKey = normalizeTypeKey(type);
    if (typeKey === 'ENTRADA MP') return 'text-blue-400';
    if (typeKey === 'CORTE') return 'text-purple-400';
    if (typeKey === 'PRODUCAO') return 'text-emerald-400';
    if (typeKey === 'EXPEDICAO') return 'text-amber-400';
    return 'text-amber-400';
  };

  // chave padrão de MP: código + largura (quando não usamos id)
  // 🔹 SEM ID: 1 chave = 1 (código + largura)
const makeKeyFromMother = (m) => {
  const code = normalizeCode(m?.code) || 'S/ COD';
  const w = safeNum(m?.width);
  return `${code}|${w || 0}`;
};

const makeKeyFromCut = (c, safeMother) => {
  const code = normalizeCode(c?.motherCode) || 'S/ COD';
  const inputWeight = safeNum(c?.inputWeight); // peso consumido no corte

  const candidates = safeMother.filter(
    (m) => normalizeCode(m.code) === code
  );

  // 1) tenta usar a largura que veio no log de corte
  let width = safeNum(c?.motherWidth) || safeNum(c?.width) || 0;

  const hasMotherWithThisWidth =
    width > 0 &&
    candidates.some((m) => safeNum(m.width) === width);

  // Se a largura que veio NO CORTE não existir em nenhuma bobina,
  // considera que ela é inválida e vamos tentar outro critério.
  if (!hasMotherWithThisWidth) {
    width = 0;
  }

  // 2) Se ainda não temos largura válida, tenta casar pelo PESO DO LOTE
  if (!width && inputWeight > 0) {
    // compara com peso original ou peso cheio da bobina
    const byExactWeight = candidates.filter((m) => {
      const wMother =
        safeNum(m.originalWeight) || safeNum(m.weight);
      // tolerância pequena pra evitar problema de casa decimal
      return Math.abs(wMother - inputWeight) < 0.001;
    });

    if (byExactWeight.length === 1) {
      width = safeNum(byExactWeight[0].width);
    }
  }

  // 3) Se mesmo assim ainda não rolou, volta pro fallback antigo:
  //    se só tiver UMA largura possível nesse código, usa ela.
  if (!width) {
    const uniqueWidths = [
      ...new Set(
        candidates.map((m) => safeNum(m.width)).filter((w) => w > 0)
      ),
    ];
    if (uniqueWidths.length === 1) {
      width = uniqueWidths[0];
    } else {
      // aqui não tem jeito: ambíguo mesmo
      width = 0;
    }
  }

  return `${code}|${width || 0}`;
};



const handleGlobalDetail = (group) => {
  // group = { date, isoDate, type, events, totalQty, totalWeight }
  setSelectedGlobalGroup(group);
};



  // Arrays seguros
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeCutting = Array.isArray(cuttingLogs) ? cuttingLogs : [];
  const safeProd = Array.isArray(productionLogs)
    ? dedupeProductionLogs(productionLogs)
    : [];
  const safeShipping = Array.isArray(shippingLogs) ? shippingLogs : [];
  const safeChild = Array.isArray(childCoils) ? childCoils : [];

  // =================================================================================
  // 2. EXTRATO MP (KARDEX)
  // =================================================================================

  // A. Estoque real (saldo físico hoje)
  const realStockMap = {};
  safeMother.forEach((m) => {
    if (m.status !== 'stock') return;
    const key = makeKeyFromMother(m);
    if (!realStockMap[key]) realStockMap[key] = 0;
    realStockMap[key] += safeNum(m.remainingWeight) || safeNum(m.weight);
  });

  // B. Catálogo por código
  const catalogByCode = (motherCatalog || []).reduce((acc, item) => {
    const code = normalizeCode(item.code);
    if (code) acc[code] = item;
    return acc;
  }, {});

  // C. Movimentações por chave
  const movementsMap = {};

  // C1. Entradas
  safeMother.forEach((m) => {
    if (!m.date) return;
    const d = toISODate(m.date);
    if (d < reportStartDate || d > reportEndDate) return;

    const key = makeKeyFromMother(m);
    if (!movementsMap[key]) movementsMap[key] = { in: 0, out: 0, details: [] };

    let w = safeNum(m.originalWeight);
    if (w === 0) w = safeNum(m.weight);

    const width = safeNum(m.width);

    movementsMap[key].in += w;
    movementsMap[key].details.push({
      date: m.date,
      timestamp: getTimestamp(m.date),
      type: 'ENTRADA',
      weightChange: w,
      movementId: m.id || '',
      width, // guarda largura no movimento
      desc: m.material,
      detail: `NF: ${m.nf || '-'}`,
    });
  });

  // C2. Saídas (corte slitter)
  safeCutting.forEach((c) => {
  if (!c.date) return;
  const d = toISODate(c.date);
  if (d < reportStartDate || d > reportEndDate) return;

  const key = makeKeyFromCut(c, safeMother); // ou a chave que você já usa

  if (!movementsMap[key]) {
    movementsMap[key] = {
      code: c.motherCode || 'S/ COD',
      desc: c.motherMaterial || '',
      width:
        safeNum(c?.motherWidth) ||
        safeNum(c?.width) ||
        null,
      initialBalance: 0,
      in: 0,
      out: 0,
      details: [],
    };
  }

  const w = safeNum(c.inputWeight);

  // 👇 sucata do corte (ajusta o nome do campo se for diferente)
  const scrap = safeNum(c.scrapWeight ?? c.scrap ?? 0);

  movementsMap[key].out += w;

  // descrição base: o que você já mostrava
  const baseDetail =
    c.generatedItems ||
    c.motherMaterial ||
    'Consumo Slitter';

  // monta o texto final com sucata
  const detail =
    scrap > 0
      ? `${baseDetail} | Sucata: ${scrap.toLocaleString('pt-BR', {
          maximumFractionDigits: 1,
        })} kg`
      : baseDetail;

  movementsMap[key].details.push({
    date: c.date,
    timestamp: getTimestamp(c.date),
    type: 'SAÍDA',
    weightChange: -w,
    movementId: c.id || '',
    width: movementsMap[key].width,
    desc: movementsMap[key].desc,
    detail, // 👈 é isso que aparece no modal em {row.detail}
  });
});

  // D. Consolidação
  const mpSummaryList = [];
  const allKeys = new Set([
    ...Object.keys(movementsMap),
    ...Object.keys(realStockMap),
  ]);

  allKeys.forEach((key) => {
  const stock = realStockMap[key] || 0;
  const mov = movementsMap[key] || { in: 0, out: 0, details: [] };

  if (stock === 0 && mov.in === 0 && mov.out === 0) return;

  const calculatedInitial = stock - mov.in + mov.out;

  // key = "CODIGO|LARGURA"
  const [rawCode, rawWidth = '0'] = key.split('|');
  const code = normalizeCode(rawCode) || 'S/ COD';
  let width = safeNum(rawWidth) || 0;

  // 🔹 FALLBACK: se width veio 0, tenta achar em movimentos ou bobinas
  if (!width || width === 0) {
    const movWidth = mov.details.find((d) => safeNum(d.width) > 0);
    if (movWidth) {
      width = safeNum(movWidth.width);
    } else {
      const anyCoil = safeMother.find(
        (m) => normalizeCode(m.code) === code && safeNum(m.width) > 0
      );
      if (anyCoil) width = safeNum(anyCoil.width);
    }
  }

  const catalogItem = catalogByCode[code];
  const originalCoil = safeMother.find(
    (m) =>
      normalizeCode(m.code) === code &&
      (!width || safeNum(m.width) === width)
  );
  const histDesc = mov.details[0]?.desc;

  const description =
    catalogItem?.description ||
    originalCoil?.material ||
    histDesc ||
    'Item';

  mpSummaryList.push({
    key,
    code,
    width: width || null,
    desc: description,
    initialBalance: calculatedInitial,
    periodIn: mov.in,
    periodOut: mov.out,
    finalBalance: stock,
    movements: mov.details.sort((a, b) => a.timestamp - b.timestamp),
  });
});

  mpSummaryList.sort((a, b) => {
  const c = String(a.code).localeCompare(String(b.code));
  if (c !== 0) return c;
  return (a.width || 0) - (b.width || 0);
});


  // =================================================================================
  // 3. VISÃO GERAL (GLOBAL)
  // =================================================================================
    const rawGlobalEvents = [];

  // ENTRADA MP
  safeMother.forEach((m) =>
    rawGlobalEvents.push({
      rawDate: m.date,
      type: 'ENTRADA MP',
      id: m.id || m.code || '?',
      movementId: m.id || '',
      code: m.code || '?',
      desc: m.material || '-',
      qty: 1,
      weight: safeNum(m.originalWeight) || safeNum(m.weight),
    })
  );

  // CORTE SLITTER
  // CORTE – usado na LINHA DO TEMPO GLOBAL e no modal "Cortes Slitter"
safeCutting.forEach((c) => {
  const code = c.motherCode || '?';

  // descrição base: produtos gerados > material da mãe > fallback
  const baseDesc =
    c.generatedItems ||
    c.motherMaterial ||
    'Corte Slitter';

  // sucata do corte (ajusta o campo se o nome for outro)
  const scrap = safeNum(c.scrapWeight ?? c.scrap ?? 0);

  // monta a descrição final com sucata, se tiver
  const desc =
    scrap > 0
      ? `${baseDesc} | Sucata: ${scrap.toLocaleString('pt-BR', {
          maximumFractionDigits: 1,
        })} kg`
      : baseDesc;

  const qty = safeNum(c.outputCount) || 1;
  const weight = safeNum(c.inputWeight); // peso consumido da MP

  rawGlobalEvents.push({
    rawDate: c.date,
    type: 'CORTE',
    id: c.id || code,
    movementId: c.id || '',
    code,
    desc,
    qty,
    weight,
  });
});



  // PRODUCAO PA
  safeProd.forEach((p) => {
  const code = p.productCode || 'S/ COD';
  const lotId =
    p.trackingId ||
    p.id ||
    p.batchId ||
    p.lotId ||
    (p.packIndex ? `${code}-${p.packIndex}` : null) ||
    `${code}-${p.date || ''}-${p.timestamp || ''}`;

  const qty = safeNum(p.pieces);
  const unitWeight = getUnitWeight(code);      // kg por pe?a
  const totalWeight = unitWeight * qty;        // kg total da produ??o

  rawGlobalEvents.push({
    rawDate: p.date,
    type: 'PRODU\u00c7\u00c3O',
    id: lotId,
    movementId: p.id || '',
    code,
    desc: `${code} - ${p.productName || '-'}`,
    qty,
    unitWeight,                                // (se quiser usar depois)
    weight: totalWeight,                       // agora vem do mapa de peso
  });
});

  // EXPEDICAO PA
  safeShipping.forEach((s) => {
  const code = s.productCode || 'S/ COD';
  const logId = s.id || s.timestamp || `${code}-${s.date}-${s.quantity || 0}`;

  const qty = safeNum(s.quantity);          // quantidade expedida (pe?as)
  const unitWeight = getUnitWeight(code);   // kg por pe?a, vindo do PESO_UNITARIO_PA
  const totalWeight = unitWeight * qty;     // peso total expedido

  rawGlobalEvents.push({
    rawDate: s.date,
    type: 'EXPEDI\u00c7\u00c3O',
    id: logId,
    movementId: s.id || '',
    code,
    desc: `${code} - ${s.productName || '-'}`,
    qty,
    unitWeight,                             // se quiser ver no detalhe depois
    weight: totalWeight,                    // agora com valor correto
  });
});

  // ---- AGRUPAMENTO POR DIA + TIPO ----
  const stats = { entradaKg: 0, corteKg: 0, prodPcs: 0, expPcs: 0 };
  const globalGroupsMap = {};

  rawGlobalEvents.forEach((e) => {
    if (!e.rawDate) return;

    const iso = toISODate(e.rawDate);
    if (iso < reportStartDate || iso > reportEndDate) return;

    const typeKey = normalizeTypeKey(e.type);
    const displayType =
      typeKey == 'PRODUCAO'
        ? 'PRODU\u00c7\u00c3O'
        : typeKey == 'EXPEDICAO'
          ? 'EXPEDI\u00c7\u00c3O'
          : e.type;

    if (reportSearch) {
      const term = reportSearch.toLowerCase();
      const text = (
        String(e.id) +
        String(e.desc) +
        String(e.type)
      ).toLowerCase();
      if (!text.includes(term)) return;
    }

    const key = `${iso}|${typeKey}`;

    if (!globalGroupsMap[key]) {
      globalGroupsMap[key] = {
        date: e.rawDate,
        isoDate: iso,
        type: displayType,
        events: [],
        totalQty: 0,
        totalWeight: 0,
      };
    }

    const group = globalGroupsMap[key];
    group.events.push(e);
    group.totalQty += e.qty;
    group.totalWeight += e.weight;

    if (typeKey === 'ENTRADA MP') stats.entradaKg += e.weight;
    if (typeKey === 'CORTE') stats.corteKg += e.weight;
    if (typeKey === 'PRODUCAO') stats.prodPcs += e.qty;
    if (typeKey === 'EXPEDICAO') stats.expPcs += e.qty;
  });

  // Lista final, agrupada e ORDENADA (mais recente primeiro)
  const globalTimeline = Object.values(globalGroupsMap).sort(
    (a, b) => b.isoDate.localeCompare(a.isoDate)
  );

  const handleExportGlobalTimeline = () => {
    const data = globalTimeline.flatMap((group) =>
      group.events.map((e) => {
        const typeKey = normalizeTypeKey(group.type);
        return {
          Data: group.date,
          Tipo: group.type,
          MovimentoId: e.movementId || e.id || '',
          LoteId: typeKey === 'PRODUCAO' ? e.id || '' : '',
          Codigo: e.code || '',
          Descricao: e.desc || '',
          Qtd: e.qty,
          Peso: e.weight,
        };
      })
    );
    exportToCSV(data, `relatorio_global`);
  };


  // =================================================================================
  // 4. RESUMO ESTOQUE PA (ESTOQUE + EXPEDICAO NO PERIODO)
  // =================================================================================
  const productCatalogByCode = (productCatalog || []).reduce((acc, item) => {
    const code = normalizeCode(item?.code);
    if (code) acc[code] = item;
    return acc;
  }, {});

  const estoquePerfilByCode = (ESTOQUE_PERFIL_CONSOLIDADO || []).reduce(
    (acc, item) => {
      const code = normalizeCode(item?.code);
      if (code) acc[code] = item;
      return acc;
    },
    {}
  );

  const b2StockByCode = safeChild.reduce((acc, item) => {
    if (item?.status !== 'stock') return acc;
    const code = normalizeCode(item?.b2Code);
    if (!code) return acc;
    if (!acc[code]) acc[code] = { weight: 0, count: 0 };
    const weight = Number(item?.remainingWeight ?? item?.weight) || 0;
    acc[code].weight += weight;
    acc[code].count += 1;
    return acc;
  }, {});

  const productSummaryMap = {};

  const ensureProductSummary = (code, name) => {
    const safeCode = normalizeCode(code) || 'S/ COD';
    if (!productSummaryMap[safeCode]) {
      productSummaryMap[safeCode] = {
        code: safeCode,
        name: name || productCatalogByCode[safeCode]?.name || '-',
        producedQty: 0,
        producedWeight: 0,
        shippedQtyTotal: 0,
        shippedWeightTotal: 0,
        periodShippedQty: 0,
        periodShippedWeight: 0,
        producedItems: [],
        shippedItems: [],
        stockItems: [],
      };
    } else if (name && productSummaryMap[safeCode].name === '-') {
      productSummaryMap[safeCode].name = name;
    }
    return productSummaryMap[safeCode];
  };

  safeProd.forEach((lot) => {
    const code = normalizeCode(lot?.productCode) || 'S/ COD';
    const name = lot?.productName || productCatalogByCode[code]?.name || '-';
    const pieces = safeNum(lot?.pieces);
    const unitWeight = getUnitWeight(code);
    const weight = unitWeight * pieces;

    const product = ensureProductSummary(code, name);
    product.producedQty += pieces;
    product.producedWeight += weight;
    product.producedItems.push({
      id: lot?.batchId || lot?.lotId || lot?.id || '-',
      date: lot?.date || '-',
      motherCode: lot?.motherCode || lot?.motherCoilCode || '-',
      pieces,
      unitWeight,
      weight,
      timestamp: lot?.timestamp ?? getTimestamp(lot?.date),
    });
  });

  safeShipping.forEach((log) => {
    const code = normalizeCode(log?.productCode) || 'S/ COD';
    const name = log?.productName || productCatalogByCode[code]?.name || '-';
    const qty = safeNum(log?.quantity);
    const unitWeight = getUnitWeight(code);
    const weight = unitWeight * qty;

    const product = ensureProductSummary(code, name);
    product.shippedQtyTotal += qty;
    product.shippedWeightTotal += weight;

    if (log?.date) {
      const d = toISODate(log.date);
      if (d >= reportStartDate && d <= reportEndDate) {
        product.periodShippedQty += qty;
        product.periodShippedWeight += weight;
        product.shippedItems.push({
          id: log?.id || '',
          date: log?.date || '-',
          destination: log?.destination || '-',
          quantity: qty,
          weight,
          timestamp: getTimestamp(log?.date),
        });
      }
    }
  });

  Object.values(productSummaryMap).forEach((product) => {
    const produced = Array.isArray(product.producedItems)
      ? [...product.producedItems]
      : [];
    produced.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let remainingToShip = Number(product.shippedQtyTotal) || 0;
    const stockItems = [];

    produced.forEach((batch) => {
      const batchPieces = Number(batch.pieces) || 0;
      if (batchPieces <= 0) return;

      if (remainingToShip >= batchPieces) {
        remainingToShip -= batchPieces;
        return;
      }

      const remainingPieces = Math.max(0, batchPieces - remainingToShip);
      remainingToShip = 0;

      if (remainingPieces > 0) {
        stockItems.push({
          id: batch.id,
          date: batch.date,
          origin: batch.motherCode || '-',
          quantity: remainingPieces,
          weight: remainingPieces * (Number(batch.unitWeight) || 0),
          status: 'ESTOQUE',
          destination: '-',
          timestamp: batch.timestamp || 0,
        });
      }
    });

    product.stockItems = stockItems;
  });

  const prodSummaryList = Object.values(productSummaryMap)
    .map((item) => {
      const stockQty = Math.max(0, item.producedQty - item.shippedQtyTotal);
      const stockWeight = Math.max(0, item.producedWeight - item.shippedWeightTotal);
      const plan = estoquePerfilByCode[normalizeCode(item.code)];
      const catalog = productCatalogByCode[normalizeCode(item.code)];
      const b2Code = catalog?.b2Code || '';
      const b2Name = catalog?.b2Name || '';
      const b2Stock = b2Code ? b2StockByCode[normalizeCode(b2Code)] : null;
      const dailyKg = Number(plan?.dailyKg) || 0;
      const rawMaxKg = Number(plan?.maxKg) || 0;
      const maxKg = rawMaxKg > 0 && dailyKg > 0
        ? Math.min(rawMaxKg, dailyKg * 60)
        : rawMaxKg;
      const suggestionKg = maxKg > 0 ? Math.max(0, maxKg - stockWeight) : 0;
      const unitWeight = getUnitWeight(item.code);
      const suggestionPcs =
        suggestionKg > 0 && unitWeight > 0
          ? Math.ceil(suggestionKg / unitWeight)
          : 0;
      return {
        ...item,
        stockQty,
        stockWeight,
        dailyKg,
        maxKg,
        suggestionKg,
        suggestionPcs,
        b2Code,
        b2Name,
        b2StockWeight: b2Stock?.weight || 0,
        b2StockCount: b2Stock?.count || 0,
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const filteredProdSummaryList = prodSummaryList.filter((item) => {
    if (!reportSearch) return true;
    const term = reportSearch.toLowerCase();
    return (
      String(item.code).toLowerCase().includes(term) ||
      String(item.name || '').toLowerCase().includes(term)
    );
  });

  const totalStockQty = filteredProdSummaryList.reduce(
    (acc, item) => acc + (Number(item.stockQty) || 0),
    0
  );
  const totalStockWeight = filteredProdSummaryList.reduce(
    (acc, item) => acc + (Number(item.stockWeight) || 0),
    0
  );
  const totalPeriodShippedQty = filteredProdSummaryList.reduce(
    (acc, item) => acc + (Number(item.periodShippedQty) || 0),
    0
  );
  const totalPeriodShippedWeight = filteredProdSummaryList.reduce(
    (acc, item) => acc + (Number(item.periodShippedWeight) || 0),
    0
  );

  const periodDays = (() => {
    const start = reportStartDate ? new Date(`${reportStartDate}T00:00:00`) : null;
    const end = reportEndDate ? new Date(`${reportEndDate}T00:00:00`) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    const diff = Math.floor((end - start) / 86400000) + 1;
    return Math.max(1, diff);
  })();

  const formatNum = (value, digits = 0) =>
    Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });

  const avgEntradaKg = stats.entradaKg / periodDays;
  const avgCorteKg = stats.corteKg / periodDays;
  const avgProdPcs = stats.prodPcs / periodDays;
  const avgExpPcs = stats.expPcs / periodDays;
  const saldoMpPeriodo = stats.entradaKg - stats.corteKg;
  const expVsProdPct = stats.prodPcs > 0 ? (stats.expPcs / stats.prodPcs) * 100 : 0;

  const parseDateTime = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const [datePart, timePart] = value.split(' ');
      if (datePart && datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          const iso = `${yyyy}-${mm}-${dd}${timePart ? `T${timePart}` : ''}`;
          const parsed = new Date(iso);
          if (!Number.isNaN(parsed.getTime())) return parsed;
        }
      }
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const toISOFromValue = (value) => {
    const parsed = parseDateTime(value);
    if (!parsed) return '0000-00-00';
    return parsed.toISOString().slice(0, 10);
  };

  const toDays = (ms) => ms / 86400000;

  const motherEntryByCode = safeMother.reduce((acc, item) => {
    const code = normalizeCode(item?.code);
    if (!code) return acc;
    const entry = parseDateTime(item?.entryDate || item?.date);
    if (!entry) return acc;
    if (!acc[code]) acc[code] = [];
    acc[code].push(entry.getTime());
    return acc;
  }, {});

  Object.values(motherEntryByCode).forEach((list) => list.sort((a, b) => a - b));

  const leadMpToCut = [];
  safeCutting.forEach((cut) => {
    const cutDate = parseDateTime(cut?.date || cut?.timestamp);
    if (!cutDate) return;
    const iso = toISOFromValue(cut?.date || cut?.timestamp);
    if (iso < reportStartDate || iso > reportEndDate) return;
    const code = normalizeCode(cut?.motherCode);
    const entries = motherEntryByCode[code];
    if (!entries || !entries.length) return;
    const cutMs = cutDate.getTime();
    let chosen = null;
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i] <= cutMs) {
        chosen = entries[i];
        break;
      }
    }
    if (chosen == null) return;
    const delta = cutMs - chosen;
    if (delta >= 0) leadMpToCut.push(delta);
  });

  const childById = safeChild.reduce((acc, item) => {
    if (item?.id) acc[String(item.id)] = item;
    return acc;
  }, {});

  const leadCutToProd = [];
  safeProd.forEach((prod) => {
    const prodDate = parseDateTime(prod?.date || prod?.timestamp);
    if (!prodDate) return;
    const iso = toISOFromValue(prod?.date || prod?.timestamp);
    if (iso < reportStartDate || iso > reportEndDate) return;
    const prodMs = prodDate.getTime();
    const childIds = Array.isArray(prod?.childIds) ? prod.childIds : [];
    childIds.forEach((childId) => {
      const child = childById[String(childId)];
      const created = parseDateTime(child?.createdAt || child?.date || child?.entryDate);
      if (!created) return;
      const delta = prodMs - created.getTime();
      if (delta >= 0) leadCutToProd.push(delta);
    });
  });

  const prodTimesByCode = safeProd.reduce((acc, item) => {
    const code = normalizeCode(item?.productCode);
    if (!code) return acc;
    const time = parseDateTime(item?.date || item?.timestamp);
    if (!time) return acc;
    if (!acc[code]) acc[code] = [];
    acc[code].push(time.getTime());
    return acc;
  }, {});

  Object.values(prodTimesByCode).forEach((list) => list.sort((a, b) => a - b));

  const leadProdToShip = [];
  safeShipping.forEach((ship) => {
    const shipDate = parseDateTime(ship?.date || ship?.timestamp);
    if (!shipDate) return;
    const iso = toISOFromValue(ship?.date || ship?.timestamp);
    if (iso < reportStartDate || iso > reportEndDate) return;
    const code = normalizeCode(ship?.productCode);
    const list = prodTimesByCode[code];
    if (!list || !list.length) return;
    const shipMs = shipDate.getTime();
    let chosen = null;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i] <= shipMs) {
        chosen = list[i];
        break;
      }
    }
    if (chosen == null) return;
    const delta = shipMs - chosen;
    if (delta >= 0) leadProdToShip.push(delta);
  });

  const avgLeadMpToCut = leadMpToCut.length
    ? toDays(leadMpToCut.reduce((acc, v) => acc + v, 0) / leadMpToCut.length)
    : 0;
  const avgLeadCutToProd = leadCutToProd.length
    ? toDays(leadCutToProd.reduce((acc, v) => acc + v, 0) / leadCutToProd.length)
    : 0;
  const avgLeadProdToShip = leadProdToShip.length
    ? toDays(leadProdToShip.reduce((acc, v) => acc + v, 0) / leadProdToShip.length)
    : 0;

  const mpNoMovement = mpSummaryList
    .filter((item) => (Number(item.finalBalance) || 0) > 0 && (Number(item.periodIn) || 0) === 0 && (Number(item.periodOut) || 0) === 0)
    .slice()
    .sort((a, b) => (Number(b.finalBalance) || 0) - (Number(a.finalBalance) || 0))
    .slice(0, 5)
    .map((item) => ({
      title: `${item.code} - ${item.desc || '-'}`,
      subtitle: item.width ? `${item.width} mm` : null,
      value: `${formatNum(item.finalBalance, 1)} kg`,
    }));

  const paOverstock = filteredProdSummaryList
    .filter((item) => (Number(item.maxKg) || 0) > 0 && (Number(item.stockWeight) || 0) > (Number(item.maxKg) || 0))
    .slice()
    .sort((a, b) => (Number(b.stockWeight) || 0) - (Number(a.stockWeight) || 0))
    .slice(0, 5)
    .map((item) => ({
      title: `${item.code} - ${item.name || '-'}`,
      subtitle: `Excesso: ${formatNum((Number(item.stockWeight) || 0) - (Number(item.maxKg) || 0), 1)} kg`,
      value: `${formatNum(item.stockWeight, 1)} / ${formatNum(item.maxKg, 1)} kg`,
    }));

  const b2LowStock = filteredProdSummaryList
    .filter((item) => item.b2Code && (Number(item.b2StockWeight) || 0) <= 0 && ((Number(item.periodShippedQty) || 0) > 0 || (Number(item.producedQty) || 0) > 0))
    .slice()
    .sort((a, b) => (Number(b.periodShippedWeight) || 0) - (Number(a.periodShippedWeight) || 0))
    .slice(0, 5)
    .map((item) => ({
      title: `${item.b2Code} - ${item.b2Name || '-'}`,
      subtitle: `${item.code} - ${item.name || '-'}`,
      value: 'Estoque 0',
    }));

  const slitterPeriodCuts = safeCutting.filter((cut) => {
    const iso = toISOFromValue(cut?.date || cut?.timestamp);
    return iso >= reportStartDate && iso <= reportEndDate;
  });

  const slitterTotals = slitterPeriodCuts.reduce(
    (acc, cut) => {
      acc.cuts += 1;
      acc.inputKg += Number(cut?.inputWeight) || 0;
      acc.scrapKg += Number(cut?.scrap ?? cut?.scrapWeight ?? 0) || 0;
      acc.outputCount += Number(cut?.outputCount) || 0;
      return acc;
    },
    { cuts: 0, inputKg: 0, scrapKg: 0, outputCount: 0 },
  );

  const slitterYieldPct =
    slitterTotals.inputKg > 0
      ? ((slitterTotals.inputKg - slitterTotals.scrapKg) / slitterTotals.inputKg) * 100
      : 0;

  const slitterScrapPct =
    slitterTotals.inputKg > 0
      ? (slitterTotals.scrapKg / slitterTotals.inputKg) * 100
      : 0;

  const slitterByMother = slitterPeriodCuts.reduce((acc, cut) => {
    const code = String(cut?.motherCode || 'S/ COD');
    if (!acc[code]) {
      acc[code] = {
        code,
        material: cut?.motherMaterial || '-',
        cuts: 0,
        inputKg: 0,
        outputCount: 0,
        scrapKg: 0,
      };
    }
    acc[code].cuts += 1;
    acc[code].inputKg += Number(cut?.inputWeight) || 0;
    acc[code].outputCount += Number(cut?.outputCount) || 0;
    acc[code].scrapKg += Number(cut?.scrap ?? cut?.scrapWeight ?? 0) || 0;
    return acc;
  }, {});

  const topSlitterByKg = Object.values(slitterByMother)
    .sort((a, b) => b.inputKg - a.inputKg)
    .slice(0, 5)
    .map((item) => ({
      title: `${item.code} - ${item.material || '-'}`,
      subtitle: `${formatNum(item.cuts)} cortes | ${formatNum(item.outputCount)} tiras`,
      value: `${formatNum(item.inputKg, 1)} kg`,
    }));

  const topSlitterByCuts = Object.values(slitterByMother)
    .sort((a, b) => b.cuts - a.cuts)
    .slice(0, 5)
    .map((item) => ({
      title: `${item.code} - ${item.material || '-'}`,
      subtitle: `${formatNum(item.outputCount)} tiras`,
      value: `${formatNum(item.cuts)} cortes`,
    }));

  const topSlitterScrap = slitterPeriodCuts
    .slice()
    .sort((a, b) => (Number(b.scrap ?? b.scrapWeight ?? 0) || 0) - (Number(a.scrap ?? a.scrapWeight ?? 0) || 0))
    .slice(0, 5)
    .map((cut) => ({
      title: `${cut?.motherCode || '-'} - ${cut?.motherMaterial || '-'}`,
      subtitle: `${formatNum(cut?.outputCount || 0)} tiras`,
      value: `${formatNum(cut?.scrap ?? cut?.scrapWeight ?? 0, 1)} kg`,
    }));

  const slitterByDay = slitterPeriodCuts.reduce((acc, cut) => {
    const key = toISOFromValue(cut?.date || cut?.timestamp);
    if (!acc[key]) acc[key] = { date: cut?.date || key, inputKg: 0, cuts: 0 };
    acc[key].inputKg += Number(cut?.inputWeight) || 0;
    acc[key].cuts += 1;
    return acc;
  }, {});

  const topSlitterDays = Object.values(slitterByDay)
    .sort((a, b) => b.inputKg - a.inputKg)
    .slice(0, 5)
    .map((item) => ({
      title: item.date,
      subtitle: `${formatNum(item.cuts)} cortes`,
      value: `${formatNum(item.inputKg, 1)} kg`,
    }));

  const topShippedProducts = filteredProdSummaryList
    .filter((item) => (Number(item.periodShippedWeight) || 0) > 0)
    .slice()
    .sort((a, b) => (Number(b.periodShippedWeight) || 0) - (Number(a.periodShippedWeight) || 0))
    .slice(0, 5)
    .map((item) => ({
      code: item.code,
      title: `${item.code} - ${item.name || '-'}`,
      subtitle: `${formatNum(item.periodShippedQty)} pcs`,
      value: `${formatNum(item.periodShippedWeight, 1)} kg`,
    }));

  const topStockProducts = filteredProdSummaryList
    .filter((item) => (Number(item.stockWeight) || 0) > 0)
    .slice()
    .sort((a, b) => (Number(b.stockWeight) || 0) - (Number(a.stockWeight) || 0))
    .slice(0, 5)
    .map((item) => ({
      code: item.code,
      title: `${item.code} - ${item.name || '-'}`,
      subtitle: `${formatNum(item.stockQty)} pcs`,
      value: `${formatNum(item.stockWeight, 1)} kg`,
    }));

  const topMpConsumption = mpSummaryList
    .filter((item) => (Number(item.periodOut) || 0) > 0)
    .slice()
    .sort((a, b) => (Number(b.periodOut) || 0) - (Number(a.periodOut) || 0))
    .slice(0, 5)
    .map((item) => ({
      code: item.code,
      title: `${item.code} - ${item.desc || '-'}`,
      subtitle: item.width ? `${item.width} mm` : null,
      value: `${formatNum(item.periodOut, 1)} kg`,
    }));

  const topDays = (() => {
    const dayTotals = {};
    globalTimeline.forEach((group) => {
      const key = group.isoDate || toISODate(group.date);
      if (!dayTotals[key]) {
        dayTotals[key] = { date: group.date || key, weight: 0, qty: 0 };
      }
      dayTotals[key].weight += Number(group.totalWeight) || 0;
      dayTotals[key].qty += Number(group.totalQty) || 0;
    });
    return Object.values(dayTotals)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((item) => ({
        date: item.date,
        title: item.date,
        subtitle: `${formatNum(item.qty)} itens`,
        value: `${formatNum(item.weight, 1)} kg`,
      }));
  })();


// =================================================================================
  // 5. RENDERIZAÇÃO
  // =================================================================================
  return (
    <div className="space-y-6 h-full flex flex-col">
      <ReportTabs viewMode={reportViewMode} setViewMode={setReportViewMode} />

      <ReportFilters
        startDate={reportStartDate}
        endDate={reportEndDate}
        search={reportSearch}
        onStartDateChange={setReportStartDate}
        onEndDateChange={setReportEndDate}
        onSearchChange={setReportSearch}
      />

      {/* ABA 1: GLOBAL */}
      {reportViewMode === 'GLOBAL' && (
        <>
          <GlobalStatsSummary stats={stats} />
          <GlobalTimelineOverview
            timeline={globalTimeline}
            onExport={handleExportGlobalTimeline}
            onViewDetail={handleGlobalDetail}
            getTypeColor={getTypeColor}
          />
        </>
      )}

      {reportViewMode === 'INSIGHTS' && (
        <div className="space-y-6">
          <Card className="border-t-4 border-amber-500">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-amber-100">Insights do Período</h3>
              <p className="text-sm text-amber-200/70">
                Panorama do que foi realizado entre {reportStartDate || '-'} e {reportEndDate || '-'}.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <InsightCard
                title="Saldo MP no período"
                value={formatKg(saldoMpPeriodo)}
                sub={`${formatNum(periodDays)} dias`}
                tooltip="Entrada de MP menos consumo no Slitter no período."
              />
              <InsightCard
                title="Entrada média/dia"
                value={`${formatNum(avgEntradaKg, 0)} kg`}
                sub="MP recebida"
                tooltip="Média diária de entrada de matéria-prima no período."
              />
              <InsightCard
                title="Consumo médio/dia"
                value={`${formatNum(avgCorteKg, 0)} kg`}
                sub="Slitter"
                tooltip="Média diária de kg consumidos no Slitter no período."
              />
              <InsightCard
                title="Expedição vs Produção"
                value={`${formatNum(expVsProdPct, 0)}%`}
                sub="pcs expedidas"
                tooltip="Percentual de peças expedidas sobre as produzidas no período."
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              <InsightCard
                title="Lead time MP → Corte"
                value={`${formatNum(avgLeadMpToCut, 1)} dias`}
                sub={`${leadMpToCut.length} registros`}
                accent="text-sky-300"
                tooltip="Média de dias entre entrada da MP e registro do corte."
              />
              <InsightCard
                title="Lead time Corte → Produção"
                value={`${formatNum(avgLeadCutToProd, 1)} dias`}
                sub={`${leadCutToProd.length} registros`}
                accent="text-indigo-300"
                tooltip="Média de dias entre criação da B2 e produção de PA."
              />
              <InsightCard
                title="Lead time Produção → Expedição"
                value={`${formatNum(avgLeadProdToShip, 1)} dias`}
                sub={`${leadProdToShip.length} registros`}
                accent="text-emerald-300"
                tooltip="Média de dias entre produção de PA e expedição."
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InsightList title="Top produtos expedidos" valueLabel="kg" items={topShippedProducts} />
            <InsightList title="Top estoque PA" valueLabel="kg" items={topStockProducts} />
            <InsightList title="Top consumo de MP" valueLabel="kg" items={topMpConsumption} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightList title="Dias com maior movimento" valueLabel="kg" items={topDays} />
            <Card className="bg-gray-800/60 border border-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-200 mb-3">Resumo rápido</h4>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase">Produção no período</p>
                  <p className="text-base font-bold text-emerald-300">{formatNum(stats.prodPcs)} pcs</p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase">Expedição no período</p>
                  <p className="text-base font-bold text-amber-300">{formatNum(stats.expPcs)} pcs</p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase">Produção média/dia</p>
                  <p className="text-base font-bold text-emerald-300">{formatNum(avgProdPcs)} pcs</p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase">Expedição média/dia</p>
                  <p className="text-base font-bold text-amber-300">{formatNum(avgExpPcs)} pcs</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InsightList title="Alertas: MP sem movimento" valueLabel="kg" items={mpNoMovement} />
            <InsightList title="Alertas: PA acima da meta" valueLabel="kg" items={paOverstock} />
            <InsightList title="Alertas: B2 sem estoque" valueLabel="status" items={b2LowStock} />
          </div>

          <Card className="border-t-4 border-sky-500">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold text-sky-100">Slitter em detalhes</h3>
              <p className="text-sm text-sky-200/70">
                Indicadores de corte no período selecionado.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-6">
              <InsightCard
                title="Cortes"
                value={formatNum(slitterTotals.cuts)}
                sub="registros"
                accent="text-sky-300"
                tooltip="Quantidade total de cortes registrados no período."
              />
              <InsightCard
                title="Kg cortado"
                value={`${formatNum(slitterTotals.inputKg, 1)} kg`}
                sub="MP consumida"
                accent="text-sky-300"
                tooltip="Soma do peso de MP consumida em cortes no período."
              />
              <InsightCard
                title="Sucata"
                value={`${formatNum(slitterTotals.scrapKg, 1)} kg`}
                sub={`${formatNum(slitterScrapPct, 1)}%`}
                accent="text-rose-300"
                tooltip="Peso e percentual de sucata gerada nos cortes."
              />
              <InsightCard
                title="Rendimento"
                value={`${formatNum(slitterYieldPct, 1)}%`}
                sub="aproveitamento"
                accent="text-emerald-300"
                tooltip="Percentual de aproveitamento: (kg cortado - sucata) / kg cortado."
              />
              <InsightCard
                title="Tiras"
                value={formatNum(slitterTotals.outputCount)}
                sub="total"
                accent="text-indigo-300"
                tooltip="Total de tiras geradas nos cortes do período."
              />
              <InsightCard
                title="Kg por corte"
                value={`${formatNum(slitterTotals.cuts ? slitterTotals.inputKg / slitterTotals.cuts : 0, 1)} kg`}
                sub="média"
                accent="text-amber-300"
                tooltip="Média de kg consumidos por corte no período."
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              <InsightList title="Top cortes por bobina mãe (kg)" valueLabel="kg" items={topSlitterByKg} />
              <InsightList title="Top cortes por quantidade" valueLabel="cortes" items={topSlitterByCuts} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <InsightList title="Cortes com maior sucata" valueLabel="kg" items={topSlitterScrap} />
              <InsightList title="Dias com maior corte" valueLabel="kg" items={topSlitterDays} />
            </div>
          </Card>
        </div>
      )}

      {/* ABA 2: EXTRATO MP */}
      {reportViewMode === 'MP_KARDEX' && (
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-emerald-600">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-emerald-900/10 -mt-6 -mx-6">
            <div>
              <h3 className="font-bold text-xl text-emerald-100">
                Extrato MP
              </h3>
              <p className="text-sm text-emerald-300/70">Auditoria de Estoque</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  handleGenerateMPReportPDF(
                    mpSummaryList,
                    reportStartDate,
                    reportEndDate
                  )
                }
                className="h-9 bg-rose-600 text-white hover:bg-rose-500"
              >
                <FileText size={14} /> PDF
              </Button>
              <Button
                onClick={() => {
                  const analyticalData = [];
                  mpSummaryList.forEach((item) => {
                    item.movements.forEach((mov) => {
                      analyticalData.push({
                        Código: item.code,
                        Descrição: item.desc,
                        'Largura (mm)': item.width ?? '',
                        Data: mov.date,
                        Tipo: mov.type,
                        'Detalhe/NF': mov.detail,
                        'Entrada (kg)':
                          mov.type === 'ENTRADA' ? mov.weightChange : 0,
                        'Saída (kg)':
                          mov.type !== 'ENTRADA'
                            ? Math.abs(mov.weightChange)
                            : 0,
                      });
                    });
                  });
                  exportToCSV(analyticalData, `relatorio_analitico_mp`);
                }}
                className="h-9 bg-blue-600 text-white hover:bg-blue-500"
              >
                <Download size={14} /> Detalhado
              </Button>
              <Button
                onClick={() => {
                  const data = mpSummaryList.map((i) => ({
                    Código: i.code,
                    Descrição: i.desc,
                    'Largura (mm)': i.width ?? '',
                    'Saldo Anterior (kg)': i.initialBalance,
                    'Entradas (kg)': i.periodIn,
                    'Saídas (kg)': i.periodOut,
                    'Saldo Atual (kg)': i.finalBalance,
                  }));
                  exportToCSV(data, `extrato_mp_saldos`);
                }}
                className="h-9 bg-emerald-600 text-white"
              >
                <Download size={14} /> Saldos
              </Button>
            </div>
          </div>
          



          <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-800 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Largura (mm)</th>
                  <th className="p-3 text-right text-gray-400 bg-gray-900/50">
                    Saldo Ant.
                  </th>
                  <th className="p-3 text-right text-emerald-400">Entradas</th>
                  <th className="p-3 text-right text-red-400">Saídas</th>
                  <th className="p-3 text-right text-white font-bold bg-blue-900/40 border-l border-blue-700">
                    Saldo Atual
                  </th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {mpSummaryList
                  .filter((i) => {
                    if (!reportSearch) return true;
                    const term = reportSearch.toLowerCase();
                    return (
                      i.code.toLowerCase().includes(term) ||
                      String(i.desc || '')
                        .toLowerCase()
                        .includes(term) ||
                      (i.width != null &&
                        String(i.width).toLowerCase().includes(term))
                    );
                  })
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      <td className="p-3 font-bold text-white">{row.code}</td>
                      <td className="p-3 text-gray-400 truncate max-w-[220px]">
                        {row.desc}
                      </td>
                      <td className="p-3 text-right text-gray-300 font-mono">
                        {row.width != null ? row.width : '-'}
                      </td>
                      <td className="p-3 text-right text-gray-300 font-mono bg-gray-900/30">
                        {row.initialBalance.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-mono">
                        {row.periodIn.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right text-red-400 font-mono">
                        {row.periodOut.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right font-bold text-white font-mono bg-blue-900/20 border-l border-gray-700">
                        {row.finalBalance.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setViewingMpDetails({
                              ...row,
                              initialBalance: row.initialBalance,
                            })
                          }
                          className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 3: ESTOQUE PA */}
      {reportViewMode === 'PROD_SUMMARY' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-emerald-900/20 border-emerald-500/30 py-3 px-4">
              <span className="text-xs text-emerald-400 font-bold uppercase">
                Saldo em Estoque
              </span>
              <div className="text-2xl font-bold text-white">
                {totalStockWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                <span className="text-sm font-normal text-gray-400">kg</span>
              </div>
            </Card>
            <Card className="bg-gray-700/20 border-gray-600/30 py-3 px-4">
              <span className="text-xs text-gray-400 font-bold uppercase">
                Total Baixado (Filtrado)
              </span>
              <div className="text-2xl font-bold text-emerald-400">
                {totalPeriodShippedWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                <span className="text-sm font-normal text-gray-500">kg</span>
              </div>
            </Card>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-purple-600">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-purple-900/10 -mt-6 -mx-6">
              <div>
                <h3 className="font-bold text-xl text-purple-100">Estoque PA</h3>
                <p className="text-sm text-purple-300/70">
                  Saldo atual e baixado no periodo
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowProdSuggestionModal(true)}
                  className="h-9 bg-emerald-600 text-white"
                >
                  Sugestoes
                </Button>
                <Button
                  onClick={() => {
                    const safeList = Array.isArray(filteredProdSummaryList)
                      ? filteredProdSummaryList
                      : [];

                    const data = safeList.map((i) => ({
                      Produto: i.name ?? '',
                      Codigo: i.code ?? '',
                      'Saldo (pcs)': Number(i.stockQty) || 0,
                      'Peso Estoque (kg)': Number(i.stockWeight) || 0,
                      'Baixado (pcs)': Number(i.periodShippedQty) || 0,
                      'Peso Baixado (kg)': Number(i.periodShippedWeight) || 0,
                      'Demanda (kg/dia)': Number(i.dailyKg) || 0,
                      'Estoque Max (kg)': Number(i.maxKg) || 0,
                      'Sugestao (kg)': Number(i.suggestionKg) || 0,
                      'Sugestao (pcs)': Number(i.suggestionPcs) || 0,
                      'B2 Codigo': i.b2Code ?? '',
                      'B2 Descricao': i.b2Name ?? '',
                      'Saldo B2 (kg)': Number(i.b2StockWeight) || 0,
                    }));

                    exportToExcelXml(
                      [{ name: 'Estoque PA', rows: data }],
                      'estoque_pa'
                    );
                  }}
                  className="h-9 bg-purple-600 text-white"
                >
                  <Download size={14} /> Excel
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 z-10 uppercase text-xs">
                  <tr>
                    <th className="p-4">Codigo</th>
                    <th className="p-4">Descricao</th>
                    <th className="p-4 text-center">Pcs</th>
                    <th className="p-4 text-right text-emerald-400">Peso Estoque</th>
                    <th className="p-4 text-right text-gray-500">Peso Baixado</th>
                    <th className="p-4 text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {(Array.isArray(filteredProdSummaryList)
                    ? filteredProdSummaryList
                    : []
                  ).map((row, idx) => {
                    const stockQty = Number(row.stockQty) || 0;
                    const stockWeight = Number(row.stockWeight) || 0;
                    const periodWeight = Number(row.periodShippedWeight) || 0;
                    const isExpanded = expandedProdSummaryCode === row.code;
                    const dailyKg = Number(row.dailyKg) || 0;
                    const maxKg = Number(row.maxKg) || 0;
                    const daysCoverage =
                      dailyKg > 0 ? (Number(row.stockWeight) || 0) / dailyKg : 0;
                    const coverageLabel =
                      dailyKg <= 0
                        ? 'SEM DEMANDA'
                        : daysCoverage >= 60
                          ? '2M+'
                          : daysCoverage >= 30
                            ? '30-59d'
                            : '<30d';
                    const coverageClass =
                      dailyKg <= 0
                        ? 'text-gray-400 bg-gray-700/40 border-gray-600/40'
                        : daysCoverage >= 60
                          ? 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40'
                          : daysCoverage >= 30
                            ? 'text-amber-300 bg-amber-900/30 border-amber-700/40'
                            : 'text-red-400 bg-red-900/30 border-red-700/40';
                    const suggestionKg = Number(row.suggestionKg) || 0;
                    const shippedDetails = Array.isArray(row.shippedItems)
                      ? row.shippedItems.map((item) => ({
                          ...item,
                          origin: '-',
                          status: 'BAIXADO',
                        }))
                      : [];
                    const stockDetails = Array.isArray(row.stockItems)
                      ? row.stockItems
                      : [];
                    const details = [...stockDetails, ...shippedDetails].sort(
                      (a, b) => {
                        const statusA = a.status === 'ESTOQUE' ? 0 : 1;
                        const statusB = b.status === 'ESTOQUE' ? 0 : 1;
                        if (statusA !== statusB) return statusA - statusB;
                        return (b.timestamp || 0) - (a.timestamp || 0);
                      }
                    );

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          className={`hover:bg-gray-700/50 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-purple-900/20 border-l-4 border-purple-500' : ''
                          }`}
                          onClick={() =>
                            setExpandedProdSummaryCode(isExpanded ? null : row.code)
                          }
                        >
                          <td className="p-4 font-bold text-white font-mono text-base">
                            {row.code ?? '-'}
                          </td>
                          <td className="p-4 text-gray-300 font-medium">
                            <div className="text-gray-300 font-medium">
                              {row.name ?? '-'}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {dailyKg > 0
                                ? `Demanda: ${dailyKg.toLocaleString('pt-BR', {
                                    maximumFractionDigits: 1,
                                  })} kg/dia`
                                : 'Demanda: -'}
                              {' · '}
                              {maxKg > 0
                                ? `Max: ${maxKg.toLocaleString('pt-BR', {
                                    maximumFractionDigits: 0,
                                  })} kg`
                                : 'Max: -'}
                              {' · '}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${coverageClass}`}
                              >
                                {coverageLabel}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-gray-800 px-2 py-1 rounded text-xs font-bold border border-gray-600">
                              {stockQty.toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400 text-lg">
                            {stockWeight > 0
                              ? stockWeight.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : '-'}
                          </td>
                          <td className="p-4 text-right text-gray-500 font-mono">
                            {periodWeight > 0
                              ? periodWeight.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : '-'}
                          </td>
                          <td className="p-4 text-center text-purple-300">
                            {isExpanded ? (
                              <ChevronRight className="rotate-90 transition-transform" />
                            ) : (
                              <ChevronRight className="transition-transform" />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-gray-900/50 p-0">
                              <div className="p-4 border-t border-purple-900/50 animate-fade-in">
                                {details.length === 0 ? (
                                  <div className="text-center text-gray-500 text-sm py-4">
                                    Nenhum baixado no periodo.
                                  </div>
                                ) : (
                                  <table className="w-full text-xs text-left text-gray-400">
                                    <thead className="text-purple-300 border-b border-gray-700">
                                      <tr>
                                        <th className="pb-2">Data</th>
                                        <th className="pb-2">Origem (MP)</th>
                                        <th className="pb-2">ID Lote</th>
                                        <th className="pb-2 text-right">Qtd</th>
                                        <th className="pb-2 text-right">Peso</th>
                                        <th className="pb-2 text-center">Status</th>
                                        <th className="pb-2">Destino / Consumo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                      {details.map((item, detailIdx) => {
                                        const statusLabel = item.status || 'BAIXADO';
                                        const statusColor =
                                          statusLabel === 'ESTOQUE'
                                            ? 'text-emerald-400'
                                            : 'text-gray-500';
                                        const qty = Number(item.quantity || 0);
                                        return (
                                          <tr
                                            key={`${row.code}-${detailIdx}`}
                                            className={`hover:bg-gray-800/50 ${
                                              statusLabel === 'ESTOQUE'
                                                ? 'bg-emerald-900/10'
                                                : ''
                                            }`}
                                          >
                                            <td className="py-2">{item.date}</td>
                                            <td className="py-2">
                                              <span className="text-gray-300">
                                                {item.origin || '-'}
                                              </span>
                                            </td>
                                            <td className="py-2 font-mono text-xs text-indigo-200">
                                              {item.id || '-'}
                                            </td>
                                            <td className="py-2 text-right font-bold text-white">
                                              {qty > 0 ? qty.toLocaleString('pt-BR') : '-'}
                                            </td>
                                            <td className="py-2 text-right font-bold text-emerald-300">
                                              {Number(item.weight || 0).toLocaleString('pt-BR', {
                                                minimumFractionDigits: 1,
                                                maximumFractionDigits: 1,
                                              })}{' '}
                                              kg
                                            </td>
                                            <td className="py-2 text-center">
                                              <span className={`font-bold ${statusColor}`}>
                                                {statusLabel}
                                              </span>
                                            </td>
                                            <td className="py-2">
                                              <span className="text-gray-300">
                                                {item.destination || '-'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredProdSummaryList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Nenhum registro encontrado para os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {showProdSuggestionModal && (
        <ProductionSuggestionModal
          items={filteredProdSummaryList}
          onClose={() => setShowProdSuggestionModal(false)}
          filter={prodSuggestionFilter}
          onFilterChange={setProdSuggestionFilter}
          onExportExcel={() => {
            const safeList = Array.isArray(filteredProdSummaryList)
              ? filteredProdSummaryList
              : [];
            const sortedList = [...safeList].sort((a, b) => {
              const dailyA = Number(a.dailyKg) || 0;
              const dailyB = Number(b.dailyKg) || 0;
              const daysA = dailyA > 0 ? (Number(a.stockWeight) || 0) / dailyA : 0;
              const daysB = dailyB > 0 ? (Number(b.stockWeight) || 0) / dailyB : 0;
              return daysB - daysA;
            });

            const totalStockWeight = safeList.reduce(
              (acc, item) => acc + (Number(item.stockWeight) || 0),
              0
            );
            const totalB2Weight = safeList.reduce(
              (acc, item) => acc + (Number(item.b2StockWeight) || 0),
              0
            );
            const totalDailyKg = safeList.reduce(
              (acc, item) => acc + (Number(item.dailyKg) || 0),
              0
            );
            const daysCoverage =
              totalDailyKg > 0 ? totalStockWeight / totalDailyKg : 0;

            const summaryRows = [
              { Indicador: 'Saldo Atual (kg)', Valor: totalStockWeight },
              { Indicador: 'Saldo B2 (kg)', Valor: totalB2Weight },
              { Indicador: 'Demanda Total (kg/dia)', Valor: totalDailyKg },
              { Indicador: 'Dias em Estoque', Valor: daysCoverage },
            ];

            const data = sortedList.map((i) => ({
              Produto: i.name ?? '',
              Codigo: i.code ?? '',
              'Saldo (kg)': Number(i.stockWeight) || 0,
              'Max (kg)': Number(i.maxKg) || 0,
              'Sugestao (kg)': Number(i.suggestionKg) || 0,
              'Sugestao (pcs)': Number(i.suggestionPcs) || 0,
              'Demanda (kg/dia)': Number(i.dailyKg) || 0,
              'B2 Codigo': i.b2Code ?? '',
              'B2 Descricao': i.b2Name ?? '',
              'Saldo B2 (kg)': Number(i.b2StockWeight) || 0,
              'Dias Estoque': (() => {
                const daily = Number(i.dailyKg) || 0;
                return daily > 0 ? Number(i.stockWeight || 0) / daily : 0;
              })(),
            }));

            exportToExcelXml(
              [
                { name: 'Resumo', rows: summaryRows },
                { name: 'Sugestoes PA', rows: data },
              ],
              'sugestoes_producao'
            );
          }}
          onExportPdf={() => {
            const safeList = Array.isArray(filteredProdSummaryList)
              ? filteredProdSummaryList
              : [];
            if (!safeList.length) return;
            const sortedList = [...safeList].sort((a, b) => {
              const dailyA = Number(a.dailyKg) || 0;
              const dailyB = Number(b.dailyKg) || 0;
              const daysA = dailyA > 0 ? (Number(a.stockWeight) || 0) / dailyA : 0;
              const daysB = dailyB > 0 ? (Number(b.stockWeight) || 0) / dailyB : 0;
              return daysB - daysA;
            });

            const totalStockWeight = safeList.reduce(
              (acc, item) => acc + (Number(item.stockWeight) || 0),
              0
            );
            const totalB2Weight = safeList.reduce(
              (acc, item) => acc + (Number(item.b2StockWeight) || 0),
              0
            );
            const totalDailyKg = safeList.reduce(
              (acc, item) => acc + (Number(item.dailyKg) || 0),
              0
            );
            const daysCoverage =
              totalDailyKg > 0 ? totalStockWeight / totalDailyKg : 0;

            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(14);
            doc.text('Sugestoes de Producao', 14, 16);
            doc.setFontSize(9);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

            autoTable(doc, {
              startY: 28,
              head: [['Indicador', 'Valor']],
              body: [
                [
                  'Saldo Atual (kg)',
                  totalStockWeight.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
                ],
                [
                  'Saldo B2 (kg)',
                  totalB2Weight.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
                ],
                [
                  'Demanda Total (kg/dia)',
                  totalDailyKg.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
                ],
                [
                  'Dias em Estoque',
                  daysCoverage.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }),
                ],
              ],
              theme: 'grid',
              styles: { fontSize: 8 },
              headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
            });

            const rows = sortedList.map((i) => {
              const daily = Number(i.dailyKg) || 0;
              const days = daily > 0 ? Number(i.stockWeight || 0) / daily : 0;
              const coverageLabel =
                daily <= 0
                  ? 'SEM DEMANDA'
                  : days >= 60
                    ? '2M+'
                    : days >= 30
                      ? '30-59d'
                      : '<30d';
              return [
                i.code ?? '',
                i.name ?? '',
                Number(i.stockWeight || 0).toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                }),
                daily.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
                Number(i.maxKg || 0).toLocaleString('pt-BR', {
                  maximumFractionDigits: 0,
                }),
                Number(i.suggestionKg || 0).toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                }),
                Number(i.suggestionPcs || 0).toLocaleString('pt-BR'),
                i.b2Code ?? '',
                Number(i.b2StockWeight || 0).toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                }),
                days.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
                coverageLabel,
              ];
            });

            autoTable(doc, {
              startY: doc.lastAutoTable?.finalY
                ? doc.lastAutoTable.finalY + 6
                : 40,
              head: [[
                'Codigo',
                'Descricao',
                'Saldo (kg)',
                'Demanda (kg/dia)',
                'Max (kg)',
                'Sugestao (kg)',
                'Sugestao (pcs)',
                'B2',
                'Saldo B2 (kg)',
                'Dias Estoque',
                'Cobertura',
              ]],
              body: rows,
              theme: 'grid',
              styles: { fontSize: 7 },
              headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
            });

            doc.save('sugestoes_producao.pdf');
          }}
        />
      )}

    </div>
  );
};

  const handleGeneratePDF = (title, data) => {
    // Cria uma janela popup invisível
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");

    // Monta o HTML do Relatório
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 5px 0; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .right { text-align: right; }
            .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>METALOSA</h1>
            <p>Relatório de Estoque - ${title}</p>
            <p>Data de Emissão: ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto / Descrição</th>
                <th class="right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.code}</td>
                  <td>${item.name}</td>
                  <td class="right"><strong>${item.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Sistema de Controle de Produção - Metalosa
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Espera carregar e manda imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const getAdminUserLabel = (event) =>
    event?.details?.userEmail || event?.userEmail || event?.userId || 'Sem usuário';

  const formatEventDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('pt-BR');
  };

  const describeEvent = (event) => {
    const details = event.details || {};
    switch (event.eventType) {
      case EVENT_TYPES.MP_ENTRY:
        return `MP ${details.code || '-'} ${details.material || ''} ${
          details.weight ? `(${details.weight}kg)` : ''
        }`;
      case EVENT_TYPES.B2_ENTRY_NF:
        return `B2 ${details.b2Code || '-'} ${details.b2Name || ''} ${
          details.weight ? `(${details.weight}kg)` : ''
        }`;
      case EVENT_TYPES.B2_CUT:
        return `Corte ${details.motherCode || '-'} ${
          details.totalWeight ? `(${details.totalWeight}kg)` : ''
        }`;
      case EVENT_TYPES.PA_PRODUCTION:
        return `Prod ${details.productCode || '-'} ${details.productName || ''} ${
          details.pieces ? `(${details.pieces} pcs)` : ''
        }`;
      case EVENT_TYPES.PA_SHIPPING:
        return `Exp ${details.productCode || '-'} ${details.productName || ''} ${
          details.quantity ? `(${details.quantity} pcs)` : ''
        }`;
      default:
        return event.referenceId || '-';
    }
  };

  const selectedUserEvents = adminUserMovementsModal
    ? (Array.isArray(eventLogs) ? eventLogs : []).filter(
        (event) => getAdminUserLabel(event) === adminUserMovementsModal,
      )
    : [];

  const renderAdmin = () => {
    if (!isAdminUser) {
      return (
        <Card>
          <p className="text-sm text-gray-400">Sem acesso.</p>
        </Card>
      );
    }

    const focusAdminQuickForm = (type) => {
      setAdminCreateType(type);
      adminQuickFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const parseDate = (value) => {
      if (!value) return null;

      if (value instanceof Date) return value;
      if (typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof value === 'object') {
        if (typeof value.toDate === 'function') {
          const parsed = value.toDate();
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        if (typeof value.seconds === 'number') {
          const parsed = new Date(value.seconds * 1000);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
      }

      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return null;

        // Strings com AM/PM ou vÃ­rgula costumam ser do locale do browser.
        if (/[AP]M|,/.test(raw)) {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) return parsed;
        }

        if (raw.includes('/')) {
          const [datePart, ...timeParts] = raw.split(' ');
          const timePart = timeParts.join(' ').replace(',', '').trim();
          const parts = datePart.split('/');
          if (parts.length === 3) {
            let [p1, p2, p3] = parts;
            let year = p3.length === 2 ? `20${p3}` : p3;
            let day = p1;
            let month = p2;
            const n1 = parseInt(p1, 10);
            const n2 = parseInt(p2, 10);
            // Se veio em formato MM/DD e o dia Ã© vÃ¡lido, inverte.
            if (n1 <= 12 && n2 > 12) {
              day = p2;
              month = p1;
            }
            const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` +
              (timePart ? `T${timePart}` : 'T12:00:00');
            const parsed = new Date(iso);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          }
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      return null;
    };

    const formatDate = (value) => {
      const parsed = parseDate(value);
      if (!parsed) return value || '-';
      return parsed.toLocaleDateString('pt-BR');
    };

    const normalizeSearch = (value) => String(value || '').toLowerCase();
    const motherStock = (motherCoils || []).filter((coil) => coil.status === 'stock');
    const childStock = (childCoils || []).filter((coil) => coil.status === 'stock');
    const motherFiltered = motherStock.filter((coil) => {
      const search = normalizeSearch(adminMotherFilter);
      if (!search) return true;
      const haystack = `${coil.code || ''} ${coil.material || ''} ${coil.nf || ''} ${coil.width || ''}`;
      return normalizeSearch(haystack).includes(search);
    });
    const childFiltered = childStock.filter((coil) => {
      const search = normalizeSearch(adminB2Filter);
      if (!search) return true;
      const haystack = `${coil.b2Code || ''} ${coil.b2Name || ''} ${coil.width || ''} ${coil.origin || ''}`;
      return normalizeSearch(haystack).includes(search);
    });

    const productNameByCode = (productCatalog || []).reduce((acc, item) => {
      if (item?.code) acc[String(item.code)] = item.name || item.description || '';
      return acc;
    }, {});

    const finishedStock = Object.values(getFinishedStock() || {}).map((item) => ({
      ...item,
      name: item.name || productNameByCode[String(item.code)] || '',
    }));
    const finishedFiltered = finishedStock.filter((item) => {
      const search = normalizeSearch(adminPaFilter);
      if (!search) return true;
      const haystack = `${item.code || ''} ${item.name || ''}`;
      return normalizeSearch(haystack).includes(search);
    });
    const catalogFiltered = (productCatalog || []).filter((item) => {
      const search = normalizeSearch(adminCatalogFilter);
      if (!search) return true;
      const haystack = `${item.code || ''} ${item.name || ''} ${item.b2Code || ''} ${item.b2Name || ''}`;
      return normalizeSearch(haystack).includes(search);
    });
    const motherCatalogFiltered = (motherCatalog || []).filter((item) => {
      const search = normalizeSearch(adminMotherCatalogFilter);
      if (!search) return true;
      const haystack = `${item.code || ''} ${item.description || ''} ${item.type || ''}`;
      return normalizeSearch(haystack).includes(search);
    });

    const paginateItems = (items, page) => {
      const totalItems = items.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PAGE_SIZE));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * ADMIN_PAGE_SIZE;
      return {
        items: items.slice(start, start + ADMIN_PAGE_SIZE),
        totalItems,
        totalPages,
        page: safePage,
      };
    };

    const movements = [
      ...(cuttingLogs || []).map((log) => ({
        id: log.id,
        collection: 'cuttingLogs',
        type: 'Corte',
        date: log.date,
        timestamp: log.timestamp,
        desc: `MP ${log.motherCode || '-'} -> B2 ${log.b2Code || '-'}`,
        qty: log.outputCount ?? log.quantity ?? '-',
        weight: log.inputWeight ?? log.weight ?? '-',
      })),
      ...(productionLogs || []).map((log) => ({
        id: log.id,
        collection: 'productionLogs',
        type: 'Produção',
        date: log.date,
        timestamp: log.timestamp,
        desc: `${log.productCode || '-'} - ${log.productName || ''}`,
        qty: log.pieces ?? log.quantity ?? '-',
        weight: log.weight ?? '-',
      })),
      ...(shippingLogs || []).map((log) => ({
        id: log.id,
        collection: 'shippingLogs',
        type: 'Expedição',
        date: log.date,
        timestamp: log.timestamp,
        desc: `${log.productCode || '-'} - ${log.productName || ''}`,
        qty: log.quantity ?? '-',
        weight: log.weight ?? '-',
      })),
    ].sort((a, b) => {
      const dateA = parseDate(a.timestamp)?.getTime() || parseDate(a.date)?.getTime() || 0;
      const dateB = parseDate(b.timestamp)?.getTime() || parseDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });

    const movementsFiltered = movements.filter((mov) => {
      const search = normalizeSearch(adminMovementsIdFilter);
      if (!search) return true;
      const haystack = `${mov.id || ''} ${mov.desc || ''} ${mov.type || ''}`;
      return normalizeSearch(haystack).includes(search);
    });

    const motherPageData = paginateItems(motherFiltered, adminMotherPage);
    const childPageData = paginateItems(childFiltered, adminB2Page);
    const finishedPageData = paginateItems(finishedFiltered, adminPaPage);
    const movementsPageData = paginateItems(movementsFiltered, adminMovementsPage);
    const catalogPageData = paginateItems(catalogFiltered, adminCatalogPage);
    const motherCatalogPageData = paginateItems(motherCatalogFiltered, adminMotherCatalogPage);

    const eventTypeOrder = [
      EVENT_TYPES.MP_ENTRY,
      EVENT_TYPES.B2_ENTRY_NF,
      EVENT_TYPES.B2_CUT,
      EVENT_TYPES.PA_PRODUCTION,
      EVENT_TYPES.PA_SHIPPING,
      EVENT_TYPES.STOCK_ADJUSTMENT,
    ];

    const eventTypeColors = {
      [EVENT_TYPES.MP_ENTRY]: 'bg-blue-500/15 text-blue-200 border-blue-500/20',
      [EVENT_TYPES.B2_ENTRY_NF]: 'bg-indigo-500/15 text-indigo-200 border-indigo-500/20',
      [EVENT_TYPES.B2_CUT]: 'bg-purple-500/15 text-purple-200 border-purple-500/20',
      [EVENT_TYPES.PA_PRODUCTION]: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20',
      [EVENT_TYPES.PA_SHIPPING]: 'bg-red-500/15 text-red-200 border-red-500/20',
      [EVENT_TYPES.STOCK_ADJUSTMENT]: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/20',
    };

    const adminEvents = Array.isArray(eventLogs) ? eventLogs : [];
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const last7Events = adminEvents.filter((event) => {
      const ts = new Date(event.timestamp || event.createdAt || event.date || 0).getTime();
      return ts && now - ts <= sevenDaysMs;
    });

    const countByType = eventTypeOrder.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {});
    const countByType7d = eventTypeOrder.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {});

    adminEvents.forEach((event) => {
      if (countByType[event.eventType] !== undefined) {
        countByType[event.eventType] += 1;
      }
    });

    last7Events.forEach((event) => {
      if (countByType7d[event.eventType] !== undefined) {
        countByType7d[event.eventType] += 1;
      }
    });

    const userMap = {};
    adminEvents.forEach((event) => {
      const email = getAdminUserLabel(event);
      if (!userMap[email]) {
        userMap[email] = {
          user: email,
          total: 0,
          byType: {},
        };
      }
      userMap[email].total += 1;
      userMap[email].byType[event.eventType] =
        (userMap[email].byType[event.eventType] || 0) + 1;
    });

    const usersSummary = Object.values(userMap).sort((a, b) => b.total - a.total);
    const inventoryModalData = adminInventoryMovementsModal
      ? buildInventoryModalData(
          adminInventoryMovementsModal.scope,
          adminInventoryMovementsModal.code,
        )
      : null;
    const inventoryMovements = inventoryModalData?.rows || [];
    const inventoryMovementsTitle = adminInventoryMovementsModal
      ? `${adminInventoryMovementsModal.scope === 'b2' ? 'B2' : 'PA'} ${adminInventoryMovementsModal.code}`
      : '';
    const inventoryTotals = inventoryModalData?.totals || { stock: 0, consumed: 0, total: 0 };
    const inventoryScopeKey = adminInventoryMovementsModal?.scope;
    const inventoryScopeReport =
      inventoryScopeKey && adminInventoryReport
        ? adminInventoryReport[inventoryScopeKey]
        : null;
    const inventoryDiffTotal =
      inventoryScopeReport?.rows?.reduce((acc, row) => acc + (Number(row.diff) || 0), 0) || 0;

    const inventoryTimelineGroups = inventoryMovements.reduce((acc, mov) => {
      const label = formatDate(mov.date) || '-';
      if (!acc.map[label]) {
        acc.map[label] = { date: label, items: [] };
        acc.list.push(acc.map[label]);
      }
      acc.map[label].items.push(mov);
      return acc;
    }, { map: {}, list: [] }).list;

    const getInventoryMovementLabel = (mov) => {
      if (adminInventoryMovementsModal?.scope === 'b2') {
        return mov.status === 'BAIXADO' ? 'Baixa B2' : 'Entrada B2';
      }
      return mov.status === 'BAIXADO' ? 'Expedicao PA' : 'Producao PA';
    };

    const getInventoryMovementColor = (mov) =>
      mov.status === 'BAIXADO' ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-200';

    return (
      <div className="space-y-6">
        <div ref={adminQuickFormRef}>
          <Card>
          <h3 className="text-lg font-bold text-white mb-4">Cadastro rápido</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={adminCreateType === 'mother' ? 'primary' : 'secondary'}
              onClick={() => setAdminCreateType('mother')}
              className="text-xs"
            >
              Bobina Mãe
            </Button>
            <Button
              variant={adminCreateType === 'b2' ? 'primary' : 'secondary'}
              onClick={() => setAdminCreateType('b2')}
              className="text-xs"
            >
              Bobina B2
            </Button>
            <Button
              variant={adminCreateType === 'product' ? 'primary' : 'secondary'}
              onClick={() => setAdminCreateType('product')}
              className="text-xs"
            >
              Produto (Catálogo)
            </Button>
            <Button
              variant={adminCreateType === 'pa' ? 'primary' : 'secondary'}
              onClick={() => setAdminCreateType('pa')}
              className="text-xs"
            >
              PA (Estoque)
            </Button>
          </div>

          {adminCreateType === 'mother' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código"
                  value={adminMotherForm.code}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, code: e.target.value }))}
                />
                <Input
                  label="Material"
                  value={adminMotherForm.material}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, material: e.target.value }))}
                />
                <Input
                  label="Peso (kg)"
                  value={adminMotherForm.weight}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, weight: e.target.value }))}
                />
                <Input
                  label="Largura"
                  value={adminMotherForm.width}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, width: e.target.value }))}
                />
                <Input
                  label="Espessura"
                  value={adminMotherForm.thickness}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, thickness: e.target.value }))}
                />
                <Input
                  label="Tipo"
                  value={adminMotherForm.type}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, type: e.target.value }))}
                />
                <Input
                  label="NF"
                  value={adminMotherForm.nf}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, nf: e.target.value }))}
                />
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  value={adminMotherForm.quantity}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <Input
                  label="Data"
                  type="date"
                  value={adminMotherForm.entryDate}
                  onChange={(e) => setAdminMotherForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={addAdminMotherCoil}>
                  <Plus size={16} /> Criar Bobina Mãe
                </Button>
              </div>
            </>
          )}

          {adminCreateType === 'b2' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código B2"
                  value={adminB2Form.b2Code}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, b2Code: e.target.value }))}
                />
                <Input
                  label="Descrição"
                  value={adminB2Form.b2Name}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, b2Name: e.target.value }))}
                />
                <Input
                  label="Peso (kg)"
                  value={adminB2Form.weight}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, weight: e.target.value }))}
                />
                <Input
                  label="Largura"
                  value={adminB2Form.width}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, width: e.target.value }))}
                />
                <Input
                  label="Espessura"
                  value={adminB2Form.thickness}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, thickness: e.target.value }))}
                />
                <Input
                  label="Tipo"
                  value={adminB2Form.type}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, type: e.target.value }))}
                />
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  value={adminB2Form.quantity}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, quantity: e.target.value }))}
                />
                <Input
                  label="Data"
                  type="date"
                  value={adminB2Form.entryDate}
                  onChange={(e) => setAdminB2Form((prev) => ({ ...prev, entryDate: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={addAdminChildCoil}>
                  <Plus size={16} /> Criar Bobina B2
                </Button>
              </div>
            </>
          )}

          {adminCreateType === 'product' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código"
                  value={adminProductForm.code}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, code: e.target.value }))}
                />
                <Input
                  label="Descrição"
                  value={adminProductForm.name}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="Código B2"
                  value={adminProductForm.b2Code}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, b2Code: e.target.value }))}
                />
                <Input
                  label="Descrição B2"
                  value={adminProductForm.b2Name}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, b2Name: e.target.value }))}
                />
                <Input
                  label="Largura"
                  value={adminProductForm.width}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, width: e.target.value }))}
                />
                <Input
                  label="Espessura"
                  value={adminProductForm.thickness}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, thickness: e.target.value }))}
                />
                <Input
                  label="Tipo"
                  value={adminProductForm.type}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, type: e.target.value }))}
                />
                <Input
                  label="Código MP"
                  value={adminProductForm.motherCode}
                  onChange={(e) => setAdminProductForm((prev) => ({ ...prev, motherCode: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={addAdminProductCatalog}>
                  <Plus size={16} /> Criar Produto
                </Button>
              </div>
            </>
          )}

          {adminCreateType === 'pa' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código do Produto"
                  value={adminPaForm.productCode}
                  onChange={(e) => setAdminPaForm((prev) => ({ ...prev, productCode: e.target.value }))}
                />
                <Input
                  label="Descrição (opcional)"
                  value={adminPaForm.productName}
                  onChange={(e) => setAdminPaForm((prev) => ({ ...prev, productName: e.target.value }))}
                />
                <Input
                  label="Quantidade (pcs)"
                  value={adminPaForm.pieces}
                  onChange={(e) => setAdminPaForm((prev) => ({ ...prev, pieces: e.target.value }))}
                />
                <Input
                  label="Data"
                  type="date"
                  value={adminPaForm.entryDate}
                  onChange={(e) => setAdminPaForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={addAdminPaStock}>
                  <Plus size={16} /> Criar Estoque PA
                </Button>
              </div>
            </>
          )}
        </Card>
        </div>

        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h3 className="text-lg font-bold text-white">Catalogo de Produtos</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => focusAdminQuickForm('product')}
                className="text-xs"
              >
                <Plus size={16} /> Cadastrar produto
              </Button>
              <Button
                variant="secondary"
                onClick={exportFinishedStructureReport}
                className="text-xs"
              >
                <Download size={16} /> Estrutura PA
              </Button>
              <Button
                variant="secondary"
                onClick={exportFinishedStructureReportPdf}
                className="text-xs"
              >
                <FileText size={16} /> Estrutura PA (PDF)
              </Button>
            </div>
          </div>
          <div className="mb-3">
            <Input
              label="Filtro"
              value={adminCatalogFilter}
              onChange={(e) => setAdminCatalogFilter(e.target.value)}
              placeholder="Codigo, descricao, B2..."
            />
          </div>
          <div className="overflow-auto max-h-[360px] custom-scrollbar-dark">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">Codigo</th>
                  <th className="p-2">Descricao</th>
                  <th className="p-2">B2</th>
                  <th className="p-2">Descricao B2</th>
                  <th className="p-2 text-right">Largura</th>
                  <th className="p-2 text-right">Esp.</th>
                  <th className="p-2 text-right">Tipo</th>
                  <th className="p-2 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {catalogPageData.items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-4 text-center text-gray-500">Sem itens.</td>
                  </tr>
                ) : (
                  catalogPageData.items.map((item) => (
                    <tr key={item.id || item.code} className="hover:bg-gray-800/40">
                      <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                      <td className="p-2">{item.name || '-'}</td>
                      <td className="p-2 text-xs">{item.b2Code || '-'}</td>
                      <td className="p-2 text-xs">{item.b2Name || '-'}</td>
                      <td className="p-2 text-right">{item.width || '-'}</td>
                      <td className="p-2 text-right">{item.thickness || '-'}</td>
                      <td className="p-2 text-right">{item.type || '-'}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => startEditCatalogItem(item)}
                          className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={catalogPageData.page}
            totalItems={catalogPageData.totalItems}
            itemsPerPage={ADMIN_PAGE_SIZE}
            onPageChange={setAdminCatalogPage}
          />
        </Card>

        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h3 className="text-lg font-bold text-white">Catalogo de Bobinas</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => focusAdminQuickForm('mother')}
                className="text-xs"
              >
                <Plus size={16} /> Cadastrar bobina mae
              </Button>
            </div>
          </div>
          <div className="mb-3">
            <Input
              label="Filtro"
              value={adminMotherCatalogFilter}
              onChange={(e) => setAdminMotherCatalogFilter(e.target.value)}
              placeholder="Codigo, descricao, tipo..."
            />
          </div>
          <div className="overflow-auto max-h-[360px] custom-scrollbar-dark">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">Codigo</th>
                  <th className="p-2">Descricao</th>
                  <th className="p-2 text-right">Esp.</th>
                  <th className="p-2 text-right">Tipo</th>
                  <th className="p-2 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {motherCatalogPageData.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">Sem itens.</td>
                  </tr>
                ) : (
                  motherCatalogPageData.items.map((item) => (
                    <tr key={item.id || item.code} className="hover:bg-gray-800/40">
                      <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                      <td className="p-2">{item.description || '-'}</td>
                      <td className="p-2 text-right">{item.thickness || '-'}</td>
                      <td className="p-2 text-right">{item.type || '-'}</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => startEditMotherCatalogItem(item)}
                          className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={motherCatalogPageData.page}
            totalItems={motherCatalogPageData.totalItems}
            itemsPerPage={ADMIN_PAGE_SIZE}
            onPageChange={setAdminMotherCatalogPage}
          />
        </Card>
<Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h3 className="text-lg font-bold text-white">Resumo de movimentações</h3>
            <span className="text-xs text-gray-400">
              {eventLogsLoading ? 'Atualizando...' : `${adminEvents.length} eventos`}
            </span>
          </div>

          {adminEvents.length === 0 ? (
            <div className="text-sm text-gray-400">Sem movimentações registradas.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {eventTypeOrder.map((type) => (
                  <div
                    key={type}
                    className={`rounded-xl border px-4 py-3 ${eventTypeColors[type]}`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      {EVENT_TYPE_LABELS[type] || type}
                    </p>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-xl font-bold text-white">{countByType[type] || 0}</span>
                      <span className="text-[11px] text-gray-400">
                        7d: {countByType7d[type] || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-auto max-h-[320px] custom-scrollbar-dark">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2">Usuário</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Entrada MP</th>
                      <th className="p-2 text-right">Entrada B2</th>
                      <th className="p-2 text-right">Corte</th>
                      <th className="p-2 text-right">Produção</th>
                      <th className="p-2 text-right">Expedição</th>
                      <th className="p-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {usersSummary.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-4 text-center text-gray-500">
                          Sem dados de usuário.
                        </td>
                      </tr>
                    ) : (
                      usersSummary.map((row) => (
                        <tr key={row.user} className="hover:bg-gray-800/40">
                          <td className="p-2 text-xs text-gray-200">{row.user}</td>
                          <td className="p-2 text-right font-mono">{row.total}</td>
                          <td className="p-2 text-right font-mono">
                            {row.byType[EVENT_TYPES.MP_ENTRY] || 0}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.byType[EVENT_TYPES.B2_ENTRY_NF] || 0}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.byType[EVENT_TYPES.B2_CUT] || 0}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.byType[EVENT_TYPES.PA_PRODUCTION] || 0}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.byType[EVENT_TYPES.PA_SHIPPING] || 0}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => setAdminUserMovementsModal(row.user)}
                              className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                            >
                              <Eye size={14} /> Ver
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-white mb-4">Saldos de Estoque</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={adminStockTab === 'mother' ? 'primary' : 'secondary'}
              onClick={() => setAdminStockTab('mother')}
              className="text-xs"
            >
              Bobinas Mãe
            </Button>
            <Button
              variant={adminStockTab === 'b2' ? 'primary' : 'secondary'}
              onClick={() => setAdminStockTab('b2')}
              className="text-xs"
            >
              Bobinas B2
            </Button>
            <Button
              variant={adminStockTab === 'pa' ? 'primary' : 'secondary'}
              onClick={() => setAdminStockTab('pa')}
              className="text-xs"
            >
              Produtos Acabados
            </Button>
          </div>

          {adminStockTab === 'mother' && (
            <div className="bg-gray-900/60 rounded-xl border border-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Matéria-prima (Bobinas Mãe)</h4>
              <div className="mb-3">
                <Input
                  label="Filtro"
                  value={adminMotherFilter}
                  onChange={(e) => setAdminMotherFilter(e.target.value)}
                  placeholder="Código, material, NF..."
                />
              </div>
              <div className="overflow-auto max-h-[360px] custom-scrollbar-dark">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2">Código</th>
                      <th className="p-2">Material</th>
                      <th className="p-2 text-right">Largura</th>
                      <th className="p-2 text-right">Saldo (kg)</th>
                      <th className="p-2">NF</th>
                      <th className="p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {motherPageData.items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-gray-500">Sem saldo.</td>
                      </tr>
                    ) : (
                      motherPageData.items.map((coil) => (
                        <tr key={coil.id} className="hover:bg-gray-800/40">
                          <td className="p-2 font-mono text-xs">{coil.code || '-'}</td>
                          <td className="p-2">{coil.material || '-'}</td>
                          <td className="p-2 text-right">{coil.width || '-'}</td>
                          <td className="p-2 text-right font-mono">
                            {Number(coil.remainingWeight ?? coil.weight ?? 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </td>
                          <td className="p-2 text-xs">{coil.nf || '-'}</td>
                          <td className="p-2 text-center">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => setEditingMotherCoil(coil)}
                                className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                              >
                                <Edit size={14} /> Editar
                              </button>
                              <button
                                onClick={() => deleteMotherCoil(coil.id)}
                                className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-200 hover:bg-red-600/40"
                              >
                                <Trash2 size={14} /> Apagar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={motherPageData.page}
                totalItems={motherPageData.totalItems}
                itemsPerPage={ADMIN_PAGE_SIZE}
                onPageChange={setAdminMotherPage}
              />
            </div>
          )}

          {adminStockTab === 'b2' && (
            <div className="bg-gray-900/60 rounded-xl border border-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Bobinas B2</h4>
              <div className="mb-3">
                <Input
                  label="Filtro"
                  value={adminB2Filter}
                  onChange={(e) => setAdminB2Filter(e.target.value)}
                  placeholder="Código, descrição, largura..."
                />
              </div>
              <div className="overflow-auto max-h-[360px] custom-scrollbar-dark">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2">B2</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 text-right">Largura</th>
                      <th className="p-2 text-right">Saldo (kg)</th>
                      <th className="p-2">Origem</th>
                      <th className="p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {childPageData.items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-4 text-center text-gray-500">Sem saldo.</td>
                      </tr>
                    ) : (
                      childPageData.items.map((coil) => (
                        <tr key={coil.id} className="hover:bg-gray-800/40">
                          <td className="p-2 font-mono text-xs">{coil.b2Code || '-'}</td>
                          <td className="p-2">{coil.b2Name || coil.description || '-'}</td>
                          <td className="p-2 text-right">{coil.width || '-'}</td>
                          <td className="p-2 text-right font-mono">
                            {Number(coil.weight ?? 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </td>
                          <td className="p-2 text-xs">{coil.origin || coil.source || '-'}</td>
                          <td className="p-2 text-center">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => setEditingChildCoil(coil)}
                                className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                              >
                                <Edit size={14} /> Editar
                              </button>
                              <button
                                onClick={() => deleteChildCoil(coil.id)}
                                className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-200 hover:bg-red-600/40"
                              >
                                <Trash2 size={14} /> Apagar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={childPageData.page}
                totalItems={childPageData.totalItems}
                itemsPerPage={ADMIN_PAGE_SIZE}
                onPageChange={setAdminB2Page}
              />
            </div>
          )}

          {adminStockTab === 'pa' && (
            <div className="bg-gray-900/60 rounded-xl border border-white/5 p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Produtos Acabados</h4>
              <div className="mb-3">
                <Input
                  label="Filtro"
                  value={adminPaFilter}
                  onChange={(e) => setAdminPaFilter(e.target.value)}
                  placeholder="Código ou descrição..."
                />
              </div>
              <div className="overflow-auto max-h-[360px] custom-scrollbar-dark">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2">Código</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 text-right">Saldo (pcs)</th>
                      <th className="p-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {finishedPageData.items.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-gray-500">Sem saldo.</td>
                      </tr>
                    ) : (
                      finishedPageData.items.map((item) => (
                        <tr key={item.code} className="hover:bg-gray-800/40">
                          <td className="p-2 font-mono text-xs">{item.code}</td>
                          <td className="p-2">{item.name || '-'}</td>
                          <td className="p-2 text-right font-mono">{item.count}</td>
                          <td className="p-2 text-center">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => {
                                  setAdminCreateType('pa');
                                  setAdminPaForm((prev) => ({
                                    ...prev,
                                    productCode: item.code,
                                    productName: item.name || '',
                                  }));
                                }}
                                className="px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                              >
                                <Edit size={14} /> Ajustar
                              </button>
                              <button
                                onClick={() => deleteAdminProductionByCode(item.code)}
                                className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-200 hover:bg-red-600/40"
                              >
                                <Trash2 size={14} /> Apagar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={finishedPageData.page}
                totalItems={finishedPageData.totalItems}
                itemsPerPage={ADMIN_PAGE_SIZE}
                onPageChange={setAdminPaPage}
              />
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-white mb-4">Movimentações (apagar no Firebase)</h3>
          <div className="mb-3 max-w-sm">
            <Input
              label="Buscar por cÃ³digo/descriÃ§Ã£o"
              value={adminMovementsIdFilter}
              onChange={(e) => {
                setAdminMovementsIdFilter(e.target.value);
                setAdminMovementsPage(1);
              }}
              placeholder="CÃ³digo, descriÃ§Ã£o ou ID..."
            />
          </div>
          <div className="overflow-auto max-h-[420px] custom-scrollbar-dark">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-right">Peso</th>
                  <th className="p-2">ID</th>
                  <th className="p-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {movementsPageData.items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-gray-500">Sem movimentações.</td>
                  </tr>
                ) : (
                  movementsPageData.items.map((mov, idx) => (
                    <tr key={`${mov.collection}-${mov.id || idx}`} className="hover:bg-gray-800/40">
                      <td className="p-2 text-xs text-gray-400">{formatDate(mov.timestamp || mov.date)}</td>
                      <td className="p-2 text-xs font-semibold">{mov.type}</td>
                      <td className="p-2">{mov.desc}</td>
                      <td className="p-2 text-right font-mono">{mov.qty}</td>
                      <td className="p-2 text-right font-mono">{mov.weight}</td>
                      <td className="p-2 font-mono text-[10px] text-gray-500">{mov.id}</td>
                      <td className="p-2 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => startEditAdminMovement(mov)}
                            className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-200 hover:bg-blue-600/40"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button
                            onClick={() => deleteAdminMovement(mov.collection, mov.id)}
                            className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded bg-red-600/20 text-red-200 hover:bg-red-600/40"
                          >
                            <Trash2 size={14} /> Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={movementsPageData.page}
            totalItems={movementsPageData.totalItems}
            itemsPerPage={ADMIN_PAGE_SIZE}
            onPageChange={setAdminMovementsPage}
          />
        </Card>

        {adminInventoryMovementsModal && (
          <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-950">
                <div>
                  <h3 className="text-white font-bold text-lg">Movimentos: {inventoryMovementsTitle}</h3>
                  <p className="text-xs text-gray-500">{inventoryMovements.length} registros</p>
                  {inventoryScopeReport && (
                    <p className="text-xs text-gray-500">
                      Inventario: {inventoryScopeReport.fileName || 'arquivo nao informado'} ·
                      CSV {inventoryScopeReport.totalFile.toLocaleString('pt-BR', {
                        minimumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                        maximumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                      })}{' '}
                      {inventoryScopeKey === 'b2' ? 'kg' : 'pcs'} ·
                      Sistema {inventoryScopeReport.totalSystem.toLocaleString('pt-BR', {
                        minimumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                        maximumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                      })}{' '}
                      {inventoryScopeKey === 'b2' ? 'kg' : 'pcs'} ·
                      Dif {inventoryDiffTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                        maximumFractionDigits: inventoryScopeKey === 'b2' ? 1 : 0,
                      })}{' '}
                      {inventoryScopeKey === 'b2' ? 'kg' : 'pcs'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setAdminInventoryMovementsModal(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-b border-gray-800 bg-gray-950/60">
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Saldo em estoque</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {inventoryTotals.stock.toLocaleString('pt-BR', {
                      minimumFractionDigits: adminInventoryMovementsModal.scope === 'b2' ? 1 : 0,
                      maximumFractionDigits: adminInventoryMovementsModal.scope === 'b2' ? 1 : 0,
                    })}{' '}
                    {adminInventoryMovementsModal.scope === 'b2' ? 'kg' : 'pcs'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Total baixado</p>
                  <p className="text-lg font-bold text-amber-300">
                    {inventoryTotals.consumed.toLocaleString('pt-BR', {
                      minimumFractionDigits: adminInventoryMovementsModal.scope === 'b2' ? 1 : 0,
                      maximumFractionDigits: adminInventoryMovementsModal.scope === 'b2' ? 1 : 0,
                    })}{' '}
                    {adminInventoryMovementsModal.scope === 'b2' ? 'kg' : 'pcs'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Itens</p>
                  <p className="text-lg font-bold text-blue-300">
                    {inventoryTotals.stock > 0 || inventoryTotals.consumed > 0
                      ? `${inventoryTotals.stock > 0 ? inventoryMovements.filter((m) => m.status === 'ESTOQUE').length : 0}/${inventoryTotals.total}`
                      : inventoryTotals.total}
                  </p>
                </div>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1">
                {inventoryMovements.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Sem movimentacoes encontradas.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {inventoryTimelineGroups.map((group) => (
                      <div key={`inv-${group.date}`} className="space-y-3">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {group.date}
                        </div>
                        <div className="border-l border-gray-700 pl-4 space-y-3">
                          {group.items.map((mov, idx) => {
                            const qtyValue = Number(mov.qty) || 0;
                            const qtyFormatted =
                              mov.unit === 'kg'
                                ? qtyValue.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                  })
                                : qtyValue.toLocaleString('pt-BR');
                            const typeLabel = getInventoryMovementLabel(mov);
                            return (
                              <div key={`${mov.trackingId}-${idx}`} className="relative">
                                <span
                                  className={`absolute -left-[22px] top-2 h-2.5 w-2.5 rounded-full ${getInventoryMovementColor(mov)}`}
                                />
                                <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded ${getInventoryMovementColor(mov)}`}>
                                      {typeLabel}
                                    </span>
                                    <span className="text-gray-400">Origem: {mov.origin || '-'}</span>
                                    <span className="text-gray-400">ID: {mov.trackingId || '-'}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-sm font-semibold text-white">
                                      {qtyFormatted} {mov.unit || ''}
                                    </span>
                                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                                      {mov.status}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-300">
                                    Destino/Consumo: {mov.destination || '-'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // ==================================================================
  // COLE ISTO DENTRO DO APP, ANTES DE "const renderDashboard = ..."
  // ==================================================================

  // --- 1. IMPORTAÇÃO GENÉRICA (BACKUP / LOTE) ---
  // --- FUNÇÃO DE IMPORTAÇÃO (ATUALIZADA PARA SEU ARQUIVO) ---
  // --- 1. IMPORTAÇÃO GENÉRICA (BACKUP / LISTA COMPLETA) ---
  const handleImportBackup = (e, setter, label) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        
        if (rows.length < 2) return alert("Arquivo vazio.");
        
        // Mapeamento de colunas
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const data = []; // Usaremos um array novo para expandir as quantidades

        rows.slice(1).forEach(row => {
          const obj = {};
          headers.forEach((header, index) => {
            let val = row[index];
            if (val === undefined) return;

            let key = header;
            // Mapeamentos
            if (header.includes('largura')) key = 'width';
            if (header.includes('peso')) key = 'weight';
            if (header.includes('código') || header.includes('codigo') || header.includes('lote')) key = 'code';
            if (header.includes('material') || header.includes('descrição')) key = 'material';
            if (header.includes('nota') || header.includes('nf')) key = 'nf';
            if (header.includes('filial')) key = 'branch';
            if (header.includes('tipo')) key = 'type';
            if (header.includes('espesura') || header.includes('espessura')) key = 'thickness';
            if (header.includes('quantidade') || header.includes('qtd')) key = 'qty_temp'; // <--- LÊ QUANTIDADE

            // Limpa números
            if (typeof val === 'string' && /^[0-9.,]+$/.test(val)) {
               const clean = val.replace(/\./g, '').replace(',', '.');
               if (!isNaN(Number(clean)) && clean !== '') val = Number(clean);
            }
            obj[key] = val;
          });

          // Ajustes padrão
          if (!obj.status) obj.status = 'stock';
          if (!obj.branch) obj.branch = 'MATRIZ'; 
          
          if (label.includes('Mãe')) {
              if (obj.weight && !obj.remainingWeight) obj.remainingWeight = obj.weight;
              if (obj.weight && !obj.originalWeight) obj.originalWeight = obj.weight;
              if (!obj.width) obj.width = 1200;
              // Se não tiver material, cria um genérico para não ficar vazio
              if (!obj.material) obj.material = `BOBINA ${obj.code}`;
          }

          // LÓGICA DE QUANTIDADE: Se Qtd=2, cria 2 registros
          const loops = obj.qty_temp ? parseInt(obj.qty_temp) : 1;
          
          for (let i = 0; i < loops; i++) {
              data.push({
                  ...obj,
                  id: `IMP-${Date.now()}-${Math.floor(Math.random()*1000000)}`, // ID único para cada
              });
          }
        });

        if(data.length > 0){ 
            setter(data); 
            alert(`${label} atualizado!\nForam importados ${data.length} registros individuais.`); 
        }
      } catch (err) { alert("Erro: " + err.message); }
    };
    reader.readAsText(file);
  };
  // --- 2. INVENTÁRIO INTELIGENTE (BOBINA MÃE) ---
  // --- VERSÃO INTELIGENTE: INVENTÁRIO (LÊ CABEÇALHOS) ---
  // --- FUNÇÃO DE INVENTÁRIO INTELIGENTE (LÊ CABEÇALHOS DO EXCEL/CSV) ---
  const handleMotherInventory = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Usa as funções auxiliares que estão no final do arquivo
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        
        if (rows.length < 2) return alert("Arquivo vazio ou sem cabeçalho.");

        // 1. Identifica onde está cada coluna pelo nome (Header)
        // Remove acentos e deixa minúsculo para facilitar a busca (Ex: "CÓDIGO" vira "codigo")
        const headers = rows[0].map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")); 
        
        // Procura em qual coluna está cada informação
        const idxCode = headers.findIndex(h => h.includes('codigo') || h.includes('lote'));
        const idxWidth = headers.findIndex(h => h.includes('largura'));
        const idxWeight = headers.findIndex(h => h.includes('peso'));
        const idxBranch = headers.findIndex(h => h.includes('filial'));
        const idxType = headers.findIndex(h => h.includes('tipo'));

        // Validação básica: Precisa ter pelo menos Código e Peso
        if (idxCode === -1 || idxWeight === -1) {
            return alert(`Erro: Não encontrei as colunas 'Código' e 'Peso' no arquivo.\n\nColunas lidas: ${headers.join(', ')}`);
        }

        const inventoryMap = {}; 
        
        // 2. Processa as linhas usando os índices descobertos
        const dataRows = rows.slice(1);
        
        dataRows.forEach(row => {
             // Pega valor baseado no índice da coluna
             const rawCode = String(row[idxCode] || '').trim();
             
             // Funçãozinha interna para limpar números (tira ponto de milhar, troca vírgula por ponto)
             const parseNum = (val) => {
                 if (!val) return 0;
                 let clean = String(val).replace(/\./g, '').replace(',', '.');
                 return parseFloat(clean) || 0;
             };

             const width = idxWidth !== -1 ? parseNum(row[idxWidth]) : 0; // Se não tiver coluna largura, assume 0
             const weight = parseNum(row[idxWeight]);
             const branch = idxBranch !== -1 ? (row[idxBranch] || 'MATRIZ') : 'MATRIZ';
             const type = idxType !== -1 ? (row[idxType] || 'ND') : 'ND';

             if (rawCode && weight > 0) {
                 // Chave composta: Código + Largura (para diferenciar bobinas de larguras diferentes com mesmo lote)
                 const key = `${rawCode}|${width}`;
                 
                 if (!inventoryMap[key]) inventoryMap[key] = { weight: 0, branch, type };
                 inventoryMap[key].weight += weight;
                 
                 // Se no CSV tiver filial/tipo, atualiza (prevalece o último lido)
                 if(branch !== 'MATRIZ') inventoryMap[key].branch = branch;
                 if(type !== 'ND') inventoryMap[key].type = type;
             }
        });

        // 3. Compara com o Sistema
        let newMotherCoils = [...motherCoils];
        let newCuttingLogs = [...cuttingLogs];
        const dateNow = new Date().toLocaleDateString();
        let adjustedCount = 0;
        let diffTotal = 0;

        Object.keys(inventoryMap).forEach(key => {
            const [code, widthStr] = key.split('|');
            const width = parseFloat(widthStr);
            const { weight: realWeight, branch, type } = inventoryMap[key];

            // Busca bobinas no sistema. Se largura for 0 no CSV, ignora filtro de largura.
            const systemCoils = newMotherCoils.filter(m => 
                String(m.code) === code && 
                (width === 0 || Math.abs((parseFloat(m.width)||0) - width) < 5) && 
                m.status === 'stock'
            );
            
            const systemWeight = systemCoils.reduce((acc, m) => acc + (parseFloat(m.remainingWeight) || 0), 0);
            const diff = realWeight - systemWeight;

            // Ignora diferenças muito pequenas (menores que 0.5kg)
            if (Math.abs(diff) < 0.5) return;

            // Busca dados do catálogo para preencher lacunas se for criar novo
            let meta = systemCoils[0] || motherCatalog.find(m => String(m.code) === code) || { material: 'AJUSTE INVENTÁRIO', thickness: '-', type: type };

            if (diff > 0) {
                // SOBRA FÍSICA -> ENTRADA
                newMotherCoils.push({
                    id: `INV-ENT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    code: code,
                    nf: 'INVENTARIO',
                    material: meta.material || 'AJUSTE',
                    weight: diff,
                    originalWeight: diff,
                    remainingWeight: diff,
                    width: width > 0 ? width : (meta.width || 1200),
                    thickness: meta.thickness,
                    type: meta.type || type,
                    branch: branch,
                    status: 'stock',
                    date: dateNow,
                    isAdjustment: true
                });
            } else {
                // FALTA FÍSICA -> SAÍDA (CONSUMO)
                let weightToDeduct = Math.abs(diff);
                for (let coil of systemCoils) {
                    if (weightToDeduct <= 0) break;
                    const current = parseFloat(coil.remainingWeight);
                    
                    if (current <= weightToDeduct) {
                        // Consome total a bobina
                        coil.remainingWeight = 0;
                        coil.status = 'consumed';
                        coil.consumptionDetail = 'AJUSTE INVENTÁRIO';
                        coil.consumedDate = dateNow;
                        weightToDeduct -= current;
                    } else {
                        // Consome parcial a bobina
                        coil.remainingWeight = current - weightToDeduct;
                        weightToDeduct = 0;
                    }
                }
                
                // Registra Log de Corte/Ajuste
                newCuttingLogs.push({
                    id: `INV-SAI-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    date: dateNow,
                    motherCode: code,
                    motherMaterial: meta.material || 'AJUSTE',
                    inputWeight: Math.abs(diff),
                    outputCount: 0,
                    scrap: Math.abs(diff),
                    generatedItems: `AJUSTE ${width > 0 ? `(Larg: ${width}mm)` : ''}`,
                    timestamp: new Date().toLocaleString()
                });
            }
            adjustedCount++;
            diffTotal += diff;
        });

        setMotherCoils(newMotherCoils);
        setCuttingLogs(newCuttingLogs);
        
        alert(`Inventário Processado com Sucesso!\n\nItens Ajustados: ${adjustedCount}\nDiferença Líquida de Peso: ${diffTotal.toFixed(1)} kg`);
        e.target.value = ''; 

      } catch (error) {
        alert("Erro fatal ao processar: " + error.message);
      }
    };
    reader.readAsText(file);
  };


  // --- 3. RESTAURAR BACKUP COMPLETO ---

  
const handleFullRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileDate = file.lastModified ? new Date(file.lastModified).toLocaleString() : new Date().toLocaleString();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Recupera os dados
        if (data.motherCoils) setMotherCoils(data.motherCoils);
        if (data.childCoils) setChildCoils(data.childCoils);
        if (data.productionLogs) setProductionLogs(data.productionLogs);
        if (data.shippingLogs) setShippingLogs(data.shippingLogs);
        if (data.productCatalog) setProductCatalog(data.productCatalog);
        if (data.motherCatalog) setMotherCatalog(data.motherCatalog);
        
        // 👇 ESSA LINHA É FUNDAMENTAL PARA O CORTES SLITTER 👇
        if (data.cuttingLogs) setCuttingLogs(data.cuttingLogs); 
        // 👆 SEM ELA, O HISTÓRICO DE CORTES SOME 👆
        
        setCurrentFileName(`📂 ${fileName} (Salvo em: ${fileDate})`);
        
        // Calcula total de registros para confirmar visualmente
        // Substitua a linha do 'totalRegs' por esta:
        const totalRegs = (data.motherCoils?.length||0) 
                + (data.childCoils?.length||0) 
                + (data.productionLogs?.length||0) 
                + (data.productCatalog?.length||0) // <--- Agora conta o catálogo também!
                + (data.shippingLogs?.length||0);

        alert(`Backup restaurado com sucesso!\n\nArquivo: ${fileName}\nData Original: ${fileDate}\nRegistros Carregados: ~${totalRegs}`);
      } catch (err) {
        alert("Erro ao ler backup: " + err.message);
      }
    };
    reader.readAsText(file);
  };


  const renderDashboard = () => (
    <Dashboard
      motherCoils={motherCoils}
      childCoils={childCoils}
      productionLogs={productionLogs}
      shippingLogs={shippingLogs}
      cuttingLogs={cuttingLogs}
      motherCatalog={motherCatalog}
      productCatalog={productCatalog}
      getUnitWeight={getUnitWeight}
      exportToExcelXml={exportToExcelXml}
      exportToCSV={exportToCSV}
      onViewStockDetails={handleViewStockDetails}
      onViewProductHistory={(product) => {
        setSelectedGroupData(product);
        setShowHistoryModal(true);
      }}
      onPrintProduct={handleReprintStockBalance}
      eventLogs={eventLogs}
      eventLogsLoading={eventLogsLoading}
      onViewEventDetails={handleViewEventDetails}
    />
  );

// --- AUXILIARES --- //
const formatKgToT = (kg) => {
  const t = (Number(kg) || 0) / 1000;
  return `${t.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`;
};

const formatKg = (kg) => {
  const v = Number(kg) || 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const parseMovementDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const raw = String(value).replace(',', '').trim();
  if (!raw) return null;
  const matched =
    raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/) ||
    raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (matched) {
    const [, p1, p2, p3, hh = '00', mm = '00', ss = '00'] = matched;
    const [year, month, day] =
      raw.includes('/') && !raw.startsWith(p3)
        ? [p3, p2, p1]
        : [p1, p2, p3];
    const iso = `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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

const renderB2DynamicReport = () => {
  // --- 1. PREPARAÇÃO SEGURA ---
  const safeChild = Array.isArray(childCoils) ? childCoils : [];
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
  const motherCatalogFallback = Array.isArray(INITIAL_MOTHER_CATALOG)
    ? INITIAL_MOTHER_CATALOG
    : [];
  const motherCatalogRuntime = Array.isArray(motherCatalog) ? motherCatalog : [];
  const mergedMotherCatalog = [...motherCatalogFallback, ...motherCatalogRuntime];

  const safeMotherCatalog = mergedMotherCatalog;
  const snapshotDateEnd = b2ReportSnapshotDate
    ? new Date(`${b2ReportSnapshotDate}T23:59:59.999`)
    : null;
  const snapshotDateEndMs = snapshotDateEnd?.getTime() ?? null;
  const hasSnapshotDate = Number.isFinite(snapshotDateEndMs);
  const formatSnapshotLabel = (isoDate) => {
    if (!isoDate || !isoDate.includes('-')) return '-';
    const [yyyy, mm, dd] = isoDate.split('-');
    if (!yyyy || !mm || !dd) return '-';
    return `${dd}/${mm}/${yyyy}`;
  };

  const getB2EffectiveStatus = (item) => {
    if (!hasSnapshotDate) {
      return item.status === "stock" ? "stock" : "consumed";
    }

    const entryDate = parseMovementDate(
      item?.createdAt || item?.entryDate || item?.date
    );
    if (!entryDate || entryDate.getTime() > snapshotDateEndMs) {
      return "not_created";
    }

    const consumedAt = parseMovementDate(
      item?.consumptionDate ||
      item?.consumptionTimestamp ||
      item?.consumedDate
    );
    if (consumedAt && consumedAt.getTime() <= snapshotDateEndMs) {
      return "consumed";
    }

    return "stock";
  };

  const motherCatalogByCode = safeMotherCatalog.reduce((acc, item) => {
    const code = String(item?.code || '').trim();
    if (code) acc[code] = item;
    return acc;
  }, {});

  const baseProductCatalog = Array.isArray(INITIAL_PRODUCT_CATALOG)
    ? INITIAL_PRODUCT_CATALOG
    : [];
  const runtimeProductCatalog = Array.isArray(productCatalog) ? productCatalog : [];

  const b2CatalogMap = baseProductCatalog.reduce((acc, item) => {
    const code = String(item?.b2Code || '').trim();
    if (!code) return acc;
    acc[code] = {
      b2Code: code,
      b2Name: item?.b2Name || item?.name || '',
      width: item?.width ?? null,
      thickness: item?.thickness ?? null,
      type: item?.type ?? null,
      motherCode: item?.motherCode || '',
    };
    return acc;
  }, {});

  runtimeProductCatalog.forEach((item) => {
    const code = String(item?.b2Code || '').trim();
    if (!code) return;
    const existing = b2CatalogMap[code] || {};
    b2CatalogMap[code] = {
      ...existing,
      b2Code: code,
      b2Name: item?.b2Name || item?.name || existing.b2Name || '',
      width: item?.width ?? existing.width ?? null,
      thickness: item?.thickness ?? existing.thickness ?? null,
      type: item?.type ?? existing.type ?? null,
      motherCode: item?.motherCode || existing.motherCode || '',
    };
  });

  const catalogB2List = Object.values(b2CatalogMap);

  // --- 2. ENRIQUECER B2 COM INFO DA BOBINA MÃE + CONSUMO ---
  const enrichedData = safeChild.map((b2) => {
    const mother =
      safeMother.find((m) => String(m.code) === String(b2.motherCode)) || {
        material: "Desconhecido",
        entryDate: "-",
      };

    const prodLogsForChild = safeProd
      .filter((log) => Array.isArray(log.childIds) && log.childIds.includes(b2.id))
      .sort((a, b) => {
        const dateA = parseMovementDate(a?.date || a?.timestamp)?.getTime() || 0;
        const dateB = parseMovementDate(b?.date || b?.timestamp)?.getTime() || 0;
        return dateA - dateB;
      });
    const prodLog = prodLogsForChild[0] || null;

    const motherCatalogMatch = safeMotherCatalog.find(
      (m) => String(m.code) === String(b2.motherCode)
    );

    const b2CatalogEntry = b2CatalogMap[String(b2.b2Code || b2.code || '').trim()] || {};
    const b2Thickness = b2CatalogEntry.thickness ?? b2.thickness ?? null;
    const b2Type = b2CatalogEntry.type ?? b2.type ?? null;

    return {
      ...b2,
      motherMaterial: mother.material,
      motherDescription: motherCatalogMatch?.description || mother.material,
      motherWidth: motherCatalogMatch?.width ?? mother.width ?? null,
      motherThickness: motherCatalogMatch?.thickness ?? mother.thickness ?? null,
      motherEntryDate: mother.entryDate || mother.date,
      consumptionDate: prodLog ? prodLog.date || prodLog.timestamp : null,
      consumptionTimestamp: prodLog ? prodLog.timestamp || prodLog.date : null,
      productFinal: prodLog
        ? `${prodLog.productCode} - ${prodLog.productName}`
        : null,
      productionBatchId: prodLog ? prodLog.id : null,

      b2Thickness,
      b2Type,
      // chave: espessura e tipo sempre baseados na MP
      thickness: motherCatalogMatch?.thickness ?? null,
      type: motherCatalogMatch?.type ?? null,
    };
  });

  const formatThickness = (value) => {
    if (value === undefined || value === null || value === '') return '-';
    const cleaned = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
    if (!cleaned) return '-';
    let parsed = parseFloat(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return '-';
    while (parsed > 5 && parsed > 0.05) parsed /= 10;
    return parsed.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatWidth = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '-';
  };

  const handleExportB2Pdf = () => {
    const search = (b2ReportSearch || "").toLowerCase();
    const filteredCatalog = catalogB2List.filter((item) => {
      const matchesSearch =
        (item.b2Code || item.code || "").toLowerCase().includes(search) ||
        item.b2Name?.toLowerCase().includes(search) ||
        String(item.motherCode || "").includes(search);

      const matchesThickness =
        !b2ThicknessFilter ||
        b2ThicknessFilter === "all" ||
        String(item.b2Thickness ?? item.thickness) === String(b2ThicknessFilter);

      const matchesType =
        !b2TypeFilter ||
        b2TypeFilter === "all" ||
        String(item.b2Type ?? item.type) === String(b2TypeFilter);

      return matchesSearch && matchesThickness && matchesType;
    });

    if (!filteredCatalog.length) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Estrutura B2 - Bobina Mae e Medidas', 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

    const rows = filteredCatalog.map((item) => {
      const mother = motherCatalogByCode[String(item.motherCode || '').trim()];
      return [
        item.b2Code || '-',
        item.b2Name || '-',
        item.motherCode || '-',
        mother?.description || '-',
        formatWidth(mother?.width),
        formatThickness(mother?.thickness),
        formatWidth(item.width),
        formatThickness(item.thickness),
        item.type || '-',
      ];
    });

      autoTable(doc, {
        startY: 28,
        head: [[
          'B2 Codigo',
          'B2 Descricao',
          'Mae Codigo',
          'Mae Descricao',
          'Mae Largura (mm)',
          'Mae Espessura (mm)',
          'B2 Largura (mm)',
          'B2 Espessura (mm)',
          'B2 Tipo',
        ]],
        body: rows,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 18 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20 },
        5: { cellWidth: 22 },
        6: { cellWidth: 20 },
        7: { cellWidth: 22 },
        8: { cellWidth: 14 },
      },
    });

    doc.save('estrutura_b2.pdf');
  };

  // --- 3. OPÇÕES DE FILTRO (ESPESSURA / TIPO) ---
  const thicknessOptions = Array.from(
    new Set(enrichedData.map((i) => i.b2Thickness ?? i.thickness).filter(Boolean))
  ).sort((a, b) => {
    const pa = parseFloat(String(a).replace(",", ".")) || 0;
    const pb = parseFloat(String(b).replace(",", ".")) || 0;
    return pa - pb;
  });

  const typeOptions = Array.from(
    new Set(enrichedData.map((i) => i.b2Type ?? i.type).filter(Boolean))
  ).sort();

  // --- 4. FILTRAGEM PRÉVIA (BUSCA + ESPESSURA + TIPO) ---
  const search = (b2ReportSearch || "").toLowerCase();

  const filteredRaw = enrichedData.filter((item) => {
    const effectiveStatus = getB2EffectiveStatus(item);
    if (effectiveStatus === "not_created") return false;

    const matchesSearch =
      (item.b2Code || item.code || "").toLowerCase().includes(search) ||
      item.b2Name?.toLowerCase().includes(search) ||
      String(item.motherCode || "").includes(search);

    const matchesThickness =
      !b2ThicknessFilter ||
      b2ThicknessFilter === "all" ||
      String(item.b2Thickness ?? item.thickness) === String(b2ThicknessFilter);

    const matchesType =
      !b2TypeFilter ||
      b2TypeFilter === "all" ||
      String(item.b2Type ?? item.type) === String(b2TypeFilter);

    return matchesSearch && matchesThickness && matchesType;
  });

  // --- 5. AGRUPAMENTO POR CÓDIGO B2 ---
  const groupedData = filteredRaw.reduce((acc, item) => {
    const code = item.b2Code || item.code;
    if (!code) return acc;

    if (!acc[code]) {
      acc[code] = {
        code: code,
        name: item.b2Name || item.name || '-',
        b2Type: item.b2Type ?? null,
        b2Thickness: item.b2Thickness ?? null,
        totalItems: 0,
        stockCount: 0,
        stockWeight: 0,
        consumedCount: 0,
        consumedWeight: 0,
        items: [],
      };
    }

    acc[code].items.push(item);
    acc[code].totalItems++;

    const effectiveStatus = getB2EffectiveStatus(item);
    const w = Number(item.weight) || 0;
    if (effectiveStatus === "stock") {
      acc[code].stockCount++;
      acc[code].stockWeight += w;
    } else {
      acc[code].consumedCount++;
      acc[code].consumedWeight += w;
    }

    return acc;
  }, {});

  const groupsList = Object.values(groupedData).sort((a, b) => {
    const weightDiff = (Number(b.stockWeight) || 0) - (Number(a.stockWeight) || 0);
    if (weightDiff !== 0) return weightDiff;
    return String(a.code || '').localeCompare(String(b.code || ''));
  });

  // Totais gerais
  const totalStockWeight = groupsList.reduce(
    (acc, g) => acc + (Number(g.stockWeight) || 0),
    0
  );
  const totalStockCount = groupsList.reduce(
    (acc, g) => acc + (Number(g.stockCount) || 0),
    0
  );
  const totalConsumedWeight = groupsList.reduce(
    (acc, g) => acc + (Number(g.consumedWeight) || 0),
    0
  );

  // --- 6. RENDER ---
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <List size={24} className="text-indigo-500" /> Relatório Consolidado
            B2
          </h2>
          <p className="text-sm text-gray-400">
            Visão agrupada por código B2. Clique em uma linha para detalhar as
            bobinas individuais.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:items-center">
          <div className="md:w-40">
            <input
              type="date"
              value={b2ReportSnapshotDate}
              onChange={(e) => setB2ReportSnapshotDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              title="Data-base do estoque"
            />
          </div>

          {/* Busca */}
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-2.5 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar código, descrição ou mãe..."
              value={b2ReportSearch}
              onChange={(e) => setB2ReportSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filtro Espessura */}
          <div className="md:w-36">
            <select
              value={b2ThicknessFilter || "all"}
              onChange={(e) => setB2ThicknessFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="all">Espessura</option>
              {thicknessOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo */}
          <div className="md:w-32">
            <select
              value={b2TypeFilter || "all"}
              onChange={(e) => setB2TypeFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="all">Tipo</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            onClick={handleExportB2Pdf}
            className="h-9 text-xs"
          >
            <Download size={14} /> PDF Estrutura
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-900/20 border-emerald-500/30 py-3 px-4">
          <span className="text-xs text-emerald-400 font-bold uppercase">
            {hasSnapshotDate
              ? `Saldo em Estoque (${formatSnapshotLabel(b2ReportSnapshotDate)})`
              : "Saldo em Estoque"}
          </span>
          <div className="text-2xl font-bold text-white">
            {totalStockWeight.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal text-gray-400">kg</span>
          </div>
          <div className="text-xs text-emerald-300 mt-1">
            {totalStockCount.toLocaleString("pt-BR")} bobinas disponiveis
          </div>
        </Card>
        <Card className="bg-gray-700/20 border-gray-600/30 py-3 px-4">
          <span className="text-xs text-gray-400 font-bold uppercase">
            {hasSnapshotDate
              ? `Consumido até ${formatSnapshotLabel(b2ReportSnapshotDate)}`
              : "Total Consumido (Filtrado)"}
          </span>
          <div className="text-2xl font-bold text-gray-300">
            {totalConsumedWeight.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal text-gray-500">kg</span>
          </div>
        </Card>
      </div>

      {/* LISTA AGRUPADA */}
      <Card className="flex-1 overflow-hidden p-0">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar-dark">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10 uppercase text-xs">
              <tr>
                <th className="p-4">Codigo</th>
                <th className="p-4">Descricao</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Espessura</th>
                <th className="p-4 text-center">Bobinas</th>
                <th className="p-4 text-right text-emerald-400">
                  Peso Estoque
                </th>
                <th className="p-4 text-right text-gray-500">Peso Baixado</th>
                <th className="p-4 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {groupsList.map((group) => {
                const isExpanded = expandedGroupCode === group.code;

                return (
                  <React.Fragment key={group.code}>
                    {/* LINHA MESTRA */}
                    <tr
                      className={`hover:bg-gray-700/50 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-indigo-900/20 border-l-4 border-indigo-500"
                          : ""
                      }`}
                      onClick={() =>
                        setExpandedGroupCode(
                          isExpanded ? null : group.code
                        )
                      }
                    >
                      <td className="p-4 font-bold text-white font-mono text-base">
                        {group.code}
                      </td>
                      <td className="p-4 text-gray-300 font-medium">
                        {group.name}
                      </td>
                      <td className="p-4 text-gray-300">
                        {group.b2Type || "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {formatThickness(group.b2Thickness)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-gray-800 px-2 py-1 rounded text-xs font-bold border border-gray-600">
                          {group.stockCount} / {group.totalItems}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400 text-lg">
                        {group.stockWeight > 0
                          ? group.stockWeight.toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="p-4 text-right text-gray-500 font-mono">
                        {group.consumedWeight > 0
                          ? group.consumedWeight.toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="p-4 text-center text-indigo-400">
                        {isExpanded ? (
                          <ChevronRight className="rotate-90 transition-transform" />
                        ) : (
                          <ChevronRight className="transition-transform" />
                        )}
                      </td>
                    </tr>

                    {/* LINHA DETALHADA */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="bg-gray-900/50 p-0">
                          <div className="p-4 border-t border-indigo-900/50 animate-fade-in">
                            <table className="w-full text-xs text-left text-gray-400">
                              <thead className="text-indigo-300 border-b border-gray-700">
                                <tr>
                                  <th className="pb-2">Data Entrada</th>
                                  <th className="pb-2">Origem (Mãe)</th>
                                  <th className="pb-2">ID Rastreio</th>
                                  <th className="pb-2 text-right">
                                    Peso
                                  </th>
                                  <th className="pb-2 text-center">
                                    Status
                                  </th>
                                  <th className="pb-2">
                                    Destino / Consumo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {group.items.map((item, idx) => {
                                  const effectiveStatus = getB2EffectiveStatus(item);
                                  const isConsumed = effectiveStatus === "consumed";
                                  return (
                                    <tr
                                      key={idx}
                                      className="hover:bg-gray-800/50"
                                    >
                                      <td className="py-2">
                                        {item.createdAt}
                                      </td>
                                      <td className="py-2">
                                        <div className="font-bold text-gray-300">
                                          {item.motherCode}
                                        </div>
                                        <div className="text-[10px] truncate max-w-[200px]">
                                          {item.motherMaterial}
                                        </div>
                                      </td>
                                      <td className="py-2 font-mono text-indigo-200">
                                        {item.id}
                                      </td>
                                      <td className="py-2 text-right font-bold text-white">
                                        {item.weight} kg
                                      </td>
                                      <td className="py-2 text-center">
                                        {isConsumed ? (
                                          <span className="text-gray-600">
                                            BAIXADO
                                          </span>
                                        ) : (
                                          <span className="text-emerald-500 font-bold">
                                            ESTOQUE
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2">
                                        {isConsumed ? (
                                          <div>
                                            <div className="text-white font-bold">
                                              {item.consumptionDate}
                                            </div>
                                            <div className="text-indigo-300 truncate max-w-[250px]">
                                              {item.productFinal}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-gray-600 italic">
                                            -
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {groupsList.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-gray-500"
                  >
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

  const normalizeCatalogCode = (v) => {
  if (v === undefined || v === null) return "";
  // mantém só letras/números e padroniza
  return String(v).trim().toUpperCase().replace(/\s+/g, "").replace(/[^\w]/g, "");
};

const handleUploadJSONToFirebase = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (
    !window.confirm(
      "ATENÇÃO: Isso vai enviar dados do JSON para o banco oficial (nuvem).\n\nTem certeza que quer continuar?"
    )
  ) return;

  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const rawData = JSON.parse(event.target.result);

      const collectionsMap = [
        { jsonKey: "motherCoils", dbName: "motherCoils" },
        { jsonKey: "childCoils", dbName: "childCoils" },
        { jsonKey: "productionLogs", dbName: "productionLogs" },
        { jsonKey: "shippingLogs", dbName: "shippingLogs" },
        { jsonKey: "cuttingLogs", dbName: "cuttingLogs" },

        // catálogos:
        { jsonKey: "productCatalog", dbName: "productCatalog", isCatalog: true },
        { jsonKey: "motherCatalog", dbName: "motherCatalog", isCatalog: true },
      ];

      let totalSaved = 0;
      let batch = writeBatch(db);
      let operationCounter = 0;

      const commitIfNeeded = async (force = false) => {
        if (operationCounter >= 450 || (force && operationCounter > 0)) {
          await batch.commit();
          batch = writeBatch(db);
          operationCounter = 0;
        }
      };

      for (const map of collectionsMap) {
        const items = rawData?.[map.jsonKey];
        if (!Array.isArray(items) || items.length === 0) continue;

        for (const item of items) {
          if (!item) continue;

          // ✅ CATALOGO: docId SEMPRE pelo code, normalizado, e grava com MERGE
          if (map.isCatalog) {
            const code = normalizeCatalogCode(item.code);
            if (!code) continue;

            const docRef = doc(db, map.dbName, code);

            // remove id pra não poluir catálogo com id aleatório
            const { id, ...data } = item;

            batch.set(docRef, data, { merge: true }); // ✅ atualiza sem apagar o resto
            operationCounter++;
            totalSaved++;
            await commitIfNeeded(false);
            continue;
          }

          // ✅ COLEÇÕES "normais": usa id (ou code fallback)
          const docId = String(item.id || item.code || "").trim();
          if (!docId) continue;

          const docRef = doc(db, map.dbName, docId);
          batch.set(docRef, item); // aqui pode ser overwrite mesmo (ou troca por merge se quiser)
          operationCounter++;
          totalSaved++;
          await commitIfNeeded(false);
        }
      }

      await commitIfNeeded(true);

      alert(`Sucesso! ${totalSaved} registros foram enviados para a nuvem.`);
    } catch (err) {
      console.error("Erro na migração:", err);
      alert("Erro ao migrar: " + err.message);
    } finally {
      // permite subir o mesmo arquivo de novo
      e.target.value = "";
    }
  };

  reader.readAsText(file);
};

  const handleLogout = async () => {
    if (USE_LOCAL_JSON) {
      return;
    }
    try {
      await logoutUser();
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      setUser(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Carregando sessão...</p>
      </div>
    );
  }

  if (!USE_LOCAL_JSON && !user) {
    return <Login onLoginSuccess={setUser} />;
  }

    const setSidebarHiddenPreference = (value) => {
      setSidebarHidden(value);
      try {
        window.localStorage.setItem('sidebarHidden', String(value));
      } catch (error) {
        console.warn('Nao foi possivel salvar a preferencia do menu lateral.', error);
      }
    };

    const handleSidebarNavigate = (tab) => {
      setActiveTab(tab);
      setSidebarOpen(false);
    };

    const parseQrPayload = (rawValue) => {
      const raw = String(rawValue || '').trim();
      if (!raw) return null;

      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const data = JSON.parse(raw);
          return {
            raw,
            format: 'json',
            id: String(data?.id || '').trim(),
            code: String(data?.code || data?.b2Code || data?.productCode || '').trim(),
            quantity: String(data?.qtd || data?.quantity || '').trim(),
          };
        } catch (error) {
          // tenta outros formatos
        }
      }

      const parts = raw.split('|').map((part) => part.trim());
      if (parts.length >= 4 && parts[0].toLowerCase() === 'v1') {
        return {
          raw,
          format: 'v1',
          id: parts[1],
          code: parts[2],
          quantity: parts.slice(3).join('|'),
        };
      }

      return { raw, format: 'plain', id: '', code: raw, quantity: '' };
    };

    const formatConsultDate = (value) => {
      if (!value) return '-';
      const parsed = parseMovementDate(value);
      if (!parsed) return String(value);
      return parsed.toLocaleString('pt-BR');
    };

    const resolveConsultResult = ({ qrId = '', qrCode = '', preferredType = 'all', parsed = null } = {}) => {
      const safeId = String(qrId || '').trim();
      const safeCode = normalizeCode(qrCode);
      const typeFilter = String(preferredType || 'all').toLowerCase();

      const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
      const safeChild = Array.isArray(childCoils) ? childCoils : [];
      const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
      const safeShip = Array.isArray(shippingLogs) ? shippingLogs : [];
      const safeCut = Array.isArray(cuttingLogs) ? cuttingLogs : [];

      const motherHit = safeMother.find((m) =>
        (safeId && String(m.id) === safeId) ||
        (safeCode && normalizeCode(m.code) === safeCode)
      ) || null;

      const childHit = safeChild.find((c) =>
        (safeId && String(c.id) === safeId) ||
        (safeCode && normalizeCode(c.b2Code || c.code) === safeCode)
      ) || null;

      const prodByIdOrCode = safeProd.find((p) =>
        (safeId && String(p.id) === safeId) ||
        (safeCode && normalizeCode(p.productCode) === safeCode) ||
        (safeCode && normalizeCode(p.trackingId) === safeCode)
      ) || null;

      const prodByChild = childHit
        ? safeProd
          .filter((p) => Array.isArray(p.childIds) && p.childIds.map(String).includes(String(childHit.id)))
          .sort((a, b) => (parseMovementDate(a?.date || a?.timestamp)?.getTime() || 0) - (parseMovementDate(b?.date || b?.timestamp)?.getTime() || 0))[0] || null
        : null;

      const productionHit = prodByIdOrCode || prodByChild;

      const shippingHit = safeShip.find((s) =>
        (safeId && String(s.id) === safeId) ||
        (safeCode && normalizeCode(s.productCode) === safeCode) ||
        (safeCode && normalizeCode(s.trackingId) === safeCode)
      ) || null;

      const motherFromChild = childHit
        ? safeMother.find((m) =>
          String(m.id) === String(childHit.motherId) ||
          String(m.code) === String(childHit.motherCode)
        ) || null
        : null;

      const cuttingHit = childHit
        ? safeCut
          .filter((c) => Array.isArray(c.childIds) && c.childIds.map(String).includes(String(childHit.id)))
          .sort((a, b) => (parseMovementDate(a?.date || a?.timestamp)?.getTime() || 0) - (parseMovementDate(b?.date || b?.timestamp)?.getTime() || 0))[0] || null
        : null;

      const resultType = motherHit
        ? 'mother'
        : childHit
          ? 'b2'
          : (productionHit || shippingHit)
            ? 'product'
            : null;

      if (!resultType) return null;
      if (typeFilter !== 'all' && resultType !== typeFilter) return null;

      return {
        parsed: parsed || { raw: safeCode || safeId || '-' },
        type: resultType,
        mother: motherHit || motherFromChild || null,
        child: childHit || null,
        production: productionHit || null,
        shipping: shippingHit || null,
        cutting: cuttingHit || null,
      };
    };

    const handleConsultQr = (rawValue = consultQrInput) => {
      const parsed = parseQrPayload(rawValue);
      if (!parsed) {
        setConsultResult(null);
        setConsultError('Informe ou leia um QR code.');
        return;
      }

      const result = resolveConsultResult({
        qrId: parsed.id,
        qrCode: parsed.code,
        preferredType: consultSearchType,
        parsed,
      });

      if (!result) {
        setConsultResult(null);
        setConsultError('Nao encontrei esse QR nos registros atuais.');
        return;
      }

      setConsultError('');
      setConsultResult(result);
    };

    const handleConsultByInputs = () => {
      const byId = String(consultSearchId || '').trim();
      const byCode = String(consultSearchCode || '').trim();
      if (!byId && !byCode) {
        setConsultResult(null);
        setConsultError('Informe ID ou Codigo para pesquisar.');
        return;
      }

      const result = resolveConsultResult({
        qrId: byId,
        qrCode: byCode,
        preferredType: consultSearchType,
        parsed: { raw: `${byId || '-'}|${byCode || '-'}` },
      });

      if (!result) {
        setConsultResult(null);
        setConsultError('Nao encontrei registros com esses filtros.');
        return;
      }

      setConsultError('');
      setConsultResult(result);
    };

    const stopConsultCamera = () => {
      if (consultScanTimerRef.current) {
        clearInterval(consultScanTimerRef.current);
        consultScanTimerRef.current = null;
      }
      if (consultStreamRef.current) {
        consultStreamRef.current.getTracks().forEach((track) => track.stop());
        consultStreamRef.current = null;
      }
      if (consultVideoRef.current) {
        consultVideoRef.current.srcObject = null;
      }
      setConsultCameraOn(false);
    };

    const startConsultCamera = async () => {
      setConsultCameraError('');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setConsultCameraError('Seu navegador nao suporta acesso a camera.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        consultStreamRef.current = stream;
        if (consultVideoRef.current) {
          consultVideoRef.current.srcObject = stream;
          await consultVideoRef.current.play();
        }
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          consultScanTimerRef.current = setInterval(async () => {
            if (!consultVideoRef.current) return;
            try {
              const codes = await detector.detect(consultVideoRef.current);
              if (codes && codes.length > 0) {
                const value = codes[0]?.rawValue || '';
                if (value) {
                  setConsultQrInput(value);
                  handleConsultQr(value);
                  stopConsultCamera();
                }
              }
            } catch (error) {
              // ignora frame invalido
            }
          }, 450);
        } else {
          setConsultCameraError('Camera aberta. Este navegador nao le QR automaticamente; use leitor externo ou cole o codigo.');
        }
        setConsultCameraOn(true);
      } catch (error) {
        setConsultCameraError('Nao foi possivel acessar a camera. No celular, use HTTPS/localhost e permita permissao.');
      }
    };

    const renderQrConsultPanel = () => (
      <div className="space-y-5">
        <Card className="border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <ScanLine className="text-cyan-300" size={22} />
            <h3 className="text-white font-black text-lg">Consulta QR</h3>
          </div>

          <p className="text-sm text-gray-400 mb-3">
            Leia com leitor de codigo ou cole o conteudo do QR.
          </p>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Cole aqui o conteudo do QR"
              value={consultQrInput}
              onChange={(e) => setConsultQrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConsultQr();
              }}
            />
            <Button onClick={() => handleConsultQr()} variant="primary">
              <Search size={16} /> Consultar
            </Button>
            <Button
              onClick={() => (consultCameraOn ? stopConsultCamera() : startConsultCamera())}
              variant={consultCameraOn ? "warning" : "secondary"}
            >
              <Camera size={16} /> {consultCameraOn ? 'Parar Camera' : 'Ler com Camera'}
            </Button>
            <Button
              onClick={() => {
                setConsultQrInput('');
                setConsultResult(null);
                setConsultError('');
                setConsultSearchCode('');
                setConsultSearchId('');
                setConsultSearchType('all');
                stopConsultCamera();
              }}
              variant="secondary"
            >
              <X size={16} /> Limpar
            </Button>
          </div>

          {consultCameraOn && (
            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-black/40 p-2">
              <video ref={consultVideoRef} className="w-full max-h-[260px] rounded object-cover" playsInline muted />
            </div>
          )}
          {consultCameraError && (
            <p className="mt-2 text-xs text-amber-300 font-semibold">{consultCameraError}</p>
          )}

          <div className="mt-4 border-t border-gray-700 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-2">Pesquisa por Inputs</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                className="p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="ID"
                value={consultSearchId}
                onChange={(e) => setConsultSearchId(e.target.value)}
              />
              <input
                className="p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Codigo"
                value={consultSearchCode}
                onChange={(e) => setConsultSearchCode(e.target.value)}
              />
              <select
                className="p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                value={consultSearchType}
                onChange={(e) => setConsultSearchType(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="mother">Bobina Mae</option>
                <option value="b2">Bobina 2</option>
                <option value="product">Produto</option>
              </select>
              <Button onClick={handleConsultByInputs} variant="primary">
                <Search size={16} /> Pesquisar
              </Button>
            </div>
          </div>
        </Card>

        {consultError && (
          <Card className="border border-red-500/40 bg-red-900/20">
            <p className="text-red-200 font-bold">{consultError}</p>
          </Card>
        )}

        {consultResult && (
          <Card className="border border-emerald-500/30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs uppercase text-gray-500 font-bold mb-1">Tipo</p>
                <p className="text-white font-black">
                  {consultResult.type === 'mother' ? 'Bobina Mae' : consultResult.type === 'b2' ? 'Bobina 2' : 'Produto Acabado'}
                </p>
                <p className="text-xs text-gray-500 mt-2">QR: {consultResult.parsed.raw}</p>
              </div>

              {consultResult.mother && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs uppercase text-gray-500 font-bold mb-1">Bobina Mae</p>
                  <p className="text-white font-black">{consultResult.mother.code}</p>
                  <p className="text-gray-300 truncate">{consultResult.mother.material || '-'}</p>
                  <p className="text-gray-400 mt-1">Data entrada: {formatConsultDate(consultResult.mother.entryDate || consultResult.mother.date || consultResult.mother.createdAt)}</p>
                  <p className="text-gray-400">Peso atual: {(Number(consultResult.mother.remainingWeight ?? consultResult.mother.weight) || 0).toLocaleString('pt-BR')} kg</p>
                </div>
              )}

              {consultResult.child && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs uppercase text-gray-500 font-bold mb-1">Bobina 2</p>
                  <p className="text-white font-black">{consultResult.child.b2Code || consultResult.child.code || '-'}</p>
                  <p className="text-gray-300 truncate">{consultResult.child.b2Name || '-'}</p>
                  <p className="text-gray-400 mt-1">Data corte: {formatConsultDate(consultResult.cutting?.date || consultResult.cutting?.timestamp || consultResult.child.createdAt)}</p>
                  <p className="text-gray-400">Espessura: {consultResult.child.thickness || '-'}</p>
                  <p className="text-gray-400">Tipo: {consultResult.child.type || '-'}</p>
                </div>
              )}
            </div>

            {(consultResult.production || consultResult.shipping) && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                {consultResult.production && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs uppercase text-gray-500 font-bold mb-1">Producao</p>
                    <p className="text-white font-black">
                      {(consultResult.production.productCode || '-') + ' - ' + (consultResult.production.productName || '-')}
                    </p>
                    <p className="text-gray-400 mt-1">Data producao: {formatConsultDate(consultResult.production.date || consultResult.production.timestamp)}</p>
                    <p className="text-gray-400">Quantidade: {consultResult.production.pieces ?? '-'}</p>
                  </div>
                )}

                {consultResult.shipping && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs uppercase text-gray-500 font-bold mb-1">Expedicao</p>
                    <p className="text-white font-black">{consultResult.shipping.productCode || '-'}</p>
                    <p className="text-gray-300 truncate">{consultResult.shipping.productName || '-'}</p>
                    <p className="text-gray-400 mt-1">Data expedicao: {formatConsultDate(consultResult.shipping.date || consultResult.shipping.timestamp)}</p>
                    <p className="text-gray-400">Destino: {consultResult.shipping.destination || '-'}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    );

  return (


    <div className="flex h-screen bg-[#0f172a] font-sans text-gray-100 overflow-hidden">
      {ENABLE_BACKUP_BUTTON && (
        <input 
          type="file" 
          ref={importFullBackupRef} 
          style={{ display: 'none' }} // Ele fica invisível propositalmente
          accept=".json" 
          onChange={handleFullRestore} 
        />
      )}

      
      {/* Mobile Overlay */}
      <div className={`fixed inset-0 z-30 bg-black/50 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/70 text-gray-300 flex flex-col border-r border-white/5 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarHidden ? 'md:-translate-x-full' : 'md:translate-x-0 md:static'} md:w-72`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 font-bold text-xl tracking-wider bg-black/20">
           <div className="flex items-center">
             <img 
               src="/logo.png" 
               alt="Logo Metalosa" 
               className="w-10 h-10 mr-3 object-contain" 
             />
             <span className="text-white">METALOSA</span>
           </div>
           <button
             type="button"
               onClick={() => setSidebarHiddenPreference(true)}
             className="hidden md:inline-flex p-1.5 rounded-full text-gray-500 hover:text-gray-200 hover:bg-white/5 transition"
             title="Esconder menu"
           >
             <ChevronLeft size={16} />
           </button>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar-dark">
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Principal</p>
           
           <button onClick={() => handleSidebarNavigate('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'dashboard' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <LayoutDashboard size={20} className={activeTab === 'dashboard' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Visão Geral</span>
           </button>
           
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Operacional</p>
           
           <button onClick={() => handleSidebarNavigate('operations')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'operations' ? 'bg-emerald-600/15 text-emerald-200 border border-emerald-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Zap size={20} className={activeTab === 'operations' ? "text-emerald-300" : "group-hover:text-emerald-300 transition-colors"}/> <span className="font-medium">Painel Operação</span>
           </button>

           <button onClick={() => handleSidebarNavigate('mother')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'mother' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <ScrollText size={20} className={activeTab === 'mother' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Entrada de MP</span>
           </button>
           {/* ... outros botões ... */}
                     
           <button onClick={() => handleSidebarNavigate('cutting')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'cutting' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Scissors size={20} className={activeTab === 'cutting' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Corte Slitter</span>
           </button>
           
           <button onClick={() => handleSidebarNavigate('production')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'production' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Factory size={20} className={activeTab === 'production' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Apontamento</span>
           </button>
           
           <button onClick={() => handleSidebarNavigate('shipping')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'shipping' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Truck size={20} className={activeTab === 'shipping' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Expedição</span>
           </button>

           
           <button onClick={() => handleSidebarNavigate('reports')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'reports' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <FileText size={20} className={activeTab === 'reports' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Relatórios</span>
           </button>

            <button onClick={() => handleSidebarNavigate('b2report')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'b2report' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <List size={20} className={activeTab === 'b2report' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">Rastreio B2</span>
            </button>

           <button onClick={() => handleSidebarNavigate('bi')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'bi' ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <PieChart size={20} className={activeTab === 'bi' ? "text-blue-300" : "group-hover:text-blue-300 transition-colors"}/> <span className="font-medium">BI & Gráficos</span>
            </button>

            <button 
            onClick={() => handleSidebarNavigate('mpNeed')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group 
              ${activeTab === 'mpNeed' 
                ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Factory 
              size={20} 
              className={activeTab === 'mpNeed' 
                ? "text-blue-300" 
                : "group-hover:text-blue-300 transition-colors"
              } 
            />
            <span className="font-medium">Necessidade MP</span>
          </button>

          
          <button 
            onClick={() => handleSidebarNavigate('steelDemand')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group 
              ${activeTab === 'steelDemand' 
                ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <TrendingUp 
              size={20} 
              className={activeTab === 'steelDemand' 
                ? "text-blue-300" 
                : "group-hover:text-blue-300 transition-colors"
              } 
            />
            <span className="font-medium">Demanda de Aço</span>
          </button>

           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Gestão</p>

           {isAdminUser && (
             <button
               onClick={() => handleSidebarNavigate('admin')}
               className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${
                 activeTab === 'admin'
                   ? 'bg-red-600/15 text-red-200 border border-red-500/20 shadow-inner'
                   : 'text-gray-400 hover:bg-white/5 hover:text-white'
               }`}
             >
               <Shield size={20} className={activeTab === 'admin' ? "text-red-300" : "group-hover:text-red-300 transition-colors"} />
               <span className="font-medium">Admin</span>
             </button>
           )}

           {ENABLE_BACKUP_BUTTON && (
  <div className="mt-2 px-4">
    <Button
      onClick={() => importFullBackupRef.current.click()}
      variant="secondary"
      className="w-full justify-start text-xs border-dashed border-gray-600 text-gray-400 hover:text-white"
    >
      <Upload size={16} className="mr-2" /> Restaurar Backup
    </Button>
  </div>
)}

          
           {(
  <div className="mt-8 px-4">
    <Button
      onClick={handleFullBackup}
      variant="success"
      className="w-full justify-start text-xs"
    >
      <Archive size={16} className="mr-2" />
      Backup Completo
    </Button>
  </div>
)}

        </nav>
        <div className="px-6 py-2 mt-auto border-t border-white/5 text-center"><p className="text-[11px] text-gray-500 font-medium">© 2025 — <span className="text-gray-400 font-semibold">Sergio Betini</span></p></div>
        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 border border-gray-600">
              <User size={20}/>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user?.email || 'Usuário'}</p>
              <p className="text-xs text-gray-500">PCP / Gestão</p>
            </div>
          </div>
        </div>
      </aside>
    
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#111827]">
         
         <header className="h-16 md:h-20 bg-slate-900/70 backdrop-blur shadow-lg flex items-center justify-between px-4 md:px-8 z-10 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-4">
              {isSidebarHidden && (
                <button
                  className="hidden md:inline-flex p-2 text-gray-400 hover:text-white"
                  onClick={() => setSidebarHiddenPreference(false)}
                  title="Mostrar menu"
                >
                  <ChevronRight size={22} />
                </button>
              )}
              <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24}/></button>
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">
                  {activeTab === 'dashboard' && "Dashboard"}
                  {activeTab === 'operations' && "Painel de Operação"}
                  {activeTab === 'mother' && "Entrada de MP"}
                  {activeTab === 'cutting' && "Corte Slitter"}
                  {activeTab === 'production' && "Apontamento"}
                  {activeTab === 'shipping' && "Expedição"}
                  {activeTab === 'reports' && "Relatórios"}
                  {activeTab === 'b2report' && "Relatório B2"}
                  {activeTab === 'bi' && "BI & Gráficos"}
                  {activeTab === 'mpNeed' && "Necessidade MP"}
                  {activeTab === 'steelDemand' && "Demanda de Aço"}
                  {activeTab === 'inoxBlanks' && "Planejamento Inox"}
                  {activeTab === 'admin' && "Admin"}
                                                
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium uppercase tracking-wider hidden md:block">Controle de Produção</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right px-3 py-1.5 md:px-4 md:py-2 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs md:text-sm font-bold text-gray-300">{new Date().toLocaleDateString()}</p>
                <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{user?.email}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout} className="text-xs md:text-sm px-3 py-2">
                <LogOut size={16} /> Sair
              </Button>
            </div>
         </header>
         

         <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar-dark">
            <div className="max-w-7xl mx-auto pb-20 md:pb-0">
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'operations' && renderOperationsPanel()}
              {activeTab === 'mother' && renderMotherCoilForm()}
              {activeTab === 'cutting' && renderCuttingProcess()}
              {activeTab === 'production' && renderProduction()}
              {activeTab === 'shipping' && renderShipping()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'b2report' && renderB2DynamicReport()}
              {activeTab === 'admin' && renderAdmin()}

              {activeTab === 'bi' && (
                <IndicatorsDashboard
                  motherCoils={motherCoils}
                  childCoils={childCoils}
                  cuttingLogs={cuttingLogs}
                  shippingLogs={shippingLogs}
                  productionLogs={productionLogs}
                />
              )}              
{activeTab === "mpNeed" && (
  <RawMaterialRequirement
    motherCoils={motherCoils}
    childCoils={childCoils}
    productCatalog={INITIAL_PRODUCT_CATALOG}
    motherCatalog={INITIAL_MOTHER_CATALOG}
  />
)}

{activeTab === "steelDemand" && (
  <DemandFocus />
)}

{activeTab === "inoxBlanks" && (
  <InoxBlanksPlanner />
)}




            </div>
         </main>
      </div>

      {showCatalogModal && renderCatalogModal()}
      {showPrintModal && (
        <PrintLabelsModal
          items={itemsToPrint}
          type={printType}
          motherCatalog={motherCatalog}
          productCatalog={productCatalog}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      {stockDetailsModalOpen && viewingStockCode && (
        <StockDetailsModal 
          code={viewingStockCode}
          type={viewingStockType} // <--- ADICIONE ESTA LINHA NOVA
          coils={
            viewingStockType === 'mother' 
              ? motherCoils.filter(c => String(c.code) === String(viewingStockCode) && c.status === 'stock')
              : childCoils.filter(c => c.b2Code === viewingStockCode && c.status === 'stock')
          }
          motherCatalog={motherCatalog}
          onClose={() => setStockDetailsModalOpen(false)}
          onReprint={handleReprintSingle}
        />
      )}
      {editingMotherCoil && (
        <EditMotherCoilModal 
          coil={editingMotherCoil} 
          onClose={() => setEditingMotherCoil(null)} 
          onSave={updateMotherCoil} 
        />
      )}
      {editingChildCoil && (
        <EditChildCoilModal 
          coil={editingChildCoil} 
          onClose={() => setEditingChildCoil(null)} 
          onSave={updateChildCoil} 
        />
      )}
      
      {viewingCutLog && (
        <CutDetailsModal 
            log={viewingCutLog} 
            onClose={() => setViewingCutLog(null)} 
        />
      )}
      {viewingCutEvent && (
        <CutEventDetailsModal
          event={viewingCutEvent}
          motherCoils={motherCoils}
          childCoils={childCoils}
          cuttingLogs={cuttingLogs}
          onClose={() => setViewingCutEvent(null)}
        />
      )}
      {viewingProductionEvent && (
        <ProductionEventDetailsModal
          event={viewingProductionEvent}
          productionLogs={productionLogs}
          childCoils={childCoils}
          onClose={() => setViewingProductionEvent(null)}
        />
      )}
      {viewingShippingEvent && (
        <ShippingEventDetailsModal
          event={viewingShippingEvent}
          productionLogs={productionLogs}
          shippingLogs={shippingLogs}
          onClose={() => setViewingShippingEvent(null)}
        />
      )}
      {reportGroupData && (
        <ReportGroupModal 
            group={reportGroupData} 
            onClose={() => setReportGroupData(null)} 
        />
      )}
      {blockedCutModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Reversão bloqueada</h3>
                <p className="text-gray-400 text-sm">
                  Bobina mãe: {blockedCutModal.motherCode}
                </p>
              </div>
              <button
                onClick={() => setBlockedCutModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
              <p className="text-sm text-gray-400 mb-4">
                As bobinas B2 abaixo já foram usadas em produção. Apague a produção antes de reverter o corte.
              </p>
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-900 text-gray-400 sticky top-0">
                  <tr>
                    <th className="p-2">B2</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Produções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {blockedCutModal.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/50">
                      <td className="p-2 font-mono text-xs text-blue-300">{item.b2Code}</td>
                      <td className="p-2">{item.b2Name}</td>
                      <td className="p-2 text-xs text-gray-400">
                        {(item.prodIds || []).join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end">
              <Button variant="secondary" onClick={() => setBlockedCutModal(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      {adminUserMovementsModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Movimentações do usuário</h3>
                <p className="text-gray-400 text-sm">{adminUserMovementsModal}</p>
              </div>
              <button
                onClick={() => setAdminUserMovementsModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
              {selectedUserEvents.length === 0 ? (
                <div className="text-sm text-gray-400">Sem movimentações.</div>
              ) : (
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Detalhe</th>
                      <th className="p-2">Referência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {selectedUserEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-700/50">
                        <td className="p-2 text-xs text-gray-400">
                          {formatEventDate(event.timestamp || event.createdAt)}
                        </td>
                        <td className="p-2 text-xs font-semibold">
                          {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                        </td>
                        <td className="p-2">{describeEvent(event)}</td>
                        <td className="p-2 text-xs text-gray-400">{event.referenceId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end">
              <Button variant="secondary" onClick={() => setAdminUserMovementsModal(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      {adminMovementEditForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Editar movimentaÃ§Ã£o</h3>
                <p className="text-gray-400 text-sm">
                  {adminMovementEditForm.collection} Â· {adminMovementEditForm.id}
                </p>
              </div>
              <button
                onClick={() => setAdminMovementEditForm(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Data"
                  value={adminMovementEditForm.date || ''}
                  onChange={(e) =>
                    setAdminMovementEditForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />

                {adminMovementEditForm.collection === 'cuttingLogs' && (
                  <>
                    <Input
                      label="MP"
                      value={adminMovementEditForm.motherCode || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, motherCode: e.target.value }))
                      }
                    />
                    <Input
                      label="Peso (kg)"
                      value={adminMovementEditForm.inputWeight || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, inputWeight: e.target.value }))
                      }
                    />
                    <Input
                      label="Qtd B2"
                      value={adminMovementEditForm.outputCount || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, outputCount: e.target.value }))
                      }
                    />
                    <Input
                      label="Sucata (kg)"
                      value={adminMovementEditForm.scrap || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, scrap: e.target.value }))
                      }
                    />
                    <Input
                      label="Itens gerados"
                      value={adminMovementEditForm.generatedItems || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, generatedItems: e.target.value }))
                      }
                    />
                  </>
                )}

                {adminMovementEditForm.collection === 'productionLogs' && (
                  <>
                    <Input
                      label="CÃ³digo"
                      value={adminMovementEditForm.productCode || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, productCode: e.target.value }))
                      }
                    />
                    <Input
                      label="DescriÃ§Ã£o"
                      value={adminMovementEditForm.productName || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, productName: e.target.value }))
                      }
                    />
                    <Input
                      label="Qtd (pcs)"
                      value={adminMovementEditForm.pieces || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, pieces: e.target.value }))
                      }
                    />
                    <Input
                      label="Peso (kg)"
                      value={adminMovementEditForm.weight || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, weight: e.target.value }))
                      }
                    />
                    <Input
                      label="CÃ³digo B2"
                      value={adminMovementEditForm.b2Code || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, b2Code: e.target.value }))
                      }
                    />
                    <Input
                      label="MP"
                      value={adminMovementEditForm.motherCode || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, motherCode: e.target.value }))
                      }
                    />
                    <Input
                      label="Sucata (kg)"
                      value={adminMovementEditForm.scrap || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, scrap: e.target.value }))
                      }
                    />
                  </>
                )}

                {adminMovementEditForm.collection === 'shippingLogs' && (
                  <>
                    <Input
                      label="CÃ³digo"
                      value={adminMovementEditForm.productCode || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, productCode: e.target.value }))
                      }
                    />
                    <Input
                      label="DescriÃ§Ã£o"
                      value={adminMovementEditForm.productName || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, productName: e.target.value }))
                      }
                    />
                    <Input
                      label="Qtd (pcs)"
                      value={adminMovementEditForm.quantity || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, quantity: e.target.value }))
                      }
                    />
                    <Input
                      label="Destino"
                      value={adminMovementEditForm.destination || ''}
                      onChange={(e) =>
                        setAdminMovementEditForm((prev) => ({ ...prev, destination: e.target.value }))
                      }
                    />
                  </>
                )}
              </div>
            </div>
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdminMovementEditForm(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={saveAdminMovementEdit}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
      {adminCatalogEditForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Editar produto do catálogo</h3>
                <p className="text-gray-400 text-sm">{adminCatalogEditForm.code}</p>
              </div>
              <button
                onClick={() => {
                  setAdminCatalogEdit(null);
                  setAdminCatalogEditForm(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código"
                  value={adminCatalogEditForm.code}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  readOnly
                />
                <Input
                  label="Descrição"
                  value={adminCatalogEditForm.name}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  label="Código B2"
                  value={adminCatalogEditForm.b2Code}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, b2Code: e.target.value }))
                  }
                />
                <Input
                  label="Descrição B2"
                  value={adminCatalogEditForm.b2Name}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, b2Name: e.target.value }))
                  }
                />
                <Input
                  label="Largura"
                  value={adminCatalogEditForm.width}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, width: e.target.value }))
                  }
                />
                <Input
                  label="Espessura"
                  value={adminCatalogEditForm.thickness}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, thickness: e.target.value }))
                  }
                />
                <Input
                  label="Tipo"
                  value={adminCatalogEditForm.type}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                />
                <Input
                  label="Código MP"
                  value={adminCatalogEditForm.motherCode}
                  onChange={(e) =>
                    setAdminCatalogEditForm((prev) => ({ ...prev, motherCode: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setAdminCatalogEdit(null);
                  setAdminCatalogEditForm(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={saveAdminCatalogEdit}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
      {adminMotherCatalogEditForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg">Editar catálogo de bobinas</h3>
                <p className="text-gray-400 text-sm">{adminMotherCatalogEditForm.code}</p>
              </div>
              <button
                onClick={() => setAdminMotherCatalogEditForm(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código"
                  value={adminMotherCatalogEditForm.code}
                  onChange={(e) =>
                    setAdminMotherCatalogEditForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  readOnly
                />
                <Input
                  label="Descrição"
                  value={adminMotherCatalogEditForm.description}
                  onChange={(e) =>
                    setAdminMotherCatalogEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
                <Input
                  label="Espessura"
                  value={adminMotherCatalogEditForm.thickness}
                  onChange={(e) =>
                    setAdminMotherCatalogEditForm((prev) => ({ ...prev, thickness: e.target.value }))
                  }
                />
                <Input
                  label="Tipo"
                  value={adminMotherCatalogEditForm.type}
                  onChange={(e) =>
                    setAdminMotherCatalogEditForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdminMotherCatalogEditForm(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={saveAdminMotherCatalogEdit}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
      {viewingMpDetails && (
        <MpDetailsModal 
            data={viewingMpDetails} 
            onClose={() => setViewingMpDetails(null)} 
        />
      )}
      {viewingProdDetails && (
  <ProductDetailsModal
    data={viewingProdDetails}
    onClose={() => setViewingProdDetails(null)}
  />
)}


      {selectedGlobalGroup && (
        <DailyGlobalModal
          group={selectedGlobalGroup}
          onClose={() => setSelectedGlobalGroup(null)}
        />
      )}


      {showHistoryModal && selectedGroupData && (
  <ProductHistoryModal
    product={selectedGroupData}
    logs={
      selectedGroupData.context === 'CORTE' || selectedGroupData.type === 'CORTE'
        ? cuttingLogs // cortes
        : dedupeProductionLogs(productionLogs) // produção
    }
    motherCoils={motherCoils}  // 👈 NOVO
    onClose={() => setShowHistoryModal(false)}
    onReprint={handleReprintProduct}
  />
)}




    </div>   
  );
};

// ==========================================================
// COLE ISTO NO FINAL ABSOLUTO DO ARQUIVO (FORA DA FUNÇÃO APP)
// ==========================================================

const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0];
  return firstLine.includes(';') ? ';' : ',';
};

const parseCSVLine = (text, delimiter) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { 
        insideQuotes = !insideQuotes; 
    } else if (char === delimiter && !insideQuotes) { 
        currentRow.push(currentCell.trim()); 
        currentCell = ''; 
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentCell || currentRow.length > 0) { 
          currentRow.push(currentCell.trim()); 
          rows.push(currentRow); 
          currentRow = []; 
          currentCell = ''; 
      }
    } else { 
        currentCell += char; 
    }
  }
  
  if (currentCell || currentRow.length > 0) { 
      currentRow.push(currentCell.trim()); 
      rows.push(currentRow); 
  }
  
  return rows;
};
