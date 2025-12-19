
    isSavingB2PurchaseRef.current = true;
    setIsSavingB2Purchase(true);

    try {
      if (USE_LOCAL_JSON) {
        // Modo local: apenas mantém no estado para visualizar/testar
        alert("Bobina 2 pronta registrada localmente (modo JSON).");
      } else {
        const savedChildren = [];
        for (const child of tempChildren) {
          const { id: tempId, ...payload } = child;
          const saved = await saveToDb("childCoils", payload);
          savedChildren.push(saved);
        }

        setChildCoils((prev) => {
          const others = prev.filter((c) => !tempChildren.some((t) => t.id === c.id));
          return dedupeById([...others, ...savedChildren]);
        });

        await logUserAction("ENTRADA_B2_NF", {
          nf,
          b2Code,
          qty,
          totalWeight,
        });

        setItemsToPrint(savedChildren);
        setPrintType("coil");
        setShowPrintModal(true);
      }

      setNewB2Purchase({
        nf: "",
        entryDate: new Date().toISOString().split("T")[0],
        b2Code: "",
        b2Name: "",
        width: "",
        thickness: "",
        type: "",
        weight: "",
        quantity: "1",
      });
      setShowB2PurchaseForm(false);
      alert("Bobina 2 pronta registrada no estoque.");
    } catch (error) {
      console.error("Erro ao salvar bobina 2 comprada", error);
      alert("Erro ao salvar a bobina 2 na nuvem. Reverto a alteracao local.");
      setChildCoils(prevChildren);
    } finally {
      setIsSavingB2Purchase(false);
      isSavingB2PurchaseRef.current = false;
    }
  };

  const deleteMotherCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina permanentemente.")) {
      return;
    }

    // Remove otimista no front
    setMotherCoils(prev => prev.filter(m => m.id !== id));

    try {
      await deleteFromDb('motherCoils', id);
    } catch (error) {
      console.error('Erro ao excluir bobina no Firebase', error);
      alert('Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.');

      try {
        const mothers = await loadFromDb('motherCoils');
        if (Array.isArray(mothers)) {
          setMotherCoils(mothers);
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar dados após falha de exclusão', reloadError);
      }
    }
  };

  const deleteChildCoil = async (id) => {
    if (!window.confirm("Tem certeza? Isso apagará a bobina 2 permanentemente.")) {
      return;
    }

    setChildCoils((prev) => prev.filter((c) => c.id !== id));

    if (USE_LOCAL_JSON) return;

    try {
      await deleteFromDb("childCoils", id);
    } catch (error) {
      console.error("Erro ao excluir bobina 2 no Firebase", error);
      alert("Não consegui excluir no servidor. Vou tentar recarregar os dados do banco.");

      try {
        const children = await loadFromDb("childCoils");
        if (Array.isArray(children)) {
          setChildCoils(children);
        }
      } catch (reloadError) {
        console.error("Erro ao recarregar dados após falha de exclusão de B2", reloadError);
      }
    }
  };

  const updateChildCoil = async (coil) => {
    const { entryType, ...clean } = coil || {};
    const safeCoil = {
      ...clean,
      weight: parseFloat(clean.weight) || 0,
      width: parseFloat(clean.width) || 0,
    };

    setChildCoils((prev) => prev.map((c) => (c.id === safeCoil.id ? safeCoil : c)));
    setEditingChildCoil(null);

    if (USE_LOCAL_JSON) return;

    try {
      await updateInDb("childCoils", safeCoil.id, safeCoil);
    } catch (error) {
      console.error("Erro ao atualizar bobina 2 no Firebase", error);
      alert("Atualizei só localmente; não consegui salvar no servidor.");
    }
  };

  const addTempChildCoil = () => {
    // Função auxiliar para limpar números (Aceita 2000,50 e 2000.50)
    const parseWeight = (val) => {
        if (!val) return 0;
        return parseFloat(String(val).replace(',', '.').trim());
    };

    // --- LÓGICA MODO "OUTROS" ---
    if (isOtherMode) {
        if (!cutWeight || !otherDescription) return alert("Preencha a descrição e o peso.");
        
        const pesoLimpo = parseWeight(cutWeight); // <--- LIMPEZA AQUI

        setTempChildCoils([...tempChildCoils, {
            b2Code: 'CONSUMO',
            b2Name: otherDescription.toUpperCase(),
            width: 0,
            thickness: '-',
            type: 'OUTROS',
            weight: pesoLimpo,
            id: Date.now(),
            isDirectConsumption: true
        }]);
        
        setCutWeight('');
        setOtherDescription(''); 
        return;
    }

    // --- LÓGICA MODO "BOBINA 2" (PADRÃO) ---
    if (!targetB2Code || !cutWeight || !cutQuantity) return alert("Preencha todos os campos.");
    
    // Busca no ARQUIVO NOVO
    const b2Data = INITIAL_PRODUCT_CATALOG.find(p => p.b2Code === targetB2Code);
    if (!b2Data) return alert("Erro: Produto não encontrado no catálogo.");

    const totalWeight = parseWeight(cutWeight); // <--- LIMPEZA AQUI
    const qtd = parseInt(cutQuantity);
    
    if (qtd <= 0) return alert("Qtd deve ser maior que 0");

    const individualWeight = totalWeight / qtd;
    const newItems = [];
    
    for (let i = 0; i < qtd; i++) {
        newItems.push({
            b2Code: b2Data.b2Code,
            b2Name: b2Data.b2Name,
            width: parseFloat(b2Data.width),
            thickness: b2Data.thickness,
            type: b2Data.type, 
            weight: individualWeight, 
            id: Date.now() + Math.random() 
        });
    }

    setTempChildCoils([...tempChildCoils, ...newItems]);
    setCutWeight('');
    setCutQuantity('');
  };
  const confirmCut = async () => {
    const mother = motherCoils.find(m => m.id === selectedMotherForCut);
    if (!mother) return;

    // --- 1. PREPARAÇÃO DOS DADOS ---
    const dateParts = cuttingDate.split('-');
    const dateNow = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const totalCutsWeight = tempChildCoils.reduce((acc, curr) => acc + curr.weight, 0);
    const manualScrap = processScrap ? parseFloat(String(processScrap).replace(',', '.').trim()) : 0;
    const totalConsumed = totalCutsWeight + manualScrap;

    if (totalConsumed > mother.remainingWeight) {