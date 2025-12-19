// src/components/Production/ProductionProcess.jsx
import React, { useState, useMemo } from 'react';
import { Factory, History, Printer, Trash2, List } from 'lucide-react';
import Card from '../Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import PaginationControls from '../PaginationControls'; // Assumindo que você tem um componente de paginação

// Assumindo que estas props serão passadas pelo App.jsx
const ProductionProcess = ({
    childCoils, productionLogs, productCatalog,
    selectedInputCoils, setSelectedInputCoils,
    filterB2Type, setFilterB2Type,
    b2SearchQuery, setB2SearchQuery,
    selectedProductCode, setSelectedProductCode,
    productionDate, setProductionDate,
    totalProducedPieces, setTotalProducedPieces,
    standardPackSize, setStandardPackSize,
    prodScrap, setProdScrap,
    registerProduction,
    logsPage, setLogsPage, ITEMS_PER_PAGE,
    setSelectedGroupData, setShowHistoryModal
}) => {

    // 1. Filtros e Listas (Blindados contra erro de busca)
    const availableForSelect = childCoils.filter(c => {
       if (c.status !== 'stock') return false;
       if (selectedInputCoils.find(sel => sel.id === c.id)) return false; 
       if (filterB2Type && c.type !== filterB2Type) return false;
       
       if (b2SearchQuery) {
         const query = b2SearchQuery.toLowerCase();
         const matchCode = String(c.b2Code).toLowerCase().includes(query);
         const matchName = String(c.b2Name).toLowerCase().includes(query);
         if (!matchCode && !matchName) return false;
       }
       return true;
    });

    const uniqueTypes = [...new Set(childCoils.map(c => c.type).filter(Boolean))];

    // --- NOVA LÓGICA DE AGRUPAMENTO ---
    const groupedLogs = useMemo(() => {
        return productionLogs.reduce((acc, log) => {
            const code = log.productCode;
            if (!acc[code]) {
                acc[code] = {
                    productCode: code,
                    productName: log.productName,
                    totalPieces: 0,
                    logs: [],
                    lastDate: log.date,
                    lastTimestamp: log.timestamp || log.date // Para ordenação
                };
            }
            acc[code].totalPieces += Number(log.pieces);
            acc[code].logs.push(log);
            // Mantém a data mais recente
            if (new Date(log.timestamp || log.date) > new Date(acc[code].lastTimestamp)) {
                acc[code].lastDate = log.date;
                acc[code].lastTimestamp = log.timestamp || log.date;
            }
            return acc;
        }, {});
    }, [productionLogs]);

    // Transforma em array e ordena pelo movimento mais recente
    const groupedList = useMemo(() => {
        return Object.values(groupedLogs).sort((a, b) => {
            return new Date(b.lastTimestamp) - new Date(a.lastTimestamp);
        });
    }, [groupedLogs]);

    // Paginação aplicada aos GRUPOS agora
    const paginatedGroups = groupedList.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);

    // Totais visuais (Mantido igual)
    const totalInputWeight = selectedInputCoils.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
    const totalPcs = parseInt(totalProducedPieces) || 0;
    const packStd = parseInt(standardPackSize) || totalPcs || 1;
    const fullPacks = Math.floor(totalPcs / packStd);
    const rest = totalPcs % packStd;

    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-7 flex flex-col gap-6">
           <Card>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2"><Factory className="text-emerald-500"/> Produção por Total</h2>
             </div>
             
             <div className="space-y-4">
                {/* --- ÁREA 1: BOBINAS (Entrada) --- */}
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                   <div className="flex justify-between mb-2 items-center">
                      <label className="text-xs font-bold text-gray-500 uppercase">1. Matéria Prima</label>
                      <span className="text-xs text-blue-400 font-bold">{selectedInputCoils.length} bobinas | {totalInputWeight.toFixed(1)} kg</span>
                   </div>

                   <div className="flex gap-2 mb-2">
                       {uniqueTypes.length > 0 && ( 
                         <select className="bg-gray-800 text-xs text-white border border-gray-600 rounded p-1" value={filterB2Type} onChange={e => setFilterB2Type(e.target.value)}>
                           <option value="">Tipo: Todos</option>
                           {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       )}
                       <input type="text" placeholder="Buscar..." value={b2SearchQuery} onChange={e => setB2SearchQuery(e.target.value)} className="flex-1 bg-gray-800 text-xs text-white border border-gray-600 rounded p-1 pl-2 outline-none"/>
                   </div>

                   <select 
                     className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-gray-200 outline-none text-sm focus:border-blue-500 transition-colors" 
                     value="" 
                     onChange={(e) => { 
                        const newId = e.target.value;
                        if (!newId) return;
                        const coilToAdd = childCoils.find(c => String(c.id) === String(newId));
                        if (coilToAdd) {
                             const newList = [...selectedInputCoils, coilToAdd];
                             setSelectedInputCoils(newList);
                             if (newList.length === 1) {
                                 const match = productCatalog.find(p => String(p.b2Code) === String(coilToAdd.b2Code));
                                 if (match) setSelectedProductCode(match.code);
                             }
                        }
                     }}
                   >
                      <option value="">+ Adicionar bobina...</option>
                      {availableForSelect.map(c => (
                        <option key={c.id} value={c.id}>{c.b2Code} - {c.b2Name} ({c.weight}kg)</option>
                      ))}
                    </select>

                    {selectedInputCoils.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar-dark">
                            {selectedInputCoils.map((coil, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-800 px-2 py-1 rounded border border-gray-600 text-xs">
                                    <span className="text-gray-300">{coil.b2Code} ({coil.weight}kg)</span>
                                    <button onClick={() => setSelectedInputCoils(selectedInputCoils.filter(c => c.id !== coil.id))} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- ÁREA 2: DADOS DE PRODUÇÃO --- */}
                <div className="animate-fade-in">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">2. Produto Final</label>
                          <select 
                            className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-200 outline-none text-sm" 
                            value={selectedProductCode} 
                            onChange={e => setSelectedProductCode(e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {productCatalog.map(p => (
                                <option key={p.code} value={p.code}>
                                    {p.code} - {p.name}
                                </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="col-span-1">
                              <Input label="Data Produção" type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Total Produzido" type="number" placeholder="Ex: 486" value={totalProducedPieces} onChange={e => setTotalProducedPieces(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Padrão Pacote" type="number" placeholder="Ex: 100" value={standardPackSize} onChange={e => setStandardPackSize(e.target.value)} />
                          </div>
                          <div className="col-span-1">
                              <Input label="Sucata (kg)" type="number" value={prodScrap} onChange={e => setProdScrap(e.target.value)} />
                          </div>
                        </div>

                        {totalPcs > 0 && (
                            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                                <p className="text-xs text-blue-300 font-bold uppercase mb-2">Simulação de Etiquetas:</p>
                                <div className="flex flex-wrap gap-2">
                                    {fullPacks > 0 && <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center shadow-lg">{fullPacks}x pacotes de {packStd} pçs</div>}
                                    {rest > 0 && <div className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center shadow-lg">+ 1x pacote de {rest} pçs (Sobra)</div>}
                                </div>
                            </div>
                        )}

                        <Button onClick={registerProduction} variant="success" className="w-full py-4 text-lg shadow-lg mt-2" disabled={selectedInputCoils.length === 0 || !selectedProductCode || !totalProducedPieces}>
                          <Printer className="mr-2"/> Confirmar e Imprimir
                        </Button>
                      </div>
                  </div>
             </div>
           </Card>
        </div>

        {/* --- HISTÓRICO LATERAL AGRUPADO --- */}
        <div className="lg:col-span-5 h-full">
           <Card className="h-full flex flex-col bg-gray-900 border-gray-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2"><History size={20} className="text-emerald-500"/> Produção Recente</h3>
             </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3">
                 {paginatedGroups.length === 0 ? <div className="text-gray-500 text-center py-4">Nenhum registro.</div> : paginatedGroups.map(group => (
                 <div key={group.productCode} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:bg-gray-700/80 transition-colors">
                   
                   <div className="flex justify-between mb-1">
                       <span className="text-[10px] text-emerald-400 font-mono font-bold">{group.productCode}</span>
                       <span className="text-[10px] text-gray-400">{group.lastDate}</span>
                   </div>
                   
                   <p className="font-bold text-gray-200 text-sm mb-2 truncate" title={group.productName}>{group.productName}</p>
                   
                   <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                      <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase">Total Produzido</span>
                          <span className="text-emerald-400 font-bold text-lg">{group.totalPieces} <span className="text-xs font-normal text-gray-500">pçs</span></span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         <div className="text-right mr-2">
                            <span className="block text-[10px] text-gray-500 uppercase">Lotes</span>
                            <span className="font-bold text-white text-sm">{group.logs.length}</span>
                         </div>
                         <Button 
                            onClick={() => { setSelectedGroupData({code: group.productCode, name: group.productName}); setShowHistoryModal(true); }} 
                            variant="secondary" 
                            className="h-8 px-3 text-xs"
                         >
                            <List size={14} className="mr-1"/> Detalhes
                         </Button>
                      </div>
                   </div>

                 </div>
               ))}
             </div>
             <PaginationControls currentPage={logsPage} totalItems={groupedList.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setLogsPage} />
           </Card>
        </div>
      </div>
    );
  };
