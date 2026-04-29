import React, { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle, Package, Truck, PlusCircle,
  Edit2, Trash2, X, Save, ChevronDown, ChevronUp, Clock, FileDown,
} from "lucide-react";
import {
  ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer, Brush,
} from "recharts";
import { useTiresData, calcularProjecao, normalizeMes, gerarProximosMeses } from "../../hooks/useTiresData";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
const fmtDate = (d) => {
  if (!d) return "—";
  if (typeof d === "string" && d.includes("/")) return d;
  return d;
};

// ─── Exportação PDF — Projeção ───────────────────────────────────────────────
async function exportProjecaoPDF(projecao, produto) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`Projeção 12 meses — ${produto}`, 14, 16);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["Mês","Est. Inicial","HHT","EAS","GRN","Total Compras","Necessidade","Saldo","Cobertura"]],
    body: projecao.map((r) => [
      r.mes,
      fmt(r.estoqueInicial),
      fmt(r.comprasHHT),
      fmt(r.comprasEAS),
      fmt(r.comprasGRN),
      fmt(r.totalCompras) + (r.qtdEstimados > 0 ? " (~prev)" : ""),
      fmt(r.necessidade) + (r.isMedia ? " (~méd)" : ""),
      fmt(r.saldo),
      r.necessidade > 0 ? `${(r.saldo / r.necessidade).toFixed(1)} m` : "∞",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const saldo = projecao[data.row.index]?.saldo;
        if (saldo < 0) data.cell.styles.textColor = [239, 68, 68];
        else if (saldo < 50000) data.cell.styles.textColor = [245, 158, 11];
        else data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });
  doc.save(`projecao-pneus-${produto.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Exportação Excel — Pedidos ──────────────────────────────────────────────
async function exportPedidosExcel(pedidos, produto) {
  const XLSX = await import("xlsx");
  const filtrados = produto === "todos" ? pedidos : pedidos.filter((p) => p.produto === produto);
  const dados = filtrados.map((p) => ({
    PI: p.pi,
    Fornecedor: p.fornecedor,
    Produto: p.produto,
    Código: p.codigo,
    Quantidade: p.quantidade,
    Aprovação: p.aprovacao || "",
    "Prev. Chegada": p.previsaoChegada || "",
    Embarque: p.embarque || "",
    "Chegada Real": p.chegadaReal || "",
    "Mês Chegada": p.mesChegada || "",
    "Free Time": p.freeTime || "",
    Status: p.status,
    Transportador: p.transportador || "",
    Canal: p.canal || "",
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(wb, `pedidos-pneus-${new Date().toISOString().slice(0,10)}.xlsx`);
}

function diasAteVencer(dateStr) {
  if (!dateStr || dateStr === "-" || dateStr === "A definir") return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((d - hoje) / 86400000);
}

const STATUS_COLOR = {
  "Entregue": "bg-emerald-900/50 border-emerald-600 text-emerald-200",
  "Embarque Confirmado": "bg-blue-900/50 border-blue-600 text-blue-200",
  "Não Entregue": "bg-gray-800 border-gray-600 text-gray-300",
};

const CANAL_COLOR = {
  VERDE: "bg-emerald-700 text-white",
  AMARELO: "bg-yellow-600 text-white",
  VERMELHO: "bg-red-700 text-white",
};

const FORNECEDORES = ["HUATIAN", "EASTERN", "GUANRUI"];
const STATUS_LIST = ["Não Entregue", "Embarque Confirmado", "Entregue"];
const CANAIS = ["VERDE", "AMARELO", "VERMELHO"];

const PRODUTOS_PADRAO = [
  "PNEU 3,25", "PNEU 3,50", "PNEU MACICO",
  "CAMARA DE AR 3", "CAMARA DE AR 3,50",
];

const MESES_OPCOES = (() => {
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                 "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const result = [];
  const hoje = new Date();
  for (let i = -2; i <= 18; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    result.push(`${meses[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`);
  }
  return result;
})();

const PEDIDO_VAZIO = {
  pi: "", fornecedor: "HUATIAN", produto: "PNEU 3,25", codigo: "",
  quantidade: "", previsaoChegada: "", aprovacao: "", embarque: "",
  chegadaReal: "", mesChegada: "", freeTime: "",
  status: "Não Entregue", transportador: "", canal: "VERDE",
};

// ─── Semáforo ───────────────────────────────────────────────────────────────
function Semaforo({ saldo, necessidade }) {
  const cobertura = necessidade > 0 ? (saldo / necessidade) : (saldo >= 0 ? 99 : -1);
  if (saldo < 0) return <span className="text-red-500 font-bold">🔴</span>;
  if (saldo < 50000) return <span className="text-yellow-400 font-bold">🟡</span>;
  return <span className="text-emerald-400 font-bold">🟢</span>;
}

// ─── Visão geral por produto ─────────────────────────────────────────────────
function ProdutoOverviewCard({ produto, pedidos, estoqueBase, selected, onClick }) {
  const projecao = useMemo(
    () => calcularProjecao(produto, pedidos, estoqueBase),
    [produto, pedidos, estoqueBase]
  );

  const saldoAtual = projecao[0]?.estoqueInicial ?? 0;
  const rupturaIdx = projecao.findIndex(r => r.saldo < 0);
  const rupturaMes = rupturaIdx >= 0 ? projecao[rupturaIdx].mes : null;
  const ultimoSaldo = projecao[projecao.length - 1]?.saldo ?? 0;
  const cobertura = rupturaIdx >= 0 ? rupturaIdx : projecao.length;

  const status = rupturaMes
    ? "ruptura"
    : projecao.some(r => r.saldo < 50000)
    ? "atencao"
    : "ok";

  const statusColor = { ruptura: "#ef4444", atencao: "#f59e0b", ok: "#10b981" }[status];
  const statusLabel = { ruptura: "RUPTURA", atencao: "ATENÇÃO", ok: "OK" }[status];

  const sparkData = projecao.map(r => ({ mes: r.mes, saldo: r.saldo }));

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border p-3 transition-all ${
        selected
          ? "border-blue-500 bg-blue-950/40"
          : "border-gray-700 bg-gray-800 hover:border-gray-500"
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-semibold text-white leading-tight">{produto}</span>
        <span style={{ backgroundColor: statusColor + "22", color: statusColor }}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide">
          {statusLabel}
        </span>
      </div>

      {/* Sparkline */}
      <div className="my-2">
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${produto}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={statusColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={statusColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={statusColor}
              strokeWidth={1.5}
              fill={`url(#spark-${produto})`}
              dot={false}
              isAnimationActive={false}
              baseValue={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Saldo atual</p>
          <p className="text-xs font-semibold text-white">{fmt(projecao[0]?.saldo ?? 0)}</p>
        </div>
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Cobertura</p>
          <p className="text-xs font-semibold text-gray-200">
            {`${cobertura} m`}
          </p>
        </div>
        {rupturaMes ? (
          <div className="col-span-2 mt-1">
            <p className="text-[9px] text-red-400 uppercase tracking-wide">Ruptura prevista</p>
            <p className="text-xs font-bold text-red-400">{rupturaMes}</p>
          </div>
        ) : (
          <div className="col-span-2 mt-1">
            <p className="text-[9px] text-gray-500 uppercase tracking-wide">Saldo em 12 meses</p>
            <p className="text-xs font-semibold text-gray-200">{fmt(ultimoSaldo)}</p>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Timeline diária de estoque ─────────────────────────────────────────────
const MESES_IDX = { Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11 };

function parseDateBR(str) {
  if (!str) return null;
  const [d, m, y] = str.split("/");
  if (!d || !m || !y) return null;
  return new Date(+y, +m - 1, +d);
}

function buildEstoqueTimeline(projecao) {
  if (!projecao?.length) return { pontos: [], entregas: [] };

  const pontos = [];
  const entregas = [];
  let saldo = projecao[0].estoqueInicial;

  projecao.forEach((mesData) => {
    const [abrev, anoStr] = mesData.mes.split("/");
    const ano = 2000 + parseInt(anoStr);
    const mes = MESES_IDX[abrev];
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const consumoDiario = (mesData.necessidade || 0) / diasNoMes;
    const diaEntrega = Math.min(15, diasNoMes);
    const keyEntrega = new Date(ano, mes, diaEntrega).toISOString().slice(0, 10);

    if (mesData.totalCompras > 0) {
      entregas.push({ date: keyEntrega, qty: mesData.totalCompras, estimado: mesData.qtdEstimados > 0 });
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const key = new Date(ano, mes, dia).toISOString().slice(0, 10);
      if (dia === diaEntrega && mesData.totalCompras > 0) {
        saldo += mesData.totalCompras;
      }
      saldo -= consumoDiario;
      pontos.push({ date: key, saldo: Math.round(saldo) });
    }
  });

  return { pontos, entregas };
}

// ─── Tela 1 — Dashboard ─────────────────────────────────────────────────────
function Dashboard({ pedidos, estoqueBase, produtos }) {
  const [produtoFiltro, setProdutoFiltro] = useState("PNEU 3,25");
  const [rowExpandida, setRowExpandida] = useState(null);

  const projecao = useMemo(
    () => calcularProjecao(produtoFiltro, pedidos, estoqueBase),
    [produtoFiltro, pedidos, estoqueBase]
  );

  const { pontos, entregas } = useMemo(
    () => buildEstoqueTimeline(projecao),
    [projecao]
  );

  const brushRange = useMemo(() => {
    const rupturaIdx = pontos.findIndex(p => p.saldo < 0);
    if (rupturaIdx <= 0) return { startIndex: 0, endIndex: pontos.length - 1 };
    // Mostra até 30 dias depois da ruptura para contextualizar, mas limita ao tamanho do array
    const endIndex = Math.min(rupturaIdx + 30, pontos.length - 1);
    return { startIndex: 0, endIndex };
  }, [pontos]);

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  const totalTransito = pedidos.filter((p) => p.status !== "Entregue").reduce((s, p) => s + (p.quantidade || 0), 0);
  const semEmbarque = pedidos.filter((p) => p.status === "Não Entregue" && !p.embarque).length;

  const rupturas = useMemo(() => {
    let count = 0;
    for (const prod of produtos) {
      const proj = calcularProjecao(prod, pedidos, estoqueBase);
      const proximosSeis = proj.slice(0, 6);
      if (proximosSeis.some((r) => r.saldo < 0)) count++;
    }
    return count;
  }, [pedidos, estoqueBase, produtos]);

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Truck size={12} /> Em trânsito</span>
          <span className="text-2xl font-bold text-white">{fmt(totalTransito)}</span>
          <span className="text-xs text-gray-500">unidades</span>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><AlertTriangle size={12} /> Sem embarque</span>
          <span className={`text-2xl font-bold ${semEmbarque > 0 ? "text-yellow-400" : "text-white"}`}>{semEmbarque}</span>
          <span className="text-xs text-gray-500">pedidos em risco</span>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1"><AlertTriangle size={12} /> Ruptura prevista</span>
          <span className={`text-2xl font-bold ${rupturas > 0 ? "text-red-400" : "text-emerald-400"}`}>{rupturas}</span>
          <span className="text-xs text-gray-500">produtos nos próx. 6 meses</span>
        </div>
      </div>

      {/* Visão geral — todos os produtos */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Visão Geral — Todos os Produtos</h4>
        <div className="grid grid-cols-5 gap-3">
          {produtos.map((p) => (
            <ProdutoOverviewCard
              key={p}
              produto={p}
              pedidos={pedidos}
              estoqueBase={estoqueBase}
              selected={produtoFiltro === p}
              onClick={() => setProdutoFiltro(p)}
            />
          ))}
        </div>
      </div>

      {/* Gráfico estoque projetado */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h4 className="font-semibold text-white text-sm mb-3">Comportamento do Estoque Projetado — {produtoFiltro}</h4>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={pontos} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="estoqueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getFullYear()).slice(2)}`;
              }}
              interval={Math.max(1, Math.floor(pontos.length / 8))}
            />
            <YAxis
              tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v/1000).toFixed(0)}k` : v}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const saldo = payload.find(p => p.dataKey === "saldo")?.value ?? 0;
                const saldoColor = saldo < 0 ? "#ef4444" : saldo < 50000 ? "#f59e0b" : "#3b82f6";
                const statusLabel = saldo < 0 ? "RUPTURA" : saldo < 50000 ? "ATENÇÃO" : "OK";
                const d = new Date(label + "T00:00:00");

                // Dados do mês correspondente
                const mesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getMonth()];
                const mesKey = `${mesAbrev}/${String(d.getFullYear()).slice(2)}`;
                const mesData = projecao.find(r => r.mes === mesKey);
                const necessidade = mesData?.necessidade ?? 0;
                const cobertura = necessidade > 0 ? (saldo / necessidade) : null;

                // Próxima chegada de pedido
                const idx = pontos.findIndex(p => p.date === label);
                const proximaEntrega = entregas.find(e => e.date > label);
                const diasAteProxima = proximaEntrega
                  ? Math.round((new Date(proximaEntrega.date) - d) / 86400000)
                  : null;

                const chegada = entregas.find(e => e.date === label);

                return (
                  <div style={{ backgroundColor: "#111827", border: `1px solid ${saldoColor}`, borderRadius: 10, padding: "10px 14px", minWidth: 200 }}>
                    <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>
                      {d.toLocaleDateString("pt-BR", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })}
                    </p>

                    {chegada && (
                      <div style={{ backgroundColor: (chegada.estimado ? "#f59e0b" : "#10b981") + "18", borderRadius: 6, padding: "4px 8px", marginBottom: 8, marginTop: 4 }}>
                        <p style={{ color: chegada.estimado ? "#f59e0b" : "#10b981", fontSize: 12, fontWeight: "bold" }}>
                          + {Number(chegada.qty).toLocaleString("pt-BR")} unid. chegando{chegada.estimado ? " (est.)" : ""}
                        </p>
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid #1f2937", paddingTop: 8, marginTop: chegada ? 0 : 4 }}>
                      <p style={{ color: "#9ca3af", fontSize: 10, marginBottom: 2 }}>SALDO PROJETADO</p>
                      <p style={{ color: saldoColor, fontSize: 20, fontWeight: "bold", lineHeight: 1.1 }}>
                        {Number(saldo).toLocaleString("pt-BR")}
                      </p>
                      <span style={{ display:"inline-block", marginTop:4, backgroundColor: saldoColor+"22", color: saldoColor, fontSize:9, fontWeight:"bold", padding:"2px 8px", borderRadius:3, letterSpacing:1 }}>
                        {statusLabel}
                      </span>
                    </div>

                    {(necessidade > 0 || diasAteProxima !== null) && (
                      <div style={{ borderTop: "1px solid #1f2937", paddingTop: 8, marginTop: 8, display: "flex", gap: 16 }}>
                        {necessidade > 0 && (
                          <div>
                            <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 1 }}>CONSUMO/MÊS</p>
                            <p style={{ color: "#e5e7eb", fontSize: 12, fontWeight: "600" }}>{Number(necessidade).toLocaleString("pt-BR")}</p>
                          </div>
                        )}
                        {cobertura !== null && (
                          <div>
                            <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 1 }}>COBERTURA</p>
                            <p style={{ color: cobertura < 1 ? "#ef4444" : cobertura < 2 ? "#f59e0b" : "#e5e7eb", fontSize: 12, fontWeight: "600" }}>
                              {cobertura < 0 ? "—" : `${cobertura.toFixed(1)} m`}
                            </p>
                          </div>
                        )}
                        {diasAteProxima !== null && (
                          <div>
                            <p style={{ color: "#6b7280", fontSize: 9, marginBottom: 1 }}>PRÓX. PEDIDO</p>
                            <p style={{ color: "#e5e7eb", fontSize: 12, fontWeight: "600" }}>{diasAteProxima}d</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: "#9ca3af" }}>{value}</span>}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} name="Ruptura / mínimo" />
            <ReferenceLine
              y={50000}
              stroke="#f97316"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: "Estoque Mínimo (50k)", fill: "#f97316", fontSize: 10, position: "insideBottomLeft" }}
            />
            {entregas.map((e, i) => (
              <ReferenceLine
                key={`${e.date}-${i}`}
                x={e.date}
                stroke={e.estimado ? "#f59e0b" : "#10b981"}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: `+${Number(e.qty).toLocaleString("pt-BR")}`, fill: e.estimado ? "#f59e0b" : "#10b981", fontSize: 10, position: "top" }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="saldo"
              name="Estoque projetado"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#estoqueGrad)"
              baseValue={0}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Brush
              key={`brush-${produtoFiltro}-${brushRange.endIndex}`}
              dataKey="date"
              height={20}
              stroke="#374151"
              fill="#1f2937"
              travellerWidth={6}
              startIndex={brushRange.startIndex}
              endIndex={brushRange.endIndex}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-3">
          Linha azul = saldo de estoque dia a dia. Vermelho tracejado = estoque zero. Laranja = estoque mínimo.
        </p>
      </div>

      {/* Tabela projeção */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h4 className="font-semibold text-white text-sm">Projeção 12 meses — {produtoFiltro}</h4>
          <button
            onClick={() => exportProjecaoPDF(projecao, produtoFiltro)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600"
            title="Exportar PDF"
          >
            <FileDown size={12} /> PDF
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/60">
              <tr>
                {["Mês","Est. Inicial","HHT","EAS","GRN","Total Compras","Necessidade","Saldo","Status","Cobertura"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projecao.map((row) => {
                const cob = row.necessidade > 0 ? (row.saldo / row.necessidade).toFixed(1) : "∞";
                const isOpen = rowExpandida === row.mes;
                return (
                  <React.Fragment key={row.mes}>
                    <tr
                      className="border-t border-gray-700/60 hover:bg-gray-700/30 cursor-pointer select-none"
                      onClick={() => setRowExpandida(isOpen ? null : row.mes)}
                    >
                      <td className="px-3 py-2 font-mono text-gray-300">
                        <span className="flex items-center gap-1">
                          {isOpen
                            ? <ChevronUp size={11} className="text-gray-500 shrink-0" />
                            : <ChevronDown size={11} className="text-gray-500 shrink-0" />}
                          {row.mes}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{fmt(row.estoqueInicial)}</td>
                      <td className="px-3 py-2 text-right text-blue-300">{fmt(row.comprasHHT)}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">{fmt(row.comprasEAS)}</td>
                      <td className="px-3 py-2 text-right text-purple-300">{fmt(row.comprasGRN)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-white">
                        <div className="flex items-center justify-end gap-1">
                          <span>{fmt(row.totalCompras)}</span>
                          {row.qtdEstimados > 0 && (
                            <span
                              title={`${row.qtdEstimados} pedido(s) com chegada estimada — critério: ${(row.criteriosUsados || []).join(", ")}`}
                              className="px-1 py-0.5 text-[9px] rounded bg-amber-900/60 border border-amber-600 text-amber-300 leading-none cursor-help"
                            >
                              ~prev
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={row.isConsumoReal ? "text-emerald-300 font-semibold" : row.isMedia ? "text-gray-400" : "text-orange-300"}>{fmt(row.necessidade)}</span>
                          {row.isConsumoReal && (
                            <span
                              title="Consumo real lançado"
                              className="px-1 py-0.5 text-[9px] rounded bg-emerald-900/60 border border-emerald-600 text-emerald-300 leading-none cursor-help"
                            >
                              real
                            </span>
                          )}
                          {!row.isConsumoReal && row.isMedia && (
                            <span
                              title={`Estimativa: média dos últimos ${row.mesesUsados} mês(es)`}
                              className="px-1 py-0.5 text-[9px] rounded bg-gray-700 border border-gray-500 text-gray-400 leading-none cursor-help"
                            >
                              ~méd
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${row.saldo < 0 ? "text-red-400" : row.saldo < 50000 ? "text-yellow-400" : "text-emerald-400"}`}>
                        {fmt(row.saldo)}
                      </td>
                      <td className="px-3 py-2"><Semaforo saldo={row.saldo} necessidade={row.necessidade} /></td>
                      <td className="px-3 py-2 text-gray-300">{cob} m</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-gray-700 bg-gray-900/60">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="space-y-3">
                            {/* Resumo do mês */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-200">
                                Pedidos previstos para {row.mes}
                              </span>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                                <span>Est. inicial: <span className="text-white font-semibold">{fmt(row.estoqueInicial)}</span></span>
                                <span>Total compras: <span className="text-blue-300 font-semibold">{fmt(row.totalCompras)}</span></span>
                                <span>Necessidade: <span className="text-orange-300 font-semibold">{fmt(row.necessidade)}{row.isMedia ? " (~méd)" : ""}</span></span>
                                <span>Saldo: <span className={`font-semibold ${row.saldo < 0 ? "text-red-400" : row.saldo < 50000 ? "text-yellow-400" : "text-emerald-400"}`}>{fmt(row.saldo)}</span></span>
                              </div>
                            </div>
                            {/* Tabela de pedidos */}
                            {(row.pedidosDoMes || []).length === 0 ? (
                              <p className="text-xs text-gray-500 italic">Nenhum pedido previsto para este mês.</p>
                            ) : (
                              <table className="w-full text-xs border border-gray-700 rounded overflow-hidden">
                                <thead className="bg-gray-800">
                                  <tr>
                                    {["PI","Fornecedor","Qtd","Status","Aprovação","Embarque","Prev. Chegada","Critério"].map((h) => (
                                      <th key={h} className="px-2 py-1.5 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.pedidosDoMes || []).map((p) => {
                                    const fornColor = p.fornecedor === "HUATIAN"
                                      ? "text-blue-300"
                                      : p.fornecedor === "EASTERN"
                                      ? "text-emerald-300"
                                      : "text-purple-300";
                                    return (
                                      <tr key={p.id || p.pi} className="border-t border-gray-700/60 hover:bg-gray-700/20">
                                        <td className="px-2 py-1.5 text-gray-200 font-mono">{p.pi || "—"}</td>
                                        <td className={`px-2 py-1.5 font-semibold ${fornColor}`}>{p.fornecedor}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-white">{fmt(p.quantidade)}</td>
                                        <td className="px-2 py-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLOR[p.status] || "border-gray-600 text-gray-300"}`}>
                                            {p.status}
                                          </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-gray-300">{fmtDate(p.aprovacao) || "—"}</td>
                                        <td className="px-2 py-1.5">
                                          {p.embarque
                                            ? <span className="text-gray-300">{fmtDate(p.embarque)}</span>
                                            : <span className="flex items-center gap-1 text-yellow-400 font-semibold"><AlertTriangle size={10} /> Sem embarque</span>
                                          }
                                        </td>
                                        <td className="px-2 py-1.5 text-gray-300">{fmtDate(p.previsaoChegada) || "—"}</td>
                                        <td className="px-2 py-1.5">
                                          {p._mesEfetivo?.atrasado ? (
                                            <span className="flex flex-col gap-0.5">
                                              <span className="flex items-center gap-1">
                                                <span className="px-1 py-0.5 text-[9px] rounded bg-red-900/60 border border-red-600 text-red-300 leading-none flex items-center gap-0.5">
                                                  <AlertTriangle size={8} /> atrasado
                                                </span>
                                                <span className="text-red-400 font-semibold">{p._mesEfetivo.mesesAtraso}m</span>
                                              </span>
                                              <span className="text-gray-500 text-[10px]">prev: {p._mesEfetivo.mesOriginal}</span>
                                            </span>
                                          ) : p._mesEfetivo?.estimado ? (
                                            <span className="flex items-center gap-1.5">
                                              <span className="px-1 py-0.5 text-[9px] rounded bg-amber-900/60 border border-amber-600 text-amber-300 leading-none">~prev</span>
                                              <span className="text-gray-500">{p._mesEfetivo.criterio}</span>
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-emerald-400">
                                              <CheckCircle size={10} /> Definido
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-700/60 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 text-[9px] rounded bg-emerald-900/60 border border-emerald-600 text-emerald-300 leading-none">real</span>
            <span className="text-xs text-gray-500">= consumo real lançado (substitui simulação)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 text-[9px] rounded bg-gray-700 border border-gray-500 text-gray-400 leading-none">~méd</span>
            <span className="text-xs text-gray-500">= necessidade estimada (média 3 meses)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 text-[9px] rounded bg-amber-900/60 border border-amber-600 text-amber-300 leading-none">~prev</span>
            <span className="text-xs text-gray-500">= chegada estimada (embarque+30d / previsão chegada / aprovação+90d)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tela 2 — Pedidos em Aberto ─────────────────────────────────────────────
function PedidosAbertos({ pedidos, produtos, onEdit, onDelete }) {
  const [filtProd, setFiltProd] = useState("todos");
  const [filtForn, setFiltForn] = useState("todos");
  const [filtStatus, setFiltStatus] = useState("abertos");
  const [search, setSearch] = useState("");

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtStatus === "abertos" && p.status === "Entregue") return false;
      if (filtStatus !== "abertos" && filtStatus !== "todos" && p.status !== filtStatus) return false;
      if (filtProd !== "todos" && p.produto !== filtProd) return false;
      if (filtForn !== "todos" && p.fornecedor !== filtForn) return false;
      if (search) {
        const h = [p.pi, p.fornecedor, p.produto, p.status, p.mesChegada].join(" ").toLowerCase();
        if (!h.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [pedidos, filtProd, filtForn, filtStatus, search]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-xs w-40"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs" value={filtStatus} onChange={(e) => setFiltStatus(e.target.value)}>
          <option value="abertos">Em aberto</option>
          <option value="todos">Todos</option>
          {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs" value={filtProd} onChange={(e) => setFiltProd(e.target.value)}>
          <option value="todos">Todos produtos</option>
          {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs" value={filtForn} onChange={(e) => setFiltForn(e.target.value)}>
          <option value="todos">Todos fornecedores</option>
          {FORNECEDORES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtrados.length} pedidos</span>
        <button
          onClick={() => exportPedidosExcel(filtrados, "todos")}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700"
          title="Exportar Excel"
        >
          <FileDown size={12} /> Excel
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/60 sticky top-0 z-10">
              <tr>
                {["PI","Fornecedor","Produto","Qtd","Aprovação","Prev. Chegada","Embarque","Mês Chegada","Free Time","Status","Canal",""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const diasFT = diasAteVencer(p.freeTime);
                const ftAlerta = diasFT !== null && diasFT <= 7;
                const semEmbarque = p.status !== "Entregue" && !p.embarque;
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-700/60 hover:bg-gray-700/30 ${semEmbarque ? "bg-yellow-900/10" : ""}`}
                  >
                    <td className="px-3 py-2 font-mono text-orange-300 font-semibold">{p.pi}</td>
                    <td className="px-3 py-2 text-gray-300">{p.fornecedor}</td>
                    <td className="px-3 py-2 text-white">{p.produto}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.quantidade)}</td>
                    <td className="px-3 py-2 text-gray-300">{fmtDate(p.aprovacao) || "—"}</td>
                    <td className="px-3 py-2 text-gray-300">{fmtDate(p.previsaoChegada)}</td>
                    <td className="px-3 py-2">
                      {p.embarque
                        ? <span className="text-gray-300">{fmtDate(p.embarque)}</span>
                        : <span className="text-yellow-400 font-semibold flex items-center gap-1"><AlertTriangle size={10} /> Sem data</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-gray-300">{p.mesChegada || "—"}</td>
                    <td className="px-3 py-2">
                      {p.freeTime && p.freeTime !== "-"
                        ? <span className={`${ftAlerta ? "text-red-400 font-bold" : "text-gray-300"} flex items-center gap-1`}>
                            {ftAlerta && <Clock size={10} />}
                            {fmtDate(p.freeTime)}
                            {diasFT !== null && <span className="text-gray-500 ml-1">({diasFT}d)</span>}
                          </span>
                        : <span className="text-gray-500">—</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_COLOR[p.status] || "bg-gray-700 border-gray-500 text-gray-300"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {p.canal && p.canal !== "-"
                        ? <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CANAL_COLOR[p.canal] || "bg-gray-700 text-white"}`}>{p.canal}</span>
                        : <span className="text-gray-500">—</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(p)} className="p-1 text-gray-400 hover:text-blue-400 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => onDelete(p.id)} className="p-1 text-gray-400 hover:text-red-400 rounded"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tela 3 — Formulário de Pedido ──────────────────────────────────────────
function FormPedido({ pedido, produtos, onSave, onCancel }) {
  const [form, setForm] = useState({ ...PEDIDO_VAZIO, ...pedido });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const allProdutos = useMemo(() => [...new Set([...PRODUTOS_PADRAO, ...produtos])].sort(), [produtos]);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
        <PlusCircle size={16} className="text-yellow-400" />
        {pedido?.id ? "Editar Pedido" : "Novo Pedido (PI)"}
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        {[
          { label: "PI *", key: "pi", type: "text", placeholder: "Ex: 158/26" },
          { label: "Código", key: "codigo", type: "text" },
          { label: "Quantidade *", key: "quantidade", type: "number" },
          { label: "Previsão Chegada", key: "previsaoChegada", type: "text", placeholder: "DD/MM/AAAA" },
          { label: "Aprovação", key: "aprovacao", type: "text", placeholder: "DD/MM/AAAA" },
          { label: "Embarque", key: "embarque", type: "text", placeholder: "DD/MM/AAAA" },
          { label: "Chegada Real", key: "chegadaReal", type: "text", placeholder: "DD/MM/AAAA" },
          { label: "Free Time", key: "freeTime", type: "text", placeholder: "DD/MM/AAAA" },
          { label: "Transportador", key: "transportador", type: "text" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="block text-gray-400 mb-1">{label}</label>
            <input
              type={type}
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white"
              placeholder={placeholder || ""}
              value={form[key]}
              onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)}
            />
          </div>
        ))}
        <div>
          <label className="block text-gray-400 mb-1">Fornecedor *</label>
          <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)}>
            {FORNECEDORES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Produto *</label>
          <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={form.produto} onChange={(e) => set("produto", e.target.value)}>
            {allProdutos.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Mês Chegada</label>
          <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={form.mesChegada} onChange={(e) => set("mesChegada", e.target.value)}>
            <option value="">A definir</option>
            {MESES_OPCOES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Status</label>
          <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS_LIST.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Canal</label>
          <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={form.canal} onChange={(e) => set("canal", e.target.value)}>
            <option value="">—</option>
            {CANAIS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 flex items-center gap-1">
          <X size={12} /> Cancelar
        </button>
        <button
          onClick={() => {
            if (!form.pi || !form.quantidade) return alert("PI e Quantidade são obrigatórios.");
            onSave(form);
          }}
          className="px-4 py-2 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white font-semibold flex items-center gap-1"
        >
          <Save size={12} /> Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Tela 4 — Atualizar Produção ─────────────────────────────────────────────
function AtualizarProducao({ produtos, prodHistorico, consumoHistorico, onUpdate, onUpdateConsumo }) {
  const [produto, setProduto] = useState(produtos[0] || "PNEU 3,25");
  const [mes, setMes] = useState(MESES_OPCOES[2] || "");
  const [valor, setValor] = useState("");

  const [produtoC, setProdutoC] = useState(produtos[0] || "PNEU 3,25");
  const [mesC, setMesC] = useState(MESES_OPCOES[2] || "");
  const [valorC, setValorC] = useState("");

  const allProdutos = useMemo(() => [...new Set([...PRODUTOS_PADRAO, ...produtos])].sort(), [produtos]);

  return (
    <div className="space-y-4">
      {/* Bloco 1 — Produção real lançada */}
      <div className="bg-gray-800 rounded-xl border border-emerald-800/60 p-5">
        <h4 className="font-semibold text-white mb-1 flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs rounded bg-emerald-700 text-white font-bold">REAL</span>
          Lançar Produção Real
        </h4>
        <p className="text-xs text-gray-400 mb-4">Desconta do estoque o que foi efetivamente produzido. Substitui a simulação no mês informado.</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">Produto</label>
            <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={produtoC} onChange={(e) => setProdutoC(e.target.value)}>
              {allProdutos.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Mês</label>
            <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={mesC} onChange={(e) => setMesC(e.target.value)}>
              {MESES_OPCOES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Qtd. produzida (unid.)</label>
            <input
              type="number"
              className="w-full bg-gray-900 border border-emerald-700 rounded px-2 py-1.5 text-white"
              value={valorC}
              onChange={(e) => setValorC(e.target.value)}
              placeholder="Ex: 72500"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              if (!produtoC || !mesC || !valorC) return;
              onUpdateConsumo(produtoC, mesC, Number(valorC));
              setValorC("");
            }}
            className="px-4 py-2 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1"
          >
            <Save size={12} /> Lançar
          </button>
        </div>
      </div>

      {/* Bloco 2 — Necessidade simulada */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h4 className="font-semibold text-white mb-1 flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs rounded bg-orange-700 text-white font-bold">SIM</span>
          Necessidade de Produção (Simulação)
        </h4>
        <p className="text-xs text-gray-400 mb-4">Valor de planejamento usado na projeção quando não há lançamento real.</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">Produto</label>
            <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={produto} onChange={(e) => setProduto(e.target.value)}>
              {allProdutos.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Mês</label>
            <select className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES_OPCOES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Necessidade (unid.)</label>
            <input
              type="number"
              className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 90000"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              if (!produto || !mes || !valor) return;
              onUpdate(produto, mes, Number(valor));
              setValor("");
            }}
            className="px-4 py-2 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white font-semibold flex items-center gap-1"
          >
            <Save size={12} /> Atualizar
          </button>
        </div>
      </div>

      {/* Históricos lado a lado */}
      <div className="grid grid-cols-2 gap-4">
        {consumoHistorico.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-emerald-800/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h4 className="text-sm font-semibold text-white">Lançamentos Reais</h4>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-900/60">
                <tr>{["Produto","Mês","Qtd","Data"].map((h) => <th key={h} className="px-3 py-2 text-left text-gray-400">{h}</th>)}</tr>
              </thead>
              <tbody>
                {consumoHistorico.map((r, i) => (
                  <tr key={i} className="border-t border-gray-700/60">
                    <td className="px-3 py-2 text-white">{r.produto}</td>
                    <td className="px-3 py-2 text-gray-300">{r.mes}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{fmt(r.valor)}</td>
                    <td className="px-3 py-2 text-gray-400">{new Date(r.timestamp).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {prodHistorico.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h4 className="text-sm font-semibold text-white">Simulações Atualizadas</h4>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-900/60">
                <tr>{["Produto","Mês","Valor","Data"].map((h) => <th key={h} className="px-3 py-2 text-left text-gray-400">{h}</th>)}</tr>
              </thead>
              <tbody>
                {prodHistorico.map((r, i) => (
                  <tr key={i} className="border-t border-gray-700/60">
                    <td className="px-3 py-2 text-white">{r.produto}</td>
                    <td className="px-3 py-2 text-gray-300">{r.mes}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{fmt(r.valor)}</td>
                    <td className="px-3 py-2 text-gray-400">{new Date(r.timestamp).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function TireManagement() {
  const {
    pedidos, estoqueBase, prodHistorico, consumoHistorico, produtos,
    addPedido, updatePedido, deletePedido, updateNecessidade, updateConsumoReal,
  } = useTiresData();

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const [subTab, setSubTab] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editPedido, setEditPedido] = useState(null);

  const allProdutos = useMemo(() => [...new Set([...PRODUTOS_PADRAO, ...produtos])].sort(), [produtos]);

  const handleSave = async (form) => {
    if (form.id) {
      await updatePedido(form.id, form);
    } else {
      await addPedido(form);
    }
    setShowForm(false);
    setEditPedido(null);
  };

  const handleEdit = (p) => {
    setEditPedido(p);
    setShowForm(true);
    setSubTab("pedidos");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este pedido?")) return;
    await deletePedido(id);
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "pedidos", label: "Pedidos em Aberto" },
    { id: "cadastro", label: "Novo PI" },
    { id: "producao", label: "Atualizar Produção" },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-navegação + botão sync */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg bg-gray-900 border border-gray-700 p-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSubTab(t.id); if (t.id !== "cadastro") { setShowForm(false); setEditPedido(null); } else { setShowForm(true); } }}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                subTab === t.id
                  ? "bg-yellow-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Conteúdo */}
      {subTab === "dashboard" && (
        <Dashboard pedidos={pedidos} estoqueBase={estoqueBase} produtos={allProdutos} />
      )}

      {subTab === "pedidos" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setEditPedido(null); setShowForm((v) => !v); }}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-yellow-600 hover:bg-yellow-500 text-white flex items-center gap-1"
            >
              <PlusCircle size={13} /> Novo PI
            </button>
          </div>
          {showForm && (
            <FormPedido
              pedido={editPedido}
              produtos={allProdutos}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditPedido(null); }}
            />
          )}
          <PedidosAbertos pedidos={pedidos} produtos={allProdutos} onEdit={handleEdit} onDelete={handleDelete} />
        </>
      )}

      {subTab === "cadastro" && (
        <FormPedido
          pedido={editPedido}
          produtos={allProdutos}
          onSave={(form) => { handleSave(form); setSubTab("pedidos"); }}
          onCancel={() => setSubTab("pedidos")}
        />
      )}

      {subTab === "producao" && (
        <AtualizarProducao
          produtos={allProdutos}
          prodHistorico={prodHistorico}
          consumoHistorico={consumoHistorico}
          onUpdate={updateNecessidade}
          onUpdateConsumo={updateConsumoReal}
        />
      )}
    </div>
  );
}
