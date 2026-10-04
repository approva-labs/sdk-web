export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isSecureContextAvailable(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}
