import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';

/**
 * Componente para exibir tabela de estoque com filtros e paginação
 */
const StockTable = ({ 
  data = [], 
  type = 'mother', // 'mother' ou 'b2'
  onViewDetails = null,
  onExport = null,
  isLoading = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      const code = String(item.code || '').toLowerCase();
      const name = String(item.material || item.name || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  }, [data, searchQuery]);

  // Paginar dados
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isMother = type === 'mother';

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl border border-white/5 p-6">
        <div className="text-center text-gray-500 py-8">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl border border-white/5 p-6">
      {/* Cabeçalho com Filtro */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">
          {isMother ? 'Estoque de Matéria-Prima (MP)' : 'Estoque de Bobinas 2 (B2)'}
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {onExport && (
            <button
              onClick={() => onExport(filteredData)}
              className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors"
              title="Exportar"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {filteredData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Nenhum item encontrado
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900/50 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">
                    {isMother ? 'Material' : 'Descrição'}
                  </th>
                  {isMother && <th className="p-3">Largura (mm)</th>}
                  <th className="p-3 text-right">Qtd</th>
                  <th className="p-3 text-right">Peso Total (kg)</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-blue-300">
                      {item.code}
                    </td>
                    <td className="p-3 text-gray-300">
                      {item.material || item.name}
                    </td>
                    {isMother && (
                      <td className="p-3 text-gray-400">
                        {item.width || '-'}
                      </td>
                    )}
                    <td className="p-3 text-right font-bold">
                      {item.count || '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400">
                      {item.weight
                        ? item.weight.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {onViewDetails && (
                        <button
                          onClick={() => onViewDetails(item.code, type)}
                          className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded transition-colors inline-flex"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Página {currentPage} de {totalPages} ({filteredData.length} itens)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-gray-700 text-gray-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockTable;
