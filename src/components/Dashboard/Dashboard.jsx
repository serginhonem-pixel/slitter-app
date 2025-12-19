import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStockData } from '../../hooks/useStockData';
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
  const {
    motherStockList,
    childStockList,
    finishedStockList,
    totals,
    catalogByCode,
  } = useStockData({
    motherCoils,
    childCoils,
    productionLogs,
    shippingLogs,
    motherCatalog,
    productCatalog,
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

  const getProductWeight = (code, count) => {
    if (!getUnitWeight) return 0;
    const unit = Number(getUnitWeight(code)) || 0;
    return Number((unit * (count || 0)).toFixed(2));
  };

  const parseLogDate = (rawValue) => {
    if (!rawValue) return new Date();
    if (rawValue instanceof Date) return rawValue;
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return new Date(rawValue);
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
    return new Date();
  };

  const normalizeTimestamp = (timestamp, date) => {
    return parseLogDate(timestamp || date).toISOString();
  };

  const shipmentRows = useMemo(() => {
    const safeShipments = Array.isArray(shippingLogs) ? shippingLogs : [];
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
  }, [shippingLogs, getUnitWeight]);

  const fallbackEvents = useMemo(() => {
    return [
      ...cuttingLogs.map((log) => ({
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
      ...productionLogs.map((log) => ({
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
      ...shippingLogs.map((log) => ({
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
  }, [cuttingLogs, productionLogs, shippingLogs]);

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
        motherCoils.find(
          (coil) =>
            withId(coil.id) === withId(codeOrId) || withId(coil.code) === withId(codeOrId),
        );

      const matchChild = (codeOrId) =>
        childCoils.find(
          (coil) =>
            withId(coil.id) === withId(codeOrId) ||
            withId(coil.b2Code) === withId(codeOrId) ||
            withId(coil.code) === withId(codeOrId),
        );

      const matchProduction = (idOrProduct) =>
        productionLogs.find(
          (log) =>
            withId(log.id) === withId(idOrProduct) ||
            withId(log.productCode) === withId(idOrProduct) ||
            (Array.isArray(log.childIds) && log.childIds.includes(withId(idOrProduct))),
        );

      const matchShipping = (idOrProduct) =>
        shippingLogs.find(
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
            cuttingLogs.find((cLog) => withId(cLog.id) === withId(event.targetIds?.[0])) ||
            cuttingLogs.find((cLog) => withId(cLog.motherCode) === withId(target?.code));

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

    const baseEvents = eventLogs && eventLogs.length > 0 ? eventLogs : fallbackEvents;

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
    childCoils,
    cuttingLogs,
    eventLogs,
    fallbackEvents,
    motherCoils,
    productionLogs,
    shippingLogs,
  ]);

  const exportMother = () => {
    const dataToExport = motherCoils
      .filter((coil) => coil.status === 'stock')
      .map((coil) => ({
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
    exportToExcelXml([{ name: 'Estoque MP', rows: dataToExport }], 'Estoque_Bobinas_Mae');
  };

  const exportMotherPdf = () => {
    const stockRows = motherCoils.filter((coil) => coil.status === 'stock');
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

    const detailsStart = (doc.lastAutoTable?.finalY || 26) + 8;
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
    const dataToExport = childCoils
      .filter((coil) => coil.status === 'stock')
      .map((coil) => ({
        ID: coil.id,
        Codigo_B2: coil.b2Code,
        Nome_B2: getCatalogDescription(coil.motherCode, coil.b2Name),
        Largura: coil.width,
        'Espessura (mm)':
          normalizeThicknessForExport(getCatalogThickness(coil.motherCode) ?? coil.thickness) ??
          getCatalogThickness(coil.motherCode) ??
          coil.thickness,
        Peso: coil.weight,
        Bobina_Mae_ID: coil.motherId,
        Bobina_Mae_Codigo: coil.motherCode,
      }));
    exportToExcelXml([{ name: 'Estoque B2', rows: dataToExport }], 'Estoque_Bobinas_B2');
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
    const dataToExport = (Array.isArray(shippingLogs) ? shippingLogs : []).map((log) => ({
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
      <StockSummary totals={totals} />

      <StockTabs
        motherData={motherStockList}
        childData={childStockList}
        finishedData={finishedStockList}
        shipments={shipmentRows}
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
        productionLogs={productionLogs}
      />
    </div>
  );
};

export default Dashboard;
