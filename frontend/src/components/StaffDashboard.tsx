import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import {
  Users,
  Layers,
  CreditCard,
  FileText,
  ArrowRight,
  Shield,
  Lock,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface StaffDashboardProps {
  onNavigate: (tab: string) => void;
}

interface StatsData {
  metrics: {
    totalCustomers: number;
    activeSubscriptionsCount: number;
    mrr: number;
    arr: number;
    invoices: {
      unpaidCount: number;
      unpaidAmount: number;
      overdueCount: number;
      overdueAmount: number;
      paidCount: number;
      paidTotalAmount: number;
    };
  };
  upcomingRenewals: Array<{
    subscriptionId: string;
    customerName: string;
    companyName: string;
    planName: string;
    renewalDate: string;
    daysUntilRenewal: number;
    isUrgent7Day: boolean;
  }>;
  activityFeed: Array<{
    id: string;
    type: 'PAYMENT' | 'SUBSCRIPTION';
    title: string;
    description: string;
    timestamp: string;
    customerName: string;
  }>;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate }) => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const canViewReports = hasPermission('view_reports');
  const canManageCustomers = hasPermission('manage_customers');
  const canManagePlans = hasPermission('manage_plans');
  const canManageSubs = hasPermission('manage_subscriptions');
  const canManageInvoices = hasPermission('manage_invoices');
  const canManagePayments = hasPermission('manage_payments');

  useEffect(() => {
    if (canViewReports) {
      setLoadingStats(true);
      apiClient<StatsData>('/api/dashboard/stats')
        .then((data) => setStats(data))
        .catch(() => setStats(null))
        .finally(() => setLoadingStats(false));
    }
  }, [canViewReports]);

  const permissionsList = user?.permissions || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Staff Welcome Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Staff Operations Portal
            </span>
            <span className="text-xs text-slate-300 font-mono">
              Signed in as: <strong className="text-white">{user?.name}</strong> ({user?.email})
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Operational Dashboard
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Welcome to the SubscriptIQ operational workspace. Your role grants selective access to customer
            records, subscriptions, billing pipelines, and reconciliation modules according to assigned security policies.
          </p>

          {/* Active Permissions Badges */}
          <div className="pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Assigned Permissions ({permissionsList.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {permissionsList.length > 0 ? (
                permissionsList.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-mono"
                  >
                    ✓ {perm}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No operational permissions assigned yet.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Operational Metrics (if view_reports is granted) */}
      {canViewReports && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <span>Executive Operational Summary</span>
              {loadingStats && <Loader2 className="h-4 w-4 animate-spin text-teal-600 ml-2" />}
            </h2>
            <span className="text-xs text-slate-500 font-mono">Live Sync</span>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-slate-500">Active Subscriptions</div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {stats.metrics.activeSubscriptionsCount}
                </div>
                <div className="text-[11px] text-teal-600 font-medium">
                  MRR: ${stats.metrics.mrr.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-slate-500">Total Customers</div>
                <div className="text-2xl font-extrabold text-slate-900">
                  {stats.metrics.totalCustomers}
                </div>
                <div className="text-[11px] text-slate-500">Managed Accounts</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-slate-500">Unpaid Invoices</div>
                <div className="text-2xl font-extrabold text-amber-600">
                  {stats.metrics.invoices.unpaidCount}
                </div>
                <div className="text-[11px] text-slate-500">
                  ${stats.metrics.invoices.unpaidAmount.toFixed(2)} balance
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-xs font-semibold text-slate-500">Overdue Invoices</div>
                <div className="text-2xl font-extrabold text-rose-600">
                  {stats.metrics.invoices.overdueCount}
                </div>
                <div className="text-[11px] text-rose-600 font-medium">
                  ${stats.metrics.invoices.overdueAmount.toFixed(2)} overdue
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Action Workspaces Grid */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Operations Workspaces</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Customers Card */}
          <div
            className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
              canManageCustomers
                ? 'border-slate-200 hover:border-teal-500 hover:shadow-sm'
                : 'border-slate-200/60 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    canManageCustomers ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                {canManageCustomers ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PERMITTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center">
                    <Lock className="h-3 w-3 mr-1" /> RESTRICTED
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Customer Directory</h3>
                <p className="text-xs text-slate-500 mt-1">
                  View registered customer profiles, billing addresses, and linked subscriptions.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              {canManageCustomers ? (
                <button
                  onClick={() => onNavigate('subscriptions')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <span>Open Customers</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 italic text-center">
                  Requires <span className="font-mono">manage_customers</span>
                </div>
              )}
            </div>
          </div>

          {/* Subscriptions Card */}
          <div
            className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
              canManageSubs
                ? 'border-slate-200 hover:border-teal-500 hover:shadow-sm'
                : 'border-slate-200/60 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    canManageSubs ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Layers className="h-5 w-5" />
                </div>
                {canManageSubs ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PERMITTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center">
                    <Lock className="h-3 w-3 mr-1" /> RESTRICTED
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Subscription Management</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assign pricing plans to customer profiles, view renewal cycles, and process cancellations.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              {canManageSubs ? (
                <button
                  onClick={() => onNavigate('subscriptions')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <span>Open Subscriptions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 italic text-center">
                  Requires <span className="font-mono">manage_subscriptions</span>
                </div>
              )}
            </div>
          </div>

          {/* Invoicing & Billing Card */}
          <div
            className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
              canManageInvoices || canManagePayments
                ? 'border-slate-200 hover:border-teal-500 hover:shadow-sm'
                : 'border-slate-200/60 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    canManageInvoices || canManagePayments
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                {canManageInvoices || canManagePayments ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PERMITTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center">
                    <Lock className="h-3 w-3 mr-1" /> RESTRICTED
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Invoicing & Collections</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issue itemized invoices, monitor unpaid accounts, and record payment settlements.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              {canManageInvoices || canManagePayments ? (
                <button
                  onClick={() => onNavigate('invoices')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <span>Open Invoices</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 italic text-center">
                  Requires <span className="font-mono">manage_invoices</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Catalog Card */}
          <div
            className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
              canManagePlans
                ? 'border-slate-200 hover:border-teal-500 hover:shadow-sm'
                : 'border-slate-200/60 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    canManagePlans ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                </div>
                {canManagePlans ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PERMITTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center">
                    <Lock className="h-3 w-3 mr-1" /> RESTRICTED
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Product Catalog & Plans</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage subscription tier pricing, feature lists, billing intervals, and active status.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => onNavigate('plans')}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <span>{canManagePlans ? 'Manage Plans' : 'View Plans'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Renewals Queue (if view_reports is granted) */}
      {canViewReports && stats && stats.upcomingRenewals.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Upcoming Renewals Radar (Next 30 Days)</span>
            </h2>
            <span className="text-xs text-slate-500">
              {stats.upcomingRenewals.length} accounts renewing soon
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.upcomingRenewals.map((renewal) => (
              <div
                key={renewal.subscriptionId}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{renewal.companyName}</div>
                  <div className="text-slate-500 text-[11px]">{renewal.planName} Plan</div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      renewal.isUrgent7Day
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Renews in {renewal.daysUntilRenewal} {renewal.daysUntilRenewal === 1 ? 'day' : 'days'}
                  </span>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    {new Date(renewal.renewalDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Security Boundary Notice */}
      <section className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start space-x-3">
        <Shield className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800">Role-Based Security Policy Notice:</span>
          <p>
            As a staff member, your actions are validated server-side by cryptographically signed JWT tokens and permission gates.
            Administrative configurations, system settings, and staff account creations can only be performed by System Administrators.
          </p>
        </div>
      </section>
    </div>
  );
};
