import { useCallback, useState } from 'react';
import { loadFromDb, saveToDb } from '../services/api';
import { EVENT_TYPES } from '../utils/constants';

const sortByTimestamp = (list = []) =>
  [...list].sort(
    (a, b) =>
      new Date(b.timestamp || b.createdAt || 0).getTime() -
      new Date(a.timestamp || a.createdAt || 0).getTime(),
  );

export const useEventLogs = ({ persist = true } = {}) => {
  const [eventLogs, setEventLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const pushEvent = useCallback((event) => {
    if (!event) return;
    setEventLogs((prev) => sortByTimestamp([event, ...prev]));
  }, []);

  const logEvent = useCallback(
    async (eventType, sourceId, targetIds = [], userId, details = {}) => {
      if (!eventType || !sourceId) {
        console.warn('logEvent: eventType e sourceId são obrigatórios.');
        return null;
      }

      setIsLoading(true);
      try {
        const eventPayload = {
          eventType,
          sourceId: String(sourceId),
          targetIds: Array.isArray(targetIds)
            ? targetIds.map((id) => String(id))
            : [],
          userId: userId || null,
          details,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        if (!persist) {
          pushEvent(eventPayload);
          return eventPayload;
        }

        const saved = await saveToDb('eventLogs', eventPayload);
        pushEvent(saved);
        return saved;
      } catch (error) {
        console.error('Erro ao registrar evento:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [persist, pushEvent],
  );

  const logMotherCoilEntry = useCallback(
    (motherCoil, userId, extraDetails = {}) => {
      if (!motherCoil) return null;
      return logEvent(EVENT_TYPES.MP_ENTRY, motherCoil.id, [], userId, {
        code: motherCoil.code,
        material: motherCoil.material,
        nf: motherCoil.nf,
        weight: motherCoil.weight,
        date: motherCoil.entryDate || new Date().toISOString().split('T')[0],
        ...extraDetails,
      });
    },
    [logEvent],
  );

  const logChildCoilEntry = useCallback(
    (childCoil, userId, extraDetails = {}) => {
      if (!childCoil) return null;
      return logEvent(EVENT_TYPES.B2_ENTRY_NF, childCoil.id, [], userId, {
        b2Code: childCoil.b2Code,
        b2Name: childCoil.b2Name,
        nf: childCoil.nf,
        weight: childCoil.weight,
        date: childCoil.entryDate || childCoil.createdAt,
        ...extraDetails,
      });
    },
    [logEvent],
  );

  const logCut = useCallback(
    (motherId, childIds = [], userId, details = {}) => {
      if (!motherId) return null;
      return logEvent(EVENT_TYPES.B2_CUT, motherId, childIds, userId, details);
    },
    [logEvent],
  );

  const logProduction = useCallback(
    (sourceId, productionIds = [], userId, details = {}) => {
      if (!sourceId) return null;
      return logEvent(EVENT_TYPES.PA_PRODUCTION, sourceId, productionIds, userId, details);
    },
    [logEvent],
  );

  const logShipping = useCallback(
    (productionLogId, userId, details = {}) => {
      if (!productionLogId) return null;
      return logEvent(EVENT_TYPES.PA_SHIPPING, productionLogId, [], userId, details);
    },
    [logEvent],
  );

  const loadInitialEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const logs = await loadFromDb('eventLogs');
      setEventLogs(sortByTimestamp(logs));
      return logs;
    } catch (error) {
      console.error('Erro ao carregar eventLogs:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hydrateLocalEvents = useCallback((logs = []) => {
    setEventLogs(sortByTimestamp(logs));
  }, []);

  const getLatestEvents = useCallback(
    (limit = 10) => eventLogs.slice(0, limit),
    [eventLogs],
  );

  const getEventsByType = useCallback(
    (eventType) => eventLogs.filter((event) => event.eventType === eventType),
    [eventLogs],
  );

  const getEventsForItem = useCallback(
    (itemId) =>
      eventLogs.filter(
        (event) => event.sourceId === String(itemId) || event.targetIds.includes(String(itemId)),
      ),
    [eventLogs],
  );

  return {
    eventLogs,
    isLoading,
    logEvent,
    logMotherCoilEntry,
    logChildCoilEntry,
    logCut,
    logProduction,
    logShipping,
    getLatestEvents,
    getEventsByType,
    getEventsForItem,
    loadInitialEvents,
    hydrateLocalEvents,
  };
};
