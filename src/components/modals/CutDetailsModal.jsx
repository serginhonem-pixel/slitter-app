import React from 'react';
import { X } from 'lucide-react'; // O ícone de fechar
import Button from '../ui/Button'; // Importamos o botão que criamos no Passo 1

const CutDetailsModal = ({ log, onClose }) => {
  // Sua lógica original de separar os itens
  const items = (log.generatedItems || '').split(', ').map(itemStr => {
      const match = itemStr.match(/^([^-]+) - (.*) \(([\d.]+)kg\)$/);
      if (match) {
          return { code: match[1].trim(), name: match[2].trim(), weight: match[3] };
      }
      return { code: '-', name: itemStr, weight: '-' };
  });

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
             <h3 className="text-white font-bold text-lg">Detalhes do Corte</h3>
             <p className="text-purple-400 text-sm font-bold">Origem Mãe: {log.motherCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-4 overflow-y-auto custom-scrollbar-dark flex-1">
             <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg">
                 <div>Data do Corte: <strong className="text-gray-200">{log.date}</strong></div>
                 <div>Peso Total Processado: <strong className="text-gray-200">{log.inputWeight} kg</strong></div>
                 <div>Sucata Gerada: <strong className="text-red-400">{log.scrap} kg</strong></div>
                 <div>Tiras Geradas: <strong className="text-blue-400">{log.outputCount}</strong></div>
             </div>

             <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-900 text-gray-400 sticky top-0">
                  <tr>
                    <th className="p-2">Código B2</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      <td className="p-2 font-bold text-emerald-400">{item.code}</td>
                      <td className="p-2 text-white">{item.name}</td>
                      <td className="p-2 text-right font-mono">{item.weight} kg</td>
                    </tr>
                  ))}
                </tbody>
             </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end">
            <Button variant="secondary" onClick={onClose} className="px-4 py-1 text-xs">Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default CutDetailsModal; // <--- Exporta para o App usar