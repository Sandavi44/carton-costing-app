import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QuoteHistory({ setFormData, setCalculatedCost, setActiveTab, theme }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals / Action States
  const [actionPromptQuote, setActionPromptQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [reportTaxFormat, setReportTaxFormat] = useState('auto');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter States
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [lengthFilter, setLengthFilter] = useState('');
  const [widthFilter, setWidthFilter] = useState('');
  const [heightFilter, setHeightFilter] = useState('');

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';
  const isGreen = !isDark && !isSand;

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

  const [companyBanking, setCompanyBanking] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchBankingDetails = async () => {
    try {
      const response = await axios.get('/api/company/banking-details', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setCompanyBanking(response.data);
    } catch (err) {
      console.warn('Banking details restricted to authenticated internal users:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchBankingDetails();
  }, []);

  const handleDownloadSecurePdf = async (quoteId, taxFormat, displayQuoteNo) => {
    setPdfLoading(true);
    try {
      const response = await axios.post(
        `/api/quotes/${quoteId}/pdf-ticket`,
        { tax_format: taxFormat },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      if (response.data && response.data.download_url) {
        const downloadLink = document.createElement('a');
        downloadLink.href = response.data.download_url;
        downloadLink.setAttribute('download', `Quotation_${displayQuoteNo}.pdf`);
        downloadLink.target = '_blank';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        throw new Error('No download URL returned by server');
      }
    } catch (err) {
      alert('Failed to generate secure PDF: ' + (err.response?.data?.error || err.message));
    } finally {
      setPdfLoading(false);
    }
  };

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
        joining_cost: parseFloat(newFormData.joiningCost || 0),
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

  // Perform search filtering on full quote database client-side (checks Name or QT- Order No)
  const filteredQuotes = quotes.filter((quote) => {
    if (customerFilter) {
      const q = customerFilter.toLowerCase();
      const matchesName = quote.customer_name.toLowerCase().includes(q);
      const matchesNo = quote.quote_no?.toLowerCase().includes(q) || false;
      if (!matchesName && !matchesNo) {
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
      const parts = quote.dimensions.split('×');
      if (parts.length === 3) {
        const [l, w, h] = parts;
        if (lengthFilter && l !== lengthFilter) return false;
        if (widthFilter && w !== widthFilter) return false;
        if (heightFilter && h !== heightFilter) return false;
      } else {
        return false;
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
            placeholder="Search Name or Order No..."
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
        <div className={`overflow-x-auto rounded-2xl border ${
          isDark ? 'border-[#c5a880]/20' : isSand ? 'border-[#dfd5bc]' : 'border-[#bbf7d0]'
        }`}>
          <table className={`min-w-full divide-y ${
            isDark ? 'divide-[#c5a880]/20' : isSand ? 'divide-[#dfd5bc]' : 'divide-[#bbf7d0]'
          }`}>
            <thead className={isDark ? 'bg-[#131924]/80' : isSand ? 'bg-[#eae5d9]/30' : 'bg-[#eaf5ea]'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Order No.
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Customer
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Dimensions (L×W×H mm)
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Ply / Qty
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Per Carton / Total
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
                  Date
                </th>
                <th className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'}`}>
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
                    isDark ? 'hover:bg-[#1a2332]/60' : isSand ? 'hover:bg-[#faf8f5]' : 'hover:bg-[#eaf5ea]/50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-bold">
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
                  <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                    isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                  }`}>
                    {quote.customer_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap font-mono text-sm ${
                    isDark ? 'text-slate-300' : isSand ? 'text-[#6b5940]' : 'text-gray-700'
                  }`}>
                    {quote.dimensions}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    isDark ? 'text-slate-300' : isSand ? 'text-[#6b5940]' : 'text-gray-700'
                  }`}>
                    {quote.ply_type} / <span className={`font-semibold ${
                      isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                    }`}>{quote.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    Rs. {quote.final_cost_per_carton}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''} / <span className={
                      isDark ? "text-[#d4af37]" : isSand ? "text-[#8c734b]" : "text-[#15803d]"
                    }>Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-xs ${
                    isDark ? 'text-slate-400' : isSand ? 'text-[#8c734b]/80' : 'text-[#166534]/80'
                  }`}>
                    {new Date(quote.created_at).toLocaleDateString()}{' '}
                    {new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
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
                    <button
                      onClick={() => handleDeleteQuote(quote.id, quote.quote_no)}
                      className="font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60"
                      title="Delete Quote"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <button
                onClick={() => handleDeleteQuote(actionPromptQuote.id, actionPromptQuote.quote_no)}
                className="w-full font-bold py-2.5 rounded-2xl transition block text-sm text-center cursor-pointer hover:scale-[1.01] border text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60"
              >
                🗑️ Delete Quote
              </button>
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
      {selectedQuote && (() => {
        const isVatCustomer = reportTaxFormat === 'vat' || 
          (reportTaxFormat === 'auto' && (!selectedQuote.tax_type || !selectedQuote.tax_type.includes('Non-VAT')));

        // Unit price rounded off to nearest 25 cents (0.25)
        const rawUnitPrice = parseFloat(selectedQuote.final_cost_per_carton || 0);
        const unitPrice = Math.round(rawUnitPrice * 4) / 4;
        const qty = parseInt(selectedQuote.quantity || 0, 10);
        const cartonAmount = unitPrice * qty;

        // Special One-Time Costs
        const dieCost = parseFloat(selectedQuote.die_making_cost || 0);
        const blockCost = parseFloat(selectedQuote.block_making_cost || 0);
        const oneTimeTransport = parseFloat(selectedQuote.one_time_transport_cost || 0);

        // Subtotal is sum of carton order amount + any optional one-time charges
        const subtotalAmount = cartonAmount + dieCost + blockCost + oneTimeTransport;
        const vatAmount = subtotalAmount * 0.18;
        const totalAmount = isVatCustomer ? (subtotalAmount + vatAmount) : subtotalAmount;

        const displayDate = (() => {
          if (!selectedQuote?.created_at) return new Date().toLocaleDateString('en-GB');
          if (typeof selectedQuote.created_at === 'string' && selectedQuote.created_at.includes('/')) {
            return selectedQuote.created_at;
          }
          try {
            return new Date(selectedQuote.created_at).toLocaleDateString('en-GB');
          } catch (e) {
            return String(selectedQuote.created_at);
          }
        })();

        const dimUnit = selectedQuote.dimension_unit || 'mm';
        const hasInputs = selectedQuote.carton_length_input && selectedQuote.carton_width_input && selectedQuote.carton_height_input;

        let dimStr;
        if (dimUnit === 'inches') {
          if (hasInputs) {
            dimStr = `${selectedQuote.carton_length_input}×${selectedQuote.carton_width_input}×${selectedQuote.carton_height_input} inches`;
          } else {
            const lIn = (selectedQuote.carton_length_mm / 25.4).toFixed(2).replace(/\.00$/, '');
            const wIn = (selectedQuote.carton_width_mm / 25.4).toFixed(2).replace(/\.00$/, '');
            const hIn = (selectedQuote.carton_height_mm / 25.4).toFixed(2).replace(/\.00$/, '');
            dimStr = `${lIn}×${wIn}×${hIn} inches`;
          }
        } else {
          const lMm = Math.round(selectedQuote.carton_length_mm || selectedQuote.dimensions?.length_mm || 0);
          const wMm = Math.round(selectedQuote.carton_width_mm || selectedQuote.dimensions?.width_mm || 0);
          const hMm = Math.round(selectedQuote.carton_height_mm || selectedQuote.dimensions?.height_mm || 0);
          dimStr = `${lMm}×${wMm}×${hMm} mm`;
        }

        const plyStr = selectedQuote.ply_type ? `${selectedQuote.ply_type.replace('-', ' ')} Carton` : 'Carton';
        const typeStr = selectedQuote.carton_type ? `${selectedQuote.carton_type} Type` : 'RSC Type';
        const descStr = `${dimStr} - ${plyStr} - ${typeStr}`;
        const displayQuoteNo = selectedQuote.quote_no || `QT-${String(selectedQuote.id).padStart(5, '0')}`;

        // Flute and Board Formatting (no flute factor)
        const formatFluteName = (f) => {
          if (!f) return '';
          return f.replace(/-Flute/i, ' flute').replace(/Flute/i, 'flute');
        };
        const fluteDisplay = (() => {
          const f1 = formatFluteName(selectedQuote.flute_type);
          const f2 = selectedQuote.ply_type === '5-Ply' && selectedQuote.flute_type_2 && selectedQuote.flute_type_2 !== selectedQuote.flute_type
            ? formatFluteName(selectedQuote.flute_type_2)
            : null;
          return f2 ? `${f1} / ${f2}` : (f1 || 'B flute');
        })();
        // Board Formatting
        const formatBoardName = (b) => {
          if (!b) return 'Brown Liner';
          if (b.toLowerCase().includes('white')) return 'White Liner';
          if (b.toLowerCase().includes('brown')) return 'Brown Liner';
          return b;
        };
        const boardDisplay = formatBoardName(selectedQuote.board_type);
        const paymentMethodDisplay = selectedQuote.payment_method || 'Credit - 30 Days';

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
            {/* Inline Print Styles: Forces clean 1-Page Quotation */}
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 14mm;
                }
                html, body {
                  height: auto !important;
                  overflow: visible !important;
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                /* Hide everything in the background so it takes 0 height */
                .quote-history-main-content,
                .no-print-zone,
                nav,
                header,
                footer {
                  display: none !important;
                }
                /* Reset modal wrapper so it doesn't create extra pages */
                .fixed.inset-0 {
                  position: static !important;
                  inset: auto !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                  display: block !important;
                }
                .max-w-3xl {
                  max-width: 100% !important;
                  width: 100% !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: transparent !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                .overflow-y-auto {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                  padding: 0 !important;
                }
                /* The Printable Quotation Sheet: Single Page, Natural Flow */
                #printable-quotation-sheet {
                  position: static !important;
                  width: 100% !important;
                  margin: 0 auto !important;
                  padding: 10px 15px !important;
                  background: white !important;
                  color: #111827 !important;
                  border: none !important;
                  box-shadow: none !important;
                  min-height: auto !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                }
              }
            `}</style>

            <div className={`rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-6 relative border flex flex-col max-h-[94vh] ${
              isDark ? 'bg-[#0f141e] text-white border-[#c5a880]/30 shadow-black/60' : 'bg-[#fcfaf7] text-[#2d2417] border-[#dfd5bc]'
            }`}>
              {/* Modal Header Bar with Format Switcher & Close button */}
              <div className="no-print-zone flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3 shrink-0 border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <h3 className={`text-base sm:text-lg font-black leading-tight ${isDark ? 'text-[#f5deb3]' : 'text-[#1a130b]'}`}>
                      Official Quotation Preview
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{displayQuoteNo}</span>
                  </div>
                </div>

                {/* Tax format toggle pills */}
                <div className="flex items-center bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
                  <span className="px-2 text-gray-500 dark:text-gray-400 hidden sm:inline">Format:</span>
                  <button
                    type="button"
                    onClick={() => setReportTaxFormat('auto')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      reportTaxFormat === 'auto'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                    }`}
                    title="Auto-detect from saved quote tax setting"
                  >
                    Auto ({isVatCustomer ? 'VAT' : 'Non-VAT'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTaxFormat('vat')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      reportTaxFormat === 'vat'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    VAT (18%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportTaxFormat('non-vat')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      reportTaxFormat === 'non-vat'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Non-VAT
                  </button>
                </div>

                <button
                  onClick={() => setSelectedQuote(null)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Document Area (The Printed Quotation Sheet) */}
              <div className="overflow-y-auto flex-1 pr-1">
                <div 
                  id="printable-quotation-sheet"
                  className="bg-white text-gray-900 border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[480px] print:min-h-0 print:border-none print:shadow-none"
                >
                  {/* Top Company Header & Quotation Title */}
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-gray-200">
                      {/* Left: 3D Packaging Cube Logo + Company Details */}
                      <div className="flex items-center gap-3.5">
                        <svg className="w-14 h-14 shrink-0 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Top facet - Forest Green */}
                          <polygon points="24,5 43,15.5 24,26 5,15.5" fill="#15803d" stroke="#ffffff" strokeWidth="0.75" />
                          {/* Left facet - Deep Red / Crimson */}
                          <polygon points="5,15.5 24,26 24,42 5,31.5" fill="#b91c1c" stroke="#ffffff" strokeWidth="0.75" />
                          {/* Right facet - Royal Blue */}
                          <polygon points="24,26 43,15.5 43,31.5 24,42" fill="#1d4ed8" stroke="#ffffff" strokeWidth="0.75" />
                          {/* Subtle tape line */}
                          <line x1="24" y1="5" x2="24" y2="26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="2 1" />
                        </svg>
                        <div>
                          <h2 className="text-base sm:text-lg font-black tracking-wide text-gray-900 uppercase font-sans leading-tight">
                            {isVatCustomer ? 'CHELSY PACKAGING SOLUTIONS (PVT) LTD.' : 'CHELSY PACKAGING PVT LTD'}
                          </h2>
                          <p className="text-xs text-gray-600 font-medium leading-relaxed mt-0.5">
                            No 234/1/A, Siyambalape South, Siyambalape, Biyagama.
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            +94 0112 487486
                          </p>
                        </div>
                      </div>

                      {/* Right: Quotation Title */}
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-wider">
                          Quotation
                        </h1>
                        <span className={`inline-block px-2.5 py-0.5 mt-1 text-[11px] font-bold rounded-full uppercase tracking-wider ${
                          isVatCustomer ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isVatCustomer ? 'VAT Customer' : 'Non-VAT Customer'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata: Date, Quote No, Customer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs sm:text-sm border-b border-gray-200">
                      <div>
                        <div className="flex gap-2">
                          <span className="font-bold text-gray-700 min-w-18">Customer:</span>
                          <span className="font-bold text-gray-900">{selectedQuote.customer_name}</span>
                        </div>
                      </div>
                      <div className="sm:text-right space-y-1">
                        <div className="flex sm:justify-end gap-2">
                          <span className="font-bold text-gray-700">Date:</span>
                          <span className="font-semibold text-gray-900">{displayDate}</span>
                        </div>
                        <div className="flex sm:justify-end gap-2">
                          <span className="font-bold text-gray-700">Quotation Number:</span>
                          <span className="font-bold text-gray-900 font-mono">{displayQuoteNo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quotation Table */}
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100 text-gray-800 border-b border-gray-300 font-bold">
                            <th className="py-2.5 px-3 text-center border-r border-gray-300 w-12">S.N</th>
                            <th className="py-2.5 px-4 text-left border-r border-gray-300">Description</th>
                            <th className="py-2.5 px-3 text-right border-r border-gray-300 w-24">QTY</th>
                            <th className="py-2.5 px-3 text-center border-r border-gray-300 w-16">Unit</th>
                            <th className="py-2.5 px-3 text-right border-r border-gray-300 w-24">Price</th>
                            <th className="py-2.5 px-4 text-right w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let sNo = 1;
                            return (
                              <>
                                <tr className="border-b border-gray-200 hover:bg-gray-50/50">
                                  <td className="py-3 px-3 text-center font-medium text-gray-600 border-r border-gray-300">{sNo}</td>
                                  <td className="py-3 px-4 font-semibold text-gray-900 border-r border-gray-300">
                                    <div>{descStr}</div>
                                    <div className="text-[11px] text-gray-600 font-normal mt-1 space-y-0.5">
                                      <div><span className="font-semibold text-gray-700">Flute Type:</span> {fluteDisplay}</div>
                                      <div><span className="font-semibold text-gray-700">Board Type:</span> {boardDisplay}</div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold text-gray-900 border-r border-gray-300">
                                    {qty.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 text-center text-gray-700 border-r border-gray-300">
                                    Nos
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-300">
                                    {unitPrice.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                    {cartonAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>

                                {dieCost > 0 && (() => {
                                  sNo++;
                                  return (
                                    <tr className="border-b border-gray-200 hover:bg-gray-50/50">
                                      <td className="py-2.5 px-3 text-center font-medium text-gray-600 border-r border-gray-300">{sNo}</td>
                                      <td className="py-2.5 px-4 font-semibold text-gray-900 border-r border-gray-300">
                                        <div>Die Making Cost</div>
                                        <div className="text-[11px] text-gray-500 font-normal">As a One time cost</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-semibold text-gray-900 border-r border-gray-300">1</td>
                                      <td className="py-2.5 px-3 text-center text-gray-700 border-r border-gray-300">Nos</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-300">
                                        {dieCost.toFixed(2)}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                                        {dieCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })()}

                                {blockCost > 0 && (() => {
                                  sNo++;
                                  return (
                                    <tr className="border-b border-gray-200 hover:bg-gray-50/50">
                                      <td className="py-2.5 px-3 text-center font-medium text-gray-600 border-r border-gray-300">{sNo}</td>
                                      <td className="py-2.5 px-4 font-semibold text-gray-900 border-r border-gray-300">
                                        <div>Block Making Cost</div>
                                        <div className="text-[11px] text-gray-500 font-normal">As a One time cost</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-semibold text-gray-900 border-r border-gray-300">1</td>
                                      <td className="py-2.5 px-3 text-center text-gray-700 border-r border-gray-300">Nos</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-300">
                                        {blockCost.toFixed(2)}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                                        {blockCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })()}

                                {oneTimeTransport > 0 && (() => {
                                  sNo++;
                                  return (
                                    <tr className="border-b border-gray-200 hover:bg-gray-50/50">
                                      <td className="py-2.5 px-3 text-center font-medium text-gray-600 border-r border-gray-300">{sNo}</td>
                                      <td className="py-2.5 px-4 font-semibold text-gray-900 border-r border-gray-300">
                                        <div>Transport Cost</div>
                                        <div className="text-[11px] text-gray-500 font-normal">Fixed order delivery transport charge</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-semibold text-gray-900 border-r border-gray-300">1</td>
                                      <td className="py-2.5 px-3 text-center text-gray-700 border-r border-gray-300">Trip</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-300">
                                        {oneTimeTransport.toFixed(2)}
                                      </td>
                                      <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900">
                                        {oneTimeTransport.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Summary Breakdown */}
                    <div className="mt-5 flex justify-end">
                      <div className="w-full sm:w-72 space-y-1.5 text-xs sm:text-sm">
                        {isVatCustomer ? (
                          <>
                            <div className="flex justify-between py-1 text-gray-700 border-b border-gray-100">
                              <span className="font-semibold">Sub Total:</span>
                              <span className="font-mono font-bold">
                                Rs. {subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 text-gray-700 border-b border-gray-100">
                              <span className="font-semibold">Vat - 18%:</span>
                              <span className="font-mono font-bold">
                                Rs. {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 text-base font-black text-gray-900 border-t-2 border-b-2 border-gray-900 mt-1">
                              <span>Total:</span>
                              <span className="font-mono">
                                Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between py-2 text-base font-black text-gray-900 border-t-2 border-b-2 border-gray-900">
                            <span>Total:</span>
                            <span className="font-mono">
                              Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Document Footer Notes & Signatures */}
                  <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div className="space-y-2">
                      <p className="font-bold text-gray-800 text-sm">
                        {isVatCustomer ? 'Chelsy Packaging Solutions (Pvt) Ltd.' : 'Chelsy Packaging Pvt Ltd'}
                      </p>
                      
                      {/* Special Conditions / Terms */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-w-md space-y-1">
                        <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider mb-1">Terms & Conditions:</p>
                        <p className="text-xs text-black flex items-start gap-1.5 font-bold">
                          <span className="font-black text-black">1. Payment Method:</span>
                          <span className="font-black text-black">{paymentMethodDisplay}</span>
                        </p>
                        <p className="text-[11px] text-gray-600 flex items-start gap-1.5">
                          <span className="font-semibold text-gray-700">2. Quotation Validity:</span>
                          <span className="font-normal text-gray-700">14 days from quote date.</span>
                        </p>
                        <p className="text-[11px] text-gray-600 flex items-start gap-1.5">
                          <span className="font-semibold text-gray-700">3. Delivery Timeline:</span>
                          <span className="font-normal text-gray-700">7-10 working days upon confirmed Purchase Order.</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Bank Account Details (Marked Area) + Authorized Signature */}
                    <div className="flex flex-col items-start sm:items-end justify-between gap-4 w-full sm:w-auto">
                        {/* Bank Account Details Box */}
                        <div className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 sm:p-3 text-left w-full sm:w-64 text-[11px] shadow-xs">
                          <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1 border-b border-gray-200 pb-1">
                            <span>🏦</span> Bank Account Details
                          </p>
                          {(() => {
                            const bankInfo = isVatCustomer ? companyBanking?.vat : companyBanking?.non_vat;
                            if (!bankInfo) {
                              return (
                                <div className="py-2 text-gray-500 italic text-[10px]">
                                  Loading authenticated banking details...
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-0.5 text-gray-800 text-[11px]">
                                <p className="flex justify-between gap-2">
                                  <span className="font-semibold text-gray-700">A/C No:</span>
                                  <span className="font-mono font-bold text-black text-xs">{bankInfo.account_no}</span>
                                </p>
                                <p className="flex justify-between gap-2">
                                  <span className="font-semibold text-gray-700">A/C Name:</span>
                                  <span className="font-medium text-gray-900 text-right">{bankInfo.account_name}</span>
                                </p>
                                <p className="flex justify-between gap-2">
                                  <span className="font-semibold text-gray-700">Bank / Branch:</span>
                                  <span className="font-medium text-gray-900 text-right">{bankInfo.bank_branch}</span>
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                      {/* Signature line */}
                      <div className="text-left sm:text-right w-full sm:w-auto pt-1">
                        <div className="w-48 sm:ml-auto border-b border-gray-400 mb-1"></div>
                        <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Authorized Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons: Delete Quote, Save as PDF, Print Quotation, Close */}
              <div className="no-print-zone mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteQuote(selectedQuote.id, selectedQuote.quote_no)}
                  className="font-bold py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60 text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>🗑️</span> Delete Quote
                </button>
                <button
                  type="button"
                  disabled={pdfLoading}
                  onClick={() => handleDownloadSecurePdf(selectedQuote.id, reportTaxFormat, displayQuoteNo)}
                  className={`font-black py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:scale-[1.01] ${pdfLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  title="Generate flattened, signed PDF via secure short-lived token"
                >
                  {pdfLoading ? (
                    <>
                      <span className="animate-spin">⏳</span> Generating...
                    </>
                  ) : (
                    <>
                      <span>🔒</span> Save as PDF
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prevTitle = document.title;
                    document.title = `Quotation_${displayQuoteNo}_${(selectedQuote.customer_name || 'Customer').replace(/\s+/g, '_')}`;
                    window.print();
                    setTimeout(() => { document.title = prevTitle; }, 1000);
                  }}
                  className="font-black py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer text-white bg-blue-600 hover:bg-blue-700 border-blue-700 shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:scale-[1.01]"
                >
                  <span>🖨️</span> Print Quotation
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  style={{
                    backgroundColor: isDark ? '#1a2332' : '#2d2417',
                    color: '#ffffff'
                  }}
                  className="font-extrabold py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer hover:opacity-90 shadow-md text-xs sm:text-sm text-white flex items-center justify-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
