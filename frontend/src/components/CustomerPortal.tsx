import React, { useState, useEffect } from 'react';
import { CustomerSummaryResponse } from '../types/dashboard';
import { Invoice } from '../types/invoice';
import { apiClient } from '../lib/api';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building,
  Mail,
  MapPin,
  ArrowRight,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface CustomerPortalProps {
  onNavigate: (tab: string) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onNavigate }) => {
  const [data, setData] = useState<CustomerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<CustomerSummaryResponse>('/api/dashboard/customer-summary');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer subscription overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Loading Customer Portal...</p>
        <p className="text-xs text-slate-400">Retrieving your subscription status and invoice history</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-3">
        <div className="flex items-center space-x-2 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading subscriber portal</span>
        </div>
        <p>{error || 'An unexpected error occurred.'}</p>
        <button
          onClick={fetchSummary}
          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { customer, activeSubscription, financials, recentInvoices } = data;

  // Parse plan features safely
  let featureList: string[] = [];
  if (activeSubscription?.plan?.features) {
    try {
      featureList = JSON.parse(activeSubscription.plan.features);
    } catch {
      featureList = [activeSubscription.plan.features];
    }
  }

  const getStatusBadge = (inv: Invoice) => {
    const s = inv.liveStatus || inv.status;
    switch (s) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Customer Hero Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 rounded-2xl p-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Building className="h-3 w-3" />
            <span>{customer.companyName || 'Subscriber Account'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {customer.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Manage your active subscription plan, renewal timelines, and downloadable receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-xs font-bold transition shadow-xs flex items-center"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            My Invoices & Receipts
          </button>
        </div>
      </div>

      {/* Subscription Status Card */}
      {activeSubscription ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
                Current Subscription Tier
              </span>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-black text-slate-900">
                  {activeSubscription.plan.name} Plan
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {activeSubscription.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                ${activeSubscription.plan.price.toFixed(2)} per{' '}
                {activeSubscription.plan.billingInterval === 'YEARLY' ? 'year' : 'month'}
              </p>
            </div>

            {/* Renewal Countdown Badge */}
            {activeSubscription.daysUntilRenewal !== null && (
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 sm:text-right space-y-1">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                  Next Renewal Countdown
                </span>
                <div className="text-lg font-black text-teal-900 flex items-center sm:justify-end">
                  <Clock className="w-4 h-4 mr-1.5 text-teal-600" />
                  Renews in {activeSubscription.daysUntilRenewal} day
                  {activeSubscription.daysUntilRenewal === 1 ? '' : 's'}
                </div>
                <div className="text-[11px] text-teal-700">
                  Billing on {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Billing Cycle Details & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Billing Cycle Information
              </span>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subscription Started:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(activeSubscription.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Period Start:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(activeSubscription.currentPeriodStart).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Period End:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Auto-Renewal:</span>
                  <span className="font-bold text-teal-700">Active (Continuous)</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Included Tier Features
              </span>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                {featureList.length > 0 ? (
                  featureList.map((f, i) => (
                    <div key={i} className="flex items-center text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-teal-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Standard tier features included.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <Layers className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No active subscription found</h3>
          <p className="text-xs text-slate-500">
            Please contact your account administrator to assign a subscription plan.
          </p>
        </div>
      )}

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Invoiced
          </span>
          <p className="text-2xl font-bold text-slate-900">${financials.totalInvoiced.toFixed(2)}</p>
          <span className="text-[11px] text-slate-400">Lifetime billing statements</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Paid
          </span>
          <p className="text-2xl font-bold text-emerald-600">${financials.totalPaid.toFixed(2)}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Reconciled transactions</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Balance Due
          </span>
          <p className={`text-2xl font-bold ${financials.balanceDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ${financials.balanceDue.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-400">
            {financials.balanceDue > 0 ? 'Pending payment' : 'Account in good standing'}
          </span>
        </div>
      </div>

      {/* Recent Invoices & Organization Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Invoices & Receipts
            </h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center"
            >
              All Invoices <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <p className="text-xs text-slate-500 p-6 bg-slate-50 rounded-xl text-center">
              No invoices generated for this account yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 text-right">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(inv)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailOpen(true);
                          }}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Organization Profile Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Organization Profile
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Company Name</span>
              <p className="font-bold text-slate-900 flex items-center">
                <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {customer.companyName || customer.name}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Email</span>
              <p className="font-semibold text-slate-700 flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {customer.email}
              </p>
            </div>

            {customer.billingAddress && (
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Address</span>
                <p className="text-slate-600 flex items-start">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{customer.billingAddress}</span>
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Customer ID</span>
              <p className="font-mono text-[11px] text-slate-600 truncate">{customer.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={isDetailOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </div>
  );
};
