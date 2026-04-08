import React, { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle, Package, Truck, PlusCircle,
  Edit2, Trash2, X, Save, ChevronDown, ChevronUp, Clock, CloudUpload, Loader,
} from "lucide-react";
import { useTiresData, calcularProjecao, normalizeMes, gerarProximosMeses } from "../../hooks/useTiresData";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");
const fmtDate = (d) => {
  if (!d) return "—";
  if (typeof d === "string" && d.includes("/")) return d;
  return d;
};

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

// ─── Tela 1 — Dashboard ─────────────────────────────────────────────────────
function Dashboard({ pedidos, estoqueBase, produtos }) {
  const [produtoFiltro, setProdutoFiltro] = useState("PNEU 3,25");

  const projecao = useMemo(
    () => calcularProjecao(produtoFiltro, pedidos, estoqueBase),
    [produtoFiltro, pedidos, estoqueBase]
  );

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

      {/* Filtro produto */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Produto:</span>
        <div className="flex gap-2 flex-wrap">
          {produtos.map((p) => (
            <button
              key={p}
              onClick={() => setProdutoFiltro(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                produtoFiltro === p
                  ? "bg-yellow-600 border-yellow-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela projeção */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h4 className="font-semibold text-white text-sm">Projeção 12 meses — {produtoFiltro}</h4>
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
                return (
                  <tr key={row.mes} className="border-t border-gray-700/60 hover:bg-gray-700/30">
                    <td className="px-3 py-2 font-mono text-gray-300">{row.mes}</td>
                    <td className="px-3 py-2 text-right">{fmt(row.estoqueInicial)}</td>
                    <td className="px-3 py-2 text-right text-blue-300">{fmt(row.comprasHHT)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{fmt(row.comprasEAS)}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{fmt(row.comprasGRN)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{fmt(row.totalCompras)}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{fmt(row.necessidade)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${row.saldo < 0 ? "text-red-400" : row.saldo < 50000 ? "text-yellow-400" : "text-emerald-400"}`}>
                      {fmt(row.saldo)}
                    </td>
                    <td className="px-3 py-2"><Semaforo saldo={row.saldo} necessidade={row.necessidade} /></td>
                    <td className="px-3 py-2 text-gray-300">{cob} m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/60 sticky top-0 z-10">
              <tr>
                {["PI","Fornecedor","Produto","Qtd","Prev. Chegada","Embarque","Mês Chegada","Free Time","Status","Canal",""].map((h) => (
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
function AtualizarProducao({ produtos, prodHistorico, onUpdate }) {
  const [produto, setProduto] = useState(produtos[0] || "PNEU 3,25");
  const [mes, setMes] = useState(MESES_OPCOES[2] || "");
  const [valor, setValor] = useState("");
  const allProdutos = useMemo(() => [...new Set([...PRODUTOS_PADRAO, ...produtos])].sort(), [produtos]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h4 className="font-semibold text-white mb-4">Atualizar Necessidade de Produção</h4>
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

      {prodHistorico.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-white">Últimas Atualizações</h4>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-900/60">
              <tr>
                {["Produto","Mês","Valor","Data"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodHistorico.map((r, i) => (
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
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function TireManagement() {
  const {
    pedidos, estoqueBase, prodHistorico, produtos,
    addPedido, updatePedido, deletePedido, updateNecessidade,
    syncAllToFirebase, syncStatus,
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
          {isLocal && (
            <span className="text-xs text-gray-500 italic">Sync disponível em produção</span>
          )}
          {!isLocal && (
            <button
              onClick={() => syncAllToFirebase(pedidos, estoqueBase)}
              disabled={syncStatus === "syncing"}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 ${
                syncStatus === "ok"
                  ? "bg-emerald-700 text-white"
                  : syncStatus === "error"
                  ? "bg-red-700 text-white"
                  : "bg-indigo-700 hover:bg-indigo-600 text-white"
              } disabled:opacity-50`}
            >
              {syncStatus === "syncing" ? (
                <><Loader size={12} className="animate-spin" /> Sincronizando...</>
              ) : syncStatus === "ok" ? (
                <><CheckCircle size={12} /> Salvo no Firebase</>
              ) : syncStatus === "error" ? (
                <><AlertTriangle size={12} /> Erro no sync</>
              ) : (
                <><CloudUpload size={12} /> Salvar no Firebase</>
              )}
            </button>
          )}
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
          onUpdate={updateNecessidade}
        />
      )}
    </div>
  );
}
