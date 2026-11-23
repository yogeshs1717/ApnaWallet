import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestPasswordReset, confirmPasswordReset } from '../../api/client';
import WalletMascot from '../WalletMascot';
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
  const [devResetUrl, setDevResetUrl] = useState(null);
  const dialogRef = useRef(null);

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setDevResetUrl(null);
  };

  const switchView = (newView) => {
    clearMessages();
    setView(newView);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

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
        setDevResetUrl(null);
        const res = await requestPasswordReset(email);
        setSuccessMessage(res.message || 'If registered, a password recovery link has been dispatched to your email.');
        if (res.dev_reset_url) {
          setDevResetUrl(res.dev_reset_url);
        }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-4" role="presentation">
      
      {/* Backdrop tap to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Dialog */}
      <div 
        ref={dialogRef} 
        tabIndex="-1" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="auth-dialog-title" 
        className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[36px] border border-stone-200/80 bg-white shadow-2xl outline-none animate-in slide-in-from-bottom duration-200 sm:max-w-md sm:rounded-[36px] sm:zoom-in-95"
      >
        {/* Header Bar with Deep Plum & Mascot */}
        <div className="relative px-6 pt-6 pb-5 bg-[#331B24] text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FFA64D]/20 border border-[#FFA64D]/40 flex items-center justify-center shrink-0">
              <WalletMascot className="w-10 h-8" />
            </div>
            <div>
              <h3 id="auth-dialog-title" className="text-xl font-extrabold tracking-tight text-[#FAF6F0]">
                {view === 'login' && 'Welcome Back'}
                {view === 'register' && 'Create ApnaWallet'}
                {view === 'forgot' && 'Reset Password'}
                {view === 'reset' && 'Set New Password'}
              </h3>
              <p className="text-xs text-[#D2B4ED] mt-0.5">
                {view === 'login' && 'Log in to access your finances and accounts.'}
                {view === 'register' && 'Sign up to get your default Personal account.'}
                {view === 'forgot' && 'Enter your email to receive recovery instructions.'}
                {view === 'reset' && 'Create a strong, new password for your account.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <div className="space-y-4 overflow-y-auto p-5 sm:p-7">
          
          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#E4F5EE] border border-[#075743]/20 text-[#075743] text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold space-y-2">
                <div>{successMessage}</div>
                {devResetUrl && (
                  <div className="pt-1">
                    <a
                      href={devResetUrl}
                      className="inline-block px-4 py-2 bg-[#FF902B] hover:bg-[#E0791B] text-white font-extrabold rounded-full text-xs shadow-xs transition-colors"
                    >
                      Open Password Reset Link →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Registration only) */}
            {view === 'register' && (
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-[#FF902B] focus:ring-2 focus:ring-[#FF902B]/20 text-sm text-[#24151B] placeholder:text-stone-400 outline-none transition-all bg-[#FAF6F0] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            {view !== 'reset' && (
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-[#FF902B] focus:ring-2 focus:ring-[#FF902B]/20 text-sm text-[#24151B] placeholder:text-stone-400 outline-none transition-all bg-[#FAF6F0] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Password Field (Login, Register, Reset) */}
            {view !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">
                    {view === 'reset' ? 'New Password' : 'Password'}
                  </label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-bold text-[#FF902B] hover:text-[#E0791B] cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-11 pr-12 py-3 rounded-2xl border border-stone-200 focus:border-[#FF902B] focus:ring-2 focus:ring-[#FF902B]/20 text-sm text-[#24151B] placeholder:text-stone-400 outline-none transition-all bg-[#FAF6F0] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
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
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 focus:border-[#FF902B] focus:ring-2 focus:ring-[#FF902B]/20 text-sm text-[#24151B] placeholder:text-stone-400 outline-none transition-all bg-[#FAF6F0] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Action Submit Button (Electric Lime Pill) */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-full bg-[#C5F52A] px-4 py-3.5 text-sm font-extrabold text-[#1C1014] shadow-md hover:bg-[#B4E81E] active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1C1014]" />
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
          <div className="pt-3 border-t border-stone-100 text-center text-xs text-stone-500">
            {view === 'login' && (
              <p>
                Don't have an ApnaWallet account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="font-extrabold text-[#FF902B] hover:text-[#E0791B] cursor-pointer"
                >
                  Register now
                </button>
              </p>
            )}

            {view === 'register' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="font-extrabold text-[#FF902B] hover:text-[#E0791B] cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}

            {(view === 'forgot' || view === 'reset') && (
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-extrabold text-[#FF902B] hover:text-[#E0791B] cursor-pointer"
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
