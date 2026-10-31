import React, { useState, useEffect } from 'react';
import { CustomerWithSubs, Plan } from '../types/billing';
import { apiClient } from '../lib/api';
import {
  Users,
  Plus,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  UserPlus,
  Ban,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SubscriptionsManager: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerWithSubs[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign Subscription Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // New Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [isCreatingCust, setIsCreatingCust] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);

  // Cancel Modal
  const [cancelSubId, setCancelSubId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custData, planData] = await Promise.all([
        apiClient<{ customers: CustomerWithSubs[] }>('/api/customers'),
        apiClient<{ plans: Plan[] }>('/api/plans'),
      ]);
      setCustomers(custData.customers);
      setPlans(planData.plans.filter((p) => p.isActive));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    setIsAssigning(true);

    try {
      await apiClient('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
        }),
      });

      setIsAssignOpen(false);
      setSelectedCustomerId('');
      setSelectedPlanId('');
      fetchData();
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign subscription');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError(null);
    setIsCreatingCust(true);

    try {
      await apiClient('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: custName,
          email: custEmail,
          companyName: custCompany || undefined,
          phone: custPhone || undefined,
        }),
      });

      setIsCustomerModalOpen(false);
      setCustName('');
      setCustEmail('');
      setCustCompany('');
      setCustPhone('');
      fetchData();
    } catch (err: any) {
      setCustError(err.message || 'Failed to create customer');
    } finally {
      setIsCreatingCust(false);
    }
  };

  const handleCancelSub = async (immediate: boolean) => {
    if (!cancelSubId) return;
    setIsCancelling(true);

    try {
      await apiClient(`/api/subscriptions/${cancelSubId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ immediate }),
      });
      setCancelSubId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-teal-600 mb-1">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Subscribers</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Subscription Directory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track active customer plans, forward renewal deadlines, and assign new subscriptions.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => {
              if (customers.length > 0) setSelectedCustomerId(customers[0].id);
              if (plans.length > 0) setSelectedPlanId(plans[0].id);
              setIsAssignOpen(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Subscription</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-teal-600" />
          <span className="text-sm">Loading subscriber directory...</span>
        </div>
      )}

      {/* Customers Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Customer & Company</th>
                  <th className="py-3.5 px-6">Current Plan</th>
                  <th className="py-3.5 px-6">Renewal Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customers.map((cust) => {
                  const activeSub = cust.subscriptions?.find(
                    (s) => s.status === 'ACTIVE' || s.status === 'PENDING'
                  ) || cust.subscriptions?.[0];

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{cust.name}</div>
                        <div className="text-slate-500 text-[11px]">
                          {cust.companyName || 'Individual'} &bull;{' '}
                          <span className="font-mono">{cust.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {activeSub?.plan ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800">
                              {activeSub.plan.name} (${activeSub.plan.price}/{activeSub.plan.billingInterval === 'MONTHLY' ? 'mo' : 'yr'})
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Sub ID: {activeSub.id.slice(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Subscription</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {activeSub ? (
                          <div className="flex items-center space-x-1.5 text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-teal-600" />
                            <span>
                              {new Date(activeSub.currentPeriodEnd).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {activeSub ? (
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                activeSub.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : activeSub.status === 'PENDING'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : activeSub.status === 'CANCELLED'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {activeSub.status}
                            </span>
                            {activeSub.cancelAtPeriodEnd && (
                              <div className="text-[10px] text-amber-700 flex items-center">
                                <Clock className="h-3 w-3 mr-0.5" />
                                <span>Cancels at period end</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        {activeSub && activeSub.status === 'ACTIVE' && !activeSub.cancelAtPeriodEnd && (
                          <button
                            onClick={() => setCancelSubId(activeSub.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium transition"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            if (plans.length > 0) setSelectedPlanId(plans[0].id);
                            setIsAssignOpen(true);
                          }}
                          className="text-xs text-teal-700 hover:text-teal-900 font-medium transition"
                        >
                          Assign Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Subscription Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>Assign Plan to Customer</span>
              </h3>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName || c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Pricing Plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price}/{p.billingInterval === 'MONTHLY' ? 'mo' : 'yr'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isAssigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Subscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Customer Record</h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {custError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{custError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="elena@starlight.io"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={custCompany}
                  onChange={(e) => setCustCompany(e.target.value)}
                  placeholder="Starlight Inc"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCust}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isCreatingCust && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cancel Subscription</h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose whether to terminate immediately or let the subscription expire at the end of the current billing cycle.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleCancelSub(false)}
                disabled={isCancelling}
                className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                Cancel at Period End
              </button>
              <button
                type="button"
                onClick={() => handleCancelSub(true)}
                disabled={isCancelling}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Cancel Immediately
              </button>
              <button
                type="button"
                onClick={() => setCancelSubId(null)}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Never mind
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
