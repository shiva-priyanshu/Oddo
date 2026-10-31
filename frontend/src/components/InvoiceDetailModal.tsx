import React from 'react';
import { Invoice } from '../types/invoice';
import {
  X,
  Printer,
  Calendar,
  Building,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !invoice) return null;

  const status = invoice.liveStatus || invoice.status;

  const getStatusBadge = () => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Paid in Full
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Past Due
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Unpaid
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Invoice Document</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-800">{invoice.invoiceNumber}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="p-8 space-y-8 bg-white" id="invoice-sheet">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">SubscriptIQ</span>
              </div>
              <p className="text-xs text-slate-500">Cloud Subscription & Billing Platform</p>
              <p className="text-xs text-slate-500">billing@subscriptiq.com</p>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="flex items-center sm:justify-end gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {invoice.invoiceNumber}
                </h1>
                {getStatusBadge()}
              </div>
              <div className="flex items-center sm:justify-end text-xs text-slate-500 space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Issued: {new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center sm:justify-end text-xs text-rose-600 font-medium space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Billed To & Subscription Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Billed To
              </span>
              <p className="text-sm font-bold text-slate-900">
                {invoice.customer?.companyName || invoice.customer?.name}
              </p>
              {invoice.customer?.companyName && (
                <p className="text-xs text-slate-600 flex items-center">
                  <Building className="w-3 h-3 mr-1 text-slate-400" />
                  Attn: {invoice.customer.name}
                </p>
              )}
              <p className="text-xs text-slate-600 flex items-center">
                <Mail className="w-3 h-3 mr-1 text-slate-400" />
                {invoice.customer?.email}
              </p>
              {invoice.customer?.billingAddress && (
                <p className="text-xs text-slate-600 flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  {invoice.customer.billingAddress}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Plan Association
              </span>
              {invoice.subscription ? (
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {invoice.subscription.plan.name} Tier
                  </p>
                  <p className="text-xs text-slate-600">
                    Recurring {invoice.subscription.plan.billingInterval} billing
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    Sub ID: {invoice.subscription.id.slice(-8)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Custom ad-hoc invoice</p>
              )}
            </div>
          </div>

          {/* Itemized Line Items */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-semibold text-right">
                        ${item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                      No line items recorded for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Payment Instructions</p>
              <p>Simulated payments are reconciled automatically within SubscriptIQ.</p>
              <p>All currency values are calculated in USD ($).</p>
            </div>

            <div className="w-full sm:w-72 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-medium">-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>Tax ({invoice.taxRate}%):</span>
                <span className="font-medium">${invoice.taxAmount.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Due:</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600">
                  ${(invoice.paidAmount || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Balance Due:</span>
                <span className={(invoice.remainingBalance || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}>
                  ${(invoice.remainingBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Audit */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment History & Settlement Audit
              </h3>
            </div>

            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-left">Reference</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-xs">
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-slate-600">
                          {new Date(p.paidAt).toLocaleDateString()} {new Date(p.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700">
                          {p.transactionRef}
                        </td>
                        <td className="px-3 py-2 font-bold text-emerald-600 text-right">
                          +${p.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-100">
                No payment transactions recorded for this invoice yet.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
