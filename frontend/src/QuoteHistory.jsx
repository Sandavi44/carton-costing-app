import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OfficialQuotationModal from './OfficialQuotationModal';

export default function QuoteHistory({ user, setFormData, setCalculatedCost, setActiveTab, theme }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Deleting authority: only Admin can delete quotes
  const canDelete = Boolean(user?.is_admin || user?.can_delete);

  // Modals / Action States
  const [actionPromptQuote, setActionPromptQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Multi-quote selection state for batch compilation
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);

  // Filter States
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [lengthFilter, setLengthFilter] = useState('');
  const [widthFilter, setWidthFilter] = useState('');
  const [heightFilter, setHeightFilter] = useState('');

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';
  const isGreen = !isDark && !isSand;

  const cleanOverlays = () => {
    document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach(el => el.remove());
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanOverlays();
        setSelectedQuote(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/quotes/history', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setQuotes(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quote history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const [successMsg, setSuccessMsg] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteQuote = async (quoteId, quoteNo) => {
    const displayNo = quoteNo || `QT-${String(quoteId).padStart(5, '0')}`;
    const confirmed = window.confirm(`Are you sure you want to permanently delete quote ${displayNo}? This cannot be undone.`);
    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      await axios.delete(`/api/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      if (selectedQuote && selectedQuote.id === quoteId) setSelectedQuote(null);
      if (actionPromptQuote && actionPromptQuote.id === quoteId) setActionPromptQuote(null);
      setSuccessMsg(`Quote ${displayNo} deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete quote');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCompileSelected = () => {
    if (selectedQuoteIds.length === 0) return;
    const selectedList = quotes.filter(q => selectedQuoteIds.includes(q.id));
    if (selectedList.length === 0) return;

    // 1. Strict validation: Customer name check (STOP with error if different customers)
    const customerNames = Array.from(new Set(selectedList.map(q => (q.customer_name || '').trim()).filter(Boolean)));
    if (customerNames.length > 1) {
      const errMsg = `Cannot compile quotations from different customers (${customerNames.join(', ')}). All selected quotations must belong to the same customer.`;
      setError(errMsg);
      alert(`❌ ${errMsg}`);
      return;
    }

    // 2. Strict validation: Tax format check (STOP with error if VAT and Non-VAT are mixed)
    const hasVat = selectedList.some(q => !q.tax_type || !q.tax_type.includes('Non-VAT'));
    const hasNonVat = selectedList.some(q => q.tax_type && q.tax_type.includes('Non-VAT'));
    if (hasVat && hasNonVat) {
      const errMsg = 'Cannot compile VAT and Non-VAT quotations together. All selected quotations must have the same tax format (either all VAT or all Non-VAT).';
      setError(errMsg);
      alert(`❌ ${errMsg}`);
      return;
    }

    // Clear any previous error
    setError('');

    const compiledItems = [];
    selectedList.forEach(q => {
      const qPrice = parseFloat(q.final_cost_per_carton || q.finalCostPerCarton || 0);
      const qTotal = parseFloat(q.total_cost_batch || q.totalCostBatch || 0);
      const qQty = parseInt(q.quantity || 0, 10);

      if (q.items && Array.isArray(q.items) && q.items.length > 1) {
        q.items.forEach(it => {
          const itPrice = parseFloat(it.final_cost_per_carton || it.finalCostPerCarton || it.calculated_cost?.final?.final_cost_per_carton || qPrice || 0);
          const itQty = parseInt(it.quantity || 0, 10);
          const itTotal = parseFloat(it.total_cost_batch || it.totalCostBatch || it.calculated_cost?.final?.total_cost_batch || (itPrice * itQty) || 0);
          compiledItems.push({
            ...it,
            final_cost_per_carton: itPrice,
            finalCostPerCarton: itPrice,
            quantity: itQty,
            total_cost_batch: itTotal,
            totalCostBatch: itTotal,
            carton_type: it.carton_type || it.cartonType || q.carton_type || 'RSC',
            ply_type: it.ply_type || it.plyType || q.ply_type || '3-Ply',
            flute_type: it.flute_type || it.fluteType || q.flute_type || 'B-Flute',
            board_type: it.board_type || it.boardType || q.board_type || 'Brown Liner',
            is_printed: it.is_printed !== undefined ? it.is_printed : (it.isPrinted !== undefined ? it.isPrinted : q.is_printed),
            print_name: it.print_name || it.printName || q.print_name || ''
          });
        });
      } else {
        compiledItems.push({
          ...q,
          final_cost_per_carton: qPrice,
          finalCostPerCarton: qPrice,
          quantity: qQty,
          total_cost_batch: qTotal
        });
      }
    });

    const primaryQuote = selectedList[0];
    const totalBatchSum = compiledItems.reduce((acc, it) => {
      const q = parseInt(it.quantity || 0, 10);
      const p = Math.round(parseFloat(it.final_cost_per_carton || it.finalCostPerCarton || 0) * 4) / 4;
      const amt = (p * q) > 0 ? (p * q) : parseFloat(it.total_cost_batch || it.totalCostBatch || 0);
      return acc + amt;
    }, 0);

    const compiledQuote = {
      ...primaryQuote,
      id: `compiled-${Date.now()}`,
      quote_no: selectedList.map(q => q.quote_no || `QT-${String(q.id).padStart(5, '0')}`).join(' / '),
      customer_name: primaryQuote.customer_name,
      items: compiledItems,
      total_cost_batch: totalBatchSum
    };

    setSelectedQuote(compiledQuote);
  };

  const handleRowClick = async (quoteId) => {
    setActionLoading(true);
    try {
      const response = await axios.get(`/api/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setActionPromptQuote(response.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load quote details');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to get GSM fields list based on ply type
  const getGSMFields = (plyType) => {
    switch(plyType) {
      case '2-Ply': return [{ name: 'gsm1' }, { name: 'gsm2' }];
      case '3-Ply': return [{ name: 'gsm1' }, { name: 'gsm2' }, { name: 'gsm3' }];
      case '4-Ply': return [{ name: 'gsm1' }, { name: 'gsm2' }, { name: 'gsm3' }, { name: 'gsm4' }];
      case '5-Ply': return [{ name: 'gsm1' }, { name: 'gsm2' }, { name: 'gsm3' }, { name: 'gsm4' }, { name: 'gsm5' }];
      case '7-Ply': return [{ name: 'gsm1' }, { name: 'gsm2' }, { name: 'gsm3' }, { name: 'gsm4' }, { name: 'gsm5' }, { name: 'gsm6' }, { name: 'gsm7' }];
      default: return [];
    }
  };

  // Import quote into the main calculator workspace and execute calculator endpoint
  const handleLoadToWorkspace = async (quote) => {
    setActionLoading(true);
    try {
      const gsmArray = quote.gsm_values || [];
      const newFormData = {
        customerName: quote.customer_name || '',
        cartonLength: quote.carton_length_mm || '',
        cartonWidth: quote.carton_width_mm || '',
        cartonHeight: quote.carton_height_mm || '',
        quantity: quote.quantity || '',
        plyType: quote.ply_type || '3-Ply',
        boardType: (quote.board_type && quote.board_type.toLowerCase().includes('white')) ? 'White Liner' : 'Brown Liner',
        fluteType: quote.flute_type || 'B-Flute',
        fluteType2: quote.flute_type_2 || quote.flute_type || 'B-Flute',
        productionMethod: quote.production_method || 'In-house',
        cartonType: quote.carton_type || 'RSC',
        dieLength: quote.die_length_mm !== undefined && quote.die_length_mm !== 0 ? quote.die_length_mm.toString() : '',
        dieWidth: quote.die_width_mm !== undefined && quote.die_width_mm !== 0 ? quote.die_width_mm.toString() : '',
        quoteNo: quote.quote_no || `QT-${String(quote.id).padStart(5, '0')}`,
        isEditing: true,
        joiningType: quote.joining_type || 'Glued',
        isPrinted: quote.is_printed || false,
        printName: quote.print_name || '',
        whiteLinerRate: (quote.board_type && quote.board_type.toLowerCase().includes('white')) ? (quote.white_liner_rate || '') : '',
        brownLinerRate: (!quote.board_type || !quote.board_type.toLowerCase().includes('white')) ? (quote.brown_liner_rate || '') : '',
        gsm1: gsmArray[0] !== undefined ? gsmArray[0].toString() : '',
        gsm2: gsmArray[1] !== undefined ? gsmArray[1].toString() : '',
        gsm3: gsmArray[2] !== undefined ? gsmArray[2].toString() : '',
        gsm4: gsmArray[3] !== undefined ? gsmArray[3].toString() : '',
        gsm5: gsmArray[4] !== undefined ? gsmArray[4].toString() : '',
        gsm6: gsmArray[5] !== undefined ? gsmArray[5].toString() : '',
        gsm7: gsmArray[6] !== undefined ? gsmArray[6].toString() : '',
        totalOverheadForOrder: quote.total_overhead_for_order !== undefined ? quote.total_overhead_for_order.toString() : '',
        joiningCost: quote.joining_cost !== undefined ? quote.joining_cost.toString() : '',
        printCost: quote.print_cost !== undefined ? quote.print_cost.toString() : '',
        slottingCost: quote.slotting_cost !== undefined ? quote.slotting_cost.toString() : '',
        bundlingCost: quote.bundling_cost !== undefined ? quote.bundling_cost.toString() : '',
        bundlingCostManual: true, // Flag as overridden to preserve quote value
        diecuttingCost: quote.diecutting_cost !== undefined ? quote.diecutting_cost.toString() : '',
        profitMargin: quote.profit_margin_percent !== undefined ? quote.profit_margin_percent.toString() : '15',
        taxType: quote.tax_type?.includes('VAT') && !quote.tax_type?.includes('Non-VAT') ? 'VAT' : 'Non-VAT',
        hasInhouseCommission: quote.has_inhouse_commission || false,
        hasThirdPartyCommission: quote.has_third_party_commission || false,
        thirdPartyCommission: quote.third_party_commission !== undefined ? quote.third_party_commission.toString() : '',
        hasTransport: quote.has_transport || false,
        transportCost: quote.transport_cost !== undefined ? quote.transport_cost.toString() : '',
        transportOption: quote.transport_option || (quote.has_transport ? 'Including transport' : 'Ex factory price from Biyagama factory ( No transport)'),
        oneTimeDieCost: (quote.die_making_cost && quote.die_making_cost > 0) ? String(quote.die_making_cost) : '',
        oneTimeBlockCost: (quote.block_making_cost && quote.block_making_cost > 0) ? String(quote.block_making_cost) : '',
        oneTimeTransportCost: (quote.one_time_transport_cost && quote.one_time_transport_cost > 0) ? String(quote.one_time_transport_cost) : '',
        paymentMethod: quote.payment_method || 'Credit - 30 Days',
        dimensionUnit: quote.dimension_unit || 'mm',
      };

      // Set forms state
      setFormData(newFormData);

      // Perform calculation immediately to sync visual layouts
      const gsmFields = getGSMFields(newFormData.plyType);
      const gsmValues = gsmFields.map(f => parseFloat(newFormData[f.name]) || 0);

      const payload = {
        customerName: newFormData.customerName,
        carton_length_mm: parseFloat(newFormData.cartonLength),
        carton_width_mm: parseFloat(newFormData.cartonWidth),
        carton_height_mm: parseFloat(newFormData.cartonHeight),
        quantity: parseInt(newFormData.quantity),
        ply_type: newFormData.plyType,
        board_type: newFormData.boardType,
        flute_type: newFormData.fluteType,
        flute_type_2: newFormData.fluteType2 || newFormData.fluteType,
        production_method: newFormData.productionMethod || 'In-house',
        carton_type: newFormData.cartonType || 'RSC',
        die_length_mm: parseFloat(newFormData.dieLength || 0),
        die_width_mm: parseFloat(newFormData.dieWidth || 0),
        joining_type: newFormData.joiningType,
        is_printed: newFormData.isPrinted,
        gsm_values: JSON.stringify(gsmValues),
        white_liner_rate: parseFloat(newFormData.whiteLinerRate || 0),
        brown_liner_rate: parseFloat(newFormData.brownLinerRate || 0),
        total_overhead_for_order: parseFloat(newFormData.totalOverheadForOrder || 0),
        joining_cost: (newFormData.productionMethod === 'Outsource' || newFormData.cartonType === 'S.F.') ? 0 : parseFloat(newFormData.joiningCost || 0),
        print_cost: newFormData.isPrinted ? parseFloat(newFormData.printCost || 0) : 0,
        slotting_cost: parseFloat(newFormData.slottingCost || 0),
        bundling_cost: parseFloat(newFormData.bundlingCost || 0),
        diecutting_cost: parseFloat(newFormData.diecuttingCost || 0),
        profit_margin_percent: parseFloat(newFormData.profitMargin || 15),
        tax_type: newFormData.taxType,
        hasInhouseCommission: newFormData.hasInhouseCommission,
        hasThirdPartyCommission: newFormData.hasThirdPartyCommission,
        thirdPartyCommission: parseFloat(newFormData.thirdPartyCommission || 0),
        hasTransport: newFormData.hasTransport,
        transportCost: parseFloat(newFormData.transportCost || 0),
      };

      const calcResponse = await axios.post('/api/quotes/calculate', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });

      setCalculatedCost(calcResponse.data);
      setActionPromptQuote(null);
      
      // Navigate to Workspace
      setActiveTab('calculator');
    } catch (err) {
      alert('Imported parameters but calculator calculation failed: ' + (err.response?.data?.error || err.message));
      setActionPromptQuote(null);
      setActiveTab('calculator');
    } finally {
      setActionLoading(false);
    }
  };

  // Format item description matching official quotation document view
  const getItemMainDescription = (q) => {
    if (q.item_count > 1) return null;
    if (q.description && typeof q.description === 'string' && !q.description.includes('[object Object]')) {
      return q.description;
    }
    if (q.item_description && typeof q.item_description === 'string' && !q.item_description.includes('[object Object]')) {
      return q.item_description;
    }

    const cartonType = q.carton_type || 'RSC';
    const isSF = cartonType === 'S.F.' || cartonType.includes('S.F.');
    const plyType = q.ply_type || '3-Ply';
    const plyClean = plyType.replace('-', ' ');
    const isPrinted = Boolean(q.is_printed);
    const dimUnit = q.dimension_unit || 'mm';

    let dimStr = q.dimensions;
    if (!dimStr || dimStr.startsWith('0×0×0') || (isSF && dimStr.endsWith('0×0×0 mm'))) {
      if (isSF) {
        if (dimUnit === 'inches') {
          const lIn = q.die_length_input || (q.die_length_mm ? (q.die_length_mm / 25.4).toFixed(2).replace(/\.00$/, '') : '0');
          const wIn = q.die_width_input || (q.die_width_mm ? (q.die_width_mm / 25.4).toFixed(2).replace(/\.00$/, '') : '0');
          dimStr = `${lIn}×${wIn} inches`;
        } else {
          const lMm = Math.round(q.die_length_mm || 0);
          const wMm = Math.round(q.die_width_mm || 0);
          dimStr = `${lMm}×${wMm} mm`;
        }
      } else {
        if (dimUnit === 'inches' && q.carton_length_input && q.carton_width_input && q.carton_height_input) {
          dimStr = `${q.carton_length_input}×${q.carton_width_input}×${q.carton_height_input} inches`;
        } else {
          dimStr = `${Math.round(q.carton_length_mm || 0)}×${Math.round(q.carton_width_mm || 0)}×${Math.round(q.carton_height_mm || 0)} mm`;
        }
      }
    }

    if (isSF) {
      const isSheet = plyType === '2-Ply' || plyType === '4-Ply';
      const productNoun = isSheet ? (isPrinted ? 'Printed Sheet' : 'Sheet') : (isPrinted ? 'Printed Boards' : 'Boards');
      return `${dimStr} - ${plyClean} ${productNoun} - S.F.`;
    }
    const productNoun = isPrinted ? 'Printed Carton' : 'Carton';
    const typeStr = cartonType.toLowerCase().includes('type') ? cartonType : `${cartonType} Type`;
    return `${dimStr} - ${plyClean} ${productNoun} - ${typeStr}`;
  };

  // Perform search filtering on full quote database client-side (checks Name, QT- Order No, Originator, Type, Print, Description)
  const filteredQuotes = quotes.filter((quote) => {
    if (customerFilter) {
      const q = customerFilter.toLowerCase();
      const itemDesc = (getItemMainDescription(quote) || '').toLowerCase();
      const matchesName = (quote.customer_name || '').toLowerCase().includes(q);
      const matchesNo = (quote.quote_no || '').toLowerCase().includes(q);
      const matchesOriginator = (quote.originator_name || quote.prepared_by || '').toLowerCase().includes(q);
      const matchesType = (quote.carton_type || '').toLowerCase().includes(q);
      const matchesPrint = (quote.is_printed ? ('printed ' + (quote.print_name || '')) : 'plain').toLowerCase().includes(q);
      const matchesDesc = itemDesc.includes(q);
      if (!matchesName && !matchesNo && !matchesOriginator && !matchesType && !matchesPrint && !matchesDesc) {
        return false;
      }
    }
    if (dateFilter) {
      const quoteDate = new Date(quote.created_at).toISOString().split('T')[0];
      if (quoteDate !== dateFilter) {
        return false;
      }
    }
    if (lengthFilter || widthFilter || heightFilter) {
      const isSF = (quote.carton_type || '').includes('S.F.');
      if (isSF) {
        if (heightFilter) return false;
        const l = Math.round(quote.die_length_mm || 0).toString();
        const w = Math.round(quote.die_width_mm || 0).toString();
        if (lengthFilter && l !== lengthFilter) return false;
        if (widthFilter && w !== widthFilter) return false;
      } else {
        const parts = (quote.dimensions || '').split('×');
        if (parts.length === 3) {
          const [l, w, h] = parts.map(p => p.trim().split(' ')[0]);
          if (lengthFilter && l !== lengthFilter) return false;
          if (widthFilter && w !== widthFilter) return false;
          if (heightFilter && h !== heightFilter) return false;
        } else {
          return false;
        }
      }
    }
    return true;
  });

  // Enterprise Shell Styles: Supports Green, Sand, and Dark
  const inputClass = `px-3.5 py-1.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
    isDark 
      ? 'bg-[#1a2332] border-[#c5a880]/20 text-[#e2d4c0] placeholder-slate-500 focus:ring-[#c5a880]/40 focus:border-[#d4af37]' 
      : isSand
        ? 'bg-white border-[#dfd5bc] text-[#5c4c36] placeholder-[#b8b09b] focus:ring-[#8c734b]/20 focus:border-[#8c734b]'
        : 'bg-white border-emerald-300 text-black placeholder-gray-400 focus:ring-emerald-500/20 focus:border-emerald-600'
  }`;

  return (
    <div className={`rounded-3xl shadow-2xl p-8 transition-colors duration-300 text-left relative border ${
      isDark 
        ? 'bg-[#0f141e]/90 text-white border-[#c5a880]/20 shadow-black/50' 
        : isSand
          ? 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc] shadow-xl'
          : 'bg-[#f4faf4] text-[#14532d] border-[#bbf7d0] shadow-xl'
    }`}>
      {/* Loading Overlay */}
      {actionLoading && (
        <div className={`absolute inset-0 flex items-center justify-center z-50 rounded-3xl ${
          isDark ? 'bg-[#0c0f17]/80 backdrop-blur-xs' : 'bg-[#faf8f5]/80 backdrop-blur-xs'
        }`}>
          <p className={`font-semibold animate-pulse text-lg ${
            isDark ? 'text-[#d4af37]' : isSand ? 'text-[#8c734b]' : 'text-[#15803d]'
          }`}>Syncing costing workspace...</p>
        </div>
      )}

      {/* Main Quote History Table & Controls (hidden in print mode so it occupies 0 height) */}
      <div className="quote-history-main-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${
            isDark ? 'text-[#d4af37]' : isSand ? 'text-[#8c734b]' : 'text-[#15803d]'
          }`}>
            <span>📜</span> Quote History
          </h2>
        <button
          onClick={fetchHistory}
          className={`font-semibold px-4 py-2 rounded-lg transition text-sm cursor-pointer shadow-xs border ${
            isDark 
              ? 'bg-[#1a2332] border-[#c5a880]/25 text-[#d4af37] hover:bg-slate-700' 
              : isSand
                ? 'bg-[#faf8f5] border-[#dfd5bc] text-[#8c734b] hover:bg-[#eae5d9]/40'
                : 'bg-white border-[#bbf7d0] text-[#15803d] hover:bg-emerald-50'
          }`}
        >
          🔄 Refresh
        </button>
      </div>

      {successMsg && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-semibold border ${
          isDark ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          ✅ {successMsg}
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div className={`p-5 rounded-3xl border mb-6 ${
        isDark 
          ? 'bg-[#131924]/90 border-[#c5a880]/15' 
          : isSand
            ? 'bg-[#faf8f5]/90 border-[#dfd5bc]'
            : 'bg-[#eaf5ea]/90 border-[#bbf7d0]'
      }`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
          isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'
        }`}>🔍 Filter & Search History</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          <input
            type="text"
            placeholder="Search Name, Order No., Originator, Description, Type..."
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={`${inputClass} text-gray-700 dark:text-white`}
          />
          <input
            type="number"
            placeholder="Length (mm)"
            value={lengthFilter}
            onChange={(e) => setLengthFilter(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Width (mm)"
            value={widthFilter}
            onChange={(e) => setWidthFilter(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Height (mm)"
            value={heightFilter}
            onChange={(e) => setHeightFilter(e.target.value)}
            className={inputClass}
          />
        </div>
        {(customerFilter || dateFilter || lengthFilter || widthFilter || heightFilter) && (
          <button
            onClick={() => {
              setCustomerFilter('');
              setDateFilter('');
              setLengthFilter('');
              setWidthFilter('');
              setHeightFilter('');
            }}
            className={`text-xs font-semibold mt-3 transition block cursor-pointer ${isDark ? 'text-[#c5a880] hover:text-[#d4af37]' : 'text-[#8c734b] hover:text-[#5c4c36]'}`}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className={`border-l-4 p-4 mb-6 rounded text-sm ${isDark ? 'bg-red-950/30 border-red-500 text-red-300' : 'bg-red-50 border-red-500 text-red-700'}`}>
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className={`text-center py-10 ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
          <p className="animate-pulse">Loading history...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className={`text-center py-10 border-2 border-dashed rounded-2xl ${
          isDark ? 'border-[#c5a880]/20 text-slate-400' : 'border-[#dfd5bc] text-[#8c734b]/60'
        }`}>
          No quotes match your filters.
        </div>
      ) : (
        <>
          {/* Compilation Action Banner when quotes are selected */}
          {(() => {
            if (selectedQuoteIds.length === 0) return null;
            const selList = quotes.filter(q => selectedQuoteIds.includes(q.id));
            const custs = Array.from(new Set(selList.map(q => (q.customer_name || '').trim()).filter(Boolean)));
            const hasMultipleCustomers = custs.length > 1;
            const hasVat = selList.some(q => !q.tax_type || !q.tax_type.includes('Non-VAT'));
            const hasNonVat = selList.some(q => q.tax_type && q.tax_type.includes('Non-VAT'));
            const hasMixedTax = hasVat && hasNonVat;
            const isInvalid = hasMultipleCustomers || hasMixedTax;

            return (
              <div className={`p-4 mb-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border shadow-md animate-fade-in ${
                isInvalid
                  ? isDark ? 'bg-red-950/40 border-red-800/60 text-red-200' : 'bg-red-50 border-red-300 text-red-900'
                  : isDark ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>{isInvalid ? '⚠️' : '☑️'}</span>
                    <span>{selectedQuoteIds.length} quote(s) selected for compilation</span>
                    {!isInvalid && custs.length === 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {custs[0]} ({hasNonVat ? 'Non-VAT' : 'VAT'})
                      </span>
                    )}
                  </div>
                  {hasMultipleCustomers && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      ❌ Selected quotes belong to different customers ({custs.join(', ')}). All must belong to the same customer.
                    </p>
                  )}
                  {hasMixedTax && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                      ❌ Selected quotes mix VAT and Non-VAT. All must have the same tax format.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCompileSelected}
                    className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-md cursor-pointer transition ${
                      isInvalid 
                        ? 'bg-gray-400 text-gray-200 dark:bg-slate-700 dark:text-slate-400 hover:opacity-90' 
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white hover:scale-[1.02]'
                    }`}
                  >
                    📑 Compile Selected ({selectedQuoteIds.length}) into One Quotation
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteIds([])}
                    className="px-3 py-2 rounded-xl font-bold text-xs bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 cursor-pointer transition"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            );
          })()}

          <div className={`overflow-x-auto rounded-2xl border ${
            isDark ? 'border-[#c5a880]/20' : isSand ? 'border-[#dfd5bc]' : 'border-[#bbf7d0]'
          }`}>
            <table className={`min-w-full divide-y ${
              isDark ? 'divide-[#c5a880]/20' : isSand ? 'divide-[#dfd5bc]' : 'divide-[#bbf7d0]'
            }`}>
              <thead className={isDark ? 'bg-[#131924]/80' : isSand ? 'bg-[#eae5d9]/30' : 'bg-[#eaf5ea]'}>
                <tr>
                  <th className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={filteredQuotes.length > 0 && selectedQuoteIds.length === filteredQuotes.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedQuoteIds(filteredQuotes.map(q => q.id));
                        } else {
                          setSelectedQuoteIds([]);
                        }
                      }}
                      className="w-4 h-4 cursor-pointer rounded"
                      title="Select / Deselect All"
                    />
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Order No.
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Customer
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Originator
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Product Details
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Item Description
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Ply / Qty
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Per Carton / Total
                  </th>
                  <th className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Date
                  </th>
                  <th className={`px-5 py-3 text-right text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${
                isDark ? 'bg-[#131924]/40 divide-[#c5a880]/15' : isSand ? 'bg-white divide-[#dfd5bc]' : 'bg-white divide-[#bbf7d0]'
              }`}>
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => handleRowClick(quote.id)}
                    className={`transition cursor-pointer ${
                      selectedQuoteIds.includes(quote.id)
                        ? isDark ? 'bg-[#d4af37]/15' : 'bg-amber-50'
                        : isDark ? 'hover:bg-[#1a2332]/60' : isSand ? 'hover:bg-[#faf8f5]' : 'hover:bg-[#eaf5ea]/50'
                    }`}
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedQuoteIds.includes(quote.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedQuoteIds(prev => [...prev, quote.id]);
                          } else {
                            setSelectedQuoteIds(prev => prev.filter(id => id !== quote.id));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer rounded"
                      />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                        isDark 
                          ? 'bg-[#d4af37]/25 text-[#d4af37]' 
                          : isSand
                            ? 'bg-[#9f8150]/15 text-[#8c734b]'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {quote.quote_no || `QT-${String(quote.id).padStart(5, '0')}`}
                      </span>
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap font-medium ${
                      isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                    }`}>
                      {quote.customer_name}
                    </td>

                    {/* Originator / Prepared By Column */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                        (quote.originator_name || quote.prepared_by || 'Admin').toLowerCase() === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                          : (quote.originator_name || quote.prepared_by || '').toLowerCase() === 'manoj'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      }`}>
                        👤 {quote.originator_name || quote.prepared_by || 'Admin'}
                      </span>
                    </td>

                    {/* Product Details (Type & Print) Column */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {quote.item_count > 1 ? (
                        <div>
                          <div className={`font-bold ${isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-gray-900'}`}>
                            Multi-type
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 mt-0.5">
                            📑 {quote.item_count} Items
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className={`font-bold ${isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-gray-900'}`}>
                            {quote.carton_type || 'RSC'}
                          </div>
                          <div>
                            {quote.is_printed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60" title={`Printed: ${quote.print_name || 'Standard'}`}>
                                🖨️ {quote.print_name ? `Printed (${quote.print_name})` : 'Printed'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                📦 Plain
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className={`px-5 py-4 whitespace-nowrap text-sm font-medium ${
                      isDark ? 'text-slate-200' : isSand ? 'text-[#5c4c36]' : 'text-gray-800'
                    }`}>
                      {quote.item_count > 1 ? (
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">📋 {quote.item_count} Items</span>
                          <div className="text-[11px] opacity-75 font-sans">Compiled Quote</div>
                        </div>
                      ) : (
                        <span>{getItemMainDescription(quote)}</span>
                      )}
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap ${
                      isDark ? 'text-slate-300' : isSand ? 'text-[#6b5940]' : 'text-gray-700'
                    }`}>
                      {quote.item_count > 1 ? 'Multi-ply' : quote.ply_type} / <span className={`font-semibold ${
                        isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                      }`}>{quote.quantity}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-semibold">
                      {quote.item_count > 1 ? (
                        <span className={isDark ? "text-[#d4af37]" : isSand ? "text-[#8c734b]" : "text-[#15803d]"}>
                          Total: Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}
                        </span>
                      ) : (
                        <>
                          Rs. {quote.final_cost_per_carton}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''} / <span className={
                            isDark ? "text-[#d4af37]" : isSand ? "text-[#8c734b]" : "text-[#15803d]"
                          }>Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                        </>
                      )}
                    </td>
                    <td className={`px-5 py-4 whitespace-nowrap text-xs ${
                      isDark ? 'text-slate-400' : isSand ? 'text-[#8c734b]/80' : 'text-[#166534]/80'
                    }`}>
                      {new Date(quote.created_at).toLocaleDateString()}{' '}
                      {new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(quote.id)}
                        className={`font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          isDark 
                            ? 'text-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border-[#c5a880]/30' 
                            : 'text-[#8c734b] bg-[#faf8f5] border-[#dfd5bc] hover:bg-[#eae5d9]/40'
                        }`}
                      >
                        Open Options
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteQuote(quote.id, quote.quote_no)}
                          className="font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60"
                          title="Delete Quote"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* CHOICE PROMPT MODAL */}
      {actionPromptQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className={`rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 relative border max-h-[90vh] flex flex-col overflow-y-auto ${
            isDark ? 'bg-[#0f141e] text-white border-[#c5a880]/30' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc]'
          }`}>
            <button
              onClick={() => setActionPromptQuote(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white text-xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-[#f5deb3]' : 'text-[#1a130b]'}`}>
              Quote Choices ({actionPromptQuote.quote_no || `QT-${String(actionPromptQuote.id).padStart(5, '0')}`})
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Would you like to view the detailed summary break-down for <strong>{actionPromptQuote.customer_name}</strong> or load its data into the active calculation workspace for editing?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedQuote(actionPromptQuote);
                  setActionPromptQuote(null);
                }}
                style={{
                  backgroundColor: isDark ? '#d4af37' : '#8c734b',
                  color: isDark ? '#0f172a' : '#ffffff'
                }}
                className={`w-full font-bold py-3 rounded-2xl shadow-md transition block text-sm text-center cursor-pointer hover:scale-[1.01] ${
                  isDark 
                    ? 'bg-[#d4af37] text-[#0f172a] bg-gradient-to-r from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c]' 
                    : 'bg-[#8c734b] text-white bg-gradient-to-r from-[#8c734b] to-[#5c4c36] hover:from-[#9f8150] hover:to-[#7a6442]'
                }`}
              >
                🔍 View Costing Summary Modal
              </button>
              <button
                onClick={() => handleLoadToWorkspace(actionPromptQuote)}
                className={`w-full font-bold py-3 rounded-2xl transition block text-sm text-center cursor-pointer hover:scale-[1.01] border ${
                  isDark 
                    ? 'bg-[#1a2332] text-white hover:bg-slate-700 border-[#c5a880]/30' 
                    : 'bg-[#faf8f5] hover:bg-[#eae5d9]/40 text-[#5c4c36] border-[#dfd5bc]'
                }`}
              >
                💻 Load Costing Data to Workspace (Edit)
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDeleteQuote(actionPromptQuote.id, actionPromptQuote.quote_no)}
                  className="w-full font-bold py-2.5 rounded-2xl transition block text-sm text-center cursor-pointer hover:scale-[1.01] border text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60"
                >
                  🗑️ Delete Quote
                </button>
              )}
              <button
                onClick={() => setActionPromptQuote(null)}
                className={`w-full font-semibold py-2.5 rounded-2xl transition block text-xs text-center cursor-pointer border ${
                  isDark ? 'bg-slate-900 text-slate-400 hover:bg-slate-950' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL - OFFICIAL QUOTATION REPORT */}
      {selectedQuote && (
        <OfficialQuotationModal
          quote={selectedQuote}
          user={user}
          onClose={() => setSelectedQuote(null)}
          onDelete={canDelete && selectedQuote.id && !String(selectedQuote.id).startsWith('compiled-') ? () => handleDeleteQuote(selectedQuote.id, selectedQuote.quote_no) : null}
          theme={theme}
        />
      )}

    </div>
  );
}
