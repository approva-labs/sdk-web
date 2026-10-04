export type AuthorizationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type AuthorizationAction =
  | "purchase"
  | "payment"
  | "membership"
  | "subscription"
  | "transfer"
  | "mint"
  | "custom";

export interface AuthorizationOptions {
  action: AuthorizationAction;

  description: string;

  amount?: string;

  currency?: string;

  recipient?: string;

  chain?: "base";

  contractAddress?: string;

  calldata?: string;

  metadata?: Record<string, string | number | boolean>;

  expiresInSeconds?: number;
}

export interface AuthorizationRequest {
  requestId: string;

  sessionId: string;

  appId: string;

  action: AuthorizationAction;

  description: string;

  amount?: string;

  currency?: string;

  recipient?: string;

  chain?: "base";

  contractAddress?: string;

  calldata?: string;

  metadata?: Record<string, string | number | boolean>;

  status: AuthorizationStatus;

  createdAt: string;

  expiresAt: string;
}

export interface AuthorizationResult {
  requestId: string;

  status: AuthorizationStatus;

  approvedAt?: string;

  transactionHash?: string;

  signature?: string;

  chain?: "base";

  error?: string;
}
