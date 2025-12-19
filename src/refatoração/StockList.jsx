// src/components/Dashboard/StockList.jsx

import React, { useState } from 'react';
import { Search, Download, Package, Scissors, Factory } from 'lucide-react';
import { PaginationControls } from '../../App'; // Reutilizando o componente de paginação do App.jsx
import { ITEMS_PER_PAGE } from '../../utils/constants';

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}
  >
    {children}
  </div>
);

const StockList = ({ title, data, onExport, icon: Icon, colorClass, renderRow }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredData = data.filter(item => {
        const query = searchQuery.toLowerCase();
        return Object.values(item).some(val => 
            String(val).toLowerCase().includes(query)
        );
    });

    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <Card className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Icon size={20} className={colorClass} /> {title}
                </h3>
                <button 
                    onClick={onExport} 
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    <Download size={14} /> Exportar
                </button>
            </div>

            <div className="relative mb-4">
                <input
                    type="text"
                    placeholder={`Buscar em ${title}...`}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Resetar para a primeira página ao buscar
                    }}
                    className="w-full border border-gray-700 rounded-lg p-3 pl-10 text-sm bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                />
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-dark min-h-[200px]">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 sticky top-0">
                        {title === "Estoque Bobinas Mãe" && (
                            <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Material</th>
                                <th className="p-3 text-right">Largura</th>
                                <th className="p-3 text-right">Peso (kg)</th>
                                <th className="p-3 text-right">Qtd</th>
                            </tr>
                        )}
                        {title === "Estoque Bobinas B2" && (
                            <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Descrição</th>
                                <th className="p-3 text-right">Peso (kg)</th>
                                <th className="p-3 text-right">Qtd</th>
                            </tr>
                        )}
                        {title === "Estoque Produto Acabado" && (
                            <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Descrição</th>
                                <th className="p-3 text-right">Peças</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedData.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-gray-500 py-4">Nenhum item encontrado.</td></tr>
                        ) : (
                            paginatedData.map(renderRow)
                        )}
                    </tbody>
                </table>
            </div>

            <PaginationControls
                currentPage={currentPage}
                totalItems={filteredData.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </Card>
    );
};

export const MotherCoilStockList = ({ data, onExport }) => (
    <StockList
        title="Estoque Bobinas Mãe"
        data={data}
        onExport={onExport}
        icon={Package}
        colorClass="text-blue-400"
        renderRow={(item, index) => (
            <tr key={index} className="hover:bg-gray-700/50">
                <td className="p-3 font-mono text-xs text-blue-300">{item.code}</td>
                <td className="p-3 text-gray-300">{item.material}</td>
                <td className="p-3 text-right text-gray-200">{item.width}mm</td>
                <td className="p-3 text-right font-bold text-white">{item.weight.toFixed(0)}</td>
                <td className="p-3 text-right text-gray-400">{item.count}</td>
            </tr>
        )}
    />
);

export const ChildCoilStockList = ({ data, onExport }) => (
    <StockList
        title="Estoque Bobinas B2"
        data={data}
        onExport={onExport}
        icon={Scissors}
        colorClass="text-purple-400"
        renderRow={(item, index) => (
            <tr key={index} className="hover:bg-gray-700/50">
                <td className="p-3 font-mono text-xs text-purple-300">{item.code}</td>
                <td className="p-3 text-gray-300">{item.name}</td>
                <td className="p-3 text-right font-bold text-white">{item.weight.toFixed(0)}</td>
                <td className="p-3 text-right text-gray-400">{item.count}</td>
            </tr>
        )}
    />
);

export const FinishedStockList = ({ data, onExport }) => (
    <StockList
        title="Estoque Produto Acabado"
        data={data}
        onExport={onExport}
        icon={Factory}
        colorClass="text-emerald-400"
        renderRow={(item, index) => (
            <tr key={index} className="hover:bg-gray-700/50">
                <td className="p-3 font-mono text-xs text-emerald-300">{item.code}</td>
                <td className="p-3 text-gray-300">{item.name}</td>
                <td className="p-3 text-right font-bold text-white">{item.count}</td>
            </tr>
        )}
    />
);
