import type { Connection } from "../connection/connection.types";

import type {
  AuthorizationRequest,
  AuthorizationResult,
} from "../authorization/authorization.types";

export type ApprovaEventName =
  | "connected"
  | "connection.pending"
  | "connection.rejected"
  | "disconnected"
  | "authorization.pending"
  | "authorization.approved"
  | "authorization.rejected"
  | "authorization.expired";

export interface ApprovaEventMap {
  connected: Connection;

  "connection.pending": Connection;

  "connection.rejected": Connection;

  disconnected: void;

  "authorization.pending": AuthorizationRequest;

  "authorization.approved": AuthorizationResult;

  "authorization.rejected": AuthorizationResult;

  "authorization.expired": AuthorizationResult;
}

export interface ApprovaEvent<T extends ApprovaEventName = ApprovaEventName> {
  type: T;

  data: ApprovaEventMap[T];
}

export type ApprovaEventHandler<T extends ApprovaEventName> = (
  data: ApprovaEventMap[T]
) => void;
