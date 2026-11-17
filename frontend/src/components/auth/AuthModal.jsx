import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestPasswordReset, confirmPasswordReset } from '../../api/client';
import logoImg from '../../assets/logo.jpg';
import { 
  X, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function AuthModal({ initialView = 'login', initialUid = '', initialToken = '', onClose }) {
  const { login, register } = useAuth();
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'forgot' | 'reset'

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uid, setUid] = useState(initialUid);
  const [token, setToken] = useState(initialToken);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const switchView = (newView) => {
    clearMessages();
    setView(newView);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (view === 'login') {
        if (!email || !password) throw new Error('Please fill in both email and password.');
        await login({ email, password });
        onClose?.();
      } else if (view === 'register') {
        if (!fullName || !email || !password) throw new Error('All fields are mandatory.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await register({ full_name: fullName, email, password });
        onClose?.();
      } else if (view === 'forgot') {
        if (!email) throw new Error('Please enter your registered email address.');
        const res = await requestPasswordReset(email);
        setSuccessMessage(res.message || 'If registered, a password recovery link has been dispatched to your email.');
      } else if (view === 'reset') {
        if (!password) throw new Error('Please provide a new password.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!uid || !token) throw new Error('Missing or invalid reset token parameters.');
        
        const res = await confirmPasswordReset({ uid, token, new_password: password });
        setSuccessMessage(res.message || 'Password reset successfully. You can now log in.');
        setTimeout(() => switchView('login'), 2000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      
      {/* Backdrop tap to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Sheet / Dialog */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-100/80 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="relative px-6 pt-6 pb-4 border-b border-amber-100/60 bg-gradient-to-b from-amber-50/50 to-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-md shadow-orange-500/20 border border-amber-200/50 shrink-0">
              <img src={logoImg} alt="ApnaWallet" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {view === 'login' && 'Welcome Back'}
                {view === 'register' && 'Create Your Wallet'}
                {view === 'forgot' && 'Reset Password'}
                {view === 'reset' && 'Set New Password'}
              </h3>
              <p className="text-xs text-slate-500">
                {view === 'login' && 'Log in to access your finances and accounts.'}
                {view === 'register' && 'Sign up to get your default Personal account.'}
                {view === 'forgot' && 'Enter your email to receive recovery instructions.'}
                {view === 'reset' && 'Create a strong, new password for your account.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Registration only) */}
            {view === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            {view !== 'reset' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Password Field (Login, Register, Reset) */}
            {view !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {view === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register, Reset) */}
            {(view === 'register' || view === 'reset') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-hidden transition-all bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {view === 'login' && 'Sign In to ApnaWallet'}
                    {view === 'register' && 'Create Account'}
                    {view === 'forgot' && 'Send Recovery Email'}
                    {view === 'reset' && 'Update Password'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
            {view === 'login' && (
              <p>
                Don't have an ApnaWallet account?{' '}
                <button
                  onClick={() => switchView('register')}
                  className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  Register now
                </button>
              </p>
            )}

            {view === 'register' && (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => switchView('login')}
                  className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}

            {(view === 'forgot' || view === 'reset') && (
              <button
                onClick={() => switchView('login')}
                className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                ← Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
