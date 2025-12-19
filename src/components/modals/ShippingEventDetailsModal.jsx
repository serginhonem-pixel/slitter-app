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

const getLotBase = (trackingId) => {
  if (!trackingId) return '';
  const parts = String(trackingId).split('-');
  if (parts.length <= 1) return String(trackingId);
  return parts.slice(0, -1).join('-');
};

const groupProductionLots = (logs = []) => {
  const map = new Map();
  logs.forEach((log) => {
    const base = getLotBase(log.trackingId || log.id || '');
    if (!base) return;
    if (!map.has(base)) {
      map.set(base, {
        lotId: base,
        productCode: log.productCode || '-',
        productName: log.productName || '-',
        pieces: 0,
        timestamp: toTimestamp(log.timestamp || log.date),
      });
    }
    const entry = map.get(base);
    entry.pieces += Number(log.pieces) || 0;
    entry.timestamp = Math.min(entry.timestamp, toTimestamp(log.timestamp || log.date) || entry.timestamp);
  });
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
};

const ShippingEventDetailsModal = ({
  event,
  productionLogs = [],
  shippingLogs = [],
  onClose,
}) => {
  const details = event?.details || {};
  const productCode = details.productCode || event?.raw?.productCode || '-';
  const productName = details.productName || event?.raw?.productName || '-';
  const shippedQty = Number(details.quantity || event?.raw?.quantity || 0);

  const shippingLog = useMemo(
    () => shippingLogs.find((log) => String(log.id) === String(event?.sourceId)),
    [shippingLogs, event?.sourceId],
  );
  const shipmentTime = toTimestamp(shippingLog?.timestamp || shippingLog?.date || details.date);

  const lots = useMemo(() => {
    const logs = productionLogs.filter(
      (log) => String(log.productCode) === String(productCode),
    );
    const grouped = groupProductionLots(logs);
    return grouped.filter((lot) => lot.timestamp <= shipmentTime || shipmentTime === 0);
  }, [productionLogs, productCode, shipmentTime]);

  const shippedBefore = useMemo(() => {
    const previous = shippingLogs.filter((log) => {
      if (String(log.productCode) !== String(productCode)) return false;
      const t = toTimestamp(log.timestamp || log.date);
      if (!t || !shipmentTime) return false;
      return t < shipmentTime;
    });
    return previous.reduce((acc, log) => acc + (Number(log.quantity) || 0), 0);
  }, [shippingLogs, productCode, shipmentTime]);

  const allocation = useMemo(() => {
    let remainingSkip = shippedBefore;
    let remainingShip = shippedQty;
    const rows = [];

    lots.forEach((lot) => {
      if (remainingShip <= 0) return;
      let available = lot.pieces;
      if (remainingSkip >= available) {
        remainingSkip -= available;
        return;
      }
      available -= remainingSkip;
      remainingSkip = 0;

      const take = Math.min(available, remainingShip);
      if (take > 0) {
        rows.push({ lotId: lot.lotId, qty: take });
        remainingShip -= take;
      }
    });

    if (remainingShip > 0) {
      rows.push({ lotId: 'Nao identificado', qty: remainingShip });
    }

    return rows;
  }, [lots, shippedBefore, shippedQty]);

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Detalhes da Expedicao</h3>
            <p className="text-gray-400 text-sm">
              Produto: <strong className="text-white">{productCode}</strong> {productName}
            </p>
            <p className="text-xs text-gray-500 font-mono">
              Movimento ID: {event?.sourceId || event?.id || '-'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg">
            <div>
              Quantidade expedida:{' '}
              <strong className="text-gray-200">{shippedQty.toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              Lotes encontrados:{' '}
              <strong className="text-gray-200">{allocation.length}</strong>
            </div>
          </div>

          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-900 text-gray-400 sticky top-0">
              <tr>
                <th className="p-2">Lote</th>
                <th className="p-2 text-right">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allocation.length === 0 ? (
                <tr>
                  <td colSpan="2" className="p-3 text-center text-gray-500">
                    Nenhum lote identificado para esta expedicao.
                  </td>
                </tr>
              ) : (
                allocation.map((row) => (
                  <tr key={row.lotId} className="hover:bg-gray-700/50">
                    <td className="p-2 font-mono text-xs text-blue-300">{row.lotId}</td>
                    <td className="p-2 text-right font-mono">
                      {Number(row.qty || 0).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default ShippingEventDetailsModal;
