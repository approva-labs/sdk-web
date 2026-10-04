import { ApprovaError, ApprovaErrorCode } from "../transport/errors";

import type { HttpClient } from "../transport/HttpClient";

import type { EventEmitter } from "../events/EventEmitter";

import type { SessionManager } from "../session/SessionManager";

import {
  buildApprovaDeepLink,
  openApprovaDeepLink,
} from "../connection/deepLink";

import type {
  AuthorizationOptions,
  AuthorizationRequest,
  AuthorizationResult,
} from "./authorization.types";

export interface AuthorizationManagerConfig {
  appId: string;

  http: HttpClient;

  sessionManager: SessionManager;

  events: EventEmitter;
}

export class AuthorizationManager {
  constructor(private readonly config: AuthorizationManagerConfig) {}

  async authorize(
    options: AuthorizationOptions
  ): Promise<AuthorizationResult | any> {
    if (!this.config.sessionManager.isActive()) {
      throw new ApprovaError(
        ApprovaErrorCode.SESSION_REQUIRED,
        "Connect an Approva device before requesting authorization."
      );
    }

    const session = this.config.sessionManager.getSession();

    if (!session) {
      throw new ApprovaError(
        ApprovaErrorCode.SESSION_REQUIRED,
        "Approva session is unavailable."
      );
    }

    const request = await this.config.http.post<AuthorizationRequest>(
      "/v1/authorization-requests",
      {
        appId: this.config.appId,
        sessionId: session.id,
        action: options.action,
        description: options.description,
        amount: options.amount,
        currency: options.currency,
        recipient: options.recipient,
        chain: options.chain ?? "base",
        contractAddress: options.contractAddress,
        calldata: options.calldata,
        metadata: options.metadata,
        expiresInSeconds: options.expiresInSeconds ?? 300,
      }
    );

    this.config.events.emit("authorization.pending", request);

    const deepLink = buildApprovaDeepLink("approva", {
      action: "authorize",
      requestId: request.requestId,
      sessionId: session.id,
      callbackUrl: window.location.href,
    });

    openApprovaDeepLink(deepLink);
  }
}
