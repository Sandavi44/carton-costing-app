import React, { useState } from 'react';
import axios from 'axios';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export default function Login({ onLoginSuccess, theme = 'green', setTheme }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const isDark = theme === 'dark';
  const isSand = theme === 'sand';
  const isGreen = !isDark && !isSand;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const response = await axios.post('/api/auth/register', { username, password, email });
        setMessage(response.data.message + '! You can now log in.');
        setIsRegister(false);
      } else {
        const response = await axios.post('/api/auth/login', { username, password });
        const { access_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        onLoginSuccess(access_token, user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      const response = await axios.post('/api/auth/demo-login');
      const { access_token, user } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(access_token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Demo login failed. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${
    isDark ? 'text-[#c5a880]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'
  }`;

  const inputClass = `w-full px-4 py-3 border-2 rounded-xl transition duration-200 outline-none text-sm font-medium ${
    isDark 
      ? 'bg-[#0a0d14] border-[#c5a880]/30 text-white placeholder-[#8c734b]/40 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30' 
      : isSand
        ? 'bg-white border-[#dfd5bc] text-[#5c4c36] placeholder-[#b8b09b] focus:border-[#8c734b] focus:ring-2 focus:ring-[#8c734b]/20'
        : 'bg-white border-emerald-300 text-black placeholder-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30'
  }`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0f141e]' 
        : isSand
          ? 'bg-gradient-to-br from-[#fbfaf8] via-[#f7f5f0] to-[#eae5d9]'
          : 'bg-gradient-to-br from-[#f4faf4] via-[#ecf7ed] to-[#e2f0d9]'
    }`}>
      {/* Background ambient accents */}
      <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-3xl pointer-events-none ${
        isDark ? 'bg-[#d4af37]/5' : isSand ? 'bg-[#dfd5bc]/30' : 'bg-emerald-400/20'
      }`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-3xl pointer-events-none ${
        isDark ? 'bg-[#c5a880]/5' : isSand ? 'bg-[#8c734b]/15' : 'bg-green-500/15'
      }`}></div>

      {/* Floating Theme Switcher */}
      {setTheme && (
        <div className="absolute top-5 right-5 z-20">
          <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold shadow-xs transition-colors ${
            isDark
              ? 'bg-[#1a2332] border-[#c5a880]/30 text-slate-300'
              : isSand
                ? 'bg-[#efebe1] border-[#dfd5bc] text-[#5c4c36]'
                : 'bg-[#dcfce7] border-[#bbf7d0] text-[#14532d]'
          }`}>
            <button
              type="button"
              onClick={() => setTheme('green')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                isGreen
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : isDark ? 'hover:text-emerald-300 opacity-70 hover:opacity-100' : 'hover:text-emerald-900 opacity-70 hover:opacity-100'
              }`}
              title="Pastel Mint Green Theme"
            >
              <span>🌿</span> <span>Green</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('sand')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                isSand
                  ? 'bg-[#8c734b] text-white shadow-xs font-bold'
                  : isDark ? 'hover:text-amber-200 opacity-70 hover:opacity-100' : 'hover:text-[#5c4c36] opacity-70 hover:opacity-100'
              }`}
              title="Warm Sand Kraft Theme"
            >
              <span>📜</span> <span>Sand</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs ${
                isDark
                  ? 'bg-[#d4af37] text-slate-900 shadow-xs font-bold'
                  : 'hover:text-yellow-600 opacity-70 hover:opacity-100'
              }`}
              title="Obsidian Dark Theme"
            >
              <span>🌙</span> <span>Dark</span>
            </button>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className={`max-w-md w-full backdrop-blur-xl border-2 rounded-3xl shadow-2xl p-8 relative z-10 transition-all ${
        isDark 
          ? 'bg-[#131924]/90 border-[#c5a880]/20 text-white shadow-black/60' 
          : isSand
            ? 'bg-[#faf8f5] border-[#dfd5bc] text-[#5c4c36] shadow-xl'
            : 'bg-[#eaf5ea] border-[#bbf7d0] text-[#14532d] shadow-emerald-950/5'
      }`}>
        <div className="text-center mb-8">
          {/* 3D Isometric Cube Packaging Logo */}
          <div className="flex justify-center mb-3">
            <svg className="w-14 h-14 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="24,5 43,15.5 24,26 5,15.5" fill={isSand ? "#8c734b" : "#15803d"} stroke="#ffffff" strokeWidth="0.75" />
              <polygon points="5,15.5 24,26 24,42 5,31.5" fill="#b91c1c" stroke="#ffffff" strokeWidth="0.75" />
              <polygon points="24,26 43,15.5 43,31.5 24,42" fill="#1d4ed8" stroke="#ffffff" strokeWidth="0.75" />
              <line x1="24" y1="5" x2="24" y2="26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="2 1" />
            </svg>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-wide ${
            isDark 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#aa841e]' 
              : isSand
                ? 'text-[#5c4c36]'
                : 'text-[#14532d]'
          }`}>
            Carton Costing System
          </h1>
          <p className={`mt-2 font-medium text-xs sm:text-sm ${
            isDark ? 'text-[#8c734b]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'
          }`}>
            {isRegister ? 'Create a new account' : 'Sign in to your account'}
          </p>
        </div>

        {IS_DEMO && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className={`w-full border-2 font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                isDark 
                  ? 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10' 
                  : isSand
                    ? 'border-[#8c734b] text-[#5c4c36] bg-white hover:bg-[#dfd5bc]/20'
                    : 'border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-100/50'
              }`}
            >
              {demoLoading ? 'Loading demo...' : <><span>⚡</span> Try Demo — No Login Required</>}
            </button>
            <p className={`text-center text-xs mt-2 ${
              isDark ? 'text-[#8c734b]/70' : isSand ? 'text-[#8c734b]/70' : 'text-[#166534]/70'
            }`}>
              Staging instance · fake data only · safe to explore
            </p>
            <div className="flex items-center gap-3 my-5">
              <div className={`flex-1 h-px ${isDark ? 'bg-[#c5a880]/20' : isSand ? 'bg-[#dfd5bc]' : 'bg-emerald-300'}`}></div>
              <span className={`text-xs uppercase tracking-wider ${
                isDark ? 'text-[#8c734b]/60' : isSand ? 'text-[#8c734b]' : 'text-[#166534]/80'
              }`}>or sign in</span>
              <div className={`flex-1 h-px ${isDark ? 'bg-[#c5a880]/20' : isSand ? 'bg-[#dfd5bc]' : 'bg-emerald-300'}`}></div>
            </div>
          </div>
        )}

        {error && (
          <div className={`border-l-4 p-4 mb-6 rounded text-sm ${
            isDark ? 'bg-red-950/40 border-red-500 text-red-300' : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            ❌ {error}
          </div>
        )}

        {message && (
          <div className={`border-l-4 p-4 mb-6 rounded text-sm ${
            isDark ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="Enter username"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Enter email"
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3.5 rounded-xl transition duration-150 disabled:opacity-50 mt-6 shadow-lg cursor-pointer ${
              isDark 
                ? 'bg-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c] text-[#0f172a] shadow-[#d4af37]/20' 
                : isSand
                  ? 'bg-gradient-to-r from-[#8c734b] to-[#5c4c36] hover:from-[#a08457] hover:to-[#6d5a40] text-white shadow-[#8c734b]/20'
                  : 'bg-gradient-to-r from-[#16a34a] to-[#15803d] hover:from-[#22c55e] hover:to-[#16a34a] text-white shadow-emerald-700/20'
            }`}
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${
          isDark ? 'text-[#8c734b]' : isSand ? 'text-[#8c734b]' : 'text-[#166534]'
        }`}>
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className={`font-bold hover:underline ${
                  isDark 
                    ? 'text-[#d4af37] hover:text-[#e5c158]' 
                    : isSand
                      ? 'text-[#8c734b] hover:text-[#5c4c36]'
                      : 'text-[#16a34a] hover:text-[#15803d]'
                }`}
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className={`font-bold hover:underline ${
                  isDark 
                    ? 'text-[#d4af37] hover:text-[#e5c158]' 
                    : isSand
                      ? 'text-[#8c734b] hover:text-[#5c4c36]'
                      : 'text-[#16a34a] hover:text-[#15803d]'
                }`}
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
