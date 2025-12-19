// src/utils/constants.js

export const ITEMS_PER_PAGE = 50;

export const EVENT_TYPES = {
    MP_ENTRY: 'ENTRADA_MP',
    B2_CUT: 'CORTE_SLITTER',
    PA_PRODUCTION: 'PRODUCAO_PA',
    PA_SHIPPING: 'EXPEDICAO_PA',
    STOCK_ADJUSTMENT: 'AJUSTE_ESTOQUE',
};

export const EVENT_TYPE_LABELS = {
    [EVENT_TYPES.MP_ENTRY]: 'Entrada de Matéria-Prima',
    [EVENT_TYPES.B2_CUT]: 'Corte Slitter',
    [EVENT_TYPES.PA_PRODUCTION]: 'Produção de Produto Acabado',
    [EVENT_TYPES.PA_SHIPPING]: 'Expedição de Produto Acabado',
    [EVENT_TYPES.STOCK_ADJUSTMENT]: 'Ajuste de Estoque',
};

export const EVENT_TYPE_COLORS = {
    [EVENT_TYPES.MP_ENTRY]: 'text-blue-400',
    [EVENT_TYPES.B2_CUT]: 'text-purple-400',
    [EVENT_TYPES.PA_PRODUCTION]: 'text-emerald-400',
    [EVENT_TYPES.PA_SHIPPING]: 'text-red-400',
    [EVENT_TYPES.STOCK_ADJUSTMENT]: 'text-yellow-400',
};
