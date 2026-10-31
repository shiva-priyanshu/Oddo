import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Shield,
  Users,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  apiConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  activeTab,
  setActiveTab,
  apiConnected,
}) => {
  const { user, isAuthenticated, isAdmin, isCustomer, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center space-x-3 cursor-pointer select-none"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">SubscriptIQ</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                Phase 2 Auth
              </span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'overview'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'plans'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Plans
                  </button>
                  <button
                    onClick={() => setActiveTab('subscriptions')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'subscriptions'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Subscriptions
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'invoices'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Invoices
                  </button>
                </>
              )}

              {isCustomer && (
                <>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'overview'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Subscription
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'invoices'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    My Invoices & Receipts
                  </button>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right side: System health status & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Health probe status pill */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-xs">
            {apiConnected ? (
              <span className="flex items-center text-emerald-700">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                API Online
              </span>
            ) : (
              <span className="flex items-center text-amber-700">
                <AlertCircle className="h-3 w-3 mr-1 text-amber-600" />
                Connecting...
              </span>
            )}
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              {/* Role pill badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}
              >
                {isAdmin ? <Shield className="h-3 w-3 mr-0.5" /> : <Users className="h-3 w-3 mr-0.5" />}
                <span>{user.role}</span>
              </span>

              {/* User Identity */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
