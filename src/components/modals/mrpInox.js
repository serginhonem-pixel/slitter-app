export function calculateMaterialRequirements(products, demandRows, stockPositions) {
  const demandByProductId = new Map();
  demandRows.forEach((d) => {
    const prev = demandByProductId.get(d.productId) ?? 0;
    demandByProductId.set(d.productId, prev + (d.demandQty || 0));
  });

  const stockByProductId = new Map();
  stockPositions.forEach((s) => {
    stockByProductId.set(s.productId, s);
  });

  const rows = products.map((p) => {
    const demandQty = demandByProductId.get(p.id) ?? 0;

    const stock = stockByProductId.get(p.id) || {};
    const finishedStockQty = stock.finishedQty ?? 0;
    const blankStockQty = stock.blankQty ?? 0;

    const totalCoverageQty = finishedStockQty + blankStockQty;

    const coverageBalanceQty = demandQty - totalCoverageQty;

    const qtyToBuy = Math.max(0, coverageBalanceQty);

    const weightToBuyKg = qtyToBuy * (p.unitWeightKg || 0);

    const shortageFlag = qtyToBuy > 0;

    return {
      productId: p.id,
      productCode: p.code,
      description: p.description,
      unitWeightKg: p.unitWeightKg,

      demandQty,
      finishedStockQty,
      blankStockQty,
      totalCoverageQty,

      qtyToBuy,
      weightToBuyKg,

      shortageFlag,
      coverageBalanceQty,
    };
  });

  return rows;
}
