import type { ApprovaConfig } from "./client.types";

import { ConnectionManager } from "../connection/ConnectionManager";
import { AuthorizationManager } from "../authorization/AuthorizationManager";
import { SessionManager } from "../session/SessionManager";

import { HttpClient } from "../transport/HttpClient";
import { WebSocketClient } from "../transport/WebSocketClient";

import { EventEmitter } from "../events/EventEmitter";

import type {
  ApprovaEventName,
  ApprovaEventHandler,
} from "../events/event.types";

import type {
  ConnectOptions,
  Connection,
} from "../connection/connection.types";

import type {
  AuthorizationOptions,
  AuthorizationResult,
} from "../authorization/authorization.types";

import type { ApprovaSession } from "../session/session.types";

import { createClientConfig } from "./client.config";

export class ApprovaClient {
  private readonly http: HttpClient;
  private readonly events: EventEmitter;

  private readonly sessionManager: SessionManager;
  private readonly connectionManager: ConnectionManager;
  private readonly authorizationManager: AuthorizationManager;

  private readonly config: ApprovaConfig;

  constructor(config: ApprovaConfig) {
    /**
     * Always normalize/validate the configuration first.
     */
    this.config = createClientConfig(config);

    this.events = new EventEmitter();

    /**
     * REST client.
     */
    this.http = new HttpClient({
      baseUrl: this.config.apiUrl,
      timeout: this.config.requestTimeout ?? 15000,
    });

    /**
     * Socket.IO realtime client.
     *
     * For example:
     *
     * apiUrl:
     *   http://localhost:8001/api/v1
     *
     * becomes:
     *
     * http://localhost:8001
     *
     * Socket.IO itself handles the /socket.io endpoint.
     */
    /**
     * Local session state.
     */
    this.sessionManager = new SessionManager();

    /**
     * Connection manager.
     *
     * This handles:
     *
     * 1. Creating a session request
     * 2. Establishing Socket.IO
     * 3. Joining the session room
     * 4. Creating the deep link
     * 5. Opening the Approva app
     * 6. Receiving approval/rejection
     * 7. Persisting the active session
     */
    this.connectionManager = new ConnectionManager({
      appId: this.config.appId,

      origin: this.config.origin,

      userId: this.config.userId,

      scopes: this.config.scopes,

      appName: this.config.appName,

      appScheme: this.config.appScheme ?? "approva",

      http: this.http,

      sessionManager: this.sessionManager,

      events: this.events,
    });

    /**
     * Authorization manager.
     *
     * Uses the same Socket.IO connection as
     * ConnectionManager.
     */
    this.authorizationManager = new AuthorizationManager({
      appId: this.config.appId,

      http: this.http,

      sessionManager: this.sessionManager,

      events: this.events,
    });
  }

  /**
   * Establish an Approva connection.
   */
  async connect(options: ConnectOptions = {}): Promise<Connection> {
    return this.connectionManager.connect(options);
  }

  /**
   * Request authorization for an operation.
   */
  async authorize(options: AuthorizationOptions): Promise<AuthorizationResult> {
    return this.authorizationManager.authorize(options);
  }

  /**
   * Get the currently active Approva session.
   */
  getSession(): ApprovaSession | null {
    return this.sessionManager.getSession();
  }

  /**
   * Disconnect and revoke the current session.
   */
  async disconnect(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  /**
   * Subscribe to an Approva event.
   */
  on<T extends ApprovaEventName>(
    event: T,
    handler: ApprovaEventHandler<T>
  ): () => void {
    return this.events.on(event, handler);
  }

  /**
   * Remove an event listener.
   */
  off<T extends ApprovaEventName>(
    event: T,
    handler: ApprovaEventHandler<T>
  ): void {
    this.events.off(event, handler);
  }

  /**
   * Completely destroy the SDK instance.
   */
  destroy(): void {
    this.sessionManager.clear();

    this.events.removeAllListeners();
  }

  /**
   * Return the normalized SDK configuration.
   */
  getConfig(): ApprovaConfig {
    return this.config;
  }
}
