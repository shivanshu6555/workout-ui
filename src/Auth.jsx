import { useState } from 'react';
import axios from 'axios';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';

    try {
      const response = await axios.post(endpoint, { 
        phoneNumber: phone, 
        password: password 
      });

      if (isLogin) {
        // Grab the wristband and save it to the browser!
        const token = response.data.token;
        console.log("Login successful! JWT token received:", response.data.phoneNumber);
        localStorage.removeItem('current_session'); // Clear any old session data when logging in
        localStorage.setItem('jwt_token', token);
        onLoginSuccess(token);
      } else {
        // If registration works, automatically switch them to the login screen
        setIsLogin(true);
        setPassword('');
        alert('Registration successful! Please log in.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Incorrect phone number or password.');
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 font-sans">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-emerald-400 text-center mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded p-3 focus:outline-none focus:border-emerald-500"
              placeholder="+91 9876543210"
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded p-3 focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded transition-colors"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-slate-400 hover:text-emerald-400 text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Register here." : "Already have an account? Log in."}
          </button>
        </div>
      </div>
    </div>
  );
}