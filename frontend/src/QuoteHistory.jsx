import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QuoteHistory({ setFormData, setCalculatedCost, setActiveTab, theme }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals / Action States
  const [actionPromptQuote, setActionPromptQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter States
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [lengthFilter, setLengthFilter] = useState('');
  const [widthFilter, setWidthFilter] = useState('');
  const [heightFilter, setHeightFilter] = useState('');

  const isDark = theme === 'dark';

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
        boardType: quote.board_type || 'Whitecut',
        fluteType: quote.flute_type || 'B-Flute',
        fluteType2: quote.flute_type_2 || quote.flute_type || 'B-Flute',
        productionMethod: quote.production_method || 'In-house',
        joiningType: quote.joining_type || 'Glued',
        isPrinted: quote.is_printed || false,
        whiteLinerRate: quote.board_type === 'Whitecut' ? (quote.white_liner_rate || '') : '',
        brownLinerRate: quote.board_type !== 'Whitecut' ? (quote.brown_liner_rate || '') : '',
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

  // Luxurious Enterprise Type Shell Styles
  const inputClass = `px-3.5 py-1.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#c5a880]/40 focus:border-[#d4af37] ${
    isDark 
      ? 'bg-[#1a2332] border-[#c5a880]/20 text-[#e2d4c0] placeholder-slate-500' 
      : 'bg-[#fcfbfa] border-[#dfd5bc] text-[#5c4c36] placeholder-[#b8b09b]'
  }`;

  return (
    <div className={`rounded-3xl shadow-2xl p-8 transition-colors duration-300 text-left relative border ${
      isDark ? 'bg-[#0f141e]/90 text-white border-[#c5a880]/20 shadow-black/50' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#e8dfc7] shadow-xl'
    }`}>
      {/* Loading Overlay */}
      {actionLoading && (
        <div className={`absolute inset-0 flex items-center justify-center z-50 rounded-3xl ${
          isDark ? 'bg-[#0c0f17]/80 backdrop-blur-xs' : 'bg-[#faf8f5]/80 backdrop-blur-xs'
        }`}>
          <p className={`font-semibold animate-pulse text-lg ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Syncing costing workspace...</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
          <span>📜</span> Quote History
        </h2>
        <button
          onClick={fetchHistory}
          className={`font-semibold px-4 py-2 rounded-lg transition text-sm cursor-pointer shadow-xs border ${
            isDark 
              ? 'bg-[#1a2332] border-[#c5a880]/25 text-[#d4af37] hover:bg-slate-700' 
              : 'bg-[#faf8f5] border-[#dfd5bc] text-[#8c734b] hover:bg-[#eae5d9]/40'
          }`}
        >
          🔄 Refresh
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className={`p-5 rounded-3xl border mb-6 ${
        isDark ? 'bg-[#131924]/90 border-[#c5a880]/15' : 'bg-[#faf8f5]/90 border-[#dfd5bc]'
      }`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>🔍 Filter & Search History</h4>
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
        <div className="overflow-x-auto rounded-2xl border dark:border-[#c5a880]/20">
          <table className="min-w-full divide-y dark:divide-[#c5a880]/20 divide-[#dfd5bc]">
            <thead className={isDark ? 'bg-[#131924]/80' : 'bg-[#eae5d9]/30'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Order No.
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Customer
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Dimensions (L×W×H mm)
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Ply / Qty
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Per Carton / Total
                </th>
                <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Date
                </th>
                <th className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'bg-[#131924]/40 divide-[#c5a880]/15' : 'bg-white divide-[#dfd5bc]'}`}>
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() => handleRowClick(quote.id)}
                  className={`transition cursor-pointer ${isDark ? 'hover:bg-[#1a2332]/60' : 'hover:bg-[#faf8f5]'}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-bold">
                    <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                      isDark ? 'bg-[#d4af37]/25 text-[#d4af37]' : 'bg-[#9f8150]/15 text-[#8c734b]'
                    }`}>
                      {quote.quote_no || `QT-${String(quote.id).padStart(5, '0')}`}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap font-medium ${isDark ? 'text-white' : 'text-[#5c4c36]'}`}>
                    {quote.customer_name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap font-mono text-sm ${isDark ? 'text-slate-300' : 'text-[#6b5940]'}`}>
                    {quote.dimensions}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-[#6b5940]'}`}>
                    {quote.ply_type} / <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#5c4c36]'}`}>{quote.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    Rs. {quote.final_cost_per_carton}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''} / <span className={isDark ? "text-[#d4af37]" : "text-[#8c734b]"}>Rs. {quote.total_cost_batch}{quote.tax_type && !quote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-xs ${isDark ? 'text-slate-400' : 'text-[#8c734b]/80'}`}>
                    {new Date(quote.created_at).toLocaleDateString()}{' '}
                    {new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHOICE PROMPT MODAL */}
      {actionPromptQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl shadow-2xl max-w-md w-full p-6 relative border ${
            isDark ? 'bg-[#0f141e] text-white border-[#c5a880]/30' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc]'
          }`}>
            <button
              onClick={() => setActionPromptQuote(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>Quote Choices ({actionPromptQuote.quote_no || `QT-${String(actionPromptQuote.id).padStart(5, '0')}`})</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>
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
                onClick={() => setActionPromptQuote(null)}
                className={`w-full font-semibold py-2.5 rounded-2xl transition block text-xs text-center cursor-pointer border ${
                  isDark ? 'bg-slate-900 text-slate-400 hover:bg-slate-950' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl shadow-2xl max-w-lg w-full p-8 relative border ${
            isDark ? 'bg-[#0f141e] text-white border-[#c5a880]/30 shadow-black/50' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc]'
          }`}>
            <button
              onClick={() => setSelectedQuote(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
            <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${isDark ? 'text-[#d4af37] border-[#c5a880]/20' : 'text-[#8c734b] border-[#dfd5bc]'}`}>
              📄 Quote Details ({selectedQuote.quote_no || `QT-${String(selectedQuote.id).padStart(5, '0')}`})
            </h3>

            <div className={`space-y-3 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Customer:</span>
                <span>{selectedQuote.customer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Length:</span>
                <span>{selectedQuote.dimensions.length_mm} mm</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Width:</span>
                <span>{selectedQuote.dimensions.width_mm} mm</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Height:</span>
                <span>{selectedQuote.dimensions.height_mm} mm</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Ply Type:</span>
                <span>{selectedQuote.ply_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Board Type:</span>
                <span>{selectedQuote.board_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Flute Type:</span>
                <span>
                  {selectedQuote.ply_type === '5-Ply'
                    ? `${selectedQuote.flute_type || 'B-Flute'} & ${selectedQuote.flute_type_2 || selectedQuote.flute_type || 'B-Flute'}`
                    : (selectedQuote.flute_type || 'B-Flute')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Production Method:</span>
                <span>{selectedQuote.production_method || 'In-house'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold">Quantity:</span>
                <span>{selectedQuote.quantity}</span>
              </div>

              {selectedQuote.sheet_dimensions && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 text-blue-500 font-semibold mt-2">
                    <span>Sheet Size:</span>
                    <span>{selectedQuote.sheet_dimensions.sheet_length_mm}×{selectedQuote.sheet_dimensions.sheet_width_mm} mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 text-blue-500">
                    <span>Optimal Reel Width:</span>
                    <span>{selectedQuote.sheet_dimensions.selected_reel_mm} mm</span>
                  </div>
                  {selectedQuote.sheet_dimensions.sheets_per_reel !== undefined && (
                    <>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 text-blue-500">
                        <span>Sheets cut from Reel:</span>
                        <span>{selectedQuote.sheet_dimensions.sheets_per_reel}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-700 text-blue-500">
                        <span>Leftover Reel Waste:</span>
                        <span>{selectedQuote.sheet_dimensions.reel_waste_mm} mm</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Financial parameters */}
              <div className={`p-4 rounded-2xl border mt-4 space-y-2 text-xs ${
                isDark ? 'bg-[#1a2332] border-[#c5a880]/20 text-slate-100' : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36]'
              }`}>
                <div className={`flex justify-between font-semibold ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
                  <span>Invoice Value (Qty * Price):</span>
                  <span>Rs. {(selectedQuote.final_cost_per_carton * selectedQuote.quantity).toFixed(2)}{selectedQuote.tax_type && !selectedQuote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                </div>
                <div className={`flex justify-between font-semibold ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
                  <span>Total RM Cost (RM Cost * Qty):</span>
                  <span>Rs. {((selectedQuote.rm_cost_per_carton || 0) * selectedQuote.quantity).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${isDark ? 'text-white' : 'text-[#5c4c36]'}`}>
                  <span>Net Profit (Profit Amount * Qty):</span>
                  <span>Rs. {((selectedQuote.profit_per_carton || 0) * selectedQuote.quantity).toFixed(2)}</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: isDark ? '#1a2332' : '#8c734b',
                  color: isDark ? '#e2d4c0' : '#ffffff'
                }}
                className={`mt-6 rounded-2xl p-5 shadow-xs border ${
                  isDark 
                    ? 'bg-[#1a2332] text-[#e2d4c0] bg-gradient-to-r from-[#1a2332] to-[#131924] border-[#c5a880]/30' 
                    : 'bg-[#8c734b] text-white bg-gradient-to-r from-[#8c734b] to-[#5c4c36] border-[#dfd5bc]'
                }`}
              >
                <div className="flex justify-between mb-2">
                  <span className="opacity-95">Cost per Carton:</span>
                  <span className="text-xl font-bold">Rs. {selectedQuote.final_cost_per_carton}{selectedQuote.tax_type && !selectedQuote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-95">Total Batch Cost:</span>
                  <span className="text-xl font-bold">Rs. {selectedQuote.total_cost_batch}{selectedQuote.tax_type && !selectedQuote.tax_type.includes('Non-VAT') ? ' + VAT' : ''}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedQuote(null)}
              className={`mt-6 w-full font-bold py-3 rounded-2xl border transition cursor-pointer ${
                isDark 
                  ? 'bg-[#1a2332] border-[#c5a880]/30 text-[#d4af37] hover:bg-slate-700' 
                  : 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36] hover:bg-[#eae5d9]/40'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
