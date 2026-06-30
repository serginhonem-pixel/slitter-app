import React, { useMemo, useState } from 'react';
import {
  Package,
  Ruler,
  Layers,
  Search,
  LayoutGrid,
  Scale,
  CalendarDays,
  FileText,
  Factory,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const formatKg = (kg) =>
  kg >= 1000
    ? `${(kg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString('pt-BR')} kg`;

// ─── Paleta de cores por tipo ────────────────────────────────────────────────

const PALETTE = [
  { headerBg: 'bg-gradient-to-r from-blue-600/25 to-blue-500/5',    headerBorder: 'border-blue-500/40',   headerText: 'text-blue-200',   dot: 'bg-blue-400',   glow: 'shadow-blue-500/10',   badge: 'bg-blue-500/15 text-blue-300 border border-blue-500/30'   },
  { headerBg: 'bg-gradient-to-r from-violet-600/25 to-violet-500/5', headerBorder: 'border-violet-500/40', headerText: 'text-violet-200', dot: 'bg-violet-400', glow: 'shadow-violet-500/10', badge: 'bg-violet-500/15 text-violet-300 border border-violet-500/30' },
  { headerBg: 'bg-gradient-to-r from-cyan-600/25 to-cyan-500/5',     headerBorder: 'border-cyan-500/40',   headerText: 'text-cyan-200',   dot: 'bg-cyan-400',   glow: 'shadow-cyan-500/10',   badge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'   },
  { headerBg: 'bg-gradient-to-r from-indigo-600/25 to-indigo-500/5', headerBorder: 'border-indigo-500/40', headerText: 'text-indigo-200', dot: 'bg-indigo-400', glow: 'shadow-indigo-500/10', badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' },
  { headerBg: 'bg-gradient-to-r from-emerald-600/25 to-emerald-500/5',headerBorder: 'border-emerald-500/40',headerText: 'text-emerald-200',dot: 'bg-emerald-400',glow: 'shadow-emerald-500/10',badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'},
  { headerBg: 'bg-gradient-to-r from-rose-600/25 to-rose-500/5',     headerBorder: 'border-rose-500/40',   headerText: 'text-rose-200',   dot: 'bg-rose-400',   glow: 'shadow-rose-500/10',   badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30'   },
  { headerBg: 'bg-gradient-to-r from-amber-600/25 to-amber-500/5',   headerBorder: 'border-amber-500/40',  headerText: 'text-amber-200',  dot: 'bg-amber-400',  glow: 'shadow-amber-500/10',  badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30'  },
  { headerBg: 'bg-gradient-to-r from-slate-600/25 to-slate-500/5',   headerBorder: 'border-slate-400/40',  headerText: 'text-slate-200',  dot: 'bg-slate-300',  glow: 'shadow-slate-500/10',  badge: 'bg-slate-500/15 text-slate-300 border border-slate-400/30'  },
];

const hashIndex = (str) => [...str].reduce((acc, c) => acc + c.charCodeAt(0), 0);
const getTypePalette = (type) => PALETTE[hashIndex(type) % PALETTE.length];

// ─── CoilDetail — linha individual dentro do grupo expandido ─────────────────

const CoilDetail = ({ coil }) => {
  const weight = safeNum(coil.remainingWeight ?? coil.weight);
  return (
    <div className="bg-white/3 border border-white/8 rounded-lg p-3 flex flex-col gap-2 hover:bg-white/5 transition-colors">
      {/* ID + Peso */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-violet-300/80 truncate mr-2">{coil.id}</span>
        <span className="text-sm font-bold text-white shrink-0">{formatKg(weight)}</span>
      </div>
      {/* NF · Data · Usina — sempre visíveis */}
      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/6">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <FileText size={9} /> NF
          </span>
          <span className="text-[11px] text-gray-300 font-medium truncate">
            {coil.nf || <span className="text-gray-600">—</span>}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <CalendarDays size={9} /> Data
          </span>
          <span className="text-[11px] text-gray-300 font-medium">
            {coil.date ? String(coil.date).slice(0, 10) : <span className="text-gray-600">—</span>}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Factory size={9} /> Usina
          </span>
          <span className="text-[11px] text-gray-300 font-medium truncate">
            {coil.usina || <span className="text-gray-600">—</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── GroupCard — card agrupado por código + largura ──────────────────────────

const GroupCard = ({ group, col }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`bg-slate-900/60 border border-white/8 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/20 hover:shadow-xl hover:-translate-y-0.5 ${col.glow}`}>
      {/* Header clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3.5 flex items-start gap-2"
      >
        <span className="mt-0.5 shrink-0 text-gray-500">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        <div className="flex-1 min-w-0">
          {/* Nome + código */}
          <p className={`text-sm font-bold leading-snug ${col.headerText}`}>
            {group.material}
          </p>
          <span className="font-mono text-[11px] text-gray-500">Cód. {group.code}</span>

          {/* Specs */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="flex items-center gap-1 text-[12px] text-gray-300">
              <Ruler size={11} className="text-gray-500" />
              {safeNum(group.width).toLocaleString('pt-BR')} mm
            </span>
            {group.thickness && (
              <span className="flex items-center gap-1 text-[12px] text-gray-300">
                <Layers size={11} className="text-gray-500" />
                {group.thickness} mm
              </span>
            )}
          </div>
        </div>

        {/* Totais */}
        <div className="shrink-0 text-right ml-2">
          <div className="flex items-center gap-1 justify-end text-white font-bold text-sm">
            <Scale size={12} className="text-gray-500" />
            {formatKg(group.totalWeight)}
          </div>
          <span className="text-[11px] text-gray-500">{group.coils.length} bobina{group.coils.length !== 1 ? 's' : ''}</span>
        </div>
      </button>

      {/* Detalhe expandido */}
      {open && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-2 border-t border-white/8 pt-3">
          {group.coils.map((coil) => (
            <CoilDetail key={coil.id} coil={coil} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

const KanbanColumn = ({ col, groups }) => {
  const totalWeight = groups.reduce((acc, g) => acc + g.totalWeight, 0);
  const totalCoils  = groups.reduce((acc, g) => acc + g.coils.length, 0);

  return (
    <div className="flex flex-col min-w-[290px] max-w-[330px] flex-1">
      {/* Header da coluna */}
      <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl mb-3 ${col.headerBg} border ${col.headerBorder} shadow-lg`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${col.dot} shadow-lg`} style={{ boxShadow: 'none' }} />
          <span className={`font-bold text-sm tracking-wide ${col.headerText}`}>{col.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 font-medium">{formatKg(totalWeight)}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
            {totalCoils}
          </span>
        </div>
      </div>

      {/* Grupos */}
      <div className="flex flex-col gap-2.5 pb-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-600 text-xs text-center gap-1.5">
            <Package size={22} className="opacity-30" />
            <span>Nenhuma bobina</span>
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard key={group.key} group={group} col={col} />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Agrupamento por código + largura ────────────────────────────────────────

const groupByCodeWidth = (coils) => {
  const map = {};
  coils.forEach((c) => {
    const key = `${c.code}-${safeNum(c.width)}`;
    if (!map[key]) {
      map[key] = {
        key,
        code: c.code,
        width: c.width,
        thickness: c.thickness,
        material: c.material || c.description || `BOBINA ${c.code}`,
        type: c.type,
        totalWeight: 0,
        coils: [],
      };
    }
    map[key].totalWeight += safeNum(c.remainingWeight ?? c.weight);
    map[key].coils.push(c);
  });

  return Object.values(map).sort((a, b) => b.totalWeight - a.totalWeight);
};

// ─── Main component ───────────────────────────────────────────────────────────

const MotherCoilKanban = ({ motherCoils = [] }) => {
  const [search, setSearch] = useState('');

  const stockCoils = useMemo(
    () => (motherCoils || []).filter((c) => c.status === 'stock'),
    [motherCoils],
  );

  const types = useMemo(() => {
    const set = new Set();
    stockCoils.forEach((c) => {
      const t = String(c.type || '').toUpperCase().trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [stockCoils]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stockCoils;
    return stockCoils.filter((c) => {
      const haystack = [c.id, c.code, c.material, c.description, c.type, c.thickness, String(c.width)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [stockCoils, search]);

  // Colunas por tipo, ordenadas por peso total desc
  const columns = useMemo(() => {
    const cols = types.map((type, i) => {
      const coilsOfType = filtered.filter(
        (c) => String(c.type || '').toUpperCase().trim() === type,
      );
      const groups = groupByCodeWidth(coilsOfType);
      const totalWeight = groups.reduce((acc, g) => acc + g.totalWeight, 0);
      return { id: type, label: type, ...getTypePalette(type), groups, totalWeight };
    });
    return cols.sort((a, b) => b.totalWeight - a.totalWeight);
  }, [types, filtered]);

  // Sem tipo
  const semTipoCoils = useMemo(
    () => filtered.filter((c) => !String(c.type || '').trim()),
    [filtered],
  );
  const semTipoGroups = useMemo(() => groupByCodeWidth(semTipoCoils), [semTipoCoils]);

  const totalWeight = filtered.reduce(
    (acc, c) => acc + safeNum(c.remainingWeight ?? c.weight),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar código, material, largura…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition"
          />
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 shrink-0">
          <span><span className="font-bold text-white">{filtered.length}</span> bobinas</span>
          <span><span className="font-bold text-white">{formatKg(totalWeight)}</span> total</span>
        </div>
      </div>

      {/* Board */}
      {stockCoils.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
          <LayoutGrid size={48} className="opacity-20" />
          <p className="text-lg font-semibold">Nenhuma bobina mãe em estoque</p>
          <p className="text-sm">Registre uma entrada de MP para começar.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
          <Search size={36} className="opacity-20" />
          <p className="text-base font-semibold">Nenhuma bobina encontrada</p>
          <p className="text-sm">Tente um código, material ou largura diferente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1" style={{ transform: 'rotateX(180deg)' }}>
          <div className="flex gap-4" style={{ transform: 'rotateX(180deg)' }}>
            {columns.map((col) => (
              <KanbanColumn key={col.id} col={col} groups={col.groups} />
            ))}
            {semTipoGroups.length > 0 && (
              <KanbanColumn
                col={{ id: 'sem-tipo', label: 'Sem Tipo', ...PALETTE[PALETTE.length - 1] }}
                groups={semTipoGroups}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MotherCoilKanban;
