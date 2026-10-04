import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  Layers,
  User as UserIcon,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Compass,
  ArrowRightLeft,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isStudent, isOrganizer, logout, switchDemo } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleLogout = async () => {
    await logout();
    success('Signed out successfully.');
    navigate('/login');
  };

  const handleQuickSwitch = async (targetRole: 'STUDENT' | 'ORGANIZER') => {
    try {
      setSwitchingRole(true);
      await switchDemo(targetRole);
      success(`Switched demo account to ${targetRole.toLowerCase()}.`);
      if (targetRole === 'ORGANIZER') {
        navigate('/organizer');
      } else {
        navigate('/events');
      }
    } finally {
      setSwitchingRole(false);
      setMobileMenuOpen(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'text-slate-900 bg-slate-100 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg text-base font-medium ${
      isActive
        ? 'text-slate-900 bg-slate-100 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link to={isOrganizer ? '/organizer' : '/events'} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                CC
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                CampusConnect
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                isOrganizer ? (
                  <>
                    <NavLink to="/organizer" end className={navLinkClass}>
                      Dashboard
                    </NavLink>
                    <NavLink to="/organizer/events/new" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4" />
                        Create Event
                      </span>
                    </NavLink>
                    <NavLink to="/events" className={navLinkClass}>
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4" />
                        Student View
                      </span>
                    </NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/events" className={navLinkClass}>
                      Events
                    </NavLink>
                    <NavLink to="/registrations" className={navLinkClass}>
                      My Registrations
                    </NavLink>
                  </>
                )
              ) : (
                <NavLink to="/events" className={navLinkClass}>
                  Browse Events
                </NavLink>
              )}
            </nav>
          </div>

          {/* Right Area: Auth, Role Switcher, Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSwitch('STUDENT')}
                disabled={switchingRole}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  isStudent
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch demo to Student (Jordan)"
              >
                Student Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('ORGANIZER')}
                disabled={switchingRole}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  isOrganizer
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch demo to Organizer (Alex)"
              >
                Organizer Demo
              </button>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                    {user?.name.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                      {user?.name}
                    </div>
                    <div className="text-[10px] text-slate-500 capitalize">{user?.role.toLowerCase()}</div>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          {/* Quick Demo Switcher Mobile */}
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-1.5 px-1 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3" /> Quick Switch Demo Account:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickSwitch('STUDENT')}
                className={`py-1.5 text-xs rounded-md font-medium text-center border ${
                  isStudent ? 'bg-white border-slate-300 font-bold shadow-xs' : 'bg-transparent border-transparent text-slate-600'
                }`}
              >
                Student (Jordan)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitch('ORGANIZER')}
                className={`py-1.5 text-xs rounded-md font-medium text-center border ${
                  isOrganizer ? 'bg-white border-slate-300 font-bold shadow-xs' : 'bg-transparent border-transparent text-slate-600'
                }`}
              >
                Organizer (Alex)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {isAuthenticated ? (
              isOrganizer ? (
                <>
                  <NavLink to="/organizer" end className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Organizer Dashboard
                  </NavLink>
                  <NavLink to="/organizer/events/new" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Create New Event
                  </NavLink>
                  <NavLink to="/events" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Browse Events (Student View)
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/events" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    Discover Events
                  </NavLink>
                  <NavLink to="/registrations" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    My Registrations
                  </NavLink>
                </>
              )
            ) : (
              <NavLink to="/events" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
                Browse Events
              </NavLink>
            )}
            <NavLink to="/profile" className={mobileNavLinkClass} onClick={() => setMobileMenuOpen(false)}>
              My Profile
            </NavLink>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium text-slate-800">{user?.name} ({user?.role.toLowerCase()})</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 font-medium py-1 px-2 hover:bg-rose-50 rounded"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 text-center text-sm font-semibold bg-slate-900 text-white rounded-lg"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
