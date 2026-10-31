import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { PlansManager } from './components/PlansManager';
import { SubscriptionsManager } from './components/SubscriptionsManager';
import { CustomerSubscriptionView } from './components/CustomerSubscriptionView';
import { InvoicesManager } from './components/InvoicesManager';
import { CustomerInvoicesView } from './components/CustomerInvoicesView';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import {
  Shield,
  Users,
  CreditCard,
  Layers,
  CheckCircle2,
  Database,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

function DashboardContent() {
  const { isAuthenticated, isAdmin, isCustomer } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiConnected={apiConnected}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* TAB VIEW: PLANS MANAGEMENT */}
        {activeTab === 'plans' && <PlansManager />}

        {/* TAB VIEW: SUBSCRIPTIONS MANAGEMENT */}
        {activeTab === 'subscriptions' && (
          isAdmin ? <SubscriptionsManager /> : <CustomerSubscriptionView />
        )}

        {/* TAB VIEW: INVOICES & SIMULATED PAYMENTS */}
        {activeTab === 'invoices' && (
          isAdmin ? <InvoicesManager /> : <CustomerInvoicesView />
        )}

        {/* TAB VIEW: OVERVIEW (DEFAULT DASHBOARD) */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* CONDITIONAL VIEW: ADMINISTRATOR DASHBOARD */}
            {isAuthenticated && isAdmin && (
              <ExecutiveDashboard onNavigate={setActiveTab} />
            )}

            {/* CONDITIONAL VIEW: CUSTOMER SELF-SERVICE PORTAL */}
            {isAuthenticated && isCustomer && (
              <CustomerPortal onNavigate={setActiveTab} />
            )}

            {/* CONDITIONAL VIEW: PUBLIC / UNAUTHENTICATED HERO */}
            {!isAuthenticated && (
              <>
                <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-8 sm:p-10 text-white shadow-md relative overflow-hidden">
                  <div className="max-w-2xl relative z-10 space-y-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Full-Stack Subscription MVP Complete
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      Subscription Management System (SubscriptIQ)
                    </h1>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                      Create flexible pricing plans, subscribe customers, track automated renewal dates,
                      reconcile itemized invoices with simulated payments, and monitor MRR metrics.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition shadow-sm flex items-center space-x-2"
                      >
                        <span>Open Sign In Modal</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab('plans')}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <span>Browse Plans</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Feature Cards Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Shield className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-base">Authentication & RBAC</h2>
                    <p className="text-xs text-slate-500">
                      Timing-safe JWT validation and role isolation separating Administrators from Customers.
                    </p>
                    <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified in Phase 2
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('plans')}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2 cursor-pointer hover:border-teal-400 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Layers className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-base">Plans & Subscriptions</h2>
                    <p className="text-xs text-slate-500">
                      Monthly and annual tier configuration with automatic next-renewal scheduling.
                    </p>
                    <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified in Phase 3
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('invoices')}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2 cursor-pointer hover:border-teal-400 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-base">Billing & Invoicing</h2>
                    <p className="text-xs text-slate-500">
                      Itemized invoices, tax calculations, and simulated payment settlements.
                    </p>
                    <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified in Phase 4
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-slate-900 text-base">Executive Analytics</h2>
                    <p className="text-xs text-slate-500">
                      Live MRR calculations, subscriber retention, overdue alerts, and customer portal.
                    </p>
                    <div className="pt-2 text-xs font-semibold text-emerald-600 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verified in Phase 5
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Seeded Accounts Reference */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Seeded Accounts (Click 'Sign In' to Quick-Fill)
                  </h2>
                </div>
                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                  dev.db (SQLite)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-800">Administrator</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">ADMIN</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-800">admin@subscriptiq.com</p>
                  <p className="text-xs text-slate-500 font-mono">admin123</p>
                </div>

                <div className="p-4 rounded-lg bg-teal-50/50 border border-teal-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Acme Corp</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-medium">CUSTOMER</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-800">acme@example.com</p>
                  <p className="text-xs text-slate-500 font-mono">customer123</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Globex Corp</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">CUSTOMER</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-800">globex@example.com</p>
                  <p className="text-xs text-slate-500 font-mono">customer123</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        SubscriptIQ &bull; Full-Stack Subscription Management System (MVP Complete)
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
