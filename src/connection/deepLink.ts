export interface DeepLinkParameters {
  action: "connect" | "authorize";

  requestId?: string;

  connectionId?: string;

  sessionId?: string;

  callbackUrl?: string;
}

export function buildApprovaDeepLink(
  scheme: string,
  params: DeepLinkParameters
): string {
  /**
   * Normalize the scheme.
   *
   * Supports:
   *   approva
   *   approva:
   *   approva://
   *   approva:////
   *
   * Internally we always construct:
   *   approva://request
   */
  const normalizedScheme = scheme
    .trim()
    .replace(/:\/+$/, "")
    .replace(/\/+$/, "");

  if (!normalizedScheme) {
    throw new Error("Approva app scheme cannot be empty.");
  }

  /**
   * Validate the scheme according to URI scheme rules.
   *
   * Examples:
   *   approva
   *   myapp
   *   my-app
   *   my.app
   */
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(normalizedScheme)) {
    throw new Error(`Invalid Approva app scheme: "${scheme}"`);
  }

  const query = new URLSearchParams();

  query.set("action", params.action);

  if (params.requestId) {
    query.set("requestId", params.requestId);
  }

  if (params.connectionId) {
    query.set("connectionId", params.connectionId);
  }

  if (params.sessionId) {
    query.set("sessionId", params.sessionId);
  }

  if (params.callbackUrl) {
    query.set("callbackUrl", params.callbackUrl);
  }

  return `${normalizedScheme}://request?${query.toString()}`;
}

export function openApprovaDeepLink(deepLink: string): void {
  window.location.assign(deepLink);
}
