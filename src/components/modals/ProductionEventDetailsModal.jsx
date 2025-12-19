import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

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

const buildLogKey = (log) => {
  if (!log) return '';
  if (log.id) return String(log.id);
  const tracking = log.trackingId || '';
  const pack = log.packIndex || '';
  const date = log.date || '';
  const qty = log.pieces || '';
  return `${tracking}|${pack}|${date}|${qty}`;
};

const ProductionEventDetailsModal = ({
  event,
  productionLogs = [],
  childCoils = [],
  onClose,
}) => {
  const details = event?.details || {};
  const targetIds = Array.isArray(event?.targetIds) ? event.targetIds : [];
  const rawLogs = Array.isArray(event?.rawLogs) ? event.rawLogs : [];
  const lotBaseId = details.lotBaseId || event?.referenceId || '';

  const logs = useMemo(() => {
    if (rawLogs.length > 0) return rawLogs;
    if (targetIds.length > 0) {
      return targetIds
        .map((id) => productionLogs.find((log) => String(log.id) === String(id)))
        .filter(Boolean);
    }
    if (lotBaseId) {
      return productionLogs.filter(
        (log) => String(log.trackingId || '').startsWith(String(lotBaseId)),
      );
    }
    return [];
  }, [rawLogs, targetIds, productionLogs, lotBaseId]);

  const uniqueLogs = Array.from(
    logs.reduce((acc, log) => {
      const key = buildLogKey(log);
      if (!key) return acc;
      if (!acc.has(key)) acc.set(key, log);
      return acc;
    }, new Map()).values(),
  );

  const sortedLogs = [...uniqueLogs].sort(
    (a, b) => toTimestamp(b.timestamp || b.date) - toTimestamp(a.timestamp || a.date),
  );

  const totalPieces = sortedLogs.reduce((acc, log) => acc + (Number(log?.pieces) || 0), 0);
  const totalScrap = sortedLogs.reduce((acc, log) => acc + (Number(log?.scrap) || 0), 0);

  const childIds = Array.from(
    new Set(
      sortedLogs.flatMap((log) => (Array.isArray(log.childIds) ? log.childIds : [])),
    ),
  );

  const b2Items = childIds
    .map((id) => childCoils.find((c) => String(c.id) === String(id)))
    .filter(Boolean);

  const productCode =
    details.productCode || sortedLogs[0]?.productCode || event?.raw?.productCode || '-';
  const productName =
    details.productName || sortedLogs[0]?.productName || event?.raw?.productName || '-';

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Detalhes da Producao</h3>
            <p className="text-gray-400 text-sm">
              Produto: <strong className="text-white">{productCode}</strong> {productName}
            </p>
            {lotBaseId && (
              <p className="text-xs text-gray-500 font-mono">Lote base: {lotBaseId}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg">
            <div>
              Total pecas:{' '}
              <strong className="text-gray-200">{totalPieces.toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              Sucata:{' '}
              <strong className="text-red-400">{totalScrap.toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              Pacotes:{' '}
              <strong className="text-gray-200">{sortedLogs.length}</strong>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase text-gray-400 mb-2">Bobinas B2 consumidas</h4>
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
                {b2Items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-3 text-center text-gray-500">
                      Nenhuma bobina B2 vinculada.
                    </td>
                  </tr>
                ) : (
                  b2Items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/50">
                      <td className="p-2 font-mono text-xs text-blue-300">{item.id}</td>
                      <td className="p-2 font-mono text-xs text-emerald-300">{item.b2Code || '-'}</td>
                      <td className="p-2 text-white">{item.b2Name || item.material || '-'}</td>
                      <td className="p-2 text-right font-mono">
                        {Number(item.weight || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-xs uppercase text-gray-400 mb-2">Pacotes do lote</h4>
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Pacote</th>
                  <th className="p-2 text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-3 text-center text-gray-500">
                      Nenhum pacote encontrado para este lote.
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-700/50">
                      <td className="p-2 font-mono text-xs text-blue-300">{log.id}</td>
                      <td className="p-2 text-xs text-gray-400">{log.date || '-'}</td>
                      <td className="p-2 text-xs text-gray-300">{log.packIndex || '-'}</td>
                      <td className="p-2 text-right font-mono">
                        {Number(log.pieces || 0).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))
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

export default ProductionEventDetailsModal;
