export interface CreatePaymentDto {
  userId: number;
  amount: number; // в копейках
  currency: string;
  method: string;
  status: string;
  planId?: number;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  invoicePayload?: string;
  daysAdded?: number;
  description?: string;
  metadata?: any;
}

export interface UpdatePaymentDto {
  status?: string;
  telegramPaymentChargeId?: string;
  providerPaymentChargeId?: string;
  daysAdded?: number;
  description?: string;
  metadata?: any;
}

export interface CreatePlanDto {
  name: string;
  durationDays: number;
  price: number; // в копейках
  currency: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  durationDays?: number;
  price?: number; // в копейках
  currency?: string;
  description?: string;
  isActive?: boolean;
}
