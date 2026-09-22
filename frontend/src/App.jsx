import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import CostingApp from './CostingApp';
import QuoteHistory from './QuoteHistory';
import SystemParameters from './SystemParameters';
import CalculationSteps from './CalculationSteps';

// Configure Axios defaults
// - Local dev:  VITE_API_URL is empty → Vite proxies /api → http://localhost:5000
// - Render:     VITE_API_URL=https://your-api.onrender.com (set in Render dashboard)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator');

  // Shared state for costing calculations to expose to multiple tabs
  const [formData, setFormData] = useState({
    customerName: '',
    cartonLength: '',
    cartonWidth: '',
    cartonHeight: '',
    quantity: '',
    plyType: '3-Ply',
    boardType: 'Whitecut',
    fluteType: 'B-Flute',
    fluteType2: 'B-Flute',
    joiningType: 'Glued',
    isPrinted: false,
    whiteLinerRate: '',
    brownLinerRate: '',
    gsm1: '',
    gsm2: '',
    gsm3: '',
    gsm4: '',
    gsm5: '',
    gsm6: '',
    gsm7: '',
    totalOverheadForOrder: '',
    joiningCost: '',
    joiningCostManual: false,
    printCost: '',
    printCostManual: false,
    slottingCost: '',
    slottingCostManual: false,
    bundlingCost: '',
    bundlingCostManual: false,
    diecuttingCost: '',
    cartonCategory: 'S',
    cartonType: 'RSC',
    dieLength: '',
    dieWidth: '',
    quoteNo: null,
    isEditing: false,
    productionMethod: 'In-house',
    profitMargin: '15',
    taxType: 'Non-VAT',
    hasInhouseCommission: false,
    hasThirdPartyCommission: false,
    thirdPartyCommission: '',
    hasTransport: false,
    transportCost: '',
  });
  const [calculatedCost, setCalculatedCost] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab('calculator');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#0c0f17] via-[#080b11] to-[#040609] text-[#e2d4c0]' 
        : 'bg-gradient-to-br from-[#fbfaf8] via-[#f7f5f0] to-[#eae5d9] text-[#5c4c36]'
    }`}>
      {/* Navigation Header */}
      <nav className={`shadow-xl border-b transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-[#131924]/90 border-[#c5a880]/20 text-[#e2d4c0]' 
          : 'bg-[#faf8f5]/90 border-[#e8dfc7] text-[#5c4c36]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <span className={`text-xl font-bold tracking-wide ${theme === 'dark' ? 'text-[#d4af37]' : 'text-[#8c734b]'}`}>
                  📦 Carton Costing System
                </span>
              </div>
              {/* Tabs */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('calculator')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'calculator'
                      ? theme === 'dark' ? 'border-[#d4af37] text-[#d4af37]' : 'border-[#8c734b] text-[#8c734b]'
                      : theme === 'dark'
                        ? 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        : 'border-transparent text-gray-500 hover:border-[#dfd5bc] hover:text-gray-700'
                  }`}
                >
                  Calculator
                </button>
                <button
                  onClick={() => setActiveTab('steps')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'steps'
                      ? theme === 'dark' ? 'border-[#d4af37] text-[#d4af37]' : 'border-[#8c734b] text-[#8c734b]'
                      : theme === 'dark'
                        ? 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        : 'border-transparent text-gray-500 hover:border-[#dfd5bc] hover:text-gray-700'
                  }`}
                >
                  Calculation Logic
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'history'
                      ? theme === 'dark' ? 'border-[#d4af37] text-[#d4af37]' : 'border-[#8c734b] text-[#8c734b]'
                      : theme === 'dark'
                        ? 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        : 'border-transparent text-gray-500 hover:border-[#dfd5bc] hover:text-gray-700'
                  }`}
                >
                  Quote History
                </button>
                {user?.is_admin && (
                  <button
                    onClick={() => setActiveTab('parameters')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition cursor-pointer ${
                      activeTab === 'parameters'
                        ? theme === 'dark' ? 'border-[#d4af37] text-[#d4af37]' : 'border-[#8c734b] text-[#8c734b]'
                        : theme === 'dark'
                          ? 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                          : 'border-transparent text-gray-500 hover:border-[#dfd5bc] hover:text-gray-700'
                    }`}
                  >
                    System Parameters
                  </button>
                )}
              </div>
            </div>
            
            {/* Right Header Side (Theme Toggle, User & Logout) */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg border transition cursor-pointer text-lg ${
                  theme === 'dark' 
                    ? 'bg-[#1a2332] border-[#c5a880]/30 text-yellow-400 hover:bg-slate-700' 
                    : 'bg-[#fcfbfa] border-[#dfd5bc] text-[#8c734b] hover:bg-gray-100'
                }`}
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <span className={`text-sm hidden md:inline ${theme === 'dark' ? 'text-slate-300' : 'text-[#8c734b]'}`}>
                Logged in as <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#5c4c36]'}`}>{user?.username}</span>
                {user?.is_admin && (
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${
                    theme === 'dark' ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841e] text-[#0f172a]' : 'bg-gradient-to-r from-[#9f8150] to-[#bfa16f] text-white'
                  }`}>
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className={`font-semibold px-4 py-2 rounded-lg text-sm border transition duration-150 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#1a2332] border-red-950/40 text-red-400 hover:bg-red-950/20'
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeTab === 'calculator' && (
          <CostingApp 
            formData={formData} 
            setFormData={setFormData} 
            calculatedCost={calculatedCost} 
            setCalculatedCost={setCalculatedCost} 
            theme={theme}
          />
        )}
        {activeTab === 'steps' && (
          <CalculationSteps 
            formData={formData} 
            calculatedCost={calculatedCost} 
            theme={theme}
          />
        )}
        {activeTab === 'history' && (
          <QuoteHistory 
            setFormData={setFormData} 
            setCalculatedCost={setCalculatedCost} 
            setActiveTab={setActiveTab} 
            theme={theme}
          />
        )}
        {activeTab === 'parameters' && <SystemParameters theme={theme} />}
      </main>
    </div>
  );
}

export default App;
