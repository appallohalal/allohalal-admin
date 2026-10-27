export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = [...this.toasts];
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  show(item: Omit<ToastItem, 'id'> & { id?: string }): string {
    const id = item.id || Math.random().toString(36).substring(2, 9);
    const existingIndex = this.toasts.findIndex((t) => t.id === id);
    const newToast: ToastItem = { ...item, id };

    if (existingIndex >= 0) {
      this.toasts[existingIndex] = newToast;
    } else {
      this.toasts.push(newToast);
    }
    this.notify();

    if (item.type !== 'loading') {
      const duration = item.duration ?? 4000;
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    const prevLen = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== prevLen) {
      this.notify();
    }
  }

  success(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'success', message, title, duration });
  }

  error(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'error', message, title, duration });
  }

  info(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'info', message, title, duration });
  }

  loading(message: string, title?: string): string {
    return this.show({ type: 'loading', message, title });
  }
}

export const toast = new ToastManager();
