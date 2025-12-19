import { useMemo } from 'react';
import { INITIAL_MOTHER_CATALOG } from '../data/motherCatalog';

// --- 1. SEGURANÇA E UTILITÁRIOS ---
const safeNum = (val) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };
const normalizeCode = (v) => String(v ?? '').trim();

/**
 * Hook para calcular e consolidar os dados de estoque a partir das coleções do Firebase.
 * @param {Array} motherCoils - Lista de bobinas mãe.
 * @param {Array} childCoils - Lista de bobinas B2.
 * @param {Array} productionLogs - Logs de produção.
 * @param {Array} shippingLogs - Logs de expedição.
 * @param {Array} motherCatalog - Catálogo de bobinas mãe (opcional, usa INITIAL_MOTHER_CATALOG como fallback).
 * @returns {Object} Dados consolidados de estoque e totais.
 */
export const useStockData = ({ motherCoils, childCoils, productionLogs, shippingLogs, motherCatalog = INITIAL_MOTHER_CATALOG }) => {
    
    const stockData = useMemo(() => {
        const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
        const safeChild = Array.isArray(childCoils) ? childCoils : [];
        const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
        const safeShip = Array.isArray(shippingLogs) ? shippingLogs : [];

        // --- 2. PREPARAÇÃO DOS DADOS ---

        const catalogByCode = (motherCatalog || []).reduce((acc, item) => {
            const code = normalizeCode(item.code);
            if (code) acc[code] = item;
            return acc;
        }, {});
        
        // Estoque de Bobinas Mãe (Consolidado por Código e Largura)
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
                    type: item.type,
                    thickness: item.thickness, // Adicionado para exportação
                }; 
            }
            acc[key].weight += safeNum(item.remainingWeight) || safeNum(item.weight);
            acc[key].count += 1; 
          }
          return acc;
        }, {});

        // Estoque de Bobinas B2 (Consolidado por Código)
        const childStockByCode = safeChild.reduce((acc, item) => {
          if(item.status === 'stock') {
            if(!acc[item.b2Code]) acc[item.b2Code] = { code: item.b2Code, name: item.b2Name, weight: 0, count: 0, type: item.type };
            acc[item.b2Code].weight += safeNum(item.weight);
            acc[item.b2Code].count += 1; 
          }
          return acc;
        }, {});

        // Estoque de Produto Acabado (PA)
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

        // --- 3. TOTAIS E KPIs ---
        const totalMotherWeight = safeMother.filter(m => m.status === 'stock').reduce((acc, m) => acc + safeNum(m.remainingWeight || m.weight), 0);
        const totalB2Weight = safeChild.filter(c => c.status === 'stock').reduce((acc, c) => acc + safeNum(c.weight), 0);
        const totalFinishedCount = finishedStockList.reduce((acc, item) => acc + (item.count || 0), 0);
        const totalScrapAll = safeProd.reduce((acc, l) => acc + safeNum(l.scrap), 0) + safeMother.reduce((acc, m) => acc + safeNum(m.cutWaste), 0);
        
        // Exemplo de estoque específico (Bobina 10236)
        const tileStockCount = safeMother.filter(m => m.status === 'stock' && String(m.code) === '10236').length;
        const tileStockWeight = safeMother.filter(m => m.status === 'stock' && String(m.code) === '10236').reduce((acc, m) => acc + safeNum(m.remainingWeight || m.weight), 0);

        return {
            motherStockList: Object.values(motherStockByCode),
            childStockList: Object.values(childStockByCode),
            finishedStockList,
            rawMotherCoils: safeMother, // Mantém a lista bruta para exportação
            rawChildCoils: safeChild, // Mantém a lista bruta para exportação
            catalogByCode,
            
            // KPIs
            totalMotherWeight,
            totalB2Weight,
            totalFinishedCount,
            totalScrapAll,
            tileStockCount,
            tileStockWeight,
        };
    }, [motherCoils, childCoils, productionLogs, shippingLogs, motherCatalog]);

    return stockData;
};

// Exporta utilitários para uso em exportUtils
export { safeNum, normalizeCode };
