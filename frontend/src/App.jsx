import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import CostingApp from './CostingApp';
import QuoteHistory from './QuoteHistory';
import SystemParameters from './SystemParameters';
import CalculationSteps from './CalculationSteps';
import ChangePasswordModal from './ChangePasswordModal';

// Configure Axios defaults
// - Local dev:  VITE_API_URL is empty → Vite proxies /api → http://localhost:5000
// - Render:     VITE_API_URL=https://your-api.onrender.com (set in Render dashboard)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Shared state for costing calculations to expose to multiple tabs
  const [formData, setFormData] = useState({
    customerName: '',
    cartonLength: '',
    cartonWidth: '',
    cartonHeight: '',
    quantity: '',
    plyType: '3-Ply',
    boardType: 'Brown Liner',
    fluteType: 'B-Flute',
    fluteType2: 'B-Flute',
    joiningType: 'Glued',
    isPrinted: false,
    printName: '',
    whiteLinerRate: '',
    brownLinerRate: '260',
    gsm1: '140',
    gsm2: '112',
    gsm3: '140',
    gsm4: '',
    gsm5: '',
    gsm6: '',
    gsm7: '',
    totalOverheadForOrder: '1000',
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
    transportOption: 'Ex factory price from Biyagama factory ( No transport)',
    oneTimeDieCost: '',
    oneTimeBlockCost: '',
    oneTimeTransportCost: '',
    paymentMethod: 'Credit - 30 Days',
    dimensionUnit: 'mm',
  });
  const [calculatedCost, setCalculatedCost] = useState(null);
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'sand' || saved === 'green') return saved;
    return 'green';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
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
    return <Login onLoginSuccess={handleLoginSuccess} theme={theme} setTheme={handleThemeChange} />;
  }

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';
  const isGreen = !isDark && !isSand;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-[#0c0f17] via-[#080b11] to-[#040609] text-[#e2d4c0]' 
        : isSand
          ? 'bg-gradient-to-br from-[#fbfaf8] via-[#f7f5f0] to-[#eae5d9] text-[#5c4c36]'
          : 'bg-gradient-to-br from-[#f4faf4] via-[#ecf7ed] to-[#dcf0dc] text-[#14532d]'
    }`}>
      {/* Navigation Header */}
      <nav className={`shadow-xl border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-[#131924]/90 border-[#c5a880]/20 text-[#e2d4c0]' 
          : isSand
            ? 'bg-[#faf8f5]/90 border-[#e8dfc7] text-[#5c4c36]'
            : 'bg-[#eaf5ea]/90 border-[#bbf7d0] text-[#14532d]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <span className={`text-xl font-bold tracking-wide ${
                  isDark ? 'text-[#d4af37]' : isSand ? 'text-[#8c734b]' : 'text-[#15803d]'
                }`}>
                  📦 Carton Costing System
                </span>
              </div>
              {/* Desktop / Tablet Tabs */}
              <div className="hidden md:flex items-center space-x-1 lg:space-x-2 ml-3 lg:ml-6">
                {[
                  { id: 'calculator', label: 'Calculator', icon: '🧮' },
                  { id: 'steps', label: 'Calculation Logic', icon: '📐' },
                  { id: 'history', label: 'Quote History', icon: '📜' },
                  ...(user?.is_admin ? [{ id: 'parameters', label: 'System Parameters', icon: '⚙️' }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold transition cursor-pointer ${
                      activeTab === tab.id
                        ? isDark
                          ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-xs font-bold'
                          : isSand
                            ? 'bg-[#8c734b]/20 text-[#8c734b] border border-[#8c734b]/40 shadow-xs font-bold'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          : isSand
                            ? 'text-[#5c4c36]/70 hover:text-[#5c4c36] hover:bg-[#efebe1]'
                            : 'text-emerald-900/70 hover:text-emerald-950 hover:bg-emerald-100/60'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right Header Side (Theme Switcher, User & Logout) */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Segmented 3-Theme Switcher */}
              <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border text-xs font-semibold shadow-xs transition-colors ${
                isDark
                  ? 'bg-[#1a2332] border-[#c5a880]/30 text-slate-300'
                  : isSand
                    ? 'bg-[#efebe1] border-[#dfd5bc] text-[#5c4c36]'
                    : 'bg-[#dcfce7] border-[#bbf7d0] text-[#14532d]'
              }`}>
                <button
                  type="button"
                  onClick={() => handleThemeChange('green')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                    isGreen
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : isDark ? 'hover:text-emerald-300 opacity-70 hover:opacity-100' : 'hover:text-emerald-900 opacity-70 hover:opacity-100'
                  }`}
                  title="Pastel Mint Green Theme"
                >
                  <span>🌿</span> <span className="hidden md:inline">Green</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('sand')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                    isSand
                      ? 'bg-[#8c734b] text-white shadow-xs font-bold'
                      : isDark ? 'hover:text-amber-200 opacity-70 hover:opacity-100' : 'hover:text-[#5c4c36] opacity-70 hover:opacity-100'
                  }`}
                  title="Warm Sand Kraft Theme"
                >
                  <span>📜</span> <span className="hidden md:inline">Sand</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                    isDark
                      ? 'bg-[#d4af37] text-slate-900 shadow-xs font-bold'
                      : 'hover:text-yellow-600 opacity-70 hover:opacity-100'
                  }`}
                  title="Obsidian Dark Theme"
                >
                  <span>🌙</span> <span className="hidden md:inline">Dark</span>
                </button>
              </div>

              <span className={`text-sm hidden md:inline ${
                isDark ? 'text-slate-300' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'
              }`}>
                Logged in as <span className={`font-semibold ${
                  isDark ? 'text-white' : isSand ? 'text-[#5c4c36]' : 'text-[#14532d]'
                }`}>{user?.username}</span>
                {user?.is_admin && (
                  <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${
                    isDark 
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841e] text-[#0f172a]' 
                      : isSand
                        ? 'bg-gradient-to-r from-[#9f8150] to-[#bfa16f] text-white'
                        : 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white'
                  }`}>
                    Admin
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                title="Redefine your account password"
                className={`font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  isDark
                    ? 'bg-[#1a2332] border-[#c5a880]/30 text-amber-200/90 hover:bg-[#253046]'
                    : isSand
                      ? 'bg-[#f4efe5] border-[#dfd5bc] text-[#5c4c36] hover:bg-[#eae3d4]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>🔑</span>
                <span className="hidden sm:inline">Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                className={`font-semibold px-3 sm:px-4 py-2 rounded-lg text-sm border transition duration-150 cursor-pointer ${
                  isDark
                    ? 'bg-[#1a2332] border-red-950/40 text-red-400 hover:bg-red-950/20'
                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile & Narrow Screens Tab Strip */}
        <div className={`md:hidden flex items-center gap-2 px-3 py-2 border-t overflow-x-auto shadow-inner ${
          isDark 
            ? 'bg-[#0c1018] border-slate-800' 
            : isSand 
              ? 'bg-[#f4efe5] border-[#dfd5bc]' 
              : 'bg-[#dcf0dc] border-[#bbf7d0]'
        }`}>
          {[
            { id: 'calculator', label: 'Calculator', icon: '🧮' },
            { id: 'steps', label: 'Calculation Logic', icon: '📐' },
            { id: 'history', label: 'Quote History', icon: '📜' },
            ...(user?.is_admin ? [{ id: 'parameters', label: 'System Parameters', icon: '⚙️' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? isDark
                    ? 'bg-[#d4af37] text-slate-950 shadow-xs'
                    : isSand
                      ? 'bg-[#8c734b] text-white shadow-xs'
                      : 'bg-emerald-700 text-white shadow-xs'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    : isSand
                      ? 'bg-white/80 text-[#5c4c36] border border-[#dfd5bc]'
                      : 'bg-white/80 text-emerald-900 border border-emerald-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {activeTab === 'calculator' && (
          <CostingApp 
            user={user}
            formData={formData} 
            setFormData={setFormData} 
            calculatedCost={calculatedCost} 
            setCalculatedCost={setCalculatedCost} 
            setActiveTab={setActiveTab}
            theme={theme}
          />
        )}
        {activeTab === 'steps' && (
          <CalculationSteps 
            formData={formData} 
            setFormData={setFormData}
            calculatedCost={calculatedCost} 
            setCalculatedCost={setCalculatedCost}
            setActiveTab={setActiveTab}
            theme={theme}
          />
        )}
        {activeTab === 'history' && (
          <QuoteHistory 
            user={user}
            formData={formData}
            setFormData={setFormData} 
            calculatedCost={calculatedCost}
            setCalculatedCost={setCalculatedCost} 
            setActiveTab={setActiveTab} 
            theme={theme}
          />
        )}
        {activeTab === 'parameters' && <SystemParameters theme={theme} />}
      </main>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal 
          user={user} 
          onClose={() => setShowChangePasswordModal(false)} 
          theme={theme} 
        />
      )}
    </div>
  );
}

export default App;
