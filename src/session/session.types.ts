export type SessionStatus =
  | "pending"
  | "active"
  | "expired"
  | "revoked"
  | "rejected";

export interface ApprovaSession {
  id: string;
  appId: string;
  userId?: string;
  origin: string;
  scopes: string[];
  status: SessionStatus;
  deviceId?: string;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}
