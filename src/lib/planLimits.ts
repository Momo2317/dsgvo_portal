export type PlanType = 'starter' | 'kanzlei' | 'premium';

export interface PlanLimits {
  maxUsers: number; // -1 = unlimited
  maxPortals: number; // -1 = unlimited
  storageGb: number;
  maxFileSizeMb: number; // -1 = unlimited
  customDomain: boolean;
  autoDeleteDays: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    maxUsers: 1,
    maxPortals: 1,
    storageGb: 10,
    maxFileSizeMb: 20,
    customDomain: false,
    autoDeleteDays: 14,
  },
  kanzlei: {
    maxUsers: 5,
    maxPortals: 5,
    storageGb: 50,
    maxFileSizeMb: 100,
    customDomain: true,
    autoDeleteDays: 14,
  },
  premium: {
    maxUsers: -1,
    maxPortals: -1,
    storageGb: 250,
    maxFileSizeMb: -1,
    customDomain: true,
    autoDeleteDays: 14,
  },
};

export const PLAN_LABELS: Record<PlanType, string> = {
  starter: 'Starter',
  kanzlei: 'Kanzlei',
  premium: 'Premium',
};

export function storageLimitBytes(limits: PlanLimits): number {
  return limits.storageGb * 1024 * 1024 * 1024;
}

export function maxFileSizeBytes(limits: PlanLimits): number | null {
  if (limits.maxFileSizeMb < 0) return null;
  return limits.maxFileSizeMb * 1024 * 1024;
}

export function formatStorageLimit(gb: number): string {
  return `${gb} GB`;
}
