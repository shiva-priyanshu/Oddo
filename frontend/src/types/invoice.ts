export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PAID' | 'OVERDUE';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  createdAt?: string;
}

export type PaymentMethod = 'SIMULATED' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  paidAt: string;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subscriptionId?: string | null;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  liveStatus: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  updatedAt?: string;
  items: InvoiceItem[];
  payments: Payment[];
  paidAmount: number;
  remainingBalance: number;
  customer?: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
    billingAddress?: string | null;
    phone?: string | null;
  };
  subscription?: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      billingInterval: string;
      price: number;
    };
  } | null;
}

export interface CreateInvoiceItemInput {
  description: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  dueDate: string;
  items: CreateInvoiceItemInput[];
  discountAmount?: number;
  taxRate?: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
}
