import React, { useState, useEffect } from 'react';

export default function OfficialQuotationModal({ quote, onClose, onDelete, theme = 'green' }) {
  const [reportTaxFormat, setReportTaxFormat] = useState('auto');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';

  const cleanOverlays = () => {
    document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach(el => el.remove());
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanOverlays();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!quote) return null;

  const isVatCustomer = reportTaxFormat === 'vat' || 
    (reportTaxFormat === 'auto' && (!quote.tax_type || !quote.tax_type.includes('Non-VAT')));

  // Special One-Time Costs
  const dieCost = parseFloat(quote.die_making_cost || 0);
  const blockCost = parseFloat(quote.block_making_cost || 0);
  const oneTimeTransport = parseFloat(quote.one_time_transport_cost || 0);

  const displayDate = (() => {
    if (!quote?.created_at) return new Date().toLocaleDateString('en-GB');
    if (typeof quote.created_at === 'string' && quote.created_at.includes('/')) {
      return quote.created_at;
    }
    try {
      return new Date(quote.created_at).toLocaleDateString('en-GB');
    } catch (e) {
      return String(quote.created_at);
    }
  })();

  const displayQuoteNo = quote.quote_no || (quote.id ? `QT-${String(quote.id).padStart(5, '0')}` : 'QT-NEW');
  const paymentMethodDisplay = quote.payment_method || 'Credit - 30 Days';

  // Format individual item row
  const formatItemRow = (item) => {
    const dimUnit = item.dimension_unit || item.dimensionUnit || quote.dimension_unit || 'mm';
    const isSF = (item.carton_type || item.cartonType) === 'S.F.';
    const isPrinted = Boolean(item.is_printed !== undefined ? item.is_printed : item.isPrinted);
    const plyType = item.ply_type || item.plyType || '3-Ply';
    const cartonType = item.carton_type || item.cartonType || 'RSC';

    let dimStr = item.dimensions;
    if (!dimStr) {
      if (isSF) {
        if (dimUnit === 'inches') {
          const lIn = item.die_length_input || item.dieLengthInput || (item.die_length_mm ? (item.die_length_mm / 25.4).toFixed(2).replace(/\.00$/, '') : (item.dieLength ? (item.dieLength / 25.4).toFixed(2).replace(/\.00$/, '') : '0'));
          const wIn = item.die_width_input || item.dieWidthInput || (item.die_width_mm ? (item.die_width_mm / 25.4).toFixed(2).replace(/\.00$/, '') : (item.dieWidth ? (item.dieWidth / 25.4).toFixed(2).replace(/\.00$/, '') : '0'));
          dimStr = `${lIn}×${wIn} inches`;
        } else {
          const lMm = Math.round(item.die_length_mm || item.dieLength || 0);
          const wMm = Math.round(item.die_width_mm || item.dieWidth || 0);
          dimStr = `${lMm}×${wMm} mm`;
        }
      } else {
        const hasInputs = (item.carton_length_input || item.cartonLengthInput) && (item.carton_width_input || item.cartonWidthInput) && (item.carton_height_input || item.cartonHeightInput);
        if (dimUnit === 'inches') {
          if (hasInputs) {
            dimStr = `${item.carton_length_input || item.cartonLengthInput}×${item.carton_width_input || item.cartonWidthInput}×${item.carton_height_input || item.cartonHeightInput} inches`;
          } else {
            const lIn = ((item.carton_length_mm || item.cartonLength || 0) / 25.4).toFixed(2).replace(/\.00$/, '');
            const wIn = ((item.carton_width_mm || item.cartonWidth || 0) / 25.4).toFixed(2).replace(/\.00$/, '');
            const hIn = ((item.carton_height_mm || item.cartonHeight || 0) / 25.4).toFixed(2).replace(/\.00$/, '');
            dimStr = `${lIn}×${wIn}×${hIn} inches`;
          }
        } else {
          const lMm = Math.round(item.carton_length_mm || item.cartonLength || item.dimensions?.length_mm || 0);
          const wMm = Math.round(item.carton_width_mm || item.cartonWidth || item.dimensions?.width_mm || 0);
          const hMm = Math.round(item.carton_height_mm || item.cartonHeight || item.dimensions?.height_mm || 0);
          dimStr = `${lMm}×${wMm}×${hMm} mm`;
        }
      }
    }

    const plyClean = plyType.replace('-', ' ');
    let descStr = item.description;
    if (!descStr) {
      if (isSF) {
        const isSheet = plyType === '2-Ply' || plyType === '4-Ply';
        const productNoun = isSheet ? (isPrinted ? 'Printed Sheet' : 'Sheet') : (isPrinted ? 'Printed Boards' : 'Boards');
        descStr = `${dimStr} - ${plyClean} ${productNoun} - S.F.`;
      } else {
        const productNoun = isPrinted ? 'Printed Carton' : 'Carton';
        const typeStr = cartonType ? `${cartonType} Type` : 'RSC Type';
        descStr = `${dimStr} - ${plyClean} ${productNoun} - ${typeStr}`;
      }
    }

    const formatFluteName = (f) => {
      if (!f) return '';
      return f.replace(/-Flute/i, ' flute').replace(/Flute/i, 'flute');
    };
    const f1 = formatFluteName(item.flute_type || item.fluteType);
    const f2 = (plyType === '5-Ply' && (item.flute_type_2 || item.fluteType2) && (item.flute_type_2 || item.fluteType2) !== (item.flute_type || item.fluteType))
      ? formatFluteName(item.flute_type_2 || item.fluteType2)
      : null;
    const fluteDisplay = f2 ? `${f1} / ${f2}` : (f1 || 'B flute');

    const formatBoardName = (b) => {
      if (!b) return 'Brown Liner';
      if (b.toLowerCase().includes('white')) return 'White Liner';
      if (b.toLowerCase().includes('brown')) return 'Brown Liner';
      return b;
    };
    const boardDisplay = formatBoardName(item.board_type || item.boardType);

    const rawUnitPrice = parseFloat(item.final_cost_per_carton || item.finalCostPerCarton || 0);
    const unitPrice = Math.round(rawUnitPrice * 4) / 4;
    const qty = parseInt(item.quantity || 0, 10);
    const cartonAmount = unitPrice * qty;

    return {
      descStr,
      fluteDisplay,
      boardDisplay,
      qty,
      unitPrice,
      cartonAmount
    };
  };

  // Compile item rows
  const rawItemsList = (quote.items && Array.isArray(quote.items) && quote.items.length > 0)
    ? quote.items
    : [quote];

  const parsedItems = rawItemsList.map(item => formatItemRow(item));
  const totalCartonsAmount = parsedItems.reduce((acc, it) => acc + it.cartonAmount, 0);

  // Subtotal is sum of all carton line amounts + any one-time charges
  const subtotalAmount = totalCartonsAmount + dieCost + blockCost + oneTimeTransport;
  const vatAmount = subtotalAmount * 0.18;
  const totalAmount = isVatCustomer ? (subtotalAmount + vatAmount) : subtotalAmount;

  const handleSavePdf = async () => {
    const element = document.getElementById('printable-quotation-sheet');
    if (!element) return;
    const safeCustomer = (quote.customer_name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Quotation_${displayQuoteNo}_${safeCustomer}.pdf`;

    if (window.html2pdf) {
      setDownloadingPdf(true);
      try {
        const opt = {
          margin: [8, 8, 8, 8],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          enableLinks: false,
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await Promise.race([
          window.html2pdf().set(opt).from(element).save(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('PDF generation timed out')), 8000))
        ]);
      } catch (err) {
        console.error('html2pdf error, fallback to print:', err);
        const prevTitle = document.title;
        document.title = fileName.replace('.pdf', '');
        window.print();
        setTimeout(() => { document.title = prevTitle; }, 1000);
      } finally {
        setDownloadingPdf(false);
        cleanOverlays();
        setTimeout(cleanOverlays, 300);
      }
    } else {
      const prevTitle = document.title;
      document.title = fileName.replace('.pdf', '');
      window.print();
      setTimeout(() => { document.title = prevTitle; }, 1000);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[99999] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cleanOverlays();
          onClose();
        }
      }}
    >
      {/* Inline Print Styles: Forces clean 1-Page Quotation */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .quote-history-main-content,
          .no-print-zone,
          nav,
          header,
          footer {
            display: none !important;
          }
          a[href]:after {
            content: none !important;
          }
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
          #printable-quotation-sheet {
            position: static !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 10mm 14mm !important;
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
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {displayQuoteNo} {parsedItems.length > 1 && `(${parsedItems.length} Items Compiled)`}
              </span>
            </div>
          </div>

          {/* Tax format toggle pills */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            <span className="px-2 text-gray-500 dark:text-gray-400 hidden sm:inline">Format:</span>
            <button
              type="button"
              onClick={() => setReportTaxFormat('auto')}
              style={reportTaxFormat === 'auto' ? { backgroundColor: '#d97706', color: '#ffffff' } : {}}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                reportTaxFormat === 'auto'
                  ? 'shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
              }`}
              title="Auto-detect from saved quote tax setting"
            >
              Auto ({isVatCustomer ? 'VAT' : 'Non-VAT'})
            </button>
            <button
              type="button"
              onClick={() => setReportTaxFormat('vat')}
              style={reportTaxFormat === 'vat' ? { backgroundColor: '#2563eb', color: '#ffffff' } : {}}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                reportTaxFormat === 'vat'
                  ? 'shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
              }`}
            >
              VAT (18%)
            </button>
            <button
              type="button"
              onClick={() => setReportTaxFormat('non-vat')}
              style={reportTaxFormat === 'non-vat' ? { backgroundColor: '#059669', color: '#ffffff' } : {}}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                reportTaxFormat === 'non-vat'
                  ? 'shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
              }`}
            >
              Non-VAT
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="overflow-y-auto flex-1 pr-1 -mr-1">
          <div 
            id="printable-quotation-sheet"
            className="bg-white text-gray-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 text-xs sm:text-sm font-sans"
            style={{ color: '#111827' }}
          >
            {/* Header: Company Info based on VAT or Non-VAT */}
            <div className="border-b-2 border-gray-900 pb-4 mb-4 flex justify-between items-start gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 leading-tight">
                  {isVatCustomer ? 'Chelsy Packaging Solutions (Pvt) Ltd.' : 'Chelsy Packaging Pvt Ltd'}
                </h1>
                <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
                  Manufacturers of High Quality Corrugated Cartons & Paper Products<br />
                  Factory: 366/4, Balummahara, Mudungoda.<br />
                  Office: 202/10, Colombo Road, Biyagama.<br />
                  Hotline: 0773 888 692 | 077 206 7268 | Email: info@chelsypackaging.com
                </p>
                {isVatCustomer && (
                  <p className="text-xs font-bold text-gray-900 mt-1">
                    VAT Registration No: <span className="font-mono">103429295-7000</span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block bg-gray-900 text-white font-black text-xs px-3 py-1.5 rounded-md uppercase tracking-wider mb-2">
                  {isVatCustomer ? 'TAX QUOTATION' : 'QUOTATION'}
                </span>
                <p className="text-xs font-semibold text-gray-500">Date: <span className="text-gray-900 font-bold">{displayDate}</span></p>
                <p className="text-xs font-semibold text-gray-500">Quote No: <span className="text-gray-900 font-mono font-bold">{displayQuoteNo}</span></p>
              </div>
            </div>

            {/* Customer Information Block */}
            <div className="mb-5 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">
                Quotation Prepared For:
              </span>
              <p className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                {quote.customer_name}
              </p>
            </div>

            {/* Official Order Quotation Items Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 border-b border-gray-300 font-bold text-[11px] sm:text-xs">
                    <th className="py-2.5 px-3 text-center border-r border-gray-300 w-10">#</th>
                    <th className="py-2.5 px-4 text-left border-r border-gray-300">Description</th>
                    <th className="py-2.5 px-3 text-right border-r border-gray-300 w-24">Qty</th>
                    <th className="py-2.5 px-3 text-center border-r border-gray-300 w-16">Unit</th>
                    <th className="py-2.5 px-3 text-right border-r border-gray-300 w-24">Price</th>
                    <th className="py-2.5 px-4 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50/50">
                      <td className="py-3 px-3 text-center font-medium text-gray-600 border-r border-gray-300">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900 border-r border-gray-300">
                        <div>{item.descStr}</div>
                        <div className="text-[11px] text-gray-600 font-normal mt-1 space-y-0.5">
                          <div><span className="font-semibold text-gray-700">Flute Type:</span> {item.fluteDisplay}</div>
                          <div><span className="font-semibold text-gray-700">Board Type:</span> {item.boardDisplay}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900 border-r border-gray-300">
                        {item.qty.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700 border-r border-gray-300">
                        Nos
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-gray-900 border-r border-gray-300">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                        {item.cartonAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {/* One-time costs */}
                  {(() => {
                    let sNo = parsedItems.length;
                    return (
                      <>
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
            <div className="mt-5 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="text-xs sm:text-sm font-semibold text-gray-800 pt-1">
                <span className="font-bold text-gray-900">Transport - </span>
                <span>
                  {quote.transport_option || 
                    (quote.has_transport ? 'Including transport' : 'Ex factory price from Biyagama factory ( No transport)')}
                </span>
              </div>
              <div className="w-full sm:w-72 space-y-1.5 text-xs sm:text-sm ml-auto">
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

              {/* Right Column: Bank Account Details + Authorized Signature */}
              <div className="flex flex-col items-start sm:items-end justify-between gap-4 w-full sm:w-auto">
                <div className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 sm:p-3 text-left w-full sm:w-64 text-[11px] shadow-xs">
                  <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1 border-b border-gray-200 pb-1">
                    <span>🏦</span> Bank Account Details
                  </p>
                  {isVatCustomer ? (
                    <div className="space-y-0.5 text-gray-800 text-[11px]">
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">A/C No:</span>
                        <span className="font-mono font-bold text-black text-xs">0110-13429295-001</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">A/C Name:</span>
                        <span className="font-medium text-gray-900 text-right">Chelsy Packaging Solutions Pvt Ltd</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">Bank / Branch:</span>
                        <span className="font-medium text-gray-900 text-right">Seylan Bank - Gampaha</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-gray-800 text-[11px]">
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">A/C No:</span>
                        <span className="font-mono font-bold text-black text-xs">1000448465</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">A/C Name:</span>
                        <span className="font-medium text-gray-900 text-right">Chelsy Packaging Pvt Ltd.</span>
                      </p>
                      <p className="flex justify-between gap-2">
                        <span className="font-semibold text-gray-700">Bank / Branch:</span>
                        <span className="font-medium text-gray-900 text-right">Commercial Bank, Weliweriya branch</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto pt-1">
                  <div className="w-48 sm:ml-auto border-b border-gray-400 mb-1"></div>
                  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="no-print-zone mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                backgroundColor: isDark ? 'rgba(69, 10, 10, 0.6)' : '#fee2e2',
                color: isDark ? '#f87171' : '#b91c1c',
                borderColor: isDark ? '#991b1b' : '#fca5a5'
              }}
              className="font-bold py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <span>🗑️</span> Delete Quote
            </button>
          )}
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleSavePdf}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              borderColor: '#047857'
            }}
            className={`font-black py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 hover:scale-[1.01] ${downloadingPdf ? 'opacity-70 cursor-not-allowed' : ''} ${!onDelete ? 'col-span-1 sm:col-start-2' : ''}`}
            title="Save quotation directly as a PDF document"
          >
            {downloadingPdf ? (
              <>
                <span className="animate-spin">⏳</span> Generating...
              </>
            ) : (
              <>
                <span>📥</span> Save as PDF
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const prevTitle = document.title;
              document.title = `Quotation_${displayQuoteNo}_${(quote.customer_name || 'Customer').replace(/\s+/g, '_')}`;
              window.print();
              setTimeout(() => { document.title = prevTitle; }, 1000);
            }}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderColor: '#1d4ed8'
            }}
            className="font-black py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 hover:scale-[1.01]"
            title="Print quotation directly to printer"
          >
            <span>🖨️</span> Print Quotation
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cleanOverlays();
              onClose();
            }}
            style={{
              backgroundColor: isDark ? '#1a2332' : '#2d2417',
              color: '#ffffff',
              borderColor: isDark ? '#334155' : '#443422',
              cursor: 'pointer'
            }}
            className="font-extrabold py-2.5 sm:py-3 rounded-2xl border transition cursor-pointer hover:opacity-90 shadow-md text-xs sm:text-sm flex items-center justify-center relative z-20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
