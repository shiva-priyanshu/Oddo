import { Invoice } from './invoice';

export interface DashboardMetrics {
  totalCustomers: number;
  totalPlans: number;
  activePlansCount: number;
  activeSubscriptionsCount: number;
  mrr: number;
  arr: number;
  totalCollectedRevenue: number;
  invoices: {
    unpaidCount: number;
    unpaidAmount: number;
    overdueCount: number;
    overdueAmount: number;
    paidCount: number;
    paidTotalAmount: number;
  };
}

export interface PlanTierStat {
  planId: string;
  name: string;
  interval: string;
  price: number;
  subscribers: number;
  revenue: number;
}

export interface UpcomingRenewal {
  subscriptionId: string;
  customerId: string;
  customerName: string;
  companyName: string;
  email: string;
  planName: string;
  billingInterval: string;
  renewalPrice: number;
  renewalDate: string;
  daysUntilRenewal: number;
  isUrgent7Day: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'PAYMENT' | 'SUBSCRIPTION';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  customerName: string;
}

export interface DashboardStatsResponse {
  metrics: DashboardMetrics;
  planDistribution: PlanTierStat[];
  upcomingRenewals: UpcomingRenewal[];
  activityFeed: ActivityEvent[];
}

export interface CustomerSummaryResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    companyName?: string | null;
    billingAddress?: string | null;
    phone?: string | null;
  };
  activeSubscription: {
    id: string;
    status: string;
    startDate: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    daysUntilRenewal: number | null;
    plan: {
      id: string;
      name: string;
      description?: string | null;
      price: number;
      billingInterval: string;
      features?: string;
    };
  } | null;
  financials: {
    totalInvoiced: number;
    totalPaid: number;
    balanceDue: number;
  };
  recentInvoices: Invoice[];
}
