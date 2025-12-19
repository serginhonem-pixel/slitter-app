// src/components/Dashboard/StockSummary.jsx

import React from 'react';
import { Package, Factory, Scissors, TrendingUp } from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}
  >
    {children}
  </div>
);

const StockSummaryCard = ({ title, value, unit, icon: Icon, colorClass }) => (
    <Card className="flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
            <p className={`text-3xl font-extrabold mt-1 ${colorClass}`}>
                {value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-base font-normal ml-1 text-gray-400">{unit}</span>
            </p>
        </div>
        <div className={`p-3 rounded-full ${colorClass}/20`}>
            <Icon size={28} className={colorClass} />
        </div>
    </Card>
);

export const StockSummary = ({ totals }) => {
    const { totalMotherWeight, totalB2Weight, totalFinishedCount, totalScrapAll } = totals;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StockSummaryCard
                title="Estoque MP (Bobinas Mãe)"
                value={totalMotherWeight}
                unit="kg"
                icon={Package}
                colorClass="text-blue-400"
            />
            <StockSummaryCard
                title="Estoque B2 (Bobinas Filhas)"
                value={totalB2Weight}
                unit="kg"
                icon={Scissors}
                colorClass="text-purple-400"
            />
            <StockSummaryCard
                title="Estoque PA (Peças Acabadas)"
                value={totalFinishedCount}
                unit="pçs"
                icon={Factory}
                colorClass="text-emerald-400"
            />
            <StockSummaryCard
                title="Sucata Acumulada"
                value={totalScrapAll}
                unit="kg"
                icon={TrendingUp}
                colorClass="text-red-400"
            />
        </div>
    );
};
