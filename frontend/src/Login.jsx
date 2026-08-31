import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Register flow
        const response = await axios.post('/api/auth/register', { username, password, email });
        setMessage(response.data.message + '! You can now log in.');
        setIsRegister(false);
      } else {
        // Login flow
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

  return (
    <div className="min-h-screen bg-[#0f141e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
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
            <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">
              Username
            </label>
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
              <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">
                Email Address
              </label>
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
            <label className="block text-sm font-semibold text-[#c5a880] mb-1.5">
              Password
            </label>
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
            className="w-full bg-gradient-to-r from-[#d4af37] to-[#aa841e] hover:from-[#e5c158] hover:to-[#c2982c] text-[#0f172a] font-bold py-3.5 rounded-xl transition disabled:opacity-50 mt-8 shadow-lg shadow-[#d4af37]/20"
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
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className="text-[#d4af37] hover:text-[#e5c158] hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
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
