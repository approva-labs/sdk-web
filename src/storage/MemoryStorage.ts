import type { StorageAdapter } from "./StorageAdapter";

export class MemoryStorage implements StorageAdapter {
  private values = new Map<string, unknown>();

  get<T>(key: string): T | null {
    return (this.values.get(key) as T) ?? null;
  }

  set<T>(key: string, value: T): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}
