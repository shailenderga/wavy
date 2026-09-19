import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { MessageSquare, User, Mail, Lock, ArrowRight, Check, KeyRound } from 'lucide-react';

export default function AuthModal() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (authMode === 'login') {
        await login({ loginId: username || email, password });
      } else if (authMode === 'register') {
        await register({ username, email, password });
      } else if (authMode === 'forgot') {
        const res = await authAPI.forgotPassword({
          loginId: username || email,
          newPassword
        });
        setSuccessMsg(res.data.message || 'Password reset successfully! You can now sign in.');
        setTimeout(() => {
          setAuthMode('login');
          setPassword(newPassword);
          setNewPassword('');
          setSuccessMsg('');
        }, 1800);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-7 sm:p-8 transition-all">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {authMode === 'login'
              ? 'Welcome Back!'
              : authMode === 'register'
              ? 'Create an Account'
              : 'Reset Password'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {authMode === 'login'
              ? 'Sign in to access your chat channels and messages'
              : authMode === 'register'
              ? 'Join the chat community powered by React & MySQL'
              : 'Enter your username/email and a new password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-medium flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Username {authMode === 'login' && '/ Email'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={authMode === 'register' ? 'Username' : 'Username or Email'}
                style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                  className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                />
              </div>
            </div>
          )}

          {authMode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Password
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-blue-400 hover:underline font-medium transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                  className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                />
              </div>
            </div>
          )}

          {authMode === 'forgot' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                  className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <span>
              {submitting
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Sign In'
                : authMode === 'register'
                ? 'Sign Up'
                : 'Reset Password'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center">
          {authMode === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-blue-400 hover:underline font-medium transition"
            >
              Back to Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-slate-400 hover:text-blue-400 transition"
            >
              {authMode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          )}
        </div>

        {/* Modern Created By Badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col items-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-400">
              Created by <span className="text-emerald-400 font-semibold">Shailender Gautam</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
