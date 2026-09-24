import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SystemParameters({ theme }) {
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editingParam, setEditingParam] = useState(null);
  const [newValue, setNewValue] = useState('');

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';
  const isGreen = !isDark && !isSand;

  const fetchParameters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/admin/parameters', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setParams(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, []);

  const handleUpdate = async (paramName) => {
    if (!newValue) return;
    setError('');
    setSuccessMsg('');
    try {
      await axios.put(
        `/api/admin/parameters/${paramName}`,
        { value: newValue },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      setSuccessMsg(`Parameter '${paramName}' updated successfully to ${newValue}`);
      setEditingParam(null);
      setNewValue('');
      fetchParameters();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update parameter');
    }
  };

  return (
    <div className={`rounded-3xl shadow-2xl p-8 transition-colors duration-300 text-left relative border ${
      isDark 
        ? 'bg-[#0f141e]/90 text-white border-[#c5a880]/20 shadow-black/50' 
        : isSand
          ? 'bg-[#fcfaf7] text-[#5c4c36] border-[#dfd5bc] shadow-xl'
          : 'bg-[#f4faf4] text-[#14532d] border-[#bbf7d0] shadow-xl'
    }`}>
      <h2 className={`text-2xl font-bold flex items-center gap-2 mb-6 ${
        isDark ? 'text-[#d4af37]' : isSand ? 'text-[#8c734b]' : 'text-[#15803d]'
      }`}>
        <span>⚙️</span> System Parameters (Admin Panel)
      </h2>

      {error && (
        <div className={`border-l-4 p-4 mb-6 rounded text-sm ${isDark ? 'bg-red-950/30 border-red-500 text-red-300' : 'bg-red-50 border-red-500 text-red-700'}`}>
          ❌ {error}
        </div>
      )}

      {successMsg && (
        <div className={`border-l-4 p-4 mb-6 rounded text-sm ${isDark ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300' : 'bg-green-50 border-green-500 text-green-700'}`}>
          ✅ {successMsg}
        </div>
      )}

      {loading ? (
        <div className={`text-center py-10 ${isDark ? 'text-[#c5a880]' : 'text-[#8c734b]'}`}>
          <p className="animate-pulse">Loading parameters...</p>
        </div>
      ) : Object.keys(params).length === 0 ? (
        <p className={`text-center py-10 border-2 border-dashed rounded-2xl ${
          isDark ? 'border-[#c5a880]/20 text-slate-400' : 'border-[#dfd5bc] text-[#8c734b]/60'
        }`}>
          No system parameters defined in the database.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(params).map(([key, val]) => (
            <div key={key} className={`flex justify-between items-center p-5 rounded-2xl border transition ${
              isDark 
                ? 'bg-[#131924]/60 border-[#c5a880]/15 text-white hover:bg-[#1a2332]/80' 
                : isSand
                  ? 'bg-white border-[#dfd5bc] text-[#5c4c36] hover:bg-[#faf8f5]'
                  : 'bg-white border-[#bbf7d0] text-[#14532d] hover:bg-[#eaf5ea]/40'
            }`}>
              <div>
                <p className={`font-semibold capitalize ${
                  isDark ? 'text-slate-200' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                }`}>
                  {key.replace(/_/g, ' ')}
                  {key.includes('board_rate') && (
                    <span className="ml-2 text-xxs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Rs./kg
                    </span>
                  )}
                </p>
                <p className={`text-xs ${
                  isDark ? 'text-slate-400' : isSand ? 'text-[#8c734b]/80' : 'text-[#166534]/80'
                }`}>{key}</p>
              </div>

              <div className="flex items-center gap-4">
                {editingParam === key ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 text-sm w-24 ${
                        isDark 
                          ? 'bg-[#0f141e] border-[#c5a880]/30 text-white focus:ring-[#c5a880]/40' 
                          : isSand
                            ? 'bg-[#fcfbfa] border-[#dfd5bc] text-[#5c4c36] focus:ring-[#8c734b]/20'
                            : 'bg-white border-emerald-300 text-black focus:ring-emerald-500/20'
                      }`}
                      placeholder="New val"
                    />
                    <button
                      onClick={() => handleUpdate(key)}
                      style={{
                        backgroundColor: isDark ? '#d4af37' : isSand ? '#8c734b' : '#15803d',
                        color: isDark ? '#0f172a' : '#ffffff'
                      }}
                      className={`font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                        isDark 
                          ? 'bg-[#d4af37] text-[#0f172a] bg-gradient-to-r from-[#d4af37] to-[#aa841e] border-transparent hover:from-[#e5c158] hover:to-[#c2982c]' 
                          : isSand
                            ? 'bg-[#8c734b] text-white bg-gradient-to-r from-[#8c734b] to-[#5c4c36] border-transparent hover:from-[#9f8150] hover:to-[#7a6442]'
                            : 'bg-[#15803d] text-white bg-gradient-to-r from-[#16a34a] to-[#15803d] border-transparent hover:from-[#22c55e] hover:to-[#16a34a]'
                      }`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingParam(null)}
                      className={`font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                        isDark 
                          ? 'bg-[#1a2332] text-slate-300 border-[#c5a880]/20 hover:bg-slate-700' 
                          : isSand
                            ? 'bg-[#eae5d9] text-[#5c4c36] border-transparent hover:bg-[#dfd5bc]'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`font-bold text-lg px-4 py-1.5 rounded-xl shadow-xs border ${
                      isDark 
                        ? 'bg-[#0f141e] border-[#c5a880]/30 text-[#d4af37]' 
                        : isSand
                          ? 'bg-[#fcfbfa] border-[#dfd5bc] text-[#8c734b]'
                          : 'bg-[#eaf5ea] border-[#bbf7d0] text-[#15803d]'
                    }`}>
                      {val}
                    </span>
                    <button
                      onClick={() => {
                        setEditingParam(key);
                        setNewValue(val);
                      }}
                      className={`font-semibold px-4 py-2 rounded-xl text-xs transition shadow-sm cursor-pointer border ${
                        isDark 
                          ? 'bg-[#1a2332] border-[#c5a880]/30 text-[#d4af37] hover:bg-slate-700' 
                          : isSand
                            ? 'bg-[#faf8f5] border-[#dfd5bc] text-[#8c734b] hover:bg-[#eae5d9]/60'
                            : 'bg-white border-[#bbf7d0] text-[#15803d] hover:bg-emerald-50'
                      }`}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
