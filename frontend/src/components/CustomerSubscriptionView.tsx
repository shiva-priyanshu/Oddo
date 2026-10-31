import React, { useState, useEffect } from 'react';
import { Subscription, Plan } from '../types/billing';
import { apiClient } from '../lib/api';
import {
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  Ban,
  Shield,
} from 'lucide-react';

export const CustomerSubscriptionView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalSubId, setCancelModalSubId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const [subData, planData] = await Promise.all([
        apiClient<{ subscriptions: Subscription[] }>('/api/subscriptions'),
        apiClient<{ plans: Plan[] }>('/api/plans'),
      ]);
      setSubscriptions(subData.subscriptions);
      setAvailablePlans(planData.plans.filter((p) => p.isActive));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load your subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCancel = async (immediate: boolean) => {
    if (!cancelModalSubId) return;
    setIsCancelling(true);

    try {
      await apiClient(`/api/subscriptions/${cancelModalSubId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ immediate }),
      });
      setCancelModalSubId(null);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const activeSub = subscriptions.find(
    (s) => s.status === 'ACTIVE' || s.status === 'PENDING'
  ) || subscriptions[0];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900">My Subscription & Plan</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your plan benefits, renewal date, and manage your billing cycle.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-teal-600" />
          <span className="text-sm">Loading your subscription details...</span>
        </div>
      )}

      {!loading && activeSub && activeSub.plan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Plan Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Current Tier
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeSub.plan.name} Plan</h3>
                <p className="text-xs text-slate-500">{activeSub.plan.description}</p>
              </div>

              <div className="text-right">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    activeSub.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {activeSub.status}
                </span>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  ${activeSub.plan.price}
                  <span className="text-xs font-normal text-slate-500">
                    /{activeSub.plan.billingInterval === 'MONTHLY' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>
            </div>

            {/* Renewal Timeline */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-700">
                <Calendar className="h-4 w-4 text-teal-600" />
                <span>
                  <strong>Next Billing Renewal:</strong>{' '}
                  {new Date(activeSub.currentPeriodEnd).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {activeSub.cancelAtPeriodEnd ? (
                <div className="text-amber-700 font-semibold flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Cancels at period end</span>
                </div>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Auto-renews</span>
                </span>
              )}
            </div>

            {/* Feature Perks */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Plan Inclusions:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  let feats: string[] = [];
                  try {
                    feats = JSON.parse(activeSub.plan.features);
                  } catch {
                    feats = [activeSub.plan.features];
                  }
                  return feats.map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-xs text-slate-600">
                      <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Subscription ID: {activeSub.id}
              </span>
              {activeSub.status === 'ACTIVE' && !activeSub.cancelAtPeriodEnd && (
                <button
                  onClick={() => setCancelModalSubId(activeSub.id)}
                  className="px-3.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Quick Help / Billing Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 self-start">
            <h4 className="font-bold text-slate-900 text-sm">Need a different plan?</h4>
            <p className="text-xs text-slate-500">
              Upgrade or switch your billing tier at any time. Available plans in your organization:
            </p>
            <div className="space-y-2">
              {availablePlans
                .filter((p) => p.id !== activeSub.planId)
                .map((plan) => (
                  <div
                    key={plan.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{plan.name}</div>
                      <div className="text-[11px] text-slate-500">
                        ${plan.price}/{plan.billingInterval === 'MONTHLY' ? 'mo' : 'yr'}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Available
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !activeSub && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-slate-500 text-sm">You do not currently have an active subscription.</p>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalSubId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cancel Your Subscription</h3>
              <p className="text-xs text-slate-500 mt-1">
                You can retain access until the end of your billing cycle or cancel immediately.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleCancel(false)}
                disabled={isCancelling}
                className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                Cancel at End of Billing Period
              </button>
              <button
                type="button"
                onClick={() => handleCancel(true)}
                disabled={isCancelling}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Cancel Immediately
              </button>
              <button
                type="button"
                onClick={() => setCancelModalSubId(null)}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Keep My Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
