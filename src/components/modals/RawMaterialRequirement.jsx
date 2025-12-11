import React, { useMemo, useState } from "react";
import { TrendingUp, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INITIAL_INOX_BLANK_PRODUCTS } from "../../data/inoxCatalog";

// ajusta o caminho se sua pasta for diferente


const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helpers simples
const formatKg = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const formatMoney = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatPieces = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR");

const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("pt-BR");
};

// Converte entrada de input (aceitando vÇülido, vazio ou com vÇürgula) em nÇ§mero seguro
const parseNumberInput = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const RawMaterialRequirement = ({
  motherCoils = [],
  childCoils = [],
  productCatalog = [],
  motherCatalog = [],
  // novos, mas opcionais (não precisa passar no App ainda)
  inoxProducts = [],
  inoxDemandRows = [],
  inoxStockPositions = [],
}) => {
  // ---------- ESTADOS GERAIS ----------
  const [activeTab, setActiveTab] = useState("coil"); // "coil" | "inox"

  // ---------- ESTADOS ABA BOBINAS ----------
  const [mpNeedSearch, setMpNeedSearch] = useState("");
  const [mpFilterThickness, setMpFilterThickness] = useState("all");
  const [mpFilterType, setMpFilterType] = useState("all");
  const [selectedMpCode, setSelectedMpCode] = useState(null);

  const [mpLeadTime, setMpLeadTime] = useState(30);
  const [mpTargetDays, setMpTargetDays] = useState(90);
  const [mpSimulatedPrice, setMpSimulatedPrice] = useState(10);
  const [mpMinStock, setMpMinStock] = useState(5000);

  // Modo MANUAL
  const [mpManualInitialStock, setMpManualInitialStock] = useState("");
  const [mpManualStartDate, setMpManualStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [mpManualEndDate, setMpManualEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  });
  const [mpManualDemandValue, setMpManualDemandValue] = useState(10000);
  const [mpManualDemandGranularity, setMpManualDemandGranularity] =
    useState("week");

  // Pedidos futuros (bobinas)
  const [mpIncomingOrders, setMpIncomingOrders] = useState([]);
  const [mpOrderQty, setMpOrderQty] = useState("");
  const [mpOrderDate, setMpOrderDate] = useState("");

  // ---------- ESTADOS ABA INOX ----------
  const [inoxSearch, setInoxSearch] = useState("");
  const [selectedInoxProductId, setSelectedInoxProductId] = useState(null);
  const [inoxRows, setInoxRows] = useState(() =>
    INITIAL_INOX_BLANK_PRODUCTS.map((p) => ({
      productId: p.id,
      productCode: p.id,
      description: p.name,
      inoxGrade: p.inoxGrade,
      unitWeightKg: Number(p.weight) || 0,
      demandUnits: "",
      finishedStockUnits: "",
      blanksStockUnits: "",
    }))
  );
  const [inoxLeadTime, setInoxLeadTime] = useState(30);
  const [inoxTargetDays, setInoxTargetDays] = useState(90);
  const [inoxSimulatedPrice, setInoxSimulatedPrice] = useState(10);
  const [inoxMinStockKg, setInoxMinStockKg] = useState(0);
  const [inoxManualStartDate, setInoxManualStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [inoxManualEndDate, setInoxManualEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  });
  const [inoxManualDemandGranularity, setInoxManualDemandGranularity] =
    useState("week");
  const [inoxIncomingOrders, setInoxIncomingOrders] = useState([]);
  const [inoxOrderQty, setInoxOrderQty] = useState("");
  const [inoxOrderDate, setInoxOrderDate] = useState("");

  // ---------- PREPARAÇÃO DOS DADOS (AGRUPAMENTO BOBINAS) ----------
  const safeMother = Array.isArray(motherCoils) ? motherCoils : [];
  const safeChild = Array.isArray(childCoils) ? childCoils : [];
  const safeCatalog = Array.isArray(productCatalog) ? productCatalog : [];
  const safeMotherCatalog = Array.isArray(motherCatalog) ? motherCatalog : [];

  const isInoxMother = (m) => {
    const fam = (m.family || "").toUpperCase();
    const form = (m.form || "").toUpperCase();
    const t = (m.type || "").toUpperCase();
    return fam === "INOX" || form === "BLANK" || t === "INOX";
  };

  const getMaterialMetadata = (rawMotherCode, rawB2Code) => {
    const cleanMother = rawMotherCode
      ? String(rawMotherCode).trim().toUpperCase()
      : null;
    const cleanB2 = rawB2Code ? String(rawB2Code).trim().toUpperCase() : null;
    let type = null;
    let thickness = null;

    if (cleanMother) {
      const matchMother = safeMotherCatalog.find(
        (m) => String(m.code).trim().toUpperCase() === cleanMother
      );
      if (matchMother) {
        type = matchMother.type;
        thickness = matchMother.thickness;
      }
    }

    if ((!type || !thickness) && cleanB2) {
      let matchB2 =
        safeCatalog.find(
          (p) => String(p.b2Code).trim().toUpperCase() === cleanB2
        ) ||
        safeCatalog.find(
          (p) => String(p.code).trim().toUpperCase() === cleanB2
        );
      if (matchB2) {
        if (!type) type = matchB2.type;
        if (!thickness) thickness = matchB2.thickness || matchB2.width;
        if (!type && matchB2.motherCode) {
          const ref = safeMotherCatalog.find(
            (m) =>
              String(m.code).trim().toUpperCase() ===
              String(matchB2.motherCode).trim().toUpperCase()
          );
          if (ref) type = ref.type;
        }
      }
    }

    return {
      type: type ? String(type).toUpperCase() : "OUTROS",
      thickness: thickness ? String(thickness).replace(".", ",") : "0",
    };
  };

  const groupMap = new Map();
  const ensureGroup = (type, thickness) => {
    const key = `${type}|${thickness}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupId: key,
        type,
        thickness,
        isInox: false, // flag para separar nas abas
        codesIncluded: new Set(),
        motherStockWeight: 0,
        b2StockWeight: 0,
        items: [],
      });
    }
    return groupMap.get(key);
  };

  // Bobinas mãe (inclui BLANK INOX)
  safeMother.forEach((m) => {
    if (m.status !== "stock") return;

    const inox = isInoxMother(m); // checa se é Inox / Blank

    let type;
    let thickness;

    if (inox) {
      // --- REGRA ESPECÍFICA PRO INOX ---
      // "Tipo" do grupo = inoxGrade (ex.: "A1S1 430 (C2F 17 CM)")
      // Espessura vem direto do registro (já está em "1,20", "1,50", etc.)
      type = (m.inoxGrade || "INOX").toUpperCase();
      thickness = m.thickness
        ? String(m.thickness).replace(".", ",")
        : "0";
    } else {
      // --- AÇO / GALV NORMAL: usa metadata do catálogo ---
      const meta = getMaterialMetadata(m.code, null);
      type = meta.type;
      thickness = meta.thickness;
    }

    const entry = ensureGroup(type, thickness);

    if (inox) {
      entry.isInox = true; // marca o grupo como inox
    }

    if (m.code) {
      entry.codesIncluded.add(m.code);
    }

    const w = Number(m.weight) || 0;
    entry.motherStockWeight += w;
    entry.items.push({
      origin: inox ? "BLANK_INOX" : "Mãe",
      code: m.code || m.inoxGrade || "SEM-CÓDIGO",
      width: Number(m.width) || 0,
      weight: w,
    });
  });

  // Bobina 2
  safeChild.forEach((b2) => {
    if (b2.status !== "stock") return;
    let mCode = b2.motherCode;
    if (!mCode) {
      const cat = safeCatalog.find(
        (p) => String(p.b2Code) === String(b2.b2Code)
      );
      if (cat) mCode = cat.motherCode;
    }
    const { type, thickness } = getMaterialMetadata(mCode, b2.b2Code);
    const entry = ensureGroup(type, thickness);
    if (mCode) entry.codesIncluded.add(mCode);
    const w = Number(b2.weight) || 0;
    entry.b2StockWeight += w;
    entry.items.push({
      origin: "B2",
      code: b2.b2Code || b2.code,
      width: Number(b2.width) || 0,
      weight: w,
    });
  });

  const groupList = Array.from(groupMap.values()).map((g) => ({
    ...g,
    available: g.motherStockWeight + g.b2StockWeight,
    uniqueCodesCount: g.codesIncluded.size,
  }));

  // Apenas grupos NÃO inox para a aba de bobinas
  const coilGroups = groupList.filter((g) => !g.isInox);

  // ---------- LISTA INOX (ABA NOVA) ----------
  const inoxComputedRows = useMemo(
    () =>
      (Array.isArray(inoxRows) ? inoxRows : []).map((row) => {
        const demandQty = parseNumberInput(row.demandUnits);
        const finishedStockQty = parseNumberInput(row.finishedStockUnits);
        const blankStockQty = parseNumberInput(row.blanksStockUnits);
        const totalCoverageQty = finishedStockQty + blankStockQty;
        const qtyToBuy = Math.max(demandQty - totalCoverageQty, 0);
        const weightToBuyKg = qtyToBuy * (Number(row.unitWeightKg) || 0);

        return {
          ...row,
          demandQty,
          finishedStockQty,
          blankStockQty,
          totalCoverageQty,
          qtyToBuy,
          weightToBuyKg,
        };
      }),
    [inoxRows]
  );

  const inoxFilteredRows = useMemo(() => {
    const term = (inoxSearch || "").toLowerCase();
    if (!term) return inoxComputedRows;
    return inoxComputedRows.filter((r) => {
      const text = `${r.productCode} ${r.description} ${r.inoxGrade}`.toLowerCase();
      return text.includes(term);
    });
  }, [inoxComputedRows, inoxSearch]);

  const selectedInoxRow =
    inoxFilteredRows.find((r) => r.productId === selectedInoxProductId) ||
    inoxFilteredRows[0] ||
    null;

  const handleInoxFieldChange = (productId, field, value) => {
    setInoxRows((prev) =>
      prev.map((row) =>
        row.productId === productId ? { ...row, [field]: value } : row
      )
    );
    setSelectedInoxProductId(productId);
  };

  // ---------- FILTROS (BOBINAS) ----------
  const search = mpNeedSearch.toLowerCase();
  const filteredGroups = coilGroups
    .filter((g) => {
      if (mpFilterThickness !== "all" && g.thickness !== mpFilterThickness)
        return false;
      if (mpFilterType !== "all" && g.type !== mpFilterType) return false;
      if (
        search &&
        !g.type.toLowerCase().includes(search) &&
        !g.thickness.includes(search)
      )
        return false;
      return true;
    })
    .sort((a, b) => b.available - a.available);

  const selectedGroup =
    filteredGroups.find((g) => g.groupId === selectedMpCode) || null;

  // ---------- SIMULAÇÃO (MODO MANUAL - BOBINAS) ----------
  let scenarioDaily = 0;
  let idealStock = 0;
  let purchaseNeed = 0;
  let investment = 0;
  let stockValue = 0;
  let ruptureDateStr = "Sem risco";
  let deadlineDateStr = "-";
  let isLeadTimeCritical = false;
  let minStockRuptureDateStr = "Sem risco";
  let minStockDeadlineDateStr = "-";
  let totalDemandSimulated = 0;
  let initialStock = selectedGroup ? selectedGroup.available : 0;
  let activeOrders = [];
  let dailyStatement = [];
  let daysToDeadline = null;
  let minStock = 0;

  // Dados do gráfico
  let graphW = 1000;
  let graphH = 220;
  let graphPoints = "";
  let graphArea = "";
  let graphZeroY = 0;
  let graphMinStockY = 0;
  let graphPointsData = [];
  let graphYTicks = [];
  let graphXAxisDates = { start: null, middle: null, end: null };

  if (selectedGroup) {
    const price = Number(mpSimulatedPrice) || 0;
    const targetDays = Number(mpTargetDays) || 90;
    const leadTime = Number(mpLeadTime) || 30;
    minStock = Number(mpMinStock) || 0;

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    const motherStock = Number(selectedGroup.motherStockWeight || 0);
    const b2Stock = Number(selectedGroup.b2StockWeight || 0);

    // Estoque inicial = Mãe + B2
    initialStock = motherStock + b2Stock;

    activeOrders = mpIncomingOrders.filter((o) => o.groupId === selectedMpCode);
    const totalIncoming = activeOrders.reduce(
      (acc, o) => acc + o.qty,
      0
    );

    // Datas da simulação
    const startDate = mpManualStartDate
      ? new Date(mpManualStartDate)
      : new Date(baseDate);
    const endDate = mpManualEndDate
      ? new Date(mpManualEndDate)
      : new Date(baseDate.getTime() + mpTargetDays * MS_PER_DAY);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const daysInPeriod = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1
    );

    // Demanda diária média
    const demandValue = Number(mpManualDemandValue) || 0;
    if (mpManualDemandGranularity === "day") {
      scenarioDaily = demandValue;
    } else if (mpManualDemandGranularity === "week") {
      scenarioDaily = demandValue / 7;
    } else if (mpManualDemandGranularity === "month") {
      scenarioDaily = demandValue / 30;
    } else {
      scenarioDaily = demandValue / daysInPeriod;
    }

    // Metas
    idealStock = scenarioDaily * Number(mpTargetDays || 0);
    purchaseNeed = Math.max(0, idealStock - (initialStock + totalIncoming));
    investment = purchaseNeed * (Number(mpSimulatedPrice) || 0);
    stockValue = initialStock * (Number(mpSimulatedPrice) || 0);

    // Motor dia a dia
    let currentBalance = initialStock;
    let firstStockoutDate = null;
    let firstMinStockDate = null;
    let maxStock = currentBalance;
    let minStockVal = currentBalance;

    const finalHorizon = Number(mpTargetDays || 0) + 15;

    for (let i = 0; i <= finalHorizon; i++) {
      const simDate = new Date(baseDate);
      simDate.setDate(simDate.getDate() + i);

      // Entradas (Pedidos em Trânsito)
      const sameDay = (d1, d2) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

      const inflows = activeOrders.filter((o) => {
        if (!o.date) return false;
        const oDate = new Date(o.date + "T00:00:00");
        return sameDay(oDate, simDate);
      });

      const inflowQty = inflows.reduce(
        (acc, o) => acc + (Number(o.qty) || 0),
        0
      );

      // Saídas
      let dailyDemand = 0;
      if (simDate >= startDate && simDate <= endDate) {
        dailyDemand = scenarioDaily;
      }

      currentBalance += inflowQty;
      if (i > 0) currentBalance -= dailyDemand;

      totalDemandSimulated += dailyDemand;

      if (currentBalance < 0 && !firstStockoutDate) {
        firstStockoutDate = new Date(simDate);
      }
      if (currentBalance < mpMinStock && !firstMinStockDate) {
        firstMinStockDate = new Date(simDate);
      }

      if (currentBalance > maxStock) maxStock = currentBalance;
      if (currentBalance < minStockVal) minStockVal = currentBalance;

      dailyStatement.push({
        dayIndex: i,
        date: simDate,
        balance: currentBalance,
        inflow: inflowQty,
        demand: dailyDemand,
      });
    }

    // Datas críticas
    if (firstStockoutDate) {
      ruptureDateStr = formatDate(firstStockoutDate);
      const deadline = new Date(firstStockoutDate);
      deadline.setDate(deadline.getDate() - Number(mpLeadTime || 0));
      deadlineDateStr = formatDate(deadline);

      daysToDeadline = Math.round(
        (deadline.getTime() - baseDate.getTime()) / MS_PER_DAY
      );

      if (daysToDeadline < 0) {
        isLeadTimeCritical = true;
      }
    }

    if (mpMinStock > 0 && firstMinStockDate) {
      minStockRuptureDateStr = formatDate(firstMinStockDate);
      const deadline = new Date(firstMinStockDate);
      deadline.setDate(deadline.getDate() - Number(mpLeadTime || 0));
      minStockDeadlineDateStr = formatDate(deadline);
    }

    // Gráfico
    const range = maxStock - minStockVal || 1;
    const padding = range * 0.1;
    const gMax = maxStock + padding;
    const gMin = minStockVal - padding;
    const gRange = gMax - gMin;

    const chartPaddingLeft = 60;
    const chartPaddingRight = 20;
    const chartPaddingTop = 20;
    const chartPaddingBottom = 30;
    const innerW = graphW - chartPaddingLeft - chartPaddingRight;
    const innerH = graphH - chartPaddingTop - chartPaddingBottom;

    const getX = (i) =>
      chartPaddingLeft + (i / (dailyStatement.length - 1 || 1)) * innerW;

    const getY = (val) => {
      const y =
        chartPaddingTop +
        innerH -
        ((val - gMin) / gRange) * innerH;
      return Number.isFinite(y) ? y : chartPaddingTop + innerH;
    };

    if (dailyStatement.length > 0) {
      const first = dailyStatement[0];
      const last = dailyStatement[dailyStatement.length - 1];
      const middle =
        dailyStatement[Math.floor(dailyStatement.length / 2)];
      graphXAxisDates = {
        start: first.date,
        middle: middle.date,
        end: last.date,
      };
    }

    graphPoints = dailyStatement
      .map((d, i) => `${getX(i)},${getY(d.balance)}`)
      .join(" ");

    graphArea = `${graphPoints} L ${
      chartPaddingLeft + innerW
    },${chartPaddingTop + innerH} L ${
      chartPaddingLeft
    },${chartPaddingTop + innerH} Z`;

    graphZeroY = getY(0);
    graphMinStockY = getY(mpMinStock);

    graphPointsData = dailyStatement.map((d, i) => ({
      x: getX(i),
      y: getY(d.balance),
      ...d,
    }));

    const rawTicks = [gMax, (gMax + gMin) / 2, Math.max(0, gMin)];
    graphYTicks = rawTicks.map((value) => ({
      value,
      y: getY(value),
    }));
  }

  // ---------- SIMULAÇÃO INOX (MANUAL) ----------
  let inoxScenarioDailyKg = 0;
  let inoxIdealStockKg = 0;
  let inoxPurchaseNeedKg = 0;
  let inoxInvestment = 0;
  let inoxStockValue = 0;
  let inoxRuptureDateStr = "Sem risco";
  let inoxDeadlineDateStr = "-";
  let inoxIsLeadTimeCritical = false;
  let inoxMinStockRuptureDateStr = "Sem risco";
  let inoxMinStockDeadlineDateStr = "-";
  let inoxTotalDemandSimulatedKg = 0;
  let inoxInitialStockKg = 0;
  let inoxActiveOrders = [];
  let inoxDailyStatement = [];
  let inoxDaysToDeadline = null;
  let inoxGraphW = 1000;
  let inoxGraphH = 220;
  let inoxGraphPoints = "";
  let inoxGraphArea = "";
  let inoxGraphZeroY = 0;
  let inoxGraphMinStockY = 0;
  let inoxGraphPointsData = [];
  let inoxGraphYTicks = [];
  let inoxGraphXAxisDates = { start: null, middle: null, end: null };
  let inoxMinStockValKg = 0;

  if (selectedInoxRow) {
    const unitWeight = Number(selectedInoxRow.unitWeightKg) || 0;
    const demandUnits = Number(selectedInoxRow.demandQty) || 0;
    const finishedUnits = Number(selectedInoxRow.finishedStockQty) || 0;
    const blankUnits = Number(selectedInoxRow.blankStockQty) || 0;
    const totalStockUnits = finishedUnits + blankUnits;

    const demandKg = demandUnits * unitWeight;
    inoxInitialStockKg = totalStockUnits * unitWeight;

    const targetDays = Number(inoxTargetDays) || 90;
    const leadTime = Number(inoxLeadTime) || 30;
    const minStockKg = Number(inoxMinStockKg) || 0;
    const price = Number(inoxSimulatedPrice) || 0;
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    inoxActiveOrders = inoxIncomingOrders.filter(
      (o) => o.productId === selectedInoxRow.productId
    );
    const totalIncomingKg = inoxActiveOrders.reduce(
      (acc, o) => acc + (Number(o.qty) || 0),
      0
    );

    const startDate = inoxManualStartDate
      ? new Date(inoxManualStartDate)
      : new Date(baseDate);
    const endDate = inoxManualEndDate
      ? new Date(inoxManualEndDate)
      : new Date(baseDate.getTime() + targetDays * MS_PER_DAY);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const daysInPeriod = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1
    );

    if (inoxManualDemandGranularity === "day") {
      inoxScenarioDailyKg = demandKg;
    } else if (inoxManualDemandGranularity === "week") {
      inoxScenarioDailyKg = demandKg / 7;
    } else if (inoxManualDemandGranularity === "month") {
      inoxScenarioDailyKg = demandKg / 30;
    } else {
      inoxScenarioDailyKg = demandKg / daysInPeriod;
    }

    inoxIdealStockKg = inoxScenarioDailyKg * targetDays;
    inoxPurchaseNeedKg = Math.max(
      0,
      inoxIdealStockKg - (inoxInitialStockKg + totalIncomingKg)
    );
    inoxInvestment = inoxPurchaseNeedKg * price;
    inoxStockValue = inoxInitialStockKg * price;
    inoxMinStockValKg = minStockKg;

    let currentBalance = inoxInitialStockKg;
    let maxStock = currentBalance;
    let minStockSeen = currentBalance;
    let firstStockoutDate = null;
    let firstMinStockDate = null;

    const finalHorizon = targetDays + 15;

    for (let i = 0; i <= finalHorizon; i++) {
      const simDate = new Date(baseDate);
      simDate.setDate(simDate.getDate() + i);

      const sameDay = (d1, d2) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

      const inflows = inoxActiveOrders.filter((o) => {
        if (!o.date) return false;
        const oDate = new Date(o.date + "T00:00:00");
        return sameDay(oDate, simDate);
      });

      const inflowQty = inflows.reduce(
        (acc, o) => acc + (Number(o.qty) || 0),
        0
      );

      let dailyDemand = 0;
      if (simDate >= startDate && simDate <= endDate) {
        dailyDemand = inoxScenarioDailyKg;
      }

      currentBalance += inflowQty;
      if (i > 0) currentBalance -= dailyDemand;

      inoxTotalDemandSimulatedKg += dailyDemand;

      if (currentBalance < 0 && !firstStockoutDate) {
        firstStockoutDate = new Date(simDate);
      }
      if (currentBalance < minStockKg && !firstMinStockDate) {
        firstMinStockDate = new Date(simDate);
      }

      if (currentBalance > maxStock) maxStock = currentBalance;
      if (currentBalance < minStockSeen) minStockSeen = currentBalance;

      inoxDailyStatement.push({
        dayIndex: i,
        date: simDate,
        balance: currentBalance,
        inflow: inflowQty,
        demand: dailyDemand,
      });
    }

    if (firstStockoutDate) {
      inoxRuptureDateStr = formatDate(firstStockoutDate);
      const deadline = new Date(firstStockoutDate);
      deadline.setDate(deadline.getDate() - leadTime);
      inoxDeadlineDateStr = formatDate(deadline);
      inoxDaysToDeadline = Math.round(
        (deadline.getTime() - baseDate.getTime()) / MS_PER_DAY
      );
      if (inoxDaysToDeadline < 0) inoxIsLeadTimeCritical = true;
    }

    if (minStockKg > 0 && firstMinStockDate) {
      inoxMinStockRuptureDateStr = formatDate(firstMinStockDate);
      const deadline = new Date(firstMinStockDate);
      deadline.setDate(deadline.getDate() - leadTime);
      inoxMinStockDeadlineDateStr = formatDate(deadline);
    }

    const range = maxStock - minStockSeen || 1;
    const padding = range * 0.1;
    const gMax = maxStock + padding;
    const gMin = minStockSeen - padding;
    const gRange = gMax - gMin;

    const chartPaddingLeft = 60;
    const chartPaddingRight = 20;
    const chartPaddingTop = 20;
    const chartPaddingBottom = 30;
    const innerW = inoxGraphW - chartPaddingLeft - chartPaddingRight;
    const innerH = inoxGraphH - chartPaddingTop - chartPaddingBottom;

    const getX = (i) =>
      chartPaddingLeft + (i / (inoxDailyStatement.length - 1 || 1)) * innerW;

    const getY = (val) => {
      const y =
        chartPaddingTop +
        innerH -
        ((val - gMin) / gRange) * innerH;
      return Number.isFinite(y) ? y : chartPaddingTop + innerH;
    };

    if (inoxDailyStatement.length > 0) {
      const first = inoxDailyStatement[0];
      const last = inoxDailyStatement[inoxDailyStatement.length - 1];
      const middle =
        inoxDailyStatement[Math.floor(inoxDailyStatement.length / 2)];
      inoxGraphXAxisDates = {
        start: first.date,
        middle: middle.date,
        end: last.date,
      };
    }

    inoxGraphPoints = inoxDailyStatement
      .map((d, i) => `${getX(i)},${getY(d.balance)}`)
      .join(" ");

    inoxGraphArea = `${inoxGraphPoints} L ${
      chartPaddingLeft + innerW
    },${chartPaddingTop + innerH} L ${
      chartPaddingLeft
    },${chartPaddingTop + innerH} Z`;

    inoxGraphZeroY = getY(0);
    inoxGraphMinStockY = getY(minStockKg);

    inoxGraphPointsData = inoxDailyStatement.map((d, i) => ({
      x: getX(i),
      y: getY(d.balance),
      ...d,
    }));

    const rawTicks = [gMax, (gMax + gMin) / 2, Math.max(0, gMin)];
    inoxGraphYTicks = rawTicks.map((value) => ({
      value,
      y: getY(value),
    }));
  }

  // ---------- HANDLERS BOBINAS ----------
  const handleAddOrder = () => {
    if (!selectedMpCode || !mpOrderQty || !mpOrderDate) return;

    setMpIncomingOrders((prev) => [
      ...prev,
      {
        id: Date.now(),
        groupId: selectedMpCode,
        date: mpOrderDate,
        qty: Number(mpOrderQty),
      },
    ]);

    setMpOrderQty("");
    setMpOrderDate("");
  };

  const removeOrder = (id) =>
    setMpIncomingOrders((prev) => prev.filter((o) => o.id !== id));

  const handleAddInoxOrder = () => {
    if (!selectedInoxRow || !inoxOrderQty || !inoxOrderDate) return;

    setInoxIncomingOrders((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: selectedInoxRow.productId,
        date: inoxOrderDate,
        qty: Number(inoxOrderQty),
      },
    ]);

    setInoxOrderQty("");
    setInoxOrderDate("");
  };

  const removeInoxOrder = (id) =>
    setInoxIncomingOrders((prev) => prev.filter((o) => o.id !== id));

  const exportSimulationPDF = async () => {
    if (!selectedGroup) {
      alert("Selecione um grupo de matéria-prima para gerar o relatório.");
      return;
    }

    try {
      const doc = new jsPDF("p", "mm", "a4");

      // Cabeçalho
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("SIMULADOR DE PLANEJAMENTO DE COMPRAS", 14, 13);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);

      const resumoBody = [
        ["Item", `${selectedGroup.type} ${selectedGroup.thickness}mm`],
        ["Estoque inicial (Mãe + B2)", `${formatKg(initialStock)} kg`],
        ["Demanda média diária", `${formatKg(scenarioDaily)} kg/dia`],
        ["Demanda total simulada", `${formatKg(totalDemandSimulated)} kg`],
        ["Estoque mínimo", `${formatKg(minStock)} kg`],
        ["Dias de cobertura (meta)", `${mpTargetDays} dias`],
        ["Lead time considerado", `${mpLeadTime} dias`],
        ["Preço simulado", `${formatMoney(mpSimulatedPrice || 0)} /kg`],
      ];

      autoTable(doc, {
        startY: 26,
        head: [["Campo", "Valor"]],
        body: resumoBody,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [200, 200, 200] },
      });

      let currentY = doc.lastAutoTable.finalY || 26;

      const indicadoresBody = [
        [
          "Ruptura (Estoque Zero)",
          ruptureDateStr,
          isLeadTimeCritical ? "CRÍTICO" : "OK",
        ],
        [
          "Data limite p/ pedido (Estoque Zero)",
          deadlineDateStr,
          isLeadTimeCritical ? "URGENTE" : "OK",
        ],
        [
          "Ruptura (Estoque Mínimo)",
          minStockRuptureDateStr,
          minStock > 0 && minStockRuptureDateStr !== "Sem risco"
            ? "ATENÇÃO"
            : "OK",
        ],
        ["Necessidade de compra (meta)", `${formatKg(purchaseNeed)} kg`, ""],
        ["Investimento sugerido", formatMoney(investment), ""],
      ];

      autoTable(doc, {
        startY: currentY + 8,
        head: [["Indicador", "Valor", "Status"]],
        body: indicadoresBody,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [200, 200, 200] },
      });

      currentY = doc.lastAutoTable.finalY || currentY + 8;

      if (activeOrders && activeOrders.length > 0) {
        const pedidosBody = [...activeOrders]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((o) => [formatDate(o.date), formatKg(o.qty)]);

        autoTable(doc, {
          startY: currentY + 8,
          head: [["Data prevista", "Quantidade (kg)"]],
          body: pedidosBody,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [200, 200, 200] },
        });
      }

      const fileName = `Simulacao_MP_${selectedGroup.type}_${selectedGroup.thickness}mm.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar o PDF. Veja o console para mais detalhes.");
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header + Tabs */}
      <div className="flex gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 items-end">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white flex gap-2 items-center">
            <TrendingUp className="text-indigo-400" />
            {activeTab === "coil"
              ? "SIMULADOR DE PLANEJAMENTO DE COMPRAS – BOBINAS"
              : "PLANEJAMENTO DE MATERIAIS – INOX (BLANKS)"}
          </h2>

          <div className="mt-3 inline-flex rounded-lg bg-gray-900 border border-gray-700 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("coil")}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                activeTab === "coil"
                  ? "bg-indigo-600 text:white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              Bobinas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inox")}
              className={`ml-1 px-3 py-1 text-xs font-semibold rounded-md ${
                activeTab === "inox"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              Inox (Blanks)
            </button>
          </div>
        </div>

        {/* Filtros só para a aba de bobinas */}
        {activeTab === "coil" && (
          <>
            <input
              type="text"
              placeholder="Buscar..."
              value={mpNeedSearch}
              onChange={(e) => setMpNeedSearch(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white w-40"
            />
            <select
              value={mpFilterThickness}
              onChange={(e) => setMpFilterThickness(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="all">Espessura</option>
              {[...new Set(coilGroups.map((g) => g.thickness))]
                .sort()
                .map((t) => (
                  <option key={t}>{t}</option>
                ))}
            </select>
            <select
              value={mpFilterType}
              onChange={(e) => setMpFilterType(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="all">Tipo</option>
              {[...new Set(coilGroups.map((g) => g.type))]
                .sort()
                .map((t) => (
                  <option key={t}>{t}</option>
                ))}
            </select>
          </>
        )}
      </div>

      {/* ===================== ABA BOBINAS ===================== */}
      {activeTab === "coil" && (
        <>
          {selectedGroup && (
            <div className="space-y-6">
              {/* Configuração do modo manual */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Configuração do Modo: MANUAL
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex flex-col">
                    Estoque Inicial (kg):
                    <input
                      type="number"
                      value={
                        mpManualInitialStock === "" && selectedGroup
                          ? Math.round(selectedGroup.available || 0)
                          : mpManualInitialStock
                      }
                      onChange={(e) =>
                        setMpManualInitialStock(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                    {selectedGroup && (
                      <span className="text-xs text-gray-500 mt-1">
                        Estoque atual do sistema:{" "}
                        {formatKg(selectedGroup.available)} kg
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col">
                    Data Início Simulação:
                    <input
                      type="date"
                      value={mpManualStartDate}
                      onChange={(e) =>
                        setMpManualStartDate(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>

                  <label className="flex flex-col">
                    Data Fim Simulação:
                    <input
                      type="date"
                      value={mpManualEndDate}
                      onChange={(e) =>
                        setMpManualEndDate(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>

                  <label className="flex flex-col">
                    Demanda (kg):
                    <input
                      type="number"
                      value={mpManualDemandValue}
                      onChange={(e) =>
                        setMpManualDemandValue(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>

                  <label className="flex flex-col">
                    Granularidade:
                    <select
                      value={mpManualDemandGranularity}
                      onChange={(e) =>
                        setMpManualDemandGranularity(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text:white"
                    >
                      <option value="day">Diária</option>
                      <option value="week">Semanal</option>
                      <option value="month">Mensal</option>
                    </select>
                  </label>

                  <p className="text-sm text-gray-400 self-end">
                    Demanda Diária Média:{" "}
                    <strong>{formatKg(scenarioDaily)} kg/dia</strong>
                  </p>
                </div>

                {/* Parâmetros comuns */}
                <div className="mt-6 pt-4 border-t border-gray-700 grid grid-cols-4 gap-4">
                  <label className="flex flex-col">
                    Lead Time (dias):
                    <input
                      type="number"
                      value={mpLeadTime}
                      onChange={(e) => setMpLeadTime(e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>
                  <label className="flex flex-col">
                    Estoque Mínimo (kg):
                    <input
                      type="number"
                      value={mpMinStock}
                      onChange={(e) => setMpMinStock(e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>
                  <label className="flex flex-col">
                    Dias de Cobertura (Meta):
                    <input
                      type="number"
                      value={mpTargetDays}
                      onChange={(e) => setMpTargetDays(e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text:white"
                    />
                  </label>
                  <label className="flex flex-col">
                    Preço Simulado (R$/kg):
                    <input
                      type="number"
                      value={mpSimulatedPrice}
                      onChange={(e) =>
                        setMpSimulatedPrice(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </label>
                </div>
              </div>

              {/* Indicadores chave */}
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400">Estoque Atual (Total)</p>
                  <p className="text-2xl font-bold text-white">
                    {formatKg(initialStock)} kg
                  </p>

                  {selectedGroup && (
                    <p className="text-xs text-gray-400 mt-1">
                      Mãe: {formatKg(selectedGroup.motherStockWeight || 0)} kg ·
                      B2: {formatKg(selectedGroup.b2StockWeight || 0)} kg
                    </p>
                  )}
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400">
                    Necessidade de Compra
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      purchaseNeed > 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {formatKg(purchaseNeed)} kg
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400">
                    Investimento Sugerido
                  </p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatMoney(investment)}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400">
                    Ruptura (Estoque Zero)
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isLeadTimeCritical ? "text-red-500" : "text-white"
                    }`}
                  >
                    {ruptureDateStr}
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400">
                    Ruptura (Estoque Mínimo)
                  </p>
                  {ruptureDateStr !== "Sem risco" && (
                    <div
                      className={`mt-2 p-3 rounded-lg border text-sm ${
                        isLeadTimeCritical
                          ? "border-red-500 bg-red-500/10 text-red-200"
                          : "border-amber-400 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {isLeadTimeCritical ? (
                        <>
                          Você <strong>já passou</strong> do limite de compra
                          considerando um lead time de{" "}
                          <strong>{mpLeadTime}</strong> dias. A ruptura está
                          prevista para <strong>{ruptureDateStr}</strong>.
                          Ajuste o plano de compras ou negocie
                          prazo/estoque com o fornecedor.
                        </>
                      ) : (
                        <>
                          Para evitar ruptura, faça o próximo pedido até{" "}
                          <strong>{deadlineDateStr}</strong> (lead time{" "}
                          <strong>{mpLeadTime}</strong> dias). A ruptura está
                          prevista para <strong>{ruptureDateStr}</strong>.
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-2xl font-bold text-orange-400">
                    {minStockRuptureDateStr}
                  </p>
                </div>
              </div>

              {/* Gráfico */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Comportamento do Estoque Projetado
                </h3>

                <svg
                  width={graphW}
                  height={graphH}
                  viewBox={`0 0 ${graphW} ${graphH}`}
                >
                  {/* Eixos */}
                  <line
                    x1={60}
                    y1={graphH - 30}
                    x2={graphW - 20}
                    y2={graphH - 30}
                    stroke="#4b5563"
                    strokeWidth="1"
                  />
                  <line
                    x1={60}
                    y1={20}
                    x2={60}
                    y2={graphH - 30}
                    stroke="#4b5563"
                    strokeWidth="1"
                  />

                  {/* Ticks Y */}
                  {graphYTicks.map((t, idx) => (
                    <g key={idx}>
                      <line
                        x1={55}
                        y1={t.y}
                        x2={60}
                        y2={t.y}
                        stroke="#9ca3af"
                        strokeWidth="1"
                      />
                      <text
                        x={50}
                        y={t.y + 3}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {formatKg(t.value)} kg
                      </text>
                      <line
                        x1={60}
                        y1={t.y}
                        x2={graphW - 20}
                        y2={t.y}
                        stroke="#1f2937"
                        strokeWidth="0.5"
                        strokeDasharray="2 4"
                      />
                    </g>
                  ))}

                  {/* Estoque zero */}
                  <line
                    x1={60}
                    y1={graphZeroY}
                    x2={graphW - 20}
                    y2={graphZeroY}
                    stroke="red"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x={65} y={graphZeroY - 5} fill="red" fontSize="10">
                    Estoque Zero
                  </text>

                  {/* Estoque mínimo */}
                  {mpMinStock > 0 && (
                    <>
                      <line
                        x1={60}
                        y1={graphMinStockY}
                        x2={graphW - 20}
                        y2={graphMinStockY}
                        stroke="orange"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={65}
                        y={graphMinStockY - 5}
                        fill="orange"
                        fontSize="10"
                      >
                        Estoque Mínimo ({formatKg(mpMinStock)} kg)
                      </text>
                    </>
                  )}

                  {/* Área e linha */}
                  <polygon
                    points={graphArea}
                    fill="rgba(59,130,246,0.25)"
                    stroke="none"
                  />
                  <polyline
                    points={graphPoints}
                    fill="none"
                    stroke="rgb(59,130,246)"
                    strokeWidth="2"
                  />

                  {/* Pontos */}
                  {graphPointsData.map((p, index) => (
                    <circle
                      key={index}
                      cx={p.x}
                      cy={p.y}
                      r="2"
                      fill="rgb(59,130,246)"
                    />
                  ))}

                  {/* Linhas de pedidos em trânsito */}
                  {selectedGroup &&
                    activeOrders.map((o) => {
                      if (!o.date) return null;
                      const oDate = new Date(o.date + "T00:00:00");

                      const idx = dailyStatement.findIndex(
                        (d) =>
                          d.date.getDate() === oDate.getDate() &&
                          d.date.getMonth() === oDate.getMonth() &&
                          d.date.getFullYear() === oDate.getFullYear()
                      );

                      if (idx === -1) return null;
                      const point = graphPointsData[idx];
                      if (!point) return null;

                      return (
                        <g key={o.id}>
                          <line
                            x1={point.x}
                            y1={0}
                            x2={point.x}
                            y2={graphH}
                            stroke="rgba(16,185,129,0.7)"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={point.x + 3}
                            y={12}
                            fill="#6ee7b7"
                            fontSize="9"
                          >
                            +{formatKg(o.qty)} kg
                          </text>
                        </g>
                      );
                    })}

                  {/* Datas eixo X */}
                  {graphXAxisDates.start && (
                    <>
                      <text
                        x={60}
                        y={graphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="start"
                      >
                        {formatDate(graphXAxisDates.start)}
                      </text>
                      <text
                        x={graphW / 2}
                        y={graphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {formatDate(graphXAxisDates.middle)}
                      </text>
                      <text
                        x={graphW - 20}
                        y={graphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {formatDate(graphXAxisDates.end)}
                      </text>
                    </>
                  )}

                  {/* Legenda */}
                  <g transform={`translate(${graphW - 210}, 25)`}>
                    <rect
                      width="190"
                      height="38"
                      rx="6"
                      fill="#020617"
                      opacity="0.85"
                    />
                    <circle cx="12" cy="12" r="4" fill="rgb(59,130,246)" />
                    <text x="24" y="15" fill="#e5e7eb" fontSize="10">
                      Estoque projetado (kg)
                    </text>

                    <line
                      x1="8"
                      y1="24"
                      x2="16"
                      y2="24"
                      stroke="red"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    />
                    <text x="24" y="27" fill="#e5e7eb" fontSize="10">
                      Ruptura / mínimo
                    </text>
                  </g>
                </svg>

                <p className="text-sm text-gray-400 mt-2">
                  Linha azul = saldo de estoque dia a dia. Vermelho tracejado =
                  estoque zero. Laranja = estoque mínimo.
                </p>
              </div>

              {/* Pedidos em trânsito */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Pedidos em Trânsito (Entradas Futuras)
                </h3>
                <div className="flex gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="Quantidade (kg)"
                    value={mpOrderQty}
                    onChange={(e) => setMpOrderQty(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white w-40"
                  />
                  <input
                    type="date"
                    value={mpOrderDate}
                    onChange={(e) => setMpOrderDate(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white w-40"
                  />
                  <button
                    onClick={handleAddOrder}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                  >
                    Adicionar Pedido
                  </button>
                </div>

                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-700">
                    <tr>
                      <th>Data</th>
                      <th>Quantidade (kg)</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="bg-gray-800 border-b border-gray-700"
                      >
                        <td>{formatDate(o.date)}</td>
                        <td>{formatKg(o.qty)}</td>
                        <td>
                          <button
                            onClick={() => removeOrder(o.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-2 text-center text-gray-500"
                        >
                          Nenhum pedido registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botão PDF */}
              <div className="flex justify-end">
                <button
                  onClick={exportSimulationPDF}
                  className="px-6 py-3 bg-red-600 rounded-xl text-white font-bold hover:bg-red-500 flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" /> Gerar Relatório PDF
                </button>
              </div>
            </div>
          )}

          {/* Cards de grupos (bobinas) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {filteredGroups.map((g) => (
              <div
                key={g.groupId}
                onClick={() => setSelectedMpCode(g.groupId)}
                className={`p-4 rounded-xl border cursor-pointer ${
                  g.groupId === selectedMpCode
                    ? "border-indigo-500 bg-indigo-900/20"
                    : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <p className="text-sm text-gray-400">{g.type}</p>
                <p className="text-xl font-bold text-white">
                  {g.thickness}mm
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Estoque: {formatKg(g.available)} kg
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===================== ABA INOX ===================== */}
      {activeTab === "inox" && (
        <div className="space-y-6">
          {/* Resumo + seleção do produto */}
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  MRP Simplificado – Inox / Blanks
                </h3>
                <p className="text-sm text-gray-400">
                  Preencha o saldo atual (acabado + blanks) e a demanda de cada
                  item de inox. A tabela calcula automaticamente a cobertura em
                  peças e a necessidade em kg.
                </p>
              </div>
              <input
                type="text"
                placeholder="Buscar produto inox..."
                className="w-full md:w-72 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={inoxSearch}
                onChange={(e) => setInoxSearch(e.target.value)}
              />
            </div>

            {selectedInoxRow && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Produto</p>
                  <p className="text-sm font-bold text-white">
                    {selectedInoxRow.productCode}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {selectedInoxRow.description}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    {selectedInoxRow.inoxGrade}
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Demanda informada</p>
                  <p className="text-xl font-bold text-white">
                    {formatPieces(selectedInoxRow.demandQty)}
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-400">
                    Saldo atual (acabado + blanks)
                  </p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatPieces(selectedInoxRow.totalCoverageQty)}
                  </p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Necessidade em kg</p>
                  <p
                    className={`text-xl font-bold ${
                      selectedInoxRow.weightToBuyKg > 0
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {formatKg(selectedInoxRow.weightToBuyKg)} kg
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedInoxRow && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Configurações de simulação (manual)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Lead time (dias)
                    <input
                      type="number"
                      min="0"
                      value={inoxLeadTime}
                      onChange={(e) => setInoxLeadTime(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Cobertura alvo (dias)
                    <input
                      type="number"
                      min="0"
                      value={inoxTargetDays}
                      onChange={(e) => setInoxTargetDays(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Estoque mínimo (kg)
                    <input
                      type="number"
                      min="0"
                      value={inoxMinStockKg}
                      onChange={(e) => setInoxMinStockKg(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Preço simulado (R$/kg)
                    <input
                      type="number"
                      min="0"
                      value={inoxSimulatedPrice}
                      onChange={(e) => setInoxSimulatedPrice(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Início da simulação
                    <input
                      type="date"
                      value={inoxManualStartDate}
                      onChange={(e) => setInoxManualStartDate(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Fim da simulação
                    <input
                      type="date"
                      value={inoxManualEndDate}
                      onChange={(e) => setInoxManualEndDate(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    />
                  </label>
                  <label className="text-xs text-gray-400 flex flex-col gap-1">
                    Granularidade da demanda
                    <select
                      value={inoxManualDemandGranularity}
                      onChange={(e) =>
                        setInoxManualDemandGranularity(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-2 text-sm text-gray-100"
                    >
                      <option value="week">Semanal</option>
                      <option value="month">Mensal</option>
                      <option value="day">Diária</option>
                      <option value="range">Distribuir por período</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-xs text-gray-400">Cobertura estimada</p>
                  <p className="text-2xl font-bold text-white">
                    {inoxScenarioDailyKg > 0
                      ? `${Math.floor(
                          inoxInitialStockKg / inoxScenarioDailyKg
                        )} dias`
                      : "-"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Estoque atual: {formatKg(inoxInitialStockKg)} kg
                  </p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-xs text-gray-400">
                    Data de ruptura (estoque zero)
                  </p>
                  <p className="text-2xl font-bold text-orange-400">
                    {inoxRuptureDateStr}
                  </p>
                  {inoxDeadlineDateStr !== "-" && (
                    <p
                      className={`text-xs mt-1 ${
                        inoxIsLeadTimeCritical
                          ? "text-red-400 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      Comprar até {inoxDeadlineDateStr} (LT {inoxLeadTime} d)
                    </p>
                  )}
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <p className="text-xs text-gray-400">
                    Necessidade planejada
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      inoxPurchaseNeedKg > 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {formatKg(inoxPurchaseNeedKg)} kg
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Investimento: {formatMoney(inoxInvestment)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Comportamento do estoque projetado (kg)
                </h4>
                <svg
                  width={inoxGraphW}
                  height={inoxGraphH}
                  viewBox={`0 0 ${inoxGraphW} ${inoxGraphH}`}
                >
                  <line
                    x1={60}
                    y1={inoxGraphH - 30}
                    x2={inoxGraphW - 20}
                    y2={inoxGraphH - 30}
                    stroke="#4b5563"
                    strokeWidth="1"
                  />
                  <line
                    x1={60}
                    y1={20}
                    x2={60}
                    y2={inoxGraphH - 30}
                    stroke="#4b5563"
                    strokeWidth="1"
                  />

                  {inoxGraphYTicks.map((t, idx) => (
                    <g key={idx}>
                      <line
                        x1={55}
                        y1={t.y}
                        x2={60}
                        y2={t.y}
                        stroke="#9ca3af"
                        strokeWidth="1"
                      />
                      <text
                        x={50}
                        y={t.y + 3}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {formatKg(t.value)} kg
                      </text>
                      <line
                        x1={60}
                        y1={t.y}
                        x2={inoxGraphW - 20}
                        y2={t.y}
                        stroke="#1f2937"
                        strokeWidth="0.5"
                        strokeDasharray="2 4"
                      />
                    </g>
                  ))}

                  <line
                    x1={60}
                    y1={inoxGraphZeroY}
                    x2={inoxGraphW - 20}
                    y2={inoxGraphZeroY}
                    stroke="red"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x={65} y={inoxGraphZeroY - 5} fill="red" fontSize="10">
                    Estoque Zero
                  </text>

                  {inoxMinStockValKg > 0 && (
                    <>
                      <line
                        x1={60}
                        y1={inoxGraphMinStockY}
                        x2={inoxGraphW - 20}
                        y2={inoxGraphMinStockY}
                        stroke="orange"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={65}
                        y={inoxGraphMinStockY - 5}
                        fill="orange"
                        fontSize="10"
                      >
                        Estoque Mínimo ({formatKg(inoxMinStockValKg)} kg)
                      </text>
                    </>
                  )}

                  <polygon
                    points={inoxGraphArea}
                    fill="rgba(16,185,129,0.25)"
                    stroke="none"
                  />
                  <polyline
                    points={inoxGraphPoints}
                    fill="none"
                    stroke="rgb(16,185,129)"
                    strokeWidth="2"
                  />

                  {inoxGraphPointsData.map((p, index) => (
                    <circle
                      key={index}
                      cx={p.x}
                      cy={p.y}
                      r="2"
                      fill="rgb(16,185,129)"
                    />
                  ))}

                  {selectedInoxRow &&
                    inoxActiveOrders.map((o) => {
                      if (!o.date) return null;
                      const oDate = new Date(o.date + "T00:00:00");

                      const idx = inoxDailyStatement.findIndex(
                        (d) =>
                          d.date.getDate() === oDate.getDate() &&
                          d.date.getMonth() === oDate.getMonth() &&
                          d.date.getFullYear() === oDate.getFullYear()
                      );

                      if (idx === -1) return null;
                      const point = inoxGraphPointsData[idx];
                      if (!point) return null;

                      return (
                        <g key={o.id}>
                          <line
                            x1={point.x}
                            y1={0}
                            x2={point.x}
                            y2={inoxGraphH}
                            stroke="rgba(59,130,246,0.7)"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={point.x + 3}
                            y={12}
                            fill="#93c5fd"
                            fontSize="9"
                          >
                            +{formatKg(o.qty)} kg
                          </text>
                        </g>
                      );
                    })}

                  {inoxGraphXAxisDates.start && (
                    <>
                      <text
                        x={60}
                        y={inoxGraphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="start"
                      >
                        {formatDate(inoxGraphXAxisDates.start)}
                      </text>
                      <text
                        x={inoxGraphW / 2}
                        y={inoxGraphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {formatDate(inoxGraphXAxisDates.middle)}
                      </text>
                      <text
                        x={inoxGraphW - 20}
                        y={inoxGraphH - 15}
                        fill="#9ca3af"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {formatDate(inoxGraphXAxisDates.end)}
                      </text>
                    </>
                  )}
                </svg>
                <p className="text-sm text-gray-400 mt-2">
                  Linha verde = saldo projetado em kg. Vermelho tracejado =
                  estoque zero. Laranja = estoque mínimo.
                </p>
              </div>

              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Pedidos em trânsito (kg)
                </h4>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="number"
                    min="0"
                    placeholder="Quantidade (kg)"
                    value={inoxOrderQty}
                    onChange={(e) => setInoxOrderQty(e.target.value)}
                    className="w-full md:w-40 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                  <input
                    type="date"
                    value={inoxOrderDate}
                    onChange={(e) => setInoxOrderDate(e.target.value)}
                    className="w-full md:w-40 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                  <button
                    onClick={handleAddInoxOrder}
                    className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500 text-white text-sm"
                  >
                    Adicionar pedido
                  </button>
                </div>

                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-700">
                    <tr>
                      <th>Data</th>
                      <th>Quantidade (kg)</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inoxActiveOrders.map((o) => (
                      <tr key={o.id} className="bg-gray-800 border-b border-gray-700">
                        <td>{formatDate(o.date)}</td>
                        <td>{formatKg(o.qty)}</td>
                        <td>
                          <button
                            onClick={() => removeInoxOrder(o.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inoxActiveOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-2 text-center text-gray-500"
                        >
                          Nenhum pedido registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela Inox */}
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-gray-900 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-2 py-2 text-left">Produto</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-right">Peso Unit. (kg)</th>
                  <th className="px-2 py-2 text-right">Demanda (peças)</th>
                  <th className="px-2 py-2 text-right">Est. Acabado</th>
                  <th className="px-2 py-2 text-right">Est. Blanks</th>
                  <th className="px-2 py-2 text-right">Cobertura (peças)</th>
                  <th className="px-2 py-2 text-right">Necessidade (kg)</th>
                </tr>
              </thead>
              <tbody>
                {inoxFilteredRows.map((row) => (
                  <tr
                    key={row.productId}
                    onClick={() => setSelectedInoxProductId(row.productId)}
                    className={`cursor-pointer border-b border-gray-700/60 hover:bg-gray-700/40 ${
                      row.productId === selectedInoxProductId
                        ? "bg-emerald-900/20"
                        : ""
                    }`}
                  >
                    <td className="px-2 py-2">
                      <p className="font-semibold text-sm">{row.productCode}</p>
                      <p className="text-[11px] text-emerald-400">
                        {row.inoxGrade}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-xs">{row.description}</td>
                    <td className="px-2 py-2 text-right">
                      {row.unitWeightKg?.toLocaleString("pt-BR", {
                        maximumFractionDigits: 3,
                      })}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        value={row.demandUnits}
                        onChange={(e) =>
                          handleInoxFieldChange(
                            row.productId,
                            "demandUnits",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        value={row.finishedStockUnits}
                        onChange={(e) =>
                          handleInoxFieldChange(
                            row.productId,
                            "finishedStockUnits",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        value={row.blanksStockUnits}
                        onChange={(e) =>
                          handleInoxFieldChange(
                            row.productId,
                            "blanksStockUnits",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      {formatPieces(row.totalCoverageQty)}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-bold ${
                        row.weightToBuyKg > 0
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {formatKg(row.weightToBuyKg)} kg
                    </td>
                  </tr>
                ))}
                {inoxFilteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-4 text-center text-gray-500"
                    >
                      Nenhum produto inox encontrado para o filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


// Formata quantidade em peças
// Lista de Inox – usa o catálogo vindo por props


export default RawMaterialRequirement;
