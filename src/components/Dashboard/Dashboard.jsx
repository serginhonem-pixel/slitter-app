import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStockData } from '../../hooks/useStockData';
import { useOperationalStatus } from '../../hooks/useOperationalStatus';
import { StockSummary } from './StockSummary';
import { StockTabs } from './StockTabs';
import { EVENT_TYPES } from '../../utils/constants';

const Dashboard = ({
  motherCoils,
  childCoils,
  productionLogs,
  shippingLogs,
  cuttingLogs,
  motherCatalog,
  productCatalog,
  getUnitWeight,
  exportToExcelXml,
  exportToCSV,
  onViewStockDetails,
  onViewProductHistory,
  onPrintProduct,
  eventLogs = [],
  eventLogsLoading = false,
  onViewEventDetails,
}) => {
  const [snapshotDate, setSnapshotDate] = useState('');

  const parseLogDate = (rawValue) => {
    if (!rawValue) return null;
    if (rawValue instanceof Date) return rawValue;
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      const parsed = new Date(rawValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof rawValue === 'string') {
      const normalized = rawValue.replace(',', '').trim();
      const ddmmyy =
        normalized.match(
          /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/,
        ) || normalized.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (ddmmyy) {
        const [, p1, p2, p3, hh = '00', mm = '00', ss = '00'] = ddmmyy;
        const [year, month, day] =
          normalized.includes('/') && !normalized.startsWith(p3)
            ? [p3, p2, p1]
            : [p1, p2, p3];
        const iso = `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
        const parsed = new Date(iso);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const formatSnapshotLabel = (isoDate) => {
    if (!isoDate || !isoDate.includes('-')) return '';
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  const snapshotData = useMemo(() => {
    const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
    const safeChild = Array.isArray(childCoils) ? childCoils : [];
    const safeProd = Array.isArray(productionLogs) ? productionLogs : [];
    const safeShip = Array.isArray(shippingLogs) ? shippingLogs : [];
    const safeCut = Array.isArray(cuttingLogs) ? cuttingLogs : [];
    const safeEvents = Array.isArray(eventLogs) ? eventLogs : [];

    if (!snapshotDate) {
      return {
        motherCoils: safeMother,
        childCoils: safeChild,
        productionLogs: safeProd,
        shippingLogs: safeShip,
        cuttingLogs: safeCut,
        eventLogs: safeEvents,
        snapshotActive: false,
        snapshotLabel: '',
      };
    }

    const snapshotEnd = new Date(`${snapshotDate}T23:59:59.999`);
    const snapshotMs = snapshotEnd.getTime();
    if (!Number.isFinite(snapshotMs)) {
      return {
        motherCoils: safeMother,
        childCoils: safeChild,
        productionLogs: safeProd,
        shippingLogs: safeShip,
        cuttingLogs: safeCut,
        eventLogs: safeEvents,
        snapshotActive: false,
        snapshotLabel: '',
      };
    }

    const toMs = (value) => parseLogDate(value)?.getTime() ?? null;
    const isBeforeSnapshot = (value) => {
      const time = toMs(value);
      return time !== null && time <= snapshotMs;
    };

    const motherLastCutByRef = safeCut.reduce((acc, cut) => {
      const cutMs = toMs(cut?.timestamp || cut?.date);
      if (cutMs === null) return acc;
      const keys = [cut?.motherId, cut?.motherCode]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      keys.forEach((key) => {
        const current = acc[key];
        if (!current || cutMs > current) acc[key] = cutMs;
      });
      return acc;
    }, {});

    const childFirstProdById = safeProd.reduce((acc, prod) => {
      const prodMs = toMs(prod?.timestamp || prod?.date);
      if (prodMs === null) return acc;
      const ids = Array.isArray(prod?.childIds) ? prod.childIds : [];
      ids.forEach((childId) => {
        const key = String(childId || '').trim();
        if (!key) return;
        const current = acc[key];
        if (!current || prodMs < current) acc[key] = prodMs;
      });
      return acc;
    }, {});

    const motherSnapshot = safeMother
      .map((coil) => {
        const createdMs = toMs(coil?.entryDate || coil?.date || coil?.createdAt);
        if (createdMs !== null && createdMs > snapshotMs) return null;

        let status = coil?.status === 'stock' ? 'stock' : 'consumed';
        if (status !== 'stock') {
          const consumedMs =
            toMs(coil?.consumedDate) ??
            motherLastCutByRef[String(coil?.id || '').trim()] ??
            motherLastCutByRef[String(coil?.code || '').trim()] ??
            null;
          if (consumedMs === null || consumedMs > snapshotMs) {
            status = 'stock';
          }
        }

        let remainingWeight = Number(coil?.remainingWeight);
        if (status === 'stock' && (!Number.isFinite(remainingWeight) || remainingWeight <= 0)) {
          const fallbackWeight = Number(coil?.originalWeight ?? coil?.weight ?? 0);
          remainingWeight = Number.isFinite(fallbackWeight) ? fallbackWeight : 0;
        }

        return {
          ...coil,
          status,
          remainingWeight,
        };
      })
      .filter(Boolean);

    const childSnapshot = safeChild
      .map((coil) => {
        const createdMs = toMs(coil?.createdAt || coil?.entryDate || coil?.date);
        if (createdMs !== null && createdMs > snapshotMs) return null;

        let status = coil?.status === 'stock' ? 'stock' : 'consumed';
        if (status !== 'stock') {
          const consumedMs =
            toMs(coil?.consumedDate) ??
            childFirstProdById[String(coil?.id || '').trim()] ??
            null;
          if (consumedMs === null || consumedMs > snapshotMs) {
            status = 'stock';
          }
        }

        let weight = Number(coil?.weight);
        if (status === 'stock' && (!Number.isFinite(weight) || weight <= 0)) {
          const fallbackWeight = Number(coil?.initialWeight ?? coil?.originalWeight ?? 0);
          weight = Number.isFinite(fallbackWeight) ? fallbackWeight : 0;
        }

        return {
          ...coil,
          status,
          weight,
        };
      })
      .filter(Boolean);

    return {
      motherCoils: motherSnapshot,
      childCoils: childSnapshot,
      productionLogs: safeProd.filter((log) => isBeforeSnapshot(log?.timestamp || log?.date)),
      shippingLogs: safeShip.filter((log) => isBeforeSnapshot(log?.timestamp || log?.date)),
      cuttingLogs: safeCut.filter((log) => isBeforeSnapshot(log?.timestamp || log?.date)),
      eventLogs: safeEvents.filter((event) => isBeforeSnapshot(event?.timestamp || event?.date || event?.createdAt)),
      snapshotActive: true,
      snapshotLabel: formatSnapshotLabel(snapshotDate),
    };
  }, [
    childCoils,
    cuttingLogs,
    eventLogs,
    motherCoils,
    productionLogs,
    shippingLogs,
    snapshotDate,
  ]);

  const sourceMotherCoils = snapshotData.motherCoils;
  const sourceChildCoils = snapshotData.childCoils;
  const sourceProductionLogs = snapshotData.productionLogs;
  const sourceShippingLogs = snapshotData.shippingLogs;
  const sourceCuttingLogs = snapshotData.cuttingLogs;
  const sourceEventLogs = snapshotData.eventLogs;

  const {
    motherStockList,
    childStockList,
    finishedStockList,
    totals,
    catalogByCode,
    rawMotherCoils,
    rawChildCoils,
  } = useStockData({
    motherCoils: sourceMotherCoils,
    childCoils: sourceChildCoils,
    productionLogs: sourceProductionLogs,
    shippingLogs: sourceShippingLogs,
    motherCatalog,
    productCatalog,
  });

  const [statusParams, setStatusParams] = useState({
    thresholdDiasSemGiro: 30,
    thresholdDiasFIFO: 15,
    demandWindowDias: 30,
    minWeightDefault: 3000,
    minCountDefault: 1,
  });

  const { motherStatusByCode, childStatusByCode, finishedStatusByCode } =
    useOperationalStatus({
      motherStockList,
      childStockList,
      finishedStockList,
      rawMotherCoils,
      rawChildCoils,
      productionLogs: sourceProductionLogs,
      shippingLogs: sourceShippingLogs,
      cuttingLogs: sourceCuttingLogs,
      params: statusParams,
    });

  const normalizeThicknessForExport = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const cleaned = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    let parsed = parseFloat(cleaned);
    if (!Number.isFinite(parsed)) return null;
    while (parsed > 5 && parsed > 0.05) parsed /= 10;
    return Number(parsed.toFixed(3));
  };

  const getCatalogThickness = (code) => {
    const entry = catalogByCode?.[String(code)] || catalogByCode?.[Number(code)];
    return entry?.thickness ?? null;
  };

  const formatThicknessDisplay = (value) => {
    const normalized = normalizeThicknessForExport(value);
    if (normalized === null) return '-';
    return normalized.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getCatalogDescription = (code, fallback) => {
    const entry = catalogByCode?.[String(code)] || catalogByCode?.[Number(code)];
    return entry?.description || fallback;
  };

  const getCatalogType = (code, fallback) => {
    const entry = catalogByCode?.[String(code)] || catalogByCode?.[Number(code)];
    return entry?.type || fallback || '-';
  };

  const b2CatalogByCode = useMemo(() => {
    return (Array.isArray(productCatalog) ? productCatalog : []).reduce((acc, item) => {
      if (item?.b2Code) acc[String(item.b2Code)] = item;
      return acc;
    }, {});
  }, [productCatalog]);

  const getB2CatalogEntry = (code) =>
    b2CatalogByCode?.[String(code)] || b2CatalogByCode?.[Number(code)];

  const getB2Description = (code, fallback) => {
    const entry = getB2CatalogEntry(code);
    return entry?.b2Name || entry?.name || fallback;
  };

  const getB2Thickness = (code, fallback) => {
    const entry = getB2CatalogEntry(code);
    return entry?.thickness ?? fallback;
  };

  const getB2Type = (code, fallback) => {
    const entry = getB2CatalogEntry(code);
    return entry?.type || fallback || '-';
  };

  const getProductWeight = (code, count) => {
    if (!getUnitWeight) return 0;
    const unit = Number(getUnitWeight(code)) || 0;
    return Number((unit * (count || 0)).toFixed(2));
  };

  const normalizeTimestamp = (timestamp, date) => {
    return (parseLogDate(timestamp || date) || new Date()).toISOString();
  };

  const shipmentRows = useMemo(() => {
    const safeShipments = Array.isArray(sourceShippingLogs) ? sourceShippingLogs : [];
    return safeShipments
      .map((log) => {
        const quantity = Number(log.quantity) || 0;
        const unitWeight = Number(getUnitWeight?.(log.productCode)) || 0;
        const totalWeight = unitWeight
          ? Number((unitWeight * quantity).toFixed(2))
          : Number(log.weight || 0);
        const normalizedTimestamp = normalizeTimestamp(log.timestamp, log.date);
        return {
          id: log.id,
          code: log.productCode || '-',
          name: log.productName || 'Produto não identificado',
          quantity,
          weight: totalWeight,
          unitWeight: unitWeight || null,
          destination: log.destination || '-',
          date:
            log.date ||
            (normalizedTimestamp && new Date(normalizedTimestamp).toLocaleDateString('pt-BR')),
          timestamp: normalizedTimestamp,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp || b.date || 0).getTime() -
          new Date(a.timestamp || a.date || 0).getTime(),
      );
  }, [sourceShippingLogs, getUnitWeight]);

  const nfRecords = useMemo(() => {
    const safeMother = Array.isArray(sourceMotherCoils) ? sourceMotherCoils : [];
    const safeChild = Array.isArray(sourceChildCoils) ? sourceChildCoils : [];

    const formatDate = (value) => {
      if (!value) return '-';
      return parseLogDate(value).toLocaleDateString('pt-BR');
    };

    const toTime = (value) => (value ? parseLogDate(value).getTime() : 0);

    const motherRecords = safeMother
      .filter((coil) => coil?.nf)
      .map((coil, index) => {
        const weight = Number(coil.remainingWeight ?? coil.weight ?? 0);
        const rawDate = coil.entryDate || coil.date;
        return {
          id: coil.id || `mp-${coil.code}-${index}`,
          nf: String(coil.nf),
          code: coil.code || '-',
          description: getCatalogDescription(coil.code, coil.material) || '-',
          weight: Number.isFinite(weight) ? weight : null,
          date: formatDate(rawDate),
          sortTime: toTime(rawDate),
          context: 'mother',
          contextLabel: 'MP',
          typeLabel: getCatalogType(coil.code, coil.type),
        };
      });

    const childRecords = safeChild
      .filter((coil) => coil?.nf)
      .map((coil, index) => {
        const weight = Number(coil.weight ?? 0);
        const rawDate = coil.entryDate || coil.date;
        return {
          id: coil.id || `b2-${coil.b2Code || coil.code}-${index}`,
          nf: String(coil.nf),
          code: coil.b2Code || coil.code || '-',
          description: getB2Description(coil.b2Code, coil.b2Name || coil.name) || '-',
          weight: Number.isFinite(weight) ? weight : null,
          date: formatDate(rawDate),
          sortTime: toTime(rawDate),
          context: 'b2',
          contextLabel: 'B2',
          typeLabel: getB2Type(coil.b2Code, coil.type),
        };
      });

    return [...motherRecords, ...childRecords].sort((a, b) => b.sortTime - a.sortTime);
  }, [sourceMotherCoils, sourceChildCoils, catalogByCode, b2CatalogByCode]);

  const fallbackEvents = useMemo(() => {
    return [
      ...sourceCuttingLogs.map((log) => ({
        id: `cut-${log.id}`,
        eventType: EVENT_TYPES.B2_CUT,
        timestamp: normalizeTimestamp(log.timestamp, log.date),
        sourceId: log.motherId || log.motherCode || log.id,
        details: {
          motherCode: log.motherCode,
          newChildCount: log.outputCount,
          scrap: log.scrap,
          totalWeight: log.inputWeight,
          generatedItems: log.generatedItems,
        },
        raw: log,
      })),
      ...sourceProductionLogs.map((log) => ({
        id: `prod-${log.id}`,
        eventType: EVENT_TYPES.PA_PRODUCTION,
        timestamp: normalizeTimestamp(log.timestamp, log.date),
        sourceId: log.productCode || log.id,
        targetIds: [log.id],
        details: {
          productCode: log.productCode,
          productName: log.productName,
          pieces: log.pieces,
          packIndex: log.packIndex,
        },
        raw: log,
      })),
      ...sourceShippingLogs.map((log) => ({
        id: `ship-${log.id}`,
        eventType: EVENT_TYPES.PA_SHIPPING,
        timestamp: normalizeTimestamp(log.timestamp, log.date),
        sourceId: log.productCode || log.id,
        details: {
          productCode: log.productCode,
          productName: log.productName,
          quantity: log.quantity,
          destination: log.destination,
        },
        raw: log,
      })),
    ];
  }, [sourceCuttingLogs, sourceProductionLogs, sourceShippingLogs]);

  const derivedEventLogs = useMemo(() => {
    const ensureString = (value) => {
      if (value === undefined || value === null) return undefined;
      return String(value);
    };

    const enrichEvent = (event = {}) => {
      const baseDetails = { ...(event.details || {}) };
      let referenceId =
        event.referenceId ||
        baseDetails.code ||
        baseDetails.productCode ||
        baseDetails.motherCode ||
        baseDetails.b2Code ||
        event.sourceId;

      const withId = (value) => ensureString(value) || undefined;

      const matchMother = (codeOrId) =>
        sourceMotherCoils.find(
          (coil) =>
            withId(coil.id) === withId(codeOrId) || withId(coil.code) === withId(codeOrId),
        );

      const matchChild = (codeOrId) =>
        sourceChildCoils.find(
          (coil) =>
            withId(coil.id) === withId(codeOrId) ||
            withId(coil.b2Code) === withId(codeOrId) ||
            withId(coil.code) === withId(codeOrId),
        );

      const matchProduction = (idOrProduct) =>
        sourceProductionLogs.find(
          (log) =>
            withId(log.id) === withId(idOrProduct) ||
            withId(log.productCode) === withId(idOrProduct) ||
            (Array.isArray(log.childIds) && log.childIds.includes(withId(idOrProduct))),
        );

      const matchShipping = (idOrProduct) =>
        sourceShippingLogs.find(
          (log) =>
            withId(log.id) === withId(idOrProduct) || withId(log.productCode) === withId(idOrProduct),
        );

      switch (event.eventType) {
        case EVENT_TYPES.MP_ENTRY: {
          const target = matchMother(baseDetails.code || event.sourceId);
          if (target) {
            baseDetails.code = target.code;
            baseDetails.weight = baseDetails.weight ?? target.weight ?? target.remainingWeight;
            baseDetails.nf = baseDetails.nf ?? target.nf;
            baseDetails.material = baseDetails.material ?? target.material;
            referenceId = target.code || referenceId;
          }
          break;
        }
        case EVENT_TYPES.B2_ENTRY_NF: {
          const target = matchChild(baseDetails.b2Code || event.sourceId);
          if (target) {
            baseDetails.b2Code = target.b2Code || target.code;
            baseDetails.weight = baseDetails.weight ?? target.weight;
            baseDetails.nf = baseDetails.nf ?? target.nf;
            referenceId = target.b2Code || target.id || referenceId;
          }
          break;
        }
        case EVENT_TYPES.B2_CUT: {
          const target = matchMother(baseDetails.motherCode || event.sourceId);
          const log =
            sourceCuttingLogs.find((cLog) => withId(cLog.id) === withId(event.targetIds?.[0])) ||
            sourceCuttingLogs.find((cLog) => withId(cLog.motherCode) === withId(target?.code));

          if (target) {
            baseDetails.motherCode = target.code;
            referenceId = target.code || referenceId;
          }
          if (log) {
            baseDetails.newChildCount = baseDetails.newChildCount ?? log.outputCount;
            baseDetails.scrap = baseDetails.scrap ?? log.scrap;
            baseDetails.totalWeight = baseDetails.totalWeight ?? log.inputWeight;
            baseDetails.generatedItems = baseDetails.generatedItems ?? log.generatedItems;
          }
          break;
        }
        case EVENT_TYPES.PA_PRODUCTION: {
          const prod =
            matchProduction(event.targetIds?.[0]) ||
            matchProduction(event.sourceId) ||
            matchProduction(baseDetails.productCode);
          if (prod) {
            baseDetails.productCode = prod.productCode;
            baseDetails.productName = prod.productName;
            baseDetails.pieces = baseDetails.pieces ?? prod.pieces;
            baseDetails.packIndex = baseDetails.packIndex ?? prod.packIndex;
            referenceId = prod.productCode || prod.id || referenceId;
          }
          break;
        }
        case EVENT_TYPES.PA_SHIPPING: {
          const ship =
            matchShipping(event.targetIds?.[0]) ||
            matchShipping(event.sourceId) ||
            matchShipping(baseDetails.productCode);
          if (ship) {
            baseDetails.productCode = ship.productCode;
            baseDetails.productName = ship.productName;
            baseDetails.quantity = baseDetails.quantity ?? ship.quantity;
            baseDetails.destination = baseDetails.destination ?? ship.destination;
            referenceId = ship.productCode || ship.id || referenceId;
          }
          break;
        }
        default:
          break;
      }

      return {
        ...event,
        details: baseDetails,
        referenceId: referenceId || '-',
      };
    };

    const baseEvents = sourceEventLogs && sourceEventLogs.length > 0 ? sourceEventLogs : fallbackEvents;

    return baseEvents
      .map((event, index) =>
        enrichEvent({
          id: event.id || `event-${index}`,
          ...event,
          timestamp: event.timestamp || event.createdAt || event.date || new Date().toISOString(),
        }),
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp || b.createdAt || 0).getTime() -
          new Date(a.timestamp || a.createdAt || 0).getTime(),
      )
      .slice(0, 25);
  }, [
    sourceChildCoils,
    sourceCuttingLogs,
    sourceEventLogs,
    fallbackEvents,
    sourceMotherCoils,
    sourceProductionLogs,
    sourceShippingLogs,
  ]);

  const exportMother = () => {
    const stockRows = sourceMotherCoils.filter((coil) => coil.status === 'stock');

    const summaryMap = new Map();
    stockRows.forEach((coil) => {
      const code = String(coil.code || '');
      const type = getCatalogType(code, coil.type);
      const thicknessRaw = getCatalogThickness(code) ?? coil.thickness;
      const thicknessValue = normalizeThicknessForExport(thicknessRaw);
      const thicknessLabel = formatThicknessDisplay(thicknessRaw);
      const key = `${type}|${thicknessValue ?? thicknessLabel}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          Tipo: type || '-',
          'Espessura (mm)': thicknessLabel,
          'Peso (kg)': 0,
          'Qtd Bobinas': 0,
          _sortType: type || '',
          _sortThickness: thicknessValue ?? Number.MAX_SAFE_INTEGER,
        });
      }

      const entry = summaryMap.get(key);
      const weight = Number(coil.remainingWeight ?? coil.weight ?? 0);
      entry['Peso (kg)'] += weight;
      entry['Qtd Bobinas'] += 1;
    });

    const summaryRows = Array.from(summaryMap.values())
      .sort((a, b) => {
        const typeSort = String(a._sortType).localeCompare(String(b._sortType));
        if (typeSort !== 0) return typeSort;
        return (a._sortThickness || 0) - (b._sortThickness || 0);
      })
      .map((row) => ({
        Tipo: row.Tipo,
        'Espessura (mm)': row['Espessura (mm)'],
        'Peso (kg)': Number(row['Peso (kg)'].toFixed(1)),
        'Qtd Bobinas': row['Qtd Bobinas'],
      }));

    const dataToExport = stockRows.map((coil) => ({
        ID: coil.id,
        Codigo: coil.code,
        Material: getCatalogDescription(coil.code, coil.material),
        'Espessura (mm)':
          normalizeThicknessForExport(getCatalogThickness(coil.code) ?? coil.thickness) ??
          getCatalogThickness(coil.code) ??
          coil.thickness,
        Largura: coil.width,
        Peso_Restante: coil.remainingWeight,
        NF: coil.nf,
        Data_Entrada: coil.entryDate,
      }));
    exportToExcelXml(
      [
        { name: 'Estoque MP', rows: dataToExport },
        { name: 'Resumo Tipo/Esp', rows: summaryRows },
      ],
      'Estoque_Bobinas_Mae',
    );
  };

  const exportMotherPdf = () => {
    const stockRows = sourceMotherCoils.filter((coil) => coil.status === 'stock');
    if (!stockRows.length) {
      alert('Nenhuma bobina em estoque.');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Conferencia de Saldos - Bobinas Mae (Estoque)', 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

    const groupedMap = new Map();
    stockRows.forEach((coil) => {
      const code = String(coil.code || 'S/ COD');
      const key = code;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          code,
          description: getCatalogDescription(code, coil.material),
          qty: 0,
          weight: 0,
        });
      }
      const entry = groupedMap.get(key);
      const weight = Number(coil.remainingWeight ?? coil.weight ?? 0);
      entry.qty += 1;
      entry.weight += weight;
    });

    const groupedRows = Array.from(groupedMap.values()).sort((a, b) =>
      String(a.code).localeCompare(String(b.code)),
    );

    autoTable(doc, {
      startY: 26,
      head: [['Codigo', 'Descricao', 'Qtd', 'Peso (kg)']],
      body: groupedRows.map((row) => [
        row.code,
        row.description || '-',
        String(row.qty),
        row.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    });

    const summaryMap = new Map();
    stockRows.forEach((coil) => {
      const code = String(coil.code || '');
      const type = getCatalogType(code, coil.type);
      const thicknessRaw = getCatalogThickness(code) ?? coil.thickness;
      const thicknessValue = normalizeThicknessForExport(thicknessRaw);
      const thicknessLabel = formatThicknessDisplay(thicknessRaw);
      const key = `${type}|${thicknessValue ?? thicknessLabel}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          type: type || '-',
          thicknessLabel,
          thicknessValue: thicknessValue ?? Number.MAX_SAFE_INTEGER,
          qty: 0,
          weight: 0,
        });
      }

      const entry = summaryMap.get(key);
      entry.qty += 1;
      entry.weight += Number(coil.remainingWeight ?? coil.weight ?? 0);
    });

    const summaryRows = Array.from(summaryMap.values()).sort((a, b) => {
      const typeSort = String(a.type).localeCompare(String(b.type));
      if (typeSort !== 0) return typeSort;
      return (a.thicknessValue || 0) - (b.thicknessValue || 0);
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text('Resumo por Tipo e Espessura', 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

    autoTable(doc, {
      startY: 26,
      head: [['Tipo', 'Espessura (mm)', 'Qtd Bobinas', 'Peso (kg)']],
      body: summaryRows.map((row) => [
        row.type,
        row.thicknessLabel || '-',
        String(row.qty),
        row.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    });

    doc.addPage();
    const detailsStart = 16;
    doc.setFontSize(11);
    doc.text('Detalhado (ordem por codigo)', 14, detailsStart);

    const detailedRows = stockRows
      .slice()
      .sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .map((coil) => {
        const catalogThickness = getCatalogThickness(coil.code);
        const thicknessDisplay = formatThicknessDisplay(
          catalogThickness ?? coil.thickness,
        );
        return [
          coil.id || '-',
          coil.code || '-',
          getCatalogDescription(coil.code, coil.material) || '-',
          Number(coil.remainingWeight ?? coil.weight ?? 0).toLocaleString('pt-BR', {
            maximumFractionDigits: 1,
          }),
          String(coil.width ?? '-'),
          thicknessDisplay,
          coil.nf || '-',
          coil.entryDate || coil.date || '-',
        ];
      });

    const detailedRowsNoId = detailedRows.map((row) => row.slice(1));

    autoTable(doc, {
      startY: detailsStart + 4,
      head: [['Codigo', 'Descricao', 'Peso (kg)', 'Largura', 'Espessura', 'NF', 'Data']],
      body: detailedRowsNoId,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    });

    doc.save('saldos_bobinas_mae.pdf');
  };

  const exportChild = () => {
    const stockRows = sourceChildCoils.filter((coil) => coil.status === 'stock');
    const summaryMap = new Map();

    stockRows.forEach((coil) => {
      const type = getB2Type(coil.b2Code, coil.type);
      const thicknessRaw = getB2Thickness(coil.b2Code, coil.thickness);
      const thicknessValue = normalizeThicknessForExport(thicknessRaw);
      const thicknessLabel = formatThicknessDisplay(thicknessRaw);
      const key = `${type}|${thicknessValue ?? thicknessLabel}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          Tipo: type || '-',
          'Espessura (mm)': thicknessLabel,
          'Peso (kg)': 0,
          'Qtd Bobinas': 0,
          _sortType: type || '',
          _sortThickness: thicknessValue ?? Number.MAX_SAFE_INTEGER,
        });
      }

      const entry = summaryMap.get(key);
      entry['Peso (kg)'] += Number(coil.weight || 0);
      entry['Qtd Bobinas'] += 1;
    });

    const summaryRows = Array.from(summaryMap.values())
      .sort((a, b) => {
        const typeSort = String(a._sortType).localeCompare(String(b._sortType));
        if (typeSort !== 0) return typeSort;
        return (a._sortThickness || 0) - (b._sortThickness || 0);
      })
      .map((row) => ({
        Tipo: row.Tipo,
        'Espessura (mm)': row['Espessura (mm)'],
        'Peso (kg)': Number(row['Peso (kg)'].toFixed(1)),
        'Qtd Bobinas': row['Qtd Bobinas'],
      }));

    const dataToExport = stockRows.map((coil) => ({
        ID: coil.id,
        Codigo_B2: coil.b2Code,
        Nome_B2: getB2Description(coil.b2Code, coil.b2Name),
        Tipo: getB2Type(coil.b2Code, coil.type),
        Largura: coil.width,
        'Espessura (mm)':
          normalizeThicknessForExport(getB2Thickness(coil.b2Code, coil.thickness)) ??
          getB2Thickness(coil.b2Code, coil.thickness) ??
          coil.thickness,
        Peso: coil.weight,
        Bobina_Mae_ID: coil.motherId,
        Bobina_Mae_Codigo: coil.motherCode,
      }));
    exportToExcelXml(
      [
        { name: 'Estoque B2', rows: dataToExport },
        { name: 'Resumo Tipo/Esp', rows: summaryRows },
      ],
      'Estoque_Bobinas_B2',
    );
  };

  const exportFinished = () => {
    const dataToExport = finishedStockList.map((item) => ({
      Codigo_PA: item.code,
      Nome_PA: item.name,
      Pecas_Estoque: item.count,
      'Peso_Total (kg)': getProductWeight(item.code, item.count),
    }));
    exportToCSV(dataToExport, 'Estoque_Produto_Acabado');
  };

  const exportShipments = () => {
    const dataToExport = (Array.isArray(sourceShippingLogs) ? sourceShippingLogs : []).map((log) => ({
      ID: log.id,
      Codigo_PA: log.productCode,
      Nome_PA: log.productName,
      Quantidade: log.quantity,
      Destino: log.destination,
      Data: log.date || (log.timestamp && new Date(log.timestamp).toLocaleDateString('pt-BR')),
      'Peso_Total (kg)': getProductWeight(log.productCode, log.quantity),
    }));
    exportToCSV(dataToExport, 'Registro_Expedicoes');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Fotografia de Estoque
          </p>
          <p className="text-xs text-gray-500">
            Selecione uma data para visualizar o saldo daquele dia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setSnapshotDate('')}
            className="text-xs px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
          >
            Atual
          </button>
          {snapshotData.snapshotActive && (
            <span className="text-xs text-cyan-300 font-semibold">
              {snapshotData.snapshotLabel}
            </span>
          )}
        </div>
      </div>

      <StockSummary totals={totals} />

      <StockTabs
        motherData={motherStockList}
        childData={childStockList}
        finishedData={finishedStockList}
        shipments={shipmentRows}
        nfRecords={nfRecords}
        onExportMother={exportMother}
        onExportMotherPdf={exportMotherPdf}
        onExportChild={exportChild}
        onExportFinished={exportFinished}
        onExportShipments={exportShipments}
        onViewStockDetails={onViewStockDetails}
        onViewProductHistory={onViewProductHistory}
        onPrintProduct={onPrintProduct}
        getUnitWeight={getUnitWeight}
        calcProductWeight={getProductWeight}
        eventLogs={derivedEventLogs}
        eventLogsLoading={eventLogsLoading}
        onViewEventDetails={onViewEventDetails}
        productionLogs={sourceProductionLogs}
        statusByMotherCode={motherStatusByCode}
        statusByChildCode={childStatusByCode}
        statusByFinishedCode={finishedStatusByCode}
      />

      <details className="bg-slate-900/30 border border-white/5 rounded-2xl px-4 py-3 text-xs text-gray-400">
        <summary className="cursor-pointer select-none font-semibold text-gray-300">
          Configurações do Status Operacional
        </summary>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs mt-3">
          <label className="flex flex-col gap-1 text-gray-400">
            Sem giro (dias)
            <input
              type="number"
              min="1"
              value={statusParams.thresholdDiasSemGiro}
              onChange={(e) =>
                setStatusParams((prev) => ({
                  ...prev,
                  thresholdDiasSemGiro: Number(e.target.value) || 0,
                }))
              }
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-gray-400">
            Janela demanda (dias)
            <input
              type="number"
              min="1"
              value={statusParams.demandWindowDias}
              onChange={(e) =>
                setStatusParams((prev) => ({
                  ...prev,
                  demandWindowDias: Number(e.target.value) || 0,
                }))
              }
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-gray-400">
            FIFO (dias)
            <input
              type="number"
              min="1"
              value={statusParams.thresholdDiasFIFO}
              onChange={(e) =>
                setStatusParams((prev) => ({
                  ...prev,
                  thresholdDiasFIFO: Number(e.target.value) || 0,
                }))
              }
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-gray-400">
            Min kg
            <input
              type="number"
              min="0"
              value={statusParams.minWeightDefault}
              onChange={(e) =>
                setStatusParams((prev) => ({
                  ...prev,
                  minWeightDefault: Number(e.target.value) || 0,
                }))
              }
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-gray-400">
            Min pcs
            <input
              type="number"
              min="0"
              value={statusParams.minCountDefault}
              onChange={(e) =>
                setStatusParams((prev) => ({
                  ...prev,
                  minCountDefault: Number(e.target.value) || 0,
                }))
              }
              className="bg-gray-900 text-white border border-gray-700 rounded px-2 py-1"
            />
          </label>
        </div>
      </details>
    </div>
  );
};

export default Dashboard;
