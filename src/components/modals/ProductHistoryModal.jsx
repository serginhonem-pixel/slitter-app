import React from 'react';
import { X, Printer } from 'lucide-react';
import Button from '../ui/Button';

const ProductHistoryModal = ({ product, logs, onClose, onReprint }) => {
  if (!product) return null;

  const baseCode = String(product.code || '').trim();
  const mode = product.context || product.type || null; // 'PRODUÇÃO' | 'CORTE' | etc.
  const safeLogs = Array.isArray(logs) ? logs : [];

  const getDateObj = (l) => {
    if (l.timestamp) return new Date(l.timestamp);
    if (l.date) {
      if (typeof l.date === 'string' && l.date.includes('/')) {
        const [d, m, y] = l.date.split('/');
        return new Date(`${y}-${m}-${d}T12:00:00`);
      }
      return new Date(l.date);
    }
    return new Date(0);
  };

  const history = safeLogs
    .filter((l) => {
      const lotId = String(l.id || '').trim();
      const lotBase = lotId.includes('-')
        ? lotId.split('-')[0]
        : lotId;

      const prodCode = String(l.productCode || '').trim();

      // 🔹 Se veio do contexto CORTE:
      if (mode === 'CORTE') {
        // normalmente os cortes usam o id base (ex: 10262, 10262-1, 10262-2...)
        return lotBase === baseCode || prodCode === baseCode;
      }

      // 🔹 Contexto padrão = PRODUÇÃO
      return prodCode === baseCode;
    })
    .sort((a, b) => getDateObj(b) - getDateObj(a));

  const totalPieces = history.reduce(
    (acc, curr) => acc + (curr.pieces || 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Histórico de Lotes</h3>
            <p className="text-blue-400 text-sm font-bold">
              {product.code} - {product.name}
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
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum lote produzido ainda.
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">ID Lote</th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Pacote</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50">
                    <td className="p-2 font-mono text-xs text-blue-300">
                      {log.id}
                    </td>
                    <td className="p-2 text-gray-400">
                      {log.date ||
                        (log.timestamp &&
                          new Date(log.timestamp).toLocaleDateString('pt-BR'))}
                    </td>
                    <td className="p-2 text-xs">
                      {log.packIndex ? (
                        <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded border border-blue-900">
                          {log.packIndex}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-400">
                      {(log.pieces || 0) + ' pçs'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onReprint && onReprint(log)}
                        className="p-1.5 bg-gray-700 text-gray-200 rounded hover:bg-white hover:text-black transition-colors"
                        title="Imprimir este lote"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Total Produzido: {totalPieces} peças
          </span>
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-4 py-1 text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductHistoryModal;