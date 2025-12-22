import { useMemo } from 'react';

const DEFAULT_PARAMS = {
  thresholdDiasSemGiro: 30,
  thresholdDiasFIFO: 15,
  demandWindowDias: 30,
  minWeightDefault: 3000,
  minCountDefault: 1,
  minByType: {
    BQ: 3000,
    BZ: 2000,
    BF: 3000,
    BEG: 3000,
    BFQ: 3000,
    GL: 2000,
    INOX: 1000,
  },
  minByMaterial: {
    GALV: 2000,
    INOX: 1000,
  },
};

const mergeParams = (overrides = {}) => {
  return {
    ...DEFAULT_PARAMS,
    ...overrides,
    minByType: {
      ...DEFAULT_PARAMS.minByType,
      ...(overrides.minByType || {}),
    },
    minByMaterial: {
      ...DEFAULT_PARAMS.minByMaterial,
      ...(overrides.minByMaterial || {}),
    },
  };
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const ddmmyyyy = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const parsed = new Date(`${y}-${m}-${d}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const parsed = new Date(`${y}-${m}-${d}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysFrom = (date, now) => {
  if (!date) return null;
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const pickMaxDate = (...dates) => {
  return dates.reduce((max, current) => {
    if (!current) return max;
    if (!max) return current;
    return current > max ? current : max;
  }, null);
};

const pickMinDate = (...dates) => {
  return dates.reduce((min, current) => {
    if (!current) return min;
    if (!min) return current;
    return current < min ? current : min;
  }, null);
};

const getMinByMaterial = (material, minByMaterial) => {
  const normalized = String(material || '').toUpperCase();
  if (!normalized) return null;
  for (const [key, value] of Object.entries(minByMaterial || {})) {
    if (normalized.includes(String(key).toUpperCase())) return value;
  }
  return null;
};

const computeStatus = ({
  stock,
  demand,
  lastMoveDays,
  oldestDays,
  thresholdDiasSemGiro,
  thresholdDiasFIFO,
}) => {
  if (Number(demand || 0) > 0 && Number(stock || 0) < Number(demand || 0)) return 'CRITICO';
  if (lastMoveDays === null || lastMoveDays >= thresholdDiasSemGiro) return 'SEM_GIRO';
  if (
    oldestDays !== null &&
    oldestDays >= thresholdDiasFIFO &&
    lastMoveDays < thresholdDiasSemGiro
  ) {
    return 'USAR';
  }
  return 'OK';
};

const formatReason = ({
  status,
  demand,
  demandUnit,
  stock,
  stockUnit,
  lastMoveDays,
  oldestDays,
  windowDays,
}) => {
  const demandLabel =
    demand !== null && demand !== undefined
      ? `Consumo ${windowDays}d: ${demand} ${demandUnit}`
      : `Consumo ${windowDays}d: -`;
  const stockLabel =
    stock !== null && stock !== undefined
      ? `Estoque: ${stock} ${stockUnit}`
      : `Estoque: -`;
  const lastMoveLabel =
    lastMoveDays !== null && lastMoveDays !== undefined
      ? `Ult mov: ${lastMoveDays}d`
      : 'Ult mov: -';
  const oldestLabel =
    oldestDays !== null && oldestDays !== undefined
      ? `Lote: ${oldestDays}d`
      : 'Lote: -';
  return `${status} | ${demandLabel} | ${stockLabel} | ${lastMoveLabel} | ${oldestLabel}`;
};

export const useOperationalStatus = ({
  motherStockList = [],
  childStockList = [],
  finishedStockList = [],
  rawMotherCoils = [],
  rawChildCoils = [],
  productionLogs = [],
  shippingLogs = [],
  cuttingLogs = [],
  params = {},
}) => {
  const merged = mergeParams(params);

  return useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - merged.demandWindowDias * 24 * 60 * 60 * 1000);

    const motherDatesByCode = {};
    rawMotherCoils
      .filter((coil) => coil?.status === 'stock')
      .forEach((coil) => {
        const code = String(coil.code || '').trim();
        if (!code) return;
        const entryDate =
          parseDate(coil.entryDate) || parseDate(coil.date) || parseDate(coil.createdAt);
        if (!motherDatesByCode[code]) {
          motherDatesByCode[code] = { oldest: entryDate, latest: entryDate };
        } else {
          motherDatesByCode[code].oldest = pickMinDate(motherDatesByCode[code].oldest, entryDate);
          motherDatesByCode[code].latest = pickMaxDate(motherDatesByCode[code].latest, entryDate);
        }
      });

    const motherCutByCode = {};
    const motherDemandByCode = {};
    (Array.isArray(cuttingLogs) ? cuttingLogs : []).forEach((log) => {
      const code = String(log?.motherCode || '').trim();
      if (!code) return;
      const logDate = parseDate(log.date) || parseDate(log.timestamp);
      if (!logDate) return;
      motherCutByCode[code] = pickMaxDate(motherCutByCode[code], logDate);
      if (logDate >= windowStart) {
        const weight = Number(log.inputWeight ?? log.weight ?? 0);
        motherDemandByCode[code] = (motherDemandByCode[code] || 0) + weight;
      }
    });

    const motherAggregated = motherStockList.reduce((acc, item) => {
      const code = String(item.code || '').trim();
      if (!code) return acc;
      if (!acc[code]) {
        acc[code] = {
          code,
          material: item.material,
          type: item.type,
          weight: 0,
        };
      }
      acc[code].weight += Number(item.weight || 0);
      return acc;
    }, {});

    const motherStatusByCode = {};
    Object.values(motherAggregated).forEach((item) => {
      const code = String(item.code || '').trim();
      if (!code) return;
      const latestEntry = motherDatesByCode[code]?.latest || null;
      const lastCut = motherCutByCode[code] || null;
      const lastMove = pickMaxDate(latestEntry, lastCut);
      const oldest = motherDatesByCode[code]?.oldest || null;
      const lastMoveDays = lastMove ? daysFrom(lastMove, now) : null;
      const oldestDays = oldest ? daysFrom(oldest, now) : null;
      const stockMetric = item.weight || 0;
      const demand = motherDemandByCode[code] || 0;
      const status = computeStatus({
        stock: stockMetric,
        demand,
        lastMoveDays,
        oldestDays,
        thresholdDiasSemGiro: merged.thresholdDiasSemGiro,
        thresholdDiasFIFO: merged.thresholdDiasFIFO,
      });
      motherStatusByCode[code] = {
        status,
        lastMoveDays,
        oldestDays,
        demand,
        reason: formatReason({
          status,
          demand: demand.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
          demandUnit: 'kg',
          stock: Number(stockMetric).toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
          stockUnit: 'kg',
          lastMoveDays,
          oldestDays,
          windowDays: merged.demandWindowDias,
        }),
      };
    });

    const childDatesByCode = {};
    rawChildCoils
      .filter((coil) => coil?.status === 'stock')
      .forEach((coil) => {
        const code = String(coil.b2Code || '').trim();
        if (!code) return;
        const entryDate =
          parseDate(coil.createdAt) || parseDate(coil.date) || parseDate(coil.entryDate);
        if (!childDatesByCode[code]) {
          childDatesByCode[code] = { oldest: entryDate, latest: entryDate };
        } else {
          childDatesByCode[code].oldest = pickMinDate(childDatesByCode[code].oldest, entryDate);
          childDatesByCode[code].latest = pickMaxDate(childDatesByCode[code].latest, entryDate);
        }
      });

    const childById = rawChildCoils.reduce((acc, coil) => {
      if (!coil?.id) return acc;
      acc[String(coil.id)] = coil;
      return acc;
    }, {});

    const b2DemandByCode = {};
    const countedChildIds = new Set();
    (Array.isArray(productionLogs) ? productionLogs : []).forEach((log) => {
      const logDate = parseDate(log.date) || parseDate(log.timestamp);
      if (!logDate || logDate < windowStart) return;
      const childIds = Array.isArray(log.childIds) ? log.childIds : [];
      childIds.forEach((childId) => {
        const idKey = String(childId);
        if (countedChildIds.has(idKey)) return;
        const coil = childById[String(childId)];
        if (!coil) return;
        const code = String(coil.b2Code || log.b2Code || '').trim();
        if (!code) return;
        const weight = Number(coil.weight ?? 0);
        b2DemandByCode[code] = (b2DemandByCode[code] || 0) + weight;
        countedChildIds.add(idKey);
      });
      if (!childIds.length && log.b2Code) {
        const code = String(log.b2Code).trim();
        if (code) {
          const weight = Number(log.weight ?? 0);
          if (weight) b2DemandByCode[code] = (b2DemandByCode[code] || 0) + weight;
        }
      }
    });

    const childStatusByCode = {};
    childStockList.forEach((item) => {
      const code = String(item.code || '').trim();
      if (!code) return;
      const lastMove = childDatesByCode[code]?.latest || null;
      const oldest = childDatesByCode[code]?.oldest || null;
      const lastMoveDays = lastMove ? daysFrom(lastMove, now) : null;
      const oldestDays = oldest ? daysFrom(oldest, now) : null;
      const stockMetric = item.weight || 0;
      const demand = b2DemandByCode[code] || 0;
      const status = computeStatus({
        stock: stockMetric,
        demand,
        lastMoveDays,
        oldestDays,
        thresholdDiasSemGiro: merged.thresholdDiasSemGiro,
        thresholdDiasFIFO: merged.thresholdDiasFIFO,
      });
      childStatusByCode[code] = {
        status,
        lastMoveDays,
        oldestDays,
        demand,
        reason: formatReason({
          status,
          demand: demand.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
          demandUnit: 'kg',
          stock: Number(stockMetric).toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
          stockUnit: 'kg',
          lastMoveDays,
          oldestDays,
          windowDays: merged.demandWindowDias,
        }),
      };
    });

    const prodDatesByCode = {};
    (Array.isArray(productionLogs) ? productionLogs : []).forEach((log) => {
      const code = String(log?.productCode || '').trim();
      if (!code) return;
      const logDate = parseDate(log.date) || parseDate(log.timestamp);
      if (!logDate) return;
      if (!prodDatesByCode[code]) {
        prodDatesByCode[code] = { oldest: logDate, latest: logDate };
      } else {
        prodDatesByCode[code].oldest = pickMinDate(prodDatesByCode[code].oldest, logDate);
        prodDatesByCode[code].latest = pickMaxDate(prodDatesByCode[code].latest, logDate);
      }
    });

    const shipLatestByCode = {};
    const shipDemandByCode = {};
    (Array.isArray(shippingLogs) ? shippingLogs : []).forEach((log) => {
      const code = String(log?.productCode || '').trim();
      if (!code) return;
      const logDate = parseDate(log.date) || parseDate(log.timestamp);
      if (!logDate) return;
      shipLatestByCode[code] = pickMaxDate(shipLatestByCode[code], logDate);
      if (logDate >= windowStart) {
        const qty = Number(log.quantity ?? 0);
        shipDemandByCode[code] = (shipDemandByCode[code] || 0) + qty;
      }
    });

    const finishedStatusByCode = {};
    finishedStockList.forEach((item) => {
      const code = String(item.code || '').trim();
      if (!code) return;
      const lastProd = prodDatesByCode[code]?.latest || null;
      const lastShip = shipLatestByCode[code] || null;
      const lastMove = pickMaxDate(lastProd, lastShip);
      const oldest = prodDatesByCode[code]?.oldest || null;
      const lastMoveDays = lastMove ? daysFrom(lastMove, now) : null;
      const oldestDays = oldest ? daysFrom(oldest, now) : null;
      const stockMetric = item.count || 0;
      const demand = shipDemandByCode[code] || 0;
      const status = computeStatus({
        stock: stockMetric,
        demand,
        lastMoveDays,
        oldestDays,
        thresholdDiasSemGiro: merged.thresholdDiasSemGiro,
        thresholdDiasFIFO: merged.thresholdDiasFIFO,
      });
      finishedStatusByCode[code] = {
        status,
        lastMoveDays,
        oldestDays,
        demand,
        reason: formatReason({
          status,
          demand: demand.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          demandUnit: 'pcs',
          stock: Number(stockMetric).toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          stockUnit: 'pcs',
          lastMoveDays,
          oldestDays,
          windowDays: merged.demandWindowDias,
        }),
      };
    });

    return {
      motherStatusByCode,
      childStatusByCode,
      finishedStatusByCode,
    };
  }, [
    motherStockList,
    childStockList,
    finishedStockList,
    rawMotherCoils,
    rawChildCoils,
    productionLogs,
    shippingLogs,
    cuttingLogs,
    merged.thresholdDiasSemGiro,
    merged.thresholdDiasFIFO,
    merged.demandWindowDias,
    merged.minWeightDefault,
    merged.minCountDefault,
    merged.minByType,
    merged.minByMaterial,
  ]);
};
