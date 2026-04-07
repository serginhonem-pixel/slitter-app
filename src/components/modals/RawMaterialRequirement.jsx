import React, { useEffect, useMemo, useState, useRef } from "react";
import { TrendingUp, FileText, Plus, CheckCircle, X, Tag, Trash2, Upload, Download, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INITIAL_INOX_BLANK_PRODUCTS, matchInoxProductByMeasures } from "../../data/inoxCatalog";
import { deleteFromDb, isLocalHost, loadFromDb, saveToDb, updateInDb } from "../../services/api";
import { parseUsiminasEdi, parseUsiminasXml, formatDezena } from "../../utils/ediParser";

// ajusta o caminho se sua pasta for diferente


const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EDI_THICKNESS_MATCH_TOLERANCE = 0.06;

const isEdiGroupMatch = (groupType, groupThickness, ediType, ediThickness) => {
  if (groupType !== ediType) return false;
  return Math.abs((Number(ediThickness) || 0) - (Number(groupThickness) || 0)) <= EDI_THICKNESS_MATCH_TOLERANCE;
};

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

const normalizeInoxValue = (v) =>
  v === null || v === undefined ? "" : String(v);

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
  const [purchaseTab, setPurchaseTab] = useState("coil"); // "coil" | "inox"
  const [selectedInoxPurchaseId, setSelectedInoxPurchaseId] = useState(null);

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

  const [mpOrders, setMpOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [inoxOrderModalOpen, setInoxOrderModalOpen] = useState(false);
  const [inoxOrderSaving, setInoxOrderSaving] = useState(false);
  const [editingInoxOrderId, setEditingInoxOrderId] = useState(null);
  const [inoxOrderForm, setInoxOrderForm] = useState({
    productId: "",
    date: "",
    qty: "",
    status: "previsto",
    description: "",
    receipts: [],
    notes: "",
  });
  const [inoxReceiptType, setInoxReceiptType] = useState("recebido");
  const [inoxReceiptDate, setInoxReceiptDate] = useState("");
  const [inoxReceiptQty, setInoxReceiptQty] = useState("");
  const [inoxReceiptNf, setInoxReceiptNf] = useState("");
  const [purchaseMonthlyDemand, setPurchaseMonthlyDemand] = useState(0); // kg/mês para projeção rápida
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState(0); // lead time para alerta gráfico
  const [purchaseFilter, setPurchaseFilter] = useState("all"); // all | critical | transit
  const [selectedPurchaseGroup, setSelectedPurchaseGroup] = useState(null);
  const [mpOrderQty, setMpOrderQty] = useState("");
  const [mpOrderDate, setMpOrderDate] = useState("");

  // ---------- ESTADOS EDI USIMINAS ----------
  const [ediOrders, setEdiOrders] = useState([]);
  const [ediFileName, setEdiFileName] = useState("");
  const [ediLoading, setEdiLoading] = useState(false);
  const [ediError, setEdiError] = useState("");
  const [ediSearch, setEdiSearch] = useState("");
  const [ediFilterType, setEdiFilterType] = useState("all");
  const [ediFilterStatus, setEdiFilterStatus] = useState("all");
  const [ediExpandedOrder, setEdiExpandedOrder] = useState(null);
  const [ediSyncMode, setEdiSyncMode] = useState("api"); // "api" | "file"
  const [ediLogin, setEdiLogin] = useState(() => localStorage.getItem("edi_user") || "");
  const [ediSenha, setEdiSenha] = useState("");
  const [ediDateFrom, setEdiDateFrom] = useState("");
  const [ediDateTo, setEdiDateTo] = useState("");
  const [ediLastSync, setEdiLastSync] = useState(null);
  const [ediFormCollapsed, setEdiFormCollapsed] = useState(false);
  const ediFileRef = useRef(null);

  // Sincronizar via WebService SOAP (API proxy)
  const handleEdiSync = async () => {
    if (!ediLogin || !ediSenha) {
      setEdiError("Preencha login e senha do Extranet Usiminas.");
      return;
    }
    setEdiLoading(true);
    setEdiError("");
    try {
      // Salvar usuário (não a senha) para conveniência
      localStorage.setItem("edi_user", ediLogin);
      // Enviar datas vazias para trazer TODOS os pedidos ativos;
      // preencher só se o usuário escolheu datas explicitamente.
      const fromDate = ediDateFrom
        ? new Date(ediDateFrom).toLocaleDateString("pt-BR")
        : "";
      const toDate = ediDateTo
        ? new Date(ediDateTo).toLocaleDateString("pt-BR")
        : "";

      const resp = await fetch("/api/usiminas-edi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: ediLogin,
          senha: ediSenha,
          tipoArquivo: "XML",
          dataInicial: fromDate,
          dataFinal: toDate,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }

      if (!data.content) {
        setEdiError(data.message || "Nenhum dado retornado.");
        setEdiOrders([]);
        return;
      }

      // Tentar parsear como XML primeiro, fallback para TXT
      let orders;
      if (data.content.trim().startsWith("<")) {
        ({ orders } = parseUsiminasXml(data.content));
      } else {
        ({ orders } = parseUsiminasEdi(data.content));
      }
      console.log(`[EDI Sync] ${orders.length} itens parseados do WebService. Conteúdo: ${data.content.length} chars`);
      setEdiOrders(orders);
      setEdiFileName("");
      setEdiLastSync(new Date());
      setEdiFormCollapsed(true);
    } catch (err) {
      setEdiError("Erro ao sincronizar: " + err.message);
    } finally {
      setEdiLoading(false);
    }
  };

  // Upload manual de arquivo WEBEDI.TXT
  const handleEdiUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEdiLoading(true);
    setEdiError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        let orders;
        if (text.trim().startsWith("<") || file.name.toLowerCase().endsWith(".xml")) {
          ({ orders } = parseUsiminasXml(text));
        } else {
          ({ orders } = parseUsiminasEdi(text));
        }
        setEdiOrders(orders);
        setEdiFileName(file.name);
      } catch (err) {
        setEdiError("Erro ao processar arquivo EDI: " + err.message);
        setEdiOrders([]);
      } finally {
        setEdiLoading(false);
      }
    };
    reader.onerror = () => {
      setEdiError("Erro ao ler arquivo.");
      setEdiLoading(false);
    };
    reader.readAsText(file, "latin1");
    e.target.value = "";
  };

  const isLocal = isLocalHost();
  const removeOrder = async (id) => {
    try {
      if (!id) return;
      if (!isLocal) {
        await deleteFromDb("mpOrders", id);
      }
      setMpOrders((prev) => {
        const next = prev.filter((o) => o.id !== id);
        if (isLocal) localStorage.setItem("mpOrdersLocal", JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.error("Erro ao excluir pedido:", err);
      alert("Não foi possível excluir o pedido.");
    }
  };
  const addSimOrder = () => {
    if (!selectedGroup || !mpOrderDate || !mpOrderQty) return;
    const simOrder = {
      id: `SIM-${Date.now()}`,
      groupId: selectedGroup.groupId,
      groupKey: selectedGroup.groupId,
      eta: mpOrderDate,
      weightKg: Number(mpOrderQty) || 0,
      status: "simulacao",
      createdAt: new Date().toISOString(),
    };
    setMpOrders((prev) => {
      const next = [...prev, simOrder];
      if (isLocal) localStorage.setItem("mpOrdersLocal", JSON.stringify(next));
      return next;
    });
    setMpOrderQty("");
    setMpOrderDate("");
  };
  const [orderForm, setOrderForm] = useState({
    groupId: "",
    groupKey: "",
    eta: "",
    weightKg: "",
    price: "",
    qtyBobinas: "1",
    mill: "",
    width: "",
    thickness: "",
    material: "",
    notes: "",
    poNumber: "",
    nfNumber: "",
    incoterm: "",
    paymentTerms: "",
    freightMode: "",
    deliveryAddress: "Filial 01 - Metalosa",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    leadTimeDays: "",
    status: "previsto",
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        if (isLocal) {
          const cached = localStorage.getItem("mpOrdersLocal");
          if (cached) {
            setMpOrders(JSON.parse(cached));
          }
        } else {
          const data = await loadFromDb("mpOrders");
          setMpOrders(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Erro ao carregar pedidos de MP:", error);
        setOrdersError("Não foi possível carregar os pedidos.");
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    setMpOrderQty("");
    setMpOrderDate("");
  }, [selectedMpCode]);

  useEffect(() => {
    const fetchInoxOrders = async () => {
      try {
        if (isLocal) {
          const cached = localStorage.getItem("inoxOrdersLocal");
          if (cached) {
            setInoxIncomingOrders(JSON.parse(cached));
          }
          return;
        }
        const data = await loadFromDb("inoxOrders");
        setInoxIncomingOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar pedidos inox:", error);
      }
    };

    fetchInoxOrders();
  }, [isLocal]);
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
      thickness: p.thickness,
      width: p.width,
      length: p.length,
      measuresLabel: p.measuresLabel,
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
  const [inoxRowDocIds, setInoxRowDocIds] = useState({});
  const [inoxRowsLoading, setInoxRowsLoading] = useState(false);
  const [inoxRowsError, setInoxRowsError] = useState("");

  const mergeSavedInoxRows = (baseRows, savedRows) => {
    const docMap = {};
    const safeSaved = Array.isArray(savedRows) ? savedRows : [];
    const merged = (Array.isArray(baseRows) ? baseRows : []).map((row) => {
      const found = safeSaved.find((s) => s.productId === row.productId);
      if (!found) return row;
      const mergedRow = {
        ...row,
        demandUnits: normalizeInoxValue(
          found.demandUnits ?? row.demandUnits ?? ""
        ),
        finishedStockUnits: normalizeInoxValue(
          found.finishedStockUnits ?? row.finishedStockUnits ?? ""
        ),
        blanksStockUnits: normalizeInoxValue(
          found.blanksStockUnits ?? row.blanksStockUnits ?? ""
        ),
      };
      if (found.id) {
        docMap[row.productId] = found.id;
      }
      return mergedRow;
    });
    return { merged, docMap };
  };

  useEffect(() => {
    const fetchInoxRows = async () => {
      try {
        setInoxRowsLoading(true);
        setInoxRowsError("");

        if (isLocal) {
          const cached = localStorage.getItem("inoxRowsLocal");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setInoxRows((prev) => mergeSavedInoxRows(prev, parsed).merged);
            } catch (err) {
              console.warn("Cache local inox invalido, ignorando.", err);
            }
          }
          return;
        }

        const data = await loadFromDb("inoxBlankRows");
        setInoxRows((prev) => {
          const { merged, docMap } = mergeSavedInoxRows(prev, data);
          setInoxRowDocIds(docMap);
          return merged;
        });
      } catch (error) {
        console.error("Erro ao carregar Inox Blanks:", error);
        setInoxRowsError("Nao foi possivel carregar os dados de inox.");
      } finally {
        setInoxRowsLoading(false);
      }
    };

    fetchInoxRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const persistInoxRow = async (row) => {
    if (!row || !row.productId) return;
    const payload = {
      productId: row.productId,
      demandUnits: normalizeInoxValue(row.demandUnits),
      finishedStockUnits: normalizeInoxValue(row.finishedStockUnits),
      blanksStockUnits: normalizeInoxValue(row.blanksStockUnits),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isLocal) {
        const cached = localStorage.getItem("inoxRowsLocal");
        let items = [];
        if (cached) {
          try {
            items = JSON.parse(cached);
          } catch (err) {
            console.warn("Cache local inox corrompido, recriando.", err);
          }
        }
        const filtered = Array.isArray(items)
          ? items.filter((i) => i.productId !== row.productId)
          : [];
        localStorage.setItem(
          "inoxRowsLocal",
          JSON.stringify([...filtered, payload])
        );
        return;
      }

      const existingId = inoxRowDocIds[row.productId];
      if (existingId) {
        try {
          await updateInDb("inoxBlankRows", existingId, payload);
          return;
        } catch (error) {
          console.warn("Falha ao atualizar, tentando criar novo doc.", error);
        }
      }

      const saved = await saveToDb("inoxBlankRows", payload);
      if (saved?.id) {
        setInoxRowDocIds((prev) => ({ ...prev, [row.productId]: saved.id }));
      }
    } catch (error) {
      console.error("Erro ao salvar inox blanks:", error);
      setInoxRowsError("Nao foi possivel salvar os dados no Firebase.");
    }
  };

  const handleInoxFieldChange = (productId, field, value) => {
    setInoxRows((prev) => {
      let updatedRow = null;
      const next = prev.map((row) => {
        if (row.productId === productId) {
          updatedRow = { ...row, [field]: value };
          return updatedRow;
        }
        return row;
      });
      if (updatedRow) {
        persistInoxRow(updatedRow);
      }
      return next;
    });
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

  // Cruzamento EDI Usiminas × grupo selecionado
  const ediOrdersForGroup = useMemo(() => {
    if (!selectedGroup || !ediOrders.length) return [];
    const groupType = selectedGroup.type.trim().toUpperCase();
    const groupThickness = parseFloat(String(selectedGroup.thickness).replace(",", ".")) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return ediOrders
      .filter((o) => {
        const ediType = (o.productType || "").trim().toUpperCase();
        const ediThickness = parseFloat(o.thickness) || 0;
        return isEdiGroupMatch(groupType, groupThickness, ediType, ediThickness);
      })
      .map((o) => {
        const pendingKg = Math.max(0, (o.confirmedWeightKg || 0) - (o.dispatchedKg || 0));
        // Prazo real conforme EDI (para exibição)
        const rawDate = o.deliveryDate instanceof Date ? o.deliveryDate : null;
        // Se o prazo já passou mas ainda há saldo pendente, tratar como chegando hoje
        const effectiveDate = rawDate
          ? rawDate < today ? today : rawDate
          : null;
        const etaStr = effectiveDate ? effectiveDate.toISOString().slice(0, 10) : null;
        return {
          id: `EDI-${o.orderNum}`,
          groupKey: selectedGroup.groupId,
          eta: etaStr,
          weightKg: pendingKg,
          status: "edi",
          orderNum: o.orderNum,
          purchaseOrder: o.purchaseOrder,
          statusText: o.status,
          deliveryDateRaw: o.deliveryDateRaw,
          etaOverdue: rawDate && rawDate < today, // prazo vencido
          source: "usiminas-edi",
        };
      })
      .filter((o) => o.eta && o.weightKg > 0)
      // Ordenar por data de chegada (mais próxima primeiro)
      .sort((a, b) => new Date(a.eta) - new Date(b.eta));
  }, [selectedGroup, ediOrders]);

  const simOrdersForSelectedGroup = selectedMpCode
    ? mpOrders.filter(
        (o) =>
          (o.status || "previsto").toLowerCase() === "simulacao" &&
          (o.groupKey || o.groupId) === selectedMpCode
      )
    : [];

  // ---------- DEMANDA HISTÓRICA (baseada em consumo de bobinas mãe) ----------
  const historicalDemand = useMemo(() => {
    if (!selectedGroup) return null;
    const groupType = selectedGroup.type.trim().toUpperCase();
    const groupThk = parseFloat(selectedGroup.thickness.replace(",", ".")) || 0;
    const thkTol = 0.06;
    const now = new Date(); now.setHours(0, 0, 0, 0);

    // Iterar sobre TODAS as motherCoils que foram cortadas (consumed ou parcialmente cortadas)
    let totalConsumedKg = 0;
    let coilCount = 0;
    const dates = []; // datas de referência para calcular span

    safeMother.forEach((m) => {
      // Matching: tipo e espessura do grupo
      const meta = getMaterialMetadata(m.code, null);
      const mType = meta.type.toUpperCase();
      const mThk = parseFloat(meta.thickness.replace(",", ".")) || 0;
      if (mType !== groupType || Math.abs(mThk - groupThk) > thkTol) return;

      const orig = Number(m.originalWeight) || 0;
      const rem = Number(m.remainingWeight ?? m.weight) || 0;
      const consumed = orig - rem;
      if (consumed <= 0) return; // nenhum corte feito nesta mãe

      // Parsear data (consumedDate DD/MM/YYYY, entryDate DD/MM/YYYY, ou ISO)
      let dt = null;
      const rawDate = m.consumedDate || m.entryDate || m.date || "";
      if (typeof rawDate === "string" && rawDate.includes("/")) {
        const [d, mo, y] = rawDate.split("/");
        dt = new Date(+y, +mo - 1, +d);
      } else if (rawDate) {
        dt = new Date(rawDate);
      }
      // Firestore Timestamp
      if (!dt && rawDate?.toDate) dt = rawDate.toDate();
      if (dt && !isNaN(dt.getTime())) dates.push(dt);

      totalConsumedKg += consumed;
      coilCount++;
    });

    if (coilCount === 0) return { totalKg: 0, days: 0, daily: 0, weekly: 0, monthly: 0, coilCount: 0 };

    // Calcular span: do registro mais antigo até hoje
    let spanDays;
    if (dates.length >= 2) {
      dates.sort((a, b) => a - b);
      const firstDate = dates[0];
      spanDays = Math.max(1, Math.round((now - firstDate) / (24 * 60 * 60 * 1000)));
    } else if (dates.length === 1) {
      spanDays = Math.max(1, Math.round((now - dates[0]) / (24 * 60 * 60 * 1000)));
    } else {
      // Sem datas, assumir 90 dias
      spanDays = 90;
    }

    const daily = totalConsumedKg / spanDays;
    return {
      totalKg: totalConsumedKg,
      days: spanDays,
      daily,
      weekly: daily * 7,
      monthly: daily * 30,
      coilCount,
    };
  }, [selectedGroup, safeMother, safeMotherCatalog]);

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
  let openOrders = [];
  let openOrdersSummary = { qty: 0, weight: 0, nearest: null };
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

    // Separação de pedidos reais (previsto/firme) e simulação
    const allForGroup = mpOrders.filter(
      (o) =>
        (o.groupKey || o.groupId) === selectedMpCode ||
        (!selectedMpCode && o.groupId)
    );
    activeOrders = [...allForGroup, ...ediOrdersForGroup]; // pedidos manuais + EDI Usiminas
    openOrders = activeOrders.filter((o) => {
      const status = (o.status || "previsto").toLowerCase();
      return status !== "firme" && status !== "simulacao";
    });
    openOrdersSummary.qty = openOrders.length;
    openOrdersSummary.weight = openOrders.reduce((acc, o) => {
      const w = Number(o.actualWeightKg) || Number(o.weightKg) || 0;
      return acc + w;
    }, 0);
    const dates = openOrders
      .map((o) => new Date(o.eta || o.date || 0))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);
    openOrdersSummary.nearest = dates[0] || null;

    const totalIncoming = activeOrders.reduce((acc, o) => {
      const weight = Number(o.actualWeightKg) || Number(o.weightKg) || 0;
      return acc + weight;
    }, 0);

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
        const refDate = o.eta || o.date;
        if (!refDate) return false;
        const oDate = new Date(refDate + "T00:00:00");
        return sameDay(oDate, simDate);
      });

      const inflowQty = inflows.reduce((acc, o) => {
        const weight = Number(o.actualWeightKg) || Number(o.weightKg) || 0;
        return acc + weight;
      }, 0);

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
    const baseMax = Math.max(maxStock, mpMinStock, initialStock);
    const padding = Math.max(baseMax * 0.1, 1);
    const gMin = 0; // ancora o eixo em zero para não distorcer
    const gMax = baseMax + padding;
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

    const rawTicks = [gMax, gMax / 2, gMin];
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
  const openOrderForm = (prefillCode = "", existingOrder = null) => {
    if (existingOrder) {
      setEditingOrderId(existingOrder.id);
      setOrderForm({
        groupId: existingOrder.groupId || "",
        groupKey: existingOrder.groupKey || existingOrder.groupId || "",
        eta: existingOrder.eta || existingOrder.date || "",
        weightKg: existingOrder.weightKg || "",
        price: existingOrder.price || "",
        qtyBobinas: existingOrder.qtyBobinas || "1",
        mill: existingOrder.mill || "",
        width: existingOrder.width || "",
        thickness: existingOrder.thickness || "",
        material: existingOrder.material || "",
        notes: existingOrder.notes || "",
        poNumber: existingOrder.poNumber || "",
        nfNumber: existingOrder.nfNumber || "",
        incoterm: existingOrder.incoterm || "",
        paymentTerms: existingOrder.paymentTerms || "",
        freightMode: existingOrder.freightMode || "",
        deliveryAddress: existingOrder.deliveryAddress || "Filial 01 - Metalosa",
        contactName: existingOrder.contactName || "",
        contactEmail: existingOrder.contactEmail || "",
        contactPhone: existingOrder.contactPhone || "",
        status: existingOrder.status || "previsto",
      });
      setOrderModalOpen(true);
      return;
    }

    const catalogMatch = motherCatalog.find(
      (m) => String(m.code) === String(prefillCode || selectedMpCode)
    );
    const group = coilGroups.find((g) => g.groupId === selectedMpCode);

    setEditingOrderId(null);
    setOrderForm((prev) => ({
      ...prev,
      groupId: prefillCode || selectedMpCode || "",
      groupKey: group?.groupId || selectedMpCode || "",
      eta: "",
      weightKg: "",
      price: "",
      qtyBobinas: "1",
      mill: "",
      width: catalogMatch?.width || "",
      thickness: catalogMatch?.thickness || "",
      material: catalogMatch?.description || "",
      notes: "",
      poNumber: "",
      nfNumber: "",
      incoterm: "",
      paymentTerms: "",
      freightMode: "",
      deliveryAddress: "Filial 01 - Metalosa",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      leadTimeDays: "",
      status: "previsto",
    }));
    setOrderModalOpen(true);
  };

  const handleSaveOrder = async () => {
    if (!orderForm.groupId || !orderForm.weightKg || !orderForm.eta) {
      alert("Informe código da bobina, data prevista e peso.");
      return;
    }

    const payload = {
      groupId: orderForm.groupId,
      groupKey: orderForm.groupKey || selectedMpCode,
      eta: orderForm.eta,
      weightKg: Number(orderForm.weightKg) || 0,
      price: Number(orderForm.price) || 0,
      qtyBobinas: Number(orderForm.qtyBobinas) || 1,
      mill: orderForm.mill || "",
      width: orderForm.width,
      thickness: orderForm.thickness,
      material: orderForm.material,
      notes: orderForm.notes,
      poNumber: orderForm.poNumber,
      nfNumber: orderForm.nfNumber,
      incoterm: orderForm.incoterm,
    paymentTerms: orderForm.paymentTerms,
    freightMode: orderForm.freightMode,
    deliveryAddress: orderForm.deliveryAddress,
    contactName: orderForm.contactName,
    contactEmail: orderForm.contactEmail,
    contactPhone: orderForm.contactPhone,
    leadTimeDays: orderForm.leadTimeDays,
    status: orderForm.status || "previsto",
    createdAt: new Date().toISOString(),
  };

    try {
      setOrderSaving(true);
      if (editingOrderId) {
        // update existing
        if (isLocal) {
          setMpOrders((prev) => {
            const next = prev.map((o) => (o.id === editingOrderId ? { ...o, ...payload } : o));
            localStorage.setItem("mpOrdersLocal", JSON.stringify(next));
            return next;
          });
        } else {
          await updateInDb("mpOrders", editingOrderId, payload);
          setMpOrders((prev) => prev.map((o) => (o.id === editingOrderId ? { ...o, ...payload } : o)));
        }
      } else {
        if (isLocal) {
          const tempSaved = { ...payload, id: `TEMP-${Date.now()}` };
          setMpOrders((prev) => {
            const next = [tempSaved, ...prev];
            localStorage.setItem("mpOrdersLocal", JSON.stringify(next));
            return next;
          });
        } else {
          const saved = await saveToDb("mpOrders", payload);
          setMpOrders((prev) => {
            const next = [saved, ...prev];
            return next;
          });
        }
      }
      setOrderModalOpen(false);
      setEditingOrderId(null);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Não foi possível salvar o pedido. Tente novamente.");
    } finally {
      setOrderSaving(false);
    }
  };

  const markOrderAsFirm = async (orderId) => {
    const found = mpOrders.find((o) => o.id === orderId);
    if (!found) return;
    // Abre modal de edição já com status firme
    openOrderForm(found.groupId || found.groupKey, { ...found, status: "firme" });
  };

  const openInoxOrderForm = (productId, existingOrder = null) => {
    const product = inoxComputedRows.find((row) => row.productId === productId);
    if (existingOrder) {
      setEditingInoxOrderId(existingOrder.id || null);
      setInoxOrderForm({
        productId: existingOrder.productId || productId || "",
        date: existingOrder.date || "",
        qty: existingOrder.qty ?? "",
        status: existingOrder.status || "previsto",
        description: existingOrder.description || product?.description || "",
        receipts: Array.isArray(existingOrder.receipts) ? existingOrder.receipts : [],
        notes: existingOrder.notes || "",
      });
    } else {
      setEditingInoxOrderId(null);
      setInoxOrderForm({
        productId: productId || "",
        date: "",
        qty: "",
        status: "previsto",
        description: product?.description || "",
        receipts: [],
        notes: "",
      });
    }
    setInoxReceiptType("recebido");
    setInoxReceiptDate("");
    setInoxReceiptQty("");
    setInoxReceiptNf("");
    setInoxOrderModalOpen(true);
  };

  const persistInoxOrdersLocal = (orders) => {
    if (!isLocal) return;
    localStorage.setItem("inoxOrdersLocal", JSON.stringify(orders));
  };

  const addReceiptToInoxOrderForm = () => {
    if (!inoxReceiptDate || !inoxReceiptQty) return;
    setInoxOrderForm((prev) => ({
      ...prev,
      receipts: [
        ...(Array.isArray(prev.receipts) ? prev.receipts : []),
        {
          id: `rcpt-${Date.now()}`,
          type: inoxReceiptType || "recebido",
          date: inoxReceiptDate,
          qty: Number(inoxReceiptQty) || 0,
          nfNumber: inoxReceiptNf || "",
        },
      ],
    }));
    setInoxReceiptDate("");
    setInoxReceiptQty("");
    setInoxReceiptNf("");
  };

  const removeReceiptFromInoxOrderForm = (id) => {
    setInoxOrderForm((prev) => ({
      ...prev,
      receipts: (Array.isArray(prev.receipts) ? prev.receipts : []).filter(
        (item) => item.id !== id
      ),
    }));
  };

  const handleSaveInoxOrder = async () => {
    if (!inoxOrderForm.date || !inoxOrderForm.qty) {
      alert("Preencha data e quantidade.");
      return;
    }

    let resolvedProductId = inoxOrderForm.productId;
    let resolvedDescription = inoxOrderForm.description;

    if (!resolvedProductId && inoxOrderForm.description) {
      const match = matchInoxProductByMeasures(inoxOrderForm.description);
      if (match?.id) {
        resolvedProductId = match.id;
        resolvedDescription = match.name || match.inoxGrade || inoxOrderForm.description;
      }
    }

    if (!resolvedProductId) {
      alert("Selecione um produto ou informe a descricao com medidas.");
      return;
    }

    const receipts = Array.isArray(inoxOrderForm.receipts) ? inoxOrderForm.receipts : [];
    const receivedQty = receipts
      .filter((r) => (r.type || "").toLowerCase() === "recebido")
      .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

    const payload = {
      productId: resolvedProductId,
      date: inoxOrderForm.date,
      qty: Number(inoxOrderForm.qty) || 0,
      status: inoxOrderForm.status || "previsto",
      description: resolvedDescription || "",
      receipts,
      receivedQty,
      notes: inoxOrderForm.notes || "",
      updatedAt: new Date().toISOString(),
    };

    setInoxOrderSaving(true);
    try {
      let savedId = editingInoxOrderId;
      if (!isLocal) {
        if (editingInoxOrderId) {
          await updateInDb("inoxOrders", editingInoxOrderId, payload);
        } else {
          const saved = await saveToDb("inoxOrders", payload);
          savedId = saved?.id || editingInoxOrderId;
        }
      }

      setInoxIncomingOrders((prev) => {
        const next = [...prev.filter((o) => o.id !== editingInoxOrderId)];
        next.push({ ...payload, id: savedId || `inox-local-${Date.now()}` });
        persistInoxOrdersLocal(next);
        return next;
      });

      setInoxOrderModalOpen(false);
      setEditingInoxOrderId(null);
    } catch (error) {
      console.error("Erro ao salvar pedido inox:", error);
      alert("Nao foi possivel salvar o pedido.");
    } finally {
      setInoxOrderSaving(false);
    }
  };

  const handleAddInoxOrder = () => {
    const productId = selectedInoxRow?.productId || selectedInoxPurchaseId;
    openInoxOrderForm(productId);
  };

  const removeInoxOrder = async (id) => {
    if (!id) return;
    const order = inoxIncomingOrders.find((o) => o.id === id);
    try {
      if (!isLocal && order?.id && !String(order.id).startsWith("inox-local-")) {
        await deleteFromDb("inoxOrders", id);
      }
      setInoxIncomingOrders((prev) => {
        const next = prev.filter((o) => o.id !== id);
        if (isLocal) localStorage.setItem("inoxOrdersLocal", JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error("Erro ao remover pedido inox:", error);
      alert("Nao foi possivel remover o pedido.");
    }
  };

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
          .sort((a, b) => new Date(a.eta || a.date) - new Date(b.eta || b.date))
          .map((o) => [
            formatDate(o.eta || o.date),
            formatKg(o.actualWeightKg || o.weightKg),
          ]);

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

  const formatInoxMeasures = (row) => {
    if (!row) return "-";
    if (row.measuresLabel) return row.measuresLabel;
    const t = row.thickness ?? "";
    const w = row.width ?? "";
    const l = row.length ?? "";
    if (t === "" && w === "" && l === "") return "-";
    return `${String(t).replace(".", ",")} x ${w} x ${l}`;
  };

  const renderPurchaseStatusPill = (status) => {
    if (status === "Em transito") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-900/50 border border-blue-600 text-blue-100">
          Em transito
        </span>
      );
    }
    if (status === "Pedido feito") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-amber-900/50 border border-amber-600 text-amber-100">
          Pedido feito
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-800 border border-gray-600 text-gray-200">
        Sem pedido
      </span>
    );
  };

  // ---------- RENDER ----------
  return (
    <>
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header + Tabs */}
      <div className="flex gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 items-end">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white flex gap-2 items-center">
            <TrendingUp className="text-indigo-400" />
            {activeTab === "coil"
              ? "SIMULADOR DE PLANEJAMENTO DE COMPRAS – BOBINAS"
              : activeTab === "inox"
              ? "INOX (BLANKS)"
              : "GESTAO DE COMPRAS"}
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
            <button
              type="button"
              onClick={() => setActiveTab("purchases")}
              className={`ml-1 px-3 py-1 text-xs font-semibold rounded-md ${
                activeTab === "purchases"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              Gestão de Compras
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
              <div className="flex justify-between items-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">MP selecionada</p>
                  <p className="text-sm text-white font-semibold">
                    {selectedGroup.type} · {selectedGroup.thickness}mm
                  </p>
                </div>
              </div>

              {openOrdersSummary.qty > 0 && (
                <div className="bg-amber-900/30 border border-amber-700 text-amber-100 rounded-xl px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Pedidos em aberto para esta MP</p>
                      <p className="text-xs text-amber-200/90">
                        {openOrdersSummary.qty} pedido(s) · {formatKg(openOrdersSummary.weight)} kg
                        {openOrdersSummary.nearest
                          ? ` · Próximo: ${openOrdersSummary.nearest.toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const firstCode =
                          selectedGroup.codesIncluded && selectedGroup.codesIncluded.size > 0
                            ? Array.from(selectedGroup.codesIncluded)[0]
                            : selectedGroup.groupId;
                        openOrderForm(firstCode);
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
                    >
                      Ajustar pedidos
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {openOrders.slice(0, 3).map((o) => (
                      <span
                        key={o.id}
                        className="text-[11px] bg-amber-800/60 border border-amber-700 rounded px-2 py-1 flex items-center gap-1"
                      >
                        {formatDate(o.eta || o.date)} · {formatKg(o.weightKg || o.actualWeightKg)} kg
                      </span>
                    ))}
                    {openOrdersSummary.qty > 3 && (
                      <span className="text-[11px] text-amber-200">+{openOrdersSummary.qty - 3} mais</span>
                    )}
                  </div>
                </div>
              )}

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

                  <div className="flex flex-col">
                    <label className="flex flex-col flex-1">
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
                    {historicalDemand && historicalDemand.coilCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const val = mpManualDemandGranularity === "day"
                            ? Math.round(historicalDemand.daily)
                            : mpManualDemandGranularity === "week"
                            ? Math.round(historicalDemand.weekly)
                            : Math.round(historicalDemand.monthly);
                          setMpManualDemandValue(val);
                        }}
                        className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 text-left"
                        title={`Baseado em ${historicalDemand.coilCount} bobinas mãe cortadas · ${formatKg(historicalDemand.totalKg)} kg consumidos em ${historicalDemand.days} dias`}
                      >
                        ↻ Carregar histórico: {formatKg(
                          mpManualDemandGranularity === "day"
                            ? historicalDemand.daily
                            : mpManualDemandGranularity === "week"
                            ? historicalDemand.weekly
                            : historicalDemand.monthly
                        )} kg/{mpManualDemandGranularity === "day" ? "dia" : mpManualDemandGranularity === "week" ? "sem" : "mês"}
                      </button>
                    )}
                    {historicalDemand && historicalDemand.coilCount === 0 && (
                      <span className="mt-1 text-xs text-gray-500">Sem bobinas mãe cortadas neste grupo</span>
                    )}
                  </div>

                  <label className="flex flex-col">
                    Granularidade:
                    <select
                      value={mpManualDemandGranularity}
                      onChange={(e) =>
                        setMpManualDemandGranularity(e.target.value)
                      }
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
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
                      const refDate = o.eta || o.date;
                      if (!refDate) return null;
                      const oDate = new Date(refDate + "T00:00:00");

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
                            +{formatKg(o.weightKg || o.actualWeightKg)} kg
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

              {/* Área de pedidos (simulação simples) */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Pedidos de Bobina (simulação)
                    </h3>
                    <p className="text-sm text-gray-400">
                      Use apenas data prevista e peso para simular entradas.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1">Data prevista</label>
                    <input
                      type="date"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={mpOrderDate}
                      onChange={(e) => setMpOrderDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1">Peso previsto (kg)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={mpOrderQty}
                      onChange={(e) => setMpOrderQty(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-xs text-gray-400 font-semibold mb-1"> </label>
                      <button
                        className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-500 text-white text-sm"
                        onClick={addSimOrder}
                        title="Adicionar apenas na simulação local"
                      >
                        Adicionar simulação
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  Entrada apenas para simulação local. Para pedidos reais, clique em "Gestão de compras".
                </p>
                {simOrdersForSelectedGroup.length > 0 && (
                  <div className="mt-3 bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                    <p className="font-semibold text-white mb-2">Pedidos simulados para o gráfico</p>
                    <div className="flex flex-wrap gap-2">
                      {simOrdersForSelectedGroup.map((o) => (
                          <span
                            key={o.id}
                            className="text-[11px] bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 inline-flex items-center gap-2"
                          >
                            {formatDate(o.eta || o.date)} · {formatKg(o.weightKg)} kg
                            <button
                              onClick={() => removeOrder(o.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Excluir simulação"
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pedidos Usiminas (EDI) cruzados */}
              {ediOrdersForGroup.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-xl border border-orange-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-700/30 border border-orange-700 text-orange-300 text-xs font-semibold">
                      EDI Usiminas
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      Pedidos em aberto — já incluídos no gráfico
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-700">
                          <th className="text-left pb-2 pr-3">OV / Pedido</th>
                          <th className="text-left pb-2 pr-3">Prazo confirmado</th>
                          <th className="text-right pb-2 pr-3">Peso pendente</th>
                          <th className="text-left pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ediOrdersForGroup.map((o) => (
                          <tr key={o.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-1.5 pr-3">
                              <span className="text-white font-medium">{o.orderNum}</span>
                              {o.purchaseOrder && (
                                <span className="text-gray-500 ml-1">· {o.purchaseOrder}</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-orange-300">
                              {o.deliveryDateRaw || formatDate(o.eta)}
                              {o.etaOverdue && (
                                <span className="ml-1 text-[10px] text-red-400 font-medium">(vencido)</span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono text-green-400">
                              {formatKg(o.weightKg)} kg
                            </td>
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                o.statusText === "Em trânsito" ? "bg-blue-800/50 text-blue-300" :
                                o.statusText === "Estoque Usiminas" ? "bg-yellow-800/50 text-yellow-300" :
                                o.statusText === "Em produção" ? "bg-purple-800/50 text-purple-300" :
                                "bg-gray-700 text-gray-300"
                              }`}>
                                {o.statusText || "Programado"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!ediOrders.length && (
                    <p className="text-xs text-gray-500 mt-2">
                      Sincronize a aba <span className="text-orange-400">Usiminas EDI</span> para ver os pedidos.
                    </p>
                  )}
                </div>
              )}
              {!ediOrders.length && selectedGroup && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                  <span className="text-orange-400">⚠</span>
                  Nenhum dado EDI carregado. Acesse a aba{" "}
                  <button
                    className="text-orange-400 underline hover:text-orange-300"
                    onClick={() => setPurchaseTab("edi")}
                  >
                    Usiminas EDI
                  </button>{" "}
                  para sincronizar e ver os pedidos nesta simulação.
                </div>
              )}

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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-400">{g.type}</p>
                    <p className="text-xl font-bold text-white">
                      {g.thickness}mm
                    </p>
                  </div>
                  {g.codesIncluded && g.codesIncluded.size > 0 && (
                    <span className="text-[11px] text-gray-400 bg-gray-900/60 border border-gray-700 rounded px-2 py-1">
                      {Array.from(g.codesIncluded)[0]}
                    </span>
                  )}
                </div>
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

            {(inoxRowsLoading || inoxRowsError) && (
              <div className="mt-2 space-y-1">
                {inoxRowsLoading && (
                  <p className="text-xs text-gray-400">
                    Sincronizando com o Firebase...
                  </p>
                )}
                {inoxRowsError && (
                  <p className="text-xs text-red-400">{inoxRowsError}</p>
                )}
              </div>
            )}

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

      {/* ===================== GESTÃO DE COMPRAS ===================== */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
            <div className="inline-flex rounded-lg bg-gray-900 border border-gray-700 p-1">
              <button
                type="button"
                onClick={() => setPurchaseTab("coil")}
                className={`px-3 py-1 text-xs font-semibold rounded-md ${
                  purchaseTab === "coil"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Bobinas
              </button>
              <button
                type="button"
                onClick={() => setPurchaseTab("inox")}
                className={`ml-1 px-3 py-1 text-xs font-semibold rounded-md ${
                  purchaseTab === "inox"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Inox
              </button>
              <button
                type="button"
                onClick={() => setPurchaseTab("edi")}
                className={`ml-1 px-3 py-1 text-xs font-semibold rounded-md ${
                  purchaseTab === "edi"
                    ? "bg-orange-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Usiminas EDI
              </button>
            </div>
          </div>
          {purchaseTab === "coil" && (
            <>
              {(() => {
            const purchaseOrders = mpOrders
              .filter((o) => (o.status || "previsto").toLowerCase() !== "simulacao")
              .filter((o) => !selectedMpCode || (o.groupKey || o.groupId) === selectedMpCode)
              .sort((a, b) => new Date(a.eta || a.date || 0) - new Date(b.eta || b.date || 0));

            if (!selectedMpCode || purchaseOrders.length === 0) return null;

            const baseStock = (() => {
              const g = coilGroups.find((g) => g.groupId === selectedMpCode);
              return g ? (Number(g.motherStockWeight || 0) + Number(g.b2StockWeight || 0)) : 0;
            })();
            const dailyConsume = (Number(purchaseMonthlyDemand) || 0) / 30;
            const leadTimeDays = Number(defaultLeadTimeDays) || 0;

            const baseDate = new Date();
            baseDate.setHours(0, 0, 0, 0);

            let balance = baseStock;
            const projectionPoints = [{ date: new Date(baseDate), balance, weight: 0 }];
            let prevDate = new Date(baseDate);
            let ruptureDate = null;

            purchaseOrders.forEach((o) => {
              const ref = o.eta || o.date;
              if (!ref) return;
              const d = new Date(ref + "T00:00:00");
              const daysGap = Math.max(0, Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
              if (daysGap > 0 && dailyConsume > 0) {
                balance = Math.max(0, balance - dailyConsume * daysGap);
                if (!ruptureDate && balance <= 0) {
                  ruptureDate = new Date(prevDate.getTime() + Math.ceil(balance / (dailyConsume || 1)) * 24 * 60 * 60 * 1000);
                }
                projectionPoints.push({ date: new Date(d.getTime() - 1), balance, weight: 0 });
              }
              const weight = Number(o.actualWeightKg) || Number(o.weightKg) || 0;
              balance += weight;
              projectionPoints.push({ date: d, balance, weight });
              prevDate = d;
            });

            if (projectionPoints.length === 1) {
              const d = new Date(baseDate);
              d.setDate(d.getDate() + 30);
              projectionPoints.push({ date: d, balance, weight: 0 });
            }

            const gMax = Math.max(...projectionPoints.map((p) => p.balance), baseStock) * 1.1 + 1;
            const gMin = 0;
            const gRange = gMax - gMin || 1;
            const chartW = 1000;
            const chartH = 220;
            const padL = 60, padR = 20, padT = 20, padB = 30;
            const innerW = chartW - padL - padR;
            const innerH = chartH - padT - padB;
            const getX = (i) =>
              padL + (i / Math.max(1, projectionPoints.length - 1)) * innerW;
            const getY = (val) => padT + innerH - ((val - gMin) / gRange) * innerH;

            const projPointsStr = projectionPoints
              .map((p, i) => `${getX(i)},${getY(p.balance)}`)
              .join(" ");

            const projArea = `${projPointsStr} L ${padL + innerW},${padT + innerH} L ${padL},${
              padT + innerH
            } Z`;

            if (!selectedMpCode) return null;

            return null;
          })()}

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Gestão de Compras — Bobinas</h3>
                <p className="text-sm text-gray-400">
                  Visão em tabela com quick view. Clique em uma linha para abrir detalhes e projeção.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {["todos", "criticos", "aguardando"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPurchaseFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      purchaseFilter === f
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-gray-900 border-gray-700 text-gray-300 hover:border-emerald-400"
                    }`}
                  >
                    {f === "todos" && "Todos"}
                    {f === "criticos" && "Críticos"}
                    {f === "aguardando" && "Aguardando entrega"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const monthlyDemand = Number(purchaseMonthlyDemand) || 0;
            const dailyDemand = monthlyDemand > 0 ? monthlyDemand / 30 : 0;
            const groups = coilGroups.map((g) => {
              const stock = (Number(g.motherStockWeight) || 0) + (Number(g.b2StockWeight) || 0);
              const coverageDays = dailyDemand > 0 ? Math.floor(stock / dailyDemand) : 999;
              const groupOrders = mpOrders.filter(
                (o) =>
                  (o.status || "previsto").toLowerCase() !== "simulacao" &&
                  (o.groupId === g.groupId || o.groupKey === g.groupId)
              );
              const hasFirm = groupOrders.some((o) => (o.status || "").toLowerCase() === "firme");
              const hasPred = groupOrders.some((o) => (o.status || "").toLowerCase() !== "firme");

              // Cruzar com EDI Usiminas: mesmo tipo + espessura
              const gType = g.type.trim().toUpperCase();
              const gThick = parseFloat(String(g.thickness).replace(",", ".")) || 0;
              const ediMatches = ediOrders.filter((o) => {
                const oType = (o.productType || "").trim().toUpperCase();
                const oThick = parseFloat(o.thickness) || 0;
                const pendingKg = Math.max(0, (o.confirmedWeightKg || 0) - (o.dispatchedKg || 0));
                return isEdiGroupMatch(gType, gThick, oType, oThick) && pendingKg > 0;
              });
              const hasEdi = ediMatches.length > 0;
              const hasEdiInTransit = ediMatches.some((o) =>
                ["Em trânsito", "Estoque Usiminas", "Em produção"].includes(o.status)
              );

              let purchaseStatus = "Sem pedido";
              if (hasFirm || hasEdiInTransit) purchaseStatus = "Em trânsito";
              else if (hasPred || hasEdi) purchaseStatus = "Pedido feito";

              const minStock = Number(mpMinStock) || 0;
              const coverageTag =
                coverageDays < 10 ? "critico" : coverageDays < 30 ? "alerta" : "ok";
              return { ...g, stock, coverageDays, purchaseStatus, coverageTag, groupOrders, ediMatches };
            });

            const filtered =
              purchaseFilter === "criticos"
                ? groups.filter((g) => g.coverageTag === "critico")
                : purchaseFilter === "aguardando"
                ? groups.filter((g) => g.purchaseStatus !== "Sem pedido")
                : groups;

            const progress = (current, target) => {
              if (target <= 0) return 1;
              return Math.min(1, Math.max(0, current / target));
            };

            const renderStatusPill = (status, ediCount) => {
              const ediTag = ediCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-orange-700/40 border border-orange-700 text-orange-300 font-semibold">
                  EDI {ediCount}
                </span>
              ) : null;
              if (status === "Em trânsito")
                return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-900/50 border border-blue-600 text-blue-100">Em trânsito{ediTag}</span>;
              if (status === "Pedido feito")
                return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-900/50 border border-amber-600 text-amber-100">Pedido feito{ediTag}</span>;
              return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-800 border border-gray-600 text-gray-200">Sem pedido{ediTag}</span>;
            };

            return (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-200">
                    <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Estoque físico</th>
                        <th className="px-3 py-2 text-left">Cobertura (dias)</th>
                        <th className="px-3 py-2 text-left">Status compra</th>
                        <th className="px-3 py-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((g) => {
                        const bar = progress(g.stock, (Number(mpMinStock) || 1) * 2);
                        const coverageClass =
                          g.coverageTag === "critico"
                            ? "text-red-300 bg-red-900/40"
                            : g.coverageTag === "alerta"
                            ? "text-amber-300 bg-amber-900/40"
                            : "text-emerald-300 bg-emerald-900/40";
                        return (
                          <tr
                            key={g.groupId}
                            className="border-b border-gray-700/70 hover:bg-gray-700/40 cursor-pointer"
                            onClick={() => setSelectedPurchaseGroup(g)}
                          >
                            <td className="px-3 py-3">
                              <div className="font-semibold text-white">
                                {g.type} {g.thickness}mm <span className="text-gray-400">· {g.groupId}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {g.codesIncluded ? Array.from(g.codesIncluded).slice(0, 3).join(", ") : ""}
                                {g.codesIncluded && g.codesIncluded.size > 3 ? "..." : ""}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-36 h-2 bg-gray-900 rounded-full overflow-hidden">
                                  <div
                                    className="h-2 bg-emerald-500 rounded-full"
                                    style={{ width: `${bar * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-100">{formatKg(g.stock)} kg</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${coverageClass}`}>
                                {g.coverageDays === 999 ? "—" : `${g.coverageDays}d`}
                              </span>
                            </td>
                            <td className="px-3 py-3">{renderStatusPill(g.purchaseStatus, (g.ediMatches || []).length)}</td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPurchaseGroup(g);
                                }}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs font-semibold"
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                            Nenhum item encontrado para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

    {selectedPurchaseGroup && purchaseTab === "coil" && (() => {
      const g = selectedPurchaseGroup;
      const monthlyDemand = Number(purchaseMonthlyDemand) || 0;
      const dailyDemand = monthlyDemand > 0 ? monthlyDemand / 30 : 0;
      const minStock = Number(mpMinStock) || 0;
      const ordersForGroup = mpOrders.filter(
        (o) =>
          (o.status || "previsto").toLowerCase() !== "simulacao" &&
          (o.groupId === g.groupId || o.groupKey === g.groupId)
      );
      // Cruzar EDI Usiminas para este grupo (tipo + espessura)
      const gType = g.type.trim().toUpperCase();
      const gThick = parseFloat(String(g.thickness).replace(",", ".")) || 0;
      const today = new Date(); today.setHours(0,0,0,0);
      const ediForGroup = ediOrders
        .filter((o) => {
          const oType = (o.productType || "").trim().toUpperCase();
          const oThick = parseFloat(o.thickness) || 0;
          const pendingKg = Math.max(0, (o.confirmedWeightKg || 0) - (o.dispatchedKg || 0));
          return isEdiGroupMatch(gType, gThick, oType, oThick) && pendingKg > 0;
        })
        .map((o) => {
          const rawDate = o.deliveryDate instanceof Date ? o.deliveryDate : null;
          const effectiveDate = rawDate ? (rawDate < today ? today : rawDate) : today;
          return {
            id: `EDI-${o.orderNum}`,
            eta: effectiveDate.toISOString().slice(0, 10),
            weightKg: Math.max(0, (o.confirmedWeightKg || 0) - (o.dispatchedKg || 0)),
            orderNum: o.orderNum,
            purchaseOrder: o.purchaseOrder,
            statusText: o.status,
            deliveryDateRaw: o.deliveryDateRaw,
            etaOverdue: rawDate && rawDate < today,
          };
        });
      const allIncoming = [...ordersForGroup, ...ediForGroup];
      const now = new Date();
      const points = [];
      let balance = (Number(g.motherStockWeight) || 0) + (Number(g.b2StockWeight) || 0);
      for (let i = 0; i <= 120; i += 10) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const incoming = allIncoming
          .filter((o) => {
            const eta = o.eta || o.date;
            if (!eta) return false;
            return new Date(eta) <= d;
          })
          .reduce((sum, o) => sum + (Number(o.actualWeightKg) || Number(o.weightKg) || 0), 0);
        const consumption = dailyDemand * i;
        const projected = Math.max(0, balance + incoming - consumption);
        points.push({ d, projected });
      }
      return (
        <div className="fixed inset-0 bg-black/70 z-40 flex justify-end">
          <div className="w-full md:w-[40%] lg:w-[38%] bg-gray-900 border-l border-gray-700 h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <div className="text-xs uppercase text-gray-400">MP</div>
                <div className="text-lg font-semibold text-white">
                  {g.type} {g.thickness}mm · {g.groupId}
                </div>
                <div className="text-sm text-gray-400">
                  Estoque: {formatKg((Number(g.motherStockWeight) || 0) + (Number(g.b2StockWeight) || 0))} kg
                </div>
              </div>
              <button
                onClick={() => setSelectedPurchaseGroup(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Input de consumo mensal — controla o gráfico de projeção */}
              <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">Consumo mensal (kg):</label>
                <input
                  type="number"
                  min="0"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  placeholder="Ex: 30000"
                  value={purchaseMonthlyDemand || ""}
                  onChange={(e) => setPurchaseMonthlyDemand(e.target.value)}
                />
                {purchaseMonthlyDemand > 0 && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    ≈ {Math.round(purchaseMonthlyDemand / 30)} kg/dia
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-gray-400">Status:</span>
                {(() => {
                  const hasFirm = ordersForGroup.some((o) => (o.status || "").toLowerCase() === "firme");
                  const hasPred = ordersForGroup.some((o) => (o.status || "").toLowerCase() !== "firme");
                  const hasEdiTransit = ediForGroup.some((o) =>
                    ["Em trânsito", "Estoque Usiminas", "Em produção"].includes(o.statusText)
                  );
                  const hasEdi = ediForGroup.length > 0;
                  if (hasFirm || hasEdiTransit) return <span className="text-blue-300">Em trânsito</span>;
                  if (hasPred || hasEdi) return <span className="text-amber-300">Pedido feito</span>;
                  return <span className="text-gray-300">Sem pedido</span>;
                })()}


              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Projeção de estoque{monthlyDemand > 0 ? `` : " (informe o consumo mensal acima)"}</span>
                  <span className="text-xs text-gray-500">Estoque mínimo: {formatKg(minStock)} kg</span>
                </div>
                <svg viewBox="0 0 600 200" className="w-full h-48 bg-gray-900 rounded-lg border border-gray-800">
                  {(() => {
                    const padL = 50;
                    const padR = 10;
                    const padT = 10;
                    const padB = 30;
                    const innerW = 600 - padL - padR;
                    const innerH = 200 - padT - padB;
                    const maxY = Math.max(
                      minStock,
                      ...points.map((p) => p.projected),
                      ((Number(g.motherStockWeight) || 0) + (Number(g.b2StockWeight) || 0)) * 1.2
                    );
                    const getX = (idx) => padL + (innerW / (points.length - 1)) * idx;
                    const getY = (val) => padT + innerH - (innerH * val) / (maxY || 1);
                    const path = points
                      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(p.projected)}`)
                      .join(" ");
                    return (
                      <>
                        <line
                          x1={padL}
                          y1={getY(minStock)}
                          x2={padL + innerW}
                          y2={getY(minStock)}
                          stroke="#f97316"
                          strokeDasharray="4 4"
                        />
                        <path d={path} fill="none" stroke="#60a5fa" strokeWidth={2} />
                        {points.map((p, idx) => (
                          <circle key={idx} cx={getX(idx)} cy={getY(p.projected)} r={3} fill="#60a5fa" />
                        ))}
                        <text x={padL} y={padT + innerH + 16} fill="#9ca3af" fontSize="10" textAnchor="start">
                          {points[0].d.toLocaleDateString("pt-BR")}
                        </text>
                        <text
                          x={padL + innerW}
                          y={padT + innerH + 16}
                          fill="#9ca3af"
                          fontSize="10"
                          textAnchor="end"
                        >
                          {points[points.length - 1].d.toLocaleDateString("pt-BR")}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-400">Pedidos cadastrados</div>
                <div className="flex flex-col gap-2">
                  {ordersForGroup.length === 0 && ediForGroup.length === 0 && (
                    <div className="text-gray-500 text-sm">Nenhum pedido para esta MP.</div>
                  )}
                  {ediForGroup.length > 0 && (
                    <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-700/40 border border-orange-700 text-orange-300">EDI Usiminas</span>
                        <span className="text-xs text-gray-400">{ediForGroup.length} pedido(s) em aberto</span>
                      </div>
                      {ediForGroup.map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-xs text-gray-200">
                          <div>
                            <span className="font-medium text-white">OV {o.orderNum}</span>
                            {o.purchaseOrder && <span className="text-gray-400 ml-1">· {o.purchaseOrder}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-orange-300">
                              {o.deliveryDateRaw || formatDate(o.eta)}
                              {o.etaOverdue && <span className="text-red-400 ml-1">(vencido)</span>}
                            </span>
                            <span className="text-green-400 font-mono">{formatKg(o.weightKg)} kg</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              o.statusText === "Em trânsito" ? "bg-blue-800/50 text-blue-300" :
                              o.statusText === "Estoque Usiminas" ? "bg-yellow-800/50 text-yellow-300" :
                              o.statusText === "Em produção" ? "bg-purple-800/50 text-purple-300" :
                              "bg-gray-700 text-gray-300"
                            }`}>{o.statusText || "Programado"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {ordersForGroup.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">
                          {formatDate(o.eta || o.date)} · {formatKg(o.weightKg)} kg
                        </span>
                        <span className="text-xs text-gray-400">
                          {o.mill || "-"} · {o.width || "-"}mm · {o.thickness || "-"}mm
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openOrderForm(o.groupId || o.groupKey, o)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeOrder(o.id)}
                          className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-white text-xs flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const firstCode =
                      g.codesIncluded && g.codesIncluded.size > 0
                        ? Array.from(g.codesIncluded)[0]
                        : g.groupId;
                    openOrderForm(firstCode);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white text-sm font-semibold flex items-center gap-2"
                >
                  <Plus size={16} /> Novo pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      );
              })()}
            </>
          )}

          {false && (
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">GestÇœo de Compras ƒ?" Inox</h3>
                  <p className="text-sm text-gray-400">
                    Lista de pedidos planejados para inox. Vamos detalhar os campos em seguida.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm text-gray-200">
                  <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Produto</th>
                      <th className="px-3 py-2 text-left">Data prevista</th>
                      <th className="px-3 py-2 text-right">Quantidade (kg)</th>
                      <th className="px-3 py-2 text-right">AÇõÇœo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inoxIncomingOrders
                      .slice()
                      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
                      .map((order) => {
                        const product = inoxComputedRows.find(
                          (row) => row.productId === order.productId
                        );
                        return (
                          <tr key={order.id} className="border-b border-gray-700/70">
                            <td className="px-3 py-3">
                              <div className="font-semibold text-white">
                                {product?.productCode || order.productId}
                              </div>
                              <div className="text-xs text-gray-400">
                                {product?.description || order.description || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {formatDate(order.date)}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {formatKg(order.qty)} kg
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => removeInoxOrder(order.id)}
                                className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-white text-xs"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {inoxIncomingOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">
                          Nenhum pedido inox cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {purchaseTab === "inox" && (
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Gestao de Compras - Inox</h3>
                  <p className="text-sm text-gray-400">
                    Visao em tabela com resumo de estoque, cobertura e pedidos.
                  </p>
                </div>
              </div>
              {(() => {
                const minStock = Number(inoxMinStockKg) || 0;
                const targetDays = Number(inoxTargetDays) || 0;

                const rows = inoxComputedRows.map((row) => {
                  const unitWeight = Number(row.unitWeightKg) || 0;
                  const stockKg = Number(row.totalCoverageQty || 0) * unitWeight;
                  const demandKg = Number(row.demandQty || 0) * unitWeight;
                  const dailyDemand = targetDays > 0 ? demandKg / targetDays : 0;
                  const coverageDays = dailyDemand > 0 ? Math.floor(stockKg / dailyDemand) : 999;
                  const ordersForRow = inoxIncomingOrders.filter(
                    (order) => order.productId === row.productId
                  );
                  const hasFirm = ordersForRow.some(
                    (order) => (order.status || "").toLowerCase() === "firme"
                  );
                  const hasPred = ordersForRow.some(
                    (order) => (order.status || "").toLowerCase() !== "firme"
                  );
                  let purchaseStatus = "Sem pedido";
                  if (hasFirm) purchaseStatus = "Em transito";
                  else if (hasPred) purchaseStatus = "Pedido feito";
                  const coverageTag =
                    coverageDays < 10 ? "critico" : coverageDays < 30 ? "alerta" : "ok";
                  return {
                    ...row,
                    stockKg,
                    coverageDays,
                    purchaseStatus,
                    coverageTag,
                  };
                });

                const filteredRows =
                  purchaseFilter === "criticos"
                    ? rows.filter((row) => row.coverageTag === "critico")
                    : purchaseFilter === "aguardando"
                    ? rows.filter((row) => row.purchaseStatus !== "Sem pedido")
                    : rows;

                const progress = (current, target) => {
                  if (target <= 0) return 1;
                  return Math.min(1, Math.max(0, current / target));
                };

                return (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm text-gray-200">
                      <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Estoque fisico</th>
                          <th className="px-3 py-2 text-left">Cobertura (dias)</th>
                          <th className="px-3 py-2 text-left">Status compra</th>
                          <th className="px-3 py-2 text-right">Acao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => {
                          const bar = progress(row.stockKg, Math.max(minStock, 1) * 2);
                          const coverageClass =
                            row.coverageTag === "critico"
                              ? "text-red-300 bg-red-900/40"
                              : row.coverageTag === "alerta"
                              ? "text-amber-300 bg-amber-900/40"
                              : "text-emerald-300 bg-emerald-900/40";
                          return (
                            <tr
                              key={row.productId}
                              className="border-b border-gray-700/70 hover:bg-gray-700/40 cursor-pointer"
                              onClick={() => {
                                setSelectedInoxProductId(row.productId);
                                setSelectedInoxPurchaseId(row.productId);
                                setPurchaseTab("inox");
                              }}
                            >
                              <td className="px-3 py-3">
                                <div className="font-semibold text-white">
                                  {row.productCode || row.productId}
                                </div>
                              <div className="text-xs text-gray-400">
                                  {row.description || "-"}
                                  {row.inoxGrade ? ` - ${row.inoxGrade}` : ""}
                                  {row.measuresLabel ? ` - ${row.measuresLabel}` : ""}
                              </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-36 h-2 bg-gray-900 rounded-full overflow-hidden">
                                    <div
                                      className="h-2 bg-emerald-500 rounded-full"
                                      style={{ width: `${bar * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-100">
                                    {formatKg(row.stockKg)} kg
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${coverageClass}`}
                                >
                                  {row.coverageDays === 999 ? "INF" : `${row.coverageDays}d`}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                {renderPurchaseStatusPill(row.purchaseStatus)}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInoxProductId(row.productId);
                                    setSelectedInoxPurchaseId(row.productId);
                                    setPurchaseTab("inox");
                                  }}
                                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs font-semibold"
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                              Nenhum item encontrado para este filtro.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ===================== USIMINAS EDI ===================== */}
          {purchaseTab === "edi" && (
            <div className="space-y-4">
              {/* Header + Modos */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEdiFormCollapsed((v) => !v)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title={ediFormCollapsed ? "Expandir configurações" : "Recolher configurações"}
                    >
                      {ediFormCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText size={20} className="text-orange-400" />
                        Usiminas — Acompanhamento de Encomenda
                      </h3>
                      {ediLastSync && ediFormCollapsed && (
                        <p className="text-xs text-gray-400">
                          Última sincronização: {ediLastSync.toLocaleString("pt-BR")}
                        </p>
                      )}
                      {!ediFormCollapsed && (
                        <p className="text-sm text-gray-400">
                          Sincronize diretamente com o WebService Usiminas ou importe o arquivo WEBEDI.TXT.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="inline-flex rounded-lg bg-gray-900 border border-gray-700 p-1">
                    <button
                      type="button"
                      onClick={() => setEdiSyncMode("api")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md ${ediSyncMode === "api" ? "bg-orange-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}
                    >
                      Sincronizar Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdiSyncMode("file")}
                      className={`ml-1 px-3 py-1 text-xs font-semibold rounded-md ${ediSyncMode === "file" ? "bg-orange-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}
                    >
                      Importar Arquivo
                    </button>
                  </div>
                </div>

                {/* === FORMULÁRIO (recolhível) === */}
                {!ediFormCollapsed && (
                <>

                {/* === MODO API === */}
                {ediSyncMode === "api" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Login Extranet</label>
                        <input
                          type="text"
                          value={ediLogin}
                          onChange={(e) => setEdiLogin(e.target.value)}
                          placeholder="Seu usuário"
                          className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Senha</label>
                        <input
                          type="password"
                          value={ediSenha}
                          onChange={(e) => setEdiSenha(e.target.value)}
                          placeholder="Sua senha"
                          className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Data inicial</label>
                        <input
                          type="date"
                          value={ediDateFrom}
                          onChange={(e) => setEdiDateFrom(e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Data final</label>
                        <input
                          type="date"
                          value={ediDateTo}
                          onChange={(e) => setEdiDateTo(e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleEdiSync}
                        disabled={ediLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold"
                      >
                        <Download size={16} />
                        {ediLoading ? "Sincronizando..." : "Sincronizar com Usiminas"}
                      </button>
                      {ediLastSync && (
                        <span className="text-xs text-gray-400">
                          Última sincronização: {ediLastSync.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      A senha não é armazenada. A conexão é feita via WebService SOAP oficial (cvwe.usiminas.com).
                    </p>
                  </div>
                )}

                {/* === MODO ARQUIVO === */}
                {ediSyncMode === "file" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">
                      Baixe o <code className="text-orange-300">WEBEDI.TXT</code> do{" "}
                      <a
                        href="https://extranet.usiminas.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 underline hover:text-orange-300"
                      >
                        Extranet Usiminas
                      </a>{" "}
                      e importe aqui.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        ref={ediFileRef}
                        type="file"
                        accept=".txt,.edi,.TXT,.EDI,.xml,.XML"
                        onChange={handleEdiUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => ediFileRef.current?.click()}
                        disabled={ediLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold"
                      >
                        <Upload size={16} />
                        {ediLoading ? "Processando..." : "Importar WEBEDI.TXT"}
                      </button>
                    </div>
                  </div>
                )}

                </>
                )} {/* fim !ediFormCollapsed */}

                {/* Resultado upload */}
                {ediFileName && (
                  <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                    <FileText size={14} className="text-orange-400" />
                    Arquivo: <span className="text-white font-medium">{ediFileName}</span>
                    <span className="text-gray-500">·</span>
                    <span>{ediOrders.length} pedidos importados</span>
                  </div>
                )}
                {ediError && (
                  <div className="mt-2 text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded border border-red-800">
                    {ediError}
                  </div>
                )}
              </div>

              {ediOrders.length > 0 && (
                <>
                  {/* Filtros */}
                  <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar pedido, produto, referência..."
                        value={ediSearch}
                        onChange={(e) => setEdiSearch(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm w-full"
                      />
                    </div>
                    <select
                      value={ediFilterType}
                      onChange={(e) => setEdiFilterType(e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
                    >
                      <option value="all">Todos os tipos</option>
                      {[...new Set(ediOrders.map((o) => o.productType))].sort().map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={ediFilterStatus}
                      onChange={(e) => setEdiFilterStatus(e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
                    >
                      <option value="all">Todos os status</option>
                      <option value="leilao">Leilão</option>
                      <option value="estoque">Estoque Usiminas</option>
                      <option value="atrasado">Atrasados</option>
                      {[...new Set(ediOrders.map((o) => o.status))].sort().map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resumo KPIs */}
                  {(() => {
                    const totalOrders = ediOrders.length;
                    const totalWeightKg = ediOrders.reduce((s, o) => s + (o.confirmedWeightKg || 0), 0);
                    const totalDispatchedKg = ediOrders.reduce((s, o) => s + (o.dispatchedKg || 0), 0);
                    const totalProductionKg = ediOrders.reduce((s, o) => s + (o.productionWeightKg || 0), 0);
                    const totalPendingKg = ediOrders.reduce((s, o) => s + (o.pendingKg || 0), 0);
                    const leilaoCount = ediOrders.filter((o) => o.isLeilao).length;
                    const leilaoKg = ediOrders.filter((o) => o.isLeilao).reduce((s, o) => s + (o.pendingKg || 0), 0);
                    const overdueCount = ediOrders.filter((o) => o.isOverdue).length;
                    const pendingCount = ediOrders.filter((o) => o.status !== "Entregue" && (o.pendingKg || 0) > 0).length;
                    const totalInvestment = ediOrders.reduce((s, o) => s + (o.investmentBrl || 0), 0);
                    return (
                      <>
                        {/* Linha 1 — KPIs principais: grid fixo 3x2 / 6 colunas */}
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-2xl font-bold text-white">{totalOrders}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Itens no EDI</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-2xl font-bold text-orange-400">{formatKg(totalWeightKg)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Confirmado (kg)</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-2xl font-bold text-blue-400">{formatKg(totalProductionKg)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Em produção (kg)</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{formatKg(totalDispatchedKg)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Despachado (kg)</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Pendentes</div>
                          </div>
                          <div className={`p-3 rounded-xl text-center ${overdueCount > 0 ? "bg-red-900/40 border border-red-700" : "bg-gray-800/80 border border-gray-700"}`}>
                            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-400" : "text-gray-500"}`}>{overdueCount}</div>
                            <div className={`text-xs mt-0.5 ${overdueCount > 0 ? "text-red-300" : "text-gray-500"}`}>Atrasados</div>
                          </div>
                        </div>

                        {/* Linha 2 — Financeiro + Leilão: grid fixo 4 colunas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-xl font-bold text-cyan-400">{formatKg(totalPendingKg)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Saldo pendente (kg)</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-xl font-bold text-yellow-400">{formatMoney(totalInvestment)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Investimento em trânsito</div>
                          </div>
                          <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 text-center">
                            <div className="text-xl font-bold text-gray-300">{formatMoney(totalInvestment / Math.max(1, pendingCount))}</div>
                            <div className="text-xs text-gray-400 mt-0.5">Ticket médio / pedido</div>
                          </div>
                          <div className={`p-3 rounded-xl text-center ${leilaoCount > 0 ? "bg-purple-900/40 border border-purple-600" : "bg-gray-800/80 border border-gray-700"}`}>
                            <div className={`text-xl font-bold ${leilaoCount > 0 ? "text-purple-400" : "text-gray-500"}`}>{leilaoCount}</div>
                            <div className={`text-xs mt-0.5 ${leilaoCount > 0 ? "text-purple-300" : "text-gray-500"}`}>
                              Leilão {leilaoCount > 0 ? `(${formatKg(leilaoKg)} kg)` : ""}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Tabela de pedidos */}
                  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-gray-200">
                        <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Pedido</th>
                            <th className="px-3 py-2 text-left">Produto</th>
                            <th className="px-3 py-2 text-left">Material</th>
                            <th className="px-3 py-2 text-right">Espessura</th>
                            <th className="px-3 py-2 text-right">Largura</th>
                            <th className="px-3 py-2 text-right">Confirmado</th>
                            <th className="px-3 py-2 text-left">Programação</th>
                            <th className="px-3 py-2 text-left">Entrega</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const search = ediSearch.toLowerCase();
                            const applyStatusFilter = (o) => {
                              if (ediFilterStatus === "all") return true;
                              if (ediFilterStatus === "leilao") return o.isLeilao;
                              if (ediFilterStatus === "estoque") return o.isEstoque;
                              if (ediFilterStatus === "atrasado") return o.isOverdue;
                              return o.status === ediFilterStatus;
                            };
                            return ediOrders
                              .filter((o) => {
                                if (ediFilterType !== "all" && o.productType !== ediFilterType) return false;
                                if (!applyStatusFilter(o)) return false;
                                if (search) {
                                  const haystack = [
                                    o.orderNum, o.productName, o.materialSpec,
                                    o.purchaseRef, o.purchaseOrder, o.description,
                                    o.status, o.productType,
                                  ].join(" ").toLowerCase();
                                  if (!haystack.includes(search)) return false;
                                }
                                return true;
                              })
                              .map((o) => {
                                const isExpanded = ediExpandedOrder === o.orderNum;
                                const dispatched = o.dispatchedKg || 0;
                                const confirmed = o.confirmedWeightKg || 0;
                                const production = o.productionWeightKg || 0;
                                const deliveryPct = confirmed > 0 ? Math.min(100, Math.round((dispatched / confirmed) * 100)) : 0;
                                const statusColor =
                                  o.status === "Entregue" ? "bg-emerald-900/50 border-emerald-600 text-emerald-100" :
                                  o.status === "Parcial entregue" ? "bg-blue-900/50 border-blue-600 text-blue-100" :
                                  o.status === "Em trânsito" ? "bg-cyan-900/50 border-cyan-600 text-cyan-100" :
                                  o.status === "Em produção" ? "bg-indigo-900/50 border-indigo-600 text-indigo-100" :
                                  o.status === "Estoque Usiminas" ? "bg-teal-900/50 border-teal-600 text-teal-100" :
                                  o.status === "Leilão Usiminas" ? "bg-purple-900/50 border-purple-600 text-purple-100" :
                                  o.status === "A confirmar" ? "bg-amber-900/50 border-amber-600 text-amber-100" :
                                  "bg-gray-800 border-gray-600 text-gray-200";
                                return (
                                  <React.Fragment key={o.orderNum}>
                                    <tr
                                      className={`border-b border-gray-700/70 hover:bg-gray-700/40 cursor-pointer ${o.isOverdue ? "bg-red-900/20" : ""}`}
                                      onClick={() => setEdiExpandedOrder(isExpanded ? null : o.orderNum)}
                                    >
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1">
                                          {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                          <span className="font-mono text-xs text-orange-300">{o.orderNum}</span>
                                        </div>
                                        <div className="flex gap-1 mt-0.5">
                                          {o.isLeilao && (
                                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-800/60 border border-purple-600 text-purple-200 font-semibold">LEILÃO</span>
                                          )}
                                          {o.isEstoque && !o.isLeilao && (
                                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-teal-800/60 border border-teal-600 text-teal-200 font-semibold">ESTOQUE</span>
                                          )}
                                          {o.isOverdue && (
                                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-800/60 border border-red-600 text-red-200 font-semibold">{o.overdueDays}d ATRASO</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="font-semibold text-white">{o.productType}</div>
                                        <div className="text-xs text-gray-400">{o.productName}</div>
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-gray-300 max-w-[160px] truncate" title={o.materialSpec}>
                                        {o.materialSpec}
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-mono">
                                        {o.thickness ? `${o.thickness.toFixed(2)}mm` : "—"}
                                      </td>
                                      <td className="px-3 py-2.5 text-right font-mono">
                                        {o.width ? `${o.width.toFixed(0)}mm` : "—"}
                                      </td>
                                      <td className="px-3 py-2.5 text-right">
                                        <div className="font-semibold">{formatKg(confirmed)} kg</div>
                                        {production > 0 && (
                                          <div className="text-xs text-blue-400">
                                            {formatKg(production)} prod.
                                          </div>
                                        )}
                                        {dispatched > 0 && (
                                          <div className="text-xs text-emerald-400">
                                            {formatKg(dispatched)} desp.
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs">
                                        {formatDezena(o.scheduledDateRaw)}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs">
                                        {formatDezena(o.deliveryDateRaw)}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className={`px-2 py-1 text-xs rounded-full border ${statusColor}`}>
                                          {o.status}
                                        </span>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr className="bg-gray-900/60">
                                        <td colSpan={9} className="px-4 py-3">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                              <span className="text-gray-400 text-xs">Referência pedido</span>
                                              <div className="text-white">{o.purchaseRef || "—"}</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Pedido compra</span>
                                              <div className="text-white">{o.purchaseOrder || "—"}</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Local entrega</span>
                                              <div className="text-white">{o.deliveryLocation || "—"}</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Tipo prazo</span>
                                              <div className="text-white">{o.deliveryType === "E" ? "Entrega" : o.deliveryType === "F" ? "Faturamento" : "—"}</div>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                                            <div>
                                              <span className="text-gray-400 text-xs">Despachado</span>
                                              <div className="text-white">{formatKg(o.dispatchedKg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Estoque entreposto</span>
                                              <div className="text-white">{formatKg(o.warehouseStockKg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Trânsito entreposto</span>
                                              <div className="text-white">{formatKg(o.transitKg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Ag. despacho</span>
                                              <div className="text-white">{formatKg(o.awaitingDispatchKg || 0)} kg</div>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                                            <div>
                                              <span className="text-gray-400 text-xs">Prev. decêndio 1</span>
                                              <div className="text-white">{formatKg(o.forecastDec1Kg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Prev. decêndio 2</span>
                                              <div className="text-white">{formatKg(o.forecastDec2Kg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Prev. decêndio 3</span>
                                              <div className="text-white">{formatKg(o.forecastDec3Kg || 0)} kg</div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Prev. &gt; 3 dec.</span>
                                              <div className="text-white">{formatKg(o.forecastGt3Kg || 0)} kg</div>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                                            <div>
                                              <span className="text-gray-400 text-xs">Preço negociado (R$/ton)</span>
                                              <div className="text-white">
                                                {o.negotiatedPrice ? `R$ ${o.negotiatedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-400 text-xs">Preço unit. c/ impostos (R$/ton)</span>
                                              <div className="text-white">
                                                {o.unitPrice ? `R$ ${o.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                                              </div>
                                            </div>
                                            {dispatched > 0 && confirmed > 0 && (
                                              <div className="col-span-2">
                                                <span className="text-gray-400 text-xs">Progresso de entrega</span>
                                                <div className="flex items-center gap-3 mt-1">
                                                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-2 bg-emerald-500 rounded-full transition-all"
                                                      style={{ width: `${deliveryPct}%` }}
                                                    />
                                                  </div>
                                                  <span className="text-xs text-gray-300 font-semibold">
                                                    {deliveryPct}%
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          {/* Saldo pendente, investimento e alertas */}
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                                            <div>
                                              <span className="text-gray-400 text-xs">Saldo pendente</span>
                                              <div className={`font-semibold ${(o.pendingKg || 0) > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                                                {formatKg(o.pendingKg || 0)} kg
                                              </div>
                                            </div>
                                            {o.investmentBrl > 0 && (
                                              <div>
                                                <span className="text-gray-400 text-xs">Investimento em trânsito</span>
                                                <div className="text-yellow-300 font-semibold">{formatMoney(o.investmentBrl)}</div>
                                              </div>
                                            )}
                                            {o.isLeilao && (
                                              <div>
                                                <span className="text-gray-400 text-xs">Tipo pedido</span>
                                                <div className="text-purple-300 font-semibold">Leilão</div>
                                              </div>
                                            )}
                                            {o.isOverdue && (
                                              <div>
                                                <span className="text-gray-400 text-xs">Atraso</span>
                                                <div className="text-red-400 font-semibold">{o.overdueDays} dias em atraso</div>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              });
                          })()}
                          {ediOrders.length > 0 && ediOrders.filter((o) => {
                            if (ediFilterType !== "all" && o.productType !== ediFilterType) return false;
                            if (ediFilterStatus !== "all") {
                              if (ediFilterStatus === "leilao" && !o.isLeilao) return false;
                              else if (ediFilterStatus === "estoque" && !o.isEstoque) return false;
                              else if (ediFilterStatus === "atrasado" && !o.isOverdue) return false;
                              else if (!["leilao", "estoque", "atrasado"].includes(ediFilterStatus) && o.status !== ediFilterStatus) return false;
                            }
                            if (ediSearch) {
                              const h = [o.orderNum, o.productName, o.materialSpec, o.purchaseRef, o.purchaseOrder, o.description, o.status, o.productType].join(" ").toLowerCase();
                              if (!h.includes(ediSearch.toLowerCase())) return false;
                            }
                            return true;
                          }).length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                                Nenhum pedido encontrado para este filtro.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {ediOrders.length === 0 && !ediLoading && !ediError && (
                <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                  <Download size={48} className="mx-auto text-gray-500 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-300 mb-2">Nenhum dado carregado</h4>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    Use <strong>"Sincronizar Online"</strong> para buscar dados diretamente do WebService Usiminas,
                    ou <strong>"Importar Arquivo"</strong> para carregar o WEBEDI.TXT manualmente.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>

    {selectedInoxPurchaseId && purchaseTab === "inox" && (() => {
      const row = inoxComputedRows.find(
        (item) => item.productId === selectedInoxPurchaseId
      );
      if (!row) return null;

      const measuresLabel = formatInoxMeasures(row);

      const unitWeight = Number(row.unitWeightKg) || 0;
      const stockKg = Number(row.totalCoverageQty || 0) * unitWeight;
      const demandKg = Number(row.demandQty || 0) * unitWeight;
      const targetDays = Number(inoxTargetDays) || 0;
      const dailyDemand = targetDays > 0 ? demandKg / targetDays : 0;
      const coverageDays = dailyDemand > 0 ? Math.floor(stockKg / dailyDemand) : 999;
      const orders = inoxIncomingOrders
        .filter((order) => order.productId === row.productId)
        .slice()
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      const purchaseStatus = orders.length > 0 ? "Em transito" : "Sem pedido";

      return (
        <div className="fixed inset-0 bg-black/70 z-40 flex justify-end">
          <div className="w-full md:w-[40%] lg:w-[38%] bg-gray-900 border-l border-gray-700 h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <div className="text-xs uppercase text-gray-400">Inox</div>
                <div className="text-lg font-semibold text-white">
                  {row.productCode || row.productId}
                </div>
                <div className="text-sm text-gray-400">
                  Estoque: {formatKg(stockKg)} kg
                  {measuresLabel ? ` - ${measuresLabel}` : ""}
                </div>
              </div>
              <button
                onClick={() => setSelectedInoxPurchaseId(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-gray-400">Status:</span>
                {renderPurchaseStatusPill(purchaseStatus)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase">Cobertura</div>
                  <div className="text-white font-semibold">
                    {coverageDays === 999 ? "INF" : `${coverageDays} dias`}
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase">Consumo diario</div>
                  <div className="text-white font-semibold">
                    {formatKg(dailyDemand)} kg/dia
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-400">Pedidos cadastrados</div>
                <div className="flex flex-col gap-2">
                  {orders.length === 0 && (
                    <div className="text-gray-500 text-sm">Nenhum pedido para este item.</div>
                  )}
                  {orders.map((order) => {
                    const receipts = Array.isArray(order.receipts) ? order.receipts : [];
                    const receivedQty = receipts
                      .filter((r) => (r.type || "").toLowerCase() === "recebido")
                      .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
                    const forecastQty = receipts
                      .filter((r) => (r.type || "").toLowerCase() === "previsto")
                      .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
                    const remainingQty = Math.max(
                      0,
                      (Number(order.qty) || 0) - receivedQty
                    );
                    return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">
                          {formatDate(order.date)} - {formatKg(order.qty)} kg
                        </span>
                        <span className="text-xs text-gray-400">
                          Recebido: {formatKg(receivedQty)} kg | Previsto: {formatKg(forecastQty)} kg | Falta: {formatKg(remainingQty)} kg
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openInoxOrderForm(row.productId, order)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeInoxOrder(order.id)}
                          className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-white text-xs"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-400">Adicionar pedido para este item.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openInoxOrderForm(row.productId)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-semibold"
                >
                  + Novo pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

    {orderModalOpen && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag size={18} className="text-emerald-400" />
                Novo pedido de bobina
              </h3>
              <p className="text-sm text-gray-400">
                Cadastre peso previsto e dados do pedido. Marque como firme quando faturado.
              </p>
            </div>
            <button
              onClick={() => setOrderModalOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Código MP (catálogo)</label>
                <select
                  value={orderForm.groupId}
                  onChange={(e) => {
                  const selected = e.target.value;
                  const catalogMatch = motherCatalog.find((m) => String(m.code) === String(selected));
                  const group = coilGroups.find((g) =>
                    g.codesIncluded ? g.codesIncluded.has(selected) : false
                  );
                  setOrderForm((prev) => ({
                    ...prev,
                    groupId: selected,
                    groupKey: group?.groupId || prev.groupKey || selectedMpCode,
                    width: catalogMatch?.width || prev.width,
                    thickness: catalogMatch?.thickness || prev.thickness,
                    material: catalogMatch?.description || prev.material,
                  }));
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione...</option>
                {motherCatalog.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code} — {m.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Data prevista</label>
              <input
                type="date"
                value={orderForm.eta}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, eta: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Peso previsto (kg)</label>
              <input
                type="number"
                min="0"
                value={orderForm.weightKg}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, weightKg: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Preço (R$/kg)</label>
              <input
                type="number"
                min="0"
                value={orderForm.price}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Usina</label>
              <input
                type="text"
                value={orderForm.mill}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, mill: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Quantidade de bobinas</label>
              <input
                type="number"
                min="1"
                value={orderForm.qtyBobinas}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, qtyBobinas: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Largura (mm)</label>
              <input
                type="number"
                min="0"
                value={orderForm.width}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, width: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Espessura (mm)</label>
              <input
                type="text"
                value={orderForm.thickness}
                onChange={(e) => setOrderForm((prev) => ({ ...prev, thickness: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Status do pedido</label>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="previsto">Previsto</option>
                  <option value="firme">Firme</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Lead time fornecedor (dias)</label>
                <input
                  type="number"
                  min="0"
                  value={orderForm.leadTimeDays}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex: 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4">
              <div>
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Comercial</p>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Pedido de compra (PO)</label>
                <input
                  type="text"
                  value={orderForm.poNumber}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, poNumber: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">NF / ordem</label>
                <input
                  type="text"
                  value={orderForm.nfNumber}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, nfNumber: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Incoterm / Frete</label>
                <input
                  type="text"
                  value={orderForm.incoterm}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, incoterm: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex: CIF, FOB..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Condição de pagamento</label>
                <input
                  type="text"
                  value={orderForm.paymentTerms}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex: 30/60, à vista..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4">
              <div className="md:col-span-3">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Logística e Contato</p>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Modal / Transporte</label>
                <select
                  value={orderForm.freightMode}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, freightMode: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Rodoviário">Rodoviário</option>
                  <option value="Ferroviário">Ferroviário</option>
                  <option value="Aéreo">Aéreo</option>
                  <option value="Coleta">Coleta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Contato comercial</label>
                <input
                  type="text"
                  value={orderForm.contactName}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Nome do vendedor"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">E-mail contato</label>
                <input
                  type="email"
                  value={orderForm.contactEmail}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Telefone contato</label>
                <input
                  type="text"
                  value={orderForm.contactPhone}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4">
              <div className="md:col-span-2">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Entrega</p>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Filial de entrega</label>
                <select
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="Filial 01 - Metalosa">Filial 01 - Metalosa</option>
                  <option value="Filial 08 - Cometa">Filial 08 - Cometa</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2">Material / Observações</p>
                <textarea
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex: aço galv., requisito comercial, detalhes de cor..."
                />
                {orderForm.material && (
                  <p className="text-xs text-gray-500 mt-1">Descrição catálogo: {orderForm.material}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
            <button
              onClick={() => setOrderModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={orderSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {orderSaving ? "Salvando..." : "Salvar pedido"}
            </button>
          </div>
        </div>
      </div>
    )}

    {inoxOrderModalOpen && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag size={18} className="text-emerald-400" />
                Novo pedido de inox
              </h3>
              <p className="text-sm text-gray-400">
                Registre o pedido e marque como firme para salvar no Firebase.
              </p>
            </div>
            <button
              onClick={() => setInoxOrderModalOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Produto inox</label>
                <select
                  value={inoxOrderForm.productId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const nextRow = inoxComputedRows.find((row) => row.productId === nextId);
                    setInoxOrderForm((prev) => ({
                      ...prev,
                      productId: nextId,
                      description: nextRow?.description || prev.description,
                    }));
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Selecione...</option>
                  {inoxComputedRows.map((row) => (
                    <option key={row.productId} value={row.productId}>
                      {row.productCode || row.productId} - {row.description} - {formatInoxMeasures(row)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Descricao do item</label>
                <input
                  type="text"
                  value={inoxOrderForm.description}
                  onChange={(e) =>
                    setInoxOrderForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Ex: BLF PQ 430 0,40x510,00x660 F3 PA"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Data prevista</label>
                <input
                  type="date"
                  value={inoxOrderForm.date}
                  onChange={(e) =>
                    setInoxOrderForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Quantidade (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={inoxOrderForm.qty}
                  onChange={(e) =>
                    setInoxOrderForm((prev) => ({ ...prev, qty: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Status do pedido</label>
                <select
                  value={inoxOrderForm.status}
                  onChange={(e) =>
                    setInoxOrderForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="previsto">Previsto</option>
                  <option value="firme">Firme</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 font-semibold mb-1">Observacoes</label>
                <textarea
                  rows={2}
                  value={inoxOrderForm.notes}
                  onChange={(e) =>
                    setInoxOrderForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <div className="text-xs uppercase text-gray-400 font-semibold">
                Recebimentos e previsoes
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1">Tipo</label>
                  <select
                    value={inoxReceiptType}
                    onChange={(e) => setInoxReceiptType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="recebido">Recebido</option>
                    <option value="previsto">Previsto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1">Data</label>
                  <input
                    type="date"
                    value={inoxReceiptDate}
                    onChange={(e) => setInoxReceiptDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1">Quantidade (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={inoxReceiptQty}
                    onChange={(e) => setInoxReceiptQty(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1">NF</label>
                  <input
                    type="text"
                    value={inoxReceiptNf}
                    onChange={(e) => setInoxReceiptNf(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={addReceiptToInoxOrderForm}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-semibold"
                >
                  + Adicionar registro
                </button>
              </div>
              <div className="space-y-2">
                {(inoxOrderForm.receipts || []).length === 0 && (
                  <div className="text-xs text-gray-500">Nenhum registro adicionado.</div>
                )}
                {(inoxOrderForm.receipts || []).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300"
                  >
                    <div>
                      {entry.type} - {formatDate(entry.date)} - {formatKg(entry.qty)} kg
                      {entry.nfNumber ? ` - NF ${entry.nfNumber}` : ""}
                    </div>
                    <button
                      onClick={() => removeReceiptFromInoxOrderForm(entry.id)}
                      className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-white text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
            <button
              onClick={() => setInoxOrderModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveInoxOrder}
              disabled={inoxOrderSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {inoxOrderSaving ? "Salvando..." : "Salvar pedido"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};


// Formata quantidade em peças
// Lista de Inox – usa o catálogo vindo por props


export default RawMaterialRequirement;
