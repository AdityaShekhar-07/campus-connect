import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, UserCheck, Shield, Sparkles, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchDemo, instantLogin } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'instant' | 'password'>('instant');
  const [instantName, setInstantName] = useState('');
  const [instantRole, setInstantRole] = useState<'STUDENT' | 'ORGANIZER'>('STUDENT');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = (location.state as any)?.from?.pathname;

  const handleInstantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const name = instantName.trim() || (instantRole === 'ORGANIZER' ? 'Campus Organizer' : 'Campus Student');
      const user = await instantLogin(name, instantRole);
      success(`Welcome, ${user.name}! Access granted.`);
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to enter.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      success(`Welcome back, ${user.name}!`);
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'STUDENT' | 'ORGANIZER') => {
    setErrorMsg('');
    setLoading(true);
    try {
      const user = await switchDemo(role);
      success(`Signed in as ${user.name} (${role.toLowerCase()}).`);
      if (role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to sign in with demo account.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50/50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-base mb-3 shadow-xs">
              CC
            </div>
            <h2 className="text-xl font-bold text-slate-900">CampusConnect Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Zero tokens or API keys required · Instant campus access
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('instant')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'instant'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Instant Access</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Password Sign-in</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          {activeTab === 'instant' ? (
            <div className="space-y-4">
              {/* Instant Name & Role form */}
              <form onSubmit={handleInstantSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="instantName">
                    Your Name (Optional)
                  </label>
                  <input
                    id="instantName"
                    type="text"
                    value={instantName}
                    onChange={(e) => setInstantName(e.target.value)}
                    placeholder="e.g. Alex, Maya, or your name"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInstantRole('STUDENT')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        instantRole === 'STUDENT'
                          ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Student</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Discover & register</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInstantRole('ORGANIZER')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        instantRole === 'ORGANIZER'
                          ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-600" />
                        <span>Organizer</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Create & manage</div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Entering platform...</span>
                  ) : (
                    <>
                      <span>Enter as {instantRole === 'ORGANIZER' ? 'Organizer' : 'Student'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Pre-Seeded Profiles */}
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Or One-Click Demo Profiles
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('STUDENT')}
                    disabled={loading}
                    className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium text-center"
                  >
                    Jordan (Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('ORGANIZER')}
                    disabled={loading}
                    className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs text-slate-700 font-medium text-center"
                  >
                    Alex (Organizer)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Traditional Password Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campusconnect.demo"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Zero configuration required. All sessions run locally in secure sandbox storage.
          </div>
        </div>
      </div>
    </div>
  );
};
