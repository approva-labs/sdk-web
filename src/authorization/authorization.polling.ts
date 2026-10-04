import type { HttpClient } from "../transport/HttpClient";

import type { AuthorizationResult } from "./authorization.types";

export async function pollAuthorization(
  http: HttpClient,
  requestId: string,
  timeoutMs = 120000,
  intervalMs = 1500
): Promise<AuthorizationResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await http.get<AuthorizationResult>(
      `/v1/authorization-requests/${requestId}`
    );

    if (result.status !== "pending") {
      return result;
    }

    await delay(intervalMs);
  }

  throw new Error("Authorization polling timed out.");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
