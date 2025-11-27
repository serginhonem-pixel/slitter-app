import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Scissors, Factory, ScrollText, Plus, Trash2, Save, History, LayoutDashboard,
  Package, AlertCircle, ChevronRight, TrendingDown, FileSpreadsheet, Settings,
  Filter, CheckSquare, Tag, Search, Layers, CheckCircle, Info, RefreshCw,
  List, X, Barcode, Link as LinkIcon, Edit, RotateCcw, FlaskConical, FileText,
  Database, Scale, Download, Upload, HardDrive, PieChart, Menu, LogOut, User,
  Home, Moon, FileInput, ChevronLeft, Printer, Eye, Truck, Archive, PenSquare,
  FileJson
} from 'lucide-react';

// --- CONFIGURAÇÕES ---
const ITEMS_PER_PAGE = 50;

// --- CATÁLOGO COMPLETO DE MATÉRIA PRIMA e PRODUTOS (MP BOBINAS) ---
import { INITIAL_MOTHER_CATALOG } from './data/motherCatalog';
import { INITIAL_PRODUCT_CATALOG } from './data/productCatalog';





// --- Componentes UI ---
const Card = ({ children, className = "" }) => <div className={`bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, title = "" }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-900/50 disabled:text-gray-400 shadow-lg shadow-blue-900/20",
    secondary: "bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500",
    danger: "bg-red-600/20 text-red-400 border border-red-900/50 hover:bg-red-600/30",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-emerald-900/50 shadow-lg shadow-emerald-900/20",
    warning: "bg-amber-600 text-white hover:bg-amber-500 shadow-lg",
    info: "bg-sky-600/20 text-sky-400 border border-sky-600/50 hover:bg-sky-600/30"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 justify-center ${variants[variant]} ${className}`} title={title}>{children}</button>;
};

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
            const name = isProduct ? (item.productName || item.name) : item.b2Name;
            const code = isProduct ? (item.productCode || item.code) : item.b2Code;
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
                     <p className="text-xs font-bold uppercase">{isProduct ? 'Produto Final' : 'Bobina Slitter'}</p>
                     <h2 className="text-lg font-bold leading-tight">{name}</h2>
                   </div>
                   <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="border border-black p-2 text-center">
                        <p className="text-[10px] font-bold uppercase">Código</p>
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

const StockDetailsModal = ({ code, coils, onClose, onReprint }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Detalhes do Estoque: {code}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-900 text-gray-400 sticky top-0">
              <tr><th className="p-2">ID</th><th className="p-2">Data Criação</th><th className="p-2 text-right">Peso (kg)</th><th className="p-2 text-center">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {coils.map(coil => (
                <tr key={coil.id} className="hover:bg-gray-700/50">
                  <td className="p-2 font-mono text-xs text-gray-500">{coil.id}</td>
                  <td className="p-2 text-gray-300">{coil.createdAt || '-'}</td>
                  <td className="p-2 text-right font-bold text-white">{(Number(coil.weight) || 0).toFixed(0)}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => onReprint(coil)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Imprimir Etiqueta"><Printer size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EditMotherCoilModal = ({ coil, onClose, onSave }) => {
  const [editData, setEditData] = useState(coil);
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-4">Editar Bobina Mãe</h3>
        <div className="space-y-4">
           <Input label="Código" value={editData.code} onChange={e => setEditData({...editData, code: e.target.value})} />
           <Input label="Descrição" value={editData.material} onChange={e => setEditData({...editData, material: e.target.value})} />
           <div className="grid grid-cols-2 gap-4">
              <Input label="Peso (kg)" type="number" value={editData.weight} onChange={e => setEditData({...editData, weight: parseFloat(e.target.value)})} />
              <Input label="Largura" type="number" value={editData.width} onChange={e => setEditData({...editData, width: parseFloat(e.target.value)})} />
           </div>
           <div className="flex gap-2 mt-4">
             <Button onClick={() => onSave(editData)} variant="success" className="flex-1">Salvar</Button>
             <Button onClick={onClose} variant="secondary" className="flex-1">Cancelar</Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [motherCoils, setMotherCoils] = useState([]);
  const [childCoils, setChildCoils] = useState([]);
  const [productionLogs, setProductionLogs] = useState([]);
  const [shippingLogs, setShippingLogs] = useState([]); 
  const [productCatalog, setProductCatalog] = useState(INITIAL_PRODUCT_CATALOG);
  const [motherCatalog, setMotherCatalog] = useState(INITIAL_MOTHER_CATALOG);
  const [newMotherCoil, setNewMotherCoil] = useState({ code: '', weight: '', material: '', width: '', thickness: '', type: '' });
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

  const [motherPage, setMotherPage] = useState(1);
  const [childPage, setChildPage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const fileInputMotherRef = useRef(null);
  const importMotherStockRef = useRef(null);
  const importChildStockRef = useRef(null);
  const importLogsRef = useRef(null);
  const importFullBackupRef = useRef(null);
  const fileInputMotherCatalogRef = useRef(null);

  useEffect(() => {
    try {
      const savedMother = localStorage.getItem('motherCoils');
      const savedChild = localStorage.getItem('childCoils');
      const savedLogs = localStorage.getItem('productionLogs');
      const savedShipping = localStorage.getItem('shippingLogs');
      const savedCatalog = localStorage.getItem('productCatalog');
      const savedMotherCatalog = localStorage.getItem('motherCatalog');

      if (savedMother) setMotherCoils(JSON.parse(savedMother));
      if (savedChild) setChildCoils(JSON.parse(savedChild));
      if (savedLogs) setProductionLogs(JSON.parse(savedLogs));
      if (savedShipping) setShippingLogs(JSON.parse(savedShipping));
      if (savedMotherCatalog) {
          const parsed = JSON.parse(savedMotherCatalog);
          if (parsed.length > 0) setMotherCatalog(parsed); 
          else setMotherCatalog(INITIAL_MOTHER_CATALOG);
      } else { setMotherCatalog(INITIAL_MOTHER_CATALOG); }

      if (savedCatalog) {
        const parsedCatalog = JSON.parse(savedCatalog);
        if (parsedCatalog.length < INITIAL_PRODUCT_CATALOG.length) {
           setProductCatalog(INITIAL_PRODUCT_CATALOG);
        } else {
           setProductCatalog(parsedCatalog);
        }
      } else { setProductCatalog(INITIAL_PRODUCT_CATALOG); }
    } catch (error) { console.error("Erro ao carregar dados:", error); }
  }, []);

  useEffect(() => {
    localStorage.setItem('motherCoils', JSON.stringify(motherCoils));
    localStorage.setItem('childCoils', JSON.stringify(childCoils));
    localStorage.setItem('productionLogs', JSON.stringify(productionLogs));
    localStorage.setItem('shippingLogs', JSON.stringify(shippingLogs));
    localStorage.setItem('productCatalog', JSON.stringify(productCatalog));
    localStorage.setItem('motherCatalog', JSON.stringify(motherCatalog));
  }, [motherCoils, childCoils, productionLogs, shippingLogs, productCatalog, motherCatalog]);

  useEffect(() => {
    if (newMotherCoil.code && motherCatalog.length > 0) {
      const found = motherCatalog.find(m => m.code.toString() === newMotherCoil.code.toString());
      if (found) {
        setNewMotherCoil(prev => ({ ...prev, material: found.description, thickness: found.thickness || prev.thickness, type: found.type || prev.type }));
      }
    }
  }, [newMotherCoil.code, motherCatalog]);

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

  const addMotherCoil = () => {
    if (!newMotherCoil.code || !newMotherCoil.weight) return alert("Preencha obrigatórios");
    setMotherCoils([...motherCoils, {
      id: Date.now().toString(),
      ...newMotherCoil,
      type: newMotherCoil.type,
      weight: parseFloat(newMotherCoil.weight),
      originalWeight: parseFloat(newMotherCoil.weight),
      width: parseFloat(newMotherCoil.width) || 1200,
      remainingWeight: parseFloat(newMotherCoil.weight),
      status: 'stock',
      date: new Date().toLocaleDateString()
    }]);
    setNewMotherCoil({ code: '', weight: '', material: '', width: '', thickness: '', type: '' });
    alert("Salvo!");
  };

  const deleteMotherCoil = (id) => {
    if(window.confirm("Tem certeza? Isso apagará a bobina permanentemente.")){
      setMotherCoils(motherCoils.filter(m => m.id !== id));
    }
  };

  const updateMotherCoil = (updatedCoil) => {
    setMotherCoils(motherCoils.map(m => m.id === updatedCoil.id ? updatedCoil : m));
    setEditingMotherCoil(null);
  };

  const addTempChildCoil = () => {
    if (!targetB2Code || !cutWeight) return alert("Selecione o tipo e peso");
    const b2Data = productCatalog.find(p => p.b2Code === targetB2Code);
    if (!b2Data) return;
    setTempChildCoils([...tempChildCoils, {
      b2Code: b2Data.b2Code,
      b2Name: b2Data.b2Name,
      width: parseFloat(b2Data.width),
      thickness: b2Data.thickness,
      type: b2Data.type, 
      weight: parseFloat(cutWeight),
      id: Date.now() + Math.random() 
    }]);
    setCutWeight('');
    setTargetB2Code('');
  };

  const confirmCut = () => {
    const mother = motherCoils.find(m => m.id === selectedMotherForCut);
    if (!mother) return;
    const totalWeight = tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0);
    if (totalWeight > mother.remainingWeight) {
      if(!window.confirm(`Peso excedido. Continuar?`)) return;
    }
    const waste = Math.max(0, mother.remainingWeight - totalWeight);
    const newChildren = tempChildCoils.map((temp, index) => ({
      id: `B2-${mother.code}-${Date.now()}-${index}`,
      motherId: mother.id,
      motherCode: mother.code,
      b2Code: temp.b2Code, b2Name: temp.b2Name, width: temp.width, thickness: temp.thickness, 
      type: mother.type, 
      weight: temp.weight, initialWeight: temp.weight, status: 'stock', createdAt: new Date().toLocaleDateString()
    }));
    const updatedMothers = motherCoils.map(m => {
      if (m.id === mother.id) return { ...m, remainingWeight: 0, status: 'consumed', cutWaste: waste };
      return m;
    });
    setMotherCoils(updatedMothers);
    setChildCoils([...childCoils, ...newChildren]);
    setTempChildCoils([]);
    setSelectedMotherForCut('');
    setMotherSearchQuery('');
    setItemsToPrint(newChildren);
    setPrintType('coil'); 
    setShowPrintModal(true); 
  };

  const registerProduction = () => {
    if (editingLogId) {
      const updatedLogs = productionLogs.map(log => {
        if (log.id === editingLogId) return { ...log, pieces: parseInt(prodPieces), scrap: parseFloat(prodScrap) || 0 };
        return log;
      });
      setProductionLogs(updatedLogs);
      setEditingLogId(null);
      alert("Atualizado!");
      setProdPieces('');
      setProdScrap('');
      return;
    }
    const child = childCoils.find(c => c.id === selectedChildForProd);
    if (!child || !prodPieces || !selectedProductCode) return alert("Preencha tudo");
    const productInfo = productCatalog.find(p => p.code === selectedProductCode);
    const trackingId = generateTrackingId();
    const newLog = {
      id: trackingId,
      childId: child.id,
      motherCode: child.motherCode,
      b2Code: child.b2Code,
      b2Name: child.b2Name,
      productCode: productInfo.code,
      productName: productInfo.name,
      pieces: parseInt(prodPieces),
      scrap: parseFloat(prodScrap) || 0,
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toLocaleString()
    };
    const updatedChildren = childCoils.map(c => {
      if (c.id === child.id) return { ...c, status: 'consumed' };
      return c;
    });
    setProductionLogs([newLog, ...productionLogs]);
    setChildCoils(updatedChildren);
    setSelectedChildForProd('');
    setSelectedProductCode('');
    setProdPieces('');
    setProdScrap('');
    setItemsToPrint([newLog]);
    setPrintType('product');
    setShowPrintModal(true);
  };

  const registerShipping = () => {
    if(!shipProduct || !shipQty) return alert("Preencha tudo");
    const stock = getFinishedStock();
    const currentStock = stock[shipProduct] ? stock[shipProduct].count : 0;
    const qty = parseInt(shipQty);
    if(qty > currentStock) return alert("Estoque insuficiente para essa baixa.");
    const prodInfo = productCatalog.find(p => p.code === shipProduct);
    const newShipLog = {
       id: `SHIP-${Date.now()}`,
       productCode: shipProduct,
       productName: prodInfo ? prodInfo.name : shipProduct,
       quantity: qty,
       destination: shipDest,
       date: new Date().toLocaleDateString(),
       timestamp: new Date().toLocaleString()
    };
    setShippingLogs([newShipLog, ...shippingLogs]);
    setShipQty('');
    alert("Baixa de expedição realizada com sucesso!");
  };

  const handleFullBackup = () => {
    const data = { motherCoils, childCoils, productionLogs, shippingLogs, productCatalog, motherCatalog };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup_metalosa_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.motherCoils) setMotherCoils(data.motherCoils);
        if (data.childCoils) setChildCoils(data.childCoils);
        if (data.productionLogs) setProductionLogs(data.productionLogs);
        if (data.shippingLogs) setShippingLogs(data.shippingLogs);
        if (data.productCatalog) setProductCatalog(data.productCatalog);
        if (data.motherCatalog) setMotherCatalog(data.motherCatalog);
        alert("Backup completo restaurado com sucesso!");
      } catch (err) {
        alert("Erro ao ler arquivo de backup: " + err.message);
      }
    };
    reader.readAsText(file);
  };

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
      if (char === '"') { insideQuotes = !insideQuotes; }
      else if (char === delimiter && !insideQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; }
      else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (currentCell || currentRow.length > 0) { currentRow.push(currentCell.trim()); rows.push(currentRow); currentRow = []; currentCell = ''; }
      } else { currentCell += char; }
    }
    if (currentCell || currentRow.length > 0) { currentRow.push(currentCell.trim()); rows.push(currentRow); }
    return rows;
  };

  const generateTrackingId = () => {
    const date = new Date();
    const ymd = date.toISOString().slice(0,10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PROD-${ymd}-${random}`;
  };

  const handleViewStockDetails = (code) => {
    setViewingStockCode(code);
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

  const handleImportBackup = (e, setter, label) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const delimiter = detectDelimiter(text);
        const rows = parseCSVLine(text, delimiter);
        if (rows.length < 2) return alert("Arquivo inválido ou vazio.");
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            let val = row[index];
            // BLINDAGEM CONTRA ERROS DE NÚMERO COM VÍRGULA/PONTO
            if (typeof val === 'string' && /^[0-9.,]+$/.test(val)) {
               const cleanVal = val.replace(/\./g, '').replace(',', '.');
               if (!isNaN(Number(cleanVal))) val = Number(cleanVal);
            }
            // Forçar conversão para zero se falhar
            if (header.toLowerCase().includes('weight') || header.toLowerCase().includes('width') || header.toLowerCase().includes('originalweight') || header.toLowerCase().includes('remainingweight')) {
                if (isNaN(val) || val === '') val = 0;
            }
            obj[header] = val;
          });
          return obj;
        });
        if(data.length > 0){ setter(data); alert(`${label} atualizado com ${data.length} registros!`); } else { alert("Nenhum dado encontrado."); }
      } catch (err) { alert("Erro: " + err.message); }
    };
    reader.readAsText(file);
  };

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

  const renderMotherCoilForm = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col justify-center">
           <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                <Plus size={32}/>
              </div>
              <h2 className="text-2xl font-bold text-white">Nova Bobina</h2>
              <p className="text-gray-400 text-sm mt-1">Cadastre a matéria prima recebida</p>
           </div>
           <div className="space-y-4">
              <Input label="Código Lote" value={newMotherCoil.code} onChange={e => setNewMotherCoil({...newMotherCoil, code: e.target.value})} placeholder="Digite o código..." />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Peso (kg)" type="number" value={newMotherCoil.weight} onChange={e => setNewMotherCoil({...newMotherCoil, weight: e.target.value})} />
                <Input label="Largura (mm)" type="number" value={newMotherCoil.width} onChange={e => setNewMotherCoil({...newMotherCoil, width: e.target.value})} />
              </div>
              <Button onClick={addMotherCoil} className="w-full py-3 text-lg shadow-md mt-4">Confirmar Entrada</Button>
              <div className="pt-6 border-t border-gray-700 mt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 text-center">Importação em Lote</label>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="relative">
                       <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputMotherCatalogRef} onChange={handleMotherCatalogUpload} />
                       <Button variant="secondary" onClick={() => fileInputMotherCatalogRef.current.click()} className="text-xs w-full h-10 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700" title="Atualiza base de códigos"><Database size={14} /> Base Códigos</Button>
                     </div>
                     <div className="relative">
                       <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputMotherRef} onChange={handleMotherCoilUpload} />
                       <Button variant="secondary" onClick={() => fileInputMotherRef.current.click()} className="text-xs w-full h-10 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700" title="Importa saldo de estoque"><FileText size={14} /> Saldo Estoque</Button>
                     </div>
                  </div>
              </div>
           </div>
        </Card>
      </div>
      <div className="lg:col-span-2 flex flex-col gap-6">
         <Card className="bg-gray-800/80 border-blue-900/30">
            <div className="flex gap-4">
               <div className="flex-1">
                 <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">Material Identificado</label>
                 <div className="font-medium text-white text-lg truncate">{newMotherCoil.material || 'Aguarda código...'}</div>
               </div>
               <div className="flex gap-4">
                 <div><label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">Espessura</label><div className="font-bold text-blue-400 text-xl">{newMotherCoil.thickness || '-'}</div></div>
                 <div><label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">Tipo</label><div className="font-bold text-blue-400 text-xl">{newMotherCoil.type || '-'}</div></div>
               </div>
            </div>
         </Card>
         <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><List size={20} className="text-gray-400"/> Entradas Recentes</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3 max-h-[calc(100vh-260px)]">
               {motherCoils.slice(0, 50).map(coil => (
                 <div key={coil.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all hover:bg-gray-700/50 ${coil.status === 'stock' ? 'bg-gray-900 border-gray-700' : 'bg-gray-800 border-gray-700 opacity-50'}`}>
                   <div>
                     <div className="font-bold text-gray-200 flex items-center gap-2">
                       {coil.code} 
                       <span className={`text-[10px] px-2 py-0.5 rounded-full ${coil.status === 'stock' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-900' : 'bg-gray-800 text-gray-500'}`}>{coil.status === 'stock' ? 'EM ESTOQUE' : 'CONSUMIDA'}</span>
                     </div>
                     <div className="text-sm text-gray-500 mt-1">{coil.type} | {coil.thickness} | {coil.material}</div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="text-right">
                       <div className="font-bold text-xl text-white">{(Number(coil.weight) || 0).toFixed(0)} <span className="text-sm text-gray-500 font-normal">kg</span></div>
                       <div className="text-xs text-gray-500">{coil.width}mm</div>
                     </div>
                     {coil.status === 'stock' && (
                       <div className="flex gap-2">
                         <button onClick={() => setEditingMotherCoil(coil)} className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white"><Edit size={16}/></button>
                         <button onClick={() => deleteMotherCoil(coil.id)} className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><Trash2 size={16}/></button>
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

  const renderCuttingProcess = () => {
    const availableMothers = motherCoils.filter(m => m.status === 'stock');
    const filteredMothers = availableMothers.filter(m => 
        motherSearchQuery === '' || m.code.toLowerCase().includes(motherSearchQuery.toLowerCase())
    );
    const selectedMother = motherCoils.find(m => m.id === selectedMotherForCut);
    const availableB2Types = selectedMother ? getUniqueB2Types(selectedMother.type) : [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="font-bold text-gray-200 mb-4">1. Selecionar Origem</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input 
                  type="text"
                  placeholder="Digite o Código..."
                  className="w-full pl-10 p-3 border border-gray-700 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={motherSearchQuery}
                  onChange={e => { setMotherSearchQuery(e.target.value); setSelectedMotherForCut(''); }}
                />
             </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[calc(100vh-260px)]">
                {filteredMothers.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMotherForCut(m.id); setTempChildCoils([]); }} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedMotherForCut === m.id ? 'bg-blue-900/20 border-blue-500 shadow-sm' : 'bg-gray-900 border-gray-700 hover:border-blue-500/50 hover:bg-gray-800'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-200">{m.code}</span>
                      <span className="text-sm font-bold text-blue-400">{(Number(m.weight) || 0).toFixed(0)} kg</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between"><span>{m.type}</span><span>{m.thickness}mm</span></div>
                  </div>
                ))}
              </div>
           </Card>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-6">
           {selectedMother ? (
             <>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-none md:col-span-2">
                    <div className="flex justify-between items-start">
                      <div><p className="text-blue-300 text-xs font-bold uppercase">Bobina Selecionada</p><h2 className="text-3xl font-bold mt-1">{selectedMother.code}</h2><p className="text-blue-200 text-sm mt-2 opacity-90 truncate">{selectedMother.material}</p></div>
                      <div className="text-right">
                        <div className="bg-black/20 rounded-lg p-2 mb-2"><p className="text-xs text-blue-300 font-bold uppercase">Espessura</p><p className="text-xl font-bold">{selectedMother.thickness}</p></div>
                      </div>
                    </div>
                 </Card>
                 <Card className="flex flex-col justify-center items-center bg-gray-800 border-gray-700">
                    <p className="text-gray-500 text-xs font-bold uppercase">Peso Disponível</p><p className="text-4xl font-bold text-white mt-2">{(Number(selectedMother.remainingWeight) || 0).toFixed(0)}</p><p className="text-gray-500 text-sm">kg</p>
                 </Card>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  <Card>
                    <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Plus size={20} className="text-blue-500"/> Adicionar Tira</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Tipo de Bobina 2</label>
                        <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm" value={targetB2Code} onChange={e => setTargetB2Code(e.target.value)}>
                          <option value="">Selecione...</option>
                          {availableB2Types.map(t => <option key={t.code} value={t.code}>{t.width}mm - {t.name}</option>)}
                        </select>
                      </div>
                      <Input label="Peso (kg)" type="number" value={cutWeight} onChange={e => setCutWeight(e.target.value)} />
                      <Button onClick={addTempChildCoil} className="w-full py-3 mt-2" disabled={!targetB2Code || !cutWeight}>Adicionar ao Plano</Button>
                    </div>
                  </Card>
                  <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-200">Plano de Corte</h3><span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full font-bold">{tempChildCoils.length} itens</span></div>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar-dark space-y-2 max-h-[calc(100vh-260px)]">
                       {tempChildCoils.map((item, idx) => (
                         <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                           <div><div className="font-bold text-gray-200 text-sm">{item.width}mm <span className="text-gray-500">| {item.b2Code}</span></div></div>
                           <div className="flex items-center gap-3"><span className="font-bold text-blue-400 bg-gray-900 px-2 py-1 rounded">{item.weight} kg</span><button onClick={() => setTempChildCoils(tempChildCoils.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400"><Trash2 size={16}/></button></div>
                         </div>
                       ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                       <div className="flex justify-between items-end mb-4">
                          <div><p className="text-xs text-gray-500 font-bold uppercase">Saldo Final</p><p className={`text-2xl font-bold ${(selectedMother.remainingWeight - tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0)) < 0 ? "text-red-500" : "text-emerald-500"}`}>{(selectedMother.remainingWeight - tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0)).toFixed(0)} kg</p></div>
                          <Button onClick={confirmCut} variant="success" disabled={tempChildCoils.length === 0} className="px-6">PROCESSAR</Button>
                       </div>
                    </div>
                  </Card>
               </div>
             </>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-700"><Scissors size={64} className="mb-4 opacity-20"/><p>Selecione uma Bobina Mãe</p></div>
           )}
        </div>
      </div>
    );
  };

  const renderProduction = () => {
    const availableChildCoils = childCoils.filter(c => {
       if (c.status !== 'stock' && (!editingLogId || c.id !== selectedChildForProd)) return false;
       if (filterB2Type && c.type !== filterB2Type) return false;
       return true;
    });
    const selectedChild = childCoils.find(c => c.id === selectedChildForProd);
    const compatibleProducts = selectedChild ? productCatalog.filter(p => p.b2Code === selectedChild.b2Code) : [];
    const uniqueTypes = [...new Set(childCoils.map(c => c.type).filter(Boolean))];
    const paginatedLogs = productionLogs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-7 flex flex-col gap-6">
           <Card>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2"><Factory className="text-emerald-500"/> Produção</h2>
                {editingLogId && <Button variant="secondary" onClick={() => { setEditingLogId(null); setSelectedChildForProd(''); setProdPieces(''); }} className="text-xs h-8">Cancelar Edição</Button>}
             </div>
             <div className="space-y-6">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                   <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">1. Matéria Prima (Bobina 2)</label>
                      {uniqueTypes.length > 0 && ( <select className="text-xs border-none bg-transparent text-blue-400 font-bold cursor-pointer outline-none" value={filterB2Type} onChange={e => setFilterB2Type(e.target.value)}><option value="">Filtrar Tipo: Todos</option>{uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>)}
                   </div>
                   <select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-gray-200 outline-none text-sm" value={selectedChildForProd} onChange={(e) => { setSelectedChildForProd(e.target.value); setSelectedProductCode(''); }} disabled={!!editingLogId}>
                      <option value="">Selecione do estoque...</option>
                      {availableChildCoils.map(c => (<option key={c.id} value={c.id}>{c.b2Code} - {c.b2Name} ({c.weight}kg) [{c.type}]</option>))}
                    </select>
                </div>
                {selectedChild && (
                  <div className="animate-fade-in">
                      <div className="flex gap-4 mb-6">
                         <div className="flex-1 bg-gray-900/50 border border-gray-700 p-3 rounded-lg"><p className="text-xs text-purple-400 font-bold uppercase">Código B2</p><p className="font-bold text-gray-200">{selectedChild.b2Code}</p></div>
                         <div className="flex-1 bg-gray-900/50 border border-gray-700 p-3 rounded-lg"><p className="text-xs text-blue-400 font-bold uppercase">Saldo</p><p className="font-bold text-gray-200">{selectedChild.weight} kg</p></div>
                      </div>
                      <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">2. Produto Final</label><select className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-gray-200 outline-none text-sm" value={selectedProductCode} onChange={e => setSelectedProductCode(e.target.value)}><option value="">Selecione...</option>{compatibleProducts.map(p => (<option key={p.code} value={p.code}>{p.name} (Cód: {p.code})</option>))}</select></div>
                        <div className="grid grid-cols-2 gap-4"><Input label="Qtd Peças" type="number" value={prodPieces} onChange={e => setProdPieces(e.target.value)} /><Input label="Sucata (kg)" type="number" value={prodScrap} onChange={e => setProdScrap(e.target.value)} /></div>
                        <Button onClick={registerProduction} variant="success" className="w-full py-4 text-lg shadow-lg mt-2" disabled={!selectedProductCode}>{editingLogId ? "Salvar Alterações" : "Confirmar Produção"}</Button>
                      </div>
                  </div>
                )}
             </div>
           </Card>
        </div>
        <div className="lg:col-span-5 h-full">
           <Card className="h-full flex flex-col bg-gray-900 border-gray-800">
             <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-white flex items-center gap-2"><History size={20} className="text-emerald-500"/> Histórico</h3></div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar-dark space-y-3">
                 {paginatedLogs.map(log => (
                 <div key={log.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:bg-gray-700/80 transition-colors group">
                   <div className="flex justify-between mb-2"><span className="text-[10px] text-gray-500">{log.id}</span><span className="text-[10px] text-gray-500">{log.timestamp.split(' ')[1]}</span></div>
                   <p className="font-bold text-gray-200 text-sm mb-2">{log.productName}</p>
                   <div className="flex justify-between items-end">
                      <div className="flex gap-3 text-xs"><div><span className="block text-gray-500 text-[10px] uppercase">Qtd</span><span className="text-emerald-400 font-bold text-lg">{log.pieces}</span></div><div><span className="block text-gray-500 text-[10px] uppercase">Sucata</span><span className="text-red-400 font-bold text-lg">{log.scrap}</span> kg</div></div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleReprintProduct(log)} className="p-1.5 bg-gray-700 text-gray-300 rounded"><Printer size={14}/></button>
                         <button onClick={() => handleEditLog(log)} className="p-1.5 bg-blue-900/30 text-blue-400 rounded"><Edit size={14}/></button>
                         <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 bg-red-900/30 text-red-400 rounded"><Trash2 size={14}/></button>
                      </div>
                   </div>
                 </div>
               ))}
             </div>
             <PaginationControls currentPage={logsPage} totalItems={productionLogs.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setLogsPage} />
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
                   {availableProducts.map(p => <option key={p.code} value={p.code}>{p.name} (Saldo: {p.count})</option>)}
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
                    <div className="flex justify-between"><span className="font-bold text-white">{log.productName}</span><span className="text-xs text-gray-500">{log.date}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-sm text-amber-400 font-bold">{log.destination}</span><span className="text-sm text-gray-300">{log.quantity} pçs</span></div>
                 </div>
               ))}
            </div>
         </Card>
      </div>
    );
  };

  const renderDashboard = () => {
    const motherStockByCode = motherCoils.reduce((acc, item) => {
      if(item.status === 'stock') {
        if(!acc[item.code]) acc[item.code] = { code: item.code, weight: 0, count: 0, type: item.type };
        acc[item.code].weight += item.weight;
        acc[item.code].count += 1; 
      }
      return acc;
    }, {});

    const childStockByCode = childCoils.reduce((acc, item) => {
      if(item.status === 'stock') {
        if(!acc[item.b2Code]) acc[item.b2Code] = { code: item.b2Code, name: item.b2Name, weight: 0, count: 0, type: item.type };
        acc[item.b2Code].weight += item.weight;
        acc[item.b2Code].count += 1; 
      }
      return acc;
    }, {});

    const stockBalances = getFinishedStock();
    const finishedStockList = Object.values(stockBalances).filter(item => item.count > 0);

    const paginatedMotherStock = Object.values(motherStockByCode).slice((motherPage - 1) * ITEMS_PER_PAGE, motherPage * ITEMS_PER_PAGE);
    const paginatedChildStock = Object.values(childStockByCode).slice((childPage - 1) * ITEMS_PER_PAGE, childPage * ITEMS_PER_PAGE);
    const paginatedFinishedStock = finishedStockList.slice((finishedPage - 1) * ITEMS_PER_PAGE, finishedPage * ITEMS_PER_PAGE);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-l-4 border-blue-500 bg-gray-800 transform transition-transform hover:-translate-y-1">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Estoque Mãe</h3>
            <div className="flex flex-col">
              <div className="flex items-end gap-2">
                 <p className="text-3xl font-bold text-white">{motherCoils.filter(m => m.status === 'stock').length}</p>
                 <span className="text-sm text-gray-500 mb-1">bobinas</span>
              </div>
              <p className="text-sm text-blue-400 font-bold mt-1">
                {motherCoils.filter(m => m.status === 'stock').reduce((acc, m) => acc + m.weight, 0).toLocaleString('pt-BR')} kg
              </p>
            </div>
          </Card>
          <Card className="border-l-4 border-indigo-500 bg-gray-800 transform transition-transform hover:-translate-y-1">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Estoque B2</h3>
              <div className="flex flex-col">
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-white">{childCoils.filter(c => c.status === 'stock').length}</p>
                  <span className="text-sm text-gray-500 mb-1">bobinas</span>
                </div>
                <p className="text-sm text-indigo-400 font-bold mt-1">
                  {childCoils.filter(c => c.status === 'stock').reduce((acc, c) => acc + c.weight, 0).toLocaleString('pt-BR')} kg
                </p>
            </div>
          </Card>
          <Card className="border-l-4 border-emerald-500 bg-gray-800 transform transition-transform hover:-translate-y-1">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Estoque Acabado</h3>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{finishedStockList.reduce((acc, item) => acc + item.count, 0)}</p>
              <span className="text-sm text-gray-500 mb-1">peças</span>
            </div>
          </Card>
          <Card className="border-l-4 border-amber-500 bg-gray-800 transform transition-transform hover:-translate-y-1">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Sucata Total</h3>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{productionLogs.reduce((acc, log) => acc + log.scrap, 0).toFixed(1)}</p>
              <span className="text-sm text-gray-500 mb-1">kg</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Tabela 1: Mãe */}
           <Card className="h-[450px] flex flex-col overflow-hidden">
             <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 text-lg"><PieChart className="text-blue-500"/> Estoque Mãe</h3>
             <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
               <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                 <thead className="bg-gray-900/50 text-gray-500 sticky top-0"><tr><th className="p-3 rounded-l-lg">Código</th><th className="p-3 text-center">Qtd</th><th className="p-3 text-right rounded-r-lg">Peso</th></tr></thead>
                 <tbody className="divide-y divide-gray-700/50">
                    {paginatedMotherStock.map(row => (
                      <tr key={row.code} className="hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 font-medium text-white">{row.code}<br/><span className="text-[10px] text-gray-500">{row.type}</span></td>
                        <td className="p-3 text-center font-bold text-white">{row.count}</td>
                        <td className="p-3 text-right font-mono text-gray-300">{(Number(row.weight) || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
             <PaginationControls currentPage={motherPage} totalItems={Object.values(motherStockByCode).length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setMotherPage} />
           </Card>
           
           {/* Tabela 2: B2 */}
           <Card className="h-[450px] flex flex-col overflow-hidden">
             <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2 text-lg"><PieChart className="text-indigo-500"/> Estoque B2</h3>
             <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
               <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                 <thead className="bg-gray-900/50 text-gray-500 sticky top-0">
                   <tr>
                     <th className="p-3 rounded-l-lg">Código</th>
                     <th className="p-3 text-center">Qtd</th>
                     <th className="p-3 text-right">Peso</th>
                     <th className="p-3 text-center rounded-r-lg">Ver</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-700/50">
                    {paginatedChildStock.map(row => (
                      <tr key={row.code} className="hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 font-medium text-white" title={row.name}>{row.code}</td>
                        <td className="p-3 text-center font-bold text-white">{row.count}</td>
                        <td className="p-3 text-right font-mono text-gray-300">{(Number(row.weight) || 0).toFixed(0)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleViewStockDetails(row.code)} className="p-2 hover:text-white text-gray-400"><Eye size={18}/></button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
             <PaginationControls currentPage={childPage} totalItems={Object.values(childStockByCode).length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setChildPage} />
           </Card>

           {/* Tabela 3: Produto Acabado */}
           <Card className="h-[450px] flex flex-col border-l-4 border-emerald-500/50 overflow-hidden">
             <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2 text-lg"><Package className="text-emerald-500"/> Produto Acabado</h3>
             <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar-dark">
               <table className="w-full text-sm text-left text-gray-300 min-w-[300px]">
                 <thead className="bg-gray-900/50 text-gray-500 sticky top-0">
                   <tr>
                     <th className="p-3 rounded-l-lg">Produto</th>
                     <th className="p-3 text-right">Total</th>
                     <th className="p-3 text-center rounded-r-lg">Etiq.</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-700/50">
                    {paginatedFinishedStock.length === 0 && (
                      <tr><td colSpan="3" className="p-4 text-center text-gray-600 italic">Nenhuma produção ainda.</td></tr>
                    )}
                    {paginatedFinishedStock.map(row => (
                      <tr key={row.code} className="hover:bg-gray-700/30 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{row.code}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[150px]" title={row.name}>{row.name}</div>
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-bold text-lg">{row.count}</td>
                         <td className="p-3 text-center">
                          <button onClick={() => handleReprintStockBalance(row)} className="p-2 hover:text-white text-gray-400"><Printer size={18}/></button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
             <PaginationControls currentPage={finishedPage} totalItems={finishedStockList.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setFinishedPage} />
           </Card>
        </div>
        
        <Card className="border-gray-700">
          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Database className="text-blue-500"/> Backup e Restauração</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Exportar Dados</h4>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={() => exportToCSV(motherCoils, 'estoque_bobinas_mae')} className="text-xs w-full justify-start h-9 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"><Download size={14}/> Bobinas Mãe</Button>
                <Button variant="secondary" onClick={() => exportToCSV(childCoils, 'estoque_bobinas_2')} className="text-xs w-full justify-start h-9 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"><Download size={14}/> Bobinas 2</Button>
                <Button variant="secondary" onClick={() => exportToCSV(productionLogs, 'historico_producao')} className="text-xs w-full justify-start h-9 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"><Download size={14}/> Histórico</Button>
              </div>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700 hover:border-amber-500/50 transition-colors">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Importar Backup</h4>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="file" accept=".json" className="hidden" ref={importFullBackupRef} onChange={handleFullRestore} />
                      <Button variant="primary" onClick={() => importFullBackupRef.current.click()} className="text-xs w-full justify-start h-9 bg-blue-600 hover:bg-blue-500 text-white font-bold"><Upload size={14} className="mr-2"/> Restaurar Backup Completo (.json)</Button>
                    </div>
                </div>
                <div className="border-t border-gray-700 my-2"></div>
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Importar partes (CSV)</p>
                <div className="flex items-center gap-2">
                    <Button variant="info" onClick={() => handleDownloadTemplate('mother')} className="w-9 h-9 p-0 rounded-lg shrink-0" title="Baixar Modelo"><FileInput size={16}/></Button>
                    <div className="relative flex-1">
                      <input type="file" accept=".csv" className="hidden" ref={importMotherStockRef} onChange={(e) => handleImportBackup(e, setMotherCoils, 'Estoque Mãe')} />
                      <Button variant="warning" onClick={() => importMotherStockRef.current.click()} className="text-xs w-full justify-start h-9 bg-amber-900/20 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40"><Upload size={14}/> Restaurar Mãe</Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="info" onClick={() => handleDownloadTemplate('b2')} className="w-9 h-9 p-0 rounded-lg shrink-0" title="Baixar Modelo"><FileInput size={16}/></Button>
                    <div className="relative flex-1">
                      <input type="file" accept=".csv" className="hidden" ref={importChildStockRef} onChange={(e) => handleImportBackup(e, setChildCoils, 'Estoque B2')} />
                      <Button variant="warning" onClick={() => importChildStockRef.current.click()} className="text-xs w-full justify-start h-9 bg-amber-900/20 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40"><Upload size={14}/> Restaurar B2</Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="info" onClick={() => handleDownloadTemplate('logs')} className="w-9 h-9 p-0 rounded-lg shrink-0" title="Baixar Modelo"><FileInput size={16}/></Button>
                    <div className="relative flex-1">
                      <input type="file" accept=".csv" className="hidden" ref={importLogsRef} onChange={(e) => handleImportBackup(e, setProductionLogs, 'Histórico')} />
                      <Button variant="warning" onClick={() => importLogsRef.current.click()} className="text-xs w-full justify-start h-9 bg-amber-900/20 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40"><Upload size={14}/> Restaurar Logs</Button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // --- RETURN FINAL ---
  return (
    <div className="flex h-screen bg-[#0f172a] font-sans text-gray-100 overflow-hidden">
      
      {/* Mobile Overlay */}
      <div className={`fixed inset-0 z-30 bg-black/50 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black/90 text-gray-300 flex flex-col border-r border-white/5 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-72`}>
        <div className="h-20 flex items-center px-6 border-b border-white/5 font-bold text-xl tracking-wider bg-black/20">
           <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 shadow-lg flex items-center justify-center"><Factory size={18} className="text-white"/></div>
           <span className="text-white">METALOSA</span>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Principal</p>
           <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <LayoutDashboard size={20} className={activeTab === 'dashboard' ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"}/> <span className="font-medium">Visão Geral</span>
           </button>
           <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8 mb-4">Operacional</p>
           <button onClick={() => { setActiveTab('mother'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'mother' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <ScrollText size={20} className={activeTab === 'mother' ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"}/> <span className="font-medium">Bobina Mãe</span>
           </button>
           <button onClick={() => { setActiveTab('cutting'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'cutting' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Scissors size={20} className={activeTab === 'cutting' ? "text-purple-400" : "group-hover:text-purple-400 transition-colors"}/> <span className="font-medium">Corte Slitter</span>
           </button>
           <button onClick={() => { setActiveTab('production'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'production' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Factory size={20} className={activeTab === 'production' ? "text-emerald-400" : "group-hover:text-emerald-400 transition-colors"}/> <span className="font-medium">Apontamento</span>
           </button>
           <button onClick={() => { setActiveTab('shipping'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${activeTab === 'shipping' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-inner' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
             <Truck size={20} className={activeTab === 'shipping' ? "text-amber-400" : "group-hover:text-amber-400 transition-colors"}/> <span className="font-medium">Expedição</span>
           </button>
           <div className="mt-8 px-4">
             <Button onClick={handleFullBackup} variant="success" className="w-full justify-start text-xs"><Archive size={16} className="mr-2"/> Backup Completo</Button>
           </div>
        </nav>
        <div className="px-6 py-2 mt-auto border-t border-white/5 text-center"><p className="text-[11px] text-gray-500 font-medium">© 2025 — <span className="text-gray-400 font-semibold">Sergio Betini</span></p></div>
        <div className="p-6 border-t border-white/5 bg-black/20"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 border border-gray-600"><User size={20}/></div><div><p className="text-white font-bold text-sm">Operador</p><p className="text-xs text-gray-500">Produção</p></div></div></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#111827]">
         <header className="h-16 md:h-20 bg-[#1f293b] shadow-lg flex items-center justify-between px-4 md:px-8 z-10 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24}/></button>
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">
                  {activeTab === 'dashboard' && "Dashboard"}
                  {activeTab === 'mother' && "Estoque Mãe"}
                  {activeTab === 'cutting' && "Corte Slitter"}
                  {activeTab === 'production' && "Apontamento"}
                  {activeTab === 'shipping' && "Expedição"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium uppercase tracking-wider hidden md:block">Controle de Produção</p>
              </div>
            </div>
            <div className="flex items-center gap-4"><div className="text-right px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 rounded-lg border border-gray-700"><p className="text-xs md:text-sm font-bold text-gray-300">{new Date().toLocaleDateString()}</p></div></div>
         </header>

         <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar-dark">
            <div className="max-w-7xl mx-auto pb-20 md:pb-0">
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'mother' && renderMotherCoilForm()}
              {activeTab === 'cutting' && renderCuttingProcess()}
              {activeTab === 'production' && renderProduction()}
              {activeTab === 'shipping' && renderShipping()}
            </div>
         </main>
      </div>
      
      {showCatalogModal && renderCatalogModal()}
      {showPrintModal && <PrintLabelsModal items={itemsToPrint} type={printType} onClose={() => setShowPrintModal(false)} />}
      {stockDetailsModalOpen && viewingStockCode && (
        <StockDetailsModal 
          code={viewingStockCode} 
          coils={childCoils.filter(c => c.b2Code === viewingStockCode && c.status === 'stock')}
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
    </div>
  );
}