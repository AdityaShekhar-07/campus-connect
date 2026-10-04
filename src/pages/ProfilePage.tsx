import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Shield, Calendar, LogOut, ArrowRightLeft } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, switchDemo } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully.');
    navigate('/login');
  };

  const handleSwitch = async (role: 'STUDENT' | 'ORGANIZER') => {
    await switchDemo(role);
    success(`Switched account to demo ${role.toLowerCase()}.`);
    if (role === 'ORGANIZER') {
      navigate('/organizer');
    } else {
      navigate('/events');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Not signed in</h2>
        <p className="text-xs text-slate-500 mb-4">Please log in to view your profile.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header banner */}
        <div className="h-20 bg-slate-100 border-b border-slate-200 flex items-end px-6 pb-3">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg border-2 border-white shadow-xs">
            {user.name.charAt(0)}
          </div>
        </div>

        <div className="p-6 pt-4 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
            <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()} Account</p>
          </div>

          {/* Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </span>
              <span className="font-mono text-slate-800 font-medium">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Role
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                {user.role}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Account ID
              </span>
              <span className="font-mono text-slate-600">{user.id}</span>
            </div>
          </div>

          {/* Demo account quick switch */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switch Demo Account</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Instantly toggle between Jordan Hayes (Student) and Alex Rivera (Organizer) to review workflows.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSwitch('STUDENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  user.role === 'STUDENT'
                    ? 'bg-white border-slate-300 font-bold shadow-xs'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Student Demo
              </button>
              <button
                type="button"
                onClick={() => handleSwitch('ORGANIZER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  user.role === 'ORGANIZER'
                    ? 'bg-white border-slate-300 font-bold shadow-xs'
                    : 'bg-transparent border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Organizer Demo
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to={user.role === 'ORGANIZER' ? '/organizer' : '/events'}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              &larr; Back to {user.role === 'ORGANIZER' ? 'Dashboard' : 'Events'}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
