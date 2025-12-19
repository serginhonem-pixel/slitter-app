// src/components/Dashboard/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { useStockData } from '../../hooks/useStockData';
import { StockSummary } from './StockSummary';
import { MotherCoilStockList, ChildCoilStockList, FinishedStockList } from './StockList';
import { RecentActivity } from './RecentActivity';
import { loadFromDb } from '../../services/api'; // Para carregar os logs
import { EVENT_TYPES } from '../../utils/constants';

const Dashboard = ({ motherCoils, childCoils, productionLogs, shippingLogs, cuttingLogs, motherCatalog, exportToExcelXml, exportToCSV }) => {
    const { motherStockList, childStockList, finishedStockList, totals } = useStockData(
        motherCoils,
        childCoils,
        productionLogs,
        shippingLogs,
        motherCatalog
    );

    const [recentLogs, setRecentLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // Carregar os logs centralizados para a seção "Últimos Movimentos"
    useEffect(() => {
        const fetchRecentLogs = async () => {
            setLoadingLogs(true);
            try {
                // Tenta carregar os logs centralizados (novo sistema)
                const logs = await loadFromDb('eventLogs', { limit: 10, orderBy: 'timestamp', direction: 'desc' });
                setRecentLogs(logs);
            } catch (error) {
                console.warn("Coleção 'eventLogs' não encontrada. Usando logs de corte/produção como fallback.");
                // Fallback: usar os logs existentes (menos detalhado)
                const fallbackLogs = [
                    ...cuttingLogs.map(l => ({ ...l, eventType: EVENT_TYPES.B2_CUT, timestamp: l.timestamp || new Date().toISOString() })),
                    ...productionLogs.map(l => ({ ...l, eventType: EVENT_TYPES.PA_PRODUCTION, timestamp: l.timestamp || new Date().toISOString() })),
                    ...shippingLogs.map(l => ({ ...l, eventType: EVENT_TYPES.PA_SHIPPING, timestamp: l.timestamp || new Date().toISOString() })),
                ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
                setRecentLogs(fallbackLogs);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchRecentLogs();
    }, [cuttingLogs, productionLogs, shippingLogs]);


    // Funções de Exportação (passadas como props do App.jsx)
    const exportMother = () => {
        const dataToExport = motherCoils.filter(m => m.status === 'stock').map(m => ({
            ID: m.id,
            Codigo: m.code,
            Material: m.material,
            Espessura: m.thickness,
            Largura: m.width,
            Peso_Restante: m.remainingWeight,
            NF: m.nf,
            Data_Entrada: m.entryDate,
        }));
        exportToExcelXml([{ name: 'Estoque MP', rows: dataToExport }], 'Estoque_Bobinas_Mae');
    };

    const exportChild = () => {
        const dataToExport = childCoils.filter(c => c.status === 'stock').map(c => ({
            ID: c.id,
            Codigo_B2: c.b2Code,
            Nome_B2: c.b2Name,
            Largura: c.width,
            Espessura: c.thickness,
            Peso: c.weight,
            Bobina_Mae_ID: c.motherId,
            Bobina_Mae_Codigo: c.motherCode,
        }));
        exportToExcelXml([{ name: 'Estoque B2', rows: dataToExport }], 'Estoque_Bobinas_B2');
    };

    const exportFinished = () => {
        const dataToExport = finishedStockList.map(p => ({
            Codigo_PA: p.code,
            Nome_PA: p.name,
            Pecas_Estoque: p.count,
        }));
        exportToCSV(dataToExport, 'Estoque_Produto_Acabado');
    };


    return (
        <div className="space-y-6">
            {/* 1. Sumário de Estoque (KPIs) */}
            <StockSummary totals={totals} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 2. Últimos Movimentos */}
                <div className="lg:col-span-4">
                    <RecentActivity logs={recentLogs} loading={loadingLogs} />
                </div>

                {/* 3. Listas de Estoque */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MotherCoilStockList data={motherStockList} onExport={exportMother} />
                    <ChildCoilStockList data={childStockList} onExport={exportChild} />
                    <FinishedStockList data={finishedStockList} onExport={exportFinished} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
