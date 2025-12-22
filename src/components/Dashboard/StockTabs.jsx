import React, { useMemo, useState } from 'react';
import { Package, Scissors, Factory, Download, History, Truck } from 'lucide-react';
import {
  MotherCoilStockList,
  ChildCoilStockList,
  FinishedStockList,
  ShipmentList,
} from './StockList';
import { LatestMovementsPanel } from './LatestMovementsPanel';

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}>
    {children}
  </div>
);

const TabButton = ({ active, label, icon: Icon, colorClass, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
      active ? 'bg-slate-800 text-white border border-white/10 shadow-inner' : 'text-gray-400 hover:text-white'
    }`}
  >
    <Icon size={18} className={colorClass} />
    {label}
  </button>
);

export const StockTabs = ({
  motherData,
  childData,
  finishedData,
  shipments = [],
  statusByMotherCode,
  statusByChildCode,
  statusByFinishedCode,
  onExportMother,
  onExportChild,
  onExportFinished,
  onExportShipments,
  onExportMotherPdf,
  onViewStockDetails,
  onViewProductHistory,
  onPrintProduct,
  getUnitWeight,
  calcProductWeight,
  eventLogs = [],
  eventLogsLoading = false,
  onViewEventDetails,
  productionLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState('mother');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const applyStatusFilter = (data, statusMap) => {
    if (!Array.isArray(data)) return [];
    if (!statusMap || statusFilter === 'ALL') return data;
    return data.filter((item) => statusMap[item.code]?.status === statusFilter);
  };

  const getStatusCounts = (data, statusMap) => {
    const counts = { ALL: 0, CRITICO: 0, SEM_GIRO: 0, USAR: 0, OK: 0 };
    if (!Array.isArray(data) || !statusMap) return counts;
    data.forEach((item) => {
      const status = statusMap[item.code]?.status || 'OK';
      counts.ALL += 1;
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const filteredMotherData = applyStatusFilter(motherData, statusByMotherCode);
  const filteredChildData = applyStatusFilter(childData, statusByChildCode);
  const filteredFinishedData = applyStatusFilter(finishedData, statusByFinishedCode);

  const tabs = useMemo(
    () => [
      {
        id: 'mother',
        label: 'Bobinas Mãe',
        icon: Package,
        color: 'text-blue-400',
        onExport: onExportMother,
        exportLabel: 'MP',
        render: () => (
          <MotherCoilStockList
            data={filteredMotherData}
            statusByCode={statusByMotherCode}
            onExport={onExportMother}
            onViewDetails={(code) => onViewStockDetails?.(code, 'mother')}
            variant="embedded"
            showHeader={false}
            className="min-h-[360px]"
          />
        ),
      },
      {
        id: 'child',
        label: 'Bobinas B2',
        icon: Scissors,
        color: 'text-purple-400',
        onExport: onExportChild,
        exportLabel: 'B2',
        render: () => (
          <ChildCoilStockList
            data={filteredChildData}
            statusByCode={statusByChildCode}
            onExport={onExportChild}
            onViewDetails={(code) => onViewStockDetails?.(code, 'b2')}
            variant="embedded"
            showHeader={false}
            className="min-h-[360px]"
          />
        ),
      },
      {
        id: 'finished',
        label: 'Produto Acabado',
        icon: Factory,
        color: 'text-emerald-400',
        onExport: onExportFinished,
        exportLabel: 'PA',
        render: () => (
          <FinishedStockList
            data={filteredFinishedData}
            statusByCode={statusByFinishedCode}
            onExport={onExportFinished}
            onViewHistory={onViewProductHistory}
            onPrint={onPrintProduct}
            variant="embedded"
            showHeader={false}
            className="min-h-[360px]"
            getUnitWeight={getUnitWeight}
            calcProductWeight={calcProductWeight}
          />
        ),
      },
      {
        id: 'shipments',
        label: 'Expedições',
        icon: Truck,
        color: 'text-amber-400',
        onExport: onExportShipments,
        exportLabel: 'Expedições',
        render: () => (
          <ShipmentList
            data={shipments}
            onExport={onExportShipments}
            variant="embedded"
            showHeader={false}
            className="min-h-[360px]"
          />
        ),
      },
      {
        id: 'recent',
        label: 'Últimos Movimentos',
        icon: History,
        color: 'text-sky-400',
        disableExport: true,
        render: () => (
          <div className="min-h-[360px]">
            <LatestMovementsPanel
              events={eventLogs}
              isLoading={eventLogsLoading}
              onViewDetails={onViewEventDetails}
              productionLogs={productionLogs}
            />
          </div>
        ),
      },
    ],
    [
      childData,
      finishedData,
      motherData,
      filteredMotherData,
      filteredChildData,
      filteredFinishedData,
      statusByMotherCode,
      statusByChildCode,
      statusByFinishedCode,
      onExportChild,
      onExportFinished,
      onExportMother,
      onExportShipments,
      onPrintProduct,
    eventLogs,
    eventLogsLoading,
    onViewEventDetails,
    onViewProductHistory,
    onViewStockDetails,
    onExportMotherPdf,
    productionLogs,
    shipments,
  ],
  );

  const activeTabDefinition = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const activeStatusMap =
    activeTabDefinition.id === 'mother'
      ? statusByMotherCode
      : activeTabDefinition.id === 'child'
        ? statusByChildCode
        : activeTabDefinition.id === 'finished'
          ? statusByFinishedCode
          : null;
  const activeData =
    activeTabDefinition.id === 'mother'
      ? motherData
      : activeTabDefinition.id === 'child'
        ? childData
        : activeTabDefinition.id === 'finished'
          ? finishedData
          : [];
  const statusCounts = getStatusCounts(activeData, activeStatusMap);
  const showStatusFilters = ['mother', 'child', 'finished'].includes(activeTabDefinition.id);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={tab.id === activeTab}
              label={tab.label}
              icon={tab.icon}
              colorClass={tab.color}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!activeTabDefinition?.disableExport && activeTabDefinition?.onExport && (
            <button
              onClick={activeTabDefinition.onExport}
              className="text-xs text-gray-200 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 transition-colors"
            >
              <Download size={16} /> Exportar {activeTabDefinition.exportLabel}
            </button>
          )}
          {activeTabDefinition?.id === 'mother' && onExportMotherPdf && (
            <button
              onClick={onExportMotherPdf}
              className="text-xs text-gray-200 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 transition-colors"
            >
              <Download size={16} /> PDF MP
            </button>
          )}
        </div>
      </div>

      {showStatusFilters && (
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            {
              key: 'ALL',
              label: `Todos (${statusCounts.ALL})`,
              title: 'Mostra todos os itens da aba.',
              color: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
            },
            {
              key: 'CRITICO',
              label: `Critico (${statusCounts.CRITICO})`,
              title: 'Consumo no periodo maior que o estoque.',
              color: 'bg-red-500/20 text-red-200 border-red-400/30',
            },
            {
              key: 'SEM_GIRO',
              label: `Sem giro (${statusCounts.SEM_GIRO})`,
              title: 'Sem movimento no periodo configurado.',
              color: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
            },
            {
              key: 'USAR',
              label: `Usar (${statusCounts.USAR})`,
              title: 'Lote antigo e ainda com consumo.',
              color: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
            },
            {
              key: 'OK',
              label: `OK (${statusCounts.OK})`,
              title: 'Dentro do esperado para o periodo.',
              color: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
            },
          ].map((item) => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                title={item.title}
                className={`px-3 py-1 rounded-full border transition-colors ${
                  isActive
                    ? `${item.color} shadow-inner`
                    : 'text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={tab.id === activeTab ? 'block' : 'hidden'}
          >
            {tab.render()}
          </div>
        ))}
      </div>
    </Card>
  );
};
