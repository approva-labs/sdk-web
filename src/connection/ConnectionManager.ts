import { ApprovaError, ApprovaErrorCode } from "../transport/errors";

import type { HttpClient } from "../transport/HttpClient";
import type { EventEmitter } from "../events/EventEmitter";
import type { SessionManager } from "../session/SessionManager";

import type { ConnectOptions, Connection } from "./connection.types";

import { buildApprovaDeepLink, openApprovaDeepLink } from "./deepLink";
import { generateQrCode } from "./qrCode";

import type { ConnectionManagerConfig } from "./types";
import type { ApprovaSession } from "../session/session.types";

export class ConnectionManager {
  private pollingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private stoppedSessions = new Set<string>();

  constructor(private readonly config: ConnectionManagerConfig) {}

  async connect(options: ConnectOptions = {}): Promise<Connection> {
    /**
     * Return an existing active session.
     */
    if (!options.forceNew && this.config.sessionManager.isActive()) {
      const session = this.config.sessionManager.getSession();

      if (!session) {
        throw new ApprovaError(
          ApprovaErrorCode.SESSION_REQUIRED,
          "Active session could not be loaded."
        );
      }

      return {
        sessionId: session.id,
        status: "connected",
        expiresAt: session.expiresAt,
        deepLink: "",
      };
    }

    /**
     * Create a pending session.
     */
    let connection: ApprovaSession;

    try {
      connection = await this.config.http.post<ApprovaSession>("", {
        appId: this.config.appId,
        origin: this.config.origin,
        appName: this.config.appName,
        scopes: this.config.scopes,
        userId: this.config.userId,
      });
    } catch (error) {
      if (error instanceof ApprovaError) {
        throw error;
      }

      throw new ApprovaError(
        ApprovaErrorCode.NETWORK_ERROR,
        "Failed to create an Approva session.",
        error
      );
    }

    const sessionId = connection.id;

    /**
     * Build deep link.
     */
    const deepLink = buildApprovaDeepLink(this.config.appScheme, {
      action: "connect",
      sessionId,
    });

    const result: Connection = {
      sessionId,
      status: "pending",
      expiresAt: connection.expiresAt,
      deepLink,
    };

    /**
     * Generate QR if requested.
     */
    if (options.generateQr) {
      result.qrCode = await generateQrCode(deepLink);
    }

    /**
     * Notify application.
     */
    this.config.events.emit("connection.pending", result);

    /**
     * IMPORTANT:
     *
     * Start polling BEFORE opening the deep link.
     *
     * This means we cannot miss a very fast approval.
     */
    this.startPolling(sessionId);

    /**
     * Open Approva after polling is ready.
     */
    if (options.openApp !== false) {
      openApprovaDeepLink(deepLink);
    }

    return result;
  }

  async disconnect(): Promise<void> {
    const session = this.config.sessionManager.getSession();

    if (!session) {
      return;
    }

    this.stopPolling(session.id);

    try {
      await this.config.http.delete(
        `/v1/sessions/${encodeURIComponent(session.id)}`
      );
    } catch (error) {
      if (error instanceof ApprovaError) {
        throw error;
      }

      throw new ApprovaError(
        ApprovaErrorCode.NETWORK_ERROR,
        "Failed to disconnect the Approva session.",
        error
      );
    }

    this.config.sessionManager.clear();

    this.config.events.emit("disconnected", undefined);
  }

  destroy(): void {
    for (const sessionId of this.pollingTimers.keys()) {
      this.stopPolling(sessionId);
    }
  }

  private startPolling(sessionId: string): void {
    /**
     * Prevent duplicate polling.
     */
    if (this.pollingTimers.has(sessionId)) {
      return;
    }

    this.stoppedSessions.delete(sessionId);

    void this.pollSession(sessionId);
  }

  private async pollSession(sessionId: string): Promise<void> {
    if (this.stoppedSessions.has(sessionId)) {
      return;
    }

    try {
      const session = await this.config.http.get<ApprovaSession>(
        `/${encodeURIComponent(sessionId)}`
      );

      /**
       * Session is now active.
       */
      if (session.status === "active") {
        this.stopPolling(sessionId);

        this.config.sessionManager.setSession(session);

        this.config.events.emit("connected", {
          sessionId: session.id,
          status: "connected",
          expiresAt: session.expiresAt,
          deepLink: "",
        });

        return;
      }

      /**
       * Session rejected.
       */
      if (session.status === "rejected") {
        this.stopPolling(sessionId);

        this.config.events.emit("connection.rejected", {
          sessionId: session.id,
          status: "rejected",
          expiresAt: session.expiresAt,
          deepLink: "",
        });

        return;
      }

      /**
       * Session revoked.
       */
      if (session.status === "revoked") {
        this.stopPolling(sessionId);

        this.config.sessionManager.clear();

        this.config.events.emit("disconnected", undefined);

        return;
      }

      /**
       * Session is still pending.
       */
      this.schedulePoll(sessionId);
    } catch (error) {
      /**
       * Network failure should NOT immediately
       * destroy the connection attempt.
       *
       * We simply retry.
       */
      console.warn("[Approva] Session polling failed:", error);

      this.schedulePoll(sessionId);
    }
  }

  private schedulePoll(sessionId: string): void {
    if (this.stoppedSessions.has(sessionId)) {
      return;
    }

    if (this.pollingTimers.has(sessionId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.pollingTimers.delete(sessionId);

      void this.pollSession(sessionId);
    }, 5000);

    this.pollingTimers.set(sessionId, timer);
  }

  private stopPolling(sessionId: string): void {
    this.stoppedSessions.add(sessionId);

    const timer = this.pollingTimers.get(sessionId);

    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(sessionId);
    }
  }
}
