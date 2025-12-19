import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Eye,
  Factory,
  History,
  Package,
  Scissors,
  Truck,
  Boxes,
} from 'lucide-react';
import { EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../../utils/constants';
import PaginationControls from '../common/PaginationControls';

const ITEMS_PER_PAGE = 8;

const TYPE_ICON = {
  [EVENT_TYPES.MP_ENTRY]: Package,
  [EVENT_TYPES.B2_ENTRY_NF]: Boxes,
  [EVENT_TYPES.B2_CUT]: Scissors,
  [EVENT_TYPES.PA_PRODUCTION]: Factory,
  [EVENT_TYPES.PA_SHIPPING]: Truck,
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.includes('/')) {
    const [datePart, timePart = '00:00'] = trimmed.split(' ');
    const [day, month, year] = datePart.split('/');
    const iso = `${year}-${month}-${day}T${timePart}`;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildSummary = (event) => {
  const { eventType, details = {}, raw } = event;
  if (eventType === EVENT_TYPES.MP_ENTRY) {
    return `Entrada da bobina ${details.code || raw?.code || event.sourceId} (${details.weight || raw?.weight || '-'} kg) NF ${
      details.nf || raw?.nf || '-'
    }`;
  }
  if (eventType === EVENT_TYPES.B2_ENTRY_NF) {
    return `Entrada B2 ${details.b2Code || raw?.b2Code || event.sourceId} (${details.weight || raw?.weight || '-'} kg)`;
  }
  if (eventType === EVENT_TYPES.B2_CUT) {
    return `Corte da bobina ${details.motherCode || raw?.motherCode || event.sourceId} - ${
      details.newChildCount || raw?.outputCount || 0
    } B2 - Sucata ${details.scrap ?? raw?.scrap ?? 0} kg`;
  }
  if (eventType === EVENT_TYPES.PA_PRODUCTION) {
    const lotLabel = details.lotBaseId ? `Lote ${details.lotBaseId} - ` : '';
    return `${lotLabel}Produ\u00e7\u00e3o ${details.productCode || raw?.productCode || event.sourceId} - ${
      details.pieces || raw?.pieces || 0
    } pe\u00e7as`;
  }
  if (eventType === EVENT_TYPES.PA_SHIPPING) {
    return `Expedi\u00e7\u00e3o ${details.productCode || raw?.productCode || event.sourceId} - ${
      details.quantity || raw?.quantity || 0
    } pe\u00e7as`;
  }
  return details.description || '-';
};

const getProductionGroupKey = (event) => {
  if (!event || event.eventType !== EVENT_TYPES.PA_PRODUCTION) return null;
  const tracking = event.raw?.trackingId || event.details?.trackingId;
  if (!tracking) return null;
  const parts = String(tracking).split('-');
  if (parts.length <= 1) return tracking;
  return parts.slice(0, -1).join('-');
};

const getLogKey = (log) => {
  if (!log) return '';
  if (log.id) return String(log.id);
  const tracking = log.trackingId || '';
  const pack = log.packIndex || '';
  const date = log.date || '';
  const qty = log.pieces || '';
  return `${tracking}|${pack}|${date}|${qty}`;
};

const getLotLogs = (groupKey, productionLogs) => {
  if (!groupKey || !Array.isArray(productionLogs)) return [];
  const logs = productionLogs.filter((log) =>
    String(log.trackingId || '').startsWith(String(groupKey)),
  );
  const unique = new Map();
  logs.forEach((log) => {
    const key = getLogKey(log);
    if (!key || unique.has(key)) return;
    unique.set(key, log);
  });
  return Array.from(unique.values());
};

const groupProductionEvents = (events, productionLogs = []) => {
  const result = [];
  const map = new Map();

  events.forEach((event) => {
    const groupKey = getProductionGroupKey(event);
    if (!groupKey) {
      result.push(event);
      return;
    }

    if (!map.has(groupKey)) {
      const lotLogs = getLotLogs(groupKey, productionLogs);
      const lotPieces = lotLogs.reduce(
        (acc, log) => acc + (Number(log?.pieces) || 0),
        0,
      );
      const clone = {
        ...event,
        details: {
          ...event.details,
          lotBaseId: groupKey,
          productCode:
            event.details?.productCode || lotLogs[0]?.productCode || event.raw?.productCode,
          productName:
            event.details?.productName || lotLogs[0]?.productName || event.raw?.productName,
          pieces: lotPieces || Number(event.details?.pieces || event.raw?.pieces || 0),
        },
        referenceId: groupKey,
        rawLogs: lotLogs,
        targetIds: lotLogs.map((log) => log.id),
      };
      map.set(groupKey, clone);
      result.push(clone);
      return;
    }

    const grouped = map.get(groupKey);
    if (!productionLogs.length) {
      const pieces = Number(event.details?.pieces || event.raw?.pieces || 0);
      grouped.details = {
        ...grouped.details,
        pieces: Number(grouped.details?.pieces || 0) + pieces,
      };
    }
    if (!grouped.rawLogs?.length && event.raw) grouped.rawLogs = [event.raw];
    if ((!grouped.targetIds || grouped.targetIds.length === 0) && Array.isArray(event.targetIds)) {
      grouped.targetIds = Array.from(new Set(event.targetIds));
    }
  });

  return result;
};

export const LatestMovementsPanel = ({ events = [], isLoading = false, onViewDetails, productionLogs = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const sortedEvents = groupProductionEvents([...events], productionLogs).sort((a, b) => {
    const aTime = toTimestamp(a.timestamp || a.createdAt || a.raw?.timestamp);
    const bTime = toTimestamp(b.timestamp || b.createdAt || b.raw?.timestamp);
    return bTime - aTime;
  });
  const paginatedEvents = useMemo(
    () =>
      sortedEvents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [sortedEvents, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedEvents.length]);

  const renderEmpty = () => (
    <div className="text-center text-gray-500 py-8">Nenhum movimento registrado.</div>
  );

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Ultimos Movimentos</h3>
          {sortedEvents.length > 0 && (
            <span className="text-xs text-gray-500 ml-2">({sortedEvents.length} registros)</span>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={14} className="animate-spin" /> Atualizando...
          </div>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto custom-scrollbar-dark flex-1 min-h-[260px]">
        {isLoading && sortedEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Carregando movimentações...</div>
        ) : sortedEvents.length === 0 ? (
          renderEmpty()
        ) : (
          paginatedEvents.map((event) => {
            const Icon = TYPE_ICON[event.eventType] || Activity;
            const label = EVENT_TYPE_LABELS[event.eventType] || event.eventType;
            const color = EVENT_TYPE_COLORS[event.eventType] || 'text-gray-400';
            const timestamp = event.timestamp || event.createdAt;
            const summary = event.summary || buildSummary(event);
            const referenceId =
              event.referenceId ||
              event.sourceId ||
              event.details?.code ||
              event.details?.productCode ||
              event.details?.motherCode ||
              event.details?.b2Code ||
              event.raw?.code ||
              '-';

            return (
              <div
                key={event.id || `${event.eventType}-${event.timestamp}`}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full bg-gray-800/70 ${color.replace('text', 'border')} border`}>
                    <Icon size={18} className={color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${color}`}>{label}</p>
                        <p className="text-xs text-gray-400 font-mono break-all">
                          Movimento ID: {event.id || '-'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono break-all">
                          ID referencia: {referenceId}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">{summary}</p>
                      </div>
                      {onViewDetails && (
                        <button
                          className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                          onClick={() => onViewDetails(event)}
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      <div className="text-[11px] text-gray-500">
                        {formatDateTime(timestamp)}
                        {event.targetIds?.length
                          ? ` • ${event.targetIds.length} item(s) afetados`
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalItems={sortedEvents.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default LatestMovementsPanel;

