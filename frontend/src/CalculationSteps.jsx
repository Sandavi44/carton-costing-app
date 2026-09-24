import React from 'react';

export default function CalculationSteps({ formData, calculatedCost, theme }) {
  if (!calculatedCost) {
    return (
      <div className={`rounded-2xl shadow-xl p-8 text-center ${
        theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-800'
      }`}>
        <h2 className="text-2xl font-bold mb-4">🧮 Calculation Logic & Steps</h2>
        <div className="max-w-md mx-auto py-8">
          <span className="text-5xl">💡</span>
          <p className="text-gray-500 dark:text-slate-400 mt-4 font-medium">
            Please perform a calculation in the <strong>Calculator</strong> tab first. 
            Once calculated, this tab will show a live step-by-step solver substituting your inputs into all the equations.
          </p>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  // Helper variables for equations
  const L = parseFloat(formData.cartonLength || 0);
  const W = parseFloat(formData.cartonWidth || 0);
  const H = parseFloat(formData.cartonHeight || 0);
  const Qty = parseInt(formData.quantity || 1);
  const ply = formData.plyType;
  const boardType = formData.boardType;
  const flute1 = formData.fluteType || calculatedCost.material?.flute_type || 'B-Flute';
  const flute2 = formData.fluteType2 || calculatedCost.material?.flute_type_2 || flute1;
  const getWaveFactor = (flute) => {
    if (flute === 'E-Flute' || flute === 'E') return 1.26;
    if (flute === 'B-Flute' || flute === 'B') return 1.35;
    return 1.43;
  };
  const wf1 = getWaveFactor(flute1);
  const wf2 = getWaveFactor(flute2);
  const g1 = parseFloat(formData.gsm1) || 0;
  const g2 = parseFloat(formData.gsm2) || 0;
  const g3 = parseFloat(formData.gsm3) || 0;
  const g4 = parseFloat(formData.gsm4) || 0;
  const g5 = parseFloat(formData.gsm5) || 0;

  const cartonType = formData.cartonType || calculatedCost.dimensions?.carton_type || 'RSC';
  const dieLength = parseFloat(formData.dieLength || calculatedCost.dimensions?.die_length_mm || 0);
  const dieWidth = parseFloat(formData.dieWidth || calculatedCost.dimensions?.die_width_mm || 0);
  const isDieCut = cartonType !== 'RSC';

  const cartonCategory = calculatedCost.dimensions?.carton_category || calculatedCost.category?.carton_category || (
    (calculatedCost.sheet_dimensions.board_area_m2 <= 0.450) ? 'S' : (calculatedCost.sheet_dimensions.board_area_m2 <= 0.800) ? 'M' : 'L'
  );
  const proposedJoining = calculatedCost.category?.proposed_costs?.joining_cost ?? (
    formData.joiningType === 'Stitched' ? (H > 0 ? Math.max(0, parseFloat((((H / 25) - 1) * 2).toFixed(2))) : 0) : (cartonCategory === 'S' ? 3.0 : cartonCategory === 'M' ? 4.5 : 6.0)
  );
  const proposedPrint = calculatedCost.category?.proposed_costs?.print_cost ?? (
    formData.isPrinted ? (cartonCategory === 'S' ? 3.0 : cartonCategory === 'M' ? 4.0 : 6.0) : 0
  );
  const proposedSlotting = calculatedCost.category?.proposed_costs?.slotting_cost ?? (
    (ply === '2-Ply' || ply === '3-Ply') ? 1.75 : 2.50
  );

  // Retrieve calculated results
  const sheetLength = calculatedCost.sheet_dimensions.sheet_length_mm;
  const sheetWidth = calculatedCost.sheet_dimensions.sheet_width_mm;
  const selectedReel = calculatedCost.reel_information?.selected_reel_mm ?? calculatedCost.sheet_dimensions.selected_reel_mm;
  const sheetsPerReel = calculatedCost.reel_information?.sheets_per_reel ?? calculatedCost.sheet_dimensions.sheets_per_reel;
  const wastePerReel = calculatedCost.reel_information?.waste_per_reel_mm ?? calculatedCost.sheet_dimensions.reel_waste_mm;
  const boardArea = calculatedCost.sheet_dimensions.board_area_m2;
  const totalGsm = calculatedCost.material.total_gsm;
  const wastePercent = calculatedCost.material.waste_allowance_percent ?? (formData.productionMethod === 'Outsource' ? 3.0 : 5.0);
  const weightPerSheet = calculatedCost.material.weight_per_sheet_kg;
  const rate = calculatedCost.rates.rate_per_kg;
  const rmCostBeforeSscl = calculatedCost.rates.rm_cost_before_sscl ?? (weightPerSheet * rate);
  const ssclRate = calculatedCost.rates.sscl_rate ?? 2.125;
  const ssclOnRm = calculatedCost.rates.sscl_on_rm ?? (rmCostBeforeSscl * (ssclRate / 100));
  const inputTaxRate = calculatedCost.rates.input_tax_rate ?? 18.0;
  const inputTaxOnRm = calculatedCost.rates.input_tax_on_rm ?? 0.0;
  const vatRate = calculatedCost.rates.vat_rate ?? 18.0;
  const rmCostWithSscl = calculatedCost.rates.rm_cost_with_sscl ?? (rmCostBeforeSscl + ssclOnRm);
  const rmCost = calculatedCost.rates.rm_cost_per_carton;
  const overheadTotal = parseFloat(formData.totalOverheadForOrder || 0);
  const overheadPerCarton = calculatedCost.per_carton_costs.overhead;
  const joiningCost = calculatedCost.per_carton_costs.joining;
  const printCost = calculatedCost.per_carton_costs.print;
  const slotting = parseFloat(formData.slottingCost || 0);
  const bundling = parseFloat(formData.bundlingCost || 0);
  const diecutting = parseFloat(formData.diecuttingCost || 0);
  const additional = slotting + bundling + diecutting;
  const subtotal = calculatedCost.per_carton_costs.subtotal;
  const profitMargin = parseFloat(formData.profitMargin || 0);
  const profitAmount = calculatedCost.profit.profit_amount;
  const costWithProfit = calculatedCost.profit.cost_with_profit;

  // Commissions
  const hasInhouseCommission = calculatedCost.commissions?.has_inhouse_commission ?? formData.hasInhouseCommission;
  const inhouseCommission = calculatedCost.commissions?.inhouse_commission ?? 0;
  const costAfterInhouse = calculatedCost.commissions?.cost_after_inhouse ?? (costWithProfit + inhouseCommission);
  const hasThirdPartyCommission = calculatedCost.commissions?.has_third_party_commission ?? formData.hasThirdPartyCommission;
  const thirdPartyCommission = calculatedCost.commissions?.third_party_commission ?? 0;
  const costAfterCommissions = calculatedCost.commissions?.cost_after_commissions ?? (costAfterInhouse + thirdPartyCommission);

  // Transport
  const hasTransport = calculatedCost.transport?.has_transport ?? formData.hasTransport;
  const transportCost = calculatedCost.transport?.transport_cost ?? 0;
  const transport = calculatedCost.transport?.transport_per_carton ?? 0;

  const taxType = formData.taxType || calculatedCost.tax?.tax_type || '';
  const isNonVat = taxType === 'Non-VAT' || taxType.includes('Non-VAT');
  const taxAmount = isNonVat ? 0 : (calculatedCost.tax?.tax_amount_per_carton || 0);
  const finalCost = isNonVat 
    ? (costAfterCommissions + transport) 
    : (calculatedCost.final?.final_cost_per_carton ?? (costAfterCommissions + transport + taxAmount));
  const batchCost = finalCost * Qty;
  const totalInvoiceValue = finalCost * Qty;
  const totalRmCost = rmCost * Qty;
  const totalNetProfit = profitAmount * Qty;

  // Modern Shell CSS Variables
  const cardClass = `p-6 rounded-2xl border transition-all duration-200 ${
    isDark ? 'bg-slate-800/40 border-slate-700 text-white' : 'bg-slate-50/40 border-gray-150 text-gray-800'
  }`;

  const solveBoxClass = `p-4 rounded-xl border text-sm mt-1.5 font-mono ${
    isDark ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white border-gray-100 text-gray-600'
  }`;

  const phaseHeaderClass = `text-md font-bold uppercase tracking-wider mb-4 ${
    isDark ? 'text-blue-400' : 'text-blue-900'
  }`;

  return (
    <div className={`rounded-2xl shadow-xl p-8 max-w-4xl mx-auto transition-colors duration-200 text-left ${
      isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white text-gray-800'
    }`}>
      <h2 className={`text-2xl font-bold mb-6 border-b pb-4 flex items-center gap-2 ${
        isDark ? 'border-slate-700' : 'border-gray-100'
      }`}>
        <span>🧮</span> Live Costing Step-by-Step Solver
      </h2>

      <div className="space-y-8">
        {/* PHASE 1 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 1: Sheet Dimensions</h3>
          <div className="space-y-4">
            {isDieCut ? (
              <>
                <div className={`p-3 rounded-xl mb-3 text-xs font-medium border ${
                  isDark ? 'bg-purple-950/40 text-purple-200 border-purple-800/40' : 'bg-purple-50 text-purple-900 border-purple-200'
                }`}>
                  ✂️ <strong>Carton Type: {cartonType}</strong> — Die-cut carton dimensions are applied directly to board/sheet size.
                </div>
                <div>
                  <p className="text-sm font-semibold">1. Sheet Length Calculation</p>
                  <div className={solveBoxClass}>
                    <p className="opacity-70">Equation: Sheet Length = Die Length (Direct Board Dimension)</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: Die Length = {sheetLength.toFixed(2)} mm
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">2. Sheet Width Calculation</p>
                  <div className={solveBoxClass}>
                    <p className="opacity-70">Equation: Sheet Width = Die Width (Direct Board Dimension)</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: Die Width = {sheetWidth.toFixed(2)} mm
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold">1. Sheet Length Calculation</p>
                  <div className={solveBoxClass}>
                    <p className="opacity-70">Equation: {(ply === '2-Ply' || ply === '3-Ply') ? 'Length = (L + W) * 2 + 62' : 'Length = (L + W) * 2 + 75'}</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: ({L} + {W}) * 2 + {(ply === '2-Ply' || ply === '3-Ply') ? 62 : 75} = {sheetLength.toFixed(2)} mm
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">2. Sheet Width Calculation</p>
                  <div className={solveBoxClass}>
                    <p className="opacity-70">Equation: Width = (W + H) + X (X: 2-Ply/3-Ply = 26, 5-Ply = 32, 7-Ply = 36)</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: ({W} + {H}) + {(ply === '2-Ply' || ply === '3-Ply') ? 26 : ply === '5-Ply' ? 32 : 36} = {sheetWidth.toFixed(2)} mm
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PHASE 2 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 2: Board Area</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Sheet Slicing Sourcing Area</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Area = Sheet Length * Selected Reel Width / Slices</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: ({sheetLength} * {selectedReel}) / {sheetsPerReel} = {(sheetLength * selectedReel / sheetsPerReel).toFixed(2)} mm²
                </p>
                <p className="text-blue-500 font-bold">
                  Convert to m²: {(sheetLength * selectedReel / sheetsPerReel).toFixed(2)} / 1,000,000 = {boardArea.toFixed(4)} m²
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">2. Carton Categorization (Internal Calculation Rule)</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">
                  Categorization Rule: Type S (0 – 0.450 m²), Type M (0.451 – 0.800 m²), Type L (≥ 0.801 m²)
                </p>
                <p className="text-blue-500 font-bold mt-1">
                  Board Area = {boardArea.toFixed(4)} m² → <span className="underline">Carton Category: Type {cartonCategory}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 3 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 3: Material Weight</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Total GSM (with Wave Factor)</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">
                  {ply === '2-Ply' && `Equation: Total GSM = Liner 1 (Outer 1) + Flute 1 * Flute Factor (${wf1})`}
                  {ply === '3-Ply' && `Equation: Total GSM = Liner 1 + Flute 1 * Flute Factor (${wf1}) + Liner 2 (Outer Liner)`}
                  {ply === '5-Ply' && `Equation: Total GSM = Liner 1 + Flute 1 * Flute Type 1 Factor (${wf1}) + Liner 2 (Middle) + Flute 2 * Flute Type 2 Factor (${wf2}) + Liner 3 (Outer Liner)`}
                  {ply === '7-Ply' && `Equation: Total GSM = Liner 1 + Flute 1 * Flute Type 1 Factor (${wf1}) + Liner 2 + Flute 2 * Flute Type 2 Factor (${wf2}) + Liner 3 + Flute 3 * Flute Type 1 Factor (${wf1}) + Liner 4`}
                </p>
                <p className="text-blue-500 font-bold mt-1">
                  {ply === '2-Ply' && `Solve: ${g1} + (${g2} * ${wf1}) = ${g1} + ${(g2 * wf1).toFixed(2)} = ${totalGsm.toFixed(2)} gsm`}
                  {ply === '3-Ply' && `Solve: ${g1} + (${g2} * ${wf1}) + ${g3} = ${g1} + ${(g2 * wf1).toFixed(2)} + ${g3} = ${totalGsm.toFixed(2)} gsm`}
                  {ply === '5-Ply' && `Solve: ${g1} + (${g2} * ${wf1}) + ${g3} + (${g4} * ${wf2}) + ${g5} = ${g1} + ${(g2 * wf1).toFixed(2)} + ${g3} + ${(g4 * wf2).toFixed(2)} + ${g5} = ${totalGsm.toFixed(2)} gsm`}
                  {ply === '7-Ply' && `Solve: Total GSM = ${totalGsm.toFixed(2)} gsm`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">2. Net Paper Weight per Sheet (kg)</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Net Weight = (Total GSM * Board Area) / 1000</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: ({totalGsm.toFixed(2)} * {boardArea.toFixed(4)}) / 1000 = {((totalGsm * boardArea) / 1000).toFixed(4)} kg
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">3. Gross Weight with Sourcing Waste Allowance ({wastePercent}%)</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Gross Weight = Net Weight * (1 + Waste %)</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: {((totalGsm * boardArea) / 1000).toFixed(4)} kg * (1 + {wastePercent}%) = {weightPerSheet.toFixed(4)} kg per sheet
                </p>
                <p className="text-xxs opacity-70 mt-1">
                  (Applied waste allowance: {wastePercent}% for {formData.productionMethod || 'In-house'} sourcing)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 4 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 4: Raw Material Cost (Compounded Sourcing Taxes)</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Base Raw Material Cost</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Base RM Cost = Gross Weight * Rate per kg</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: {weightPerSheet.toFixed(4)} kg * Rs. {rate.toFixed(2)} = Rs. {rmCostBeforeSscl.toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">2. Sourcing SSCL compounding ({ssclRate}%)</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: SSCL Amount = Base RM Cost * {ssclRate}%</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: Rs. {rmCostBeforeSscl.toFixed(2)} * {ssclRate}% = Rs. {ssclOnRm.toFixed(2)}
                </p>
                <p className="text-blue-500 font-bold">
                  SSCL-Inclusive Cost = {rmCostBeforeSscl.toFixed(2)} + {ssclOnRm.toFixed(2)} = Rs. {rmCostWithSscl.toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">3. Input VAT compounding ({inputTaxRate}%) - Non-VAT customers only</p>
              <div className={solveBoxClass}>
                {formData.taxType.includes('Non-VAT') ? (
                  <>
                    <p className="opacity-70">Equation: Input VAT = SSCL-Inclusive Cost * {inputTaxRate}%</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: Rs. {rmCostWithSscl.toFixed(2)} * {inputTaxRate}% = Rs. {inputTaxOnRm.toFixed(2)}
                    </p>
                    <p className="text-blue-500 font-bold">
                      Total RM Cost = {rmCostWithSscl.toFixed(2)} + {inputTaxOnRm.toFixed(2)} = Rs. {rmCost.toFixed(2)} per carton
                    </p>
                  </>
                ) : (
                  <>
                    <p className="opacity-70 font-semibold">VAT registered customer: Skip Input VAT compounding in raw materials cost (Rs. 0.00)</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Total RM Cost = Rs. {rmCost.toFixed(2)} per carton
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 5 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 5: Overhead & Extra Surcharges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold">1. Per-Carton Cost Breakdown</p>
              <div className={`p-4 rounded-xl border text-sm mt-1.5 space-y-2.5 font-mono ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-gray-100 text-gray-600'
              }`}>
                <div className="flex justify-between">
                  <span>RM Cost:</span>
                  <span className="font-bold">Rs. {rmCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-dashed dark:border-slate-700">
                  <span>Overhead Allocation (Total Rs. {Math.round(overheadTotal)} / Qty {Qty}):</span>
                  <span className="font-bold">Rs. {overheadPerCarton.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-dashed dark:border-slate-700">
                  <span>Joining ({formData.joiningType}):</span>
                  <span className="font-bold">Rs. {joiningCost.toFixed(2)}</span>
                </div>
                {formData.isPrinted && (
                  <div className="flex justify-between py-1 border-t border-dashed dark:border-slate-700">
                    <span>Printing Cost:</span>
                    <span className="font-bold">Rs. {printCost.toFixed(2)}</span>
                  </div>
                )}
                {additional > 0 && (
                  <div className="py-1 border-t border-dashed dark:border-slate-700">
                    <div className="flex justify-between">
                      <span>Additional Costs:</span>
                      <span className="font-bold">Rs. {additional.toFixed(2)}</span>
                    </div>
                    <div className="pl-4 pt-1 space-y-0.5 text-xs opacity-80">
                      {slotting > 0 && (
                        <div className="flex justify-between">
                          <span>• Slotting:</span>
                          <span className="font-mono font-medium">Rs. {slotting.toFixed(2)}</span>
                        </div>
                      )}
                      {bundling > 0 && (
                        <div className="flex justify-between">
                          <span>• Bundling:</span>
                          <span className="font-mono font-medium">Rs. {bundling.toFixed(2)}</span>
                        </div>
                      )}
                      {diecutting > 0 && (
                        <div className="flex justify-between">
                          <span>• Die-cutting:</span>
                          <span className="font-mono font-medium">Rs. {diecutting.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t-2 text-blue-500 font-bold dark:border-slate-700">
                  <span>Subtotal Per Carton:</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">2. Auto-Proposed Bundling Cost Formula</p>
              <div className={solveBoxClass}>
                <p className="opacity-70 font-xs">Equation: Bundling Cost = 2 * (2 * ((Width + Height) / 1000) + 508 / 1000)</p>
                <p className="text-blue-500 font-bold mt-1">
                  {`Solve: 2 * (2 * ((${formData.cartonWidth || 0} + ${formData.cartonHeight || 0}) / 1000) + 508 / 1000) = Rs. ${(2 * (2 * (((parseFloat(formData.cartonWidth) || 0) + (parseFloat(formData.cartonHeight) || 0)) / 1000) + 508 / 1000)).toFixed(2)} per carton`}
                </p>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold">3. Auto-Proposed Process Costs (Internal Calculation Rules)</p>
              <div className={solveBoxClass}>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold">Joining Cost ({formData.joiningType}): </span>
                    {formData.joiningType === 'Stitched' ? (
                      <span>Equation: [({H} / 25) - 1] * 2 = <strong>Rs. {proposedJoining.toFixed(2)}</strong></span>
                    ) : (
                      <span>Category Type {cartonCategory} (Glued: S=3.00, M=4.50, L=6.00) = <strong>Rs. {proposedJoining.toFixed(2)}</strong></span>
                    )}
                  </div>
                  {formData.isPrinted && (
                    <div>
                      <span className="font-bold">Printing Cost: </span>
                      <span>Category Type {cartonCategory} (S=3.00, M=4.00, L=6.00) = <strong>Rs. {proposedPrint.toFixed(2)}</strong></span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold">Slotting Cost: </span>
                    <span>{ply} (3-Ply = 1.75, 5-Ply = 2.50) = <strong>Rs. {proposedSlotting.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 6 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 6: Profit Margin</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Profit Application</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Profit = Subtotal * {profitMargin}% | Cost with Profit = Subtotal + Profit</p>
                <p className="text-blue-500 font-bold mt-1">
                  Solve: Rs. {subtotal.toFixed(2)} * {profitMargin}% = Rs. {profitAmount.toFixed(2)} profit
                </p>
                <p className="text-blue-500 font-bold">
                  Cost with Profit = {subtotal.toFixed(2)} + {profitAmount.toFixed(2)} = Rs. {costWithProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 6A: INHOUSE SALES COMMISSION */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 6A: Inhouse Sales Commission</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Inhouse Commission Check</p>
              <div className={solveBoxClass}>
                {hasInhouseCommission ? (
                  <>
                    <p className="opacity-70">Equation: Inhouse Commission = (Cost with Profit * 2) / 98</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: (Rs. {costWithProfit.toFixed(2)} * 2) / 98 = Rs. {inhouseCommission.toFixed(2)} per carton
                    </p>
                    <p className="text-blue-500 font-bold">
                      Cost after Inhouse Commission = {costWithProfit.toFixed(2)} + {inhouseCommission.toFixed(2)} = Rs. {costAfterInhouse.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="opacity-70 font-semibold">Inhouse Sales Commission is deactivated (No).</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Cost after Inhouse Commission = Rs. {costWithProfit.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 6B: 3RD PARTY SALES COMMISSION */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 6B: 3rd Party Sales Commission</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. 3rd Party Commission Check</p>
              <div className={solveBoxClass}>
                {hasThirdPartyCommission ? (
                  <>
                    <p className="opacity-70">Equation: 3rd Party Commission = Manual Input Value</p>
                    <p className="text-blue-500 font-bold mt-1">
                      User Entered Value: Rs. {thirdPartyCommission.toFixed(2)} per carton
                    </p>
                    <p className="text-blue-500 font-bold">
                      Cost after Commissions = {costAfterInhouse.toFixed(2)} + {thirdPartyCommission.toFixed(2)} = Rs. {costAfterCommissions.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="opacity-70 font-semibold">3rd Party Sales Commission is deactivated (No).</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Cost after Commissions = Rs. {costAfterInhouse.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 7 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 7: Transport (Delivery)</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Transport calculation</p>
              <div className={solveBoxClass}>
                {hasTransport ? (
                  <>
                    <p className="opacity-70">Equation: Transport Per Carton = Total Transport Cost / Quantity</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: Rs. {transportCost.toFixed(2)} / {Qty} = Rs. {transport.toFixed(2)} per carton
                    </p>
                  </>
                ) : (
                  <>
                    <p className="opacity-70 font-semibold">No transport cost selected (No).</p>
                    <p className="text-blue-500 font-bold mt-1">
                      Transport Cost = Rs. 0.00
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 8 */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 8: Tax Calculation</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Tax Option Details ({taxType})</p>
              <div className={solveBoxClass}>
                {taxType.includes('Non-VAT') ? (
                  <>
                    <p className="opacity-70 font-semibold">Formula: Non-VAT Customer</p>
                    <p className="text-green-500 font-bold mt-1">
                      Solve: Final Tax = Rs. 0.00
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      (No final sales taxes are charged at the end. Instead, all input taxes (Input VAT {inputTaxRate}% + SSCL {ssclRate}%) were already fully capitalized into the raw material cost in Phase 4)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="opacity-70">Formula: SSCL {ssclRate}% on (Cost after Commissions + Overhead) — VAT 18% is <span className="line-through">inactive</span></p>
                    <p className="text-blue-500 font-bold mt-1">
                      Solve: SSCL (({costAfterCommissions.toFixed(2)} + {overheadPerCarton.toFixed(2)}) × {ssclRate}%) = Rs. {taxAmount.toFixed(2)}
                    </p>
                    <p className="text-gray-400 mt-0.5 text-xs">VAT 18%: <span className="italic line-through">Inactive</span> — Rs. 0.00</p>
                    <p className="text-blue-500 font-bold mt-2 border-t pt-1.5 dark:border-slate-700">
                      Total Tax (SSCL): Rs. {taxAmount.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 9: ORDER FINANCIAL METRICS */}
        <div className={cardClass}>
          <h3 className={phaseHeaderClass}>Phase 9: Key Financial Metrics</h3>

          {/* 3 Metric Cards matching CostingApp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-2xl border text-center transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Invoice Value</p>
              <p className="text-xl font-black">Rs. {totalInvoiceValue.toFixed(2)}{!isNonVat ? ' + VAT' : ''}</p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {finalCost.toFixed(2)}{!isNonVat ? ' + VAT' : ''} × {Qty}
              </p>
            </div>
            
            <div className={`p-4 rounded-2xl border text-center transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Total RM Cost</p>
              <p className="text-xl font-black">Rs. {totalRmCost.toFixed(2)}</p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {rmCost.toFixed(2)} × {Qty}
              </p>
            </div>
            
            <div className={`p-4 rounded-2xl border text-center transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Net Profit</p>
              <p className="text-xl font-black">Rs. {totalNetProfit.toFixed(2)}</p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {profitAmount.toFixed(2)} × {Qty}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">1. Invoice Value Calculation</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Invoice Value = Final Price per Carton × Quantity</p>
                <p className={`${isDark ? 'text-[#d4af37]' : 'text-blue-600'} font-bold mt-1`}>
                  Solve: Rs. {finalCost.toFixed(2)}{!isNonVat ? ' + VAT' : ''} × {Qty} = Rs. {totalInvoiceValue.toFixed(2)}{!isNonVat ? ' + VAT' : ''}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  (Total revenue billed to customer including production costs, margin, commissions, transport, and taxes)
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">2. Total Raw Material (RM) Cost Calculation</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Total RM Cost = Phase 5 RM Cost per Carton × Quantity</p>
                <p className={`${isDark ? 'text-[#d4af37]' : 'text-blue-600'} font-bold mt-1`}>
                  Solve: Rs. {rmCost.toFixed(2)} × {Qty} = Rs. {totalRmCost.toFixed(2)}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  (Total paper, fluting, and material expenses invested for manufacturing the full batch of {Qty} cartons)
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">3. Total Net Profit Calculation</p>
              <div className={solveBoxClass}>
                <p className="opacity-70">Equation: Net Profit = Profit Margin per Carton (Phase 6) × Quantity</p>
                <p className={`${isDark ? 'text-[#d4af37]' : 'text-blue-600'} font-bold mt-1`}>
                  Solve: Rs. {profitAmount.toFixed(2)} × {Qty} = Rs. {totalNetProfit.toFixed(2)}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  (Net company profit realized after deducting direct material and production overhead costs)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className={`p-6 rounded-2xl shadow-md border ${
          isDark 
            ? 'bg-gradient-to-r from-[#131924] to-[#1a2332] border-[#c5a880]/30 text-white' 
            : 'bg-gradient-to-r from-[#faf8f5] to-[#f5efe6] border-[#dfd5bc] text-[#5c4c36]'
        }`}>
          <h3 className={`text-md font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
            Final Calculation Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-mono">
            <div>
              <p>Cost after Commissions: Rs. {costAfterCommissions.toFixed(2)}</p>
              <p>Transport Cost: Rs. {transport.toFixed(2)}</p>
              {taxType.includes('Non-VAT') ? (
                <p className="opacity-75">Tax Amount: None (Non-VAT)</p>
              ) : (
                <p>Tax Amount: Rs. {taxAmount.toFixed(2)} (SSCL 2.125%)</p>
              )}
              <p className={`text-lg font-bold mt-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
                Final Carton Cost: Rs. {finalCost.toFixed(2)}{!isNonVat ? ' + VAT' : ''}
              </p>
            </div>
            <div className={`border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col justify-center ${
              isDark ? 'border-[#c5a880]/20' : 'border-[#dfd5bc]'
            }`}>
              <p>Quantity: {Qty} cartons</p>
              <p className="text-xl font-extrabold mt-1">
                Invoice Value (Total Batch): Rs. {totalInvoiceValue.toFixed(2)}{!isNonVat ? ' + VAT' : ''}
              </p>
              <p className="text-xs opacity-75 mt-1">
                Total RM Cost: Rs. {totalRmCost.toFixed(2)} | Net Profit: Rs. {totalNetProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
