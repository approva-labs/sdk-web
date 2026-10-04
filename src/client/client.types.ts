export type ApprovaEnvironment = "production" | "staging" | "development";

export interface ApprovaConfig {
  /**
   * Unique Approva application ID.
   */
  appId: string;

  /**
   * Origin of the application using the SDK.
   *
   * Example:
   * http://localhost:3000
   */
  origin: string;

  /**
   * Optional user ID associated with the connection.
   *
   * Example:
   * user_123
   */
  userId?: string;

  /**
   * Permissions requested when establishing a connection.
   *
   * Example:
   * ['connect', 'approve']
   */
  scopes: string[];

  /**
   * Approva API base URL.
   */
  apiUrl: string;

  environment?: ApprovaEnvironment;

  /**
   * Optional explicit WebSocket endpoint.
   * If omitted, it is derived from apiUrl.
   */
  wsUrl?: string;

  /**
   * Deep-link scheme registered by the application.
   *
   * Example:
   * approva
   */
  appScheme?: string;

  /**
   * Optional application name shown to the user.
   */
  appName?: string;

  /**
   * Request timeout in milliseconds.
   */
  requestTimeout?: number;

  /**
   * Automatically reconnect WebSocket connections.
   */
  autoReconnect?: boolean;

  /**
   * Whether the SDK should display its default UI.
   */
  useDefaultUi?: boolean;
}
