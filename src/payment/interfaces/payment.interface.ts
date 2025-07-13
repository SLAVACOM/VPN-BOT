import { Payment, SubscriptionPlan } from '@prisma/client';

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  price: number; // в копейках для Telegram Payments
  days: number;
  popular?: boolean;
}

export interface DatabasePlan extends SubscriptionPlan {}

export interface PaymentWithRelations extends Payment {
  user: {
    id: number;
    telegramId: bigint;
    username: string | null;
  };
  plan?: {
    id: number;
    name: string;
    durationDays: number;
    price: bigint;
  } | null;
}

export interface CreateInvoiceResult {
  success: boolean;
  message?: string;
  invoicePayload?: string;
}

export interface PaymentCallbackData {
  telegramPaymentChargeId: string;
  providerPaymentChargeId: string;
  userId: number;
  planId: string;
  totalAmount: number;
  currency: string;
}

export interface PaymentStatistics {
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
  totalAmount: number;
  averageAmount: number;
  paymentsByStatus: Array<{
    status: string;
    _count: { status: number };
    _sum: { amount: number | null };
  }>;
  paymentsByMethod: Array<{
    method: string;
    _count: { method: number };
    _sum: { amount: number | null };
  }>;
  recentPayments: PaymentWithRelations[];
}

export interface PaginatedPayments {
  payments: PaymentWithRelations[];
  total: number;
  totalPages: number;
}

export interface PlanStatistics {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  paymentsByPlan: Array<{
    planId: number | null;
    _count: { planId: number };
    _sum: { amount: number | null };
  }>;
}
