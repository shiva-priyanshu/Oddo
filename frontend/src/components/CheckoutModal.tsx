import React, { useState } from 'react';
import { Plan } from '../types/billing';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import {
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Lock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Check,
} from 'lucide-react';

interface CheckoutModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
  onSuccess?: () => void;
  onOpenLogin?: () => void;
}

type PaymentMethodType = 'SIMULATED_CARD' | 'SIMULATED_BANK' | 'SIMULATED_WALLET';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  plan,
  isOpen,
  onClose,
  onNavigate,
  onSuccess,
  onOpenLogin,
}) => {
  const { user, isAuthenticated, login } = useAuth();

  // Payment method selection state
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>('SIMULATED_CARD');
  const [methodError, setMethodError] = useState<string | null>(null);

  // Simulation outcome toggle (for hackathon demo & failure testing)
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success result
  const [successResult, setSuccessResult] = useState<{
    subscription: any;
    invoice: any;
    payment: any;
  } | null>(null);

  // Quick switch demo user if unauthenticated
  const [switching, setSwitching] = useState(false);

  if (!isOpen || !plan) return null;

  // Financial calculations
  const basePrice = plan.price;
  const taxRate = 10.0;
  const taxAmount = Math.round(basePrice * (taxRate / 100) * 100) / 100;
  const finalTotal = Math.round((basePrice + taxAmount) * 100) / 100;

  // Approximate renewal date
  const now = new Date();
  const renewalDate = new Date(now);
  if (plan.billingInterval === 'YEARLY') {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  const handleQuickLoginAsCustomer = async (email: string, pass: string) => {
    try {
      setSwitching(true);
      setSubmitError(null);
      await login({ email, password: pass });
    } catch (err: any) {
      setSubmitError(err.message || 'Login failed');
    } finally {
      setSwitching(false);
    }
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setMethodError(null);

    // Validate authentication
    if (!isAuthenticated || !user) {
      setSubmitError('Please sign in or select a customer account to complete checkout.');
      return;
    }

    // Validate payment method selection
    if (!selectedMethod) {
      setMethodError('Please select a payment method before proceeding with checkout.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient<{
        success: boolean;
        subscription: any;
        invoice: any;
        payment: any;
      }>('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod: selectedMethod,
          simulateFailure,
        }),
      });

      setSuccessResult({
        subscription: response.subscription,
        invoice: response.invoice,
        payment: response.payment,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to process checkout transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setSuccessResult(null);
    setSubmitError(null);
    setMethodError(null);
    onClose();
  };

  const handleGoToSubscriptions = () => {
    handleModalClose();
    if (onNavigate) {
      onNavigate('overview');
    }
  };

  const handleGoToInvoices = () => {
    handleModalClose();
    if (onNavigate) {
      onNavigate('invoices');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Secure Subscription Checkout</h3>
              <p className="text-[11px] text-slate-300">
                SubscriptIQ Hosted Billing &bull; Chargebee Style
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SUCCESS CONFIRMATION VIEW */}
        {successResult ? (
          <div className="p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle2 className="h-10 w-10 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Payment Settled &bull; Subscription Active
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 pt-1">
                You're Subscribed to {plan.name}!
              </h2>
              <p className="text-xs text-slate-500">
                Your initial billing cycle has been processed and simulated payment reconciled.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">
                  {successResult.invoice?.invoiceNumber}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Transaction Reference:</span>
                <span className="font-mono text-slate-600">
                  {successResult.payment?.transactionRef}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Plan & Billing Interval:</span>
                <span className="font-semibold text-slate-900">
                  {plan.name} ({plan.billingInterval})
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">Amount Settled:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ${successResult.invoice?.total?.toFixed(2)} USD
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Next Scheduled Renewal:</span>
                <span className="text-slate-600">
                  {new Date(successResult.subscription?.currentPeriodEnd).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Action Buttons to My Subscription & Invoices */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscriptions}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center space-x-1.5"
              >
                <span>Go to My Subscription</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleGoToInvoices}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center justify-center space-x-1.5"
              >
                <span>View Invoices & Receipts</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* CHECKOUT & ORDER REVIEW FORM */
          <form onSubmit={handleSubmitCheckout} className="p-6 space-y-5">
            {/* 1. Selected Plan & Order Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{plan.name} Plan</h4>
                    <span className="text-[10px] uppercase font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      {plan.billingInterval} Subscription
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold text-slate-900">
                    ${basePrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    / {plan.billingInterval === 'MONTHLY' ? 'month' : 'year'}
                  </div>
                </div>
              </div>

              {/* Itemized Price Calculation */}
              <div className="pt-2 border-t border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Base Plan Price:</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Applicable SaaS Tax ({taxRate.toFixed(1)}%):</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total Due Today:</span>
                  <span className="text-teal-700">${finalTotal.toFixed(2)} USD</span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>
                  Next automatic renewal:{' '}
                  <strong>
                    {renewalDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
              </div>
            </div>

            {/* 2. Customer Authentication Status */}
            {!isAuthenticated ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-900 font-semibold text-xs">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Customer Authentication Required</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  You are browsing as an unauthenticated guest. Please sign in or quick-select a demo customer
                  account to link this subscription:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={switching}
                    onClick={() => handleQuickLoginAsCustomer('acme@example.com', 'customer123')}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition"
                  >
                    Quick-Fill: Acme Corp
                  </button>
                  <button
                    type="button"
                    disabled={switching}
                    onClick={() => handleQuickLoginAsCustomer('globex@example.com', 'customer123')}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition"
                  >
                    Quick-Fill: Globex Corp
                  </button>
                  {onOpenLogin && (
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Sign In / Register
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Billed Account:
                  </div>
                  <div className="font-semibold text-slate-900">{user?.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{user?.email}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                  {user?.role}
                </span>
              </div>
            )}

            {/* 3. Payment Method Selection (Radio Buttons / Selectable Cards) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Method
                </label>
                <span className="text-[11px] text-teal-600 font-medium">Demo Simulator</span>
              </div>

              {methodError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{methodError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Method 1: Credit / Debit Card */}
                <div
                  onClick={() => {
                    setSelectedMethod('SIMULATED_CARD');
                    setMethodError(null);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'SIMULATED_CARD'
                      ? 'bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard
                      className={`h-5 w-5 ${
                        selectedMethod === 'SIMULATED_CARD' ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        selectedMethod === 'SIMULATED_CARD'
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedMethod === 'SIMULATED_CARD' && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Simulated Card</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">•••• 4242</div>
                  </div>
                </div>

                {/* Method 2: ACH Bank Transfer */}
                <div
                  onClick={() => {
                    setSelectedMethod('SIMULATED_BANK');
                    setMethodError(null);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'SIMULATED_BANK'
                      ? 'bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Building2
                      className={`h-5 w-5 ${
                        selectedMethod === 'SIMULATED_BANK' ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        selectedMethod === 'SIMULATED_BANK'
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedMethod === 'SIMULATED_BANK' && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Bank Transfer</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">ACH •••• 5678</div>
                  </div>
                </div>

                {/* Method 3: Digital Wallet */}
                <div
                  onClick={() => {
                    setSelectedMethod('SIMULATED_WALLET');
                    setMethodError(null);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between ${
                    selectedMethod === 'SIMULATED_WALLET'
                      ? 'bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Smartphone
                      className={`h-5 w-5 ${
                        selectedMethod === 'SIMULATED_WALLET' ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                        selectedMethod === 'SIMULATED_WALLET'
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedMethod === 'SIMULATED_WALLET' && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Digital 1-Click</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Demo Wallet</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Hackathon Simulated Payment Disclosure & Outcome Switcher */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-start space-x-2">
                <Sparkles className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600">
                  <strong className="text-slate-800">Simulated Payment Sandbox:</strong> This transaction
                  is simulated locally for hackathon demonstration. No real currency is charged.
                </div>
              </div>

              {/* Demo Failure / Success Injection Toggle */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Test Payment Outcome:</span>
                <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSimulateFailure(false)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      !simulateFailure
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Success (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulateFailure(true)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                      simulateFailure
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔴 Decline (Fail)
                  </button>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthenticated}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Confirm & Pay ${finalTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
