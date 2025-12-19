import React from 'react';
import { Eye, AlertCircle, TrendingUp } from 'lucide-react';

/**
 * Componente para exibir os últimos movimentos/eventos do sistema
 * Facilita a auditoria e correção de erros de lançamento
 */
const LatestMovementsPanel = ({ events = [], onViewDetails = null, isLoading = false }) => {
  // Mapeamento de tipos de eventos para labels e cores
  const eventTypeMap = {
    MP_ENTRY: { label: 'Entrada MP', color: 'bg-blue-600/20 text-blue-400', icon: '📦' },
    B2_ENTRY_NF: { label: 'Entrada B2 (NF)', color: 'bg-purple-600/20 text-purple-400', icon: '📋' },
    B2_CUT: { label: 'Corte B2', color: 'bg-orange-600/20 text-orange-400', icon: '✂️' },
    PA_PRODUCTION: { label: 'Produção PA', color: 'bg-green-600/20 text-green-400', icon: '⚙️' },
    PA_SHIPPING: { label: 'Expedição PA', color: 'bg-red-600/20 text-red-400', icon: '🚚' },
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeInfo = (eventType) => {
    return eventTypeMap[eventType] || {
      label: eventType,
      color: 'bg-gray-600/20 text-gray-400',
      icon: '•',
    };
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Últimos Movimentos</h3>
        </div>
        <div className="text-center text-gray-500 py-8">Carregando...</div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Últimos Movimentos</h3>
        </div>
        <div className="text-center text-gray-500 py-8">Nenhum movimento registrado</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          <h3 className="text-lg font-bold text-white">Últimos Movimentos</h3>
          <span className="text-xs text-gray-500 ml-2">({events.length} registros)</span>
        </div>
      </div>

      {/* Lista de eventos */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar-dark">
        {events.slice(0, 10).map((event, index) => {
          const eventInfo = getEventTypeInfo(event.eventType);

          return (
            <div
              key={event.id || index}
              className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600 transition-all hover:bg-gray-800/50"
            >
              {/* Linha principal */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Ícone e tipo */}
                  <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${eventInfo.color}`}>
                    {eventInfo.icon} {eventInfo.label}
                  </div>

                  {/* Informações principais */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300">
                      <span className="font-mono text-blue-300">{event.sourceId}</span>
                      {event.targetIds && event.targetIds.length > 0 && (
                        <>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="font-mono text-green-300">
                            {event.targetIds.length} item{event.targetIds.length !== 1 ? 'ns' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Botão de detalhes */}
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(event)}
                    className="p-1.5 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded transition-colors flex-shrink-0"
                    title="Ver detalhes"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>

              {/* Detalhes adicionais (se houver) */}
              {event.details && Object.keys(event.details).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/30 text-xs text-gray-500">
                  {Object.entries(event.details)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-600">{key}:</span> {String(value).substring(0, 30)}
                        {String(value).length > 30 ? '...' : ''}
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé com aviso */}
      {events.length > 10 && (
        <div className="mt-4 pt-3 border-t border-gray-700/50 text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle size={14} />
          Mostrando 10 de {events.length} movimentos
        </div>
      )}
    </div>
  );
};

export default LatestMovementsPanel;
