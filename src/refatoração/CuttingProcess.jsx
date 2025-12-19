// src/components/Cutting/CuttingProcess.jsx
import React, { useState, useMemo } from 'react';
import { Search, LogOut, Plus, Edit, Trash2, History } from 'lucide-react';
import Card from '../Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

// Assumindo que estas props serão passadas pelo App.jsx
const CuttingProcess = ({
    motherCoils, childCoils, cuttingLogs, INITIAL_PRODUCT_CATALOG,
    motherSearchQuery, setMotherSearchQuery,
    selectedMotherForCut, setSelectedMotherForCut,
    tempChildCoils, setTempChildCoils,
    isOtherMode, setIsOtherMode,
    otherDescription, setOtherDescription,
    cutWeight, setCutWeight,
    targetB2Code, setTargetB2Code,
    cutQuantity, setCutQuantity,
    cuttingDate, setCuttingDate,
    processScrap, setProcessScrap,
    addTempChildCoil, confirmCut
}) => {

    // 1. Filtra as bobinas mães (Busca Blindada)
    const availableMothers = motherCoils.filter(m => m.status === 'stock');
    
    const filteredMothers = availableMothers.filter(m => {
        if (!motherSearchQuery) return true;
        const search = motherSearchQuery.toLowerCase();
        const code = m.code ? String(m.code).toLowerCase() : '';
        const material = m.material ? String(m.material).toLowerCase() : '';
        return code.includes(search) || material.includes(search);
    });

    const selectedMother = motherCoils.find(m => m.id === selectedMotherForCut);

    // --- LÓGICA DE FILTRO (LÊ DIRETO DO ARQUIVO) ---
    const availableB2Types = useMemo(() => {
        if (!selectedMother) return [];

        const cleanNum = (val) => {
            if (!val) return 0;
            return parseFloat(String(val).replace(',', '.').replace('mm', '').trim());
        };
        const motherThick = cleanNum(selectedMother.thickness);
        const targetCode = String(selectedMother.code).trim();

        // Filtra direto do INITIAL_PRODUCT_CATALOG
        const filteredCatalog = INITIAL_PRODUCT_CATALOG.filter(p => {
            // 1. Vínculo pelo Código (Prioridade)
            if (p.motherCode && String(p.motherCode).trim() === targetCode) return true;
            
            // 2. Vínculo pela Espessura (Backup)
            const prodThick = cleanNum(p.thickness);
            if (Math.abs(prodThick - motherThick) < 0.05) return true;
            
            return false;
        });

        const uniqueMap = new Map();
        filteredCatalog.forEach(p => { if (!uniqueMap.has(p.b2Code)) uniqueMap.set(p.b2Code, p); });
        return Array.from(uniqueMap.values()).sort((a, b) => a.b2Name.localeCompare(b.b2Name));
    }, [selectedMother, INITIAL_PRODUCT_CATALOG]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* --- COLUNA ESQUERDA --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="font-bold text-gray-200 mb-4">1. Selecionar Origem</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input type="text" placeholder="Buscar..." className="w-full pl-10 p-3 border border-gray-700 rounded-xl bg-gray-900 text-white outline-none" value={motherSearchQuery} onChange={e => { setMotherSearchQuery(e.target.value); setSelectedMotherForCut(''); }} />
             </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[calc(100vh-260px)]">
                {filteredMothers.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMotherForCut(m.id); setTempChildCoils([]); }} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedMotherForCut === m.id ? 'bg-blue-900/20 border-blue-500 shadow-sm' : 'bg-gray-900 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800'}`}>
                    <div className="flex justify-between items-center"><span className="font-bold text-gray-200">{m.code}</span><span className="text-sm font-bold text-blue-400">{(Number(m.weight) || 0).toFixed(0)} kg</span></div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between"><span>{m.type}</span><span>{m.thickness}</span></div>
                    <div className="text-[10px] text-blue-400 mt-1 font-bold">Entrada: {m.date}</div>
                  </div>
                ))}
              </div>
           </Card>
        </div>

        {/* --- COLUNA DIREITA --- */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
           {selectedMother ? (
             <>
               {/* 1. INFO DA BOBINA */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-none md:col-span-2">
                    <div className="p-2"><h2 className="text-3xl font-bold">{selectedMother.code}</h2><p>{selectedMother.material}</p></div>
                 </Card>
                 <Card className="flex flex-col justify-center items-center bg-gray-800 border-gray-700"><p className="text-4xl font-bold text-white">{(Number(selectedMother.remainingWeight) || 0).toFixed(0)}</p><p className="text-gray-500 text-sm">kg</p></Card>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 2. CARD ADICIONAR (Com Switch) */}
                  <Card>
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-200 flex items-center gap-2">{isOtherMode ? <LogOut size={20} className="text-amber-500"/> : <Plus size={20} className="text-blue-500"/>}{isOtherMode ? "Consumo Direto / Outros" : "Adicionar Tiras Slitter"}</h3><label className="flex items-center cursor-pointer gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700 select-none"><span className={`text-xs font-bold ${!isOtherMode ? 'text-blue-400' : 'text-gray-500'}`}>Bobina 2</span><div className="relative"><input type="checkbox" className="hidden" checked={isOtherMode} onChange={e => setIsOtherMode(e.target.checked)} /><div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isOtherMode ? 'bg-amber-600' : 'bg-blue-600'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isOtherMode ? 'translate-x-5' : 'translate-x-0'}`}></div></div></div><span className={`text-xs font-bold ${isOtherMode ? 'text-amber-400' : 'text-gray-500'}`}>Outros</span></label></div>
                    <div className="space-y-4">
                      {isOtherMode ? (
                          <div className="bg-amber-900/10 p-4 rounded-lg border border-amber-500/30"><Input label="Descrição" value={otherDescription} onChange={e => setOtherDescription(e.target.value)} /><Input label="Peso" type="number" value={cutWeight} onChange={e => setCutWeight(e.target.value)} /><Button onClick={addTempChildCoil} variant="warning" className="w-full mt-2">Adicionar</Button></div>
                      ) : (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo de Bobina 2</label>
                              <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm" value={targetB2Code} onChange={e => setTargetB2Code(e.target.value)}>
                                  <option value="">Selecione...</option>
                                  {availableB2Types.map(t => (
                                      <option key={t.code} value={t.b2Code}>{t.b2Code} - {t.b2Name} - {t.width}mm</option>
                                  ))}
                              </select>
                              <div className="grid grid-cols-2 gap-4 mt-4"><div><Input label="Peso" type="number" value={cutWeight} onChange={e => setCutWeight(e.target.value)} /></div><div><Input label="Qtd" type="number" value={cutQuantity} onChange={e => setCutQuantity(e.target.value)} /></div></div>
                              <Button onClick={addTempChildCoil} className="w-full mt-2" disabled={!targetB2Code || !cutWeight || !cutQuantity}>Adicionar</Button>
                          </div>
                      )}
                    </div>
                  </Card>
                  
                  {/* 3. CARD PLANO DE CORTE (COM LIXEIRA) */}
                  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-200">Plano de Corte</h3><span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full font-bold">{tempChildCoils.length} itens</span></div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar-dark space-y-2 max-h-[200px]">
                       {tempChildCoils.map((item, idx) => (
                         <div key={idx} className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 flex justify-between items-center">
                           <div className="flex-1 min-w-0 pr-2">
                               <div className="font-bold text-gray-200 text-xs truncate" title={item.b2Name}>
                                   <span className="text-emerald-400">{item.b2Code}</span>
                                   <span className="text-gray-400 ml-1">- {item.b2Name}</span>
                               </div>
                           </div>
                           <div className="flex items-center gap-3 shrink-0">
                               <span className="font-bold text-white text-sm">{item.weight.toFixed(0)} kg</span>
                               <button onClick={() => setTempChildCoils(tempChildCoils.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                           </div>
                         </div>
                       ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700 bg-gray-900/30 p-3 rounded-xl">
                       <div className="mb-2"><Input label="Data Corte" type="date" value={cuttingDate} onChange={e => setCuttingDate(e.target.value)} /></div>
                       <div className="mb-2"><Input label="Sucata" type="number" value={processScrap} onChange={e => setProcessScrap(e.target.value)} /></div>
                       <div className="flex justify-between items-end">
                          <div><p className="text-xs text-gray-500 font-bold uppercase">Saldo Final</p><p className="text-2xl font-bold text-emerald-500">{(selectedMother.remainingWeight - tempChildCoils.reduce((a,b)=>a+b.weight,0) - (parseFloat(processScrap)||0)).toFixed(1)} kg</p></div>
                          <Button onClick={confirmCut} variant="success" disabled={tempChildCoils.length === 0}>PROCESSAR</Button>
                       </div>
                    </div>
                  </Card>
               </div>
             </>
           ) : (
             <div className="flex-1 flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-700">Selecione uma Bobina</div>
           )}

           {/* 4. HISTÓRICO */}
           <Card className="flex-1 border-t-4 border-purple-500 min-h-[350px]">
             <h3 className="font-bold text-gray-200 p-4 flex items-center gap-2"><History size={20} className="text-purple-500"/> Histórico de Cortes Realizados</h3>
             <div className="flex-1 overflow-y-auto h-full px-4 pb-4">
                {cuttingLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">Nenhum corte registrado ainda.</div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-900 text-gray-400 sticky top-0"><tr><th className="p-3">Data</th><th className="p-3">Entrada de MP</th><th className="p-3">Saída</th><th className="p-3 text-right">Sucata</th><th className="p-3 text-right">Total</th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {cuttingLogs.map(log => {
                                const rawItems = log.generatedItems || '';
                                const displayItems = rawItems.split(', ').map(itemStr => {
                                    const codeMatch = itemStr.match(/^([A-Z0-9]+)/); 
                                    if (codeMatch) {
                                        const code = codeMatch[1];
                                        if (itemStr.includes(' - ')) return itemStr;
                                        let prod = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === code);
                                        if (!prod) prod = INITIAL_PRODUCT_CATALOG.find(p => p.code === code);
                                        if (prod) return itemStr.replace(code, `${prod.b2Code} - ${prod.b2Name}`);
                                    }
                                    return itemStr;
                                }).join(', ');

                                return (
                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                        <td className="p-3 text-xs text-gray-400">{log.date}</td>
                                        <td className="p-3 font-bold text-white">{log.motherCode}</td>
                                        <td className="p-3 text-xs">
                                            <div className="max-w-[400px] truncate" title={displayItems}>{displayItems}</div>
                                            <div className="text-blue-400 font-bold">{log.outputCount} tiras</div>
                                        </td>
                                        <td className="p-3 text-right text-red-400">{log.scrap} kg</td>
                                        <td className="p-3 text-right font-bold text-emerald-400">{log.inputWeight.toFixed(0)} kg</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
             </div>
           </Card>
        </div>
      </div>
    );
  };
