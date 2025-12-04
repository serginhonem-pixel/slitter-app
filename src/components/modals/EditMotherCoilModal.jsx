import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const EditMotherCoilModal = ({ coil, onClose, onSave }) => {
  const [editData, setEditData] = useState(coil);

  // Função segura para atualizar números sem quebrar se ficar vazio
  const handleNumChange = (field, value) => {
      setEditData({ ...editData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h3 className="text-white font-bold text-lg">Editar Bobina Mãe</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
        </div>
        
        <div className="space-y-4">
           {/* CÓDIGO E NF */}
           <div className="grid grid-cols-2 gap-4">
               <Input 
                 label="Código Lote" 
                 value={editData.code} 
                 onChange={e => setEditData({...editData, code: e.target.value})} 
               />
               <Input 
                 label="Nota Fiscal" 
                 value={editData.nf} 
                 onChange={e => setEditData({...editData, nf: e.target.value})} 
               />
           </div>

           {/* DESCRIÇÃO */}
           <Input 
             label="Descrição / Material" 
             value={editData.material} 
             onChange={e => setEditData({...editData, material: e.target.value})} 
           />

           {/* PESO E LARGURA */}
           <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Peso (kg)" 
                type="number" 
                value={editData.weight} 
                onChange={e => handleNumChange('weight', e.target.value)} 
              />
              <Input 
                label="Largura (mm)" 
                type="number" 
                value={editData.width} 
                onChange={e => handleNumChange('width', e.target.value)} 
              />
           </div>
           
           {/* BOTÕES */}
           <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
             <Button onClick={onClose} variant="secondary" className="flex-1">Cancelar</Button>
             <Button onClick={() => onSave(editData)} variant="success" className="flex-1">Salvar Alterações</Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EditMotherCoilModal;