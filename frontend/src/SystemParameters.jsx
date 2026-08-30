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
    <div className={`rounded-2xl shadow-xl p-8 transition-colors duration-200 text-left ${
      isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-white text-gray-800'
    }`}>
      <h2 className="text-2xl font-bold mb-6">⚙️ System Parameters (Admin Panel)</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded text-green-700 text-sm">
          ✅ {successMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">
          <p className="animate-pulse">Loading parameters...</p>
        </div>
      ) : Object.keys(params).length === 0 ? (
        <p className="text-gray-500">No system parameters defined in the database.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(params).map(([key, val]) => (
            <div key={key} className={`flex justify-between items-center p-4 rounded-xl border transition ${
              isDark 
                ? 'bg-slate-900/40 border-slate-700 text-white hover:bg-slate-900/60' 
                : 'bg-slate-50 border-gray-100 text-gray-800 hover:bg-slate-100/50'
            }`}>
              <div>
                <p className="font-semibold capitalize">{key.replace(/_/g, ' ')}</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{key}</p>
              </div>

              <div className="flex items-center gap-4">
                {editingParam === key ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className={`px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm w-24 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="New val"
                    />
                    <button
                      onClick={() => handleUpdate(key)}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded text-xs transition cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingParam(null)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-3 py-1.5 rounded text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`font-bold text-lg px-3 py-1 rounded shadow-xs border ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-800'
                    }`}>
                      {val}
                    </span>
                    <button
                      onClick={() => {
                        setEditingParam(key);
                        setNewValue(val);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded text-xs transition shadow-xs cursor-pointer"
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
