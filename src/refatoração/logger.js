// src/services/logger.js

import { saveToDb } from './api';
import { EVENT_TYPES } from '../utils/constants';

/**
 * Registra um evento de rastreabilidade no Firebase.
 * @param {string} eventType - O tipo de evento (ex: EVENT_TYPES.B2_CUT).
 * @param {string} sourceId - O ID principal do item que iniciou o evento (ex: motherCoil.id).
 * @param {Array<string>} targetIds - Array de IDs dos itens criados/afetados.
 * @param {object} details - Detalhes adicionais do evento (ex: scrap, user, nf).
 */
export const logEvent = async (eventType, sourceId, targetIds = [], details = {}) => {
    if (!eventType || !sourceId) {
        console.error("Logger: eventType e sourceId são obrigatórios.");
        return;
    }

    const eventData = {
        eventType,
        sourceId: String(sourceId),
        targetIds: targetIds.map(String),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('pt-BR'),
        ...details,
    };

    try {
        // A coleção 'eventLogs' será criada automaticamente no Firebase
        await saveToDb('eventLogs', eventData);
        // console.log(`Evento logado: ${eventType} para ${sourceId}`);
    } catch (error) {
        console.error(`Erro ao logar evento ${eventType}:`, error);
    }
};

// Exemplo de uso:
// logEvent(EVENT_TYPES.B2_CUT, mother.id, savedChildrenReal.map(c => c.id), {
//     motherCode: mother.code,
//     scrapKg: manualScrap,
//     user: 'user@example.com' // Adicionar o usuário logado
// });
