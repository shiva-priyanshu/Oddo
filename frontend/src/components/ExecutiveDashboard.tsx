import React, { useState, useEffect } from 'react';
import { DashboardStatsResponse } from '../types/dashboard';
import { apiClient } from '../lib/api';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Shield,
  CreditCard,
  UserCheck,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ExecutiveDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<DashboardStatsResponse>('/api/dashboard/stats');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Loading Executive Analytics...</p>
        <p className="text-xs text-slate-400">Aggregating MRR, active subscribers, and renewal timelines</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-3">
        <div className="flex items-center space-x-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Error loading executive dashboard</span>
        </div>
        <p>{error || 'An unexpected error occurred.'}</p>
        <button
          onClick={fetchStats}
          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, planDistribution, upcomingRenewals, activityFeed } = data;

  // Calculate highest revenue plan for visual percentage scaling
  const maxPlanRev = Math.max(...planDistribution.map((p) => p.revenue), 1);

  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="h-3 w-3" />
            <span>Executive Business Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            SubscriptIQ Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Live recurring revenue metrics, subscriber health, renewal forecasting, and automated billing settlement.
          </p>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('plans')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-semibold transition"
          >
            Manage Plans
          </button>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-semibold transition"
          >
            Subscribers ({metrics.activeSubscriptionsCount})
          </button>
          <button
            onClick={() => onNavigate('invoices')}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-xs font-bold transition shadow-xs"
          >
            Invoices & Billing
          </button>
        </div>
      </div>

      {/* Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MRR Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Recurring (MRR)
            </span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ${metrics.mrr.toFixed(2)}
            </p>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-teal-700 font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200">
                ${metrics.arr.toFixed(2)} ARR
              </span>
              <span className="text-slate-400">&bull; Annualized</span>
            </div>
          </div>
        </div>

        {/* Active Subscribers */}
        <div
          onClick={() => onNavigate('subscriptions')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 cursor-pointer hover:border-indigo-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Subscribers
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics.activeSubscriptionsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across {metrics.totalCustomers} registered customer organizations &rarr;
            </p>
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cash Collected
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              ${metrics.totalCollectedRevenue.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {metrics.invoices.paidCount} settled invoice transactions
            </p>
          </div>
        </div>

        {/* Overdue Invoices Alert */}
        <div
          onClick={() => onNavigate('invoices')}
          className={`p-6 rounded-2xl border shadow-xs space-y-3 cursor-pointer transition ${
            metrics.invoices.overdueCount > 0
              ? 'bg-rose-50/50 border-rose-300 hover:border-rose-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Overdue Exposure
            </span>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-rose-600 tracking-tight">
              ${metrics.invoices.overdueAmount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-rose-700 font-semibold">
              {metrics.invoices.overdueCount} overdue invoice{metrics.invoices.overdueCount === 1 ? '' : 's'} &bull; View &rarr;
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Plan Tier Distribution & Upcoming Renewals */}
        <div className="space-y-8">
          {/* Plan Distribution Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Plan Tier Distribution & MRR Contribution
                </h3>
              </div>
              <button
                onClick={() => onNavigate('plans')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                View Plans &rarr;
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {planDistribution.map((plan) => {
                const percentage = Math.round((plan.revenue / (metrics.mrr || 1)) * 100);
                return (
                  <div key={plan.planId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{plan.name} Tier</span>
                        <span className="text-slate-500 ml-2">
                          (${plan.price}/{plan.interval === 'YEARLY' ? 'yr' : 'mo'})
                        </span>
                      </div>
                      <div className="font-bold text-slate-800">
                        ${plan.revenue.toFixed(2)}/mo ({percentage}%)
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (plan.revenue / maxPlanRev) * 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{plan.subscribers} active subscriber{plan.subscribers === 1 ? '' : 's'}</span>
                      <span className="text-slate-600 font-medium">Interval: {plan.interval}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Renewals Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Renewal Horizon (Next 30 Days)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                {upcomingRenewals.length} upcoming
              </span>
            </div>

            {upcomingRenewals.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                No active subscriptions renewing within the next 30 days.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingRenewals.map((r) => (
                  <div key={r.subscriptionId} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{r.companyName}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.planName} Tier &bull; ${r.renewalPrice.toFixed(2)} ({r.billingInterval})
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.isUrgent7Day
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        In {r.daysUntilRenewal} day{r.daysUntilRenewal === 1 ? '' : 's'}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(r.renewalDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Activity Feed & Financial Status */}
        <div className="space-y-8">
          {/* Live Chronological Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Operations Activity Feed
                </h3>
              </div>
              <button
                onClick={fetchStats}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </button>
            </div>

            {activityFeed.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        event.type === 'PAYMENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {event.type === 'PAYMENT' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 truncate">{event.title}</span>
                        {event.amount !== undefined && (
                          <span
                            className={`font-mono font-bold ${
                              event.type === 'PAYMENT' ? 'text-emerald-600' : 'text-indigo-600'
                            }`}
                          >
                            +${event.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{event.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleDateString()} at{' '}
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing Settlement Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Invoicing & Cashflow Overview
                </h3>
              </div>
              <button
                onClick={() => onNavigate('invoices')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center"
              >
                Invoices Directory <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Paid / Settled</span>
                <p className="text-base font-extrabold text-emerald-700">${metrics.invoices.paidTotalAmount.toFixed(2)}</p>
                <p className="text-[11px] text-emerald-600">{metrics.invoices.paidCount} invoices</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Pending / Unpaid</span>
                <p className="text-base font-extrabold text-amber-700">${metrics.invoices.unpaidAmount.toFixed(2)}</p>
                <p className="text-[11px] text-amber-600">{metrics.invoices.unpaidCount} invoices</p>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase">Past Due / Overdue</span>
                <p className="text-base font-extrabold text-rose-700">${metrics.invoices.overdueAmount.toFixed(2)}</p>
                <p className="text-[11px] text-rose-600">{metrics.invoices.overdueCount} invoices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
