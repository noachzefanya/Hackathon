/**
 * GuardianFlow AI — Zustand Global State Store
 */
import { create } from 'zustand';

export interface LiveTransaction {
  transaction_id: string;
  user_id: string;
  merchant_id: string;
  amount: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  action: 'approve' | 'step_up' | 'block';
  city: string;
  timestamp: string;
  reasons: { feature: string; description: string; impact: number }[];
}

interface DashboardState {
  // Mobile sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Live feed
  transactions: LiveTransaction[];
  addTransaction: (tx: LiveTransaction) => void;
  clearTransactions: () => void;

  // WebSocket status
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;

  // Selected transaction (drawer)
  selectedTx: LiveTransaction | null;
  setSelectedTx: (tx: LiveTransaction | null) => void;

  // Stats
  stats: {
    total: number;
    blocked: number;
    flagged: number;
    approved: number;
    avgScore: number;
  };
  updateStats: (tx: LiveTransaction) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  sidebarOpen: false,
  transactions: [],
  wsConnected: false,
  selectedTx: null,
  stats: { total: 0, blocked: 0, flagged: 0, approved: 0, avgScore: 0 },

  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions].slice(0, 200),
    })),

  clearTransactions: () => set({ transactions: [] }),

  setWsConnected: (v) => set({ wsConnected: v }),

  setSelectedTx: (tx) => set({ selectedTx: tx }),

  updateStats: (tx) =>
    set((state) => {
      const prev = state.stats;
      const total = prev.total + 1;
      const blocked = prev.blocked + (tx.action === 'block' ? 1 : 0);
      const flagged = prev.flagged + (tx.action === 'step_up' ? 1 : 0);
      const approved = prev.approved + (tx.action === 'approve' ? 1 : 0);
      const avgScore = Math.round(
        (prev.avgScore * prev.total + tx.risk_score) / total
      );
      return { stats: { total, blocked, flagged, approved, avgScore } };
    }),
}));
