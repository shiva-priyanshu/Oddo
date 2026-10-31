import React, { useState, useEffect } from 'react';
import { Plan, CreatePlanInput, Subscription } from '../types/billing';
import { apiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from './CheckoutModal';
import {
  Layers,
  Check,
  Plus,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface PlansManagerProps {
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

export const PlansManager: React.FC<PlansManagerProps> = ({ onNavigate, onOpenLogin }) => {
  const { isAuthenticated, isAdmin, hasPermission } = useAuth();
  const canManagePlans = isAdmin || hasPermission('manage_plans');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanIds, setActivePlanIds] = useState<string[]>([]);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Plan Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('29');
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [featuresText, setFeaturesText] = useState('Unlimited projects, Automated invoicing, Priority support');

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ plans: Plan[] }>('/api/plans');
      setPlans(data.plans);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSubscriptions = async () => {
    if (!isAuthenticated) {
      setActivePlanIds([]);
      return;
    }
    try {
      const data = await apiClient<{ subscriptions: Subscription[] }>('/api/subscriptions');
      const activeIds = (data.subscriptions || [])
        .filter((s) => s.status === 'ACTIVE')
        .map((s) => s.planId);
      setActivePlanIds(activeIds);
    } catch {
      setActivePlanIds([]);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchActiveSubscriptions();
  }, [isAuthenticated]);

  const handleToggleActive = async (planId: string) => {
    try {
      await apiClient<{ plan: Plan }>(`/api/plans/${planId}/toggle`, {
        method: 'PATCH',
      });
      // Refresh local state
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle plan status');
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanForCheckout(plan);
    setIsCheckoutOpen(true);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new Error('Please enter a valid positive price');
      }

      const featuresArray = featuresText
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const input: CreatePlanInput = {
        name,
        description,
        price: parsedPrice,
        billingInterval: interval,
        features: featuresArray,
      };

      await apiClient<{ plan: Plan }>('/api/plans', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      setPrice('29');
      setFeaturesText('Unlimited projects, Automated invoicing, Priority support');
      fetchPlans();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-teal-600 mb-1">
            <Layers className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Subscription Tiers</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Pricing & Subscription Plans</h2>
          <p className="text-xs text-slate-500 mt-1">
            Select a plan to start your subscription or review recurring billing intervals.
          </p>
        </div>

        {canManagePlans && (
          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Plan</span>
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-teal-600" />
          <span className="text-sm">Loading subscription plans...</span>
        </div>
      )}

      {/* Plans Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            let features: string[] = [];
            try {
              features = plan.featuresList || JSON.parse(plan.features);
            } catch {
              features = [plan.features];
            }

            const isCurrentActivePlan = activePlanIds.includes(plan.id);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition ${
                  isCurrentActivePlan
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                    : plan.isActive
                    ? 'border-slate-200 hover:border-teal-400 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {plan.billingInterval}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          plan.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {canManagePlans && (
                        <button
                          onClick={() => handleToggleActive(plan.id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 transition"
                          title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                        >
                          {plan.isActive ? (
                            <ToggleRight className="h-6 w-6 text-teal-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      {isCurrentActivePlan && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Your Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline space-x-1 border-y border-slate-100 py-3">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ${plan.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {plan.billingInterval === 'MONTHLY' ? 'month' : 'year'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Included Features:
                    </span>
                    <ul className="space-y-1.5">
                      {features.map((feat, idx) => (
                        <li key={idx} className="flex items-start text-xs text-slate-600">
                          <Check className="h-3.5 w-3.5 text-teal-600 mr-2 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Working Subscribe / Choose Plan Action Button */}
                <div className="pt-6 space-y-3 mt-4 border-t border-slate-100">
                  {plan.isActive ? (
                    isCurrentActivePlan ? (
                      <div className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-1.5 select-none">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Current Active Plan</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <span>Choose {plan.name}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 rounded-lg font-semibold text-xs cursor-not-allowed"
                    >
                      Plan Unavailable
                    </button>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">Subscribers: {plan.subscriptionCount || 0}</span>
                    <span className="font-mono text-[10px]">ID: {plan.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Checkout Modal */}
      <CheckoutModal
        plan={selectedPlanForCheckout}
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedPlanForCheckout(null);
        }}
        onNavigate={onNavigate}
        onSuccess={() => {
          fetchPlans();
          fetchActiveSubscriptions();
        }}
        onOpenLogin={onOpenLogin}
      />

      {/* Create New Plan Modal (Admin / Manage Plans) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-lg">Create Subscription Plan</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Tier"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe target audience or benefits"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Billing Interval
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition bg-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Feature 1, Feature 2, Feature 3"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Plan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
