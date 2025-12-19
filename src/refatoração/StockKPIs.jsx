import React from 'react';
import { Package, Layers, Box, AlertTriangle } from 'lucide-react';

/**
 * Componente para exibir os KPIs (indicadores-chave) de estoque
 * Mostra resumo visual de MP, B2 e PA
 */
const StockKPIs = ({ 
  totalMotherWeight = 0, 
  totalB2Weight = 0, 
  totalFinishedCount = 0,
  totalScrapAll = 0,
  tileStockCount = 0,
  tileStockWeight = 0,
  isLoading = false 
}) => {
  const formatNumber = (value, decimals = 1) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-slate-900/50 rounded-lg p-4 animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Matéria-Prima (MP)',
      value: formatNumber(totalMotherWeight),
      unit: 'kg',
      icon: Package,
      color: 'from-blue-600 to-blue-800',
      bgColor: 'bg-blue-600/20',
      textColor: 'text-blue-400',
      description: 'Bobinas Mãe em Estoque',
    },
    {
      title: 'Bobinas 2 (B2)',
      value: formatNumber(totalB2Weight),
      unit: 'kg',
      icon: Layers,
      color: 'from-purple-600 to-purple-800',
      bgColor: 'bg-purple-600/20',
      textColor: 'text-purple-400',
      description: 'Bobinas Slitter em Estoque',
    },
    {
      title: 'Produto Acabado (PA)',
      value: totalFinishedCount,
      unit: 'peças',
      icon: Box,
      color: 'from-green-600 to-green-800',
      bgColor: 'bg-green-600/20',
      textColor: 'text-green-400',
      description: 'Produtos Finais em Estoque',
    },
    {
      title: 'Sucata Total',
      value: formatNumber(totalScrapAll),
      unit: 'kg',
      icon: AlertTriangle,
      color: 'from-orange-600 to-orange-800',
      bgColor: 'bg-orange-600/20',
      textColor: 'text-orange-400',
      description: 'Resíduo de Processos',
    },
    {
      title: 'Telhas (10236)',
      value: tileStockCount,
      unit: 'un',
      icon: Package,
      color: 'from-red-600 to-red-800',
      bgColor: 'bg-red-600/20',
      textColor: 'text-red-400',
      description: `${formatNumber(tileStockWeight)} kg`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${kpi.color} rounded-lg p-4 shadow-lg border border-white/10 hover:border-white/20 transition-all`}
          >
            {/* Ícone e Título */}
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <Icon size={20} className={kpi.textColor} />
              </div>
              <span className="text-xs text-white/60 font-semibold uppercase">
                {kpi.unit}
              </span>
            </div>

            {/* Valor Principal */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-white">
                {kpi.value}
              </div>
              <div className="text-xs text-white/70 mt-1">
                {kpi.title}
              </div>
            </div>

            {/* Descrição */}
            <div className="text-xs text-white/50 pt-2 border-t border-white/10">
              {kpi.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockKPIs;
