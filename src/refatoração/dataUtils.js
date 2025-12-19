/**
 * Utilitários para manipulação de dados
 */

/**
 * Converte um valor para número com segurança
 * @param {*} val - Valor a converter
 * @returns {number} Número ou 0 se inválido
 */
export const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

/**
 * Normaliza um código removendo espaços
 * @param {*} v - Valor a normalizar
 * @returns {string} Código normalizado
 */
export const normalizeCode = (v) => String(v ?? '').trim();

/**
 * Remove duplicatas de um array baseado no campo 'id'
 * @param {Array} list - Array a deduplificar
 * @returns {Array} Array sem duplicatas
 */
export const dedupeById = (list = []) => {
  const map = new Map();
  list.forEach((item) => {
    if (!item || item.id === undefined || item.id === null) return;
    map.set(String(item.id), item);
  });
  return Array.from(map.values());
};

/**
 * Obtém o peso unitário de um produto acabado
 * @param {string} code - Código do produto
 * @param {Object} pesoUnitarioPa - Mapa de pesos unitários
 * @returns {number} Peso unitário ou 0
 */
export const getUnitWeight = (code, pesoUnitarioPa = {}) => {
  const c = String(code || '').trim();
  return Number(pesoUnitarioPa[c]) || 0;
};

/**
 * Formata um número para o padrão brasileiro (pt-BR)
 * @param {number} value - Valor a formatar
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Valor formatado
 */
export const formatNumber = (value, decimals = 1) => {
  const num = safeNum(value);
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formata um peso em kg
 * @param {number} weight - Peso em kg
 * @returns {string} Peso formatado com unidade
 */
export const formatWeight = (weight) => {
  return `${formatNumber(weight, 1)} kg`;
};

/**
 * Calcula o percentual de um valor em relação a um total
 * @param {number} value - Valor parcial
 * @param {number} total - Valor total
 * @returns {number} Percentual (0-100)
 */
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (safeNum(value) / safeNum(total)) * 100;
};

/**
 * Agrupa um array de objetos por um campo específico
 * @param {Array} array - Array a agrupar
 * @param {string} key - Campo para agrupar
 * @returns {Object} Objeto com grupos
 */
export const groupBy = (array = [], key) => {
  return array.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
};

/**
 * Filtra um array por múltiplos critérios
 * @param {Array} array - Array a filtrar
 * @param {Object} criteria - Objeto com critérios { campo: valor }
 * @returns {Array} Array filtrado
 */
export const filterByCriteria = (array = [], criteria = {}) => {
  return array.filter((item) => {
    return Object.entries(criteria).every(([key, value]) => {
      if (value === null || value === undefined) return true;
      return item[key] === value;
    });
  });
};

/**
 * Ordena um array por um campo específico
 * @param {Array} array - Array a ordenar
 * @param {string} key - Campo para ordenar
 * @param {boolean} ascending - Se deve ordenar ascendente (padrão: true)
 * @returns {Array} Array ordenado
 */
export const sortBy = (array = [], key, ascending = true) => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
};

/**
 * Converte uma data para o formato brasileiro (DD/MM/YYYY)
 * @param {string|Date} date - Data a converter
 * @returns {string} Data formatada
 */
export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

/**
 * Converte uma data para o formato ISO (YYYY-MM-DD)
 * @param {string|Date} date - Data a converter
 * @returns {string} Data em formato ISO
 */
export const toISODate = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};
