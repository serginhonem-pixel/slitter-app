import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

const toIso = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.includes('/')) return value.split('/').reverse().join('-');
  return value;
};

const toTimestamp = (value) => {
  const iso = toIso(value);
  if (!iso) return 0;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const parseGeneratedItems = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(', ')
    .map((itemStr) => {
      const match = itemStr.match(/^([^-]+) - (.*) \(([\d.,]+)kg\)$/);
      if (match) {
        const weight = parseFloat(match[3].replace(',', '.'));
        return {
          id: '-',
          code: match[1].trim(),
          name: match[2].trim(),
          weight: Number.isFinite(weight) ? weight : 0,
        };
      }
      return { id: '-', code: '-', name: itemStr, weight: 0 };
    })
    .filter(Boolean);
};

const CutEventDetailsModal = ({
  event,
  motherCoils = [],
  childCoils = [],
  cuttingLogs = [],
  onClose,
}) => {
  const details = event?.details || {};
  const sourceId = event?.sourceId;
  const targetIds = Array.isArray(event?.targetIds) ? event.targetIds : [];
  const cutLogId = details.cuttingLogId || details.logId;
  const cutLog =
    (cutLogId && cuttingLogs.find((log) => String(log.id) === String(cutLogId))) || null;

  const mother = useMemo(() => {
    if (!event) return null;
    const byId = motherCoils.find((m) => String(m.id) === String(sourceId));
    if (byId) return byId;
    const code = details.motherCode || details.code || event?.raw?.motherCode;
    if (!code) return null;
    const matches = motherCoils.filter((m) => String(m.code) === String(code));
    if (matches.length <= 1) return matches[0] || null;
    return matches
      .slice()
      .sort((a, b) => toTimestamp(b.entryDate || b.date) - toTimestamp(a.entryDate || a.date))[0];
  }, [event, motherCoils, sourceId, details]);

  const childItems = useMemo(() => {
    const explicitChildIds = [
      ...targetIds,
      ...(Array.isArray(details.childIds) ? details.childIds : []),
    ].map(String);

    if (explicitChildIds.length === 0) return [];

    return explicitChildIds
      .map((id) => childCoils.find((c) => String(c.id) === String(id)))
      .filter(Boolean);
  }, [childCoils, targetIds, details.childIds]);

  const generatedItems = useMemo(() => {
    const value = cutLog?.generatedItems || details.generatedItems;
    return parseGeneratedItems(value);
  }, [cutLog, details.generatedItems]);
  const listItems = childItems.length > 0 ? childItems : generatedItems;

  const totalProducedWeight = listItems.reduce(
    (acc, item) => acc + (Number(item?.weight) || 0),
    0,
  );
  const originalWeight = Number(
    mother?.originalWeight ?? details.originalWeight ?? mother?.weight ?? 0,
  );
  const consumedWeight = Number(
    cutLog?.inputWeight ??
      details.inputWeight ??
      details.totalWeight ??
      details.weight ??
      0,
  );
  const scrapWeight = Number(
    cutLog?.scrap ?? cutLog?.scrapWeight ?? details.scrap ?? details.scrapKg ?? 0,
  );
  const remainingWeight =
    mother?.remainingWeight ??
    details.remainingWeight ??
    Math.max(0, originalWeight - consumedWeight);
  const expectedCount = Number(
    details.childCount || details.newChildCount || details.outputCount || 0,
  );
  const extraCount = Math.max(0, expectedCount - listItems.length);
  const manualWeight = Math.max(
    0,
    consumedWeight - totalProducedWeight - scrapWeight,
  );
  const totalGeneratedWeight = totalProducedWeight + manualWeight;
  const totalGeneratedCount = childItems.length + (extraCount > 0 ? extraCount : 0);

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Detalhes do Corte</h3>
            <p className="text-purple-300 text-sm font-semibold">
              Movimento ID: {event?.id || '-'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg">
            <div>
              Bobina mae:{' '}
              <strong className="text-gray-200">{mother?.code || details.motherCode || '-'}</strong>
            </div>
            <div>
              Material:{' '}
              <strong className="text-gray-200">
                {mother?.material || details.motherMaterial || details.material || '-'}
              </strong>
            </div>
            <div>
              Peso original:{' '}
              <strong className="text-gray-200">
                {originalWeight ? originalWeight.toLocaleString('pt-BR') : '-'} kg
              </strong>
            </div>
            <div>
              Saldo atual:{' '}
              <strong className="text-gray-200">
                {Number.isFinite(remainingWeight)
                  ? remainingWeight.toLocaleString('pt-BR')
                  : '-'}{' '}
                kg
              </strong>
            </div>
            <div>
              Peso consumido:{' '}
              <strong className="text-gray-200">
                {consumedWeight ? consumedWeight.toLocaleString('pt-BR') : '-'} kg
              </strong>
            </div>
            <div>
              Sucata:{' '}
              <strong className="text-red-400">
                {scrapWeight.toLocaleString('pt-BR')} kg
              </strong>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>
                Itens gerados: <strong className="text-gray-300">{totalGeneratedCount}</strong>
              </span>
              <span>
                Peso total gerado:{' '}
                <strong className="text-gray-300">
                  {totalGeneratedWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                </strong>
              </span>
            </div>
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">ID B2</th>
                  <th className="p-2">Codigo</th>
                  <th className="p-2">Descricao</th>
                  <th className="p-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {listItems.length === 0 && manualWeight <= 0 ? (
                  <tr>
                    <td className="p-3 text-gray-500 text-center" colSpan="4">
                      Nenhuma bobina filha encontrada para este corte.
                    </td>
                  </tr>
                ) : (
                  <>
                    {listItems.map((item) => (
                      <tr key={`${item.id}-${item.code}-${item.name}`} className="hover:bg-gray-700/50">
                        <td className="p-2 font-mono text-xs text-blue-300">{item.id || '-'}</td>
                        <td className="p-2 font-mono text-xs text-emerald-300">
                          {item.b2Code || item.code || '-'}
                        </td>
                        <td className="p-2 text-white">{item.b2Name || item.name || item.material || '-'}</td>
                        <td className="p-2 text-right font-mono">
                          {Number(item.weight || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </td>
                      </tr>
                    ))}
                    {manualWeight > 0 && (
                      <tr className="hover:bg-gray-700/50">
                        <td className="p-2 font-mono text-xs text-blue-300">-</td>
                        <td className="p-2 font-mono text-xs text-emerald-300">
                          {extraCount > 0 ? `${extraCount}x` : '-'}
                        </td>
                        <td className="p-2 text-white">
                          Consumo direto / manual
                        </td>
                        <td className="p-2 text-right font-mono">
                          {manualWeight.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="px-4 py-1 text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CutEventDetailsModal;
