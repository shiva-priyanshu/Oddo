import React, { useState, useEffect } from 'react';
import { Invoice } from '../types/invoice';
import { apiClient } from '../lib/api';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import {
  FileText,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Receipt,
} from 'lucide-react';

export const CustomerInvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient<{ invoices: Invoice[] }>('/api/invoices');
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const balanceDue = invoices.reduce((sum, inv) => sum + (inv.remainingBalance || 0), 0);

  const getStatusBadge = (inv: Invoice) => {
    const s = inv.liveStatus || inv.status;
    switch (s) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Receipt className="h-3 w-3" />
          <span>Billing History</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">My Invoices & Receipts</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          View your itemized invoices, payment history, and printable tax receipts.
        </p>
      </div>

      {/* Account Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Total Invoiced</span>
          <p className="text-2xl font-bold text-slate-900">${totalBilled.toFixed(2)}</p>
          <span className="text-[11px] text-slate-400">{invoices.length} billing statements</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Total Payments Made</span>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toFixed(2)}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Settled transactions</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500">Outstanding Balance</span>
          <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ${balanceDue.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-400">
            {balanceDue > 0 ? 'Payment pending' : 'Zero balance'}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading billing records and receipts...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No invoices yet</p>
            <p className="text-xs text-slate-500">
              When a subscription or custom charge is generated, your receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Issue Date</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Remaining Due</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 text-right">
                      ${inv.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-right">
                      <span className={(inv.remainingBalance || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        ${(inv.remainingBalance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">{getStatusBadge(inv)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setIsDetailOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-2xs transition"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail / Receipt Modal */}
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
