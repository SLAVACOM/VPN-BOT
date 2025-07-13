import { User } from '@prisma/client';

export interface UserWithSubscription extends User {
  subscriptionExpiresAt: Date | null;
  hasActiveSubscription: boolean;
}

export interface CreateUserData {
  telegramId: bigint;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  subscriptionExpiresAt?: Date;
}

export interface UserSubscriptionInfo {
  hasActiveSubscription: boolean;
  subscriptionExpiresAt: Date | null;
  daysLeft: number;
}

export interface UserPaymentHistory {
  payments: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    method: string;
    createdAt: Date;
    completedAt: Date | null;
    plan?: {
      name: string;
      durationDays: number;
    } | null;
  }>;
  totalPayments: number;
  totalAmount: number;
}
