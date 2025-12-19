import React, { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Printer } from 'lucide-react';
import Button from '../ui/Button';

const ProductHistoryModal = ({ product, logs, motherCoils = [], onClose, onReprint }) => {
  if (!product) return null;

  const baseCode = String(product.code || '').trim();
  const mode = product.context || product.type || null; // 'PRODUÇÃO' | 'CORTE'
  const safeLogs = Array.isArray(logs) ? logs : [];

  const getDateObj = (log = {}) => {
    if (log.date) {
      if (typeof log.date === 'string' && log.date.includes('/')) {
        const [d, m, y] = log.date.split('/');
        return new Date(`${y}-${m}-${d}T12:00:00`);
      }
      return new Date(log.date);
    }
    if (log.timestamp) return new Date(log.timestamp);
    return new Date(0);
  };

  const dedupedLogs = useMemo(() => {
    const map = new Map();
    safeLogs.forEach((log) => {
      const key =
        log.id ||
        `${log.productCode || ''}-${log.date || ''}-${log.packIndex || ''}-${log.timestamp || ''}`;
      if (!map.has(key)) map.set(key, log);
    });
    return Array.from(map.values());
  }, [safeLogs]);

  const history = dedupedLogs
    .filter((log) => {
      const lotId = String(log.id || '').trim();
      const lotBase = lotId.includes('-') ? lotId.split('-')[0] : lotId;
      const prodCode = String(log.productCode || '').trim();
      const motherCode = String(log.motherCode || '').trim();

      if (mode === 'CORTE') {
        return motherCode === baseCode || lotBase === baseCode || prodCode === baseCode;
      }
      return prodCode === baseCode;
    })
    .sort((a, b) => getDateObj(b) - getDateObj(a));

  const totalPieces = history.reduce((acc, curr) => acc + (curr.pieces || 0), 0);
  const safeMotherCoils = Array.isArray(motherCoils) ? motherCoils : [];
  const firstLog = history[0] || null;

  let materialInfo = '';
  if (mode === 'CORTE' && firstLog) {
    const mother = safeMotherCoils.find(
      (coil) => String(coil.code || '').trim() === baseCode,
    );

    const desc = mother?.material || firstLog.motherMaterial || firstLog.material || '';
    const width = mother?.width || firstLog.motherWidth || firstLog.width || '';
    const weight =
      firstLog.inputWeight ||
      firstLog.weight ||
      mother?.originalWeight ||
      mother?.weight ||
      '';

    materialInfo = desc || `BOBINA ${baseCode}`;
    if (width) materialInfo += ` · ${width} mm`;
    if (weight) materialInfo += ` · ${weight} kg`;
  }

  const shouldGroupByProduction = mode !== 'CORTE';

  const buildGroupKey = (log = {}) => {
    if (log.productionLogId) return String(log.productionLogId);
    if (log.trackingId) {
      const parts = String(log.trackingId).split('-');
      if (parts.length > 1) return parts.slice(0, -1).join('-');
      return String(log.trackingId);
    }
    const id = String(log.id || '');
    if (id.startsWith('TEMP-PROD-')) return id.split('-').slice(0, -1).join('-');
    return id || 'PRODUCAO';
  };

  const groupedHistory = useMemo(() => {
    if (!shouldGroupByProduction) return [];

    const groups = new Map();

    history.forEach((log) => {
      const key = buildGroupKey(log);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          entries: [],
          totalPieces: 0,
        });
      }
      const group = groups.get(key);
      group.entries.push(log);
      group.totalPieces += log.pieces || 0;
    });

    return Array.from(groups.values()).map((group) => {
      const sortedEntries = [...group.entries].sort((a, b) => getDateObj(b) - getDateObj(a));
      const displayDate =
        sortedEntries[0]?.date ||
        (sortedEntries[0]?.timestamp &&
          new Date(sortedEntries[0].timestamp).toLocaleDateString('pt-BR')) ||
        '-';
      const packSummary = sortedEntries
        .map((entry) => entry.packIndex)
        .filter(Boolean)
        .join(', ');

      return {
        key: group.key,
        entries: sortedEntries,
        totalPieces: group.totalPieces,
        date: displayDate,
        packSummary,
      };
    });
  }, [history, shouldGroupByProduction]);

  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroup = (key) =>
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Histórico de Lotes</h3>
            <p className="text-blue-400 text-sm font-bold">
              {product.code} - {product.name}
            </p>

            {materialInfo && <p className="text-xs text-gray-400 mt-1">{materialInfo}</p>}
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Total de lotes: {history.length}</p>
            <p>Total produzido: {totalPieces.toLocaleString('pt-BR')} peças</p>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Nenhum lote produzido ainda.</div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Pacote</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {shouldGroupByProduction
                  ? groupedHistory.map((group) => {
                      const isExpanded = expandedGroups[group.key] ?? false;
                      return (
                        <Fragment key={group.key}>
                          <tr className="bg-gray-900/60 text-sm">
                            <td className="p-2 font-mono text-xs text-blue-300">
                              <button
                                onClick={() => toggleGroup(group.key)}
                                className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
                                title={isExpanded ? 'Recolher lotes' : 'Expandir lotes'}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span>{group.key}</span>
                              </button>
                            </td>
                            <td className="p-2 text-gray-400">{group.date}</td>
                            <td className="p-2 text-xs text-gray-300">
                              {group.packSummary || `${group.entries.length} lote(s)`}
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-400">
                              {group.totalPieces.toLocaleString('pt-BR')} peças
                            </td>
                            <td className="p-2 text-center text-xs text-gray-400">
                              {group.entries.length} lote(s)
                            </td>
                          </tr>
                          {isExpanded &&
                            group.entries.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-700/50 text-xs">
                                <td className="p-2 pl-6 font-mono text-blue-200">↳ {log.id}</td>
                                <td className="p-2 text-gray-400">
                                  {log.date ||
                                    (log.timestamp &&
                                      new Date(log.timestamp).toLocaleDateString('pt-BR'))}
                                </td>
                                <td className="p-2">
                                  {log.packIndex ? (
                                    <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded border border-blue-900">
                                      {log.packIndex}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="p-2 text-right font-bold text-emerald-400">
                                  {(log.pieces || 0).toLocaleString('pt-BR')} peças
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
                        </Fragment>
                      );
                    })
                  : history.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-700/50">
                        <td className="p-2 font-mono text-xs text-blue-300">{log.id}</td>
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
                          {(log.pieces || 0).toLocaleString('pt-BR')} peças
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
            Total Produzido: {totalPieces.toLocaleString('pt-BR')} peças
          </span>
          <Button variant="secondary" onClick={onClose} className="px-4 py-1 text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductHistoryModal;
