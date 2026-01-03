import { create } from 'zustand';

// T058: Subscriptions store for subscription data

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
}

interface SubscriptionState {
  // State
  tiers: SubscriptionTier[];
  currentTier: SubscriptionTier | null;
  isLoading: boolean;

  // Actions
  setTiers: (tiers: SubscriptionTier[]) => void;
  setCurrentTier: (tier: SubscriptionTier | null) => void;
  setLoading: (loading: boolean) => void;
  updateTier: (id: string, updates: Partial<SubscriptionTier>) => void;
  addTier: (tier: SubscriptionTier) => void;
  removeTier: (id: string) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  tiers: [],
  currentTier: null,
  isLoading: false,

  setTiers: (tiers) => set({ tiers }),

  setCurrentTier: (tier) => set({ currentTier: tier }),

  setLoading: (loading) => set({ isLoading: loading }),

  updateTier: (id, updates) => set((state) => ({
    tiers: state.tiers.map((tier) =>
      tier.id === id ? { ...tier, ...updates } : tier
    ),
  })),

  addTier: (tier) => set((state) => ({
    tiers: [...state.tiers, tier],
  })),

  removeTier: (id) => set((state) => ({
    tiers: state.tiers.filter((tier) => tier.id !== id),
  })),
}));
