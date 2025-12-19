import React from 'react';
import { History, Package, Scissors, Factory, Truck, AlertTriangle } from 'lucide-react';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, EVENT_TYPES } from '../../utils/constants';

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}>
    {children}
  </div>
);

const getIcon = (eventType) => {
  switch (eventType) {
    case EVENT_TYPES.MP_ENTRY:
      return Package;
    case EVENT_TYPES.B2_CUT:
      return Scissors;
    case EVENT_TYPES.PA_PRODUCTION:
      return Factory;
    case EVENT_TYPES.PA_SHIPPING:
      return Truck;
    default:
      return AlertTriangle;
  }
};

export const RecentActivity = ({ logs, loading, className = '' }) => {
  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <History size={24} className="text-gray-400" /> Ultimos Movimentos
      </h2>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Carregando movimentacoes...
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto custom-scrollbar-dark max-h-[400px]">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum movimento recente registrado.</p>
          ) : (
            logs.map((log, index) => {
              const Icon = getIcon(log.eventType);
              const colorClass = EVENT_TYPE_COLORS[log.eventType] || 'text-gray-400';
              const label = EVENT_TYPE_LABELS[log.eventType] || log.eventType;

              let description = '';
              if (log.eventType === EVENT_TYPES.MP_ENTRY) {
                description = `Bobina ${log.motherCode} (${log.weight}kg) entrada via NF ${log.nf || 'N/A'}`;
              } else if (log.eventType === EVENT_TYPES.B2_CUT) {
                description = `Corte da Bobina ${log.motherCode}. Gerou ${log.newChildCount} B2s. Sucata: ${log.scrapKg}kg.`;
              } else if (log.eventType === EVENT_TYPES.PA_PRODUCTION) {
                description = `Producao de ${log.pieces} pecas do produto ${log.productCode}.`;
              } else if (log.eventType === EVENT_TYPES.PA_SHIPPING) {
                description = `Expedicao de ${log.quantity} pecas do produto ${log.productCode}.`;
              } else {
                description = JSON.stringify(log.details ?? {});
              }

              return (
                <div
                  key={`${log.eventType}-${index}`}
                  className="flex items-start gap-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${colorClass}/20 shrink-0`}>
                    <Icon size={18} className={colorClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${colorClass}`}>{label}</p>
                    <p className="text-xs text-gray-300 truncate">{description}</p>
                    {log.timestamp && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {log.date} -{' '}
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
};
