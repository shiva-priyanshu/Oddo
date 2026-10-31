import { prisma } from './prisma';

export interface LineItemInput {
  description: string;
  unitPrice: number;
  quantity?: number;
}

export interface FinancialCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Calculates subtotal, tax amount, and total due with 2-decimal rounding.
 */
export function calculateInvoiceFinancials(
  items: Array<{ unitPrice: number; quantity?: number }>,
  discountAmount: number = 0,
  taxRate: number = 10.0
): FinancialCalculationResult {
  const subtotalRaw = items.reduce((sum, item) => {
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return sum + item.unitPrice * qty;
  }, 0);

  const subtotal = Math.round(subtotalRaw * 100) / 100;
  const safeDiscount = Math.min(Math.max(0, discountAmount), subtotal);
  const taxableAmount = Math.max(0, subtotal - safeDiscount);
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount: safeDiscount,
    taxRate,
    taxAmount,
    total,
  };
}

/**
 * Generates the next sequential invoice number for the current year (e.g. INV-2026-0003).
 */
export async function generateNextInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextSequence = 1;
  if (latestInvoice && latestInvoice.invoiceNumber) {
    const parts = latestInvoice.invoiceNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSequence}`;
}

/**
 * Computes live invoice status taking into account payment history and due dates.
 */
export function computeLiveInvoiceStatus(invoice: {
  status: string;
  total: number;
  dueDate: Date | string;
  payments?: Array<{ amount: number }>;
}): string {
  const payments = invoice.payments || [];
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  // If paid in full
  if (paidAmount >= invoice.total - 0.001) {
    return 'PAID';
  }

  // If past due date with remaining balance
  const dueTime = new Date(invoice.dueDate).getTime();
  if (Date.now() > dueTime) {
    return 'OVERDUE';
  }

  return invoice.status || 'UNPAID';
}
