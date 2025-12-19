/**
 * EXEMPLO DE INTEGRAÇÃO DO SISTEMA DE EVENTLOGS
 * 
 * Este arquivo demonstra como integrar o novo sistema de rastreabilidade
 * nas funções existentes do App.jsx
 * 
 * IMPORTANTE: Copiar apenas os trechos relevantes para seu código!
 */

// ============================================================================
// 1. IMPORTAÇÕES (adicionar no topo do App.jsx)
// ============================================================================

import { useEventLogs } from './hooks/useEventLogs';
import { useStockData } from './hooks/useStockData';
import LatestMovementsPanel from './components/LatestMovementsPanel';

// ============================================================================
// 2. DENTRO DA FUNÇÃO App() - ADICIONAR O HOOK
// ============================================================================

export default function App() {
  // ... outros hooks ...
  
  // Novo hook para rastreabilidade
  const { 
    logEvent, 
    EVENT_TYPES, 
    getLatestEvents,
    getEventsForItem 
  } = useEventLogs();

  // Hook para dados de estoque
  const stockData = useStockData(
    motherCoils,
    childCoils,
    productionLogs,
    shippingLogs,
    motherCatalog
  );

  // ... resto do código ...
}

// ============================================================================
// 3. MODIFICAR saveMotherCoil() - ADICIONAR LOGGING
// ============================================================================

const saveMotherCoil = async () => {
  if (!newMotherCoil.code || !newMotherCoil.weight) {
    return alert("Preencha Código e Peso.");
  }

  setMotherCoils((prev) => [
    ...prev,
    { ...newMotherCoil, id: Date.now(), status: "stock", remainingWeight: parseFloat(newMotherCoil.weight) },
  ]);

  try {
    if (USE_LOCAL_JSON) {
      alert("Bobina mãe registrada localmente (modo JSON).");
    } else {
      // Salvar no Firebase
      const savedCoil = await saveToDb("motherCoils", {
        ...newMotherCoil,
        status: "stock",
        remainingWeight: parseFloat(newMotherCoil.weight),
        createdAt: new Date().toISOString(),
      });

      // ✅ NOVO: Registrar evento de entrada
      await logEvent(
        EVENT_TYPES.MP_ENTRY,
        savedCoil.id,
        [],
        user.uid,
        {
          code: newMotherCoil.code,
          material: newMotherCoil.material,
          nf: newMotherCoil.nf,
          weight: newMotherCoil.weight,
          date: newMotherCoil.entryDate,
        }
      );

      // Log de auditoria
      await logUserAction("ENTRADA_MP", {
        code: newMotherCoil.code,
        nf: newMotherCoil.nf,
        weight: newMotherCoil.weight,
      });
    }

    // Limpar formulário
    setNewMotherCoil({
      code: "",
      nf: "",
      weight: "",
      material: "",
      width: "",
      thickness: "",
      type: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
    alert("Bobina mãe registrada com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar bobina mãe", error);
    alert("Erro ao salvar a bobina mãe na nuvem.");
    setMotherCoils((prev) => prev.slice(0, -1));
  }
};

// ============================================================================
// 4. MODIFICAR confirmCut() - ADICIONAR LOGGING
// ============================================================================

const confirmCut = async () => {
  const mother = motherCoils.find((m) => m.id === selectedMotherForCut);
  if (!mother) return;

  // ... código existente de preparação ...

  try {
    if (USE_LOCAL_JSON) {
      alert("Corte registrado localmente (modo JSON).");
    } else {
      const savedChildren = [];
      for (const child of tempChildCoils) {
        const { id: tempId, ...payload } = child;
        const saved = await saveToDb("childCoils", payload);
        savedChildren.push(saved);
      }

      setChildCoils((prev) => {
        const others = prev.filter((c) => !tempChildCoils.some((t) => t.id === c.id));
        return dedupeById([...others, ...savedChildren]);
      });

      // ✅ NOVO: Registrar evento de corte
      const childCoilIds = savedChildren.map((c) => c.id);
      await logEvent(
        EVENT_TYPES.B2_CUT,
        selectedMotherForCut,
        childCoilIds,
        user.uid,
        {
          totalWeight: totalCutsWeight,
          scrap: manualScrap,
          date: cuttingDate,
          motherCode: mother.code,
          childCount: childCoilIds.length,
        }
      );

      // Log de auditoria
      await logUserAction("CORTE_B2", {
        motherCode: mother.code,
        childCount: childCoilIds.length,
        totalWeight: totalCutsWeight,
        scrap: manualScrap,
      });

      setItemsToPrint(savedChildren);
      setPrintType("coil");
      setShowPrintModal(true);
    }

    // Limpar estado
    setSelectedMotherForCut("");
    setTempChildCoils([]);
    setCutWeight("");
    setCutQuantity("");
    alert("Corte registrado com sucesso!");
  } catch (error) {
    console.error("Erro ao registrar corte", error);
    alert("Erro ao registrar o corte na nuvem.");
  }
};

// ============================================================================
// 5. MODIFICAR saveProdLog() - ADICIONAR LOGGING
// ============================================================================

const saveProdLog = async () => {
  if (!selectedChildForProd || !selectedProductCode || !prodPieces) {
    return alert("Preencha todos os campos.");
  }

  try {
    if (USE_LOCAL_JSON) {
      alert("Produção registrada localmente (modo JSON).");
    } else {
      const childCoil = childCoils.find((c) => c.id === selectedChildForProd);
      const product = productCatalog.find((p) => p.code === selectedProductCode);

      const payload = {
        date: productionDate,
        childCoilId: selectedChildForProd,
        motherCode: childCoil?.motherCode,
        b2Code: childCoil?.b2Code,
        productCode: selectedProductCode,
        productName: product?.name,
        pieces: parseInt(prodPieces),
        scrap: parseFloat(prodScrap) || 0,
        createdAt: new Date().toISOString(),
      };

      const savedLog = await saveToDb("productionLogs", payload);

      setProductionLogs((prev) => [savedLog, ...prev]);

      // ✅ NOVO: Registrar evento de produção
      await logEvent(
        EVENT_TYPES.PA_PRODUCTION,
        selectedChildForProd,
        [savedLog.id],
        user.uid,
        {
          productCode: selectedProductCode,
          productName: product?.name,
          pieces: prodPieces,
          scrap: prodScrap,
          date: productionDate,
        }
      );

      // Log de auditoria
      await logUserAction("PRODUCAO_PA", {
        productCode: selectedProductCode,
        pieces: prodPieces,
        scrap: prodScrap,
      });

      // Limpar formulário
      setSelectedChildForProd("");
      setSelectedProductCode("");
      setProdPieces("");
      setProdScrap("");
      alert("Produção registrada com sucesso!");
    }
  } catch (error) {
    console.error("Erro ao registrar produção", error);
    alert("Erro ao registrar a produção na nuvem.");
  }
};

// ============================================================================
// 6. ADICIONAR PAINEL DE ÚLTIMOS MOVIMENTOS NA DASHBOARD
// ============================================================================

// No renderDashboard(), adicionar este componente:

const renderDashboard = () => {
  const latestEvents = getLatestEvents(10);

  return (
    <div className="space-y-6">
      {/* ... KPIs existentes ... */}

      {/* ✅ NOVO: Painel de Últimos Movimentos */}
      <LatestMovementsPanel 
        events={latestEvents}
        onViewDetails={(event) => {
          // Abrir modal com detalhes do evento
          console.log("Detalhes do evento:", event);
          // Implementar modal de auditoria aqui
        }}
      />

      {/* ... resto da dashboard ... */}
    </div>
  );
};

// ============================================================================
// 7. EXEMPLO DE AUDITORIA - ENCONTRAR TODOS OS EVENTOS DE UM ITEM
// ============================================================================

const handleAuditItem = (itemId) => {
  const itemHistory = getEventsForItem(itemId);
  
  console.log(`Histórico completo do item ${itemId}:`);
  itemHistory.forEach((event) => {
    console.log(`- ${event.eventType} em ${event.timestamp}`);
    console.log(`  Detalhes:`, event.details);
  });

  // Exibir em um modal
  // setSelectedItemHistory(itemHistory);
  // setShowAuditModal(true);
};

// ============================================================================
// 8. CHECKLIST DE INTEGRAÇÃO
// ============================================================================

/*
CHECKLIST PARA INTEGRAÇÃO COMPLETA:

[ ] 1. Importar useEventLogs no App.jsx
[ ] 2. Importar useStockData no App.jsx
[ ] 3. Importar LatestMovementsPanel no App.jsx
[ ] 4. Adicionar const { logEvent, EVENT_TYPES, ... } = useEventLogs()
[ ] 5. Modificar saveMotherCoil() para registrar MP_ENTRY
[ ] 6. Modificar saveB2Purchase() para registrar B2_ENTRY_NF
[ ] 7. Modificar confirmCut() para registrar B2_CUT
[ ] 8. Modificar saveProdLog() para registrar PA_PRODUCTION
[ ] 9. Modificar handleShip() para registrar PA_SHIPPING
[ ] 10. Adicionar LatestMovementsPanel ao renderDashboard()
[ ] 11. Testar cada função para garantir que os eventos estão sendo registrados
[ ] 12. Validar no Firebase que a coleção eventLogs está sendo populada

RESULTADO ESPERADO:
- Cada ação importante cria um documento em eventLogs
- O painel de Últimos Movimentos exibe os 10 eventos mais recentes
- A rastreabilidade reversa funciona (getEventsForItem)
- A auditoria é facilitada com informações completas de cada movimento
*/
