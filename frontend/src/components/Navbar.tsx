import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Shield,
  Users,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  UserCog,
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
  const { user, isAuthenticated, isAdmin, isStaff, isCustomer, hasPermission, logout, login } = useAuth();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async (email: string, pass: string) => {
    try {
      setSwitching(true);
      setDemoMenuOpen(false);
      await login({ email, password: pass });
      setActiveTab('overview');
    } catch {
      // ignore
    } finally {
      setSwitching(false);
    }
  };

  const canStaffViewSubs = hasPermission('manage_subscriptions') || hasPermission('manage_customers');
  const canStaffViewInvoices = hasPermission('manage_invoices') || hasPermission('manage_payments');

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
                RBAC Enabled
              </span>
            </div>
          </div>

          {/* Navigation Links based on role */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              {/* ADMIN Navigation */}
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
                    onClick={() => setActiveTab('staff')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center space-x-1 ${
                      activeTab === 'staff'
                        ? 'bg-purple-700 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    <span>Staff</span>
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

              {/* STAFF Navigation */}
              {isStaff && (
                <>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'overview'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Operations Hub
                  </button>
                  {canStaffViewSubs && (
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
                  )}
                  {canStaffViewInvoices && (
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
                  )}
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
                </>
              )}

              {/* CUSTOMER Navigation */}
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
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      activeTab === 'plans'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Browse Plans
                  </button>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right side: Demo Switcher, System health status & User Profile */}
        <div className="flex items-center space-x-3">
          {/* Quick Demo Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setDemoMenuOpen(!demoMenuOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition"
              title="Quickly switch between Admin, Staff, and Customer accounts"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Role Switcher</span>
              <ChevronDown className="w-3 h-3 text-indigo-400" />
            </button>

            {demoMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Instant Role Persona Switch (3 Roles)
                </div>

                {/* Admin */}
                <button
                  disabled={switching}
                  onClick={() => handleQuickSwitch('admin@subscriptiq.com', 'admin123')}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50/50 flex items-center justify-between transition border-b border-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900">System Administrator</div>
                    <div className="text-[10px] text-slate-500 font-mono">admin@subscriptiq.com</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    ADMIN
                  </span>
                </button>

                {/* Staff */}
                <button
                  disabled={switching}
                  onClick={() => handleQuickSwitch('staff@subscriptiq.com', 'staff123')}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50/50 flex items-center justify-between transition border-b border-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900">Sarah Jenkins (Operations)</div>
                    <div className="text-[10px] text-slate-500 font-mono">staff@subscriptiq.com</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    STAFF
                  </span>
                </button>

                {/* Customers */}
                <button
                  disabled={switching}
                  onClick={() => handleQuickSwitch('acme@example.com', 'customer123')}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50/50 flex items-center justify-between transition border-b border-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900">Acme Corp (Alice)</div>
                    <div className="text-[10px] text-slate-500 font-mono">acme@example.com</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">
                    CUSTOMER
                  </span>
                </button>

                <button
                  disabled={switching}
                  onClick={() => handleQuickSwitch('globex@example.com', 'customer123')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">Globex Corp (Bob)</div>
                    <div className="text-[10px] text-slate-500 font-mono">globex@example.com</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    CUSTOMER
                  </span>
                </button>
              </div>
            )}
          </div>

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
                    : isStaff
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}
              >
                {isAdmin ? (
                  <Shield className="h-3 w-3 mr-0.5" />
                ) : isStaff ? (
                  <UserCog className="h-3 w-3 mr-0.5" />
                ) : (
                  <Users className="h-3 w-3 mr-0.5" />
                )}
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
