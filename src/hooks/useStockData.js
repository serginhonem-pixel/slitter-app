import { useMemo } from 'react';
import { INITIAL_MOTHER_CATALOG } from '../data/motherCatalog';

const safeNum = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCode = (value) => String(value ?? '').trim();

const normalizeThicknessValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    let parsed = value;
    while (parsed > 5) parsed /= 10;
    return parsed;
  }
  const cleaned = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  let normalized = parsed;
  while (normalized > 5) normalized /= 10;
  return normalized;
};

const formatThicknessLabel = (value) => {
  if (value === null || value === undefined) return null;
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const useStockData = (...args) => {
  let params = args[0] || {};

  if (Array.isArray(args[0]) || args.length > 1) {
    params = {
      motherCoils: args[0],
      childCoils: args[1],
      productionLogs: args[2],
      shippingLogs: args[3],
      motherCatalog: args[4],
    };
  }

  const {
    motherCoils = [],
    childCoils = [],
    productionLogs = [],
    shippingLogs = [],
    motherCatalog = INITIAL_MOTHER_CATALOG,
    productCatalog = [],
  } = params;

  return useMemo(() => {
    const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
    const safeChild = Array.isArray(childCoils) ? childCoils : [];
    const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
    const safeShip = Array.isArray(shippingLogs) ? shippingLogs : [];

    const catalogByCode = (motherCatalog || []).reduce((acc, item) => {
      const code = normalizeCode(item.code);
      if (code) acc[code] = item;
      return acc;
    }, {});

    const motherStockByCode = safeMother.reduce((acc, item) => {
      if (item.status === 'stock') {
        const codeRaw = normalizeCode(item.code);
        const width = safeNum(item.width);
        const key = `${codeRaw}-${width}`;

        if (!acc[key]) {
          const catalogItem = catalogByCode[codeRaw];
          const materialName = catalogItem?.description || item.material || `BOBINA ${item.code}`;
          const normalizedThickness =
            normalizeThicknessValue(item.thickness) ??
            normalizeThicknessValue(catalogItem?.thickness) ??
            null;
          const thicknessLabel =
            catalogItem?.thickness ??
            (normalizedThickness !== null ? formatThicknessLabel(normalizedThickness) : null) ??
            item.thickness ??
            null;
          const typeLabel = catalogItem?.type || item.type || null;

          acc[key] = {
            code: item.code,
            material: materialName,
            width: item.width,
            weight: 0,
            count: 0,
            type: typeLabel,
            thickness: thicknessLabel,
          };
        }

        acc[key].weight += safeNum(item.remainingWeight) || safeNum(item.weight);
        acc[key].count += 1;
      }
      return acc;
    }, {});

    const productCatalogMap = Array.isArray(productCatalog)
      ? productCatalog.reduce((map, product) => {
          if (product?.b2Code) {
            map[normalizeCode(product.b2Code)] = product;
          }
          return map;
        }, {})
      : {};

    const childStockByCode = safeChild.reduce((acc, item) => {
      if (item.status === 'stock') {
        const catalogItem = productCatalogMap[normalizeCode(item.b2Code)];
        if (!acc[item.b2Code]) {
          acc[item.b2Code] = {
            code: item.b2Code,
            name: item.b2Name,
            weight: 0,
            count: 0,
            type: catalogItem?.type || item.type,
            thickness:
              formatThicknessLabel(
                normalizeThicknessValue(catalogItem?.thickness) ??
                  normalizeThicknessValue(item.thickness),
              ) || catalogItem?.thickness || item.thickness,
          };
        }
        acc[item.b2Code].weight += safeNum(item.weight);
        acc[item.b2Code].count += 1;
      }
      return acc;
    }, {});

    const stock = {};
    safeProd.forEach((log) => {
      if (!stock[log.productCode]) {
        stock[log.productCode] = { code: log.productCode, name: log.productName, count: 0 };
      }
      stock[log.productCode].count += parseInt(log.pieces, 10) || 0;
    });
    safeShip.forEach((log) => {
      if (stock[log.productCode]) {
        stock[log.productCode].count -= parseInt(log.quantity, 10) || 0;
      }
    });
    const finishedStockList = Object.values(stock).filter((item) => item.count > 0);

    const totalMotherWeight = safeMother
      .filter((m) => m.status === 'stock')
      .reduce((acc, coil) => acc + safeNum(coil.remainingWeight || coil.weight), 0);
    const totalB2Weight = safeChild
      .filter((coil) => coil.status === 'stock')
      .reduce((acc, coil) => acc + safeNum(coil.weight), 0);
    const totalFinishedCount = finishedStockList.reduce(
      (acc, item) => acc + (item.count || 0),
      0,
    );
    const totalScrapAll =
      safeProd.reduce((acc, log) => acc + safeNum(log.scrap), 0) +
      safeMother.reduce((acc, coil) => acc + safeNum(coil.cutWaste), 0);
    const tileStockCount = safeMother.filter(
      (coil) => coil.status === 'stock' && String(coil.code) === '10236',
    ).length;
    const tileStockWeight = safeMother
      .filter((coil) => coil.status === 'stock' && String(coil.code) === '10236')
      .reduce((acc, coil) => acc + safeNum(coil.remainingWeight || coil.weight), 0);

    return {
      motherStockList: Object.values(motherStockByCode),
      childStockList: Object.values(childStockByCode),
      finishedStockList,
      totals: {
        totalMotherWeight,
        totalB2Weight,
        totalFinishedCount,
        totalScrapAll,
        tileStockCount,
        tileStockWeight,
        motherCoilCount: safeMother.filter((m) => m.status === 'stock').length,
        childCoilCount: safeChild.filter((c) => c.status === 'stock').length,
      },
      catalogByCode,
      rawMotherCoils: safeMother,
      rawChildCoils: safeChild,
    };
  }, [motherCoils, childCoils, productionLogs, shippingLogs, motherCatalog]);
};

export { safeNum, normalizeCode };
