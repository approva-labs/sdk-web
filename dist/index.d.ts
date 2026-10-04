type ApprovaEnvironment = "production" | "staging" | "development";
interface ApprovaConfig {
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

type ConnectionStatus = "idle" | "pending" | "connected" | "rejected" | "expired" | "disconnected";
interface ConnectOptions {
    forceNew?: boolean;
    /**
     * Opens the Approva application immediately.
     */
    openApp?: boolean;
    /**
     * Generates QR data when true.
     */
    generateQr?: boolean;
}
interface Connection {
    sessionId: string;
    status: ConnectionStatus;
    expiresAt: string;
    deepLink: string;
    qrCode?: string;
}

type AuthorizationStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
type AuthorizationAction = "purchase" | "payment" | "membership" | "subscription" | "transfer" | "mint" | "custom";
interface AuthorizationOptions {
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
interface AuthorizationRequest {
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
interface AuthorizationResult {
    requestId: string;
    status: AuthorizationStatus;
    approvedAt?: string;
    transactionHash?: string;
    signature?: string;
    chain?: "base";
    error?: string;
}

type ApprovaEventName = "connected" | "connection.pending" | "connection.rejected" | "disconnected" | "authorization.pending" | "authorization.approved" | "authorization.rejected" | "authorization.expired";
interface ApprovaEventMap {
    connected: Connection;
    "connection.pending": Connection;
    "connection.rejected": Connection;
    disconnected: void;
    "authorization.pending": AuthorizationRequest;
    "authorization.approved": AuthorizationResult;
    "authorization.rejected": AuthorizationResult;
    "authorization.expired": AuthorizationResult;
}
interface ApprovaEvent<T extends ApprovaEventName = ApprovaEventName> {
    type: T;
    data: ApprovaEventMap[T];
}
type ApprovaEventHandler<T extends ApprovaEventName> = (data: ApprovaEventMap[T]) => void;

type SessionStatus = "pending" | "active" | "expired" | "revoked" | "rejected";
interface ApprovaSession {
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

declare class ApprovaClient {
    private readonly http;
    private readonly events;
    private readonly sessionManager;
    private readonly connectionManager;
    private readonly authorizationManager;
    private readonly config;
    constructor(config: ApprovaConfig);
    /**
     * Establish an Approva connection.
     */
    connect(options?: ConnectOptions): Promise<Connection>;
    /**
     * Request authorization for an operation.
     */
    authorize(options: AuthorizationOptions): Promise<AuthorizationResult>;
    /**
     * Get the currently active Approva session.
     */
    getSession(): ApprovaSession | null;
    /**
     * Disconnect and revoke the current session.
     */
    disconnect(): Promise<void>;
    /**
     * Subscribe to an Approva event.
     */
    on<T extends ApprovaEventName>(event: T, handler: ApprovaEventHandler<T>): () => void;
    /**
     * Remove an event listener.
     */
    off<T extends ApprovaEventName>(event: T, handler: ApprovaEventHandler<T>): void;
    /**
     * Completely destroy the SDK instance.
     */
    destroy(): void;
    /**
     * Return the normalized SDK configuration.
     */
    getConfig(): ApprovaConfig;
}

declare enum ApprovaErrorCode {
    NETWORK_ERROR = "NETWORK_ERROR",
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
    SESSION_REQUIRED = "SESSION_REQUIRED",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    CONNECTION_REJECTED = "CONNECTION_REJECTED",
    AUTHORIZATION_FAILED = "AUTHORIZATION_FAILED",
    AUTHORIZATION_REJECTED = "AUTHORIZATION_REJECTED",
    AUTHORIZATION_EXPIRED = "AUTHORIZATION_EXPIRED",
    INVALID_REQUEST = "INVALID_REQUEST",
    TIMEOUT = "TIMEOUT",
    WEBSOCKET_ERROR = "WEBSOCKET_ERROR",
    NOT_FOUND = "NOT_FOUND",
    FORBIDDEN = "FORBIDDEN",
    UNAUTHORIZED = "UNAUTHORIZED",
    CONFLICT = "CONFLICT",
    RATE_LIMITED = "RATE_LIMITED",
    SERVER_ERROR = "SERVER_ERROR"
}
declare class ApprovaError extends Error {
    readonly code: ApprovaErrorCode;
    readonly details?: unknown | undefined;
    constructor(code: ApprovaErrorCode, message: string, details?: unknown | undefined);
}

export { ApprovaClient, type ApprovaConfig, type ApprovaEnvironment, ApprovaError, ApprovaErrorCode, type ApprovaEvent, type ApprovaEventName, type ApprovaSession, type AuthorizationOptions, type AuthorizationRequest, type AuthorizationResult, type AuthorizationStatus, type ConnectOptions, type Connection, type ConnectionStatus, type SessionStatus };
