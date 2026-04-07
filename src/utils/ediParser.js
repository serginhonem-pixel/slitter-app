/**
 * Parser para arquivos EDI da Usiminas — WEBEDI.TXT e XML.
 *
 * Referência: "Extranet - Web EDI — WebService Acompanhamento da Encomenda"
 *
 * ═══════════ LAYOUT TXT (posições 1-indexadas conforme spec) ═══════════
 *
 * OV1 – 128 chars
 *   1-3    tipo "OV1"
 *   4-13   nº ordem de venda + item (10N)
 *   14-53  referência do pedido (40A)
 *   54-63  prazo desejado (DC/MM/AAAA) (10A)
 *   64-73  prazo confirmado (DC/MM/AAAA) (10A)
 *   74     tipo prazo confirmado (E/F) (1A)
 *   75-109 pedido de compra cliente (35A)
 *   110-114 local de entrega (5N)
 *
 * OV2 – 128 chars
 *   1-3    tipo "OV2"
 *   4-13   nº ordem de venda + item (10N)
 *   14-16  sigla produto (3A) — BQ, BZ, BF, BEG
 *   17-41  descrição produto (25A)
 *   42-81  qualidade/norma (40A)
 *   82-86  espessura (5N, 2dec → ÷100)
 *   87-91  largura (5N, 1dec → ÷10)
 *   92-96  comprimento (5N)
 *   97-106 peso confirmado (10N, kg)
 *   107-116 peso produção (10N, kg)
 *
 * OV3 – 128 chars
 *   1-3    tipo "OV3"
 *   4-13   nº ordem de venda + item
 *   14-23  qtd despachada (10N, kg)
 *   24-33  qtd estoque entreposto (10N, kg)
 *   34-43  qtd trânsito entreposto (10N, kg)
 *   44-53  qtd ag. despacho (10N, kg)
 *   54-63  previsão decêndio 1 (10N, kg)
 *   64-73  previsão decêndio 2 (10N, kg)
 *   74-83  previsão decêndio 3 (10N, kg)
 *   84-93  previsão > decêndio 3 (10N, kg)
 *   94-103 preço negociado R$/ton (10N)
 *   104-113 preço unitário c/ impostos R$/ton (10N)
 */

// Converte data no formato "xD/MM/YYYY" (décadas da siderurgia) para Date.
// "1D" = 1–10, "2D" = 11–20, "3D" = 21–último dia.
function parseDezenaDate(str) {
  if (!str || str.toLowerCase().includes("confirma")) return null;
  const m = str.match(/(\d)D\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const dez = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const day = dez === 1 ? 5 : dez === 2 ? 15 : 25;
  return new Date(year, month - 1, day);
}

// Formata "xD/MM/YYYY" para "01-10/MM/YYYY" etc.
export function formatDezena(str) {
  if (!str) return "—";
  if (str.toLowerCase().includes("confirma")) return "A confirmar";
  const m = str.match(/(\d)D\/(\d{2})\/(\d{4})/);
  if (!m) return str;
  const dez = parseInt(m[1], 10);
  const month = m[2];
  const year = m[3];
  if (dez === 1) return `01-10/${month}/${year}`;
  if (dez === 2) return `11-20/${month}/${year}`;
  return `21-${new Date(parseInt(year), parseInt(month), 0).getDate()}/${month}/${year}`;
}

function safeSubstring(line, start, end) {
  if (line.length < end) return line.substring(start).padEnd(end - start);
  return line.substring(start, end);
}

export function parseUsiminasEdi(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const ordersMap = {};
  let header = null;

  for (const line of lines) {
    const recType = line.substring(0, 3);

    if (recType === "ITP") {
      header = { raw: line.substring(3).trim() };
      continue;
    }
    if (recType === "FTP") continue;

    if (!["OV1", "OV2", "OV3"].includes(recType)) continue;

    const orderNum = line.substring(3, 13).trim();
    if (!ordersMap[orderNum]) {
      ordersMap[orderNum] = { orderNum };
    }

    const rec = ordersMap[orderNum];

    // ─── OV1: dados da ordem de venda ───
    if (recType === "OV1" && line.length >= 73) {
      rec.purchaseRef = safeSubstring(line, 13, 53).trim();          // referência do pedido
      rec.scheduledDateRaw = safeSubstring(line, 53, 63).trim();     // prazo desejado
      rec.deliveryDateRaw = safeSubstring(line, 63, 73).trim();      // prazo confirmado
      rec.scheduledDate = parseDezenaDate(rec.scheduledDateRaw);
      rec.deliveryDate = parseDezenaDate(rec.deliveryDateRaw);
      rec.deliveryType = line.length >= 74 ? line[73].trim() : "";   // E=Entrega, F=Faturamento
      rec.purchaseOrder = line.length >= 109 ? safeSubstring(line, 74, 109).trim() : "";
      rec.deliveryLocation = line.length >= 114 ? safeSubstring(line, 109, 114).trim() : "";
    }

    // ─── OV2: produto e pesos ───
    if (recType === "OV2" && line.length >= 96) {
      rec.productType = safeSubstring(line, 13, 16).trim();          // BQ, BZ, BF, BEG
      rec.productName = safeSubstring(line, 16, 41).trim();          // descrição produto
      rec.materialSpec = safeSubstring(line, 41, 81).trim();         // qualidade/norma

      const thkRaw = parseInt(safeSubstring(line, 81, 86), 10) || 0;
      const widRaw = parseInt(safeSubstring(line, 86, 91), 10) || 0;
      const lenRaw = parseInt(safeSubstring(line, 91, 96), 10) || 0;
      rec.thickness = thkRaw / 100;   // mm (2 dec)
      rec.width = widRaw / 10;        // mm (1 dec)
      rec.length = lenRaw;            // mm

      rec.confirmedWeightKg = line.length >= 106
        ? (parseInt(safeSubstring(line, 96, 106), 10) || 0) : 0;
      rec.productionWeightKg = line.length >= 116
        ? (parseInt(safeSubstring(line, 106, 116), 10) || 0) : 0;
    }

    // ─── OV3: quantidades logísticas e preços ───
    if (recType === "OV3" && line.length >= 93) {
      rec.dispatchedKg     = parseInt(safeSubstring(line, 13, 23), 10) || 0;  // despachado cliente
      rec.warehouseStockKg = parseInt(safeSubstring(line, 23, 33), 10) || 0;  // estoque entreposto
      rec.transitKg        = parseInt(safeSubstring(line, 33, 43), 10) || 0;  // trânsito entreposto
      rec.awaitingDispatchKg = parseInt(safeSubstring(line, 43, 53), 10) || 0; // ag. despacho
      rec.forecastDec1Kg   = parseInt(safeSubstring(line, 53, 63), 10) || 0;  // prev. decêndio 1
      rec.forecastDec2Kg   = parseInt(safeSubstring(line, 63, 73), 10) || 0;  // prev. decêndio 2
      rec.forecastDec3Kg   = parseInt(safeSubstring(line, 73, 83), 10) || 0;  // prev. decêndio 3
      rec.forecastGt3Kg    = parseInt(safeSubstring(line, 83, 93), 10) || 0;  // prev. > 3 dec

      if (line.length >= 113) {
        rec.negotiatedPrice = (parseInt(safeSubstring(line, 93, 103), 10) || 0) / 100;  // R$/ton
        rec.unitPrice       = (parseInt(safeSubstring(line, 103, 113), 10) || 0) / 100; // R$/ton
      }
    }
  }

  // Derivar status de cada pedido
  const orders = Object.values(ordersMap).map((o) => {
    const dispatched = o.dispatchedKg || 0;
    const confirmed = o.confirmedWeightKg || 0;
    const production = o.productionWeightKg || 0;
    const awaitingDispatch = o.awaitingDispatchKg || 0;
    const warehouseStock = o.warehouseStockKg || 0;
    const transit = o.transitKg || 0;
    const refUpper = (o.purchaseRef || "").toUpperCase();
    const nameUpper = (o.productName || "").toUpperCase();
    const poUpper = (o.purchaseOrder || "").toUpperCase();
    const statusUpper = (o.statusOv || "").toUpperCase();
    const matUpper = (o.materialSpec || "").toUpperCase();
    const locUpper = (o.deliveryLocation || "").toUpperCase();
    const isEstoque = refUpper.includes("ESTOQUE");
    const isLeilao = [refUpper, nameUpper, poUpper, statusUpper, matUpper, locUpper].some(f => f.includes("LEIL"));
    const pendingConfirm = (o.deliveryDateRaw || "").toLowerCase().includes("confirma");
    const pendingKg = Math.max(0, confirmed - dispatched);

    // Detectar atraso: prazo confirmado já passou e ainda há saldo pendente
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isOverdue = o.deliveryDate instanceof Date && o.deliveryDate < today && pendingKg > 0;
    const overdueDays = isOverdue ? Math.round((today - o.deliveryDate) / (24 * 60 * 60 * 1000)) : 0;

    // Investimento em trânsito (preço negociado × peso pendente em toneladas)
    const investmentBrl = (o.negotiatedPrice || 0) * (pendingKg / 1000);

    let status = "Programado";
    if (dispatched > 0 && dispatched >= confirmed) {
      status = "Entregue";
    } else if (dispatched > 0) {
      status = "Parcial entregue";
    } else if (awaitingDispatch > 0 || warehouseStock > 0 || transit > 0) {
      status = "Em trânsito";
    } else if (production > 0) {
      status = "Em produção";
    } else if (isEstoque || isLeilao) {
      status = isLeilao ? "Leilão Usiminas" : "Estoque Usiminas";
    } else if (pendingConfirm) {
      status = "A confirmar";
    }

    // Campo de compatibilidade (usado na UI)
    o.description = o.purchaseRef;

    return { ...o, status, isEstoque, isLeilao, pendingKg, isOverdue, overdueDays, investmentBrl };
  });

  // Ordenar por data (mais recentes primeiro)
  orders.sort((a, b) => {
    const da = a.scheduledDate ? a.scheduledDate.getTime() : 0;
    const db = b.scheduledDate ? b.scheduledDate.getTime() : 0;
    return db - da;
  });

  return { header, orders };
}

// ═══════════ PARSER XML (resposta do WebService) ═══════════

export function parseUsiminasXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  // Tentar primeiro encontrar ITEM (sub-itens de cada PEDIDO).
  // Se não existir, usar PEDIDO diretamente (estrutura flat).
  let nodes = doc.querySelectorAll("ITEM");
  if (!nodes.length) {
    nodes = doc.querySelectorAll("PEDIDO");
  }

  // Fallback: se ainda vazio, pode ser que estejam dentro de PEDIDOS > PEDIDO
  if (!nodes.length) {
    nodes = doc.querySelectorAll("PEDIDOS > PEDIDO");
  }

  console.log(`[EDI Parser] Encontrados ${nodes.length} itens no XML (tags tentadas: ITEM, PEDIDO, PEDIDOS>PEDIDO)`);

  const orders = [];

  nodes.forEach((p) => {
    // Se o nó for ITEM, os dados de cabeçalho podem estar no PEDIDO pai
    const parent = p.parentElement?.closest?.("PEDIDO") || p.parentElement || p;
    const tag = (name) => {
      // Busca primeiro no próprio nó, depois no pai (PEDIDO)
      const val = (p.querySelector(name)?.textContent || "").trim();
      if (val) return val;
      if (parent !== p) return (parent.querySelector(name)?.textContent || "").trim();
      return "";
    };
    const num = (name) => parseInt(tag(name), 10) || 0;
    const flt = (name) => parseFloat((tag(name) || "0").replace(",", ".")) || 0;

    const prazoDesejado = tag("PRAZO_DESEJADO");
    const prazoConfirmado = tag("PRAZO_CONFIRMADO");
    const confirmed = num("PESO_CONFIRMADO");
    const production = num("PESO_PRODUCAO");
    const dispatched = num("PESO_DESPACHADO");
    const warehouseStock = num("PESO_ESTOQ_ENTREP");
    const transit = num("PESO_TRANS_ENTREP");
    const awaitingDispatch = num("PESO_AG_DESPACHO");
    const refUpper = tag("SIMBOLO_REFERENCIA").toUpperCase();
    const nameUpper = tag("PRODUTO").toUpperCase();
    const poUpper = tag("PEDIDO_COMPRA").toUpperCase();
    const statusUpper = tag("STATUS").toUpperCase();
    const matUpper = tag("QUALIDADE").toUpperCase();
    const locUpper = tag("LOCAL_ENTREGA").toUpperCase();
    const modalidade = tag("MODALIDADE").toUpperCase();
    const isEstoque = refUpper.includes("ESTOQUE");
    const isLeilao = [refUpper, nameUpper, poUpper, statusUpper, matUpper, locUpper, modalidade].some(f => f.includes("LEIL"));
    const pendingConfirm = !prazoConfirmado || prazoConfirmado === "";
    const pendingKg = Math.max(0, confirmed - dispatched);

    // Detectar atraso
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deliveryDateParsed = parseDezenaDate(prazoConfirmado);
    const isOverdue = deliveryDateParsed instanceof Date && deliveryDateParsed < today && pendingKg > 0;
    const overdueDays = isOverdue ? Math.round((today - deliveryDateParsed) / (24 * 60 * 60 * 1000)) : 0;

    let status = "Programado";
    if (dispatched > 0 && dispatched >= confirmed) status = "Entregue";
    else if (dispatched > 0) status = "Parcial entregue";
    else if (awaitingDispatch > 0 || warehouseStock > 0 || transit > 0) status = "Em trânsito";
    else if (production > 0) status = "Em produção";
    else if (isEstoque || isLeilao) status = isLeilao ? "Leilão Usiminas" : "Estoque Usiminas";
    else if (pendingConfirm) status = "A confirmar";

    const negPrice = flt("PRECO_NEGOC");
    const investmentBrl = negPrice * (pendingKg / 1000);

    orders.push({
      orderNum: tag("NUM_OV") + (tag("ITEM_OV") ? tag("ITEM_OV").padStart(2, "0") : ""),
      statusOv: tag("STATUS"),
      purchaseRef: tag("SIMBOLO_REFERENCIA"),
      purchaseOrder: tag("PEDIDO_COMPRA"),
      productType: tag("SIGLA_PRODUTO"),
      productName: tag("PRODUTO"),
      materialSpec: tag("QUALIDADE"),
      thickness: flt("ESPESSURA"),
      width: flt("LARGURA"),
      length: num("COMPRIMENTO"),
      scheduledDateRaw: prazoDesejado,
      deliveryDateRaw: prazoConfirmado,
      scheduledDate: parseDezenaDate(prazoDesejado),
      deliveryDate: deliveryDateParsed,
      deliveryType: tag("TP_PRAZO_CONFIRMADO"),
      deliveryLocation: tag("LOCAL_ENTREGA"),
      confirmedWeightKg: confirmed,
      productionWeightKg: production,
      dispatchedKg: dispatched,
      warehouseStockKg: warehouseStock,
      transitKg: transit,
      awaitingDispatchKg: awaitingDispatch,
      forecastDec1Kg: Math.round(flt("PESO_PREV_1_DEC") * 1000),
      forecastDec2Kg: Math.round(flt("PESO_PREV_2_DEC") * 1000),
      forecastDec3Kg: Math.round(flt("PESO_PREV_3_DEC") * 1000),
      forecastGt3Kg: Math.round(flt("PESO_PREV_MAIOR_3_DEC") * 1000),
      negotiatedPrice: negPrice,
      unitPrice: flt("PRECO_UNIT_ITEM"),
      clientCode: tag("CLIENTE"),
      cnpj: tag("CNPJ_RECEBEDOR"),
      description: tag("PEDIDO_COMPRA") || tag("SIMBOLO_REFERENCIA"),
      status,
      isEstoque,
      isLeilao,
      pendingKg,
      isOverdue,
      overdueDays,
      investmentBrl,
    });
  });

  orders.sort((a, b) => {
    const da = a.scheduledDate ? a.scheduledDate.getTime() : 0;
    const db = b.scheduledDate ? b.scheduledDate.getTime() : 0;
    return db - da;
  });

  // Debug: listar campos-chave de cada pedido para identificar padrão de leilão
  const leilaoHits = orders.filter(o => o.isLeilao);
  console.log(`[EDI Parser] Leilão detectados: ${leilaoHits.length} de ${orders.length}`);
  if (leilaoHits.length === 0 && orders.length > 0) {
    console.log("[EDI Parser] Nenhum leilão encontrado. Campos do primeiro pedido para referência:", {
      purchaseRef: orders[0].purchaseRef,
      purchaseOrder: orders[0].purchaseOrder,
      productName: orders[0].productName,
      statusOv: orders[0].statusOv,
      materialSpec: orders[0].materialSpec,
      deliveryLocation: orders[0].deliveryLocation,
    });
    // Listar todos os valores únicos de statusOv e purchaseRef
    const uniqueStatus = [...new Set(orders.map(o => o.statusOv))];
    const uniqueRefs = [...new Set(orders.map(o => o.purchaseRef))];
    console.log("[EDI Parser] Status OV únicos:", uniqueStatus);
    console.log("[EDI Parser] Referências únicas:", uniqueRefs);
  }

  return { orders };
}
