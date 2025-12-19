// src/components/Shipping/ShippingProcess.jsx
import React, { useMemo } from 'react';
import { Truck } from 'lucide-react';
import Card from '../Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

// Assumindo que estas props serão passadas pelo App.jsx
const ShippingProcess = ({
    shippingLogs,
    shipProduct, setShipProduct,
    shipQty, setShipQty,
    shipDest, setShipDest,
    registerShipping,
    getFinishedStock
}) => {

    const stock = useMemo(() => getFinishedStock(), [getFinishedStock]);
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

export default ShippingProcess;
