export interface PendingSelectionSession<T> {
  set(value: T): void;
  consume(): T | null;
}

export function createPendingSelectionSession<T>(): PendingSelectionSession<T> {
  let pendingValue: T | null = null;

  return {
    set(value: T) {
      pendingValue = value;
    },
    consume() {
      const value = pendingValue;
      pendingValue = null;
      return value;
    },
  };
}
