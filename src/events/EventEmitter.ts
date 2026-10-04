import type {
  ApprovaEventName,
  ApprovaEventHandler,
  ApprovaEventMap,
} from "./event.types";

export class EventEmitter {
  private listeners = new Map<ApprovaEventName, Set<Function>>();

  on<T extends ApprovaEventName>(
    event: T,
    handler: ApprovaEventHandler<T>
  ): () => void {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set();

      this.listeners.set(event, listeners);
    }

    listeners.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  off<T extends ApprovaEventName>(
    event: T,
    handler: ApprovaEventHandler<T>
  ): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<T extends ApprovaEventName>(event: T, data: ApprovaEventMap[T]): void {
    const listeners = this.listeners.get(event);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(data);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
