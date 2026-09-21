import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  MessageSquare,
  User,
  Mail,
  Lock,
  ArrowRight,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  Sparkles,
  UserCheck,
  X,
  Info
} from 'lucide-react';

const ABOUT_PRESETS = [
  'Hey there! I am using Wavy.',
  'Available',
  'Busy',
  'At work',
  'Can’t talk, Wavy only'
];

export default function AuthModal() {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'profile_setup'
  const [regFullName, setRegFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameMessage, setUsernameMessage] = useState('');

  // Debounce username availability check in register mode
  useEffect(() => {
    if (authMode !== 'register') {
      setUsernameStatus(null);
      setUsernameMessage('');
      return;
    }

    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameStatus(null);
      setUsernameMessage('');
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username must be at least 3 characters');
      return;
    }

    const validRegex = /^[a-zA-Z0-9_.]+$/;
    if (!validRegex.test(trimmed)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Only letters, numbers, dots & underscores allowed');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await authAPI.checkUsername(trimmed);
        if (res.data.available) {
          setUsernameStatus('available');
          setUsernameMessage(res.data.message || 'Username is available!');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(res.data.message || 'Username is already taken');
        }
      } catch (err) {
        console.error('Check username error:', err);
        setUsernameStatus(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, authMode]);

  // Profile setup state (Step 2 after signup)
  const [tempUser, setTempUser] = useState(null);
  const [tempToken, setTempToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [about, setAbout] = useState('Hey there! I am using Wavy.');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, updateUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (authMode === 'login') {
        await login({ loginId: username || email, password });
      } else if (authMode === 'register') {
        const trimmedUser = username.trim();
        const trimmedEmail = email.trim();

        if (trimmedUser.length < 3) {
          setError('Username must be at least 3 characters long');
          setSubmitting(false);
          return;
        }

        if (usernameStatus === 'taken') {
          setError('This username is already taken. Please choose another username.');
          setSubmitting(false);
          return;
        }

        const res = await authAPI.register({
          username: trimmedUser,
          email: trimmedEmail,
          password,
          full_name: regFullName.trim() || trimmedUser
        });

        const { user: registeredUser, token: registeredToken } = res.data;
        localStorage.setItem('token', registeredToken);
        setTempUser(registeredUser);
        setTempToken(registeredToken);
        setFullName(registeredUser.full_name || regFullName.trim() || registeredUser.username);
        setAvatarUrl(registeredUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(registeredUser.username)}`);
        setAbout('Hey there! I am using Wavy.');
        setAuthMode('profile_setup');
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await authAPI.updateProfile({
        full_name: fullName.trim() || tempUser.username,
        about: about.trim() || 'Hey there! I am using Wavy.',
        avatar_url: avatarUrl
      });
      updateUser(res.data.user, tempToken);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipProfile = () => {
    if (tempUser && tempToken) {
      updateUser(tempUser, tempToken);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md ios-glass-card p-7 sm:p-8 transition-all">
        {/* iOS Sheet Handle */}
        <div className="ios-sheet-handle" />

        {/* Step 2: Profile Setup Screen */}
        {authMode === 'profile_setup' ? (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              {/* DP Circle with Camera Hover */}
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Click to choose a photo"
              >
                <img
                  src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                  alt="Profile Avatar"
                  className="w-24 h-24 rounded-full object-cover bg-slate-800 ring-4 ring-blue-500/30 shadow-xl transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition">
                  <Camera className="w-6 h-6 mb-0.5" />
                  <span className="text-[10px] font-medium">Change DP</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Photo Action Buttons */}
              <div className="flex items-center space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Random Avatar</span>
                </button>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight mt-4">
                Complete Your Profile
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Add your full name, bio, and profile picture to get started on Wavy.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                    className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                  />
                </div>
              </div>

              {/* Bio / About */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Bio / About
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                  className="w-full px-3 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ABOUT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAbout(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                        about === preset
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit & Skip Buttons */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 ios-tap"
              >
                <span>{submitting ? 'Saving Profile...' : 'Save & Start Chatting'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSkipProfile}
                  className="text-xs text-slate-400 hover:text-slate-200 transition ios-tap"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 1: Login, Register, Forgot Password */
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              {authMode !== 'login' && (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {authMode === 'register'
                      ? 'Create an Account'
                      : 'Reset Password'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {authMode === 'register'
                      ? 'Join Wavy with a unique username'
                      : 'Enter your username/email and a new password'}
                  </p>
                </>
              )}
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
              {/* Full Name field (above Username on Register) */}
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                      className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                    />
                  </div>
                </div>
              )}

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
                    style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                    className={`w-full pl-10 pr-10 py-2.5 !bg-slate-800 border rounded-xl !text-slate-100 focus:outline-none text-sm transition ${
                      authMode === 'register' && usernameStatus === 'available'
                        ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        : authMode === 'register' && (usernameStatus === 'taken' || usernameStatus === 'invalid')
                        ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                  {authMode === 'register' && username.trim() && (
                    <div className="absolute right-3 top-3">
                      {usernameStatus === 'checking' && (
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {usernameStatus === 'available' && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                      {usernameStatus === 'taken' && (
                        <X className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Real-time username availability indicator */}
                {authMode === 'register' && (
                  <div className="mt-1.5 min-h-[18px] flex items-center text-xs">
                    {!username.trim() ? (
                      <span className="text-slate-500">Enter a username to check availability</span>
                    ) : usernameStatus === 'checking' ? (
                      <span className="text-slate-400 flex items-center">
                        <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block mr-1.5" />
                        Checking availability...
                      </span>
                    ) : usernameStatus === 'available' ? (
                      <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400 inline-block mr-1" />
                        <span>Username is available</span>
                      </span>
                    ) : usernameStatus === 'taken' ? (
                      <span className="text-rose-400 font-semibold flex items-center space-x-1">
                        <X className="w-3.5 h-3.5 text-rose-400 inline-block mr-1" />
                        <span>Username is already taken</span>
                      </span>
                    ) : usernameStatus === 'invalid' ? (
                      <span className="text-amber-400 font-medium flex items-center space-x-1">
                        <Info className="w-3.5 h-3.5 text-amber-400 inline-block mr-1" />
                        <span>{usernameMessage}</span>
                      </span>
                    ) : null}
                  </div>
                )}
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
                      style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                      className="w-full pl-10 pr-4 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                      className="w-full pl-10 pr-10 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 transition"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
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
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
                      className="w-full pl-10 pr-10 py-2.5 !bg-slate-800 border border-slate-700/80 rounded-xl !text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 p-0.5 transition"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 ios-tap"
              >
                <span>
                  {submitting
                    ? 'Please wait...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : authMode === 'register'
                    ? 'Continue to Profile Setup'
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
          </>
        )}
      </div>
    </div>
  );
}
