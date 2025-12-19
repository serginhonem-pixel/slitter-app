import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { INITIAL_INOX_BLANK_PRODUCTS } from '../../data/inoxCatalog';

const MotherCoilForm = ({
  newMotherCoil,
  setNewMotherCoil,
  showB2PurchaseForm,
  setShowB2PurchaseForm,
  newB2Purchase,
  setNewB2Purchase,
  productCatalog,
  handleSaveMotherCoil,
  isSavingB2Purchase,
  motherCatalog,
  // Props para o formulário de B2
  handleSaveB2Purchase,
  isSavingB2PurchaseRef,
}) => {
  // --- Define se estamos cadastrando bobina "normal" ou blank inox ---
  const family = (newMotherCoil?.family || "").toUpperCase();
  const typeUpper = (newMotherCoil?.type || "").toUpperCase();
  const currentForm = (newMotherCoil?.form || "").toUpperCase();
  const isInoxSelected =
    family === "INOX" || typeUpper === "INOX" || currentForm === "BLANK";
  const isB2Industrialized = currentForm === "B2_PURCHASE";

  // Catálogo de produtos inox
  const inoxProducts = INITIAL_INOX_BLANK_PRODUCTS || [];

  // LISTA ÚNICA DE TIPOS DE INOX (SEM REPETIÇÃO)
  const inoxGrades = useMemo(() => Array.from(
    new Set(inoxProducts.map((p) => p.inoxGrade))
  ).sort(), [inoxProducts]);

  const selectedInoxGrade = newMotherCoil?.inoxGrade || "";
  const defaultProductForSelectedGrade =
    inoxProducts.find((p) => p.inoxGrade === selectedInoxGrade) || null;

  const uniqueB2Catalog = useMemo(() => Array.from(
    new Map(
      productCatalog
        .filter((p) => p.b2Code)
        .map((p) => [p.b2Code, p])
    ).values()
  ).sort((a, b) => a.b2Name.localeCompare(b.b2Name)), [productCatalog]);

  const handleSelectPurchasedB2 = (code) => {
    const selected = productCatalog.find((p) => p.b2Code === code);
    setNewB2Purchase((prev) => ({
      ...prev,
      b2Code: code,
      b2Name: selected?.b2Name || prev.b2Name,
      width: selected?.width || prev.width,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
    setNewMotherCoil((prev) => ({
      ...prev,
      material: selected?.b2Name || prev.material,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
  };

  const purchaseQty = parseInt(newB2Purchase.quantity, 10) || 0;
  const purchaseTotalWeight = parseFloat(String(newB2Purchase.weight || "").replace(",", "."));
  const purchaseUnitWeight =
    purchaseQty > 0 && purchaseTotalWeight
      ? (purchaseTotalWeight / purchaseQty).toFixed(1)
      : null;

  const handleSelectInoxGrade = (e) => {
    const grade = e.target.value;

    if (!grade) {
      setNewMotherCoil({
        ...newMotherCoil,
        inoxGrade: "",
        material: "",
        family: "CARBONO", // Corrigido para Carbono/Bobina padrão
        form: "BOBINA",
        type: "",
        thickness: "",
        width: "",
        length: "",
      });
      return;
    }

    const defaultProduct = inoxProducts.find((p) => p.inoxGrade === grade);

    let thicknessStr = "";
    let width = "";
    let length = "";

    if (defaultProduct) {
      thicknessStr =
        defaultProduct.thickness != null
          ? defaultProduct.thickness.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "";
      width = defaultProduct.width ?? "";
      length = defaultProduct.length ?? "";
    }

    setNewMotherCoil({
      ...newMotherCoil,
      inoxGrade: grade, // coluna INOX
      material: defaultProduct?.measuresLabel // <-- AQUI MUDA O NOME LÁ EM CIMA
        ? `${grade} — ${defaultProduct.measuresLabel}`
        : grade,
      family: "INOX",
      form: "BLANK",
      type: "INOX",
      thickness: thicknessStr,
      width,
      length,
    });
  };

  const motherCoilCatalogOptions = useMemo(() => motherCatalog.map(m => ({
    value: m.code,
    label: `${m.code} - ${m.description} (${m.thickness}mm)`
  })), [motherCatalog]);

  const handleSelectMotherCoilCode = (code) => {
    const selected = motherCatalog.find(m => m.code.toString() === code.toString());
    setNewMotherCoil(prev => ({
      ...prev,
      code: code,
      material: selected?.description || prev.material,
      thickness: selected?.thickness || prev.thickness,
      type: selected?.type || prev.type,
    }));
  };

  const isFormValid = useMemo(() => {
    if (isB2Industrialized) {
      return newB2Purchase.b2Code && newB2Purchase.weight && newB2Purchase.quantity && newB2Purchase.nf;
    }
    if (isInoxSelected) {
      return newMotherCoil.code && newMotherCoil.weight && newMotherCoil.thickness && newMotherCoil.width && newMotherCoil.nf;
    }
    return newMotherCoil.code && newMotherCoil.weight && newMotherCoil.material && newMotherCoil.nf;
  }, [newMotherCoil, newB2Purchase, isB2Industrialized, isInoxSelected]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col justify-center">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Plus size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isInoxSelected ? "Novo Blank Inox" : isB2Industrialized ? "Entrada B2 Industrializada" : "Entrada de MP"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isInoxSelected
                ? "Cadastre chapas / blanks inox recebidos"
                : isB2Industrialized
                ? "Cadastre bobinas 2 prontas de NF"
                : "Cadastre a materia-prima recebida"}
            </p>
          </div>

          <div className="space-y-4">
            {/* --- LINHA 0: TIPO DE MATÉRIA-PRIMA (BOBINA x BLANK INOX x B2 NF) --- */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3">
                <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                  Tipo de Matéria-prima
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "CARBONO",
                        form: "BOBINA",
                        inoxGrade: "",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      !isInoxSelected && !isB2Industrialized
                        ? "bg-blue-600/20 border-blue-500/60 text-blue-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-500/40"
                    }`}
                  >
                    Bobina (a?o / galv)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(false);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "INOX",
                        form: "BLANK",
                        type: "INOX",
                        code: '',
                        weight: '',
                        nf: '',
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isInoxSelected && !isB2Industrialized
                        ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-500/40"
                    }`}
                  >
                    Blank Inox
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowB2PurchaseForm(true);
                      setNewMotherCoil({
                        ...newMotherCoil,
                        family: "B2",
                        form: "B2_PURCHASE",
                        type: "",
                        thickness: "",
                        width: "",
                        length: "",
                        code: '',
                        weight: '',
                        nf: '',
                      });
                    }}
                    className={`flex-1 text-xs font-semibold rounded-lg px-3 py-2 border transition ${
                      isB2Industrialized
                        ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-100"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500/40"
                    }`}
                  >
                    Bobina 2 - Industrializada
                  </button>
                </div>
              </div>
            </div>

            {isB2Industrialized ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nota Fiscal"
                    value={newB2Purchase.nf}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        nf: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Data Entrada"
                    type="date"
                    value={newB2Purchase.entryDate}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        entryDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                    Tipo de Bobina 2
                  </label>
                  <select
                    className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                    value={newB2Purchase.b2Code}
                    onChange={(e) => handleSelectPurchasedB2(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {uniqueB2Catalog.map((item) => (
                      <option key={item.b2Code} value={item.b2Code}>
                        {item.b2Code} - {item.b2Name} ({item.width || "-"}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Descrição Bobina 2"
                  value={newB2Purchase.b2Name}
                  onChange={(e) =>
                    setNewB2Purchase((prev) => ({
                      ...prev,
                      b2Name: e.target.value,
                    }))
                  }
                  placeholder="Ex: BOBINA 2 PERFIL UE"
                />

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Largura (mm)"
                    type="number"
                    value={newB2Purchase.width}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        width: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Espessura"
                    value={newB2Purchase.thickness}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        thickness: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Tipo"
                    value={newB2Purchase.type}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Peso Total (kg)"
                    type="number"
                    value={newB2Purchase.weight}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Quantidade (pçs)"
                    type="number"
                    value={newB2Purchase.quantity}
                    onChange={(e) =>
                      setNewB2Purchase((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>

                {purchaseUnitWeight && (
                  <p className="text-sm text-gray-400 text-center pt-2">
                    Peso Unitário Estimado:{" "}
                    <span className="font-bold text-lg text-yellow-400">
                      {purchaseUnitWeight} kg
                    </span>
                  </p>
                )}

                <Button
                  onClick={handleSaveB2Purchase}
                  disabled={!isFormValid || isSavingB2Purchase}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSavingB2Purchase ? "Salvando..." : "Cadastrar Bobina 2"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* --- LINHA 1: CÓDIGO E NF --- */}
                <div className="grid grid-cols-2 gap-3">
                  {isInoxSelected ? (
                    <Input
                      label="Código (Ex: 304-2B)"
                      value={newMotherCoil.code}
                      onChange={(e) =>
                        setNewMotherCoil((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                        Código MP
                      </label>
                      <select
                        className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                        value={newMotherCoil.code}
                        onChange={(e) => handleSelectMotherCoilCode(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {motherCoilCatalogOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Input
                    label="Nota Fiscal"
                    value={newMotherCoil.nf}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        nf: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* --- LINHA 2: PESO E DATA --- */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Peso (kg)"
                    type="number"
                    value={newMotherCoil.weight}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Data Entrada"
                    type="date"
                    value={newMotherCoil.entryDate}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        entryDate: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* --- LINHA 3: MATERIAL (APENAS SE NÃO FOR INOX) --- */}
                {!isInoxSelected && (
                  <Input
                    label="Material / Descrição"
                    value={newMotherCoil.material}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        material: e.target.value,
                      }))
                    }
                    placeholder="Ex: AÇO GALVALUME"
                  />
                )}

                {/* --- LINHA 4: INOX BLANK (SELECIONAR TIPO) --- */}
                {isInoxSelected && (
                  <div>
                    <label className="block text-xs font-bold text-blue-400/70 uppercase mb-1">
                      Grau do Inox
                    </label>
                    <select
                      className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900 text-white outline-none text-sm"
                      value={newMotherCoil.inoxGrade}
                      onChange={handleSelectInoxGrade}
                    >
                      <option value="">Selecione o Grau...</option>
                      {inoxGrades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* --- LINHA 5: ESPESSURA, LARGURA, TIPO --- */}
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Espessura"
                    value={newMotherCoil.thickness}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        thickness: e.target.value,
                      }))
                    }
                    disabled={isInoxSelected && !!defaultProductForSelectedGrade}
                  />
                  <Input
                    label="Largura (mm)"
                    type="number"
                    value={newMotherCoil.width}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        width: e.target.value,
                      }))
                    }
                    disabled={isInoxSelected && !!defaultProductForSelectedGrade}
                  />
                  <Input
                    label="Tipo"
                    value={newMotherCoil.type}
                    onChange={(e) =>
                      setNewMotherCoil((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                  />
                </div>

                <Button
                  onClick={handleSaveMotherCoil}
                  disabled={!isFormValid}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Cadastrar Bobina Mãe
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* LADO DIREITO: ESTOQUE ATUAL */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <h2 className="text-xl font-bold text-white mb-4">
            Estoque Atual de Matéria-Prima
          </h2>
          {/* Aqui virá o componente StockList ou a lógica de listagem */}
          <p className="text-gray-500">
            *A listagem de estoque será movida para o componente StockList na próxima fase de refatoração.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default MotherCoilForm;
