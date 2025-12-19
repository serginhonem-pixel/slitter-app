import React from 'react';
import {
  Activity,
  AlertCircle,
  Eye,
  Factory,
  History,
  Package,
  Scissors,
  Truck,
  Boxes,
} from 'lucide-react';
import { EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../../utils/constants';

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
    return `Corte da bobina ${details.motherCode || raw?.motherCode || event.sourceId} • ${
      details.newChildCount || raw?.outputCount || 0
    } B2 • Sucata ${details.scrap ?? raw?.scrap ?? 0} kg`;
  }
  if (eventType === EVENT_TYPES.PA_PRODUCTION) {
    return `Produção ${details.productCode || raw?.productCode || event.sourceId} • ${
      details.pieces || raw?.pieces || 0
    } peças`;
  }
  if (eventType === EVENT_TYPES.PA_SHIPPING) {
    return `Expedição ${details.productCode || raw?.productCode || event.sourceId} • ${
      details.quantity || raw?.quantity || 0
    } peças`;
  }
  return details.description || '-';
};

export const LatestMovementsPanel = ({ events = [], isLoading = false, onViewDetails }) => {
  const renderEmpty = () => (
    <div className="text-center text-gray-500 py-8">Nenhum movimento registrado.</div>
  );

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Últimos Movimentos</h3>
          {events.length > 0 && (
            <span className="text-xs text-gray-500 ml-2">({events.length} registros)</span>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={14} className="animate-spin" /> Atualizando...
          </div>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto custom-scrollbar-dark flex-1 min-h-[260px]">
        {isLoading && events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Carregando movimentações...</div>
        ) : events.length === 0 ? (
          renderEmpty()
        ) : (
          events.slice(0, 15).map((event) => {
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
                          ID referência: {referenceId}
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

      {events.length > 15 && (
        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle size={14} />
          Mostrando 15 de {events.length} registros. Utilize o relatório completo para mais detalhes.
        </div>
      )}
    </div>
  );
};

export default LatestMovementsPanel;
