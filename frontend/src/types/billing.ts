export type BillingInterval = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  isActive: boolean;
  features: string;
  featuresList?: string[];
  subscriptionCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  liveStatus?: string;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan?: Plan;
  customer?: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
  };
  createdAt: string;
}

export interface CustomerWithSubs {
  id: string;
  name: string;
  email: string;
  companyName?: string | null;
  billingAddress?: string | null;
  phone?: string | null;
  subscriptions: Subscription[];
  _count?: {
    invoices: number;
  };
  createdAt: string;
}

export interface CreatePlanInput {
  name: string;
  description: string;
  price: number;
  billingInterval: BillingInterval;
  features: string[];
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId: string;
  startDate?: string;
}
