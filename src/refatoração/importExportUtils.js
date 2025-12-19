// src/utils/importExportUtils.js

// Funções auxiliares (detectDelimiter e parseCSVLine)
const detectDelimiter = (text) => {
  const delimiters = [';', ',', '\t'];
  let bestDelimiter = ',';
  let maxCount = 0;

  delimiters.forEach(delimiter => {
    const count = (text.match(new RegExp(delimiter, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  });
  return bestDelimiter;
};

const parseCSVLine = (text, delimiter) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
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

// 1. Exportação para CSV
export const exportToCSV = (data, filename) => {
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

// 2. Geração de PDF (mantida a lógica original)
export const handleGeneratePDF = (title, data) => {
  const printWindow = window.open('', '', 'height=600,width=800');
  
  if (!printWindow) return alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");

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
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

// 3. Importação Genérica (Backup / Lista Completa)
export const handleImportBackup = (e, setter, label) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      
      if (rows.length < 2) return alert("Arquivo vazio.");
      
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const data = []; 

      rows.slice(1).forEach(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let val = row[index];
          if (val === undefined) return;

          let key = header;
          if (header.includes('largura')) key = 'width';
          if (header.includes('peso')) key = 'weight';
          if (header.includes('código') || header.includes('codigo') || header.includes('lote')) key = 'code';
          if (header.includes('material') || header.includes('descrição')) key = 'material';
          if (header.includes('nota') || header.includes('nf')) key = 'nf';
          if (header.includes('filial')) key = 'branch';
          if (header.includes('tipo')) key = 'type';
          if (header.includes('espesura') || header.includes('espessura')) key = 'thickness';
          if (header.includes('quantidade') || header.includes('qtd')) key = 'qty_temp'; 

          if (typeof val === 'string' && /^[0-9.,]+$/.test(val)) {
             const clean = val.replace(/\./g, '').replace(',', '.');
             if (!isNaN(Number(clean)) && clean !== '') val = Number(clean);
          }
          obj[key] = val;
        });

        if (!obj.status) obj.status = 'stock';
        if (!obj.branch) obj.branch = 'MATRIZ'; 
        
        if (label.includes('Mãe')) {
            if (obj.weight && !obj.remainingWeight) obj.remainingWeight = obj.weight;
            if (obj.weight && !obj.originalWeight) obj.originalWeight = obj.weight;
            if (!obj.width) obj.width = 1200;
            if (!obj.material) obj.material = `BOBINA ${obj.code}`;
        }

        const loops = obj.qty_temp ? parseInt(obj.qty_temp) : 1;
        
        for (let i = 0; i < loops; i++) {
            data.push({
                ...obj,
                id: `IMP-${Date.now()}-${Math.floor(Math.random()*1000000)}`, 
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

// 4. Inventário Inteligente (Bobina Mãe)
export const handleMotherInventory = (e, motherCoils, cuttingLogs, motherCatalog, setMotherCoils, setCuttingLogs) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const delimiter = detectDelimiter(text);
      const rows = parseCSVLine(text, delimiter);
      
      if (rows.length < 2) return alert("Arquivo vazio ou sem cabeçalho.");

      const headers = rows[0].map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")); 
      
      const idxCode = headers.findIndex(h => h.includes('codigo') || h.includes('lote'));
      const idxWidth = headers.findIndex(h => h.includes('largura'));
      const idxWeight = headers.findIndex(h => h.includes('peso'));
      const idxBranch = headers.findIndex(h => h.includes('filial'));
      const idxType = headers.findIndex(h => h.includes('tipo'));

      if (idxCode === -1 || idxWeight === -1) {
          return alert(`Erro: Não encontrei as colunas 'Código' e 'Peso' no arquivo.\n\nColunas lidas: ${headers.join(', ')}`);
      }

      const inventoryMap = {}; 
      const dataRows = rows.slice(1);
      
      dataRows.forEach(row => {
           const rawCode = String(row[idxCode] || '').trim();
           
           const parseNum = (val) => {
               if (!val) return 0;
               let clean = String(val).replace(/\./g, '').replace(',', '.');
               return parseFloat(clean) || 0;
           };

           const width = idxWidth !== -1 ? parseNum(row[idxWidth]) : 0; 
           const weight = parseNum(row[idxWeight]);
           const branch = idxBranch !== -1 ? (row[idxBranch] || 'MATRIZ') : 'MATRIZ';
           const type = idxType !== -1 ? (row[idxType] || 'ND') : 'ND';

           if (rawCode && weight > 0) {
               const key = `${rawCode}|${width}`;
               
               if (!inventoryMap[key]) inventoryMap[key] = { weight: 0, branch, type };
               inventoryMap[key].weight += weight;
               
               if(branch !== 'MATRIZ') inventoryMap[key].branch = branch;
               if(type !== 'ND') inventoryMap[key].type = type;
           }
      });

      let newMotherCoils = [...motherCoils];
      let newCuttingLogs = [...cuttingLogs];
      const dateNow = new Date().toLocaleDateString();
      let adjustedCount = 0;
      let diffTotal = 0;

      Object.keys(inventoryMap).forEach(key => {
          const [code, widthStr] = key.split('|');
          const width = parseFloat(widthStr);
          const { weight: realWeight, branch, type } = inventoryMap[key];

          const systemCoils = newMotherCoils.filter(m => 
              String(m.code) === code && 
              (width === 0 || Math.abs((parseFloat(m.width)||0) - width) < 5) && 
              m.status === 'stock'
          );
          
          const systemWeight = systemCoils.reduce((acc, m) => acc + (parseFloat(m.remainingWeight) || 0), 0);
          const diff = realWeight - systemWeight;

          if (Math.abs(diff) < 0.5) return;

          let meta = systemCoils[0] || motherCatalog.find(m => String(m.code) === code) || { material: 'AJUSTE INVENTÁRIO', thickness: '-', type: type };

          if (diff > 0) {
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
              let weightToDeduct = Math.abs(diff);
              for (let coil of systemCoils) {
                  if (weightToDeduct <= 0) break;
                  const current = parseFloat(coil.remainingWeight);
                  
                  if (current <= weightToDeduct) {
                      coil.remainingWeight = 0;
                      coil.status = 'consumed';
                      coil.consumptionDetail = 'AJUSTE INVENTÁRIO';
                      coil.consumedDate = dateNow;
                      weightToDeduct -= current;
                  } else {
                      coil.remainingWeight = current - weightToDeduct;
                      weightToDeduct = 0;
                  }
              }
              
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

// 5. Restaurar Backup Completo
export const handleFullRestore = (e, setters) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const fileDate = file.lastModified ? new Date(file.lastModified).toLocaleString() : new Date().toLocaleString();

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      
      if (data.motherCoils) setters.setMotherCoils(data.motherCoils);
      if (data.childCoils) setters.setChildCoils(data.childCoils);
      if (data.productionLogs) setters.setProductionLogs(data.productionLogs);
      if (data.shippingLogs) setters.setShippingLogs(data.shippingLogs);
      if (data.productCatalog) setters.setProductCatalog(data.productCatalog);
      if (data.motherCatalog) setters.setMotherCatalog(data.motherCatalog);
      if (data.cuttingLogs) setters.setCuttingLogs(data.cuttingLogs); 
      
      setters.setCurrentFileName(`📂 ${fileName} (Salvo em: ${fileDate})`);
      
      const totalRegs = (data.motherCoils?.length||0) 
              + (data.childCoils?.length||0) 
              + (data.productionLogs?.length||0) 
              + (data.productCatalog?.length||0) 
              + (data.shippingLogs?.length||0);

      alert(`Backup restaurado com sucesso!\n\nArquivo: ${fileName}\nData Original: ${fileDate}\nRegistros Carregados: ~${totalRegs}`);
    } catch (err) {
      alert("Erro ao ler backup: " + err.message);
    }
  };
  reader.readAsText(file);
};

// 6. Download de Template
export const handleDownloadTemplate = (type) => {
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
