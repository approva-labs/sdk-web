export function getCurrentOrigin(): string {
  return window.location.origin;
}

export function isValidCallbackUrl(callbackUrl: string): boolean {
  try {
    const url = new URL(callbackUrl);

    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}
