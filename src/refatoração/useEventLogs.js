import { useState, useCallback } from 'react';
import { saveToDb } from '../services/api';

/**
 * Hook para gerenciar logs de eventos (rastreabilidade)
 * Encapsula a lógica de criação e consulta de eventos
 */
export const useEventLogs = () => {
  const [eventLogs, setEventLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Tipos de eventos suportados
   */
  const EVENT_TYPES = {
    MP_ENTRY: 'MP_ENTRY',           // Entrada de Bobina Mãe
    B2_ENTRY_NF: 'B2_ENTRY_NF',     // Entrada de Bobina 2 comprada
    B2_CUT: 'B2_CUT',               // Corte de Bobina Mãe em Bobinas 2
    PA_PRODUCTION: 'PA_PRODUCTION', // Produção de Produto Acabado
    PA_SHIPPING: 'PA_SHIPPING',     // Expedição de Produto Acabado
  };

  /**
   * Registra um novo evento no sistema
   * @param {string} eventType - Tipo de evento (usar EVENT_TYPES)
   * @param {string} sourceId - ID do item que originou o movimento
   * @param {Array<string>} targetIds - IDs dos itens criados/afetados
   * @param {string} userId - ID do usuário que realizou a ação
   * @param {Object} details - Detalhes específicos da transação
   * @returns {Promise<Object>} Evento criado
   */
  const logEvent = useCallback(
    async (eventType, sourceId, targetIds = [], userId, details = {}) => {
      setIsLoading(true);
      try {
        const event = {
          timestamp: new Date().toISOString(),
          eventType,
          sourceId,
          targetIds: Array.isArray(targetIds) ? targetIds : [],
          userId,
          details,
          createdAt: new Date().toISOString(),
        };

        // Salvar no Firebase
        const savedEvent = await saveToDb('eventLogs', event);

        // Atualizar estado local
        setEventLogs((prev) => [savedEvent, ...prev]);

        return savedEvent;
      } catch (error) {
        console.error('Erro ao registrar evento:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Registra uma entrada de Bobina Mãe
   * @param {Object} motherCoil - Dados da bobina mãe
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Evento criado
   */
  const logMotherCoilEntry = useCallback(
    async (motherCoil, userId) => {
      return logEvent(
        EVENT_TYPES.MP_ENTRY,
        motherCoil.id,
        [],
        userId,
        {
          code: motherCoil.code,
          material: motherCoil.material,
          nf: motherCoil.nf,
          weight: motherCoil.weight,
          date: motherCoil.entryDate || new Date().toISOString().split('T')[0],
        }
      );
    },
    [logEvent, EVENT_TYPES]
  );

  /**
   * Registra uma entrada de Bobina 2 comprada
   * @param {Object} childCoil - Dados da bobina 2
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Evento criado
   */
  const logChildCoilEntry = useCallback(
    async (childCoil, userId) => {
      return logEvent(
        EVENT_TYPES.B2_ENTRY_NF,
        childCoil.id,
        [],
        userId,
        {
          b2Code: childCoil.b2Code,
          b2Name: childCoil.b2Name,
          nf: childCoil.nf,
          weight: childCoil.weight,
          date: childCoil.entryDate || new Date().toISOString().split('T')[0],
        }
      );
    },
    [logEvent, EVENT_TYPES]
  );

  /**
   * Registra um corte de Bobina Mãe em Bobinas 2
   * @param {string} motherCoilId - ID da bobina mãe
   * @param {Array<string>} childCoilIds - IDs das bobinas 2 criadas
   * @param {string} userId - ID do usuário
   * @param {Object} details - Detalhes do corte (peso, sucata, etc)
   * @returns {Promise<Object>} Evento criado
   */
  const logCut = useCallback(
    async (motherCoilId, childCoilIds, userId, details = {}) => {
      return logEvent(
        EVENT_TYPES.B2_CUT,
        motherCoilId,
        childCoilIds,
        userId,
        {
          totalWeight: details.totalWeight || 0,
          scrap: details.scrap || 0,
          date: details.date || new Date().toISOString().split('T')[0],
          ...details,
        }
      );
    },
    [logEvent, EVENT_TYPES]
  );

  /**
   * Registra uma produção de Produto Acabado
   * @param {string} childCoilId - ID da bobina 2 usada
   * @param {string} productionLogId - ID do log de produção
   * @param {string} userId - ID do usuário
   * @param {Object} details - Detalhes da produção
   * @returns {Promise<Object>} Evento criado
   */
  const logProduction = useCallback(
    async (childCoilId, productionLogId, userId, details = {}) => {
      return logEvent(
        EVENT_TYPES.PA_PRODUCTION,
        childCoilId,
        [productionLogId],
        userId,
        {
          productCode: details.productCode,
          productName: details.productName,
          pieces: details.pieces || 0,
          scrap: details.scrap || 0,
          date: details.date || new Date().toISOString().split('T')[0],
          ...details,
        }
      );
    },
    [logEvent, EVENT_TYPES]
  );

  /**
   * Registra uma expedição de Produto Acabado
   * @param {string} productionLogId - ID do log de produção
   * @param {string} userId - ID do usuário
   * @param {Object} details - Detalhes da expedição
   * @returns {Promise<Object>} Evento criado
   */
  const logShipping = useCallback(
    async (productionLogId, userId, details = {}) => {
      return logEvent(
        EVENT_TYPES.PA_SHIPPING,
        productionLogId,
        [],
        userId,
        {
          productCode: details.productCode,
          quantity: details.quantity || 0,
          destination: details.destination || '',
          date: details.date || new Date().toISOString().split('T')[0],
          ...details,
        }
      );
    },
    [logEvent, EVENT_TYPES]
  );

  /**
   * Obtém os últimos N eventos
   * @param {number} limit - Número de eventos a retornar (padrão: 10)
   * @returns {Array} Últimos eventos
   */
  const getLatestEvents = useCallback((limit = 10) => {
    return eventLogs.slice(0, limit);
  }, [eventLogs]);

  /**
   * Filtra eventos por tipo
   * @param {string} eventType - Tipo de evento
   * @returns {Array} Eventos do tipo especificado
   */
  const getEventsByType = useCallback(
    (eventType) => {
      return eventLogs.filter((e) => e.eventType === eventType);
    },
    [eventLogs]
  );

  /**
   * Encontra todos os eventos relacionados a um item
   * (rastreabilidade reversa)
   * @param {string} itemId - ID do item
   * @returns {Array} Eventos que envolvem o item
   */
  const getEventsForItem = useCallback(
    (itemId) => {
      return eventLogs.filter(
        (e) => e.sourceId === itemId || e.targetIds.includes(itemId)
      );
    },
    [eventLogs]
  );

  return {
    // Estado
    eventLogs,
    isLoading,

    // Constantes
    EVENT_TYPES,

    // Métodos
    logEvent,
    logMotherCoilEntry,
    logChildCoilEntry,
    logCut,
    logProduction,
    logShipping,
    getLatestEvents,
    getEventsByType,
    getEventsForItem,
  };
};
