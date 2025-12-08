import React, { useMemo, useState } from "react";
import { INITIAL_INOX_BLANK_PRODUCTS } from "../../data/inoxCatalog";

// --------- helpers simples ---------
const formatInt = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const formatKg = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value).replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export default function InoxBlanksPlanner() {
  // 1) monta SEMPRE a lista a partir do catálogo fixo
  const [rows, setRows] = useState(() =>
    INITIAL_INOX_BLANK_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      inoxGrade: p.inoxGrade,
      measuresLabel: p.measuresLabel,
      unitWeightKg: Number(p.weight) || 0,
      demandUnits: "",        // Demanda (peças) que você vai digitar
      finishedStockUnits: "", // Estoque acabado (peças)
      blanksStockUnits: "",   // Estoque blanks (peças)
    }))
  );

  const [search, setSearch] = useState("");

  const handleFieldChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // 2) aplica filtro + calcula cobertura e necessidade
  const enrichedRows = useMemo(() => {
    const term = (search || "").trim().toLowerCase();

    const base = term
      ? rows.filter((row) => {
          const txt = `${row.id} ${row.name} ${row.inoxGrade} ${row.measuresLabel}`.toLowerCase();
          return txt.includes(term);
        })
      : rows;

    return base.map((row) => {
      const demandUnits = toNumber(row.demandUnits);
      const finishedStockUnits = toNumber(row.finishedStockUnits);
      const blanksStockUnits = toNumber(row.blanksStockUnits);

      const totalStockUnits = finishedStockUnits + blanksStockUnits;
      const coverageUnits = totalStockUnits; // por enquanto 1:1
      const needUnits = Math.max(demandUnits - totalStockUnits, 0);
      const needKg = needUnits * (Number(row.unitWeightKg) || 0);

      return {
        ...row,
        demandUnits,
        finishedStockUnits,
        blanksStockUnits,
        totalStockUnits,
        coverageUnits,
        needUnits,
        needKg,
      };
    });
  }, [rows, search]);

  // 3) cards de resumo do topo (usa o primeiro item visível no filtro)
  const summary = useMemo(() => {
    if (!enrichedRows.length) {
      return {
        productLabel: "-",
        demandUnits: 0,
        totalStockUnits: 0,
        needKg: 0,
      };
    }

    const first = enrichedRows[0];
    return {
      productLabel: `${first.id} – ${first.name}`,
      demandUnits: first.demandUnits,
      totalStockUnits: first.totalStockUnits,
      needKg: first.needKg,
    };
  }, [enrichedRows]);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex justify-end">
        <input
          type="text"
          placeholder="Buscar produto inox..."
          className="w-full md:w-80 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Resumo MRP */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            MRP Simplificado – Inox / Blanks
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aqui você enxerga, por produto de inox, a demanda, o estoque
            (acabado + blanks) e o quanto precisaria comprar em kg.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Produto
            </div>
            <div className="text-xs text-slate-50 font-bold mt-1 leading-tight">
              {summary.productLabel}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Demanda (peças)
            </div>
            <div className="text-lg font-bold text-slate-50 mt-1">
              {formatInt(summary.demandUnits)}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Estoque (acabado + blanks)
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {formatInt(summary.totalStockUnits)}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Necessidade em kg
            </div>
            <div className="text-lg font-bold text-rose-400 mt-1">
              {formatKg(summary.needKg)} kg
            </div>
          </div>
        </div>
      </section>

      {/* Tabela detalhada */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-right">Peso unit. (kg)</th>
              <th className="px-3 py-2 text-right">Demanda (peças)</th>
              <th className="px-3 py-2 text-right">Est. acabado</th>
              <th className="px-3 py-2 text-right">Est. blanks</th>
              <th className="px-3 py-2 text-right">Cobertura (peças)</th>
              <th className="px-3 py-2 text-right">Necessidade (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {enrichedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-500 text-xs"
                >
                  Nenhum produto inox encontrado para o filtro.
                </td>
              </tr>
            ) : (
              enrichedRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-800/70 transition-colors"
                >
                  <td className="px-3 py-2 align-top">
                    <div className="text-[11px] font-semibold text-slate-50">
                      {row.id}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {row.name}
                    </div>
                    <div className="text-[9px] text-emerald-400 mt-0.5">
                      {row.inoxGrade} · {row.measuresLabel}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-slate-100">
                    {formatKg(row.unitWeightKg)}
                  </td>

                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-[11px] text-right text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      value={row.demandUnits}
                      onChange={(e) =>
                        handleFieldChange(row.id, "demandUnits", e.target.value)
                      }
                    />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-[11px] text-right text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      value={row.finishedStockUnits}
                      onChange={(e) =>
                        handleFieldChange(
                          row.id,
                          "finishedStockUnits",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-[11px] text-right text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      value={row.blanksStockUnits}
                      onChange={(e) =>
                        handleFieldChange(
                          row.id,
                          "blanksStockUnits",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-slate-100">
                    {formatInt(row.coverageUnits)}
                  </td>

                  <td className="px-3 py-2 text-right font-mono text-rose-400">
                    {formatKg(row.needKg)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
