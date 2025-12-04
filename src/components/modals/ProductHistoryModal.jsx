import { Printer } from 'lucide-react';
import Button from '../ui/Button';

const ProductHistoryModal = ({ product, logs, motherCoils = [], onClose, onReprint }) => {

  if (!product) return null;

  const baseCode = String(product.code || '').trim();
  const mode = product.context || product.type || null; // 'PRODUÇÃO' | 'CORTE' | etc.
  const safeLogs = Array.isArray(logs) ? logs : [];

  const getDateObj = (l) => {
  // 1) Prioriza SEMPRE o campo "date" (que é o que aparece na tela)
  if (l.date) {
    if (typeof l.date === 'string' && l.date.includes('/')) {
      // formato dd/mm/aaaa
      const [d, m, y] = l.date.split('/');
      return new Date(`${y}-${m}-${d}T12:00:00`);
    }
    // se vier em outro formato, o Date tenta resolver
    return new Date(l.date);
  }

  // 2) Se não tiver "date", cai pro timestamp
  if (l.timestamp) {
    return new Date(l.timestamp);
  }

  // 3) Fallback bem antigo
  return new Date(0);
};

const history = safeLogs
  .filter((l) => {
    const lotId   = String(l.id || '').trim();
    const lotBase = lotId.includes('-') ? lotId.split('-')[0] : lotId;

    const prodCode   = String(l.productCode || '').trim();
    const motherCode = String(l.motherCode  || '').trim();

    if (mode === 'CORTE') {
      // para os cortes de bobina mãe (ex: 10236, 10262 etc.)
      return (
        motherCode === baseCode ||
        lotBase    === baseCode ||
        prodCode   === baseCode
      );
    }

    // PRODUÇÃO (produto acabado)
    return prodCode === baseCode;
  })
  .sort((a, b) => getDateObj(b) - getDateObj(a)); // mais recente em cima



  const totalPieces = history.reduce(
  (acc, curr) => acc + (curr.pieces || 0),
  0
);
  const safeMotherCoils = Array.isArray(motherCoils) ? motherCoils : [];
const firstLog = history[0] || null;

let materialInfo = '';

if (mode === 'CORTE' && firstLog) {
  // procura uma bobina mãe com o mesmo código
  const mother = safeMotherCoils.find(
    (m) => String(m.code || '').trim() === baseCode
  );

  const desc =
    mother?.material ||
    firstLog.motherMaterial ||
    firstLog.material ||
    '';

  const width =
    mother?.width ||
    firstLog.motherWidth ||
    firstLog.width ||
    '';

  const weight =
    firstLog.inputWeight ||
    firstLog.weight ||
    mother?.originalWeight ||
    mother?.weight ||
    '';

  // monta a linha final
  materialInfo = desc || `BOBINA ${baseCode}`;
  if (width)  materialInfo += ` • ${width} mm`;
  if (weight) materialInfo += ` • ${weight} kg`;
}



  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Histórico de Lotes</h3>
            <p className="text-blue-400 text-sm font-bold">
              {product.code} - {product.name}
            </p>

            {materialInfo && (
              <p className="text-xs text-gray-400 mt-1">
                {materialInfo}
              </p>
            )}
          </div>
          ...
        </div>

        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar-dark">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum lote produzido ainda.
            </div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">ID Lote</th>
                  <th className="p-2">Data</th>
                  <th className="p-2">Pacote</th>
                  <th className="p-2 text-right">Qtd</th>
                  <th className="p-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50">
                    <td className="p-2 font-mono text-xs text-blue-300">
                      {log.id}
                    </td>
                    <td className="p-2 text-gray-400">
                      {log.date ||
                        (log.timestamp &&
                          new Date(log.timestamp).toLocaleDateString('pt-BR'))}
                    </td>
                    <td className="p-2 text-xs">
                      {log.packIndex ? (
                        <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded border border-blue-900">
                          {log.packIndex}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-400">
                      {(log.pieces || 0) + ' pçs'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onReprint && onReprint(log)}
                        className="p-1.5 bg-gray-700 text-gray-200 rounded hover:bg-white hover:text-black transition-colors"
                        title="Imprimir este lote"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Total Produzido: {totalPieces} peças
          </span>
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-4 py-1 text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductHistoryModal;