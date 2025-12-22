import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Download, Package, Scissors, Factory, Eye, List, Printer, Truck } from 'lucide-react';
import PaginationControls from '../common/PaginationControls';

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl shadow-black/20 border border-white/5 p-6 ${className}`}>
    {children}
  </div>
);

const StockList = ({
  title,
  data,
  onExport,
  icon: Icon,
  colorClass,
  renderRow,
  itemsPerPage = 12,
  variant = 'card',
  className = '',
  showHeader = true,
  columnCount = 6,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef(null);

  const filteredData = data.filter((item) => {
    const query = searchQuery.toLowerCase();
    return Object.values(item).some((value) => String(value).toLowerCase().includes(query));
  });

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (isSearchFocused && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchFocused, searchQuery]);

  const Wrapper = ({ children }) =>
    variant === 'card' ? (
      <Card className={`flex flex-col h-full ${className}`}>{children}</Card>
    ) : (
      <div className={`flex flex-col h-full ${className}`}>{children}</div>
    );

  return (
    <Wrapper>
      {showHeader && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon size={20} className={colorClass} /> {title}
          </h3>
          <button
            onClick={onExport}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      )}

      <div className="relative mb-0 md:mb-3">
        <input
          type="text"
          placeholder={`Buscar em ${title}...`}
          value={searchQuery}
          ref={inputRef}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setCurrentPage(1);
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full border border-gray-700 rounded-lg p-3 pl-10 text-sm bg-gray-900 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
        />
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-dark min-h-[200px] max-h-[320px]">
        <table className="w-full text-xs text-left text-gray-300">
          <thead className="bg-gray-900 text-gray-400 sticky top-0">
            {title === 'Estoque Bobinas Mae' && (
              <tr>
                <th className="p-3">Codigo</th>
                <th className="p-3">Descricao</th>
                <th className="p-3">Variantes</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ver</th>
              </tr>
            )}
            {title === 'Estoque Bobinas B2' && (
              <tr>
                <th className="p-3">Codigo</th>
                <th className="p-3">Descricao</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ver</th>
              </tr>
            )}
            {title === 'Estoque Produto Acabado' && (
              <tr>
                <th className="p-3">Codigo</th>
                <th className="p-3">Descricao</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-right">Pecas</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Acoes</th>
              </tr>
            )}
            {title === 'Expedições' && (
              <tr>
                <th className="p-3">Codigo</th>
                <th className="p-3">Descricao</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-right">Pecas</th>
                <th className="p-3 text-right">Destino/Data</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="text-center text-gray-500 py-4">
                  Nenhum item encontrado.
                </td>
              </tr>
            ) : (
              paginatedData.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </Wrapper>
  );
};

export const MotherCoilStockList = ({ data, onExport, onViewDetails, ...rest }) => {
  const [expandedCodes, setExpandedCodes] = useState({});
  const statusByCode = rest.statusByCode || {};

  const normalizeThicknessDisplay = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const cleaned = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    let normalized = parsed;
    while (normalized > 5) normalized /= 10;
    return normalized.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const groupedData = useMemo(() => {
    const groups = data.reduce((acc, item) => {
      const code = item.code || 'N/A';
      if (!acc[code]) {
        acc[code] = {
          code,
          material: item.material,
          totalWeight: 0,
          totalCount: 0,
          widths: [],
        };
      }
      const thicknessDisplay =
        normalizeThicknessDisplay(item.thickness) || item.thickness || null;
      const typeDisplay = item.type || acc[code].type || null;
      acc[code].totalWeight += Number(item.weight) || 0;
      acc[code].totalCount += Number(item.count) || 0;
      acc[code].widths.push({
        width: item.width,
        thickness: thicknessDisplay,
        type: typeDisplay,
        weight: Number(item.weight) || 0,
        count: Number(item.count) || 0,
      });
      return acc;
    }, {});

    return Object.values(groups)
      .map((group) => ({
        ...group,
        widths: group.widths.sort(
          (a, b) => (Number(b.width) || 0) - (Number(a.width) || 0),
        ),
        widthsLabel: group.widths
          .map((variant) => `${variant.width ?? ''} ${variant.weight ?? ''}`)
          .join(' '),
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [data]);

  const toggleCode = (code) => {
    setExpandedCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const renderStatusBadge = (info) => {
    const status = info?.status || 'OK';
    const styles = {
      CRITICO: 'bg-red-500/20 text-red-300 border-red-500/40',
      SEM_GIRO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      USAR: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      OK: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.OK}`}
        title={
          info?.reason ||
          `Min: ${info?.min ?? '-'} | Ult mov: ${info?.lastMoveDays ?? '-'}d | Lote: ${info?.oldestDays ?? '-'}d`
        }
      >
        {status}
      </span>
    );
  };

  return (
    <StockList
      title="Estoque Bobinas Mae"
      data={groupedData}
      onExport={onExport}
      icon={Package}
      colorClass="text-blue-400"
      itemsPerPage={12}
      columnCount={7}
      {...rest}
      renderRow={(item, index) => {
        const isExpanded = Boolean(expandedCodes[item.code]);
        const statusInfo = statusByCode[item.code];
        return (
          <React.Fragment key={`${item.code}-${index}`}>
            <tr
              className="hover:bg-gray-700/30 cursor-pointer transition-colors"
              onClick={() => toggleCode(item.code)}
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCode(item.code);
                    }}
                    className={`p-1 rounded-full text-gray-400 hover:text-blue-300 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    title="Mostrar larguras"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <div>
                    <div className="font-mono text-xs text-blue-300">{item.code}</div>
                  </div>
                </div>
              </td>
              <td className="p-3">
                <p className="text-sm text-white">{item.material}</p>
                <p className="text-[11px] text-gray-500">
                  {Array.from(new Set(item.widths.map((variant) => variant.type).filter(Boolean))).join(', ') ||
                    'Sem tipo'}
                </p>
              </td>
              <td className="p-3 text-sm text-gray-300">
                <div className="space-y-1">
                  {(() => {
                    const widths = Array.from(
                      new Set(item.widths.map((variant) => variant.width).filter(Boolean)),
                    );
                    const thicknesses = Array.from(
                      new Set(
                        item.widths
                          .map((variant) => normalizeThicknessDisplay(variant.thickness) || variant.thickness)
                          .filter(Boolean),
                      ),
                    );
                    const badges = [];
                    if (widths.length) {
                      badges.push(`Larguras: ${widths.join(', ')}mm`);
                    }
                    if (thicknesses.length) {
                      badges.push(`Esp.: ${thicknesses.join(', ')}mm`);
                    }
                    return badges.length ? badges.map((badge, badgeIndex) => (
                      <span key={`${item.code}-badge-${badgeIndex}`} className="block text-[11px] text-gray-500">
                        {badge}
                      </span>
                    )) : <span className="text-[11px] text-gray-500">Sem variantes registradas</span>;
                  })()}
                </div>
              </td>
              <td className="p-3 text-right font-bold text-white text-sm">
                {item.totalWeight.toFixed(0)}
              </td>
              <td className="p-3 text-right text-gray-400">{item.totalCount}</td>
              <td className="p-3 text-center">
                {renderStatusBadge(statusInfo)}
              </td>
              <td className="p-3 text-center">
                {onViewDetails && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewDetails(item.code);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-300 transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </td>
            </tr>
            {isExpanded && (
              <tr>
                <td colSpan={7} className="bg-slate-900/60 p-3">
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-300 font-semibold px-1 pb-1 border-b border-gray-700">
                    <span>Variante</span>
                    <span>Espessura / Tipo</span>
                    <span className="text-right">Peso (kg)</span>
                    <span className="text-right">Qtd</span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {item.widths.map((variant, variantIndex) => (
                      <div
                        key={`${item.code}-${variant.width}-${variantIndex}`}
                        className="grid grid-cols-4 gap-2 items-center text-[11px] text-gray-300"
                      >
                        <div className="font-mono text-blue-300">
                          {variant.width ? `${variant.width}mm` : '-'}
                        </div>
                        <div className="text-gray-500">
                          {variant.thickness ? `${variant.thickness}` : '-'}
                          {variant.type ? ` • ${variant.type}` : ''}
                        </div>
                        <div className="text-right font-bold text-white">
                          {(variant.weight || 0).toFixed(0)}
                        </div>
                        <div className="text-right text-gray-400">{variant.count}</div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      }}
    />
  );
};

export const ChildCoilStockList = ({ data, onExport, onViewDetails, ...rest }) => {
  const statusByCode = rest.statusByCode || {};
  const renderStatusBadge = (info) => {
    const status = info?.status || 'OK';
    const styles = {
      CRITICO: 'bg-red-500/20 text-red-300 border-red-500/40',
      SEM_GIRO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      USAR: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      OK: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.OK}`}
        title={
          info?.reason ||
          `Min: ${info?.min ?? '-'} | Ult mov: ${info?.lastMoveDays ?? '-'}d | Lote: ${info?.oldestDays ?? '-'}d`
        }
      >
        {status}
      </span>
    );
  };

  return (
    <StockList
      title="Estoque Bobinas B2"
      data={data}
      onExport={onExport}
      icon={Scissors}
      colorClass="text-purple-400"
      itemsPerPage={12}
      columnCount={6}
      {...rest}
      renderRow={(item, index) => (
        <tr key={`${item.code}-${index}`} className="hover:bg-gray-700/50">
          <td className="p-3 font-mono text-xs text-purple-300">{item.code}</td>
          <td className="p-3">
            <p className="text-sm text-white">{item.name}</p>
            <p className="text-[11px] text-gray-500">{item.type || 'Tipo n??o informado'}</p>
          </td>
          <td className="p-3 text-right font-bold text-white text-sm">{item.weight.toFixed(0)}</td>
          <td className="p-3 text-right text-gray-400">{item.count}</td>
          <td className="p-3 text-center">{renderStatusBadge(statusByCode[item.code])}</td>
          <td className="p-3 text-center">
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(item.code)}
                className="p-1.5 text-gray-400 hover:text-purple-300 transition-colors"
                title="Ver detalhes"
              >
                <Eye size={16} />
              </button>
            )}
          </td>
        </tr>
      )}
    />
  );
};

export const FinishedStockList = ({
  data,
  onExport,
  statusByCode,
  onViewHistory,
  onPrint,
  getUnitWeight,
  calcProductWeight,
  ...rest
}) => {
  const safeStatusByCode = statusByCode || {};
  const renderStatusBadge = (info) => {
    const status = info?.status || 'OK';
    const styles = {
      CRITICO: 'bg-red-500/20 text-red-300 border-red-500/40',
      SEM_GIRO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      USAR: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      OK: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || styles.OK}`}
        title={
          info?.reason ||
          `Min: ${info?.min ?? '-'} | Ult mov: ${info?.lastMoveDays ?? '-'}d | Lote: ${info?.oldestDays ?? '-'}d`
        }
      >
        {status}
      </span>
    );
  };

  return (
    <StockList
      title="Estoque Produto Acabado"
      data={data}
      onExport={onExport}
      icon={Factory}
      colorClass="text-emerald-400"
      itemsPerPage={10}
      columnCount={6}
      {...rest}
      renderRow={(item, index) => (
        <tr key={`${item.code}-${index}`} className="hover:bg-gray-700/50">
          <td className="p-3 font-mono text-xs text-emerald-300">{item.code}</td>
          <td className="p-3">
            <div className="text-sm text-white" title={item.name}>
              {item.name}
            </div>
          </td>
          <td className="p-3 text-right text-white">
            {(() => {
              const totalWeight = calcProductWeight?.(item.code, item.count) ?? 0;
              const unitWeight = getUnitWeight?.(item.code) ?? 0;
              return (
                <div>
                  <span className="font-bold">{totalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                  <div className="text-[11px] text-gray-500">
                    {unitWeight ? `${unitWeight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/un` : 'Peso n??o cadastrado'}
                  </div>
                </div>
              );
            })()}
          </td>
          <td className="p-3 text-right font-bold text-white">{item.count}</td>
          <td className="p-3 text-center">{renderStatusBadge(safeStatusByCode[item.code])}</td>
          <td className="p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              {onViewHistory && (
                <button
                  onClick={() => onViewHistory({ code: item.code, name: item.name, context: 'PROD' })}
                  className="p-1.5 bg-gray-800 text-gray-200 rounded hover:bg-blue-600 hover:text-white transition-colors"
                  title="Ver lotes"
                >
                  <List size={16} />
                </button>
              )}
              {onPrint && (
                <button
                  onClick={() => onPrint(item)}
                  className="p-1.5 bg-gray-800 text-gray-200 rounded hover:bg-emerald-600 hover:text-white transition-colors"
                  title="Imprimir"
                >
                  <Printer size={16} />
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    />
  );
};

export const ShipmentList = ({ data, onExport }) => (
  <StockList
    title="Expedições"
    data={data}
    onExport={onExport}
    icon={Truck}
    colorClass="text-amber-400"
    variant="embedded"
    showHeader={false}
    columnCount={5}
    renderRow={(item, index) => (
      <tr key={item.id || index} className="hover:bg-gray-700/50">
        <td className="p-3 font-mono text-xs text-amber-300">{item.code}</td>
        <td className="p-3 text-gray-300">
          <p className="font-medium">{item.name}</p>
          <p className="text-[11px] text-gray-500">{item.destination || '-'}</p>
        </td>
        <td className="p-3 text-right font-bold text-white">
          {item.weight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          {item.unitWeight ? (
            <p className="text-[11px] text-gray-500">
              {item.unitWeight.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/un
            </p>
          ) : (
            <p className="text-[11px] text-gray-600">Peso não cadastrado</p>
          )}
        </td>
        <td className="p-3 text-right text-gray-200">{item.quantity}</td>
        <td className="p-3 text-right text-gray-500">
          {item.date || (item.timestamp && new Date(item.timestamp).toLocaleDateString('pt-BR')) || '-'}
        </td>
      </tr>
    )}
  />
);
