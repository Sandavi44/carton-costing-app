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
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkRenameModal, setShowBulkRenameModal] = useState(false);
  const [targetCustomerName, setTargetCustomerName] = useState('');
  const [bulkRenameLoading, setBulkRenameLoading] = useState(false);
  const [customerList, setCustomerList] = useState([]);

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

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (Array.isArray(res.data)) {
        setCustomerList(res.data);
      }
    } catch (e) {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCustomers();
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
      setSelectedQuoteIds(prev => prev.filter(id => id !== quoteId));
      if (selectedQuote && selectedQuote.id === quoteId) setSelectedQuote(null);
      setSuccessMsg(`Quote ${displayNo} deleted successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete quote');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuoteIds.length === 0) return;
    const count = selectedQuoteIds.length;
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${count} selected quotation(s)? This cannot be undone.`);
    if (!confirmed) return;

    setBulkDeleteLoading(true);
    try {
      const response = await axios.post('/api/quotes/bulk-delete', {
        quote_ids: selectedQuoteIds
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });

      const deletedIds = new Set(selectedQuoteIds);
      setQuotes(prev => prev.filter(q => !deletedIds.has(q.id)));
      if (selectedQuote && deletedIds.has(selectedQuote.id)) setSelectedQuote(null);
      setSelectedQuoteIds([]);
      setSuccessMsg(response.data?.message || `Successfully deleted ${count} quotation(s).`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete selected quotations');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleBulkRenameCustomer = async () => {
    const trimmed = targetCustomerName.trim();
    if (!trimmed) {
      alert('Please enter or select a customer name.');
      return;
    }
    const count = selectedQuoteIds.length;
    setBulkRenameLoading(true);
    try {
      const res = await axios.post('/api/quotes/bulk-update-customer-name', {
        quote_ids: selectedQuoteIds,
        customer_name: trimmed
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });

      setQuotes(prev => prev.map(q => selectedQuoteIds.includes(q.id) ? { ...q, customer_name: trimmed } : q));
      setShowBulkRenameModal(false);
      setSuccessMsg(res.data?.message || `Updated customer name to "${trimmed}" on ${count} quotation(s).`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update customer name.');
    } finally {
      setBulkRenameLoading(false);
    }
  };

  const populateQuoteIntoState = (q, forEdit = false) => {
    const gsmArray = q.gsm_values || [];

    setFormData({
      customerName: q.customer_name || '',
      cartonLength: q.dimensions?.length_mm || q.carton_length_mm || '',
      cartonWidth: q.dimensions?.width_mm || q.carton_width_mm || '',
      cartonHeight: q.dimensions?.height_mm || q.carton_height_mm || '',
      quantity: q.quantity || '',
      plyType: q.ply_type || '3-Ply',
      boardType: (q.board_type && q.board_type.toLowerCase().includes('white')) ? 'White Liner' : 'Brown Liner',
      fluteType: q.flute_type || 'B-Flute',
      fluteType2: q.flute_type_2 || q.flute_type || 'B-Flute',
      productionMethod: q.production_method || 'In-house',
      cartonType: q.carton_type || 'RSC',
      dieLength: q.die_length_mm ? String(q.die_length_mm) : '',
      dieWidth: q.die_width_mm ? String(q.die_width_mm) : '',
      quoteNo: q.quote_no || `QT-${String(q.id).padStart(5, '0')}`,
      isEditing: forEdit,
      isCustomerNameOnlyEdit: forEdit,
      editQuoteId: q.id,
      joiningType: q.joining_type || 'Glued',
      isPrinted: q.is_printed || false,
      printName: q.print_name || '',
      whiteLinerRate: q.white_liner_rate ? String(q.white_liner_rate) : '',
      brownLinerRate: q.brown_liner_rate ? String(q.brown_liner_rate) : '',
      gsm1: gsmArray[0] !== undefined ? String(gsmArray[0]) : '',
      gsm2: gsmArray[1] !== undefined ? String(gsmArray[1]) : '',
      gsm3: gsmArray[2] !== undefined ? String(gsmArray[2]) : '',
      gsm4: gsmArray[3] !== undefined ? String(gsmArray[3]) : '',
      gsm5: gsmArray[4] !== undefined ? String(gsmArray[4]) : '',
      gsm6: gsmArray[5] !== undefined ? String(gsmArray[5]) : '',
      gsm7: gsmArray[6] !== undefined ? String(gsmArray[6]) : '',
      totalOverheadForOrder: q.total_overhead_for_order !== undefined ? String(q.total_overhead_for_order) : '',
      joiningCost: q.joining_cost !== undefined ? String(q.joining_cost) : '',
      printCost: q.print_cost !== undefined ? String(q.print_cost) : '',
      slottingCost: q.slotting_cost !== undefined ? String(q.slotting_cost) : '',
      bundlingCost: q.bundling_cost !== undefined ? String(q.bundling_cost) : '',
      diecuttingCost: q.diecutting_cost !== undefined ? String(q.diecutting_cost) : '',
      profitMargin: q.profit_margin_percent !== undefined ? String(q.profit_margin_percent) : '15',
      taxType: q.tax_type?.includes('VAT') && !q.tax_type?.includes('Non-VAT') ? 'VAT' : 'Non-VAT',
      hasInhouseCommission: q.has_inhouse_commission || false,
      hasThirdPartyCommission: q.has_third_party_commission || false,
      thirdPartyCommission: q.third_party_commission !== undefined ? String(q.third_party_commission) : '',
      hasTransport: q.has_transport || false,
      transportCost: q.transport_cost !== undefined ? String(q.transport_cost) : '',
      transportOption: q.transport_option || (q.has_transport ? 'Including transport' : 'Ex factory price from Biyagama factory ( No transport)'),
      oneTimeDieCost: q.die_making_cost ? String(q.die_making_cost) : '',
      oneTimeBlockCost: q.block_making_cost ? String(q.block_making_cost) : '',
      oneTimeTransportCost: q.one_time_transport_cost ? String(q.one_time_transport_cost) : '',
      paymentMethod: q.payment_method || 'Credit - 30 Days',
      dimensionUnit: q.dimension_unit || 'mm',
    });

    if (q.calculated_cost) {
      setCalculatedCost(q.calculated_cost);
    }
  };

  const handleLoadForCustomerEdit = async (quote) => {
    if (!canDelete) {
      alert('Only Admin has authority to edit customer name on existing quotations.');
      return;
    }
    setActionLoading(true);
    try {
      const response = await axios.get(`/api/quotes/${quote.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      populateQuoteIntoState(response.data, true);
      setActiveTab('calculator');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load quote details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewCalculationLogic = async (quoteOrId) => {
    const quoteId = typeof quoteOrId === 'object' ? quoteOrId.id : quoteOrId;
    if (!quoteId) return;
    setActionLoading(true);
    try {
      const response = await axios.get(`/api/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      populateQuoteIntoState(response.data, false);
      setActiveTab('steps');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load quotation calculation logic');
    } finally {
      setActionLoading(false);
    }
  };

  const preloadQuoteForCalculation = async (quoteId) => {
    if (!quoteId || String(quoteId).startsWith('compiled-')) return;
    try {
      const response = await axios.get(`/api/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      populateQuoteIntoState(response.data, false);
    } catch (_) {
      // background preload
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

  const handleViewQuote = async (quoteId) => {
    setActionLoading(true);
    try {
      const response = await axios.get(`/api/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setSelectedQuote(response.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load quote details');
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

  // Enterprise Shell Styles: High contrast on all screens (supports Green, Sand, and Dark)
  const inputClass = `px-3.5 py-2 border-2 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
    isDark 
      ? 'bg-[#1e293b] border-[#d4af37]/60 text-white placeholder-slate-400 focus:ring-[#d4af37]/40 focus:border-[#fbbf24]' 
      : isSand
        ? 'bg-white border-[#8c734b] text-[#1c1917] placeholder-[#78716c] focus:ring-[#8c734b]/30 focus:border-[#5c4c36]'
        : 'bg-white border-emerald-500 text-black placeholder-gray-500 focus:ring-emerald-500/30 focus:border-emerald-700'
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

      {successMsg && (
        <div className={`border-l-4 p-4 mb-6 rounded text-sm ${isDark ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-emerald-50 border-emerald-500 text-emerald-800'}`}>
          ✅ {successMsg}
        </div>
      )}

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
          {/* Compilation & Bulk Action Banner when quotes are selected */}
          {(() => {
            if (selectedQuoteIds.length === 0) return null;
            const selList = quotes.filter(q => selectedQuoteIds.includes(q.id));
            const custs = Array.from(new Set(selList.map(q => (q.customer_name || '').trim()).filter(Boolean)));
            const hasMultipleCustomers = custs.length > 1;
            const hasVat = selList.some(q => !q.tax_type || !q.tax_type.includes('Non-VAT'));
            const hasNonVat = selList.some(q => q.tax_type && q.tax_type.includes('Non-VAT'));
            const hasMixedTax = hasVat && hasNonVat;
            const isInvalidForCompile = hasMultipleCustomers || hasMixedTax;

            return (
              <div 
                style={{
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: isDark ? '#fbbf24' : '#111827',
                  borderWidth: '2.5px',
                  borderStyle: 'solid',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
                }}
                className="p-4 mb-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in"
              >
                <div className="flex flex-col gap-1">
                  <div 
                    style={{
                      color: isDark ? '#ffffff' : '#000000',
                      fontWeight: '900',
                      fontSize: '15px'
                    }}
                    className="flex items-center gap-2"
                  >
                    <span>☑️</span>
                    <span>{selectedQuoteIds.length} quote(s) selected</span>
                    {!isInvalidForCompile && custs.length === 1 && (
                      <span 
                        style={{
                          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : '#fef3c7',
                          color: isDark ? '#fbbf24' : '#78350f',
                          border: '1.5px solid ' + (isDark ? '#fbbf24' : '#d97706')
                        }}
                        className="text-xs px-2.5 py-0.5 rounded-full font-bold ml-1"
                      >
                        {custs[0]} ({hasNonVat ? 'Non-VAT' : 'VAT'})
                      </span>
                    )}
                  </div>
                  {hasMultipleCustomers && (
                    <p style={{ color: isDark ? '#fbbf24' : '#b45309', fontWeight: '700' }} className="text-xs">
                      ℹ️ Selected quotes belong to multiple customers ({custs.join(', ')}). Compilation is disabled, but Admin group deletion is allowed.
                    </p>
                  )}
                  {hasMixedTax && (
                    <p style={{ color: isDark ? '#fbbf24' : '#b45309', fontWeight: '700' }} className="text-xs">
                      ℹ️ Selected quotes mix VAT and Non-VAT. Compilation is disabled, but Admin group deletion is allowed.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleViewCalculationLogic(selectedQuoteIds[selectedQuoteIds.length - 1])}
                    style={{
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      border: '2px solid #5b21b6',
                      fontWeight: '900',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm hover:opacity-90 hover:scale-[1.02] cursor-pointer transition flex items-center gap-1.5"
                    title="View live step-by-step solver, sheet formulas, and full working sheet for this quotation"
                  >
                    <span>📐</span>
                    <span>View Calculation Logic {selectedQuoteIds.length > 1 ? `(#${selectedQuoteIds[selectedQuoteIds.length - 1]})` : ''}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isInvalidForCompile}
                    onClick={handleCompileSelected}
                    style={{
                      backgroundColor: isInvalidForCompile ? '#6b7280' : '#15803d',
                      color: '#ffffff',
                      border: '2px solid ' + (isInvalidForCompile ? '#4b5563' : '#052e16'),
                      fontWeight: '900',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm transition ${
                      isInvalidForCompile 
                        ? 'cursor-not-allowed opacity-60' 
                        : 'hover:opacity-90 hover:scale-[1.02] cursor-pointer'
                    }`}
                    title={isInvalidForCompile ? "All compiled quotes must share the same customer and tax format" : "Compile selected into one official quotation document"}
                  >
                    📑 Compile Selected ({selectedQuoteIds.length})
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCustomerName(custs[0] || '');
                        setShowBulkRenameModal(true);
                      }}
                      style={{
                        backgroundColor: '#1d4ed8',
                        color: '#ffffff',
                        border: '2px solid #172554',
                        fontWeight: '900',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm hover:opacity-90 hover:scale-[1.02] cursor-pointer transition"
                      title="Unify and overwrite customer name on all selected quotations (Admin only)"
                    >
                      ✏️ Rename Customer ({selectedQuoteIds.length})
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      disabled={bulkDeleteLoading}
                      onClick={handleBulkDelete}
                      style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: '2px solid #450a0a',
                        fontWeight: '900',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm hover:opacity-90 hover:scale-[1.02] cursor-pointer transition disabled:opacity-50"
                      title="Permanently delete all selected quotations (Admin only)"
                    >
                      {bulkDeleteLoading ? 'Deleting...' : `🗑️ Delete Selected (${selectedQuoteIds.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteIds([])}
                    style={{
                      backgroundColor: isDark ? '#374151' : '#f3f4f6',
                      color: isDark ? '#ffffff' : '#000000',
                      border: isDark ? '2px solid #6b7280' : '2px solid #111827',
                      fontWeight: '800'
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs hover:opacity-80 cursor-pointer transition"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            );
          })()}

          <div 
            style={{
              backgroundColor: isDark ? '#0b0f19' : '#ffffff',
              border: isDark ? '2px solid rgba(197, 168, 128, 0.3)' : isSand ? '2px solid #78350f' : '2px solid #16a34a',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
            className="overflow-x-auto rounded-2xl"
          >
            <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
              <thead 
                style={{
                  backgroundColor: isDark ? '#1e293b' : isSand ? '#f5ebd7' : '#dcfce7',
                  borderBottom: isDark ? '2.5px solid #d4af37' : isSand ? '2.5px solid #78350f' : '2.5px solid #15803d'
                }}
              >
                <tr>
                  <th className="px-4 py-3.5 text-center w-10">
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
                  {[
                    'Order No.', 'Customer', 'Originator', 'Product Details', 
                    'Item Description', 'Ply / Qty', 'Per Carton / Total', 'Date', 'Actions'
                  ].map((title, i) => (
                    <th 
                      key={title}
                      style={{
                        color: isDark ? '#fbbf24' : isSand ? '#1c1917' : '#064e3b',
                        fontWeight: '900',
                        fontSize: '12px',
                        letterSpacing: '0.05em'
                      }}
                      className={`px-5 py-3.5 text-xs uppercase tracking-wider ${i === 8 ? 'text-right' : 'text-left'}`}
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody 
                style={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff'
                }}
                className="divide-y divide-gray-200 dark:divide-slate-700/60"
              >
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => handleViewQuote(quote.id)}
                    style={{
                      backgroundColor: selectedQuoteIds.includes(quote.id)
                        ? isDark ? 'rgba(212, 175, 55, 0.2)' : isSand ? '#f5ebd7' : '#dcfce7'
                        : isDark ? '#0f172a' : '#ffffff',
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
                    }}
                    className="transition cursor-pointer hover:opacity-90"
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedQuoteIds.includes(quote.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedQuoteIds(prev => [...prev, quote.id]);
                            preloadQuoteForCalculation(quote.id);
                          } else {
                            setSelectedQuoteIds(prev => prev.filter(id => id !== quote.id));
                          }
                        }}
                        className="w-4 h-4 cursor-pointer rounded"
                      />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-black">
                      <span 
                        style={{
                          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : isSand ? '#f5ebd7' : '#dcfce7',
                          color: isDark ? '#fbbf24' : isSand ? '#78350f' : '#064e3b',
                          border: '1.5px solid ' + (isDark ? '#fbbf24' : isSand ? '#78350f' : '#16a34a'),
                          fontWeight: '900'
                        }}
                        className="px-2.5 py-1 text-xs rounded-full font-black tracking-wide"
                      >
                        {quote.quote_no || `QT-${String(quote.id).padStart(5, '0')}`}
                      </span>
                    </td>
                    <td 
                      style={{
                        color: isDark ? '#ffffff' : '#000000',
                        fontWeight: '800',
                        fontSize: '14px'
                      }}
                      className="px-5 py-4 whitespace-nowrap"
                    >
                      {quote.customer_name}
                    </td>

                    {/* Originator / Prepared By Column */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      <span 
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#38bdf8' : '#0369a1',
                          border: '1.5px solid ' + (isDark ? '#0284c7' : '#0284c7'),
                          fontWeight: '800'
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs shadow-xs"
                      >
                        👤 {quote.originator_name || quote.prepared_by || 'Admin'}
                      </span>
                    </td>

                    {/* Product Details (Type & Print) Column */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs">
                      {quote.item_count > 1 ? (
                        <div>
                          <div style={{ color: isDark ? '#ffffff' : '#000000', fontWeight: '800' }}>
                            Multi-type
                          </div>
                          <span 
                            style={{
                              backgroundColor: isDark ? '#064e3b' : '#dcfce7',
                              color: isDark ? '#a7f3d0' : '#064e3b',
                              border: '1px solid ' + (isDark ? '#059669' : '#16a34a')
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold mt-0.5"
                          >
                            📑 {quote.item_count} Items
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div style={{ color: isDark ? '#ffffff' : '#000000', fontWeight: '800' }}>
                            {quote.carton_type || 'RSC'}
                          </div>
                          <div>
                            {quote.is_printed ? (
                              <span 
                                style={{
                                  backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
                                  color: isDark ? '#bfdbfe' : '#1e40af',
                                  border: '1px solid ' + (isDark ? '#2563eb' : '#3b82f6')
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                              >
                                🖨️ {quote.print_name ? `Printed (${quote.print_name})` : 'Printed'}
                              </span>
                            ) : (
                              <span 
                                style={{
                                  backgroundColor: isDark ? '#334155' : '#f1f5f9',
                                  color: isDark ? '#f1f5f9' : '#334155',
                                  border: '1px solid ' + (isDark ? '#475569' : '#94a3b8')
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                              >
                                📦 Plain
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td 
                      style={{
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontWeight: '700'
                      }}
                      className="px-5 py-4 whitespace-nowrap text-sm"
                    >
                      {quote.item_count > 1 ? (
                        <div>
                          <span style={{ color: isDark ? '#4ade80' : '#15803d', fontWeight: '800' }}>
                            📋 {quote.item_count} Items
                          </span>
                          <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' }}>Compiled Quote</div>
                        </div>
                      ) : (
                        <span>{getItemMainDescription(quote)}</span>
                      )}
                    </td>
                    <td 
                      style={{
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        fontWeight: '700'
                      }}
                      className="px-5 py-4 whitespace-nowrap"
                    >
                      {quote.item_count > 1 ? 'Multi-ply' : quote.ply_type} / <span style={{ color: isDark ? '#ffffff' : '#000000', fontWeight: '900' }}>{quote.quantity}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold">
                      {quote.item_count > 1 ? (
                        <span style={{ color: isDark ? '#fbbf24' : isSand ? '#78350f' : '#15803d', fontWeight: '900' }}>
                          Total: Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}
                        </span>
                      ) : (
                        <>
                          <span style={{ color: isDark ? '#e2e8f0' : '#1e293b', fontWeight: '700' }}>
                            Rs. {quote.final_cost_per_carton}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}
                          </span>
                          {' '}/ {' '}
                          <span style={{ color: isDark ? '#fbbf24' : isSand ? '#78350f' : '#15803d', fontWeight: '900' }}>
                            Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}
                          </span>
                        </>
                      )}
                    </td>
                    <td 
                      style={{
                        color: isDark ? '#cbd5e1' : '#334155',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                      className="px-5 py-4 whitespace-nowrap"
                    >
                      {new Date(quote.created_at).toLocaleDateString()}{' '}
                      {new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewQuote(quote.id)}
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                          color: isDark ? '#fbbf24' : isSand ? '#78350f' : '#15803d',
                          border: '1.5px solid ' + (isDark ? '#fbbf24' : isSand ? '#78350f' : '#15803d'),
                          fontWeight: '800'
                        }}
                        className="px-3 py-1.5 rounded-lg transition cursor-pointer text-xs shadow-2xs hover:scale-105"
                        title="View official quotation breakdown and print options"
                      >
                        📄 View Quotation
                      </button>
                      <button
                        onClick={() => handleViewCalculationLogic(quote.id)}
                        style={{
                          backgroundColor: isDark ? '#4c1d95' : '#ede9fe',
                          color: isDark ? '#ddd6fe' : '#6d28d9',
                          border: '1.5px solid ' + (isDark ? '#8b5cf6' : '#7c3aed'),
                          fontWeight: '800'
                        }}
                        className="px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs shadow-2xs hover:scale-105 inline-flex items-center gap-1"
                        title="Inspect step-by-step mathematical logic and working sheet for this quote"
                      >
                        <span>📐</span>
                        <span>Logic</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleLoadForCustomerEdit(quote)}
                          style={{
                            backgroundColor: isDark ? '#78350f' : '#fef3c7',
                            color: isDark ? '#ffffff' : '#92400e',
                            border: '1.5px solid ' + (isDark ? '#d97706' : '#d97706'),
                            fontWeight: '800'
                          }}
                          className="px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs shadow-2xs hover:scale-105"
                          title="Edit customer name in workspace (Admin only)"
                        >
                          ✏️ Edit Name
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteQuote(quote.id, quote.quote_no)}
                          style={{
                            backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
                            color: isDark ? '#ffffff' : '#b91c1c',
                            border: '1.5px solid ' + (isDark ? '#ef4444' : '#ef4444'),
                            fontWeight: '800'
                          }}
                          className="px-2.5 py-1.5 rounded-lg transition cursor-pointer text-xs shadow-2xs hover:scale-105"
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

      {/* BULK RENAME CUSTOMER MODAL */}
      {showBulkRenameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className={`rounded-3xl shadow-2xl max-w-lg w-full p-6 relative border max-h-[90vh] flex flex-col overflow-y-auto ${
            isDark ? 'bg-[#0f141e] text-white border-[#c5a880]/30' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc]'
          }`}>
            <button
              onClick={() => setShowBulkRenameModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:text-gray-300 dark:hover:text-white text-xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className={`text-lg font-black mb-1 flex items-center gap-2 ${isDark ? 'text-[#f5deb3]' : 'text-[#1a130b]'}`}>
              <span>✏️</span> Unify Customer Name ({selectedQuoteIds.length} Quotations)
            </h3>
            <p className="text-xs mb-4 opacity-80">
              Overwrites the customer name on all selected quotations to a single uniform customer name. Only Admin has authority to do this.
            </p>

            <div className={`p-3 rounded-xl border mb-4 text-xs ${
              isDark ? 'bg-slate-900/60 border-slate-700/60 text-slate-300' : 'bg-white border-gray-200 text-gray-700'
            }`}>
              <p className="font-bold mb-1">Selected Quotations to Rename:</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {quotes.filter(q => selectedQuoteIds.includes(q.id)).map(q => (
                  <span key={q.id} className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-amber-500/15 border border-amber-500/30 font-semibold">
                    {q.quote_no || `QT-${String(q.id).padStart(5, '0')}`}: <span className="opacity-90">{q.customer_name}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">
                Target Uniform Customer Name
              </label>
              <input
                type="text"
                list="bulk-customer-list"
                value={targetCustomerName}
                onChange={(e) => setTargetCustomerName(e.target.value)}
                placeholder="Type or select unique customer name"
                className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm font-semibold focus:outline-none ${
                  isDark ? 'bg-slate-800 border-amber-500/40 text-white' : 'bg-white border-amber-400 text-black'
                }`}
                autoFocus
              />
              <datalist id="bulk-customer-list">
                {customerList.map((c, idx) => (
                  <option key={idx} value={c} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBulkRenameModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkRenameLoading || !targetCustomerName.trim()}
                onClick={handleBulkRenameCustomer}
                style={{
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  border: '1.5px solid #1e40af'
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black shadow-md hover:opacity-90 cursor-pointer transition disabled:opacity-50"
              >
                {bulkRenameLoading ? 'Updating...' : `💾 Apply & Overwrite on ${selectedQuoteIds.length} Quote(s)`}
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
          onViewCalculationLogic={selectedQuote.id && !String(selectedQuote.id).startsWith('compiled-') ? () => handleViewCalculationLogic(selectedQuote.id) : null}
          theme={theme}
        />
      )}

    </div>
  );
}
