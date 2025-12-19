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
  onExportMother,
  onExportChild,
  onExportFinished,
  onExportShipments,
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
            data={motherData}
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
            data={childData}
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
            data={finishedData}
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
    productionLogs,
    shipments,
  ],
  );

  const activeTabDefinition = tabs.find((tab) => tab.id === activeTab) || tabs[0];

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
        {!activeTabDefinition?.disableExport && activeTabDefinition?.onExport && (
          <button
            onClick={activeTabDefinition.onExport}
            className="text-xs text-gray-200 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 transition-colors"
          >
            <Download size={16} /> Exportar {activeTabDefinition.exportLabel}
          </button>
        )}
      </div>

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
