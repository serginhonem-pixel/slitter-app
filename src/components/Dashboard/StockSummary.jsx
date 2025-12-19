import React from 'react';
import { Package, Factory, Scissors, Layers } from 'lucide-react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}>
    {children}
  </div>
);

const formatPrimary = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatSecondary = (value) => Number(value || 0).toLocaleString('pt-BR');

const StockSummaryCard = ({
  title,
  primaryValue,
  primaryUnit,
  secondaryValue,
  secondaryUnit,
  icon: Icon,
  colorClass,
}) => (
  <Card className="flex items-center justify-between">
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-extrabold mt-1 ${colorClass}`}>
        {formatPrimary(primaryValue)}{' '}
        <span className="text-sm font-medium text-gray-400">{primaryUnit}</span>
      </p>
      {secondaryValue !== undefined && secondaryValue !== null && (
        <p className="text-xs text-gray-500">
          {formatSecondary(secondaryValue)} {secondaryUnit}
        </p>
      )}
    </div>
    <div className={`p-3 rounded-full ${colorClass}/20`}>
      <Icon size={28} className={colorClass} />
    </div>
  </Card>
);

export const StockSummary = ({ totals }) => {
  const {
    totalMotherWeight = 0,
    totalB2Weight = 0,
    totalFinishedCount = 0,
    tileStockCount = 0,
    tileStockWeight = 0,
    motherCoilCount = 0,
    childCoilCount = 0,
  } = totals || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StockSummaryCard
        title="Estoque MP (Bobinas Mae)"
        primaryValue={motherCoilCount}
        primaryUnit="bobinas"
        secondaryValue={totalMotherWeight}
        secondaryUnit="kg"
        icon={Package}
        colorClass="text-blue-400"
      />
      <StockSummaryCard
        title="Estoque B2 (Bobinas Filhas)"
        primaryValue={childCoilCount}
        primaryUnit="bobinas"
        secondaryValue={totalB2Weight}
        secondaryUnit="kg"
        icon={Scissors}
        colorClass="text-purple-400"
      />
      <StockSummaryCard
        title="Estoque PA (Pecas Acabadas)"
        primaryValue={totalFinishedCount}
        primaryUnit="pecas"
        icon={Factory}
        colorClass="text-emerald-400"
      />
      <StockSummaryCard
        title="Bobinas Telha 10236"
        primaryValue={tileStockCount}
        primaryUnit="bobinas"
        secondaryValue={tileStockWeight}
        secondaryUnit="kg"
        icon={Layers}
        colorClass="text-amber-400"
      />
    </div>
  );
};
