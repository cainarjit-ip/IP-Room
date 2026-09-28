import React, { useEffect, useState } from 'react';
import { UserProfile, UserRole, Language } from '../types';
import { getTranslation } from '../data/translations';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  School,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithFacebook,
  registerWithEmail,
  loginWithEmail,
  sendPasswordResetEmail,
  logoutUser,
} from '../services/supabase';

interface AuthModalProps {
  language: Language;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
}

// Nepal mobile numbers: optional +977, then 97/98 + 8 digits
const NEPAL_PHONE_REGEX = /^(\+977)?9[78]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal: React.FC<AuthModalProps> = ({
  language,
  onClose,
  onSuccess,
  initialMode = 'login',
  initialRole = 'renter',
}) => {
  const t = getTranslation(language);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  // Admin role is only allowed in login mode
  const [role, setRole] = useState<UserRole>(
    initialMode === 'signup' && initialRole === 'admin' ? 'renter' : initialRole
  );
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+977 98');
  const [university, setUniversity] = useState('Tribhuvan University (Central Campus)');

  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | 'email' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Close modal with Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Social sign-in must never carry the admin role (client-side role can't be trusted)
  const socialRole: UserRole = role === 'admin' ? 'renter' : role;

  const handleGoogleAuth = async () => {
    setLoadingProvider('google');
    setErrorMsg('');
    try {
      await loginWithGoogle(socialRole);
      // On success the OAuth redirect leaves the page, so keep the spinner
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setErrorMsg(err?.message || 'Google sign-in could not be completed. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleFacebookAuth = async () => {
    setLoadingProvider('facebook');
    setErrorMsg('');
    try {
      await loginWithFacebook(socialRole);
    } catch (err: any) {
      console.warn('Facebook sign-in error:', err);
      setErrorMsg(err?.message || 'Facebook sign-in could not be completed. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingProvider !== null) return;
    setLoadingProvider('email');
    setErrorMsg('');

    let succeeded = false;

    try {
      // ---- Forgot password ----
      if (isForgotPassword) {
        if (!EMAIL_REGEX.test(email.trim())) {
          setErrorMsg('Please enter a valid email address to receive reset instructions.');
          return;
        }
        const res = await sendPasswordResetEmail(email.trim());
        if (res?.error) {
          setErrorMsg(res.error);
        } else {
          setResetEmailSent(true);
        }
        return;
      }

      // ---- Sign up ----
      if (mode === 'signup') {
        if (!name.trim()) {
          setErrorMsg('Please enter your full legal name.');
          return;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          return;
        }
        const cleanPhone = phone.replace(/[\s-]/g, '');
        if (!NEPAL_PHONE_REGEX.test(cleanPhone)) {
          setErrorMsg('Please enter a valid Nepal mobile number, e.g. +977 98XXXXXXXX.');
          return;
        }

        const profile = await registerWithEmail(
          email.trim(),
          password,
          name.trim(),
          role,
          cleanPhone,
          role === 'renter' ? university.trim() : undefined
        );
        succeeded = true;
        onSuccess(profile);
        onClose();
        return;
      }

      // ---- Login ----
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }

      const profile = await loginWithEmail(email.trim(), password);

      // If the user chose Admin sign-in, verify the account really has the admin role.
      // NOTE: this is only a UI check. Real admin access must be enforced on the server
      // (Supabase RLS policies on the profiles table).
      if (role === 'admin' && profile.role !== 'admin') {
        await logoutUser(); // don't leave a non-admin session open
        setErrorMsg('This account does not have administrator privileges.');
        return;
      }

      succeeded = true;
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      // Don't update state if the modal is closing after success
      if (!succeeded) setLoadingProvider(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                IP
              </div>
              <h2 className="font-bold text-base">
                {mode === 'login'
                  ? language === 'np' ? 'IP Room मा लगइन' : 'Sign in to IP Room'
                  : language === 'np' ? 'नयाँ खाता सिर्जना गर्नुहोस्' : 'Create an IP Room Account'}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Connecting students and verified room owners across Nepal
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Mode tabs */}
          {!isForgotPassword && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'np' ? 'लगइन' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  if (role === 'admin') setRole('renter');
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {language === 'np' ? 'नयाँ दर्ता' : 'Create Account'}
              </button>
            </div>
          )}

          {/* Social buttons (hidden for admin, since admin uses email login only) */}
          {!isForgotPassword && mode === 'login' && role !== 'admin' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loadingProvider !== null}
                className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loadingProvider === 'google' ? (
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookAuth}
                disabled={loadingProvider !== null}
                className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loadingProvider === 'facebook' ? (
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Continue with Facebook</span>
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
                  or with email
                </span>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs"
            >
              {errorMsg}
            </div>
          )}

          {resetEmailSent && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Password Reset Link Sent!</p>
                <p className="text-[11px] mt-0.5">
                  Check your inbox for the password reset email.
                </p>
              </div>
            </div>
          )}

          {/* Role selector (not needed for password reset) */}
          {!isForgotPassword && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 text-xs">
                Select Role:
              </label>
              <div className={`grid ${mode === 'login' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  type="button"
                  onClick={() => setRole('renter')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition flex items-center justify-between ${
                    role === 'renter'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>🎓 {t.roleStudent}</span>
                  {role === 'renter' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition flex items-center justify-between ${
                    role === 'owner'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>🏠 {t.roleOwner}</span>
                  {role === 'owner' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-left transition flex items-center justify-between ${
                      role === 'admin'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-1 ring-purple-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>🛡️ Admin</span>
                    {role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && !isForgotPassword && (
              <div>
                <label htmlFor="auth-name" className="font-semibold text-slate-700 block mb-1 text-xs">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Ramesh Shrestha"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="font-semibold text-slate-700 block mb-1 text-xs">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. user@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="font-semibold text-slate-700 text-xs">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setResetEmailSent(false);
                        setErrorMsg('');
                      }}
                      className="text-[11px] text-emerald-700 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && !isForgotPassword && (
              <div>
                <label htmlFor="auth-phone" className="font-semibold text-slate-700 block mb-1 text-xs">
                  Mobile Number (Nepal)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="auth-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+977 98XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && role === 'renter' && !isForgotPassword && (
              <div>
                <label htmlFor="auth-university" className="font-semibold text-slate-700 block mb-1 text-xs">
                  College / University (Campus)
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="auth-university"
                    type="text"
                    placeholder="e.g. Pulchowk Engineering Campus, TU"
                    value={university}
                    onChange={e => setUniversity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetEmailSent(false);
                  setErrorMsg('');
                }}
                className="text-xs text-slate-500 hover:underline block pt-1"
              >
                ← Back to Login
              </button>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loadingProvider !== null}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
            >
              {loadingProvider === 'email' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : isForgotPassword ? (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
