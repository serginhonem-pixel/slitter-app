import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import backupData from "./backups/slitter-backup.json";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend, // <--- O GRÁFICO AGORA SE CHAMA 'RechartsPie'
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
  ComposedChart
} from 'recharts';
import Button from './components/ui/Button';
import Login from './components/Login';
import IndicatorsDashboard from './components/modals/IndicatorsDashboard.jsx';

import { auth, db, deleteFromDb, loadFromDb, saveToDb, updateInDb, logoutUser } from './services/api'; // Certifique-se de exportar 'db' no seu arquivo de configuração

import {
  collection,
  doc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';






import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Factory,
  FileText,
  History, LayoutDashboard,
  List,
  LogOut, 
  Menu,
  Package,
  PieChart,
  Plus,
  Printer,
  Scissors,
  ScrollText,
  Search,
  Trash2,
  Truck,
  Upload,
  User,
  X,
  Calendar, 
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';



import CutDetailsModal from './components/modals/CutDetailsModal';
import { default as EditMotherCoilModal, default as ProductHistoryModal } from './components/modals/ProductHistoryModal';
import RawMaterialRequirement from "./components/modals/RawMaterialRequirement";
import InoxBlanksPlanner from "./components/modals/InoxBlanksPlanner";
import { PESO_UNITARIO_PA } from './data/peso_unitario_pa';




// --- IMPORTAÇÃO DOS Catalogos ---

import { INITIAL_MOTHER_CATALOG } from './data/motherCatalog';
import { INITIAL_PRODUCT_CATALOG } from './data/productCatalog';
import { INITIAL_INOX_BLANK_PRODUCTS } from "./data/inoxCatalog";

const ENABLE_BACKUP_BUTTON = true; // muda pra true quando quiser usar o backup

const ITEMS_PER_PAGE = 50;


// --- Componentes UI ---

const Card = ({ children, className = "" }) => <div className={`bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 ${className}`}>{children}</div>;

const Input = ({ label, value, onChange, type = "text", placeholder = "", min, disabled = false, readOnly = false }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} disabled={disabled} readOnly={readOnly} className={`w-full border border-gray-700 rounded-lg p-3 text-sm bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600 ${disabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''} ${readOnly ? 'bg-gray-800/50 text-gray-400' : ''}`} />
  </div>
);

const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
      <span className="text-xs text-gray-500">Página {currentPage} de {totalPages} ({totalItems} itens)</span>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 h-8 text-xs"><ChevronLeft size={14} /> Anterior</Button>
        <Button variant="secondary" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 h-8 text-xs">Próxima <ChevronRight size={14} /></Button>
      </div>
    </div>
  );
};
const DailyGlobalModal = ({ group, onClose }) => {
  const { type, date, events, totalQty, totalWeight } = group;

  const titleMap = {
    'ENTRADA MP': 'Entradas de Matéria-Prima',
    CORTE: 'Cortes Slitter',
    PRODUÇÃO: 'Produção de PA',
    EXPEDIÇÃO: 'Expedição de PA',
  };

  const title = titleMap[type] || type;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <p className="text-gray-400 text-sm">
              Dia {date} • {events.length} registro
              {events.length !== 1 ? 's' : ''}
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
          {events.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum registro.
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">Código</th>
                  <th className="p-2">Descrição</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {events.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-700/50">
                    <td className="p-2 font-mono text-xs text-blue-300">
                      {e.id}
                    </td>
                    <td className="p-2 text-gray-300">
                      {e.desc}
                    </td>
                    <td className="p-2 text-right text-gray-200">
                      {e.qty}
                    </td>
                    <td className="p-2 text-right font-mono text-gray-300">
                      {e.weight.toLocaleString
                        ? e.weight.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : e.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Total: {totalQty} registros •{' '}
            {totalWeight.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            kg
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-gray-700 hover:bg-white hover:text-black rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const PrintLabelsModal = ({ items, onClose, type = 'coil' }) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center overflow-hidden">
      <div className="bg-gray-900 w-full p-4 border-b border-gray-700 flex justify-between items-center print:hidden">
        <h3 className="text-white font-bold text-lg">Imprimir Etiquetas ({items.length})</h3>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="primary"><Printer size={18} /> Imprimir</Button>
          <Button onClick={onClose} variant="secondary"><X size={18} /> Fechar</Button>
        </div>
      </div>
      <div className="flex-1 w-full overflow-y-auto bg-gray-800 p-8 print:p-0 print:bg-white print:overflow-visible flex flex-col items-center">
        <div className="print:block w-full flex flex-col items-center">
          {items.map((item, index) => {
            const isProduct = type === 'product' || type === 'product_stock';
            
            // --- CORREÇÃO AQUI: Lógica Inteligente para Nomes e Códigos ---
            let name = '';
            let code = '';
            let labelTitle = '';

            if (isProduct) {
                name = item.productName || item.name;
                code = item.productCode || item.code;
                labelTitle = 'Produto Final';
            } else {
                // Tenta pegar dados de B2 (Slitter), se não tiver, pega da Mãe (Matéria Prima)
                if (item.b2Name) {
                    name = item.b2Name;
                    code = item.b2Code;
                    labelTitle = 'Bobina Slitter';
                } else {
                    name = item.material || item.description; // Pega Material da mãe
                    code = item.code;      // Pega Código da mãe
                    labelTitle = 'Matéria Prima';
                }
            }
            // -------------------------------------------------------------

            const quantity = type === 'product_stock' ? `${item.count} PÇS` : (isProduct ? `${item.pieces} PÇS` : `${item.weight} KG`);
            const date = item.date || new Date().toLocaleDateString();
            const id = item.id || 'ESTOQUE';

            return (
                  
              <div key={index} className="bg-white text-black border-2 border-black p-4 mb-8 page-break-after-always flex flex-col justify-between h-[15cm] w-[10cm] shadow-2xl print:shadow-none print:mb-0 print:mx-auto">
                 <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                  
                   <div>
                     <h1 className="text-2xl font-black tracking-tighter">METALOSA</h1>
                     <p className="text-xs font-bold">INDÚSTRIA METALÚRGICA</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-mono">{date}</p>
                     <p className="text-[10px] font-mono">{new Date().toLocaleTimeString()}</p>
                   </div>
                 </div>
                 <div className="flex-1 flex flex-col justify-center gap-2">
                   <div>
                     <p className="text-xs font-bold uppercase">{labelTitle}</p>
                     {/* Aqui vai aparecer a Descrição agora */}
                     <h2 className="text-lg font-bold leading-tight">{name}</h2>
                   </div>
                   <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="border border-black p-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Código</p>
                        {/* Aqui vai aparecer o Código agora */}
                        <p className="text-3xl font-black">{code}</p>
                      </div>
                      <div className="border border-black p-2 text-center">
                        <p className="text-[10px] font-bold uppercase">{isProduct ? 'Quantidade' : 'Peso Líquido'}</p>
                        <p className="text-4xl font-black">{quantity}</p>
                      </div>
                   </div>
                   {!isProduct && (
                     <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                        <div className="bg-gray-200 p-1"><p className="text-[8px] font-bold">LARGURA</p><p className="font-bold text-sm">{item.width} mm</p></div>
                        <div className="bg-gray-200 p-1"><p className="text-[8px] font-bold">ESPESSURA</p><p className="font-bold text-sm">{item.thickness}</p></div>
                        <div className="bg-gray-200 p-1"><p className="text-[8px] font-bold">TIPO</p><p className="font-bold text-sm">{item.type}</p></div>
                     </div>
                   )}
                 </div>
                 <div className="flex flex-col items-center mt-4 pt-2 border-t-2 border-black gap-2">
                    <QRCodeSVG value={JSON.stringify({id: id, code: code, qtd: quantity})} size={100} />
                    <div className="text-[10px] text-center w-full"><p className="font-mono truncate w-full">{id}</p></div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@media print { body * { visibility: hidden; } .fixed.inset-0.bg-black\\/90.z-\\[60\\] { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999; display: block; } .fixed.inset-0.bg-black\\/90.z-\\[60\\] .print\\:block { visibility: visible; width: 100%; } .fixed.inset-0.bg-black\\/90.z-\\[60\\] .print\\:block * { visibility: visible; } .print\\:hidden { display: none !important; } .page-break-after-always { break-after: always; page-break-after: always; } }`}</style>
    </div>
  );
};
// --- COMPONENTE DO MODAL DE DETALHES (FORA DA FUNÇÃO APP) ---
const ReportGroupModal = ({ group, onClose }) => {
  const isMP = group.type === 'ENTRADA MP';
  const isCut = group.type === 'CORTE';
  const isProd = group.type === 'PRODUÇÃO';
  const isShip = group.type === 'EXPEDIÇÃO';

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
             <h3 className="text-white font-bold text-lg flex items-center gap-2">
                Detalhes: {group.type} 
                <span className="text-sm font-normal text-gray-400">({group.date})</span>
             </h3>
             <p className="text-xs text-gray-500">{group.items.length} registros encontrados</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
             <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
                  <tr>
                    {/* CABEÇALHOS DINÂMICOS */}
                    {isMP && <><th className="p-3">Código</th><th className="p-3">Material</th><th className="p-3">NF</th><th className="p-3 text-right">Peso</th></>}
                    {isCut && <><th className="p-3">Mãe Origem</th><th className="p-3">Saída (Bobinas 2)</th><th className="p-3 text-right">Sucata</th><th className="p-3 text-right">Peso Consumido</th></>}
                    {(isProd || isShip) && <><th className="p-3">Lote/ID</th><th className="p-3">Produto</th><th className="p-3">Detalhes</th><th className="p-3 text-right">Qtd</th><th className="p-3 text-right">Peso</th></>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {group.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      
                      {/* COLUNAS MP */}
                      {isMP && (
                          <>
                            <td className="p-3 font-bold text-blue-300">{item.id}</td>
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-xs">{item.detail}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">{item.weight.toLocaleString('pt-BR')} kg</td>
                          </>
                      )}

                      {/* COLUNAS CORTE */}
                      {isCut && (
                          <>
                            <td className="p-3 font-bold text-purple-300">{item.id}</td>
                            <td className="p-3 text-xs text-gray-300 max-w-[300px] truncate" title={item.detail}>{item.detail}</td>
                            <td className="p-3 text-right text-red-400">{item.scrap} kg</td>
                            <td className="p-3 text-right font-mono text-white">{item.weight.toLocaleString('pt-BR')} kg</td>
                          </>
                      )}

                      {/* COLUNAS PRODUÇÃO / EXPEDIÇÃO */}
                      {(isProd || isShip) && (
                          <>
                            <td className="p-3 font-bold text-white text-xs">{item.id}</td>
                            <td className="p-3 text-emerald-300">{item.description}</td>
                            <td className="p-3 text-xs text-gray-500">{item.detail}</td>
                            <td className="p-3 text-right font-bold">{item.qty}</td>
                            <td className="p-3 text-right text-gray-400">{item.weight > 0 ? item.weight.toFixed(1) : '-'}</td>
                          </>
                      )}
                    </tr>
                  ))}
                </tbody>
             </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};
const MpDetailsModal = ({ data, onClose }) => {
  // 1. Ordena cronologicamente (Antigo -> Novo)
  const movements = [...data.movements].sort((a, b) => a.timestamp - b.timestamp);
  
  // 2. Começa do Saldo Inicial que foi calculado na tela anterior
  let currentBalance = data.initialBalance || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
             <h3 className="text-white font-bold text-lg">Extrato Detalhado: {data.code}</h3>
             <p className="text-sm text-gray-400">{data.desc}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
             <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Movimento</th>
                    <th className="p-3">Histórico / Documento</th>
                    <th className="p-3 text-right text-emerald-400">Entrada</th>
                    <th className="p-3 text-right text-red-400">Saída</th>
                    <th className="p-3 text-right font-bold text-white bg-gray-800 border-l border-gray-700">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  
                  {/* LINHA 0: SALDO ANTERIOR */}
                  <tr className="bg-gray-900/50">
                      <td className="p-3 text-xs text-gray-500 font-bold" colSpan="5">SALDO ANTERIOR (INÍCIO DO PERÍODO)</td>
                      <td className="p-3 text-right font-bold text-gray-400 font-mono border-l border-gray-700">
                          {data.initialBalance.toLocaleString('pt-BR')}
                      </td>
                  </tr>

                  {/* LINHAS DE MOVIMENTO */}
                  {movements.map((row, idx) => {
                    // Atualiza o saldo progressivamente
                    // weightChange é positivo para entrada e negativo para saída
                    currentBalance += row.weightChange;

                    const isEntry = row.weightChange > 0;

                    return (
                        <tr key={idx} className="hover:bg-gray-700/50">
                            <td className="p-3 font-mono text-xs">{row.date}</td>
                            <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isEntry ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                                    {row.type}
                                </span>
                            </td>
                            <td className="p-3">
                                <div className="text-gray-200">{isEntry ? 'Entrada Nota Fiscal' : 'Consumo Slitter'}</div>
                                <div className="text-[10px] text-gray-500">{row.detail}</div>
                            </td>
                            
                            {/* ENTRADA */}
                            <td className="p-3 text-right text-emerald-400 font-mono">
                                {isEntry ? row.weightChange.toLocaleString('pt-BR') : '-'}
                            </td>
                            
                            {/* SAÍDA */}
                            <td className="p-3 text-right text-red-400 font-mono">
                                {!isEntry ? Math.abs(row.weightChange).toLocaleString('pt-BR') : '-'}
                            </td>
                            
                            {/* SALDO PROGRESSIVO */}
                            <td className="p-3 text-right font-bold text-white font-mono bg-gray-800/30 border-l border-gray-700">
                                {currentBalance.toLocaleString('pt-BR')}
                            </td>
                        </tr>
                    );
                  })}
                </tbody>
             </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end gap-2 items-center">
            <div className="mr-auto flex gap-4 text-xs text-gray-400">
                <span>Entradas: <strong className="text-emerald-400">+{data.periodIn.toLocaleString('pt-BR')}</strong></span>
                <span>Saídas: <strong className="text-red-400">-{data.periodOut.toLocaleString('pt-BR')}</strong></span>
            </div>
            <div className="text-sm">
                Saldo Final (Calculado): <strong className="text-white text-lg">{currentBalance.toLocaleString('pt-BR')}</strong>
            </div>
            <Button variant="secondary" onClick={onClose} className="ml-4">Fechar</Button>
        </div>
      </div>
    </div>
  );
};
const ProductDetailsModal = ({ data, onClose }) => {
  // Se ainda não tem dados, nem tenta renderizar
  if (!data) return null;

  // Garante que sempre temos um array antes de ordenar
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const batches = [...rawItems].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  const totalQty = Number(data.totalQty) || 0;
  const totalWeight = Number(data.totalWeight) || 0;
  const totalScrap = Number(data.totalScrap) || 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
            <h3 className="text-white font-bold text-lg">
              Histórico: {data.name ?? "-"}
            </h3>
            <p className="text-sm text-gray-400">{data.code ?? "-"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* RESUMO */}
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
          <div className="grid grid-cols-3 gap-4 mb-0 text-xs text-gray-400 bg-gray-900 p-3 border-b border-gray-800">
            <div className="text-center">
              Total:{" "}
              <strong className="text-emerald-400">{totalQty} pçs</strong>
            </div>
            <div className="text-center">
              Peso:{" "}
              <strong className="text-blue-400">
                {totalWeight.toFixed(1)} kg
              </strong>
            </div>
            <div className="text-center">
              Sucata:{" "}
              <strong className="text-red-400">
                {totalScrap.toFixed(1)} kg
              </strong>
            </div>
          </div>

          {/* TABELA */}
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Lote</th>
                <th className="p-3">Detalhes</th>
                <th className="p-3">Origem MP</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-right">Peso un.</th>
                <th className="p-3 text-right">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {batches.map((batch, idx) => {
                const pieces = Number(batch?.pieces) || 0;
                const weight = Number(batch?.weight) || 0;
                const unitWeight = Number(batch?.unitWeight) || 0;

                return (
                  <tr key={idx} className="hover:bg-gray-700/50">
                    <td className="p-3 font-mono text-xs text-gray-400">
                      {batch?.date ?? "-"}
                    </td>
                    <td className="p-3 font-bold text-white text-xs">
                      {batch?.id ?? "-"}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {(batch?.packCount ?? 0) + " vols"}
                    </td>
                    <td className="p-3 text-xs text-blue-300 truncate max-w-[150px]">
                      {batch?.motherCode || "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {pieces}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {unitWeight.toFixed(3)} kg
                    </td>
                    <td className="p-3 text-right font-mono">
                      {weight.toFixed(1)} kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};



// --- MODAL DE DETALHES DO ESTOQUE (COM DESCRIÇÃO) ---



const EditChildCoilModal = ({ coil, onClose, onSave }) => {
  const [form, setForm] = useState(coil);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
          <h3 className="text-white font-bold text-lg">Editar Bobina 2 (NF)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="C?digo B2"
              value={form.b2Code}
              onChange={(e) => handleChange("b2Code", e.target.value)}
            />
            <Input
              label="Nota Fiscal"
              value={form.nf || ""}
              onChange={(e) => handleChange("nf", e.target.value)}
            />
          </div>

          <Input
            label="Descri??o"
            value={form.b2Name || ""}
            onChange={(e) => handleChange("b2Name", e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Largura (mm)"
              type="number"
              value={form.width}
              onChange={(e) => handleChange("width", e.target.value)}
            />
            <Input
              label="Espessura"
              value={form.thickness}
              onChange={(e) => handleChange("thickness", e.target.value)}
            />
            <Input
              label="Tipo"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
            />
          </div>

          <Input
            label="Peso (kg)"
            type="number"
            value={form.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </div>
      </div>
    </div>
  );
};

const StockDetailsModal = ({ code, coils, onClose, onReprint, type }) => { 

  const isMother = type === 'mother';
  
  // Pega a descrição do primeiro item da lista (já que todos são do mesmo código)
  const description = coils.length > 0 ? (isMother ? coils[0].material : coils[0].b2Name) : '';

  // Função para baixar o CSV
  const handleExport = () => {
    if (!coils || coils.length === 0) return alert("Nada para exportar.");
    
    const dataToExport = coils.map(c => ({
        "ID Rastreio": c.id,
        "Data Entrada/Corte": c.date || c.createdAt || '-',
        "Código Item": code,
        "Descrição": isMother ? c.material : c.b2Name, // <--- ADICIONADO NO CSV
        [isMother ? "Nota Fiscal" : "Origem (Mãe)"]: isMother ? (c.nf || '-') : (c.motherCode || '-'),
        "Peso (kg)": (Number(c.weight) || 0).toFixed(1).replace('.', ','),
        "Status": c.status === 'stock' ? 'EM ESTOQUE' : 'CONSUMIDA'
    }));

    const headers = Object.keys(dataToExport[0]).join(';');
    const csvContent = [
        headers, 
        ...dataToExport.map(row => Object.values(row).map(val => `"${val}"`).join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `detalhe_estoque_${code}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-xl">
          <div>
             <h3 className="text-white font-bold text-lg">Detalhes do Estoque: {code}</h3>
             
             {/* --- NOVA LINHA COM A DESCRIÇÃO --- */}
             <p className="text-emerald-400 font-bold text-sm mb-1">{description}</p>
             
             <p className="text-xs text-gray-500">{coils.length} bobinas disponíveis</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="p-0 overflow-y-auto custom-scrollbar-dark flex-1">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400 sticky top-0 shadow-md">
              <tr>
                <th className="p-3">ID Rastreio</th>
                <th className="p-3">Data {isMother ? 'Entrada' : 'Corte'}</th>
                <th className="p-3">{isMother ? 'Nota Fiscal' : 'Origem (Mãe)'}</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {coils.map(coil => (
                <tr key={coil.id} className="hover:bg-gray-700/50">
                  <td className="p-3 font-mono text-xs text-blue-300">{coil.id}</td>
                  <td className="p-3 text-xs text-gray-400">
                      {coil.date || coil.createdAt || '-'}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                      {isMother ? (coil.nf || '-') : (coil.motherCode || '-')}
                  </td>
                  <td className="p-3 text-right font-bold text-white">
                      {(Number(coil.weight) || 0).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-center">
                    <button 
                        onClick={() => onReprint(coil)} 
                        className="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors" 
                        title="Imprimir Etiqueta"
                    >
                        <Printer size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 flex justify-between items-center rounded-b-xl">
            <span className="text-xs text-gray-500">
                Total: <strong className="text-white">{coils.reduce((acc, c) => acc + (parseFloat(c.weight)||0), 0).toLocaleString('pt-BR')} kg</strong>
            </span>
            <div className="flex gap-2">
                <Button onClick={handleExport} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-none">
                    <Download size={14}/> Baixar CSV
                </Button>
                <Button variant="secondary" onClick={onClose} className="h-8 text-xs">Fechar</Button>
            </div>
        </div>
      </div>
    </div>
  );
};
// --- FUNÇÃO DE GERAR PDF (COLE FORA DA FUNÇÃO APP) ---
const handleGeneratePDF = (title, data) => {
  const printWindow = window.open('', '_blank', 'height=800,width=1000');
  if (!printWindow) return alert("Erro: O navegador bloqueou a janela. Permita pop-ups.");

  const htmlContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { text-align: center; font-size: 20px; margin-bottom: 10px; }
          p { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <h1>METALOSA - ${title}</h1>
        <p>Emissão: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto / Descrição</th>
              <th class="right">Quantidade / Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.name}</td>
                <td class="right">${item.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
// --- FUNÇÃO DE INVENTÁRIO (BOBINA MÃE) ---
  // --- FUNÇÃO DE INVENTÁRIO ATUALIZADA (LÊ TUDO) ---
  // ===== DADOS DE TESTE PARA ABA INOX =====
const INOX_PRODUCTS = [
  {
    id: "INOX-001",
    code: "INOX-001",
    description: "BLANK INOX 1,20 x 1000",
    unitWeightKg: 2.5, // kg por peça
  },
];

const INOX_DEMAND_ROWS = [
  {
    productId: "INOX-001",  // TEM QUE bater com o id acima
    demandQty: 1000,        // demanda em peças
  },
];

const INOX_STOCK_POSITIONS = [
  {
    productId: "INOX-001",  // mesmo id
    finishedQty: 200,       // peças prontas
    blankQty: 100,          // blanks em estoque
  },
];

    
export default function App() {
  const importFullBackupRef = useRef(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [viewingCutLog, setViewingCutLog] = useState(null); // Para abrir o modal de detalhes do corte
  const [activeTab, setActiveTab] = useState('dashboard');
  // --- ESTADOS PARA O RELATÓRIO DINÂMICO B2 ---
  const [b2ReportSearch, setB2ReportSearch] = useState('');
  const [b2ReportStatus, setB2ReportStatus] = useState('ALL'); // 'ALL', 'STOCK', 'CONSUMED'
  const [expandedGroupCode, setExpandedGroupCode] = useState(null);; // Qual linha está aberta
  const [b2ThicknessFilter, setB2ThicknessFilter] = useState('');
  const [mpFilterThickness, setMpFilterThickness] = useState('all');
  const [mpFilterType, setMpFilterType] = useState('all');
  const [b2TypeFilter, setB2TypeFilter] = useState('');
  const [motherCoils, setMotherCoils] = useState([]);
  const [childCoils, setChildCoils] = useState([]);
  const [productionLogs, setProductionLogs] = useState([]);
  const [shippingLogs, setShippingLogs] = useState([]); 
  const [productCatalog, setProductCatalog] = useState(INITIAL_PRODUCT_CATALOG);
  const [motherCatalog, setMotherCatalog] = useState(INITIAL_MOTHER_CATALOG);
  const [viewingStockType, setViewingStockType] = useState('b2'); // 'mother' ou 'b2'
  const [newMotherCoil, setNewMotherCoil] = useState({ 
      code: '', 
      nf: '', // <--- CAMPO NOVO
      weight: '', 
      material: '', 
      width: '', 
      thickness: '', 
      type: '',
      entryDate: new Date().toISOString().split('T')[0] 
  });
  const [showB2PurchaseForm, setShowB2PurchaseForm] = useState(false);
  const [newB2Purchase, setNewB2Purchase] = useState({
    nf: '',
    entryDate: new Date().toISOString().split('T')[0],
    b2Code: '',
    b2Name: '',
    width: '',
    thickness: '',
    type: '',
    weight: '',
    quantity: '1',
  });
  // Adicione junto com mpManualDaily, mpSimulatedPrice, etc.
  const [mpIncomingOrders, setMpIncomingOrders] = useState([]); // Lista de pedidos
  const [hoverData, setHoverData] = useState(null);
  const [mpOrderQty, setMpOrderQty] = useState(''); // Input Qtd
  const [mpOrderDate, setMpOrderDate] = useState(''); // Input Data
  const [mpLeadTime, setMpLeadTime] = useState(30);
  const [reportGroupData, setReportGroupData] = useState(null); // Para abrir o modal agrupado
  const [mpHorizonDays, setMpHorizonDays] = useState(30);       // janela de análise (dias)
  const [mpNeedSearch, setMpNeedSearch] = useState('');         // busca por código / material
  const [selectedMpCode, setSelectedMpCode] = useState(null);   // MP clicada na tabela
  const [mpScenarioMode, setMpScenarioMode] = useState('manual'); // 'historical' | 'manual' | 'file'
  const [mpSimulatedPrice, setMpSimulatedPrice] = useState('');
  const [mpManualDaily, setMpManualDaily] = useState('');       // kg/dia digitado
  const [mpManualDays, setMpManualDays] = useState(30);         // horizonte para simulação
  const [mpFileDaily, setMpFileDaily] = useState(null);         // média via arquivo
  const [selectedGlobalGroup, setSelectedGlobalGroup] = useState(null);
  const [selectedMotherForCut, setSelectedMotherForCut] = useState('');
  const [motherSearchQuery, setMotherSearchQuery] = useState('');
  const [tempChildCoils, setTempChildCoils] = useState([]);
  const [targetB2Code, setTargetB2Code] = useState(''); 
  const [cutWeight, setCutWeight] = useState('');
  const [filterB2Type, setFilterB2Type] = useState(''); 
  const [selectedChildForProd, setSelectedChildForProd] = useState('');
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [prodPieces, setProdPieces] = useState('');
  const [prodScrap, setProdScrap] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);
  const [b2SearchQuery, setB2SearchQuery] = useState('');
  const [reportViewMode, setReportViewMode] = useState('GLOBAL'); // 'GLOBAL' ou 'MP_KARDEX'
  const [viewingMpDetails, setViewingMpDetails] = useState(null); // Armazena o código que está sendo visto
  // Adicione junto com os outros estados (logo abaixo de mpManualDaily, por exemplo)
  const [mpManualInputType, setMpManualInputType] = useState('total'); // 'daily' ou 'total'
  const [mpManualTotal, setMpManualTotal] = useState(''); // Para guardar o valor total
  const [mpTargetDays, setMpTargetDays] = useState(90); // Meta de cobertura (ex: quero cobrir 45 dias)
  const [shipProduct, setShipProduct] = useState('');
  const [shipQty, setShipQty] = useState('');
  const [shipDest, setShipDest] = useState('COMETA');

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [newProduct, setNewProduct] = useState({ code: '', name: '', b2Code: '', b2Name: '', width: '', thickness: '', type: '' });
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState([]); 
  const [printType, setPrintType] = useState('coil'); 
  const [viewingStockCode, setViewingStockCode] = useState(null); 
  const [stockDetailsModalOpen, setStockDetailsModalOpen] = useState(false);
  const [editingMotherCoil, setEditingMotherCoil] = useState(null); 
  const [editingChildCoil, setEditingChildCoil] = useState(null);
  const [isSavingB2Purchase, setIsSavingB2Purchase] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
// 'dashboard', 'rastreioB2', 'mpNeed', etc...

  const [motherPage, setMotherPage] = useState(1);
  const [childPage, setChildPage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const inventoryMotherRef = useRef(null); // <--- ADICIONE ISSO
  const fileInputMotherRef = useRef(null);
  const importMotherStockRef = useRef(null);
  const importChildStockRef = useRef(null);
  const importLogsRef = useRef(null);
  const fileInputMotherCatalogRef = useRef(null);
  const importFinishedStockRef = useRef(null);
// --- ESTADOS PARA PRODUÇÃO EM LOTE (Total + Quebra) ---
  const [selectedInputCoils, setSelectedInputCoils] = useState([]);
  const [totalProducedPieces, setTotalProducedPieces] = useState(''); // Total Geral (ex: 486)
  const [standardPackSize, setStandardPackSize] = useState('');     // Padrão (ex: 100)
  const [cutQuantity, setCutQuantity] = useState(''); // Nova variável para qtd de tiras
  const [processScrap, setProcessScrap] = useState(''); // Sucata manual do processo de corte
  // Adicione esta linha junto com os outros states
  const [cuttingLogs, setCuttingLogs] = useState([]); // Novo histórico de cortes
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [isOtherMode, setIsOtherMode] = useState(false); // false = Bobina 2, true = Outros
  const [otherDescription, setOtherDescription] = useState(''); // Ex: "Telha", "Chapa"
  // --- ESTADOS DE PESQUISA DO DASHBOARD ---
  const [dashSearchMother, setDashSearchMother] = useState('');
  const [dashSearchB2, setDashSearchB2] = useState('');
  // Junto com os outros useState
  const [cuttingDate, setCuttingDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashSearchFinished, setDashSearchFinished] = useState('');
  // Junto com os outros useState

  // --- ESTADOS DE RELATÓRIOS ---
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]); // Hoje
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);   // Hoje
  const [reportSearch, setReportSearch] = useState('');
  const [viewingProdDetails, setViewingProdDetails] = useState(null); // <--- ADICIONE ESSA LINHA
// ... outros states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGroupData, setSelectedGroupData] = useState(null);
  // --- COLE ISSO JUNTO COM OS OUTROS STATES (No início da função App) ---
  const [currentFileName, setCurrentFileName] = useState(() => {
    return localStorage.getItem('currentFileName') || 'Nenhum arquivo carregado';
  });

  const USE_LOCAL_JSON = window.location.hostname === 'localhost';
// true no npm run dev, false no build/Vercel


  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (newMotherCoil.code && motherCatalog.length > 0) {
      const found = motherCatalog.find(m => m.code.toString() === newMotherCoil.code.toString());
      if (found) {
        setNewMotherCoil(prev => ({ ...prev, material: found.description, thickness: found.thickness || prev.thickness, type: found.type || prev.type }));
      }
    }
  }, [newMotherCoil.code, motherCatalog]);

  const logUserAction = async (action, payload = {}) => {
    if (!user) return;
    try {
      await saveToDb('userLogs', {
        action,
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        payload
      });
    } catch (err) {
      console.error('Erro ao registrar log de usuário:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        setMotherCoils([]);
        setChildCoils([]);
        setMotherCatalog([]);
        setProductCatalog([]);
        setProductionLogs([]);
        setCuttingLogs([]);
        setShippingLogs([]);
      }
    });

    return () => unsubscribe();
  }, []);

    // CARREGAR DADOS (Firebase com fallback no localStorage)
    
  
  
  

// IMPORTANTE: Adicione estes imports do Firebase no topo do arquivo




// DADOS DO FIREBASE ATUALIZANDO !!




  // 1. CARREGAMENTO EM TEMPO REAL (Conexão Viva)
  useEffect(() => {
  if (!user) return;

  if (USE_LOCAL_JSON) {
    console.log("[DATA] Rodando com JSON local (sem Firebase)");

    const sortLogs = (arr = []) => {
      return [...arr].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0).getTime();
        const dateB = new Date(b.timestamp || b.date || 0).getTime();
        return dateB - dateA;
      });
    };

    setMotherCoils(backupData.motherCoils || []);
    setChildCoils(backupData.childCoils || []);
    setMotherCatalog(backupData.motherCatalog || []);
    setProductCatalog(backupData.productCatalog || []);
    setProductionLogs(sortLogs(backupData.productionLogs || []));
    setCuttingLogs(sortLogs(backupData.cuttingLogs || []));
    setShippingLogs(sortLogs(backupData.shippingLogs || []));

    return;
  }

  // 2) MODO PRODUÇÃO -> usa Firebase normalmente
  const unsubs = []; // conexões abertas, para limpar depois

  const setupListener = (collectionName, setter) => {
    try {
      const q = collection(db, collectionName);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (collectionName.includes('Logs')) {
            data.sort((a, b) => {
              const dateA = new Date(a.timestamp || a.date || 0).getTime();
              const dateB = new Date(b.timestamp || b.date || 0).getTime();
              return dateB - dateA;
            });
          }

          setter(data);

          try {
            localStorage.setItem(collectionName, JSON.stringify(data));
          } catch (e) {
            console.log('Erro ao salvar cache local de', collectionName);
          }
        },
        (error) => {
          console.error(`Erro de conexão com ${collectionName}:`, error);
          try {
            const saved = localStorage.getItem(collectionName);
            if (saved) setter(JSON.parse(saved));
          } catch (e) {
            console.log('Erro no fallback local de', collectionName);
          }
        }
      );

      unsubs.push(unsubscribe);
    } catch (err) {
      console.error(`Erro ao configurar listener para ${collectionName}:`, err);
    }
  };

  // aqui você liga todas as coleções que já usava no Firebase
  setupListener('motherCoils', setMotherCoils);
  setupListener('childCoils', setChildCoils);
  setupListener('motherCatalog', setMotherCatalog);
  setupListener('productCatalog', setProductCatalog);
  setupListener('productionLogs', setProductionLogs);
  setupListener('cuttingLogs', setCuttingLogs);
  setupListener('shippingLogs', setShippingLogs);

  return () => {
    unsubs.forEach((u) => u && u());
  };
}, [user]);


 // Roda apenas uma vez ao montar a tela

  // 2. BACKUP LOCAL (Mantive igual, pois é uma segurança extra)
  useEffect(() => {
    try {
      localStorage.setItem('currentFileName', currentFileName);
      localStorage.setItem('motherCoils', JSON.stringify(motherCoils));
      localStorage.setItem('childCoils', JSON.stringify(childCoils));
      localStorage.setItem('productionLogs', JSON.stringify(productionLogs));
      localStorage.setItem('shippingLogs', JSON.stringify(shippingLogs));
      localStorage.setItem('cuttingLogs', JSON.stringify(cuttingLogs));
    } catch (error) {
      console.error('Erro ao salvar backup local', error);
    }
  }, [currentFileName, motherCoils, childCoils, productionLogs, shippingLogs, cuttingLogs]);

  // ... (Sua função updateMotherCoil continua igual)

    // BACKUP LOCAL: sempre que mudar, salva cópia no navegador
  useEffect(() => {
    try {
      localStorage.setItem('currentFileName', currentFileName);
      localStorage.setItem('motherCoils', JSON.stringify(motherCoils));
      localStorage.setItem('childCoils', JSON.stringify(childCoils));
      localStorage.setItem('productionLogs', JSON.stringify(productionLogs));
      localStorage.setItem('shippingLogs', JSON.stringify(shippingLogs));
      localStorage.setItem('cuttingLogs', JSON.stringify(cuttingLogs));
    } catch (error) {
      console.error('Erro ao salvar backup local', error);
    }
  }, [currentFileName, motherCoils, childCoils, productionLogs, shippingLogs, cuttingLogs]);


      const updateMotherCoil = async (updatedCoil) => {
    // 1. Calcula quanto já foi consumido dessa bobina antes de editar
    // (Peso Original Antigo - Saldo Atual Antigo = O que já gastou)
    const consumed = (updatedCoil.originalWeight || 0) - (updatedCoil.remainingWeight || 0);
    
    // 2. Pega o NOVO peso total que você digitou no formulário
    const newTotalWeight = parseFloat(updatedCoil.weight) || 0;

    const safeCoil = {
      ...updatedCoil,
      weight: newTotalWeight,
      originalWeight: newTotalWeight, // Atualiza o peso de referência
      // 3. O novo saldo é o Novo Total menos o que já tinha sido gasto
      // (Math.max garante que não fique negativo)
      remainingWeight: Math.max(0, newTotalWeight - consumed), 
      width: parseFloat(updatedCoil.width) || 0,
    };

    // ... (o resto da função updateMotherCoil continua igual: setMotherCoils e updateInDb) 

    // Atualiza otimista no estado
    setMotherCoils(prev =>
      prev.map(m => (m.id === safeCoil.id ? safeCoil : m))
    );
    setEditingMotherCoil(null); // Fecha o modal

    try {
      await updateInDb('motherCoils', safeCoil.id, safeCoil);
    } catch (error) {
      console.error('Erro ao atualizar bobina no Firebase', error);
      alert('Atualizei só localmente; não consegui salvar no servidor.');
    }
  };

// fINAL DOS DADOS ATUALIZANDO 


  const getUniqueB2Types = (motherType) => {
    const uniqueMap = new Map();
    productCatalog.forEach(p => {
      if (motherType && p.type && motherType.toUpperCase() !== p.type.toUpperCase()) return;
      if (!uniqueMap.has(p.b2Code)) uniqueMap.set(p.b2Code, { code: p.b2Code, name: p.b2Name, width: p.width, thickness: p.thickness, type: p.type });
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFinishedStock = () => {
    const stock = {};
    productionLogs.forEach(log => {
      if (!stock[log.productCode]) stock[log.productCode] = { code: log.productCode, name: log.productName, count: 0 };
      stock[log.productCode].count += log.pieces;
    });
    shippingLogs.forEach(log => {
      if (stock[log.productCode]) {
        stock[log.productCode].count -= log.quantity;
      }
    });
    return stock;
  };

    const addMotherCoil = async () => {
  const family = (newMotherCoil?.family || "").toUpperCase();
  const typeUpper = (newMotherCoil?.type || "").toUpperCase();
  const isInox =
    family === "INOX" || typeUpper === "INOX" || newMotherCoil?.form === "BLANK";

  // ========================
  // 1) VALIDAÇÕES
  // ========================

  // Peso é obrigatório sempre
  if (!newMotherCoil.weight) {
    return alert("Preencha o peso.");
  }

  if (isInox) {
    // Para inox: não obriga código, mas obriga escolher o tipo de inox
    if (!newMotherCoil.inoxGrade) {
      return alert("Selecione o tipo de inox.");
    }

    // Se quiser também obrigar quantidade, descomenta:
    // if (!newMotherCoil.qty) {
    //   return alert("Preencha a quantidade de peças.");
    // }
  } else {
    // Para bobina carbono/galv: continua exigindo código
    if (!newMotherCoil.code) {
      return alert("Preencha o código do lote.");
    }
  }

  // ========================
  // 2) DATA
  // ========================
  const isoDate =
    newMotherCoil.entryDate || new Date().toISOString().split("T")[0];
  const dateParts = isoDate.split("-");
  const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

  // 3) Gera um ID Temporário para mostrar na tela agora
  const tempId = Date.now().toString();

  const newCoil = {
    id: tempId, // ID PROVISÓRIO
    ...newMotherCoil,
    type: newMotherCoil.type, // já vem "INOX" ou BQ/BF/etc
    weight: parseFloat(newMotherCoil.weight),
    originalWeight: parseFloat(newMotherCoil.weight),
    width: parseFloat(newMotherCoil.width) || 1200,
    remainingWeight: parseFloat(newMotherCoil.weight),
    status: "stock",
    date: formattedDate,
  };

  // 4) Atualiza otimista no front
  setMotherCoils((prev) => [...prev, newCoil]);

  // 5) Reseta formulário
  setNewMotherCoil({
    code: "",
    nf: "",
    weight: "",
    material: "",
    width: "",
    thickness: "",
    type: "",
    entryDate: new Date().toISOString().split("T")[0],
    family: "",
    form: "",
    inoxGrade: "",
    qty: "",
    length: "",
  });

  try {
    // 6) Persiste no Firebase (sem o ID provisório)
    const { id, ...coilDataToSend } = newCoil;
    const savedItem = await saveToDb("motherCoils", coilDataToSend);
    await logUserAction('ENTRADA_MP', {
      motherCode: coilDataToSend.code,
      weight: coilDataToSend.weight,
      nf: coilDataToSend.nf
    });

    // 7) Troca o ID provisório pelo ID real
    setMotherCoils((prev) =>
      prev.map((item) =>
        item.id === tempId ? { ...item, id: savedItem.id } : item
      )
    );

    alert("Bobina salva na Nuvem! Data: " + formattedDate);
  } catch (error) {
    console.error("Erro ao salvar bobina no Firebase", error);
    alert(
      "Erro de conexão! A bobina está na tela, mas NÃO foi salva no banco. Se der F5 ela some."
    );
    // Se quiser remover da tela quando der erro, descomenta:
    // setMotherCoils(prev => prev.filter(m => m.id !== tempId));
  }
};


  const addPurchasedChildCoil = async () => {
    if (isSavingB2Purchase) return;
    const { nf, entryDate, b2Code, b2Name, weight, quantity, width, thickness, type } = newB2Purchase;

    if (!nf || !b2Code || !b2Name || !weight) {
      return alert("Preencha NF, tipo de bobina 2, descricao e peso total.");
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return alert("Informe a quantidade de bobinas.");
    }

    const totalWeight = parseFloat(String(weight).replace(",", "."));
    if (!totalWeight || totalWeight <= 0) {
      return alert("Informe um peso total vÇ­lido.");
    }

    const perCoilWeight = totalWeight / qty;
    const formattedDate =
      entryDate && entryDate.includes("-")
        ? (() => {
            const [y, m, d] = entryDate.split("-");
            return `${d}/${m}/${y}`;
          })()
        : new Date().toLocaleDateString();

    const tempChildren = Array.from({ length: qty }).map((_, idx) => ({
      id: `TEMP-B2NF-${Date.now()}-${idx}`,
      motherId: null,
      motherCode: nf ? `NF ${nf}` : "NF EXTERNA",
      nf,
      b2Code,
      b2Name,
      width: parseFloat(width) || 0,
      thickness: thickness || "-",
      type: type || "ND",
      weight: perCoilWeight,
      initialWeight: perCoilWeight,
      status: "stock",
      createdAt: formattedDate,
      origin: "NF",
      source: "purchase_nf",
    }));

    const prevChildren = [...childCoils];
    setChildCoils((prev) => [...prev, ...tempChildren]);

    setIsSavingB2Purchase(true);

    try {
      if (USE_LOCAL_JSON) {
        // Modo local: apenas mantém no estado para visualizar/testar
        alert("Bobina 2 pronta registrada localmente (modo JSON).");
      } else {
        const savedChildren = [];
        for (const child of tempChildren) {
          const { id: tempId, ...payload } = child;
          const saved = await saveToDb("childCoils", payload);
          savedChildren.push(saved);
        }

        setChildCoils((prev) => {
          const others = prev.filter((c) => !tempChildren.some((t) => t.id === c.id));
          return [...others, ...savedChildren];
        });

        await logUserAction("ENTRADA_B2_NF", {
          nf,
          b2Code,
          qty,
          totalWeight,
        });

        setItemsToPrint(savedChildren);
        setPrintType("coil");
        setShowPrintModal(true);
      }

      setNewB2Purchase({
        nf: "",
        entryDate: new Date().toISOString().split("T")[0],
        b2Code: "",
        b2Name: "",
        width: "",
        thickness: "",
        type: "",
        weight: "",
        quantity: "1",
      });
      setShowB2PurchaseForm(false);
      alert("Bobina 2 pronta registrada no estoque.");
    } catch (error) {
      console.error("Erro ao salvar bobina 2 comprada", error);
      alert("Erro ao salvar a bobina 2 na nuvem. Reverto a alteracao local.");
      setChildCoils(prevChildren);
    } finally {
      setIsSavingB2Purchase(false);
    }
  };

  const deleteMotherCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina permanentemente.")) {
      return;
    }

    // Remove otimista no front
    setMotherCoils(prev => prev.filter(m => m.id !== id));

    try {
      await deleteFromDb('motherCoils', id);
    } catch (error) {
      console.error('Erro ao excluir bobina no Firebase', error);
      alert('Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.');

      try {
        const mothers = await loadFromDb('motherCoils');
        if (Array.isArray(mothers)) {
          setMotherCoils(mothers);
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar dados após falha de exclusão', reloadError);
      }
    }
  };

  const deleteChildCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina 2 permanentemente.")) {
      return;
    }

    setChildCoils((prev) => prev.filter((c) => c.id !== id));

    if (USE_LOCAL_JSON) return;

    try {
      await deleteFromDb("childCoils", id);
    } catch (error) {
      console.error("Erro ao excluir bobina 2 no Firebase", error);
      alert("Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.");

      try {
        const children = await loadFromDb("childCoils");
        if (Array.isArray(children)) {
          setChildCoils(children);
        }
      } catch (reloadError) {
        console.error("Erro ao recarregar dados após falha de exclusão de B2", reloadError);
      }
    }
  };

  const updateChildCoil = async (coil) => {
    const { entryType, ...clean } = coil || {};
    const safeCoil = {
      ...clean,
      weight: parseFloat(clean.weight) || 0,
      width: parseFloat(clean.width) || 0,
    };

    setChildCoils((prev) => prev.map((c) => (c.id === safeCoil.id ? safeCoil : c)));
    setEditingChildCoil(null);

    if (USE_LOCAL_JSON) return;

    try {
      await updateInDb("childCoils", safeCoil.id, safeCoil);
    } catch (error) {
      console.error("Erro ao atualizar bobina 2 no Firebase", error);
      alert("Atualizei só localmente; não consegui salvar no servidor.");
    }
  };

  const addTempChildCoil = () => {
    // Função auxiliar para limpar números (Aceita 2000,50 e 2000.50)
    const parseWeight = (val) => {
        if (!val) return 0;
        return parseFloat(String(val).replace(',', '.').trim());
    };

    // --- LÓGICA MODO "OUTROS" ---
    if (isOtherMode) {
        if (!cutWeight || !otherDescription) return alert("Preencha a descrição e o peso.");
        
        const pesoLimpo = parseWeight(cutWeight); // <--- LIMPEZA AQUI

        setTempChildCoils([...tempChildCoils, {
            b2Code: 'CONSUMO',
            b2Name: otherDescription.toUpperCase(),
            width: 0,
            thickness: '-',
            type: 'OUTROS',
            weight: pesoLimpo,
            id: Date.now(),
            isDirectConsumption: true
        }]);
        
        setCutWeight('');
        setOtherDescription(''); 
        return;
    }

    // --- LÓGICA MODO "BOBINA 2" (PADRÃO) ---
    if (!targetB2Code || !cutWeight || !cutQuantity) return alert("Preencha todos os campos.");
    
    // Busca no ARQUIVO NOVO
    const b2Data = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === targetB2Code);
    if (!b2Data) return alert("Erro: Produto não encontrado no catálogo.");

    const totalWeight = parseWeight(cutWeight); // <--- LIMPEZA AQUI
    const qtd = parseInt(cutQuantity);
    
    if (qtd <= 0) return alert("Qtd deve ser maior que 0");

    const individualWeight = totalWeight / qtd;
    const newItems = [];
    
    for (let i = 0; i < qtd; i++) {
        newItems.push({
            b2Code: b2Data.b2Code,
            b2Name: b2Data.b2Name,
            width: parseFloat(b2Data.width),
            thickness: b2Data.thickness,
            type: b2Data.type, 
            weight: individualWeight, 
            id: Date.now() + Math.random() 
        });
    }

    setTempChildCoils([...tempChildCoils, ...newItems]);
    setCutWeight('');
    setCutQuantity('');
  };
  const confirmCut = async () => {
    const mother = motherCoils.find(m => m.id === selectedMotherForCut);
    if (!mother) return;

    // --- 1. PREPARAÇÃO DOS DADOS ---
    const dateParts = cuttingDate.split('-');
    const dateNow = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const totalCutsWeight = tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0);
    const manualScrap = processScrap ? parseFloat(String(processScrap).replace(',', '.').trim()) : 0;
    const totalConsumed = totalCutsWeight + manualScrap;

    if (totalConsumed > mother.remainingWeight) {
      if (!window.confirm(`Peso excedido (${totalConsumed.toFixed(1)}kg). Continuar?`)) return;
    }

    const remaining = Math.max(0, mother.remainingWeight - totalConsumed);
    const isTotalConsumption = remaining < 10;
    
    // Texto do Histórico
    const itemsSummary = tempChildCoils.map(t => t.isDirectConsumption ? `${t.b2Name} (${t.weight}kg)` : `${t.b2Code} - ${t.b2Name} (${t.weight.toFixed(0)}kg)`).join(', ');

    // --- 2. BACKUP DE ESTADO (Para caso dê erro) ---
    const prevMothers = [...motherCoils];
    const prevLogs = [...cuttingLogs];
    const prevChildren = [...childCoils];

    // --- 3. CRIAÇÃO DOS OBJETOS COM ID TEMPORÁRIO ---
    const tempLogId = `TEMP-LOG-${Date.now()}`;
    const newCutLog = {
      id: tempLogId,
      date: dateNow, motherCode: mother.code, motherMaterial: mother.material,
      inputWeight: totalConsumed, outputCount: tempChildCoils.length, scrap: manualScrap,
      generatedItems: itemsSummary, timestamp: new Date().toLocaleString()
    };

    const tempNewChildren = tempChildCoils
      .filter(item => !item.isDirectConsumption)
      .map((temp, index) => ({
        id: `TEMP-CHILD-${Date.now()}-${index}`, // ID Temporário
        motherId: mother.id, motherCode: mother.code,
        b2Code: temp.b2Code, b2Name: temp.b2Name, width: temp.width, thickness: temp.thickness,
        type: mother.type, weight: temp.weight, initialWeight: temp.weight, status: 'stock', createdAt: dateNow
      }));

    // Objeto de atualização da Mãe
    const motherUpdateData = {
      remainingWeight: remaining,
      status: isTotalConsumption ? 'consumed' : 'stock',
      cutWaste: (mother.cutWaste || 0) + manualScrap,
      consumedDate: isTotalConsumption ? dateNow : mother.consumedDate,
      consumptionDetail: isTotalConsumption ? (mother.consumptionDetail ? mother.consumptionDetail + ' + ' + itemsSummary : itemsSummary) : mother.consumptionDetail
    };

    // --- 4. ATUALIZAÇÃO OTIMISTA (NA TELA AGORA) ---
    // Atualiza Mãe
    setMotherCoils(prev => prev.map(m => m.id === mother.id ? { ...m, ...motherUpdateData } : m));
    // Adiciona Log
    setCuttingLogs(prev => [newCutLog, ...prev]);
    // Adiciona Filhas
    setChildCoils(prev => [...prev, ...tempNewChildren]);

    // Limpa formulário visualmente
    setTempChildCoils([]); setProcessScrap(''); setSelectedMotherForCut(''); setMotherSearchQuery('');

    try {
      // --- 5. PERSISTÊNCIA NO FIREBASE ---
      
      // A) Atualiza Mãe
      await updateInDb('motherCoils', mother.id, motherUpdateData);

      // B) Salva Log e pega ID Real
      const { id: logTempId, ...logData } = newCutLog;
      const savedLog = await saveToDb('cuttingLogs', logData);

      // C) Salva Filhas e pega IDs Reais
      const savedChildrenReal = [];
      for (const childTemp of tempNewChildren) {
          const { id: childTempId, ...childData } = childTemp;
          const savedChild = await saveToDb('childCoils', childData);
          savedChildrenReal.push(savedChild);
      }

      // --- 6. TROCA SILENCIOSA DE IDS (TEMP -> REAL) ---
      
      // Troca ID do Log
      setCuttingLogs(prev => prev.map(l => l.id === tempLogId ? { ...l, id: savedLog.id } : l));
      
      // Troca IDs das Filhas (Remove as Temp e bota as Reais para garantir integridade)
      setChildCoils(prev => {
          const others = prev.filter(c => !tempNewChildren.some(t => t.id === c.id));
          return [...others, ...savedChildrenReal];
      });

      // Prepara impressão com os dados reais (com ID certo para o QR Code)
      setItemsToPrint(savedChildrenReal); 
      setPrintType('coil'); 
      setShowPrintModal(true);
      await logUserAction('CORTE', {
        motherCode: mother.code,
        newChildCount: savedChildrenReal.length,
        childCodes: savedChildrenReal.map(c => c.b2Code),
        scrapKg: manualScrap
      });
      
      alert("Corte salvo na nuvem!");

    } catch (error) {
      console.error("Erro no corte:", error);
      alert("Erro ao salvar o corte na nuvem. Revertendo alterações...");
      
      // --- 7. ROLLBACK (EM CASO DE ERRO) ---
      setMotherCoils(prevMothers);
      setCuttingLogs(prevLogs);
      setChildCoils(prevChildren);
    }
  };
  const handleImportFinishedStock = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const delimiter = text.includes(';') ? ';' : ','; // Detecta ponto e vírgula
        const rows = parseCSVLine(text, delimiter);
        
        // Pula cabeçalho e linhas vazias
        const dataRows = rows.slice(1).filter(r => r.length >= 2 && r[0]); 
        
        // --- PASSO 1: SOMAR O INVENTÁRIO DO EXCEL (AGRUPAR CÓDIGOS REPETIDOS) ---
        const inventoryMap = {}; // Vai guardar: { '00664K': 210, '00652B': 500, ... }
        
        dataRows.forEach(row => {
             const rawCode = String(row[0] || '').trim().toUpperCase();
             // Limpa o número (tira pontos de milhar e deixa apenas dígitos)
             const qtyStr = String(row[1] || '').replace(/[^0-9]/g, '');
             const qty = parseInt(qtyStr);

             if (rawCode && !isNaN(qty)) {
                 // Soma se já existir, ou cria se for novo
                 inventoryMap[rawCode] = (inventoryMap[rawCode] || 0) + qty;
             }
        });
        // -----------------------------------------------------------------------

        const newProdLogs = [...productionLogs];
        const newShipLogs = [...shippingLogs];
        const dateNow = new Date().toLocaleDateString();
        const timeNow = new Date().toLocaleString();
        
        let itemsAdjusted = 0;
        let totalQtyAdjusted = 0;
        const notFoundCodes = [];

        // --- PASSO 2: COMPARAR E AJUSTAR CADA PRODUTO ---
        Object.keys(inventoryMap).forEach(code => {
            const targetQty = inventoryMap[code]; // Quantidade TOTAL que está no Excel

            // Calcula Saldo Atual no Sistema
            const currentProd = newProdLogs
                .filter(l => String(l.productCode).trim().toUpperCase() === code)
                .reduce((acc, l) => acc + (parseInt(l.pieces)||0), 0);
                
            const currentShip = newShipLogs
                .filter(l => String(l.productCode).trim().toUpperCase() === code)
                .reduce((acc, l) => acc + (parseInt(l.quantity)||0), 0);
                
            const currentStock = currentProd - currentShip;

            // A Diferença é o Ajuste necessário
            const diff = targetQty - currentStock;

            if (diff === 0) return; // Bateu, não faz nada

            // Busca Nome do Produto
            let productData = INITIAL_PRODUCT_CATALOG.find(p => String(p.code).trim().toUpperCase() === code);
            if (!productData) {
                if (!notFoundCodes.includes(code)) notFoundCodes.push(code);
                productData = { name: `ITEM MANUAL (${code})` };
            }

            if (diff > 0) {
                // FALTA NO SISTEMA -> ENTRADA DE AJUSTE
                newProdLogs.push({
                    id: `AJUSTE-ENT-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                    date: dateNow, timestamp: timeNow,
                    productCode: code, productName: productData.name,
                    pieces: diff, weight: 0,
                    b2Code: 'INVENTARIO', motherCode: '-', scrap: 0, packIndex: 'Ajuste'
                });
            } else {
                // SOBRA NO SISTEMA -> SAÍDA DE AJUSTE
                newShipLogs.push({
                    id: `AJUSTE-SAI-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                    date: dateNow, timestamp: timeNow,
                    productCode: code, productName: productData.name,
                    quantity: Math.abs(diff),
                    destination: 'AJUSTE INVENTÁRIO'
                });
            }
            
            itemsAdjusted++;
            totalQtyAdjusted += Math.abs(diff);
        });

        setProductionLogs(newProdLogs);
        setShippingLogs(newShipLogs);
        
        let msg = `✅ Inventário Processado com Sucesso!\n\n`;
        msg += `Itens Diferentes Ajustados: ${itemsAdjusted}\n`;
        msg += `Total de Peças Movimentadas (Ajuste): ${totalQtyAdjusted}\n`;
        
        if (notFoundCodes.length > 0) {
            msg += `\n⚠️ ${notFoundCodes.length} códigos não cadastrados foram criados como manuais.`;
        }
        
        alert(msg);
        e.target.value = ''; 

      } catch (err) {
        alert("Erro ao processar: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  const registerProduction = async () => {
    if (selectedInputCoils.length === 0) return alert("Selecione bobinas!");
    if (!selectedProductCode || !totalProducedPieces) return alert("Preencha dados.");

    const total = parseInt(totalProducedPieces);
    const packSize = parseInt(standardPackSize) || total;
    const fullPacksCount = Math.floor(total / packSize);
    const remainder = total % packSize;
    const totalLabels = remainder > 0 ? fullPacksCount + 1 : fullPacksCount;

    if (!window.confirm(`Produzir ${total} peças (${totalLabels} vols)?`)) return;

    // --- 1. PREPARAÇÃO ---
    const productInfo = productCatalog.find(p => p.code === selectedProductCode);
    const dateParts = productionDate.split('-');
    const date = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const timestamp = new Date().toLocaleString();
    
    const sourceIds = selectedInputCoils.map(c => c.id);
    const uniqueB2Codes = [...new Set(selectedInputCoils.map(c => c.b2Code))].join(', ');
    const uniqueMotherCodes = [...new Set(selectedInputCoils.map(c => c.motherCode))].filter(Boolean).join(', ');

    // Gerador de ID de rastreio visual
    const generateTrackingId = () => {
        const d = new Date();
        const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PROD-${ymd}-${random}`;
    };
    const baseTrackingId = generateTrackingId();

    const logsToCreate = [];
    // Cria Pacotes Cheios
    for (let i = 0; i < fullPacksCount; i++) {
        logsToCreate.push({
            id: `TEMP-PROD-${Date.now()}-${i}`, // ID Temporário para React
            trackingId: `${baseTrackingId}-${i + 1}`, // ID Visual (Etiqueta)
            childIds: sourceIds, motherCode: uniqueMotherCodes, b2Code: uniqueB2Codes, b2Name: selectedInputCoils[0].b2Name,
            productCode: productInfo.code, productName: productInfo.name, pieces: packSize,
            packIndex: `${i + 1}/${totalLabels}`, scrap: i === 0 ? parseFloat(prodScrap) || 0 : 0,
            date: date, timestamp: timestamp
        });
    }
    // Cria Pacote Resto
    if (remainder > 0) {
        logsToCreate.push({
            id: `TEMP-PROD-${Date.now()}-F`,
            trackingId: `${baseTrackingId}-F`,
            childIds: sourceIds, motherCode: uniqueMotherCodes, b2Code: uniqueB2Codes, b2Name: selectedInputCoils[0].b2Name,
            productCode: productInfo.code, productName: productInfo.name, pieces: remainder,
            packIndex: `${totalLabels}/${totalLabels}`, scrap: 0, date: date, timestamp: timestamp
        });
    }

    // --- 2. BACKUP ---
    const prevProduction = [...productionLogs];
    const prevChildren = [...childCoils];

    // --- 3. ATUALIZAÇÃO OTIMISTA ---
    // Adiciona logs na tela
    setProductionLogs(prev => [...logsToCreate, ...prev]);
    
    // Marca bobinas como consumidas na tela
    setChildCoils(prev => prev.map(c => sourceIds.includes(c.id) ? { ...c, status: 'consumed' } : c));

    // Limpa form
    setSelectedInputCoils([]); setSelectedProductCode(''); setTotalProducedPieces(''); setProdScrap('');

    try {
        // --- 4. PERSISTÊNCIA ---
        const savedLogsReal = [];
        
        // Salva Logs e Pega IDs
        for (const log of logsToCreate) {
            const { id: tempId, ...logData } = log;
            const saved = await saveToDb('productionLogs', logData);
            // Combina o ID do firebase com o trackingId visual
            savedLogsReal.push({ ...saved, trackingId: log.trackingId });
        }

        // Atualiza Bobinas (Consome)
        for (const coilId of sourceIds) {
            await updateInDb('childCoils', coilId, { status: 'consumed' });
        }

        // --- 5. TROCA SILENCIOSA DE IDS ---
        setProductionLogs(prev => {
            // Remove os temporários e adiciona os reais
            const others = prev.filter(l => !logsToCreate.some(t => t.id === l.id));
            return [...savedLogsReal, ...others];
        });

        // Manda imprimir os reais
        setItemsToPrint(savedLogsReal); setPrintType('product'); setShowPrintModal(true);
        await logUserAction('PRODUCAO', {
          productCode: prodInfo ? prodInfo.code : selectedProductCode,
          pieces: totalProducedPieces,
          scrapKg: prodScrap,
          sourceChildIds: sourceIds
        });
        alert("Produção salva na nuvem!");

    } catch (error) {
        console.error("Erro produção:", error);
        alert("Erro ao salvar produção. Revertendo...");
        setProductionLogs(prevProduction);
        setChildCoils(prevChildren);
    }
  };
  const registerShipping = async () => {
    if (!shipProduct || !shipQty) return alert("Preencha tudo");

    // Validação de Estoque (Leitura Local)
    const stock = {};
    productionLogs.forEach(log => {
      if (!stock[log.productCode]) stock[log.productCode] = 0;
      stock[log.productCode] += (parseInt(log.pieces) || 0);
    });
    shippingLogs.forEach(log => {
      if (stock[log.productCode]) stock[log.productCode] -= (parseInt(log.quantity) || 0);
    });

    const currentStock = stock[shipProduct] || 0;
    const qty = parseInt(shipQty);
    if (qty > currentStock) return alert("Estoque insuficiente.");

    const prodInfo = productCatalog.find(p => p.code === shipProduct);

    // --- 1. DADOS ---
    const tempId = `TEMP-SHIP-${Date.now()}`;
    const newShipLog = {
      id: tempId,
      productCode: shipProduct, productName: prodInfo ? prodInfo.name : shipProduct,
      quantity: qty, destination: shipDest,
      date: new Date().toLocaleDateString(), timestamp: new Date().toLocaleString()
    };

    // --- 2. BACKUP ---
    const prevShipping = [...shippingLogs];

    // --- 3. OTIMISTA ---
    setShippingLogs(prev => [newShipLog, ...prev]);
    setShipQty('');

    try {
        // --- 4. PERSISTÊNCIA ---
        const { id: temp, ...dataToSend } = newShipLog;
        const savedLog = await saveToDb('shippingLogs', dataToSend);

        // --- 5. TROCA ID ---
        setShippingLogs(prev => prev.map(l => l.id === tempId ? { ...l, id: savedLog.id } : l));
        await logUserAction('EXPEDICAO', {
          productCode: shipProduct,
          quantity: qty,
          destination: shipDest
        });
        
        alert("Expedição salva!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar expedição.");
        setShippingLogs(prevShipping);
    }
  };

  // --- 1. BACKUP COMPLETO (SALVA TUDO) ---
  const handleFullBackup = () => {
    try {
      // Reúne TODOS os dados do sistema
      const data = { 
        motherCoils: motherCoils || [], 
        childCoils: childCoils || [], 
        productionLogs: productionLogs || [], 
        shippingLogs: shippingLogs || [], 
        productCatalog: productCatalog || [], 
        motherCatalog: motherCatalog || [],
        cuttingLogs: cuttingLogs || [] // <--- GARANTINDO O HISTÓRICO DE CORTES
      };
      
      // Formata nome do arquivo com Data
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `backup_metalosa_${dateStr}.json`;
      
      // Pega Data e Hora de AGORA para mostrar na barra azul
      const now = new Date().toLocaleString();

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Atualiza a barra azul no topo
      setCurrentFileName(`💾 ${fileName} (Gerado em: ${now})`);

      // Feedback para o usuário
      setTimeout(() => {
          const recipients = "pcp@metalosa.com.br,pcp5@metalosa.com.br,pcp3@metalosa.com.br";
          const subject = `Backup Sistema Metalosa - ${new Date().toLocaleDateString()}`;
          const body = `Backup realizado com sucesso.\nArquivo: ${fileName}`;
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipients}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

          if (window.confirm("Backup Completo baixado com sucesso!\n(Inclui Cortes, Estoques, Produção e Cadastros)\n\nDeseja abrir o Gmail para enviar?")) {
              window.open(gmailUrl, '_blank');
          }
      }, 500);

    } catch (error) {
      alert("Erro crítico ao gerar backup: " + error.message);
    }
  };

  // --- 2. RESTAURAR COMPLETO (CARREGA TUDO) --
  const handleEditLog = (log) => {
    setEditingLogId(log.id);
    setSelectedChildForProd(log.childId);
    setSelectedProductCode(log.productCode);
    setProdPieces(log.pieces);
    setProdScrap(log.scrap);
  };

  const handleDeleteLog = (logId) => {
    if(!window.confirm("Tem certeza?")) return;
    const log = productionLogs.find(l => l.id === logId);
    if (!log) return;
    const updatedChildren = childCoils.map(c => {
      if (c.id === log.childId) return { ...c, status: 'stock' };
      return c;
    });
    setChildCoils(updatedChildren);
    setProductionLogs(productionLogs.filter(l => l.id !== logId));
  };

  const generateTrackingId = () => {
    const date = new Date();
    const ymd = date.toISOString().slice(0,10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PROD-${ymd}-${random}`;
  };

  const handleViewStockDetails = (code, type) => { // <--- Adicionei 'type' aqui
    setViewingStockCode(code);
    setViewingStockType(type); // <--- Salva se é mãe ou filha
    setStockDetailsModalOpen(true);
  };

  const handleReprintSingle = (coil) => {
    setItemsToPrint([coil]);
    setPrintType('coil');
    setShowPrintModal(true);
  };

  const handleReprintProduct = (log) => {
    setItemsToPrint([log]);
    setPrintType('product');
    setShowPrintModal(true);
  };

  const handleReprintStockBalance = (item) => {
      setItemsToPrint([item]);
      setPrintType('product_stock'); 
      setShowPrintModal(true);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return alert("Nada para exportar.");
    const headers = Object.keys(data[0]).join(';');
    const csvContent = [headers, ...data.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = (type) => {
    let headers = '';
    let filename = '';
    let sample = '';
    if (type === 'mother') { headers = 'id;code;material;weight;originalWeight;width;thickness;type;remainingWeight;status;date'; sample = '1;10644;BOBINA EXEMPLO;5000;5000;1200;0,40;BEG;5000;stock;26/11/2025'; filename = 'modelo_importacao_mae.csv'; }
    else if (type === 'b2') { headers = 'id;motherId;motherCode;b2Code;b2Name;width;thickness;type;weight;initialWeight;status;createdAt'; sample = 'B2-01;1;10644;85521B;BOB 2 PERFIL UE;170;2,00;BQ;450;450;stock;26/11/2025'; filename = 'modelo_importacao_b2.csv'; }
    else if (type === 'logs') { headers = 'id;childId;motherCode;b2Code;b2Name;productCode;productName;pieces;scrap;date;timestamp'; sample = 'LOG-01;B2-01;10644;85521B;BOB 2 PERFIL UE;00671B;PERFIL UE FINAL;100;10;26/11/2025;26/11/2025 14:00'; filename = 'modelo_importacao_logs.csv'; }
    const content = `${headers}\n${sample}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FUNÇÃO DE IMPORTAÇÃO GENÉRICA (ATUALIZADA COM LARGURA) ---

  
  const handleMotherCatalogUpload = (event) => { 
      const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      const newCatalog = [];
      rows.forEach((cols) => {
        if (cols.length >= 4) {
           const code = cols[0];
           if(code && code.match(/^\d+$/)) {
             const description = cols[3];
             const thickness = cols[4];
             const type = cols[5];
             newCatalog.push({ code, description, thickness, type });
           }
        }
      });
      if (newCatalog.length > 0) {
        const merged = [...INITIAL_MOTHER_CATALOG, ...newCatalog];
        const unique = Array.from(new Map(merged.map(item => [item.code, item])).values());
        setMotherCatalog(unique);
        alert(`${newCatalog.length} materiais importados.`);
      }
    };
    reader.readAsText(file);
  };

  const handleMotherCoilUpload = (event) => { 
      const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      const newCoils = [];
      rows.forEach((cols) => {
        let code, material, weight, width=1200, thickness='', type='';
        if (cols.length >= 3) {
           const rawCode = cols[0];
           if (rawCode && rawCode.match(/^\d+$/)) {
             code = rawCode;
             const catalogItem = motherCatalog.find(mc => mc.code === code);
             if (catalogItem) {
                material = catalogItem.description;
                thickness = catalogItem.thickness;
                type = catalogItem.type;
             } else { material = cols[1] || 'Material Desconhecido'; }
             for(let i=2; i<cols.length; i++) {
               const cleanVal = cols[i]?.replace(/\./g, '').replace(',', '.');
               const val = parseFloat(cleanVal);
               if (!isNaN(val) && val > 10) { weight = val; break; }
             }
           }
        }
        if (code && weight) {
          newCoils.push({
            id: Date.now().toString() + Math.random().toString().slice(2),
            code, material, weight, originalWeight: weight, width, thickness, type,
            remainingWeight: weight, status: 'stock', date: new Date().toLocaleDateString()
          });
        }
      });
      if (newCoils.length > 0) {
        setMotherCoils([...motherCoils, ...newCoils]);
        alert(`${newCoils.length} bobinas importadas!`);
      }
    };
    reader.readAsText(file);
  };

  // --- RENDERS ---

  const renderMotherCoilForm = () => {
  // --- Define se estamos cadastrando bobina "normal" ou blank inox ---
  const family = (newMotherCoil?.family || "").toUpperCase();
  const typeUpper = (newMotherCoil?.type || "").toUpperCase();
  const currentForm = (newMotherCoil?.form || "").toUpperCase();
  const isInoxSelected =
    family === "INOX" || typeUpper === "INOX" || currentForm === "BLANK";
  const isB2Industrialized = currentForm === "B2_PURCHASE";

  // Catálogo de produtos inox
  const inoxProducts = INITIAL_INOX_BLANK_PRODUCTS || [];

  // LISTA ÚNICA DE TIPOS DE INOX (SEM REPETIÇÃO)
  const inoxGrades = Array.from(
    new Set(inoxProducts.map((p) => p.inoxGrade))
  ).sort();

  const selectedInoxGrade = newMotherCoil?.inoxGrade || "";
  const defaultProductForSelectedGrade =
    inoxProducts.find((p) => p.inoxGrade === selectedInoxGrade) || null;

  const uniqueB2Catalog = Array.from(
    new Map(
      productCatalog
        .filter((p) => p.b2Code)
        .map((p) => [p.b2Code, p])
    ).values()
  ).sort((a, b) => a.b2Name.localeCompare(b.b2Name));

  const handleSelectPurchasedB2 = (code) => {
    const selected = productCatalog.find((p) => p.b2Code === code);
    setNewB2Purchase((prev) => ({
      ...prev,
      b2Code: code,
      b2Name: selected?.b2Name || prev.b2Name,
      width: selected?.width || prev.width,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
    setNewMotherCoil((prev) => ({
      ...prev,
      material: selected?.b2Name || prev.material,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
  };

  const purchaseQty = parseInt(newB2Purchase.quantity, 10) || 0;
  const purchaseTotalWeight = parseFloat(String(newB2Purchase.weight || "").replace(",", "."));
  const purchaseUnitWeight =
    purchaseQty > 0 && purchaseTotalWeight
      ? (purchaseTotalWeight / purchaseQty).toFixed(1)
      : null;

  const handleSelectInoxGrade = (e) => {
  const grade = e.target.value;

  if (!grade) {
    setNewMotherCoil({
      ...newMotherCoil,
      inoxGrade: "",
      material: "",
      family: "INOX",
      form: "BLANK",
      type: "INOX",
      thickness: "",
      width: "",
      length: "",
    });
    return;
  }

  const defaultProduct = inoxProducts.find((p) => p.inoxGrade === grade);

  let thicknessStr = "";
  let width = "";
  let length = "";

  if (defaultProduct) {
    thicknessStr =
      defaultProduct.thickness != null
        ? defaultProduct.thickness.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "";
    width = defaultProduct.width ?? "";
    length = defaultProduct.length ?? "";
  }

  setNewMotherCoil({
    ...newMotherCoil,
    inoxGrade: grade,                          // coluna INOX
    material: defaultProduct?.measuresLabel    // <-- AQUI MUDA O NOME LÁ EM CIMA
      ? `${grade} — ${defaultProduct.measuresLabel}`
      : grade,
    family: "INOX",
    form: "BLANK",
    type: "INOX",
    thickness: thicknessStr,
    width,
    length,
  });
};


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col justify-center">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Plus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isInoxSelected ? "Novo Blank Inox" : "Entrada de MP"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isInoxSelected
                ? "Cadastre chapas / blanks inox recebidos"
                : "Cadastre a materia-prima recebida ou bobinas 2 prontas de NF"}
            </p>
          </div>

          <div className="space-y-4">
            {/* --- LINHA 0: TIPO DE MAT?RIA-PRIMA (BOBINA x BLANK INOX x B2 NF) --- */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Tipo de Mat?ria-prima
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "CARBONO",
                        form: "BOBINA",
                        inoxGrade: "",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      !isInoxSelected && !isB2Industrialized
                        ? "bg-blue-600/20 border-blue-500/60 text-blue-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-blue-500/40"
                    }`}
                  >
                    Bobina (a?o / galv)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "INOX",
                        form: "BLANK",
                        type: "INOX",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isInoxSelected
                        ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-emerald-500/40"
                    }`}
                  >
                    Blank Inox
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(true);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "B2",
                        form: "B2_PURCHASE",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isB2Industrialized
                        ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover-border-indigo-500/40"
                    }`}
                  >
                    Bobina 2 - Industrializada
                  </button>
                </div>
              </div>
            </div>

            {isB2Industrialized ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nota Fiscal"
                    value={newB2Purchase.nf}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        nf: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Data Entrada"
                    type="date"
                    value={newB2Purchase.entryDate}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        entryDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                    Tipo de Bobina 2
                  </label>
                  <select
                    className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                    value={newB2Purchase.b2Code}
                    onChange={(e) => handleSelectPurchasedB2(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {uniqueB2Catalog.map((item) => (
                      <option key={item.b2Code} value={item.b2Code}>
                        {item.b2Code} - {item.b2Name} ({item.width || "-"}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Descrição Bobina 2"
                  value={newB2Purchase.b2Name}
                  onChange={(e) =>
                    setNewB2Purchase((prev) => ({
                      ...prev,
                      b2Name: e.target.value,
                    }))
                  }
                  placeholder="Ex: BOBINA 2 PERFIL UE"
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Largura (mm)"
                    type="number"
                    value={newB2Purchase.width}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        width: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Espessura"
                    value={newB2Purchase.thickness}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        thickness: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Tipo"
                    value={newB2Purchase.type}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Peso total (kg)"
                    type="number"
                    value={newB2Purchase.weight}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Qtd de bobinas"
                    type="number"
                    value={newB2Purchase.quantity}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>

                {purchaseUnitWeight && (
                  <div className="text-xs text-gray-400">
                    Peso por bobina aproximado:{" "}
                    <span className="text-blue-300 font-bold">
                      {purchaseUnitWeight} kg
                    </span>
                  </div>
                )}

                <Button onClick={addPurchasedChildCoil} className="w-full" disabled={isSavingB2Purchase}>
                  {isSavingB2Purchase ? "Lançando..." : "Lancar Bobina 2 (NF)"}
                </Button>
              </div>
            ) : (
              <>
                {/* --- LINHA 0.1: SELETOR DE TIPO DE INOX (SEM REPETIÇÃO) --- */}
                {isInoxSelected && (
                  <div>
                    <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                      Tipo de Inox
                    </label>
                    <select
                      value={selectedInoxGrade}
                      onChange={handleSelectInoxGrade}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Selecione...</option>
                      {inoxGrades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>

                    {defaultProductForSelectedGrade && (
                      <div className="mt-2 text-[11px] text-gray-400">
                        Medidas padrão:{" "}
                        <span className="font-semibold">
                          {defaultProductForSelectedGrade.measuresLabel}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* --- LINHA 1: CÓDIGO, NF e DATA (3 Colunas) --- */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Código Lote só aparece quando NÃO é inox */}
                  {!isInoxSelected && (
                    <div className="col-span-1">
                      <Input
                        label="Código Lote"
                        value={newMotherCoil.code}
                        onChange={(e) =>
                          setNewMotherCoil({
                            ...newMotherCoil,
                            code: e.target.value,
                          })
                        }
                        placeholder="Ex: 10644"
                      />
                    </div>
                  )}

                  <div className={isInoxSelected ? "col-span-2" : "col-span-1"}>
                    <Input
                      label="Nota Fiscal"
                      value={newMotherCoil.nf}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          nf: e.target.value,
                        })
                      }
                      placeholder="Ex: 12345"
                    />
                  </div>

                  <div className="col-span-1">
                    <Input
                      label="Data Entrada"
                      type="date"
                      value={newMotherCoil.entryDate}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          entryDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* --- LINHA 2: 
                      - INOX: Peso + Quantidade
                      - Não INOX: Peso + Largura
                  --- */}
                {isInoxSelected ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Peso (kg)"
                      type="number"
                      value={newMotherCoil.weight}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          weight: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Quantidade (peças)"
                      type="number"
                      value={newMotherCoil.qty || ""}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          qty: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Peso (kg)"
                      type="number"
                      value={newMotherCoil.weight}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          weight: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Largura (mm)"
                      type="number"
                      value={newMotherCoil.width}
                      onChange={(e) =>
                        setNewMotherCoil({
                          ...newMotherCoil,
                          width: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}

            {!isB2Industrialized && (
              <Button
                onClick={addMotherCoil}
                className="w-full py-3 text-lg shadow-md mt-4"
              >
                Confirmar Entrada
              </Button>
            )}
          </div>
        </Card>
      </div>


      {/* LADO DIREITO: LISTA DE ENTRADAS */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="bg-gray-800/80 border-blue-900/30">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                Material Identificado
              </label>
              <div className="font-medium text-white text-lg truncate">
                {newMotherCoil.material || "Aguarda código..."}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Espessura
                </label>
                <div className="font-bold text-blue-400 text-xl">
                  {newMotherCoil.thickness || "-"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Tipo
                </label>
                <div className="font-bold text-blue-400 text-xl">
                  {newMotherCoil.type || "-"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
            <List size={20} className="text-gray-400" /> Entradas Recentes
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3 max-h-[calc(100vh-260px)]">
            {[
              ...motherCoils.map((m) => ({ ...m, entryType: "mother" })),
              ...childCoils
                .filter((c) => c.source === "purchase_nf" || c.origin === "NF")
                .map((c) => ({ ...c, entryType: "b2nf" })),
            ]
              .sort((a, b) => {
                const getDateValue = (item) => {
                  const raw =
                    item.entryDate ||
                    item.date ||
                    item.createdAt ||
                    "";
                  if (raw && raw.length === 10 && raw.includes("-")) {
                    return new Date(raw).getTime();
                  }
                  if (raw && raw.includes("/")) {
                    const [dia, mes, ano] = raw.split("/");
                    return new Date(`${ano}-${mes}-${dia}`).getTime();
                  }
                  return 0;
                };

                const timeA = getDateValue(a);
                const timeB = getDateValue(b);

                if (timeA !== timeB) {
                  return timeB - timeA;
                }

                const codeA = a.entryType === "b2nf" ? a.b2Code : a.code;
                const codeB = b.entryType === "b2nf" ? b.b2Code : b.code;

                return String(codeB || "")
                  .localeCompare(String(codeA || ""), undefined, {
                    numeric: true,
                  });
              })
              .slice(0, 50)
              .map((coil) => (
                <div
                  key={coil.id}
                  className={`p-4 rounded-xl border flex justify-between items-center transition-all hover:bg-gray-700/50 ${
                    coil.status === "stock"
                      ? "bg-gray-900 border-gray-700"
                      : "bg-gray-800 border-gray-700 opacity-50"
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-200 flex items-center gap-2 flex-wrap">
                      {coil.entryType === "b2nf" ? coil.b2Code : coil.code}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          coil.status === "stock"
                            ? "bg-emerald-900/40 text-emerald-400 border border-emerald-900"
                            : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        {coil.entryType === "b2nf"
                          ? "B2 NF"
                          : coil.status === "stock"
                          ? "EM ESTOQUE"
                          : "CONSUMIDA"}
                      </span>

                      {coil.form === "BLANK" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-500/40">
                          BLANK INOX
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      {coil.entryType === "b2nf"
                        ? `${coil.b2Name || coil.b2Code || ""}`.toUpperCase()
                        : (coil.family || coil.type || "").toUpperCase()}{" "}
                      | {coil.thickness || "-"} |{" "}
                      {coil.entryType === "b2nf" ? coil.type : coil.material}
                    </div>

                    <div className="text-[10px] text-blue-400 mt-1 font-bold">
                      NF: {coil.nf || "-"} | Entrada:{" "}
                      {coil.entryDate || coil.date || coil.createdAt || "-"}
                    </div>

                    {coil.form === "BLANK" && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {coil.width} x {coil.length} mm | Qtd:{" "}
                        {coil.qty || 0} pcs
                      </div>
                    )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-xl text-white">
                        {(Number(coil.weight) || 0).toFixed(0)}{" "}
                          <span className="text-sm text-gray-500 font-normal">
                            kg
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                        {coil.width}mm
                        </div>
                      </div>
                    {coil.status === "stock" && (
                      <div className="flex gap-2">
                        {coil.entryType === "b2nf" ? (
                          <>
                            <button
                              onClick={() => setEditingChildCoil(coil)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteChildCoil(coil.id)}
                              className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingMotherCoil(coil)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteMotherCoil(coil.id)}
                              className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};


const getUnitWeight = (code) => {
    const c = String(code || '').trim();
    return Number(PESO_UNITARIO_PA[c]) || 0;
  };




  const renderCuttingProcess = () => {
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
    let availableB2Types = [];
    if (selectedMother) {
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
        availableB2Types = Array.from(uniqueMap.values()).sort((a, b) => a.b2Name.localeCompare(b.b2Name));
    }

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
  const renderProduction = () => {
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
    const groupedLogs = productionLogs.reduce((acc, log) => {
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

    // Transforma em array e ordena pelo movimento mais recente
    const groupedList = Object.values(groupedLogs).sort((a, b) => {
        return new Date(b.lastTimestamp) - new Date(a.lastTimestamp);
    });

    // Paginação aplicada aos GRUPOS agora
    const paginatedGroups = groupedList.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);

    // Totais visuais (Mantido igual)
    const totalInputWeight = selectedInputCoils.reduce((acc, c) => acc + c.weight, 0);
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
                      <span className="text-xs text-blue-400 font-bold">{selectedInputCoils.length} bobinas | {totalInputWeight} kg</span>
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
  const renderShipping = () => {
    const stock = getFinishedStock();
    const availableProducts = Object.values(stock).filter(i => i.count > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
         <Card>
            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 text-lg"><Truck className="text-amber-500"/> Nova Expedição</h3>
            <div className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Produto em Estoque</label>
                 <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-200 outline-none text-sm" value={shipProduct} onChange={e => setShipProduct(e.target.value)}>
  <option value="">Selecione...</option>
  {/* AQUI ESTÁ A ALTERAÇÃO: Adicionei {p.code} e um traço separador */}
  {availableProducts.map(p => (
    <option key={p.code} value={p.code}>
      {p.code} - {p.name} (Saldo: {p.count})
    </option>
  ))}
</select>
               </div>
               <Input label="Quantidade" type="number" value={shipQty} onChange={e => setShipQty(e.target.value)} />
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Destino (Filial)</label>
                 <div className="flex gap-4">
                   <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dest" checked={shipDest === 'COMETA'} onChange={() => setShipDest('COMETA')} /> <span className="text-white">Cometa</span></label>
                   <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dest" checked={shipDest === 'SERRA'} onChange={() => setShipDest('SERRA')} /> <span className="text-white">Serra</span></label>
                 </div>
               </div>
               <Button onClick={registerShipping} variant="warning" className="w-full py-3 mt-4">Confirmar Baixa</Button>
            </div>
         </Card>
         <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
  <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">Histórico de Expedição</h3>
  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark space-y-2">
    {shippingLogs.map(log => (
      <div key={log.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
        <div className="flex justify-between">
          {/* AQUI A ALTERAÇÃO: Adicionando o código antes do nome */}
          <span className="font-bold text-white">
            {log.productCode} - {log.productName}
          </span>
          <span className="text-xs text-gray-500">{log.date}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-sm text-amber-400 font-bold">{log.destination}</span>
          <span className="text-sm text-gray-300">{log.quantity} pçs</span>
        </div>
      </div>
    ))}
  </div>
</Card>
      </div>
    );
  };

// --- GERADOR DE PDF PROFISSIONAL (EXTRATO MP) ---
  const handleGenerateMPReportPDF = (dataList, start, end) => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups.");

    const now = new Date().toLocaleString();

    // Gera o HTML de cada item (Bobina)
    const itemsHtml = dataList.map(item => {
        // Recalcula o saldo linha a linha para o PDF ficar perfeito
        let runningBalance = item.initialBalance;
        const movementsRows = item.movements.map(mov => {
            runningBalance += mov.weightChange;
            const isEntry = mov.weightChange > 0;
            return `
                <tr>
                    <td style="text-align:center">${mov.date}</td>
                    <td>${mov.type}</td>
                    <td>${mov.detail}</td>
                    <td style="text-align:right; color:${isEntry ? '#059669' : '#ccc'}">${isEntry ? mov.weightChange.toLocaleString('pt-BR') : '-'}</td>
                    <td style="text-align:right; color:${!isEntry ? '#dc2626' : '#ccc'}">${!isEntry ? Math.abs(mov.weightChange).toLocaleString('pt-BR') : '-'}</td>
                    <td style="text-align:right; font-weight:bold; background-color:#f3f4f6">${runningBalance.toLocaleString('pt-BR')}</td>
                </tr>
            `;
        }).join('');

        return `

        
            <div class="item-container">
                <div class="item-header">
                    <span class="item-code">${item.code}</span>
                    <span class="item-desc">${item.desc}</span>
                </div>
                
                <div class="kpi-box">
                    <div><span class="label">Saldo Anterior:</span> <span class="value">${item.initialBalance.toLocaleString('pt-BR')} kg</span></div>
                    <div><span class="label">Entradas:</span> <span class="value" style="color:#059669">+${item.periodIn.toLocaleString('pt-BR')} kg</span></div>
                    <div><span class="label">Saídas:</span> <span class="value" style="color:#dc2626">-${item.periodOut.toLocaleString('pt-BR')} kg</span></div>
                    <div style="border-left:1px solid #ccc; padding-left:10px"><span class="label">Saldo Atual:</span> <span class="value" style="font-weight:900">${item.finalBalance.toLocaleString('pt-BR')} kg</span></div>
                </div>

                ${item.movements.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th width="15%">Data</th>
                                <th width="15%">Tipo</th>
                                <th>Histórico / NF</th>
                                <th width="12%" style="text-align:right">Entrada</th>
                                <th width="12%" style="text-align:right">Saída</th>
                                <th width="15%" style="text-align:right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movementsRows}
                        </tbody>
                    </table>
                ` : '<div style="padding:10px; color:#999; font-style:italic; text-align:center; border:1px solid #eee;">Sem movimentação no período selecionado.</div>'}
            </div>
        `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Extrato de Movimentação - Metalosa</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #333; -webkit-print-color-adjust: exact; }
            .header { border-bottom: 2px solid #1f2937; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title h1 { margin: 0; font-size: 18px; text-transform: uppercase; color: #111827; }
            .title p { margin: 0; color: #6b7280; }
            .meta { text-align: right; font-size: 10px; color: #6b7280; }
            
            .item-container { margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
            .item-header { background-color: #1f2937; color: white; padding: 8px 12px; font-size: 13px; font-weight: bold; display: flex; gap: 10px; align-items: center; }
            .item-code { background: #374151; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
            
            .kpi-box { display: flex; justify-content: space-between; background: #f9fafb; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            .label { text-transform: uppercase; color: #6b7280; font-size: 9px; font-weight: bold; margin-right: 5px; }
            .value { font-size: 12px; font-weight: 600; }

            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #f3f4f6; color: #4b5563; text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; font-size: 9px; }
            td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
            tr:last-child td { border-bottom: none; }
            tr:nth-child(even) { background-color: #fff; }
            
            .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #9ca3af; padding: 10px; background: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">
                <h1>Extrato de Movimentação de Estoque</h1>
                <p>Período: <strong>${start.split('-').reverse().join('/')}</strong> até <strong>${end.split('-').reverse().join('/')}</strong></p>
            </div>
            <div class="meta">
                <p>Emissão: ${now}</p>
                <p>METALOSA INDÚSTRIA</p>
            </div>
          </div>

          ${itemsHtml}
          
          <div class="footer">Relatório gerado pelo Sistema de Controle de Produção</div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

const renderReports = () => {
  // =================================================================================
  // 1. UTILITÁRIOS E SEGURANÇA
  // =================================================================================
  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const normalizeCode = (v) => String(v ?? '').trim();

  const isValidDate = (d) =>
    d && typeof d === 'string' && (d.includes('/') || d.includes('-'));

  const toISODate = (d) => {
    if (!isValidDate(d)) return '0000-00-00';
    if (d.includes('/')) return d.split('/').reverse().join('-');
    return d;
  };

  const getTimestamp = (d) => {
    if (!isValidDate(d)) return 0;
    const iso = d.includes('/') ? d.split('/').reverse().join('-') : d;
    return new Date(`${iso}T12:00:00`).getTime();
  };

  const getTypeColor = (type) => {
    if (type === 'ENTRADA MP') return 'text-blue-400';
    if (type === 'CORTE') return 'text-purple-400';
    if (type === 'PRODUÇÃO') return 'text-emerald-400';
    return 'text-amber-400';
  };

  // chave padrão de MP: código + largura (quando não usamos id)
  // 🔹 SEM ID: 1 chave = 1 (código + largura)
const makeKeyFromMother = (m) => {
  const code = normalizeCode(m?.code) || 'S/ COD';
  const w = safeNum(m?.width);
  return `${code}|${w || 0}`;
};

const makeKeyFromCut = (c, safeMother) => {
  const code = normalizeCode(c?.motherCode) || 'S/ COD';
  const inputWeight = safeNum(c?.inputWeight); // peso consumido no corte

  const candidates = safeMother.filter(
    (m) => normalizeCode(m.code) === code
  );

  // 1) tenta usar a largura que veio no log de corte
  let width = safeNum(c?.motherWidth) || safeNum(c?.width) || 0;

  const hasMotherWithThisWidth =
    width > 0 &&
    candidates.some((m) => safeNum(m.width) === width);

  // Se a largura que veio NO CORTE não existir em nenhuma bobina,
  // considera que ela é inválida e vamos tentar outro critério.
  if (!hasMotherWithThisWidth) {
    width = 0;
  }

  // 2) Se ainda não temos largura válida, tenta casar pelo PESO DO LOTE
  if (!width && inputWeight > 0) {
    // compara com peso original ou peso cheio da bobina
    const byExactWeight = candidates.filter((m) => {
      const wMother =
        safeNum(m.originalWeight) || safeNum(m.weight);
      // tolerância pequena pra evitar problema de casa decimal
      return Math.abs(wMother - inputWeight) < 0.001;
    });

    if (byExactWeight.length === 1) {
      width = safeNum(byExactWeight[0].width);
    }
  }

  // 3) Se mesmo assim ainda não rolou, volta pro fallback antigo:
  //    se só tiver UMA largura possível nesse código, usa ela.
  if (!width) {
    const uniqueWidths = [
      ...new Set(
        candidates.map((m) => safeNum(m.width)).filter((w) => w > 0)
      ),
    ];
    if (uniqueWidths.length === 1) {
      width = uniqueWidths[0];
    } else {
      // aqui não tem jeito: ambíguo mesmo
      width = 0;
    }
  }

  return `${code}|${width || 0}`;
};



const handleGlobalDetail = (group) => {
  // group = { date, isoDate, type, events, totalQty, totalWeight }
  setSelectedGlobalGroup(group);
};



  // Arrays seguros
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeCutting = Array.isArray(cuttingLogs) ? cuttingLogs : [];
  const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
  const safeShipping = Array.isArray(shippingLogs) ? shippingLogs : [];

  // =================================================================================
  // 2. EXTRATO MP (KARDEX)
  // =================================================================================

  // A. Estoque real (saldo físico hoje)
  const realStockMap = {};
  safeMother.forEach((m) => {
    if (m.status !== 'stock') return;
    const key = makeKeyFromMother(m);
    if (!realStockMap[key]) realStockMap[key] = 0;
    realStockMap[key] += safeNum(m.remainingWeight) || safeNum(m.weight);
  });

  // B. Catálogo por código
  const catalogByCode = (motherCatalog || []).reduce((acc, item) => {
    const code = normalizeCode(item.code);
    if (code) acc[code] = item;
    return acc;
  }, {});

  // C. Movimentações por chave
  const movementsMap = {};

  // C1. Entradas
  safeMother.forEach((m) => {
    if (!m.date) return;
    const d = toISODate(m.date);
    if (d < reportStartDate || d > reportEndDate) return;

    const key = makeKeyFromMother(m);
    if (!movementsMap[key]) movementsMap[key] = { in: 0, out: 0, details: [] };

    let w = safeNum(m.originalWeight);
    if (w === 0) w = safeNum(m.weight);

    const width = safeNum(m.width);

    movementsMap[key].in += w;
    movementsMap[key].details.push({
      date: m.date,
      timestamp: getTimestamp(m.date),
      type: 'ENTRADA',
      weightChange: w,
      width, // guarda largura no movimento
      desc: m.material,
      detail: `NF: ${m.nf || '-'}`,
    });
  });

  // C2. Saídas (corte slitter)
  safeCutting.forEach((c) => {
  if (!c.date) return;
  const d = toISODate(c.date);
  if (d < reportStartDate || d > reportEndDate) return;

  const key = makeKeyFromCut(c, safeMother); // ou a chave que você já usa

  if (!movementsMap[key]) {
    movementsMap[key] = {
      code: c.motherCode || 'S/ COD',
      desc: c.motherMaterial || '',
      width:
        safeNum(c?.motherWidth) ||
        safeNum(c?.width) ||
        null,
      initialBalance: 0,
      in: 0,
      out: 0,
      details: [],
    };
  }

  const w = safeNum(c.inputWeight);

  // 👇 sucata do corte (ajusta o nome do campo se for diferente)
  const scrap = safeNum(c.scrapWeight ?? c.scrap ?? 0);

  movementsMap[key].out += w;

  // descrição base: o que você já mostrava
  const baseDetail =
    c.generatedItems ||
    c.motherMaterial ||
    'Consumo Slitter';

  // monta o texto final com sucata
  const detail =
    scrap > 0
      ? `${baseDetail} | Sucata: ${scrap.toLocaleString('pt-BR', {
          maximumFractionDigits: 1,
        })} kg`
      : baseDetail;

  movementsMap[key].details.push({
    date: c.date,
    timestamp: getTimestamp(c.date),
    type: 'SAÍDA',
    weightChange: -w,
    width: movementsMap[key].width,
    desc: movementsMap[key].desc,
    detail, // 👈 é isso que aparece no modal em {row.detail}
  });
});

  // D. Consolidação
  const mpSummaryList = [];
  const allKeys = new Set([
    ...Object.keys(movementsMap),
    ...Object.keys(realStockMap),
  ]);

  allKeys.forEach((key) => {
  const stock = realStockMap[key] || 0;
  const mov = movementsMap[key] || { in: 0, out: 0, details: [] };

  if (stock === 0 && mov.in === 0 && mov.out === 0) return;

  const calculatedInitial = stock - mov.in + mov.out;

  // key = "CODIGO|LARGURA"
  const [rawCode, rawWidth = '0'] = key.split('|');
  const code = normalizeCode(rawCode) || 'S/ COD';
  let width = safeNum(rawWidth) || 0;

  // 🔹 FALLBACK: se width veio 0, tenta achar em movimentos ou bobinas
  if (!width || width === 0) {
    const movWidth = mov.details.find((d) => safeNum(d.width) > 0);
    if (movWidth) {
      width = safeNum(movWidth.width);
    } else {
      const anyCoil = safeMother.find(
        (m) => normalizeCode(m.code) === code && safeNum(m.width) > 0
      );
      if (anyCoil) width = safeNum(anyCoil.width);
    }
  }

  const catalogItem = catalogByCode[code];
  const originalCoil = safeMother.find(
    (m) =>
      normalizeCode(m.code) === code &&
      (!width || safeNum(m.width) === width)
  );
  const histDesc = mov.details[0]?.desc;

  const description =
    catalogItem?.description ||
    originalCoil?.material ||
    histDesc ||
    'Item';

  mpSummaryList.push({
    key,
    code,
    width: width || null,
    desc: description,
    initialBalance: calculatedInitial,
    periodIn: mov.in,
    periodOut: mov.out,
    finalBalance: stock,
    movements: mov.details.sort((a, b) => a.timestamp - b.timestamp),
  });
});

  mpSummaryList.sort((a, b) => {
  const c = String(a.code).localeCompare(String(b.code));
  if (c !== 0) return c;
  return (a.width || 0) - (b.width || 0);
});


  // =================================================================================
  // 3. VISÃO GERAL (GLOBAL)
  // =================================================================================
    const rawGlobalEvents = [];

  // ENTRADA MP
  safeMother.forEach((m) =>
    rawGlobalEvents.push({
      rawDate: m.date,
      type: 'ENTRADA MP',
      id: m.code || '?',
      desc: m.material || '-',
      qty: 1,
      weight: safeNum(m.originalWeight) || safeNum(m.weight),
    })
  );

  // CORTE SLITTER
  // CORTE – usado na LINHA DO TEMPO GLOBAL e no modal "Cortes Slitter"
safeCutting.forEach((c) => {
  const code = c.motherCode || '?';

  // descrição base: produtos gerados > material da mãe > fallback
  const baseDesc =
    c.generatedItems ||
    c.motherMaterial ||
    'Corte Slitter';

  // sucata do corte (ajusta o campo se o nome for outro)
  const scrap = safeNum(c.scrapWeight ?? c.scrap ?? 0);

  // monta a descrição final com sucata, se tiver
  const desc =
    scrap > 0
      ? `${baseDesc} | Sucata: ${scrap.toLocaleString('pt-BR', {
          maximumFractionDigits: 1,
        })} kg`
      : baseDesc;

  const qty = safeNum(c.outputCount) || 1;
  const weight = safeNum(c.inputWeight); // peso consumido da MP

  rawGlobalEvents.push({
    rawDate: c.date,
    type: 'CORTE',
    id: code,
    desc,
    qty,
    weight,
  });
});



  // PRODUÇÃO PA
  safeProd.forEach((p) => {
  const code = p.productCode || 'S/ COD';

  const qty = safeNum(p.pieces);
  const unitWeight = getUnitWeight(code);      // kg por peça
  const totalWeight = unitWeight * qty;        // kg total da produção

  rawGlobalEvents.push({
    rawDate: p.date,
    type: 'PRODUÇÃO',
    id: code,
    desc: p.productName || '-',
    qty,
    unitWeight,                                // (se quiser usar depois)
    weight: totalWeight,                       // 👈 agora vem do mapa de peso
  });
});


  // EXPEDIÇÃO PA
  safeShipping.forEach((s) => {
  const code = s.productCode || 'S/ COD';

  const qty = safeNum(s.quantity);          // quantidade expedida (peças)
  const unitWeight = getUnitWeight(code);   // kg por peça, vindo do PESO_UNITARIO_PA
  const totalWeight = unitWeight * qty;     // peso total expedido

  rawGlobalEvents.push({
    rawDate: s.date,
    type: 'EXPEDIÇÃO',
    id: code,
    desc: s.productName || '-',
    qty,
    unitWeight,                             // se quiser ver no detalhe depois
    weight: totalWeight,                    // 👈 agora com valor correto
  });
});


  // ---- AGRUPAMENTO POR DIA + TIPO ----
  const stats = { entradaKg: 0, corteKg: 0, prodPcs: 0, expPcs: 0 };
  const globalGroupsMap = {};

  rawGlobalEvents.forEach((e) => {
    if (!e.rawDate) return;

    const iso = toISODate(e.rawDate);
    if (iso < reportStartDate || iso > reportEndDate) return;

    if (reportSearch) {
      const term = reportSearch.toLowerCase();
      const text = (
        String(e.id) +
        String(e.desc) +
        String(e.type)
      ).toLowerCase();
      if (!text.includes(term)) return;
    }

    const key = `${iso}|${e.type}`;

    if (!globalGroupsMap[key]) {
      globalGroupsMap[key] = {
        date: e.rawDate,
        isoDate: iso,
        type: e.type,
        events: [],
        totalQty: 0,
        totalWeight: 0,
      };
    }

    const group = globalGroupsMap[key];
    group.events.push(e);
    group.totalQty += e.qty;
    group.totalWeight += e.weight;

    if (e.type === 'ENTRADA MP') stats.entradaKg += e.weight;
    if (e.type === 'CORTE') stats.corteKg += e.weight;
    if (e.type === 'PRODUÇÃO') stats.prodPcs += e.qty;
    if (e.type === 'EXPEDIÇÃO') stats.expPcs += e.qty;
  });

  // Lista final, agrupada e ORDENADA (mais recente primeiro)
  const globalTimeline = Object.values(globalGroupsMap).sort(
    (a, b) => b.isoDate.localeCompare(a.isoDate)
  );


  // =================================================================================
  // 4. RESUMO PRODUÇÃO
  // =================================================================================
  const prodByProductMap = {};

    safeProd.forEach((lot) => {
      if (!lot.date) return;
      const d = toISODate(lot.date);
      if (d < reportStartDate || d > reportEndDate) return;

      if (reportSearch) {
        const term = reportSearch.toLowerCase();
        const text = (
          String(lot.productCode) + String(lot.productName)
        ).toLowerCase();
        if (!text.includes(term)) return;
      }

      const code = lot.productCode || 'S/ COD';

      if (!prodByProductMap[code]) {
        prodByProductMap[code] = {
          code,
          name: lot.productName,
          totalQty: 0,
          totalWeight: 0,
          totalScrap: 0,
          items: [],          // usado pelo modal
        };
      }

      const pieces = safeNum(lot.pieces);
      const scrap = safeNum(lot.scrap);

      // 👇 peso unitário vindo do mapa
      const unitWeight = getUnitWeight(code);      // kg por peça (ou por unidade que você definiu)
      const weight = unitWeight * pieces;          // peso total desse lançamento

      // acumula totais
      prodByProductMap[code].totalQty += pieces;
      prodByProductMap[code].totalWeight += weight;
      prodByProductMap[code].totalScrap += scrap;

      // alimenta itens para o modal
      prodByProductMap[code].items.push({
        date: lot.date,
        id: lot.batchId || lot.lotId || lot.id || '-',
        packCount: safeNum(lot.packCount) || safeNum(lot.packs) || 0,
        motherCode: lot.motherCode || lot.motherCoilCode || '',
        pieces,
        unitWeight,          // 👈 guarda o peso unitário
        weight,              // 👈 peso total (qtd * unitário)
        timestamp:
          lot.timestamp ??
          new Date(d + 'T12:00:00').getTime(),
      });
    });

const prodSummaryList = Object.values(prodByProductMap).sort((a, b) =>
  String(a.name).localeCompare(String(b.name))
);


  // =================================================================================
  // 5. RENDERIZAÇÃO
  // =================================================================================
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ABAS */}
      <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setReportViewMode('GLOBAL')}
          className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
            reportViewMode === 'GLOBAL'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setReportViewMode('MP_KARDEX')}
          className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
            reportViewMode === 'MP_KARDEX'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Extrato MP
        </button>
        <button
          onClick={() => setReportViewMode('PROD_SUMMARY')}
          className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
            reportViewMode === 'PROD_SUMMARY'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Resumo Produção
        </button>
      </div>

      {/* FILTROS */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-2 flex-1">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Início</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Fim</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Buscar..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* ABA 1: GLOBAL */}
      {reportViewMode === 'GLOBAL' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            <Card className="border-l-4 border-blue-500 bg-gray-800 p-4">
              <p className="text-gray-400 text-[10px] font-bold uppercase">
                Entrada MP
              </p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-xl font-bold text-white">
                  {stats.entradaKg.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-blue-400 mb-1">kg</span>
              </div>
            </Card>
            <Card className="border-l-4 border-purple-500 bg-gray-800 p-4">
              <p className="text-gray-400 text-[10px] font-bold uppercase">
                Consumo Slitter
              </p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-xl font-bold text-white">
                  {stats.corteKg.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-purple-400 mb-1">kg</span>
              </div>
            </Card>
            <Card className="border-l-4 border-emerald-500 bg-gray-800 p-4">
              <p className="text-gray-400 text-[10px] font-bold uppercase">
                Produção PA
              </p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-xl font-bold text-white">
                  {stats.prodPcs.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-emerald-400 mb-1">pçs</span>
              </div>
            </Card>
            <Card className="border-l-4 border-amber-500 bg-gray-800 p-4">
              <p className="text-gray-400 text-[10px] font-bold uppercase">
                Expedição PA
              </p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-xl font-bold text-white">
                  {stats.expPcs.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-amber-400 mb-1">pçs</span>
              </div>
            </Card>
          </div>

          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <h3 className="font-bold text-gray-200">
                Linha do Tempo Global
              </h3>
              <Button
                variant="secondary"
                onClick={() => {
                  const data = globalTimeline.map((e) => ({
                    Data: e.rawDate,
                    Tipo: e.type,
                    Código: e.id,
                    Descrição: e.desc,
                    Qtd: e.qty,
                    Peso: e.weight,
                  }));
                  exportToCSV(data, `relatorio_global`);
                }}
                className="h-8 text-xs"
              >
                <Download size={14} /> Excel
              </Button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar-dark">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Peso</th>
                    <th className="p-3 text-center">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {globalTimeline.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        Nenhum registro no período.
                      </td>
                    </tr>
                  ) : (
                    globalTimeline.map((g, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="p-3 text-xs text-gray-400 font-mono">
                          {g.date}
                        </td>
                        <td
                          className={`p-3 font-bold text-xs ${getTypeColor(
                            g.type
                          )}`}
                        >
                          {g.type}
                        </td>
                        <td className="p-3 text-white">
                          {g.type === 'ENTRADA MP' &&
                            `Entradas de MP (${g.events.length} registro${
                              g.events.length !== 1 ? 's' : ''
                            })`}
                          {g.type === 'CORTE' &&
                            `Cortes Slitter (${g.events.length} registro${
                              g.events.length !== 1 ? 's' : ''
                            })`}
                          {g.type === 'PRODUÇÃO' &&
                            `Produções de PA (${g.events.length} registro${
                              g.events.length !== 1 ? 's' : ''
                            })`}
                          {g.type === 'EXPEDIÇÃO' &&
                            `Expedições de PA (${g.events.length} registro${
                              g.events.length !== 1 ? 's' : ''
                            })`}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {g.totalQty}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-300">
                          {g.totalWeight.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleGlobalDetail(g)}
                            className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs transition-colors flex items-center gap-2 mx-auto"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ABA 2: EXTRATO MP */}
      {reportViewMode === 'MP_KARDEX' && (
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-emerald-600">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-emerald-900/10 -mt-6 -mx-6">
            <div>
              <h3 className="font-bold text-xl text-emerald-100">
                Extrato MP
              </h3>
              <p className="text-sm text-emerald-300/70">Auditoria de Estoque</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  handleGenerateMPReportPDF(
                    mpSummaryList,
                    reportStartDate,
                    reportEndDate
                  )
                }
                className="h-9 bg-rose-600 text-white hover:bg-rose-500"
              >
                <FileText size={14} /> PDF
              </Button>
              <Button
                onClick={() => {
                  const analyticalData = [];
                  mpSummaryList.forEach((item) => {
                    item.movements.forEach((mov) => {
                      analyticalData.push({
                        Código: item.code,
                        Descrição: item.desc,
                        'Largura (mm)': item.width ?? '',
                        Data: mov.date,
                        Tipo: mov.type,
                        'Detalhe/NF': mov.detail,
                        'Entrada (kg)':
                          mov.type === 'ENTRADA' ? mov.weightChange : 0,
                        'Saída (kg)':
                          mov.type !== 'ENTRADA'
                            ? Math.abs(mov.weightChange)
                            : 0,
                      });
                    });
                  });
                  exportToCSV(analyticalData, `relatorio_analitico_mp`);
                }}
                className="h-9 bg-blue-600 text-white hover:bg-blue-500"
              >
                <Download size={14} /> Detalhado
              </Button>
              <Button
                onClick={() => {
                  const data = mpSummaryList.map((i) => ({
                    Código: i.code,
                    Descrição: i.desc,
                    'Largura (mm)': i.width ?? '',
                    'Saldo Anterior (kg)': i.initialBalance,
                    'Entradas (kg)': i.periodIn,
                    'Saídas (kg)': i.periodOut,
                    'Saldo Atual (kg)': i.finalBalance,
                  }));
                  exportToCSV(data, `extrato_mp_saldos`);
                }}
                className="h-9 bg-emerald-600 text-white"
              >
                <Download size={14} /> Saldos
              </Button>
            </div>
          </div>
          



          <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-800 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Largura (mm)</th>
                  <th className="p-3 text-right text-gray-400 bg-gray-900/50">
                    Saldo Ant.
                  </th>
                  <th className="p-3 text-right text-emerald-400">Entradas</th>
                  <th className="p-3 text-right text-red-400">Saídas</th>
                  <th className="p-3 text-right text-white font-bold bg-blue-900/40 border-l border-blue-700">
                    Saldo Atual
                  </th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {mpSummaryList
                  .filter((i) => {
                    if (!reportSearch) return true;
                    const term = reportSearch.toLowerCase();
                    return (
                      i.code.toLowerCase().includes(term) ||
                      String(i.desc || '')
                        .toLowerCase()
                        .includes(term) ||
                      (i.width != null &&
                        String(i.width).toLowerCase().includes(term))
                    );
                  })
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      <td className="p-3 font-bold text-white">{row.code}</td>
                      <td className="p-3 text-gray-400 truncate max-w-[220px]">
                        {row.desc}
                      </td>
                      <td className="p-3 text-right text-gray-300 font-mono">
                        {row.width != null ? row.width : '-'}
                      </td>
                      <td className="p-3 text-right text-gray-300 font-mono bg-gray-900/30">
                        {row.initialBalance.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-mono">
                        {row.periodIn.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right text-red-400 font-mono">
                        {row.periodOut.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-right font-bold text-white font-mono bg-blue-900/20 border-l border-gray-700">
                        {row.finalBalance.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setViewingMpDetails({
                              ...row,
                              initialBalance: row.initialBalance,
                            })
                          }
                          className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 3: RESUMO PRODUÇÃO */}
      {reportViewMode === 'PROD_SUMMARY' && (
  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-purple-600">
    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-purple-900/10 -mt-6 -mx-6">
      <div>
        <h3 className="font-bold text-xl text-purple-100">
          Resumo Produção
        </h3>
        <p className="text-sm text-purple-300/70">Por Produto</p>
      </div>
      <Button
        onClick={() => {
          const safeList = Array.isArray(prodSummaryList)
            ? prodSummaryList
            : [];

          const data = safeList.map((i) => ({
            Produto: i.name ?? '',
            Código: i.code ?? '',
            Qtd: Number(i.totalQty) || 0,
            Peso: Number(i.totalWeight) || 0,
            Sucata: Number(i.totalScrap) || 0,
          }));

          exportToCSV(data, `resumo_producao`);
        }}
        className="h-9 bg-purple-600 text-white"
      >
        <Download size={14} /> Excel
      </Button>
    </div>

    <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="bg-gray-800 text-gray-400 sticky top-0">
          <tr>
            <th className="p-3">Produto</th>
            <th className="p-3">Código</th>
            <th className="p-3 text-right text-emerald-400">Qtd</th>
            <th className="p-3 text-right text-blue-400">Peso</th>
            <th className="p-3 text-right text-red-400">Sucata</th>
            <th className="p-3 text-center">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {(Array.isArray(prodSummaryList) ? prodSummaryList : []).map(
            (row, idx) => {
              const qty = Number(row.totalQty) || 0;
              const weight = Number(row.totalWeight) || 0;
              const scrap = Number(row.totalScrap) || 0;

              return (
                <tr key={idx} className="hover:bg-gray-700/50">
                  <td className="p-3 font-bold text-white text-sm">
                    {row.name ?? '-'}
                  </td>
                  <td className="p-3 text-gray-400 text-xs font-mono">
                    {row.code ?? '-'}
                  </td>
                  <td className="p-3 text-right text-emerald-400 font-bold text-lg">
                    {qty}
                  </td>
                  <td className="p-3 text-right text-blue-400 font-mono">
                    {weight.toFixed(1)} kg
                  </td>
                  <td className="p-3 text-right text-red-400 font-mono">
                    {scrap.toFixed(1)} kg
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setViewingProdDetails(row)}
                      className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Eye size={14} /> Detalhes
                    </button>
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  </Card>
)}

    </div>
  );
};

  const handleGeneratePDF = (title, data) => {
    // Cria uma janela popup invisível
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");

    // Monta o HTML do Relatório
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 5px 0; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .right { text-align: right; }
            .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>METALOSA</h1>
            <p>Relatório de Estoque - ${title}</p>
            <p>Data de Emissão: ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto / Descrição</th>
                <th class="right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${item.code}</td>
                  <td>${item.name}</td>
                  <td class="right"><strong>${item.count}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Sistema de Controle de Produção - Metalosa
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Espera carregar e manda imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // ==================================================================
  // COLE ISTO DENTRO DO APP, ANTES DE "const renderDashboard = ..."
  // ==================================================================

  // --- 1. IMPORTAÇÃO GENÉRICA (BACKUP / LOTE) ---
  // --- FUNÇÃO DE IMPORTAÇÃO (ATUALIZADA PARA SEU ARQUIVO) ---
  // --- 1. IMPORTAÇÃO GENÉRICA (BACKUP / LISTA COMPLETA) ---
  const handleImportBackup = (e, setter, label) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        
        if (rows.length < 2) return alert("Arquivo vazio.");
        
        // Mapeamento de colunas
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const data = []; // Usaremos um array novo para expandir as quantidades

        rows.slice(1).forEach(row => {
          const obj = {};
          headers.forEach((header, index) => {
            let val = row[index];
            if (val === undefined) return;

            let key = header;
            // Mapeamentos
            if (header.includes('largura')) key = 'width';
            if (header.includes('peso')) key = 'weight';
            if (header.includes('código') || header.includes('codigo') || header.includes('lote')) key = 'code';
            if (header.includes('material') || header.includes('descrição')) key = 'material';
            if (header.includes('nota') || header.includes('nf')) key = 'nf';
            if (header.includes('filial')) key = 'branch';
            if (header.includes('tipo')) key = 'type';
            if (header.includes('espesura') || header.includes('espessura')) key = 'thickness';
            if (header.includes('quantidade') || header.includes('qtd')) key = 'qty_temp'; // <--- LÊ QUANTIDADE

            // Limpa números
            if (typeof val === 'string' && /^[0-9.,]+$/.test(val)) {
               const clean = val.replace(/\./g, '').replace(',', '.');
               if (!isNaN(Number(clean)) && clean !== '') val = Number(clean);
            }
            obj[key] = val;
          });

          // Ajustes padrão
          if (!obj.status) obj.status = 'stock';
          if (!obj.branch) obj.branch = 'MATRIZ'; 
          
          if (label.includes('Mãe')) {
              if (obj.weight && !obj.remainingWeight) obj.remainingWeight = obj.weight;
              if (obj.weight && !obj.originalWeight) obj.originalWeight = obj.weight;
              if (!obj.width) obj.width = 1200;
              // Se não tiver material, cria um genérico para não ficar vazio
              if (!obj.material) obj.material = `BOBINA ${obj.code}`;
          }

          // LÓGICA DE QUANTIDADE: Se Qtd=2, cria 2 registros
          const loops = obj.qty_temp ? parseInt(obj.qty_temp) : 1;
          
          for (let i = 0; i < loops; i++) {
              data.push({
                  ...obj,
                  id: `IMP-${Date.now()}-${Math.floor(Math.random()*1000000)}`, // ID único para cada
              });
          }
        });

        if(data.length > 0){ 
            setter(data); 
            alert(`${label} atualizado!\nForam importados ${data.length} registros individuais.`); 
        }
      } catch (err) { alert("Erro: " + err.message); }
    };
    reader.readAsText(file);
  };
  // --- 2. INVENTÁRIO INTELIGENTE (BOBINA MÃE) ---
  // --- VERSÃO INTELIGENTE: INVENTÁRIO (LÊ CABEÇALHOS) ---
  // --- FUNÇÃO DE INVENTÁRIO INTELIGENTE (LÊ CABEÇALHOS DO EXCEL/CSV) ---
  const handleMotherInventory = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Usa as funções auxiliares que estão no final do arquivo
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        
        if (rows.length < 2) return alert("Arquivo vazio ou sem cabeçalho.");

        // 1. Identifica onde está cada coluna pelo nome (Header)
        // Remove acentos e deixa minúsculo para facilitar a busca (Ex: "CÓDIGO" vira "codigo")
        const headers = rows[0].map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")); 
        
        // Procura em qual coluna está cada informação
        const idxCode = headers.findIndex(h => h.includes('codigo') || h.includes('lote'));
        const idxWidth = headers.findIndex(h => h.includes('largura'));
        const idxWeight = headers.findIndex(h => h.includes('peso'));
        const idxBranch = headers.findIndex(h => h.includes('filial'));
        const idxType = headers.findIndex(h => h.includes('tipo'));

        // Validação básica: Precisa ter pelo menos Código e Peso
        if (idxCode === -1 || idxWeight === -1) {
            return alert(`Erro: Não encontrei as colunas 'Código' e 'Peso' no arquivo.\n\nColunas lidas: ${headers.join(', ')}`);
        }

        const inventoryMap = {}; 
        
        // 2. Processa as linhas usando os índices descobertos
        const dataRows = rows.slice(1);
        
        dataRows.forEach(row => {
             // Pega valor baseado no índice da coluna
             const rawCode = String(row[idxCode] || '').trim();
             
             // Funçãozinha interna para limpar números (tira ponto de milhar, troca vírgula por ponto)
             const parseNum = (val) => {
                 if (!val) return 0;
                 let clean = String(val).replace(/\./g, '').replace(',', '.');
                 return parseFloat(clean) || 0;
             };

             const width = idxWidth !== -1 ? parseNum(row[idxWidth]) : 0; // Se não tiver coluna largura, assume 0
             const weight = parseNum(row[idxWeight]);
             const branch = idxBranch !== -1 ? (row[idxBranch] || 'MATRIZ') : 'MATRIZ';
             const type = idxType !== -1 ? (row[idxType] || 'ND') : 'ND';

             if (rawCode && weight > 0) {
                 // Chave composta: Código + Largura (para diferenciar bobinas de larguras diferentes com mesmo lote)
                 const key = `${rawCode}|${width}`;
                 
                 if (!inventoryMap[key]) inventoryMap[key] = { weight: 0, branch, type };
                 inventoryMap[key].weight += weight;
                 
                 // Se no CSV tiver filial/tipo, atualiza (prevalece o último lido)
                 if(branch !== 'MATRIZ') inventoryMap[key].branch = branch;
                 if(type !== 'ND') inventoryMap[key].type = type;
             }
        });

        // 3. Compara com o Sistema
        let newMotherCoils = [...motherCoils];
        let newCuttingLogs = [...cuttingLogs];
        const dateNow = new Date().toLocaleDateString();
        let adjustedCount = 0;
        let diffTotal = 0;

        Object.keys(inventoryMap).forEach(key => {
            const [code, widthStr] = key.split('|');
            const width = parseFloat(widthStr);
            const { weight: realWeight, branch, type } = inventoryMap[key];

            // Busca bobinas no sistema. Se largura for 0 no CSV, ignora filtro de largura.
            const systemCoils = newMotherCoils.filter(m => 
                String(m.code) === code && 
                (width === 0 || Math.abs((parseFloat(m.width)||0) - width) < 5) && 
                m.status === 'stock'
            );
            
            const systemWeight = systemCoils.reduce((acc, m) => acc + (parseFloat(m.remainingWeight) || 0), 0);
            const diff = realWeight - systemWeight;

            // Ignora diferenças muito pequenas (menores que 0.5kg)
            if (Math.abs(diff) < 0.5) return;

            // Busca dados do catálogo para preencher lacunas se for criar novo
            let meta = systemCoils[0] || motherCatalog.find(m => String(m.code) === code) || { material: 'AJUSTE INVENTÁRIO', thickness: '-', type: type };

            if (diff > 0) {
                // SOBRA FÍSICA -> ENTRADA
                newMotherCoils.push({
                    id: `INV-ENT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    code: code,
                    nf: 'INVENTARIO',
                    material: meta.material || 'AJUSTE',
                    weight: diff,
                    originalWeight: diff,
                    remainingWeight: diff,
                    width: width > 0 ? width : (meta.width || 1200),
                    thickness: meta.thickness,
                    type: meta.type || type,
                    branch: branch,
                    status: 'stock',
                    date: dateNow,
                    isAdjustment: true
                });
            } else {
                // FALTA FÍSICA -> SAÍDA (CONSUMO)
                let weightToDeduct = Math.abs(diff);
                for (let coil of systemCoils) {
                    if (weightToDeduct <= 0) break;
                    const current = parseFloat(coil.remainingWeight);
                    
                    if (current <= weightToDeduct) {
                        // Consome total a bobina
                        coil.remainingWeight = 0;
                        coil.status = 'consumed';
                        coil.consumptionDetail = 'AJUSTE INVENTÁRIO';
                        coil.consumedDate = dateNow;
                        weightToDeduct -= current;
                    } else {
                        // Consome parcial a bobina
                        coil.remainingWeight = current - weightToDeduct;
                        weightToDeduct = 0;
                    }
                }
                
                // Registra Log de Corte/Ajuste
                newCuttingLogs.push({
                    id: `INV-SAI-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                    date: dateNow,
                    motherCode: code,
                    motherMaterial: meta.material || 'AJUSTE',
                    inputWeight: Math.abs(diff),
                    outputCount: 0,
                    scrap: Math.abs(diff),
                    generatedItems: `AJUSTE ${width > 0 ? `(Larg: ${width}mm)` : ''}`,
                    timestamp: new Date().toLocaleString()
                });
            }
            adjustedCount++;
            diffTotal += diff;
        });

        setMotherCoils(newMotherCoils);
        setCuttingLogs(newCuttingLogs);
        
        alert(`Inventário Processado com Sucesso!\n\nItens Ajustados: ${adjustedCount}\nDiferença Líquida de Peso: ${diffTotal.toFixed(1)} kg`);
        e.target.value = ''; 

      } catch (error) {
        alert("Erro fatal ao processar: " + error.message);
      }
    };
    reader.readAsText(file);
  };


  // --- 3. RESTAURAR BACKUP COMPLETO ---

  
const handleFullRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const fileDate = file.lastModified ? new Date(file.lastModified).toLocaleString() : new Date().toLocaleString();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Recupera os dados
        if (data.motherCoils) setMotherCoils(data.motherCoils);
        if (data.childCoils) setChildCoils(data.childCoils);
        if (data.productionLogs) setProductionLogs(data.productionLogs);
        if (data.shippingLogs) setShippingLogs(data.shippingLogs);
        if (data.productCatalog) setProductCatalog(data.productCatalog);
        if (data.motherCatalog) setMotherCatalog(data.motherCatalog);
        
        // 👇 ESSA LINHA É FUNDAMENTAL PARA O CORTES SLITTER 👇
        if (data.cuttingLogs) setCuttingLogs(data.cuttingLogs); 
        // 👆 SEM ELA, O HISTÓRICO DE CORTES SOME 👆
        
        setCurrentFileName(`📂 ${fileName} (Salvo em: ${fileDate})`);
        
        // Calcula total de registros para confirmar visualmente
        // Substitua a linha do 'totalRegs' por esta:
        const totalRegs = (data.motherCoils?.length||0) 
                + (data.childCoils?.length||0) 
                + (data.productionLogs?.length||0) 
                + (data.productCatalog?.length||0) // <--- Agora conta o catálogo também!
                + (data.shippingLogs?.length||0);

        alert(`Backup restaurado com sucesso!\n\nArquivo: ${fileName}\nData Original: ${fileDate}\nRegistros Carregados: ~${totalRegs}`);
      } catch (err) {
        alert("Erro ao ler backup: " + err.message);
      }
    };
    reader.readAsText(file);
  };


  const renderDashboard = () => {
    try {
        const ITEMS_LIMIT = 50; 
        
        // =================================================================================
        // 1. FUNÇÕES DE EXPORTAÇÃO (DENTRO DA DASHBOARD PARA NÃO FALHAR)
        // =================================================================================
        const exportToCSV = (data, filename) => {
            if (!data || data.length === 0) return alert("Nada para exportar.");
            const headers = Object.keys(data[0]).join(';');
            const csvContent = [headers, ...data.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const handleGeneratePDF = (title, data) => {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups.");
            const htmlContent = `<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}.right{text-align:right}</style></head><body><h2>${title}</h2><p>Emissão: ${new Date().toLocaleString()}</p><table><thead><tr><th>Código</th><th>Descrição</th><th class="right">Qtd/Detalhe</th></tr></thead><tbody>${data.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td class="right">${i.count}</td></tr>`).join('')}</tbody></table></body></html>`;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        };
        
        // --- 2. SEGURANÇA E UTILITÁRIOS ---
        const safeNum = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };
        const normalizeCode = (v) => String(v ?? '').trim();

        const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
        const safeChild = Array.isArray(childCoils) ? childCoils : [];
        const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
        const safeShip = Array.isArray(shippingLogs) ? shippingLogs : [];
        
        // --- 3. PREPARAÇÃO DOS DADOS ---

        const catalogByCode = (motherCatalog || []).reduce((acc, item) => {
            const code = normalizeCode(item.code);
            if (code) acc[code] = item;
            return acc;
        }, {});
        
        const motherStockByCode = safeMother.reduce((acc, item) => {
          if(item.status === 'stock') {
            const codeRaw = normalizeCode(item.code);
            const width = safeNum(item.width);
            const key = `${codeRaw}-${width}`;
            
            if(!acc[key]) { 
                const catalogItem = catalogByCode[codeRaw];
                const materialName = catalogItem?.description || item.material || `BOBINA ${item.code}`;

                acc[key] = { 
                    code: item.code, 
                    material: materialName, 
                    width: item.width, 
                    weight: 0, 
                    count: 0, 
                    type: item.type 
                }; 
            }
            acc[key].weight += safeNum(item.remainingWeight) || safeNum(item.weight);
            acc[key].count += 1; 
          }
          return acc;
        }, {});

        const childStockByCode = safeChild.reduce((acc, item) => {
          if(item.status === 'stock') {
            if(!acc[item.b2Code]) acc[item.b2Code] = { code: item.b2Code, name: item.b2Name, weight: 0, count: 0, type: item.type };
            acc[item.b2Code].weight += safeNum(item.weight);
            acc[item.b2Code].count += 1; 
          }
          return acc;
        }, {});

        const stock = {};
        safeProd.forEach(log => {
            if (!stock[log.productCode]) stock[log.productCode] = { code: log.productCode, name: log.productName, count: 0 };
            stock[log.productCode].count += (parseInt(log.pieces) || 0);
        });
        safeShip.forEach(log => {
            if (stock[log.productCode]) {
                stock[log.productCode].count -= (parseInt(log.quantity) || 0);
            }
        });
        const finishedStockList = Object.values(stock).filter(item => item.count > 0);

        // --- 4. FILTROS ---
        const filteredMotherList = Object.values(motherStockByCode).filter(item => {
            if (!dashSearchMother) return true;
            const query = dashSearchMother.toLowerCase();
            return String(item.code || '').toLowerCase().includes(query) || String(item.material || '').toLowerCase().includes(query);
        });

        const filteredB2List = Object.values(childStockByCode).filter(item => {
            if (!dashSearchB2) return true;
            const query = dashSearchB2.toLowerCase();
            return String(item.code || '').toLowerCase().includes(query) || String(item.name || '').toLowerCase().includes(query);
        });

        const filteredFinishedList = finishedStockList.filter(item => {
            if (!dashSearchFinished) return true;
            const query = dashSearchFinished.toLowerCase();
            return String(item.code || '').toLowerCase().includes(query) || String(item.name || '').toLowerCase().includes(query);
        });

        // --- 5. PAGINAÇÃO ---
        const paginatedMotherStock = filteredMotherList.slice((motherPage - 1) * ITEMS_LIMIT, motherPage * ITEMS_LIMIT);
        const paginatedChildStock = filteredB2List.slice((childPage - 1) * ITEMS_LIMIT, childPage * ITEMS_LIMIT);
        const paginatedFinishedStock = filteredFinishedList.slice((finishedPage - 1) * ITEMS_LIMIT, finishedPage * ITEMS_LIMIT);

        // --- 6. TOTAIS ---
        const totalMotherWeight = safeMother.filter(m => m.status === 'stock').reduce((acc, m) => acc + safeNum(m.remainingWeight || m.weight), 0);
        const totalB2Weight = safeChild.filter(c => c.status === 'stock').reduce((acc, c) => acc + safeNum(c.weight), 0);
        const totalFinishedCount = finishedStockList.reduce((acc, item) => acc + (item.count || 0), 0);
        const tileStockCount = safeMother.filter(m => m.status === 'stock' && String(m.code) === '10236').length;
        const tileStockWeight = safeMother.filter(m => m.status === 'stock' && String(m.code) === '10236').reduce((acc, m) => acc + safeNum(m.remainingWeight || m.weight), 0);
        const totalScrapAll = safeProd.reduce((acc, l) => acc + safeNum(l.scrap), 0) + safeMother.reduce((acc, m) => acc + safeNum(m.cutWaste), 0);

        return (
          <div className="space-y-6">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <Card className="border-l-4 border-blue-500 bg-gray-800"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Entrada de MP</h3><div className="flex flex-col"><p className="text-3xl font-bold text-white">{safeMother.filter(m => m.status === 'stock').length} <span className="text-sm text-gray-500 font-normal">bobinas</span></p><p className="text-sm text-blue-400 font-bold">{totalMotherWeight.toLocaleString('pt-BR')} kg</p></div></Card>
              <Card className="border-l-4 border-indigo-500 bg-gray-800"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Estoque B2</h3><div className="flex flex-col"><p className="text-3xl font-bold text-white">{safeChild.filter(c => c.status === 'stock').length} <span className="text-sm text-gray-500 font-normal">bobinas</span></p><p className="text-sm text-indigo-400 font-bold">{totalB2Weight.toLocaleString('pt-BR')} kg</p></div></Card>
              <Card className="border-l-4 border-emerald-500 bg-gray-800"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Estoque Acabado</h3><div className="flex items-end gap-2"><p className="text-3xl font-bold text-white">{totalFinishedCount}</p><span className="text-sm text-gray-500 mb-1">peças</span></div></Card>
              <Card className="border-l-4 border-purple-500 bg-gray-800"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Estoque Telhas (10236)</h3><div className="flex flex-col"><p className="text-3xl font-bold text-white">{tileStockCount} <span className="text-sm text-gray-500 font-normal">bobinas</span></p><p className="text-sm text-purple-400 font-bold">{tileStockWeight.toLocaleString('pt-BR')} kg</p></div></Card>
              <Card className="border-l-4 border-amber-500 bg-gray-800"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Sucata Total</h3><div className="flex items-end gap-2"><p className="text-3xl font-bold text-white">{totalScrapAll.toFixed(1)}</p><span className="text-sm text-gray-500 mb-1">kg</span></div></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* TABELA 1: MÃE */}
               <Card className="h-[500px] flex flex-col overflow-hidden col-span-1 lg:col-span-1">
                 <div className="mb-4">
                     <div className="flex justify-between items-center mb-2">
                         <h3 className="font-bold text-gray-200 flex items-center gap-2 text-lg mb-2"><PieChart className="text-blue-500"/> Entrada de MP</h3>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => { const data = filteredMotherList.map(i => ({ code: i.code, name: `${i.material} (${i.width}mm)`, count: `${i.count} bob (${i.weight}kg)` })); handleGeneratePDF('Estoque Entrada de MP', data); }} className="h-8 text-xs bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40" title="Gerar PDF"><FileText size={14}/> PDF</Button>
                            <Button variant="secondary" onClick={() => { const data = filteredMotherList.map(i => ({ "Código": i.code, "Material": i.material, "Largura": i.width, "Qtd Bobinas": i.count, "Peso Total (kg)": i.weight })); exportToCSV(data, 'saldo_estoque_mae'); }} className="h-8 text-xs bg-blue-900/20 text-blue-400 border-blue-900/50 hover:bg-blue-900/40"><Download size={14}/> CSV</Button>
                         </div>
                     </div>
                     <div className="relative"><Search className="absolute left-2 top-2 text-gray-500" size={14}/><input type="text" placeholder="Buscar..." className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-8 text-xs text-white focus:border-blue-500 outline-none" value={dashSearchMother} onChange={e => setDashSearchMother(e.target.value)} /></div>
                 </div>
                 <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
                   <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                     <thead className="bg-gray-900/50 text-gray-500 sticky top-0"><tr><th className="p-2 rounded-l-lg">Bobina / Material</th><th className="p-2 text-center">Larg.</th><th className="p-2 text-center">Qtd</th><th className="p-2 text-right rounded-r-lg">Peso</th><th className="p-2 text-center">Ver</th></tr></thead>
                     <tbody className="divide-y divide-gray-700/50">
                        {paginatedMotherStock.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                            <td className="p-3 align-top"><div className="font-bold text-white text-base">{row.code}</div><div className="text-[10px] text-gray-400 leading-tight mt-0.5 max-w-[180px]" title={row.material}>{row.material}</div><div className="text-[9px] text-blue-500 font-bold mt-1 inline-block border border-blue-900/50 px-1 rounded bg-blue-900/20">{row.type}</div></td>
                            <td className="p-3 text-center text-white align-top font-bold pt-4">{row.width}</td><td className="p-3 text-center font-bold text-white align-top pt-4">{row.count}</td><td className="p-3 text-right font-mono text-gray-300 align-top pt-4">{(Number(row.weight)||0).toLocaleString('pt-BR')}</td>
                            <td className="p-3 text-center align-top pt-3"><button onClick={() => handleViewStockDetails(row.code, 'mother')} className="p-2 hover:text-blue-400 text-gray-400 transition-colors"><Eye size={18}/></button></td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
                 <PaginationControls currentPage={motherPage} totalItems={filteredMotherList.length} itemsPerPage={ITEMS_LIMIT} onPageChange={setMotherPage} />
               </Card>
               
               {/* TABELA 2: B2 */}
               <Card className="h-[500px] flex flex-col overflow-hidden">
                 <div className="mb-4">
                     <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-200 flex items-center gap-2 text-lg mb-2"><PieChart className="text-indigo-500"/> Estoque B2</h3><div className="flex gap-2"><Button variant="secondary" onClick={() => { const data = filteredB2List.map(i => ({ code: i.code, name: i.name, count: `${i.count} bob (${i.weight}kg)` })); handleGeneratePDF('Estoque Bobina 2 (Slitter)', data); }} className="h-8 text-xs bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40" title="Gerar PDF"><FileText size={14}/> PDF</Button><Button 
  variant="secondary" 
  onClick={() => {
    // --- LISTA DE EMERGÊNCIA (Mantida para garantir os itens manuais) ---
    const itensDeEmergencia = [
        { b2Code: '85525C', b2Name: 'BOB 2 PERFIL UE 150X50X17X2,25', type: 'BQ', thickness: '2,25' },
        { b2Code: '85510A', b2Name: 'BOB 2 PERFIL US 127X50X1,80', type: 'BQ', thickness: '1,80' }
    ];

    // FUNÇÃO AJUDANTE: Arruma o número pro Excel BR (Vírgula e 2 casas decimais)
    const formatarPeso = (valor) => {
        if (!valor && valor !== 0) return "0,00";
        return Number(valor).toFixed(2).replace('.', ','); 
    };

    // 1. Mapeamento (Mantém números puros para cálculo)
    const dadosCalculo = filteredB2List.map(i => {
        const cleanCode = String(i.code).trim().toUpperCase();
        
        // Busca no catálogo ou na emergência
        let catalogItem = productCatalog.find(p => String(p.b2Code || '').trim().toUpperCase() === cleanCode);
        if (!catalogItem) {
            catalogItem = itensDeEmergencia.find(p => String(p.b2Code).trim().toUpperCase() === cleanCode);
        }
        const itemSeguro = catalogItem || {};

        return {
            "Código": i.code,
            "Descrição": itemSeguro.b2Name || i.name, 
            "Tip": itemSeguro.type || "Indef.",
            "Largura": itemSeguro.thickness ? String(itemSeguro.thickness).replace('.', ',') : "0", 
            "Qtd Bobina": Number(i.count) || 0,
            "PesoNum": Number(i.weight) || 0 // Campo temporário numérico para a soma funcionar
        };
    });

    // 2. Calcula Totais (Usando os números puros)
    const totaisPorTipo = dadosCalculo.reduce((acc, curr) => {
        const tipo = curr["Tip"] || "Outros";
        if (!acc[tipo]) acc[tipo] = 0;
        acc[tipo] += curr["PesoNum"];
        return acc;
    }, {});

    const totalGeralQtd = dadosCalculo.reduce((sum, item) => sum + item["Qtd Bobina"], 0);
    const totalGeralPeso = dadosCalculo.reduce((sum, item) => sum + item["PesoNum"], 0);

    // 3. Monta o CSV Final (Agora aplicando a formatação com vírgula)
    const finalData = [
        ...dadosCalculo.map(item => ({
            "Código": item["Código"],
            "Descrição": item["Descrição"],
            "Tip": item["Tip"],
            "Largura": item["Largura"],
            "Qtd Bobina": item["Qtd Bobina"],
            "Peso Total (kg)": formatarPeso(item["PesoNum"]) // <--- AQUI A MÁGICA
        })),
        // Linhas de Rodapé
        { "Código": "", "Descrição": "", "Tip": "", "Largura": "", "Qtd Bobina": "", "Peso Total (kg)": "" },
        { "Código": "", "Descrição": "TOTAL GERAL", "Tip": "", "Largura": "", "Qtd Bobina": totalGeralQtd, "Peso Total (kg)": formatarPeso(totalGeralPeso) },
        { "Código": "", "Descrição": "", "Tip": "", "Largura": "", "Qtd Bobina": "", "Peso Total (kg)": "" }
    ];

    Object.keys(totaisPorTipo).sort().forEach(tipo => {
        finalData.push({
            "Código": "", "Descrição": "", "Tip": tipo, "Largura": "", "Qtd Bobina": "", "Peso Total (kg)": formatarPeso(totaisPorTipo[tipo])
        });
    });

    exportToCSV(finalData, 'saldo_estoque_b2');
}}
  className="h-8 text-xs bg-indigo-900/20 text-indigo-400 border-indigo-900/50 hover:bg-indigo-900/40"
>
  <Download size={14}/> CSV
</Button></div></div>
                     <div className="relative"><Search className="absolute left-2 top-2 text-gray-500" size={14}/><input type="text" placeholder="Buscar..." className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-8 text-xs text-white focus:border-indigo-500 outline-none" value={dashSearchB2} onChange={e => setDashSearchB2(e.target.value)} /></div>
                 </div>
                 <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
                   <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                     <thead className="bg-gray-900/50 text-gray-500 sticky top-0"><tr><th className="p-3 rounded-l-lg">Código</th><th className="p-3 text-center">Qtd</th><th className="p-3 text-right">Peso</th><th className="p-3 text-center rounded-r-lg">Ver</th></tr></thead>
                     <tbody className="divide-y divide-gray-700/50">
                        {paginatedChildStock.map(row => (
                          <tr key={row.code} className="hover:bg-gray-700/30 transition-colors">
                            <td className="p-3 font-medium text-white" title={row.name}>{row.code}</td><td className="p-3 text-center font-bold text-white">{row.count}</td><td className="p-3 text-right font-mono text-gray-300">{(Number(row.weight)||0).toFixed(0)}</td><td className="p-3 text-center"><button onClick={() => handleViewStockDetails(row.code, 'b2')} className="p-2 hover:text-white text-gray-400"><Eye size={18}/></button></td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
                 <PaginationControls currentPage={childPage} totalItems={filteredB2List.length} itemsPerPage={ITEMS_LIMIT} onPageChange={setChildPage} />
               </Card>

               {/* TABELA 3: ACABADO */}
               <Card className="h-[500px] flex flex-col border-l-4 border-emerald-500/50 overflow-hidden">
                 <div className="mb-4">
                     <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-200 flex items-center gap-2 text-lg"><Package className="text-emerald-500"/> Produto Acabado</h3><div className="flex gap-2"><Button variant="secondary" onClick={() => { const data = filteredFinishedList.map(i => ({ code: i.code, name: i.name, count: i.count })); handleGeneratePDF('Produto Acabado', data); }} className="h-8 text-xs bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40" title="Gerar PDF"><FileText size={14}/> PDF</Button><Button variant="secondary" onClick={() => { const data = filteredFinishedList.map(i => ({ "Código": i.code, "Produto": i.name, "Saldo Atual": i.count })); exportToCSV(data, 'saldo_produto_acabado'); }} className="h-8 text-xs bg-emerald-900/20 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/40" title="Baixar CSV"><Download size={14}/> CSV</Button></div></div>
                     <div className="relative"><Search className="absolute left-2 top-2 text-gray-500" size={14}/><input type="text" placeholder="Buscar produto..." className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-8 text-xs text-white focus:border-emerald-500 outline-none" value={dashSearchFinished} onChange={e => setDashSearchFinished(e.target.value)} /></div>
                 </div>
                 <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
                   <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                     <thead className="bg-gray-900/50 text-gray-500 sticky top-0"><tr><th className="p-3 rounded-l-lg">Produto</th><th className="p-3 text-right">Total</th><th className="p-3 text-center rounded-r-lg">Ações</th></tr></thead>
                     <tbody className="divide-y divide-gray-700/50">
                        {paginatedFinishedStock.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-gray-600 italic">Nada encontrado.</td></tr>}
                        {paginatedFinishedStock.map(row => (
                          <tr key={row.code} className="hover:bg-gray-700/30 transition-colors">
                            <td className="p-3"><div className="font-bold text-white">{row.code}</div><div className="text-[10px] text-gray-400 truncate max-w-[150px]" title={row.name}>{row.name}</div></td>
                            <td className="p-3 text-right font-mono text-emerald-400 font-bold text-lg">{row.count}</td>
                             <td className="p-3 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => { setSelectedGroupData({code: row.code, name: row.name}); setShowHistoryModal(true); }} className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Ver Lotes"><List size={16}/></button>
                                    <button onClick={() => { setSelectedProductForHistory(row); }} className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-emerald-600 hover:text-white transition-colors" title="Imprimir"><Printer size={16}/></button>
                                </div>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
                 <PaginationControls currentPage={finishedPage} totalItems={filteredFinishedList.length} itemsPerPage={ITEMS_LIMIT} onPageChange={setFinishedPage} />
               </Card>
            </div>
            
            
          </div>
        );
    } catch (err) {
        return <div className="p-10 text-center text-red-500">Erro no Dashboard: {err.message}</div>;
    }
  };

// --- AUXILIARES --- //
const formatKgToT = (kg) => {
  const t = (Number(kg) || 0) / 1000;
  return `${t.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`;
};

const formatKg = (kg) => {
  const v = Number(kg) || 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
};

const formatPcs = (pcs) => {
  const v = Number(pcs) || 0;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pçs`;
};

const CustomFlowTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entrada = payload.find(p => p.dataKey === 'entrada')?.value || 0;
    const consumo = payload.find(p => p.dataKey === 'consumo')?.value || 0;
    const saldo = payload.find(p => p.dataKey === 'saldo')?.value || 0;

    return (
      <div className="bg-gray-900/90 p-3 border border-gray-700 rounded shadow-xl text-sm text-white">
        <p className="font-bold mb-1">{label}</p>
        <p className="text-blue-400">Entrada: {formatKg(entrada)}</p>
        <p className="text-red-400">Consumo: {formatKg(consumo)}</p>
        <p className={`mt-1 font-bold ${saldo >= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
          Saldo Acumulado: {formatKg(saldo)}
        </p>
      </div>
    );
  }
  return null;
};

const renderB2DynamicReport = () => {
  // --- 1. PREPARAÇÃO SEGURA ---
  const safeChild = Array.isArray(childCoils) ? childCoils : [];
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
  const safeMotherCatalog = Array.isArray(INITIAL_MOTHER_CATALOG)
    ? INITIAL_MOTHER_CATALOG
    : [];

  // --- 2. ENRIQUECER B2 COM INFO DA BOBINA MÃE + CONSUMO ---
  const enrichedData = safeChild.map((b2) => {
    const mother =
      safeMother.find((m) => String(m.code) === String(b2.motherCode)) || {
        material: "Desconhecido",
        entryDate: "-",
      };

    const prodLog = safeProd.find(
      (log) => Array.isArray(log.childIds) && log.childIds.includes(b2.id)
    );

    const motherCatalogMatch = safeMotherCatalog.find(
      (m) => String(m.code) === String(b2.motherCode)
    );

    return {
      ...b2,
      motherMaterial: mother.material,
      motherEntryDate: mother.entryDate || mother.date,
      consumptionDate: prodLog ? prodLog.date : null,
      productFinal: prodLog
        ? `${prodLog.productCode} - ${prodLog.productName}`
        : null,
      productionBatchId: prodLog ? prodLog.id : null,

      // chave: espessura e tipo sempre baseados na MP
      thickness: motherCatalogMatch?.thickness ?? null,
      type: motherCatalogMatch?.type ?? null,
    };
  });

  // --- 3. OPÇÕES DE FILTRO (ESPESSURA / TIPO) ---
  const thicknessOptions = Array.from(
    new Set(enrichedData.map((i) => i.thickness).filter(Boolean))
  ).sort((a, b) => {
    const pa = parseFloat(String(a).replace(",", ".")) || 0;
    const pb = parseFloat(String(b).replace(",", ".")) || 0;
    return pa - pb;
  });

  const typeOptions = Array.from(
    new Set(enrichedData.map((i) => i.type).filter(Boolean))
  ).sort();

  // --- 4. FILTRAGEM PRÉVIA (BUSCA + ESPESSURA + TIPO) ---
  const search = (b2ReportSearch || "").toLowerCase();

  const filteredRaw = enrichedData.filter((item) => {
    const matchesSearch =
      item.b2Code?.toLowerCase().includes(search) ||
      item.b2Name?.toLowerCase().includes(search) ||
      String(item.motherCode || "").includes(search);

    const matchesThickness =
      !b2ThicknessFilter ||
      b2ThicknessFilter === "all" ||
      String(item.thickness) === String(b2ThicknessFilter);

    const matchesType =
      !b2TypeFilter ||
      b2TypeFilter === "all" ||
      String(item.type) === String(b2TypeFilter);

    return matchesSearch && matchesThickness && matchesType;
  });

  // --- 5. AGRUPAMENTO POR CÓDIGO B2 ---
  const groupedData = filteredRaw.reduce((acc, item) => {
    const code = item.b2Code;
    if (!code) return acc;

    if (!acc[code]) {
      acc[code] = {
        code: code,
        name: item.b2Name,
        totalItems: 0,
        stockCount: 0,
        stockWeight: 0,
        consumedCount: 0,
        consumedWeight: 0,
        items: [],
      };
    }

    acc[code].items.push(item);
    acc[code].totalItems++;

    const w = Number(item.weight) || 0;
    if (item.status === "stock") {
      acc[code].stockCount++;
      acc[code].stockWeight += w;
    } else {
      acc[code].consumedCount++;
      acc[code].consumedWeight += w;
    }

    return acc;
  }, {});

  const groupsList = Object.values(groupedData).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  // Totais gerais
  const totalStockWeight = groupsList.reduce(
    (acc, g) => acc + (Number(g.stockWeight) || 0),
    0
  );
  const totalConsumedWeight = groupsList.reduce(
    (acc, g) => acc + (Number(g.consumedWeight) || 0),
    0
  );

  // --- 6. RENDER ---
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <List size={24} className="text-indigo-500" /> Relatório Consolidado
            B2
          </h2>
          <p className="text-sm text-gray-400">
            Visão agrupada por código B2. Clique em uma linha para detalhar as
            bobinas individuais.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:items-center">
          {/* Busca */}
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-2.5 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar código, descrição ou mãe..."
              value={b2ReportSearch}
              onChange={(e) => setB2ReportSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filtro Espessura */}
          <div className="md:w-36">
            <select
              value={b2ThicknessFilter || "all"}
              onChange={(e) => setB2ThicknessFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="all">Espessura</option>
              {thicknessOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo */}
          <div className="md:w-32">
            <select
              value={b2TypeFilter || "all"}
              onChange={(e) => setB2TypeFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="all">Tipo</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-900/20 border-emerald-500/30 py-3 px-4">
          <span className="text-xs text-emerald-400 font-bold uppercase">
            Saldo em Estoque
          </span>
          <div className="text-2xl font-bold text-white">
            {totalStockWeight.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal text-gray-400">kg</span>
          </div>
        </Card>
        <Card className="bg-gray-700/20 border-gray-600/30 py-3 px-4">
          <span className="text-xs text-gray-400 font-bold uppercase">
            Total Consumido (Filtrado)
          </span>
          <div className="text-2xl font-bold text-gray-300">
            {totalConsumedWeight.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal text-gray-500">kg</span>
          </div>
        </Card>
      </div>

      {/* LISTA AGRUPADA */}
      <Card className="flex-1 overflow-hidden p-0">
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar-dark">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10 uppercase text-xs">
              <tr>
                <th className="p-4">Código</th>
                <th className="p-4">Descrição</th>
                <th className="p-4 text-center">Bobinas</th>
                <th className="p-4 text-right text-emerald-400">
                  Peso Estoque
                </th>
                <th className="p-4 text-right text-gray-500">Peso Baixado</th>
                <th className="p-4 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {groupsList.map((group) => {
                const isExpanded = expandedGroupCode === group.code;

                return (
                  <React.Fragment key={group.code}>
                    {/* LINHA MESTRA */}
                    <tr
                      className={`hover:bg-gray-700/50 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-indigo-900/20 border-l-4 border-indigo-500"
                          : ""
                      }`}
                      onClick={() =>
                        setExpandedGroupCode(
                          isExpanded ? null : group.code
                        )
                      }
                    >
                      <td className="p-4 font-bold text-white font-mono text-base">
                        {group.code}
                      </td>
                      <td className="p-4 text-gray-300 font-medium">
                        {group.name}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-gray-800 px-2 py-1 rounded text-xs font-bold border border-gray-600">
                          {group.stockCount} / {group.totalItems}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400 text-lg">
                        {group.stockWeight > 0
                          ? group.stockWeight.toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="p-4 text-right text-gray-500 font-mono">
                        {group.consumedWeight > 0
                          ? group.consumedWeight.toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="p-4 text-center text-indigo-400">
                        {isExpanded ? (
                          <ChevronRight className="rotate-90 transition-transform" />
                        ) : (
                          <ChevronRight className="transition-transform" />
                        )}
                      </td>
                    </tr>

                    {/* LINHA DETALHADA */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-gray-900/50 p-0">
                          <div className="p-4 border-t border-indigo-900/50 animate-fade-in">
                            <table className="w-full text-xs text-left text-gray-400">
                              <thead className="text-indigo-300 border-b border-gray-700">
                                <tr>
                                  <th className="pb-2">Data Entrada</th>
                                  <th className="pb-2">Origem (Mãe)</th>
                                  <th className="pb-2">ID Rastreio</th>
                                  <th className="pb-2 text-right">
                                    Peso
                                  </th>
                                  <th className="pb-2 text-center">
                                    Status
                                  </th>
                                  <th className="pb-2">
                                    Destino / Consumo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {group.items.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-gray-800/50"
                                  >
                                    <td className="py-2">
                                      {item.createdAt}
                                    </td>
                                    <td className="py-2">
                                      <div className="font-bold text-gray-300">
                                        {item.motherCode}
                                      </div>
                                      <div className="text-[10px] truncate max-w-[200px]">
                                        {item.motherMaterial}
                                      </div>
                                    </td>
                                    <td className="py-2 font-mono text-indigo-200">
                                      {item.id}
                                    </td>
                                    <td className="py-2 text-right font-bold text-white">
                                      {item.weight} kg
                                    </td>
                                    <td className="py-2 text-center">
                                      {item.status === "stock" ? (
                                        <span className="text-emerald-500 font-bold">
                                          ESTOQUE
                                        </span>
                                      ) : (
                                        <span className="text-gray-600">
                                          BAIXADO
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2">
                                      {item.status === "consumed" ? (
                                        <div>
                                          <div className="text-white font-bold">
                                            {item.consumptionDate}
                                          </div>
                                          <div className="text-indigo-300 truncate max-w-[250px]">
                                            {item.productFinal}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-600 italic">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {groupsList.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-gray-500"
                  >
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

  const handleUploadJSONToFirebase = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Isso vai enviar todos os dados do JSON para o banco de dados oficial na nuvem.\n\nTem certeza que quer continuar?")) {
       return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawData = JSON.parse(event.target.result);
        console.log("Iniciando migração...", rawData);

        // Lista das coleções que existem no seu JSON e no Banco
        const collectionsMap = [
          { jsonKey: 'motherCoils', dbName: 'motherCoils' },
          { jsonKey: 'childCoils', dbName: 'childCoils' },
          { jsonKey: 'productionLogs', dbName: 'productionLogs' },
          { jsonKey: 'shippingLogs', dbName: 'shippingLogs' },
          { jsonKey: 'cuttingLogs', dbName: 'cuttingLogs' },
          { jsonKey: 'productCatalog', dbName: 'productCatalog' }, // Se quiser salvar o catálogo também
          { jsonKey: 'motherCatalog', dbName: 'motherCatalog' },
        ];

        let totalSaved = 0;
        let batch = writeBatch(db);
        let operationCounter = 0;

        for (const map of collectionsMap) {
          const items = rawData[map.jsonKey];
          
          if (Array.isArray(items) && items.length > 0) {
            console.log(`Processando ${map.dbName}: ${items.length} itens...`);
            
            for (const item of items) {
              if (!item.id && !item.code) continue; // Pula se não tiver identificador

              // Garante que temos um ID (usa o do JSON ou gera um se não tiver)
              const docId = String(item.id || item.code); 
              
              // Prepara a referência: db, nome_coleção, ID_específico
              const docRef = doc(db, map.dbName, docId);
              
              // Adiciona ao lote de gravação
              batch.set(docRef, item);
              operationCounter++;
              totalSaved++;

              // O Firebase aceita lotes de no máximo 500 operações
              if (operationCounter >= 450) {
                await batch.commit(); // Salva o pacote atual
                batch = writeBatch(db); // Cria um novo pacote
                operationCounter = 0;
                console.log("Lote intermediário salvo...");
              }
            }
          }
        }

        // Salva o que sobrou no último lote
        if (operationCounter > 0) {
          await batch.commit();
        }

        alert(`Sucesso! ${totalSaved} registros foram enviados para a nuvem.`);
        
      } catch (err) {
        console.error("Erro na migração:", err);
        alert("Erro ao migrar: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      setUser(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Carregando sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (


    <div className="flex h-screen bg-[#0f172a] font-sans text-gray-100 overflow-hidden">
      {ENABLE_BACKUP_BUTTON && (
        <input 
          type="file" 
          ref={importFullBackupRef} 
          style={{ display: 'none' }} // Ele fica invisível propositalmente
          accept=".json" 
          onChange={handleFullRestore} 
        />
      )}

      
      {/* Mobile Overlay */}
      <div className={`fixed inset-0 z-30 bg-black/50 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black/90 text-gray-300 flex flex-col border-r border-white/5 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-72`}>
        <div className="h-20 flex items-center px-6 border-b border-white/5 font-bold text-xl tracking-wider bg-black/20">
           <img 
             src="/logo.png" 
             alt="Logo Metalosa" 
             className="w-10 h-10 mr-3 object-contain" 
           />
           <span className="text-white">METALOSA</span>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Principal</p>
           
           <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <LayoutDashboard size={20} className={activeTab === 'dashboard' ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"}/> <span className="font-medium">Visão Geral</span>
           </button>
           
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Operacional</p>
           
           <button onClick={() => { setActiveTab('mother'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'mother' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <ScrollText size={20} className={activeTab === 'mother' ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"}/> <span className="font-medium">Entrada de MP</span>
           </button>
           {/* ... outros botões ... */}
                     
           <button onClick={() => { setActiveTab('cutting'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'cutting' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Scissors size={20} className={activeTab === 'cutting' ? "text-purple-400" : "group-hover:text-purple-400 transition-colors"}/> <span className="font-medium">Corte Slitter</span>
           </button>
           
           <button onClick={() => { setActiveTab('production'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'production' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Factory size={20} className={activeTab === 'production' ? "text-emerald-400" : "group-hover:text-emerald-400 transition-colors"}/> <span className="font-medium">Apontamento</span>
           </button>
           
           <button onClick={() => { setActiveTab('shipping'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'shipping' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Truck size={20} className={activeTab === 'shipping' ? "text-amber-400" : "group-hover:text-amber-400 transition-colors"}/> <span className="font-medium">Expedição</span>
           </button>

           
           <button onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'reports' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <FileText size={20} className={activeTab === 'reports' ? "text-rose-400" : "group-hover:text-rose-400 transition-colors"}/> <span className="font-medium">Relatórios</span>
           </button>

            <button onClick={() => { setActiveTab('b2report'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'b2report' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <List size={20} className={activeTab === 'b2report' ? "text-indigo-400" : "group-hover:text-indigo-400 transition-colors"}/> <span className="font-medium">Rastreio B2</span>
            </button>

           <button onClick={() => { setActiveTab('bi'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'indicators' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <PieChart size={20} className={activeTab === 'indicators' ? "text-cyan-400" : "group-hover:text-cyan-400 transition-colors"}/> <span className="font-medium">BI & Gráficos</span>
            </button>

            <button 
            onClick={() => { 
              setActiveTab('mpNeed'); 
              setSidebarOpen(false); 
            }} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group 
              ${activeTab === 'mpNeed' 
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-inner' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Factory 
              size={20} 
              className={activeTab === 'mpNeed' 
                ? "text-purple-400" 
                : "group-hover:text-purple-400 transition-colors"
              } 
            />
            <span className="font-medium">Necessidade MP</span>
          </button>

          
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Gestão</p>

           <div className="mt-2 px-4">
            <Button 
                onClick={() => importFullBackupRef.current.click()} 
                variant="secondary" 
                className="w-full justify-start text-xs border-dashed border-gray-600 text-gray-400 hover:text-white"
            >
                <Upload size={16} className="mr-2"/> Restaurar Backup
            </Button>
          </div>
          
           {ENABLE_BACKUP_BUTTON && (
  <div className="mt-8 px-4">
    <Button
      onClick={handleFullBackup}
      variant="success"
      className="w-full justify-start text-xs"
    >
      <Archive size={16} className="mr-2" />
      Backup Completo
    </Button>
  </div>
)}

        </nav>
        <div className="px-6 py-2 mt-auto border-t border-white/5 text-center"><p className="text-[11px] text-gray-500 font-medium">© 2025 — <span className="text-gray-400 font-semibold">Sergio Betini</span></p></div>
        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 border border-gray-600">
              <User size={20}/>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user?.email || 'Usuário'}</p>
              <p className="text-xs text-gray-500">PCP / Gestão</p>
            </div>
          </div>
        </div>
      </aside>
    
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#111827]">
         
         <header className="h-16 md:h-20 bg-[#1f293b] shadow-lg flex items-center justify-between px-4 md:px-8 z-10 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24}/></button>
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">
                  {activeTab === 'dashboard' && "Dashboard"}
                  {activeTab === 'mother' && "Entrada de MP"}
                  {activeTab === 'cutting' && "Corte Slitter"}
                  {activeTab === 'production' && "Apontamento"}
                  {activeTab === 'shipping' && "Expedição"}
                  {activeTab === 'reports' && "Relatórios"}
                                                
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium uppercase tracking-wider hidden md:block">Controle de Produção</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-xs md:text-sm font-bold text-gray-300">{new Date().toLocaleDateString()}</p>
                <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{user?.email}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout} className="text-xs md:text-sm px-3 py-2">
                <LogOut size={16} /> Sair
              </Button>
            </div>
         </header>
         

         <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar-dark">
            <div className="max-w-7xl mx-auto pb-20 md:pb-0">
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'mother' && renderMotherCoilForm()}
              {activeTab === 'cutting' && renderCuttingProcess()}
              {activeTab === 'production' && renderProduction()}
              {activeTab === 'shipping' && renderShipping()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'b2report' && renderB2DynamicReport()}

              {activeTab === 'bi' && (
                <IndicatorsDashboard
                  motherCoils={motherCoils}
                  childCoils={childCoils}
                  cuttingLogs={cuttingLogs}
                  shippingLogs={shippingLogs}
                  productionLogs={productionLogs}
                />
              )}

              
              {activeTab === "mpNeed" && (
  <RawMaterialRequirement
    motherCoils={motherCoils}
    childCoils={childCoils}
    productCatalog={INITIAL_PRODUCT_CATALOG}
    motherCatalog={INITIAL_MOTHER_CATALOG}
  />
)}

{activeTab === "inoxBlanks" && (
  <InoxBlanksPlanner />
)}




            </div>
         </main>
      </div>

      {showCatalogModal && renderCatalogModal()}
      {showPrintModal && <PrintLabelsModal items={itemsToPrint} type={printType} onClose={() => setShowPrintModal(false)} />}
      {stockDetailsModalOpen && viewingStockCode && (
        <StockDetailsModal 
          code={viewingStockCode}
          type={viewingStockType} // <--- ADICIONE ESTA LINHA NOVA
          coils={
            viewingStockType === 'mother' 
              ? motherCoils.filter(c => String(c.code) === String(viewingStockCode) && c.status === 'stock')
              : childCoils.filter(c => c.b2Code === viewingStockCode && c.status === 'stock')
          }
          onClose={() => setStockDetailsModalOpen(false)}
          onReprint={handleReprintSingle}
        />
      )}
      {editingMotherCoil && (
        <EditMotherCoilModal 
          coil={editingMotherCoil} 
          onClose={() => setEditingMotherCoil(null)} 
          onSave={updateMotherCoil} 
        />
      )}
      {editingChildCoil && (
        <EditChildCoilModal 
          coil={editingChildCoil} 
          onClose={() => setEditingChildCoil(null)} 
          onSave={updateChildCoil} 
        />
      )}
      
      {viewingCutLog && (
        <CutDetailsModal 
            log={viewingCutLog} 
            onClose={() => setViewingCutLog(null)} 
        />
      )}
      {reportGroupData && (
        <ReportGroupModal 
            group={reportGroupData} 
            onClose={() => setReportGroupData(null)} 
        />
      )}
      {viewingMpDetails && (
        <MpDetailsModal 
            data={viewingMpDetails} 
            onClose={() => setViewingMpDetails(null)} 
        />
      )}
      {viewingProdDetails && (
  <ProductDetailsModal
    data={viewingProdDetails}
    onClose={() => setViewingProdDetails(null)}
  />
)}


      {selectedGlobalGroup && (
        <DailyGlobalModal
          group={selectedGlobalGroup}
          onClose={() => setSelectedGlobalGroup(null)}
        />
      )}


      {showHistoryModal && selectedGroupData && (
  <ProductHistoryModal
    product={selectedGroupData}
    logs={
      selectedGroupData.context === 'CORTE' ||
      selectedGroupData.type === 'CORTE'
        ? cuttingLogs          // cortes
        : productionLogs       // produção
    }
    motherCoils={motherCoils}  // 👈 NOVO
    onClose={() => setShowHistoryModal(false)}
    onReprint={handleReprintProduct}
  />
)}




    </div>   
  );
};

// ==========================================================
// COLE ISTO NO FINAL ABSOLUTO DO ARQUIVO (FORA DA FUNÇÃO APP)
// ==========================================================

const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0];
  return firstLine.includes(';') ? ';' : ',';
};

const parseCSVLine = (text, delimiter) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { 
        insideQuotes = !insideQuotes; 
    } else if (char === delimiter && !insideQuotes) { 
        currentRow.push(currentCell.trim()); 
        currentCell = ''; 
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentCell || currentRow.length > 0) { 
          currentRow.push(currentCell.trim()); 
          rows.push(currentRow); 
          currentRow = []; 
          currentCell = ''; 
      }
    } else { 
        currentCell += char; 
    }
  }
  
  if (currentCell || currentRow.length > 0) { 
      currentRow.push(currentCell.trim()); 
      rows.push(currentRow); 
  }
  
  return rows;
};
