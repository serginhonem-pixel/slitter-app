// src/components/Reports/Reports.jsx
import React, { useMemo } from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import Card from '../Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

// Assumindo que estas props serão passadas pelo App.jsx
const Reports = ({
    reportViewMode, setReportViewMode,
    reportStartDate, setReportStartDate,
    reportEndDate, setReportEndDate,
    reportSearch, setReportSearch,
    globalTimeline, mpSummaryList, prodSummaryList,
    handleGlobalDetail, handleGenerateMPReportPDF, exportToCSV,
    getTypeColor, getUnitWeight,
    stats,
    setViewingMpDetails,
    setViewingProdDetails,
}) => {

    // Funções auxiliares (que estavam dentro de renderReports)
    const toISODate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const safeNum = (n) => Number(n) || 0;

    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* ABAS */}
        <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
          <button
            onClick={() => setReportViewMode('GLOBAL')}
            className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
              reportViewMode === 'GLOBAL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setReportViewMode('MP_KARDEX')}
            className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
              reportViewMode === 'MP_KARDEX'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Extrato MP
          </button>
          <button
            onClick={() => setReportViewMode('PROD_SUMMARY')}
            className={`px-4 py-3 font-bold text-xs md:text-sm rounded-t-lg transition-colors ${
              reportViewMode === 'PROD_SUMMARY'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Resumo Produção
          </button>
        </div>

        {/* FILTROS */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Início</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Fim</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="w-full md:w-1/3">
              <input
                type="text"
                placeholder="Buscar..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* ABA 1: GLOBAL */}
        {reportViewMode === 'GLOBAL' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <Card className="border-l-4 border-blue-500 bg-gray-800 p-4">
                <p className="text-gray-400 text-[10px] font-bold uppercase">
                  Entrada MP
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-xl font-bold text-white">
                    {stats.entradaKg.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-blue-400 mb-1">kg</span>
                </div>
              </Card>
              <Card className="border-l-4 border-purple-500 bg-gray-800 p-4">
                <p className="text-gray-400 text-[10px] font-bold uppercase">
                  Consumo Slitter
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-xl font-bold text-white">
                    {stats.corteKg.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-purple-400 mb-1">kg</span>
                </div>
              </Card>
              <Card className="border-l-4 border-emerald-500 bg-gray-800 p-4">
                <p className="text-gray-400 text-[10px] font-bold uppercase">
                  Produção PA
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-xl font-bold text-white">
                    {stats.prodPcs.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-emerald-400 mb-1">pçs</span>
                </div>
              </Card>
              <Card className="border-l-4 border-amber-500 bg-gray-800 p-4">
                <p className="text-gray-400 text-[10px] font-bold uppercase">
                  Expedição PA
                </p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-xl font-bold text-white">
                    {stats.expPcs.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-amber-400 mb-1">pçs</span>
                </div>
              </Card>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                <h3 className="font-bold text-gray-200">
                  Linha do Tempo Global
                </h3>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const data = globalTimeline.map((e) => ({
                      Data: e.rawDate,
                      Tipo: e.type,
                      Código: e.id,
                      Descrição: e.desc,
                      Qtd: e.qty,
                      Peso: e.weight,
                    }));
                    exportToCSV(data, `relatorio_global`);
                  }}
                  className="h-8 text-xs"
                >
                  <Download size={14} /> Excel
                </Button>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar-dark">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3 text-center">Tipo</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3 text-right">Peso</th>
                      <th className="p-3 text-center">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {globalTimeline.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500">
                          Nenhum registro no período.
                        </td>
                      </tr>
                    ) : (
                      globalTimeline.map((g, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="p-3 text-xs text-gray-400 font-mono">
                            {g.date}
                          </td>
                          <td
                            className={`p-3 font-bold text-xs ${getTypeColor(
                              g.type
                            )}`}
                          >
                            {g.type}
                          </td>
                          <td className="p-3 text-white">
                            {g.type === 'ENTRADA MP' &&
                              `Entradas de MP (${g.events.length} registro${
                                g.events.length !== 1 ? 's' : ''
                              })`}
                            {g.type === 'CORTE' &&
                              `Cortes Slitter (${g.events.length} registro${
                                g.events.length !== 1 ? 's' : ''
                              })`}
                            {g.type === 'PRODUÇÃO' &&
                              `Produções de PA (${g.events.length} registro${
                                g.events.length !== 1 ? 's' : ''
                              })`}
                            {g.type === 'EXPEDIÇÃO' &&
                              `Expedições de PA (${g.events.length} registro${
                                g.events.length !== 1 ? 's' : ''
                              })`}
                          </td>
                          <td className="p-3 text-right text-gray-300">
                            {g.totalQty}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-300">
                            {g.totalWeight.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleGlobalDetail(g)}
                              className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs transition-colors flex items-center gap-2 mx-auto"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}

                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ABA 2: EXTRATO MP */}
        {reportViewMode === 'MP_KARDEX' && (
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-emerald-600">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-emerald-900/10 -mt-6 -mx-6">
              <div>
                <h3 className="font-bold text-xl text-emerald-100">
                  Extrato MP
                </h3>
                <p className="text-sm text-emerald-300/70">Auditoria de Estoque</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleGenerateMPReportPDF(
                      mpSummaryList,
                      reportStartDate,
                      reportEndDate
                    )
                  }
                  className="h-9 bg-rose-600 text-white hover:bg-rose-500"
                >
                  <FileText size={14} /> PDF
                </Button>
                <Button
                  onClick={() => {
                    const analyticalData = [];
                    mpSummaryList.forEach((item) => {
                      item.movements.forEach((mov) => {
                        analyticalData.push({
                          Código: item.code,
                          Descrição: item.desc,
                          'Largura (mm)': item.width ?? '',
                          Data: mov.date,
                          Tipo: mov.type,
                          'Detalhe/NF': mov.detail,
                          'Entrada (kg)':
                            mov.type === 'ENTRADA' ? mov.weightChange : 0,
                          'Saída (kg)':
                            mov.type !== 'ENTRADA'
                              ? Math.abs(mov.weightChange)
                              : 0,
                        });
                      });
                    });
                    exportToCSV(analyticalData, `relatorio_analitico_mp`);
                  }}
                  className="h-9 bg-blue-600 text-white hover:bg-blue-500"
                >
                  <Download size={14} /> Detalhado
                </Button>
                <Button
                  onClick={() => {
                    const data = mpSummaryList.map((i) => ({
                      Código: i.code,
                      Descrição: i.desc,
                      'Largura (mm)': i.width ?? '',
                      'Saldo Anterior (kg)': i.initialBalance,
                      'Entradas (kg)': i.periodIn,
                      'Saídas (kg)': i.periodOut,
                      'Saldo Atual (kg)': i.finalBalance,
                    }));
                    exportToCSV(data, `extrato_mp_saldos`);
                  }}
                  className="h-9 bg-emerald-600 text-white"
                >
                  <Download size={14} /> Saldos
                </Button>
              </div>
            </div>




            <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-800 text-gray-400 sticky top-0">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Largura (mm)</th>
                    <th className="p-3 text-right text-gray-400 bg-gray-900/50">
                      Saldo Ant.
                    </th>
                    <th className="p-3 text-right text-emerald-400">Entradas</th>
                    <th className="p-3 text-right text-red-400">Saídas</th>
                    <th className="p-3 text-right text-white font-bold bg-blue-900/40 border-l border-blue-700">
                      Saldo Atual
                    </th>
                    <th className="p-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {mpSummaryList
                    .filter((i) => {
                      if (!reportSearch) return true;
                      const term = reportSearch.toLowerCase();
                      return (
                        i.code.toLowerCase().includes(term) ||
                        String(i.desc || '')
                          .toLowerCase()
                          .includes(term) ||
                        (i.width != null &&
                          String(i.width).toLowerCase().includes(term))
                      );
                    })
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/50">
                        <td className="p-3 font-bold text-white">{row.code}</td>
                        <td className="p-3 text-gray-400 truncate max-w-[220px]">
                          {row.desc}
                        </td>
                        <td className="p-3 text-right text-gray-300 font-mono">
                          {row.width != null ? row.width : '-'}
                        </td>
                        <td className="p-3 text-right text-gray-300 font-mono bg-gray-900/30">
                          {row.initialBalance.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right text-emerald-400 font-mono">
                          {row.periodIn.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right text-red-400 font-mono">
                          {row.periodOut.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right font-bold text-white font-mono bg-blue-900/20 border-l border-gray-700">
                          {row.finalBalance.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              setViewingMpDetails({
                                ...row,
                                initialBalance: row.initialBalance,
                              })
                            }
                            className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ABA 3: RESUMO PRODUÇÃO */}
        {reportViewMode === 'PROD_SUMMARY' && (
    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-t-4 border-purple-600">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 p-4 bg-purple-900/10 -mt-6 -mx-6">
        <div>
          <h3 className="font-bold text-xl text-purple-100">
            Resumo Produção
          </h3>
          <p className="text-sm text-purple-300/70">Por Produto</p>
        </div>
        <Button
          onClick={() => {
            const safeList = Array.isArray(prodSummaryList)
              ? prodSummaryList
              : [];

            const data = safeList.map((i) => ({
              Produto: i.name ?? '',
              Código: i.code ?? '',
              Qtd: Number(i.totalQty) || 0,
              Peso: Number(i.totalWeight) || 0,
              Sucata: Number(i.totalScrap) || 0,
            }));

            exportToCSV(data, `resumo_producao`);
          }}
          className="h-9 bg-purple-600 text-white"
        >
          <Download size={14} /> Excel
        </Button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar-dark px-4 pb-4">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-800 text-gray-400 sticky top-0">
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Código</th>
              <th className="p-3 text-right text-emerald-400">Qtd</th>
              <th className="p-3 text-right text-blue-400">Peso</th>
              <th className="p-3 text-right text-red-400">Sucata</th>
              <th className="p-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {(Array.isArray(prodSummaryList) ? prodSummaryList : []).map(
              (row, idx) => {
                const qty = Number(row.totalQty) || 0;
                const weight = Number(row.totalWeight) || 0;
                const scrap = Number(row.totalScrap) || 0;

                return (
                  <tr key={idx} className="hover:bg-gray-700/50">
                    <td className="p-3 font-bold text-white text-sm">
                      {row.name ?? '-'}
                    </td>
                    <td className="p-3 text-gray-400 text-xs font-mono">
                      {row.code ?? '-'}
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-bold text-lg">
                      {qty}
                    </td>
                    <td className="p-3 text-right text-blue-400 font-mono">
                      {weight.toFixed(1)} kg
                    </td>
                    <td className="p-3 text-right text-red-400 font-mono">
                      {scrap.toFixed(1)} kg
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setViewingProdDetails(row)}
                        className="px-3 py-1 bg-gray-700 hover:bg-white hover:text-black rounded text-xs transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Eye size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )}

      </div>
    );
  };

export default Reports;
