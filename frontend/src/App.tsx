import { useEffect, useState } from 'react';
import {
  Activity,
  CreditCard,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">SubscriptIQ</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                Phase 1 MVP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* System Status Pill */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border bg-white shadow-xs">
              {loading ? (
                <span className="flex items-center text-slate-500">
                  <Activity className="h-3.5 w-3.5 animate-spin mr-1.5 text-teal-600" />
                  Connecting...
                </span>
              ) : health?.database === 'connected' ? (
                <span className="flex items-center text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  API & DB Online (:5001)
                </span>
              ) : (
                <span className="flex items-center text-amber-700 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                  Offline ({error || 'No Connection'})
                </span>
              )}
            </div>

            <a
              href="#demo-credentials"
              className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition shadow-sm"
            >
              Demo Credentials
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Hero Banner */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-8 text-white shadow-md relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Subscription Management Platform
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Centralized Recurring Billing, Invoicing & Metrics
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Designed for modern businesses to manage plans, track subscriber lifecycles, generate
              itemized invoices, and analyze recurring revenue in one cohesive dashboard.
            </p>
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
              Role-based isolation separating Administrator controls from Customer self-service portals.
            </p>
            <div className="pt-2 text-xs font-medium text-teal-600 flex items-center">
              Phase 2 Ready <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-slate-900 text-base">Plans & Subscriptions</h2>
            <p className="text-xs text-slate-500">
              Monthly and annual tier management with automated renewal date scheduling.
            </p>
            <div className="pt-2 text-xs font-medium text-indigo-600 flex items-center">
              Phase 3 Engine <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-slate-900 text-base">Billing & Invoicing</h2>
            <p className="text-xs text-slate-500">
              Itemized invoice generation with taxes, discounts, and simulated payment reconciliation.
            </p>
            <div className="pt-2 text-xs font-medium text-emerald-600 flex items-center">
              Phase 4 Engine <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-slate-900 text-base">Executive Analytics</h2>
            <p className="text-xs text-slate-500">
              MRR calculations, active subscriber counts, overdue invoice tracking, and customer portal.
            </p>
            <div className="pt-2 text-xs font-medium text-purple-600 flex items-center">
              Phase 5 Portal <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        </section>

        {/* Demo Credentials & Seed Data Section */}
        <section id="demo-credentials" className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Deterministic Demo Seed Data (REQ-DEV-01)</h2>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
              dev.db (SQLite)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Admin Account</span>
                <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-medium">Full Access</span>
              </div>
              <p className="text-sm font-mono text-slate-800">admin@subscriptiq.com</p>
              <p className="text-xs text-slate-500 font-mono">Password: admin123</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer Accounts</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">Portal Access</span>
              </div>
              <p className="text-sm font-mono text-slate-800">acme@example.com / globex@example.com</p>
              <p className="text-xs text-slate-500 font-mono">Password: customer123</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        SubscriptIQ — Subscription Management System &bull; Local macOS Execution
      </footer>
    </div>
  );
}
