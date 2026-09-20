import React, { useState } from 'react';
import axios from 'axios';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0f141e] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#c5a880]/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-[#131924]/90 backdrop-blur-xl border border-[#c5a880]/20 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#aa841e] flex justify-center items-center gap-3">
            <span>📦</span> Carton Costing
          </h1>
          <p className="text-[#8c734b] mt-3 font-medium">
            {isRegister ? 'Create a new account' : 'Sign in to your account'}
          </p>
        </div>

        {IS_DEMO && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="w-full border-2 border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10 font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {demoLoading ? 'Loading demo...' : <><span>⚡</span> Try Demo — No Login Required</>}
            </button>
            <p className="text-center text-xs text-[#8c734b]/70 mt-2">
              Staging instance · fake data only · safe to explore
            </p>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#c5a880]/20"></div>
              <span className="text-xs text-[#8c734b]/60 uppercase tracking-wider">or sign in</span>
              <div className="flex-1 h-px bg-[#c5a880]/20"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border-l-4 border-red-500 p-4 mb-6 rounded text-sm text-red-300">
            ❌ {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-950/40 border-l-4 border-emerald-500 p-4 mb-6 rounded text-sm text-emerald-300">
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0d14] border border-[#c5a880]/30 rounded-xl focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] text-white outline-none transition placeholder-[#8c734b]/40"
              placeholder="Enter username"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0d14] border border-[#c5a880]/30 rounded-xl focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] text-white outline-none transition placeholder-[#8c734b]/40"
                placeholder="Enter email"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0d14] border border-[#c5a880]/30 rounded-xl focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] text-white outline-none transition placeholder-[#8c734b]/40"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#d4af37', color: '#0f172a' }}
            className="w-full bg-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c] text-[#0f172a] font-bold py-3.5 rounded-xl transition disabled:opacity-50 mt-8 shadow-lg shadow-[#d4af37]/20"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#8c734b]">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className="text-[#d4af37] hover:text-[#e5c158] hover:underline font-bold"
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
                className="text-[#d4af37] hover:text-[#e5c158] hover:underline font-bold"
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
