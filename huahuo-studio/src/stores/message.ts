import { create } from 'zustand';

interface MessageState {
  message: string | null;
  type: 'success' | 'error' | 'info' | 'warning' | null;
  showMessage: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  clearMessage: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  message: null,
  type: null,
  showMessage: (type, message) => {
    set({ type, message });
    // 3秒后自动清除
    setTimeout(() => set({ type: null, message: null }), 3000);
  },
  clearMessage: () => set({ type: null, message: null }),
}));
