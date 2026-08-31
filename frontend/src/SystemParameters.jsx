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
      isDark ? 'bg-[#0f141e]/90 text-white border-[#c5a880]/20 shadow-black/50' : 'bg-[#fcfaf7] text-[#5c4c36] border-[#e8dfc7] shadow-xl'
    }`}>
      <h2 className={`text-2xl font-bold flex items-center gap-2 mb-6 ${isDark ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
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
                : 'bg-white border-[#dfd5bc] text-[#5c4c36] hover:bg-[#faf8f5]'
            }`}>
              <div>
                <p className={`font-semibold capitalize ${isDark ? 'text-slate-200' : 'text-[#5c4c36]'}`}>{key.replace(/_/g, ' ')}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#8c734b]/80'}`}>{key}</p>
              </div>

              <div className="flex items-center gap-4">
                {editingParam === key ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className={`px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c5a880]/40 text-sm w-24 ${
                        isDark ? 'bg-[#0f141e] border-[#c5a880]/30 text-white' : 'bg-[#fcfbfa] border-[#dfd5bc] text-[#5c4c36]'
                      }`}
                      placeholder="New val"
                    />
                    <button
                      onClick={() => handleUpdate(key)}
                      className={`font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                        isDark ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841e] text-[#0f172a] border-transparent hover:from-[#e5c158] hover:to-[#c2982c]' : 'bg-gradient-to-r from-[#8c734b] to-[#5c4c36] text-white border-transparent hover:from-[#9f8150] hover:to-[#7a6442]'
                      }`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingParam(null)}
                      className={`font-semibold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                        isDark ? 'bg-[#1a2332] text-slate-300 border-[#c5a880]/20 hover:bg-slate-700' : 'bg-[#eae5d9] text-[#5c4c36] border-transparent hover:bg-[#dfd5bc]'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`font-bold text-lg px-4 py-1.5 rounded-xl shadow-xs border ${
                      isDark ? 'bg-[#0f141e] border-[#c5a880]/30 text-[#d4af37]' : 'bg-[#fcfbfa] border-[#dfd5bc] text-[#8c734b]'
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
                          : 'bg-[#faf8f5] border-[#dfd5bc] text-[#8c734b] hover:bg-[#eae5d9]/60'
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
