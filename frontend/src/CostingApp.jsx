import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// ============================================================================
// PREMIUM SVG VISUALIZATION COMPONENTS
// ============================================================================

function CostDonutChart({ calculatedCost, theme }) {
  const [activeSegment, setActiveSegment] = useState(null);
  const isDark = theme === 'dark';

  const rmCost = parseFloat(calculatedCost.rates?.rm_cost_per_carton || 0);
  const overhead = parseFloat(calculatedCost.per_carton_costs?.overhead || 0);
  const joining = parseFloat(calculatedCost.per_carton_costs?.joining || 0);
  const print = parseFloat(calculatedCost.per_carton_costs?.print || 0);
  const slotting = parseFloat(calculatedCost.per_carton_costs?.slotting || 0);
  const bundling = parseFloat(calculatedCost.per_carton_costs?.bundling || 0);
  const diecutting = parseFloat(calculatedCost.per_carton_costs?.diecutting || 0);
  const transport = parseFloat(calculatedCost.transport?.transport_per_carton || 0);
  const tax = parseFloat(calculatedCost.tax?.tax_amount_per_carton || 0);

  const additional = slotting + bundling + diecutting;

  const additionalBreakdown = [
    { label: 'Slotting', value: slotting },
    { label: 'Bundling', value: bundling },
    { label: 'Die-cutting', value: diecutting },
  ].filter(item => item.value > 0);

  const rawSegments = [
    { label: 'Raw Material', value: rmCost, color: '#3b82f6' }, // blue-500
    { label: 'Overhead', value: overhead, color: '#10b981' }, // emerald-500
    { label: 'Joining', value: joining, color: '#8b5cf6' }, // violet-500
    { label: 'Printing', value: print, color: '#ec4899' }, // pink-500
    { label: 'Additional', value: additional, color: '#f59e0b', breakdown: additionalBreakdown }, // amber-500
    { label: 'Transport', value: transport, color: '#f97316' }, // orange-500
    { label: 'Tax', value: tax, color: '#ef4444' }, // red-500
  ];

  const segments = rawSegments.filter(s => s.value > 0);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const circumference = 2 * Math.PI * 50; // ~314.159
  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col items-center p-6 rounded-3xl border shadow-xs w-full transition-colors duration-200 ${
      isDark ? 'bg-[#1a2332]/60 border-slate-700/60 text-[#e2d4c0]' : 'bg-[#fcfbfa]/80 border-[#e8dfc7] text-[#5c4c36]'
    }`}>
      <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>🍩 Cost Breakdown (Per Carton)</h3>
      <div className="relative w-44 h-44 flex-shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle cx="70" cy="70" r="50" fill="transparent" stroke={isDark ? "#334155" : "#f3f4f6"} strokeWidth="15" />
          {segments.map((segment, idx) => {
            const percent = segment.value / total;
            const dashArray = `${percent * circumference} ${circumference}`;
            const dashOffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            const isHovered = activeSegment?.label === segment.label;

            return (
              <circle
                key={idx}
                cx="70"
                cy="70"
                r="50"
                fill="transparent"
                stroke={segment.color}
                strokeWidth={isHovered ? "18" : "15"}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setActiveSegment({ ...segment, percent: (percent * 100).toFixed(1) })}
                onMouseLeave={() => setActiveSegment(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center p-4">
          {activeSegment ? (
            <>
              <span className={`text-[10px] font-medium truncate max-w-[100px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{activeSegment.label}</span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Rs. {activeSegment.value.toFixed(2)}</span>
              <span className={`text-xs font-semibold ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>{activeSegment.percent}%</span>
            </>
          ) : (
            <>
              <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Final Cost</span>
              <span className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-gray-800'}`}>Rs. {total.toFixed(2)}</span>
              <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>per carton</span>
            </>
          )}
        </div>
      </div>
      
      {/* Legend with Numeric Values and Sub-Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 mt-4 w-full text-left">
        {segments.map((segment, idx) => {
          const percent = ((segment.value / total) * 100).toFixed(1);
          const isHovered = activeSegment?.label === segment.label;
          const hasBreakdown = segment.breakdown && segment.breakdown.length > 0;

          return (
            <div 
              key={idx} 
              className={`flex flex-col justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                hasBreakdown ? 'col-span-1 sm:col-span-2' : ''
              } ${
                isHovered 
                  ? (isDark ? 'bg-slate-700/70 border-[#c5a880]/60 shadow-xs' : 'bg-white border-[#8c734b]/50 shadow-xs') 
                  : (isDark ? 'bg-[#131924]/50 border-slate-700/40 hover:bg-slate-800/70' : 'bg-white/70 border-gray-150 hover:bg-white')
              }`}
              onMouseEnter={() => {
                setActiveSegment({ ...segment, percent });
              }}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: segment.color }} />
                  <span className={`truncate font-medium text-[11px] ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {segment.label}
                  </span>
                </div>
                <div className="text-right flex-shrink-0 font-mono text-[11px]">
                  <span className={`font-bold ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
                    Rs. {segment.value.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Sub-breakdown for Additional costs (Slotting, Bundling, Die-cutting) */}
              {hasBreakdown && (
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                  {segment.breakdown.map((sub, sIdx) => (
                    <div 
                      key={sIdx} 
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                        isDark 
                          ? 'bg-[#0f141e]/70 border-slate-700/60 text-slate-300' 
                          : 'bg-slate-50 border-gray-200/70 text-gray-700'
                      }`}
                    >
                      <span className="truncate flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]/80 flex-shrink-0" />
                        {sub.label}:
                      </span>
                      <span className={`font-mono font-bold ml-1 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
                        Rs. {sub.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReelSlicingDiagram({ calculatedCost, theme }) {
  const isDark = theme === 'dark';
  const sheetWidth = parseFloat(calculatedCost.sheet_dimensions?.sheet_width_mm || 0);
  const selectedReel = parseFloat(calculatedCost.reel_information?.selected_reel_mm ?? calculatedCost.sheet_dimensions?.selected_reel_mm ?? 0);
  const sheetsPerReel = parseInt(calculatedCost.reel_information?.sheets_per_reel ?? calculatedCost.sheet_dimensions?.sheets_per_reel ?? 0);
  const wastePerReel = parseFloat(calculatedCost.reel_information?.waste_per_reel_mm ?? calculatedCost.sheet_dimensions?.reel_waste_mm ?? 0);

  if (!selectedReel || !sheetWidth) return null;

  const totalEdgeLoss = 25.0; // 25mm standard loss
  const singleEdgeLoss = totalEdgeLoss / 2; // 12.5mm per side

  const paddingX = 30;
  const diagramWidth = 440;
  const scale = diagramWidth / selectedReel;

  const leftEdgeWidth = singleEdgeLoss * scale;
  const cutsWidth = sheetsPerReel * sheetWidth * scale;
  const wasteWidth = wastePerReel * scale;
  const rightEdgeWidth = singleEdgeLoss * scale;

  return (
    <div className={`p-6 rounded-2xl border shadow-xs flex flex-col items-center w-full transition-colors duration-200 ${
      isDark ? 'bg-slate-800/50 border-slate-700 text-slate-100' : 'bg-slate-50/50 border-gray-100 text-gray-800'
    }`}>
      <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>✂️ Reel Slicing Layout (2D Visual)</h3>
      <div className="w-full max-w-[480px]">
        <svg viewBox="0 0 500 130" className="w-full h-auto">
          <defs>
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke={isDark ? "#475569" : "#9ca3af"} strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Reel Frame Outer */}
          <rect x={paddingX} y="30" width={diagramWidth} height="50" fill={isDark ? "#1e293b" : "#f9fafb"} stroke={isDark ? "#334155" : "#e5e7eb"} strokeWidth="2" rx="4" />

          {/* Left Edge Loss (12.5mm) */}
          <rect x={paddingX} y="30" width={leftEdgeWidth} height="50" fill="url(#diagonalHatch)" stroke={isDark ? "#475569" : "#9ca3af"} strokeWidth="0.5" />

          {/* Sheet Cuts */}
          {Array.from({ length: sheetsPerReel }).map((_, idx) => {
            const xPos = paddingX + leftEdgeWidth + idx * sheetWidth * scale;
            return (
              <g key={idx}>
                <rect x={xPos} y="30" width={sheetWidth * scale} height="50" fill={isDark ? "#1e3a8a/30" : "#eff6ff"} stroke="#3b82f6" strokeWidth="1.5" />
                <text x={xPos + (sheetWidth * scale) / 2} y="60" textAnchor="middle" className="text-[10px] font-bold fill-blue-500">
                  Cut {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Leftover Trimming Waste */}
          {wasteWidth > 0 && (
            <rect
              x={paddingX + leftEdgeWidth + cutsWidth}
              y="30"
              width={wasteWidth}
              height="50"
              fill={isDark ? "#7c2d12/20" : "#fff7ed"}
              stroke="#ea580c"
              strokeWidth="1.5"
            />
          )}

          {/* Right Edge Loss (12.5mm) */}
          <rect
            x={paddingX + leftEdgeWidth + cutsWidth + wasteWidth}
            y="30"
            width={rightEdgeWidth}
            height="50"
            fill="url(#diagonalHatch)"
            stroke={isDark ? "#475569" : "#9ca3af"}
            strokeWidth="0.5"
          />

          {/* Bottom Labels & Arrow Line for Selected Reel Width */}
          <line x1={paddingX} y1="95" x2={paddingX + diagramWidth} y2="95" stroke={isDark ? "#94a3b8" : "#374151"} strokeWidth="1.5" strokeDasharray="3 3" />
          <polygon points={`${paddingX},95 ${paddingX + 6},92 ${paddingX + 6},98`} fill={isDark ? "#94a3b8" : "#374151"} />
          <polygon points={`${paddingX + diagramWidth},95 ${paddingX + diagramWidth - 6},92 ${paddingX + diagramWidth - 6},98`} fill={isDark ? "#94a3b8" : "#374151"} />
          
          <text x={paddingX + diagramWidth / 2} y="112" textAnchor="middle" className={`text-xs font-bold ${isDark ? 'fill-slate-300' : 'fill-gray-800'}`}>
            Selected Reel Width: {selectedReel.toFixed(0)} mm
          </text>

          {/* Top labels for cuts and waste */}
          <text x={paddingX + leftEdgeWidth + cutsWidth / 2} y="20" textAnchor="middle" className="text-[10px] font-semibold fill-blue-500">
            {sheetsPerReel} × {sheetWidth.toFixed(0)}mm Cuts
          </text>

          {wasteWidth > 0 && (
            <text x={paddingX + leftEdgeWidth + cutsWidth + wasteWidth / 2} y="20" textAnchor="middle" className="text-[9px] font-bold fill-orange-500">
              {wastePerReel.toFixed(0)}mm Waste
            </text>
          )}

          <text x={paddingX + leftEdgeWidth / 2} y="20" textAnchor="middle" className={`text-[8px] font-semibold ${isDark ? 'fill-slate-400' : 'fill-gray-500'}`}>
            Trim
          </text>
          <text x={paddingX + diagramWidth - rightEdgeWidth / 2} y="20" textAnchor="middle" className={`text-[8px] font-semibold ${isDark ? 'fill-slate-400' : 'fill-gray-500'}`}>
            Trim
          </text>
        </svg>
      </div>

      <div className={`flex gap-4 mt-3 text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-50 border border-blue-400 rounded-sm" /> Useful Cuts</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-50 border border-orange-400 rounded-sm" /> Trim Waste</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-gray-100 border border-gray-300 rounded-sm bg-[linear-gradient(45deg,#bbb_25%,transparent_25%,transparent_50%,#bbb_50%,#bbb_75%,transparent_75%,transparent)] bg-[size:4px_4px]" /> 25mm Trim Loss</span>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: CARTON CATEGORIZATION & PROPOSED COSTS
// ============================================================================

export const calculateBoardAreaAndCategory = (carton) => {
  const isRSC = !carton.cartonType || carton.cartonType === 'RSC';
  const dieL = parseFloat(carton.dieLength) || 0;
  const dieW = parseFloat(carton.dieWidth) || 0;
  const L = parseFloat(carton.cartonLength) || 0;
  const W = parseFloat(carton.cartonWidth) || 0;
  const H = parseFloat(carton.cartonHeight) || 0;
  const ply = carton.plyType || '3-Ply';

  let sheetLength = 0;
  let sheetWidth = 0;

  let isTwoUp = false;
  if (!isRSC && dieL > 0 && dieW > 0) {
    sheetLength = dieL;
    sheetWidth = dieW;
  } else {
    if (L <= 0 || W <= 0 || H <= 0) {
      return { boardArea: 0, category: 'S', sheetLength: 0, sheetWidth: 0, isTwoUp: false };
    }
    const stdAllowance = (ply === '2-Ply' || ply === '3-Ply') ? 62 : 75;
    const standardLength = (L + W) * 2 + stdAllowance;
    if (isRSC && standardLength > 1938) {
      sheetLength = (L + W) * 2 + 130;
      isTwoUp = true;
    } else {
      sheetLength = standardLength;
    }
    const wAdj = (ply === '2-Ply' || ply === '3-Ply') ? 26 : (ply === '5-Ply' ? 32 : 36);
    sheetWidth = (W + H) + wAdj;
  }

  const REEL_WIDTHS = [
    950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400,
    1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850
  ];
  const EDGE_LOSS = 25;

  let bestReel = REEL_WIDTHS[REEL_WIDTHS.length - 1];
  let minWaste = Infinity;
  let bestSheetsPerReel = 1;

  for (const reel of REEL_WIDTHS) {
    const eff = reel - EDGE_LOSS;
    if (eff >= sheetWidth) {
      const sheets = Math.floor(eff / sheetWidth);
      if (sheets > 0) {
        const waste = reel - (sheets * sheetWidth);
        const wastePerSheet = waste / sheets;
        if (wastePerSheet < minWaste) {
          minWaste = wastePerSheet;
          bestReel = reel;
          bestSheetsPerReel = sheets;
        }
      }
    }
  }

  const boardArea = bestSheetsPerReel > 0
    ? (sheetLength * bestReel) / bestSheetsPerReel / 1000000
    : 0;

  let category = 'S';
  if (boardArea <= 0.450) {
    category = 'S';
  } else if (boardArea <= 0.800) {
    category = 'M';
  } else {
    category = 'L';
  }

  return { boardArea, category, sheetLength, sheetWidth, isTwoUp };
};

export const getProposedCosts = (carton, category) => {
  // 1. Joining Cost
  let proposedJoining = 0;
  if (carton.joiningType === 'Stitched') {
    const h = parseFloat(carton.cartonHeight) || 0;
    proposedJoining = h > 0 ? Math.max(0, parseFloat((((h / 25) - 1) * 2).toFixed(2))) : 0;
  } else {
    // Glued: S -> 3.00, M -> 4.50, L -> 6.00
    if (category === 'S') proposedJoining = 3.00;
    else if (category === 'M') proposedJoining = 4.50;
    else proposedJoining = 6.00;
  }

  // 2. Printing Cost: S -> 3.00, M -> 4.00, L -> 6.00
  let proposedPrint = 0;
  if (carton.isPrinted) {
    if (category === 'S') proposedPrint = 3.00;
    else if (category === 'M') proposedPrint = 4.00;
    else proposedPrint = 6.00;
  }

  // 3. Slotting Cost: RSC only (2-Ply / 3-Ply -> 1.75, 5-Ply / 7-Ply -> 2.50). Other types -> 0.00
  const isRSC = !carton.cartonType || carton.cartonType === 'RSC';
  let proposedSlotting = isRSC ? ((carton.plyType === '2-Ply' || carton.plyType === '3-Ply') ? 1.75 : 2.50) : 0.00;

  return { proposedJoining, proposedPrint, proposedSlotting };
};

// ============================================================================
// MAIN COSTINGAPP COMPONENT
// ============================================================================

export default function CostingApp({ formData, setFormData, calculatedCost, setCalculatedCost, theme }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextQuoteNo, setNextQuoteNo] = useState('');
  const [systemRates, setSystemRates] = useState({
    whiteLinerRate: '285',
    brownLinerRate: '260',
  });
  const [showInches, setShowInches] = useState(false);
  const isDark = theme === 'dark';

  // Fetch live system parameters (White Liner rate & Brown Liner rate) from admin parameters
  useEffect(() => {
    const fetchSystemRates = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await axios.get('/api/admin/parameters', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          const white = res.data.white_liner_board_rate ? String(res.data.white_liner_board_rate) : '285';
          const brown = res.data.brown_liner_board_rate ? String(res.data.brown_liner_board_rate) : '260';
          setSystemRates({
            whiteLinerRate: white,
            brownLinerRate: brown,
          });

          // Sync default rate into form if it is empty or matches previous default
          setFormData(prev => {
            const activeField = prev.boardType === 'Whitecut' ? 'whiteLinerRate' : 'brownLinerRate';
            const currentVal = prev[activeField];
            if (!currentVal || currentVal === '285' || currentVal === '260') {
              return {
                ...prev,
                [activeField]: prev.boardType === 'Whitecut' ? white : brown,
                totalOverheadForOrder: prev.totalOverheadForOrder || '1000'
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // Fallback or non-blocking
      }
    };
    fetchSystemRates();
  }, []);

  // Ensure initial defaults for Board Type, GSMs, and Total Overhead
  useEffect(() => {
    setFormData(prev => {
      let changed = false;
      const updated = { ...prev };
      if (!updated.boardType) {
        updated.boardType = 'Browncut';
        changed = true;
      }
      if (updated.boardType === 'Browncut' && !updated.brownLinerRate) {
        updated.brownLinerRate = systemRates.brownLinerRate || '260';
        changed = true;
      }
      if (updated.boardType === 'Whitecut' && !updated.whiteLinerRate) {
        updated.whiteLinerRate = systemRates.whiteLinerRate || '285';
        changed = true;
      }
      if (updated.plyType === '2-Ply' && (!updated.gsm1 && !updated.gsm2)) {
        updated.gsm1 = '140';
        updated.gsm2 = '112';
        changed = true;
      }
      if (updated.plyType === '3-Ply' && (!updated.gsm1 && !updated.gsm2 && !updated.gsm3)) {
        updated.gsm1 = '140';
        updated.gsm2 = '112';
        updated.gsm3 = '140';
        changed = true;
      }
      if (updated.plyType === '5-Ply' && (!updated.gsm1 && !updated.gsm2 && !updated.gsm3)) {
        updated.gsm1 = '140';
        updated.gsm2 = '112';
        updated.gsm3 = '112';
        updated.gsm4 = '112';
        updated.gsm5 = '140';
        changed = true;
      }
      if (updated.productionMethod !== 'Outsource' && !updated.totalOverheadForOrder) {
        updated.totalOverheadForOrder = '1000';
        changed = true;
      }
      return changed ? updated : prev;
    });
  }, [systemRates]);

  // Current live category and proposed costs
  const { boardArea: currentBoardArea, category: currentCategory, isTwoUp: currentIsTwoUp } = useMemo(() => {
    return calculateBoardAreaAndCategory(formData);
  }, [
    formData.cartonLength,
    formData.cartonWidth,
    formData.cartonHeight,
    formData.cartonType,
    formData.dieLength,
    formData.dieWidth,
    formData.plyType
  ]);

  const { proposedJoining, proposedPrint, proposedSlotting } = useMemo(() => {
    return getProposedCosts(formData, currentCategory);
  }, [
    formData.joiningType,
    formData.cartonHeight,
    formData.isPrinted,
    formData.plyType,
    formData.cartonType,
    currentCategory
  ]);

  // Fetch next quote number when in new entry mode
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const response = await axios.get('/api/quotes/next-number', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (response.data?.quote_no) {
          setNextQuoteNo(response.data.quote_no);
        }
      } catch (e) {
        // Fallback or non-blocking
      }
    };
    if (!formData.isEditing) {
      fetchNextNumber();
    }
  }, [formData.isEditing]);

  // Synchronize auto-proposed process costs (Joining, Print, Slotting, Bundling)
  useEffect(() => {
    const w = parseFloat(formData.cartonWidth) || 0;
    const h = parseFloat(formData.cartonHeight) || 0;

    setFormData(prev => {
      let changed = false;
      const updated = { ...prev };

      if (prev.cartonCategory !== currentCategory) {
        updated.cartonCategory = currentCategory;
        changed = true;
      }

      // Bundling Cost
      if (w > 0 && h > 0 && !prev.bundlingCostManual) {
        const autoBundling = (2 * (2 * ((w + h) / 1000) + 508 / 1000)).toFixed(2);
        if (prev.bundlingCost !== autoBundling) {
          updated.bundlingCost = autoBundling;
          changed = true;
        }
      }

      // Joining Cost
      if (!prev.joiningCostManual) {
        const joinStr = proposedJoining.toFixed(2);
        if (prev.joiningCost !== joinStr) {
          updated.joiningCost = joinStr;
          changed = true;
        }
      }

      // Print Cost
      if (!prev.printCostManual) {
        const printStr = prev.isPrinted ? proposedPrint.toFixed(2) : '';
        if (prev.printCost !== printStr) {
          updated.printCost = printStr;
          changed = true;
        }
      }

      // Slotting Cost
      if (!prev.slottingCostManual) {
        const slotStr = proposedSlotting.toFixed(2);
        if (prev.slottingCost !== slotStr) {
          updated.slottingCost = slotStr;
          changed = true;
        }
      }

      return changed ? updated : prev;
    });
  }, [
    currentCategory,
    proposedJoining,
    proposedPrint,
    proposedSlotting,
    formData.cartonWidth,
    formData.cartonHeight,
    formData.bundlingCostManual,
    formData.joiningCostManual,
    formData.printCostManual,
    formData.slottingCostManual,
    formData.isPrinted,
    formData.joiningType
  ]);

  // HANDLERS
  const getActiveRateFieldName = (boardType) => {
    return boardType === 'Whitecut' ? 'whiteLinerRate' : 'brownLinerRate';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      if (name === 'boardType') {
        if (value === 'Whitecut') {
          updated.whiteLinerRate = systemRates.whiteLinerRate || '285';
          updated.brownLinerRate = '';
        } else {
          updated.brownLinerRate = systemRates.brownLinerRate || '260';
          updated.whiteLinerRate = '';
        }
      }
      if (name === 'isPrinted' && !checked) {
        updated.printCost = '';
        updated.printCostManual = false;
      }
      if (name === 'isPrinted' && checked) {
        updated.printCostManual = false;
      }
      if (name === 'bundlingCost') {
        updated.bundlingCostManual = true;
      }
      if (name === 'joiningCost') {
        updated.joiningCostManual = true;
      }
      if (name === 'printCost') {
        updated.printCostManual = true;
      }
      if (name === 'slottingCost') {
        updated.slottingCostManual = true;
      }
      if (name === 'cartonWidth' || name === 'cartonHeight') {
        updated.bundlingCostManual = false;
      }
      if (name === 'joiningType') {
        updated.joiningCostManual = false;
      }
      if (name === 'cartonType') {
        if (value !== 'RSC') {
          updated.slottingCost = '0';
          updated.slottingCostManual = true;
        } else {
          updated.slottingCost = '';
          updated.slottingCostManual = false;
        }
      }
      if (name === 'plyType') {
        updated.slottingCostManual = false;
        if (value === '2-Ply') {
          updated.gsm1 = '140';
          updated.gsm2 = '112';
          updated.gsm3 = '';
          updated.gsm4 = '';
          updated.gsm5 = '';
          updated.gsm6 = '';
          updated.gsm7 = '';
        } else if (value === '3-Ply') {
          updated.gsm1 = '140';
          updated.gsm2 = '112';
          updated.gsm3 = '140';
          updated.gsm4 = '';
          updated.gsm5 = '';
          updated.gsm6 = '';
          updated.gsm7 = '';
        } else if (value === '5-Ply') {
          updated.gsm1 = '140';
          updated.gsm2 = '112';
          updated.gsm3 = '112';
          updated.gsm4 = '112';
          updated.gsm5 = '140';
          updated.gsm6 = '';
          updated.gsm7 = '';
        }
      }
      if (name === 'productionMethod') {
        if (value === 'Outsource') {
          setError('');
        } else if (value === 'In-house' && (!updated.totalOverheadForOrder || updated.totalOverheadForOrder === '0')) {
          updated.totalOverheadForOrder = '1000';
        }
      }
      return updated;
    });
  };

  const getGSMFields = () => {
    switch(formData.plyType) {
      case '2-Ply':
        return [
          { name: 'gsm1', label: 'Outer 1 (Liner)', value: formData.gsm1 },
          { name: 'gsm2', label: 'Flute 1', value: formData.gsm2 },
        ];
      case '3-Ply':
        return [
          { name: 'gsm1', label: 'Outer 1 (Liner)', value: formData.gsm1 },
          { name: 'gsm2', label: 'Flute', value: formData.gsm2 },
          { name: 'gsm3', label: 'Outer 2 (Liner)', value: formData.gsm3 },
        ];
      case '5-Ply':
        return [
          { name: 'gsm1', label: 'Outer 1 (Liner)', value: formData.gsm1 },
          { name: 'gsm2', label: 'Flute 1', value: formData.gsm2 },
          { name: 'gsm3', label: 'Middle (Liner)', value: formData.gsm3 },
          { name: 'gsm4', label: 'Flute 2', value: formData.gsm4 },
          { name: 'gsm5', label: 'Outer 2 (Liner)', value: formData.gsm5 },
        ];
      case '7-Ply':
        return [
          { name: 'gsm1', label: 'Outer 1 (Liner)', value: formData.gsm1 },
          { name: 'gsm2', label: 'Flute 1', value: formData.gsm2 },
          { name: 'gsm3', label: 'Middle (Liner)', value: formData.gsm3 },
          { name: 'gsm4', label: 'Flute 2', value: formData.gsm4 },
          { name: 'gsm5', label: 'Outer 2 (Liner)', value: formData.gsm5 },
          { name: 'gsm6', label: 'Flute 3', value: formData.gsm6 },
          { name: 'gsm7', label: 'Outer 3 (Liner)', value: formData.gsm7 },
        ];
      default:
        return [];
    }
  };

  const buildGSMArray = () => {
    const gsmFields = getGSMFields();
    return gsmFields.map(f => parseFloat(formData[f.name]) || 0);
  };

  const calculateCost = async () => {
    setError('');
    setLoading(true);

    try {
      if (!formData.customerName || !formData.cartonLength || !formData.cartonWidth || 
          !formData.cartonHeight || !formData.quantity) {
        setError('Please fill all carton dimensions and quantity');
        setLoading(false);
        return;
      }

      const activeField = getActiveRateFieldName(formData.boardType);
      if (!formData[activeField]) {
        setError(`Please enter the active rate (${activeField === 'whiteLinerRate' ? 'White Liner' : 'Brown Liner'})`);
        setLoading(false);
        return;
      }

      const isOutsource = formData.productionMethod === 'Outsource';

      if (!isOutsource && !formData.totalOverheadForOrder) {
        setError('Please enter total overhead (for entire order)');
        setLoading(false);
        return;
      }

      const gsmArray = buildGSMArray();
      if (gsmArray.some(v => v === 0)) {
        setError('Please enter all GSM values');
        setLoading(false);
        return;
      }

      const payload = {
        customer_name: formData.customerName,
        carton_length_mm: parseFloat(formData.cartonLength),
        carton_width_mm: parseFloat(formData.cartonWidth),
        carton_height_mm: parseFloat(formData.cartonHeight),
        quantity: parseInt(formData.quantity),
        ply_type: formData.plyType,
        board_type: formData.boardType,
        flute_type: formData.fluteType,
        flute_type_2: formData.fluteType2 || formData.fluteType,
        production_method: formData.productionMethod || 'In-house',
        carton_type: formData.cartonType || 'RSC',
        die_length_mm: parseFloat(formData.dieLength || 0),
        die_width_mm: parseFloat(formData.dieWidth || 0),
        joining_type: formData.joiningType,
        is_printed: formData.isPrinted,
        white_liner_rate: parseFloat(formData.whiteLinerRate || 0),
        brown_liner_rate: parseFloat(formData.brownLinerRate || 0),
        gsm_values: gsmArray,
        total_overhead_for_order: isOutsource ? 0 : parseFloat(formData.totalOverheadForOrder || 0),
        joining_cost: isOutsource ? 0 : parseFloat(formData.joiningCost !== '' && formData.joiningCost !== undefined ? formData.joiningCost : (proposedJoining || 0)),
        print_cost: (!isOutsource && formData.isPrinted) ? parseFloat(formData.printCost !== '' && formData.printCost !== undefined ? formData.printCost : (proposedPrint || 0)) : 0,
        slotting_cost: (isOutsource || formData.cartonType !== 'RSC') ? 0 : parseFloat(formData.slottingCost !== '' && formData.slottingCost !== undefined ? formData.slottingCost : (proposedSlotting || 0)),
        bundling_cost: isOutsource ? 0 : parseFloat(formData.bundlingCost || 0),
        diecutting_cost: isOutsource ? 0 : parseFloat(formData.diecuttingCost || 0),
        profit_margin_percent: parseFloat(formData.profitMargin),
        tax_type: formData.taxType,
        hasInhouseCommission: formData.hasInhouseCommission,
        hasThirdPartyCommission: formData.hasThirdPartyCommission,
        thirdPartyCommission: parseFloat(formData.thirdPartyCommission || 0),
        hasTransport: formData.hasTransport,
        transportCost: parseFloat(formData.transportCost || 0),
      };

      const response = await axios.post('/api/quotes/calculate', payload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      setCalculatedCost(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  const saveQuote = async () => {
    if (!calculatedCost) {
      setError('Calculate cost first');
      return;
    }

    try {
      const gsmArray = buildGSMArray();
      const isNonVat = (formData.taxType || calculatedCost?.tax?.tax_type || '').includes('Non-VAT');
      const finalCost = isNonVat
        ? ((calculatedCost.commissions?.cost_after_commissions ?? calculatedCost.profit?.cost_with_profit ?? 0) + (calculatedCost.transport?.transport_per_carton ?? 0))
        : parseFloat(calculatedCost.final?.final_cost_per_carton || 0);
      const batchCost = finalCost * (parseFloat(formData.quantity) || 1);

      const payloadCalculatedCost = {
        ...calculatedCost,
        final: {
          ...calculatedCost.final,
          final_cost_per_carton: parseFloat(finalCost.toFixed(2)),
          total_cost_batch: parseFloat(batchCost.toFixed(2))
        },
        tax: {
          ...calculatedCost.tax,
          tax_amount_per_carton: isNonVat ? 0.0 : calculatedCost.tax?.tax_amount_per_carton
        }
      };

      const isOutsource = formData.productionMethod === 'Outsource';
      const response = await axios.post('/api/quotes/save', { 
        ...formData, 
        totalOverheadForOrder: isOutsource ? 0 : (formData.totalOverheadForOrder || 0),
        joiningCost: isOutsource ? 0 : formData.joiningCost,
        printCost: isOutsource ? 0 : formData.printCost,
        slottingCost: isOutsource ? 0 : formData.slottingCost,
        bundlingCost: isOutsource ? 0 : formData.bundlingCost,
        diecuttingCost: isOutsource ? 0 : formData.diecuttingCost,
        gsm_values: gsmArray, 
        calculated_cost: payloadCalculatedCost 
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      alert(`Quote saved successfully! Order No: ${response.data.quote_no}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Save error');
    }
  };

  // Luxurious Enterprise Type Shell Styles
  const inputClass = `w-full px-4 py-2.5 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#c5a880]/40 shadow-xs text-sm ${
    isDark 
      ? 'bg-[#1a2332]/95 border-[#c5a880]/20 text-[#e2d4c0] placeholder-slate-500 focus:border-[#d4af37]' 
      : 'bg-[#fcfbfa]/95 border-[#dfd5bc] text-[#5c4c36] placeholder-[#b8b09b] hover:border-[#c5a880] focus:border-[#9f8150]'
  }`;

  const selectClass = `w-full px-4 py-2.5 border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#c5a880]/40 shadow-xs cursor-pointer text-sm ${
    isDark 
      ? 'bg-[#1a2332]/95 border-[#c5a880]/20 text-[#e2d4c0] focus:border-[#d4af37]' 
      : 'bg-[#fcfbfa]/95 border-[#dfd5bc] text-[#5c4c36] hover:border-[#c5a880] focus:border-[#9f8150]'
  }`;

  const cardClass = `p-8 rounded-3xl border transition-all duration-300 shadow-lg ${
    isDark 
      ? 'bg-[#131924]/85 border-[#c5a880]/15 text-slate-100 shadow-[#000000]/40' 
      : 'bg-[#faf8f5]/85 border-[#e8dfc7] text-[#5c4c36] shadow-[#eae5d9]/30'
  }`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${
    isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'
  }`;

  const headingClass = `text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2 ${
    isDark ? 'text-[#d4af37] border-slate-700/60' : 'text-[#8c734b] border-[#e8dfc7]'
  }`;

  // Ensure effective final cost per carton and invoice value consistently reflect Non-VAT (no added output tax)
  const isNonVatCustomer = (formData.taxType || calculatedCost?.tax?.tax_type || '').includes('Non-VAT');
  const finalCostPerCarton = calculatedCost
    ? (isNonVatCustomer
        ? ((calculatedCost.commissions?.cost_after_commissions ?? calculatedCost.profit?.cost_with_profit ?? 0) + (calculatedCost.transport?.transport_per_carton ?? 0))
        : parseFloat(calculatedCost.final?.final_cost_per_carton || 0))
    : 0;
  const quantityNum = parseFloat(formData.quantity) || 1;
  const totalInvoiceValue = finalCostPerCarton * quantityNum;
  const totalBatchCost = totalInvoiceValue;

  return (
    <div className={`rounded-3xl shadow-2xl p-8 transition-colors duration-300 text-left border ${
      isDark ? 'bg-[#0f141e]/90 text-white border-[#c5a880]/20 shadow-black/50' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#e8dfc7] shadow-xl'
    }`}>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>🏭</span> Enter Costing Parameters
        </h2>
        {(formData.quoteNo || nextQuoteNo) && (
          <span className={`px-4 py-1.5 rounded-full text-sm font-extrabold tracking-wide border shadow-xs ${
            formData.isEditing
              ? isDark 
                ? 'bg-amber-950/60 text-[#d4af37] border-[#d4af37]/40' 
                : 'bg-amber-100/80 text-[#8c734b] border-[#8c734b]/40'
              : isDark 
                ? 'bg-[#1a2332] text-[#d4af37] border-[#c5a880]/30' 
                : 'bg-[#faf8f5] text-[#8c734b] border-[#dfd5bc]'
          }`}>
            {formData.isEditing ? `✏️ Editing: ${formData.quoteNo}` : `📋 Next Quote: ${nextQuoteNo}`}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-600 p-4 mb-6 rounded-lg text-sm">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* SECTION 1: CUSTOMER & DIMENSIONS */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>📦 Carton Specifications</h3>
        
        <div className="mb-4">
          <label className={labelClass}>Customer Name</label>
          <input
            type="text"
            name="customerName"
            placeholder="e.g. ABC Lanka"
            value={formData.customerName}
            onChange={handleInputChange}
            className={inputClass}
          />
        </div>

        {/* CARTON TYPE DROPDOWN */}
        <div className="mb-4">
          <label className={labelClass}>Carton Type</label>
          <select
            name="cartonType"
            value={formData.cartonType || 'RSC'}
            onChange={handleInputChange}
            className={selectClass}
          >
            <option value="RSC">1. RSC (Regular Slotted Carton)</option>
            <option value="Lock Type">2. Lock Type</option>
            <option value="Mail Type">3. Mail Type</option>
            <option value="Special Shape">4. Special Shape</option>
            <option value="S.F.">5. S.F.</option>
          </select>
        </div>

        {/* DIE SIZE INPUTS (shown when carton type is not RSC: Lock Type, Mail Type, Special Shape, S.F.) */}
        {formData.cartonType && formData.cartonType !== 'RSC' && (
          <div className={`p-4 rounded-2xl mb-4 border transition-all duration-200 ${
            isDark ? 'bg-purple-950/20 border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>✂️</span> Die Size (mm) — Direct Board Size
            </p>
            <p className="text-xs opacity-80 mb-3">
              For {formData.cartonType}, the die dimensions below are directly used as the board sheet dimensions (Sheet Length & Sheet Width).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Die Length (mm) [L]</label>
                <input
                  type="number"
                  name="dieLength"
                  placeholder="Die Length (mm)"
                  value={formData.dieLength || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Die Width (mm) [W]</label>
                <input
                  type="number"
                  name="dieWidth"
                  placeholder="Die Width (mm)"
                  value={formData.dieWidth || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Horizontal Sequential Spaces for L, W, H with Inches Input Selector */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold opacity-75">Dimensions Input Unit:</label>
          <button
            type="button"
            onClick={() => setShowInches(!showInches)}
            className={`text-xs px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              showInches
                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20'
                : 'bg-white hover:bg-gray-100 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-gray-300 dark:border-slate-700'
            }`}
          >
            <span>📐</span> {showInches ? '✓ Inches Input Active' : '📐 Select Inches Input (Auto × 25.4 → mm)'}
          </button>
        </div>

        {/* 3 Square Slots for Inches Input */}
        {showInches && (
          <div className={`p-4 mb-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/70 border-blue-900/40 text-slate-200' : 'bg-blue-50/70 border-blue-200 text-blue-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black tracking-wide flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span>📏</span> 3 SQUARE SLOTS: INCHES INPUT (auto-calculated as figure × 25.4 and filled to mm slots):
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Length (inches)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder='e.g. 12"'
                  value={formData.cartonLength ? (parseFloat(formData.cartonLength) / 25.4).toFixed(2) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const mm = val !== '' ? (parseFloat(val) * 25.4).toFixed(1) : '';
                    setFormData(prev => ({ ...prev, cartonLength: mm }));
                  }}
                  className={`${inputClass} font-mono font-bold`}
                />
              </div>
              <div>
                <label className={labelClass}>Width (inches)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder='e.g. 10"'
                  value={formData.cartonWidth ? (parseFloat(formData.cartonWidth) / 25.4).toFixed(2) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const mm = val !== '' ? (parseFloat(val) * 25.4).toFixed(1) : '';
                    setFormData(prev => ({ ...prev, cartonWidth: mm }));
                  }}
                  className={`${inputClass} font-mono font-bold`}
                />
              </div>
              <div>
                <label className={labelClass}>Height (inches)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder='e.g. 8"'
                  value={formData.cartonHeight ? (parseFloat(formData.cartonHeight) / 25.4).toFixed(2) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const mm = val !== '' ? (parseFloat(val) * 25.4).toFixed(1) : '';
                    setFormData(prev => ({ ...prev, cartonHeight: mm }));
                  }}
                  className={`${inputClass} font-mono font-bold`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Sequential Spaces for L, W, H */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass}>Carton Length (mm)</label>
            <input type="number" name="cartonLength" placeholder="L" value={formData.cartonLength} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Carton Width (mm)</label>
            <input type="number" name="cartonWidth" placeholder="W" value={formData.cartonWidth} onChange={handleInputChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Carton Height (mm)</label>
            <input type="number" name="cartonHeight" placeholder="H" value={formData.cartonHeight} onChange={handleInputChange} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Quantity (cartons)</label>
          <input type="number" name="quantity" placeholder="e.g. 1000" value={formData.quantity} onChange={handleInputChange} className={inputClass} />
        </div>

        {currentBoardArea > 0 && (
          <div className={`mt-5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border shadow-xs transition-all ${
            isDark ? 'bg-[#131924]/80 border-[#c5a880]/20' : 'bg-[#faf8f5] border-[#dfd5bc]'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📦</span>
              <div>
                <p className="text-xs font-semibold text-slate-400">Carton Categorization (Phase 2 Board Area):</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-3 py-0.5 rounded-full text-xs font-black tracking-wide border shadow-xs ${
                    currentCategory === 'S'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      : currentCategory === 'M'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    Type {currentCategory}
                  </span>
                  <span className="text-xs font-mono font-bold opacity-90">
                    {currentBoardArea.toFixed(4)} m²
                  </span>
                  {currentIsTwoUp && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border shadow-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
                      ⚠️ 2-Up Method (Length &gt; 1938 mm → 130mm Allowance)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-xxs font-mono opacity-70">
              {currentCategory === 'S' && 'Rule: Type S (0 – 0.450 m²)'}
              {currentCategory === 'M' && 'Rule: Type M (0.451 – 0.800 m²)'}
              {currentCategory === 'L' && 'Rule: Type L (≥ 0.801 m²)'}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PLY & BOARD TYPE */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>📊 Material Type</h3>
        
        <div className={`grid gap-4 ${formData.plyType === '5-Ply' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
          <div>
            <label className={labelClass}>Ply Type</label>
            <select name="plyType" value={formData.plyType} onChange={handleInputChange} className={selectClass}>
              <option value="2-Ply">2-Ply</option>
              <option value="3-Ply">3-Ply</option>
              <option value="5-Ply">5-Ply</option>
              <option value="7-Ply">7-Ply</option>
            </select>
          </div>
          
          <div>
            <label className={labelClass}>{formData.plyType === '5-Ply' || formData.plyType === '2-Ply' ? 'Flute Type 1' : 'Flute Type'}</label>
            <select name="fluteType" value={formData.fluteType} onChange={handleInputChange} className={selectClass}>
              <option value="B-Flute">B-Flute (1.35)</option>
              <option value="C-Flute">C-Flute (1.43)</option>
              <option value="E-Flute">E-Flute (1.26)</option>
            </select>
          </div>

          {formData.plyType === '5-Ply' && (
            <div>
              <label className={labelClass}>Flute Type 2</label>
              <select name="fluteType2" value={formData.fluteType2 || 'B-Flute'} onChange={handleInputChange} className={selectClass}>
                <option value="B-Flute">B-Flute (1.35)</option>
                <option value="C-Flute">C-Flute (1.43)</option>
                <option value="E-Flute">E-Flute (1.26)</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Board Type</label>
            <select name="boardType" value={formData.boardType} onChange={handleInputChange} className={selectClass}>
              <option value="Browncut">Brown Liner</option>
              <option value="Whitecut">White Liner</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: GSM CONFIGURATION */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>📝 GSM Values</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {getGSMFields().map((field, idx) => (
            <div key={field.name}>
              <label className={labelClass}>{field.label}</label>
              <input
                type="number"
                name={field.name}
                placeholder="GSM"
                value={field.value}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3.5: PRODUCTION METHOD */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>🏭 Production Method</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Production Method</label>
            <select name="productionMethod" value={formData.productionMethod || 'In-house'} onChange={handleInputChange} className={selectClass}>
              <option value="In-house">In-house</option>
              <option value="Outsource">Outsource</option>
            </select>
          </div>
          <div className={`flex items-center text-sm px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            {formData.productionMethod === 'Outsource'
              ? '⚠️ Outsource: Overhead, joining, printing, slotting, bundling and die-cutting costs are excluded from calculation.'
              : '🏭 In-house: All process costs (overhead, joining, printing, slotting, bundling, die-cutting) apply.'}
          </div>
        </div>
      </div>

      {/* SECTION 4: RATES */}
      <div className={`${cardClass} mb-6`}>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className={`${headingClass} mb-0 border-b-0 pb-0`}>💰 Board Rate</h3>
          <span className="text-xxs font-semibold text-blue-500 dark:text-blue-400">
            {formData.boardType === 'Whitecut' 
              ? `Auto: Rs. ${systemRates.whiteLinerRate || '285'}/kg (White Liner)`
              : `Auto: Rs. ${systemRates.brownLinerRate || '260'}/kg (Brown Liner)`}
          </span>
        </div>
        <div>
          <label className={labelClass}>
            {formData.boardType === 'Whitecut' ? 'White Liner Rate (Rs./kg)' : 'Brown Liner Rate (Rs./kg)'}
          </label>
          <input
            type="number"
            name={getActiveRateFieldName(formData.boardType)}
            placeholder={formData.boardType === 'Whitecut' ? (systemRates.whiteLinerRate || '285.00') : (systemRates.brownLinerRate || '260.00')}
            value={formData[getActiveRateFieldName(formData.boardType)]}
            onChange={handleInputChange}
            className={inputClass}
            step="0.01"
          />
        </div>
      </div>

      {/* SECTION 5: EXTRA COSTS */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>💵 Costs</h3>
        
        {formData.productionMethod === 'Outsource' ? (
          <div className={`flex items-center gap-3 px-4 py-5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm">Outsource mode – All process costs excluded</p>
              <p className="text-xs mt-0.5 opacity-80">Overhead, joining, printing, slotting, bundling and die-cutting are not included in the costing for outsourced production. Only raw material cost applies.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className={labelClass}>Total Overhead for Order (Rs.)</label>
              <input
                type="number"
                name="totalOverheadForOrder"
                placeholder="1000"
                value={formData.totalOverheadForOrder}
                onChange={handleInputChange}
                className={inputClass}
                step="0.01"
              />
              <p className="text-xxs text-gray-400 mt-1">Order total overhead gets allocated per carton by dividing by quantity (Auto-filled: Rs. 1000).</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Joining Method</label>
                <select name="joiningType" value={formData.joiningType} onChange={handleInputChange} className={selectClass}>
                  <option value="Glued">Glued</option>
                  <option value="Stitched">Stitched</option>
                </select>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelClass}>Joining Cost (Rs./carton)</label>
                  <span className="text-xxs font-semibold text-blue-500 dark:text-blue-400">
                    {formData.joiningType === 'Stitched'
                      ? `Auto: Rs. ${proposedJoining.toFixed(2)} ([(H/25)-1]×2)`
                      : `Auto: Rs. ${proposedJoining.toFixed(2)} (Type ${currentCategory})`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="joiningCost"
                    placeholder="e.g. 2.00"
                    value={formData.joiningCost}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="0.01"
                  />
                  {formData.joiningCostManual && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, joiningCostManual: false, joiningCost: proposedJoining.toFixed(2) }))}
                      className="absolute right-2 top-2 text-xxs font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer"
                      title="Reset to auto-proposed value"
                    >
                      ↺ Auto
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" name="isPrinted" checked={formData.isPrinted} onChange={handleInputChange} id="isPrinted" className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer" />
              <label htmlFor="isPrinted" className="text-sm font-bold select-none cursor-pointer">Printed Option</label>
            </div>

            {formData.isPrinted && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className={labelClass}>Print Cost (Rs./carton)</label>
                  <span className="text-xxs font-semibold text-blue-500 dark:text-blue-400">
                    Auto: Rs. {proposedPrint.toFixed(2)} (Type {currentCategory})
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="printCost"
                    placeholder="e.g. 2.00"
                    value={formData.printCost}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="0.01"
                  />
                  {formData.printCostManual && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, printCostManual: false, printCost: proposedPrint.toFixed(2) }))}
                      className="absolute right-2 top-2 text-xxs font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer"
                      title="Reset to auto-proposed value"
                    >
                      ↺ Auto
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelClass}>Slotting (Rs./carton)</label>
                  <span className="text-xxs font-semibold text-blue-500 dark:text-blue-400">
                    {formData.cartonType !== 'RSC' ? 'N/A (RSC Only)' : `Auto: Rs. ${proposedSlotting.toFixed(2)}`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="slottingCost"
                    placeholder={formData.cartonType !== 'RSC' ? '0.00 (RSC Only)' : 'Slotting'}
                    value={formData.cartonType !== 'RSC' ? '0' : formData.slottingCost}
                    onChange={handleInputChange}
                    disabled={formData.cartonType !== 'RSC'}
                    className={`${inputClass} ${formData.cartonType !== 'RSC' ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-800' : ''}`}
                    step="0.01"
                  />
                  {formData.cartonType === 'RSC' && formData.slottingCostManual && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, slottingCostManual: false, slottingCost: proposedSlotting.toFixed(2) }))}
                      className="absolute right-2 top-2 text-xxs font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer"
                      title="Reset to auto-proposed value"
                    >
                      ↺ Auto
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Bundling (Rs./carton)</label>
                <div className="relative">
                  <input type="number" name="bundlingCost" placeholder="Bundling" value={formData.bundlingCost} onChange={handleInputChange} className={inputClass} step="0.01" />
                  {formData.bundlingCostManual && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, bundlingCostManual: false }))}
                      className="absolute right-2 top-2 text-xxs font-bold text-amber-600 dark:text-amber-400 hover:underline bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 cursor-pointer"
                      title="Reset to auto-proposed value"
                    >
                      ↺ Auto
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Die-cutting (Rs./carton)</label>
                <input type="number" name="diecuttingCost" placeholder="Die-cutting" value={formData.diecuttingCost} onChange={handleInputChange} className={inputClass} step="0.01" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* SECTION 6: PROFIT & TAX */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>📈 Profit & Tax</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Profit Margin (%)</label>
            <input type="number" name="profitMargin" value={formData.profitMargin} onChange={handleInputChange} className={inputClass} step="0.1" />
          </div>
          
          <div>
            <label className={labelClass}>Tax Type</label>
            <select name="taxType" value={formData.taxType} onChange={handleInputChange} className={selectClass}>
              <option value="Non-VAT">Non-VAT</option>
              <option value="VAT">VAT</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 6.5: COMMISSIONS */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>💼 Sales Commissions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inhouse Commission */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50 border-gray-100'}`}>
            <span className={labelClass}>Inhouse Sales Commission?</span>
            <div className="flex gap-4 text-sm mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="hasInhouseCommission"
                  checked={formData.hasInhouseCommission === true}
                  onChange={() => setFormData(prev => ({ ...prev, hasInhouseCommission: true }))}
                  className="w-4 h-4 cursor-pointer"
                />
                Yes (2% Automatic)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="hasInhouseCommission"
                  checked={formData.hasInhouseCommission === false}
                  onChange={() => setFormData(prev => ({ ...prev, hasInhouseCommission: false }))}
                  className="w-4 h-4 cursor-pointer"
                />
                No
              </label>
            </div>
            {formData.hasInhouseCommission && calculatedCost?.commissions?.inhouse_commission !== undefined && (
              <p className="text-xs text-blue-500 mt-2 font-bold font-mono">
                Calculated: Rs. {calculatedCost.commissions.inhouse_commission} / carton
              </p>
            )}
          </div>

          {/* 3rd Party Commission */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50 border-gray-100'}`}>
            <span className={labelClass}>3rd Party Sales Commission?</span>
            <div className="flex gap-4 mb-3 text-sm mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="hasThirdPartyCommission"
                  checked={formData.hasThirdPartyCommission === true}
                  onChange={() => setFormData(prev => ({ ...prev, hasThirdPartyCommission: true }))}
                  className="w-4 h-4 cursor-pointer"
                />
                Yes (Manual)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="hasThirdPartyCommission"
                  checked={formData.hasThirdPartyCommission === false}
                  onChange={() => setFormData(prev => ({ ...prev, hasThirdPartyCommission: false, thirdPartyCommission: '' }))}
                  className="w-4 h-4 cursor-pointer"
                />
                No
              </label>
            </div>
            
            <input
              type="number"
              name="thirdPartyCommission"
              placeholder="Enter Commission (Rs./carton)"
              value={formData.thirdPartyCommission}
              onChange={handleInputChange}
              disabled={!formData.hasThirdPartyCommission}
              className={`${inputClass} ${!formData.hasThirdPartyCommission ? 'opacity-40 cursor-not-allowed' : ''}`}
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* SECTION 7: DELIVERY */}
      <div className={`${cardClass} mb-6`}>
        <h3 className={headingClass}>🚚 Transport Cost</h3>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-slate-50 border-gray-100'}`}>
          <span className={labelClass}>Is there any transport cost?</span>
          <div className="flex gap-4 mb-3 text-sm mt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="hasTransport"
                checked={formData.hasTransport === true}
                onChange={() => setFormData(prev => ({ ...prev, hasTransport: true }))}
                className="w-4 h-4 cursor-pointer"
              />
              Yes
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="radio"
                name="hasTransport"
                checked={formData.hasTransport === false}
                onChange={() => setFormData(prev => ({ ...prev, hasTransport: false, transportCost: '' }))}
                className="w-4 h-4 cursor-pointer"
              />
              No
            </label>
          </div>
          
          <div className="flex justify-between items-center mb-1">
            <label className={labelClass}>Transport Cost (Rs./carton)</label>
            {formData.hasTransport && formData.transportCost && (
              <span className="text-xxs font-semibold text-blue-500 dark:text-blue-400">
                Total for Order: Rs. {(parseFloat(formData.transportCost || 0) * (parseInt(formData.quantity) || 1)).toFixed(2)}
              </span>
            )}
          </div>
          <input
            type="number"
            name="transportCost"
            placeholder="Enter Transport Cost (Rs./carton)"
            value={formData.transportCost}
            onChange={handleInputChange}
            disabled={!formData.hasTransport}
            className={`${inputClass} ${!formData.hasTransport ? 'opacity-40 cursor-not-allowed' : ''}`}
            step="0.01"
          />
          {formData.hasTransport && formData.transportCost && (
            <p className="text-xs text-blue-500 mt-2 font-bold font-mono">
              Transport Cost: Rs. {parseFloat(formData.transportCost || 0).toFixed(2)} / carton (Total for Order: Rs. {(parseFloat(formData.transportCost || 0) * (parseInt(formData.quantity) || 1)).toFixed(2)})
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={calculateCost}
        disabled={loading}
        style={{
          backgroundColor: isDark ? '#d4af37' : '#8c734b',
          color: isDark ? '#0f172a' : '#ffffff',
          display: 'block',
          width: '100%',
          visibility: 'visible',
          opacity: loading ? 0.6 : 1
        }}
        className={`w-full ${isDark ? 'bg-[#d4af37] text-[#0f172a]' : 'bg-[#8c734b] text-white'} bg-gradient-to-r ${
          isDark 
            ? 'from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c]' 
            : 'from-[#8c734b] to-[#5c4c36] hover:from-[#9f8150] hover:to-[#7a6442]'
        } font-bold py-4 rounded-2xl transition duration-150 cursor-pointer shadow-lg text-sm uppercase tracking-wider mt-4`}
      >
        {loading ? '🔄 Calculating...' : '✨ Calculate Cost'}
      </button>

      {/* RESULTS DISPLAY PANEL */}
      {calculatedCost && (
        <div className={`mt-10 border rounded-3xl p-8 transition-all duration-300 ${
          isDark ? 'bg-[#0f141e]/90 border-[#c5a880]/20 shadow-black/50' : 'bg-[#faf8f5]/80 border-[#e8dfc7] shadow-xl'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
            <span>📊</span> Costing Results
          </h2>

          {/* Top Section: Metrics and Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Panel: Specifications List */}
            <div className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between ${
              isDark ? 'bg-[#1a2332]/60 border-slate-700/60 text-[#e2d4c0]' : 'bg-[#fcfbfa]/80 border-[#e8dfc7] text-[#5c4c36]'
            }`}>
              <div>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>📐 Product Specifications</h3>
                <div className={`space-y-3 text-sm text-left ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Sheet Size:</span>
                    <span>{calculatedCost.sheet_dimensions.sheet_length_mm} × {calculatedCost.sheet_dimensions.sheet_width_mm} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Optimal Reel Width:</span>
                    <span>{calculatedCost.sheet_dimensions.selected_reel_mm} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Sheets Per Reel:</span>
                    <span className="text-blue-500 font-bold">{calculatedCost.sheet_dimensions.sheets_per_reel}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Leftover Waste Width:</span>
                    <span className="text-orange-500 font-bold">{calculatedCost.sheet_dimensions.reel_waste_mm} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Total Area:</span>
                    <span>{calculatedCost.sheet_dimensions.board_area_m2} m²</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Board Weight:</span>
                    <span>{calculatedCost.material.weight_per_sheet_kg} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                    <span className="font-semibold">Total GSM:</span>
                    <span>{calculatedCost.material.total_gsm} gsm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Cost Donut Chart */}
            <CostDonutChart calculatedCost={calculatedCost} theme={theme} />
          </div>

          {/* Middle Section: Reel Slicing Layout Diagram */}
          <div className="mb-8">
            <ReelSlicingDiagram calculatedCost={calculatedCost} theme={theme} />
          </div>

          {/* Financial Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`p-5 rounded-3xl border text-center shadow-md transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Invoice Value</p>
              <p className="text-2xl font-black">
                Rs. {totalInvoiceValue.toFixed(2)}{!isNonVatCustomer ? ' + VAT' : ''}
              </p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {finalCostPerCarton.toFixed(2)}{!isNonVatCustomer ? ' + VAT' : ''} × {quantityNum}
              </p>
            </div>
            
            <div className={`p-5 rounded-3xl border text-center shadow-md transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Total RM Cost</p>
              <p className="text-2xl font-black">
                Rs. {(calculatedCost.rates.rm_cost_per_carton * quantityNum).toFixed(2)}
              </p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {calculatedCost.rates.rm_cost_per_carton} × {quantityNum}
              </p>
            </div>
            
            <div className={`p-5 rounded-3xl border text-center shadow-md transition ${
              isDark ? 'bg-[#1a2332] border-[#c5a880]/25 text-white' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Net Profit</p>
              <p className="text-2xl font-black">
                Rs. {(calculatedCost.profit.profit_amount * quantityNum).toFixed(2)}
              </p>
              <p className={`text-xs mt-1 font-mono ${isDark ? 'text-slate-400' : 'text-[#8c734b]/70'}`}>
                Rs. {calculatedCost.profit.profit_amount} × {quantityNum}
              </p>
            </div>
          </div>

          {/* Bottom Section: Total Costs and Save Quote */}
          <div className={`rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border transition-all duration-300 ${
            isDark 
              ? 'bg-gradient-to-r from-[#1a2332] to-[#131924] border-[#c5a880]/30 text-[#e2d4c0] shadow-black/50' 
              : 'bg-gradient-to-r from-[#8c734b] to-[#5c4c36] border-[#dfd5bc] text-white'
          }`}>
            <div>
              <p className="text-sm opacity-90">Final Cost Per Carton</p>
              <p className={`text-4xl font-black ${isDark ? 'text-[#d4af37]' : 'text-white'}`}>
                Rs. {finalCostPerCarton.toFixed(2)}{!isNonVatCustomer ? ' + VAT' : ''}
              </p>
              <p className="text-sm mt-1 opacity-95">
                Total Batch: Rs. {totalBatchCost.toFixed(2)}{!isNonVatCustomer ? ' + VAT' : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={saveQuote}
              style={{
                backgroundColor: isDark ? '#d4af37' : '#ffffff',
                color: isDark ? '#0f172a' : '#5c4c36',
                visibility: 'visible',
                display: 'inline-block'
              }}
              className={`font-black py-3 px-8 rounded-2xl shadow-lg transition duration-150 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                isDark 
                  ? 'bg-[#d4af37] text-[#0f172a] bg-gradient-to-r from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c]' 
                  : 'bg-white hover:bg-[#faf8f5] text-[#5c4c36]'
              }`}
            >
              💾 Save Quote
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
