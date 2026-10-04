import QRCode from 'qrcode';
import axios from 'axios';
import { z } from 'zod';

// src/transport/errors.ts
var ApprovaErrorCode = /* @__PURE__ */ ((ApprovaErrorCode2) => {
  ApprovaErrorCode2["NETWORK_ERROR"] = "NETWORK_ERROR";
  ApprovaErrorCode2["INVALID_CONFIGURATION"] = "INVALID_CONFIGURATION";
  ApprovaErrorCode2["SESSION_REQUIRED"] = "SESSION_REQUIRED";
  ApprovaErrorCode2["SESSION_EXPIRED"] = "SESSION_EXPIRED";
  ApprovaErrorCode2["CONNECTION_FAILED"] = "CONNECTION_FAILED";
  ApprovaErrorCode2["CONNECTION_REJECTED"] = "CONNECTION_REJECTED";
  ApprovaErrorCode2["AUTHORIZATION_FAILED"] = "AUTHORIZATION_FAILED";
  ApprovaErrorCode2["AUTHORIZATION_REJECTED"] = "AUTHORIZATION_REJECTED";
  ApprovaErrorCode2["AUTHORIZATION_EXPIRED"] = "AUTHORIZATION_EXPIRED";
  ApprovaErrorCode2["INVALID_REQUEST"] = "INVALID_REQUEST";
  ApprovaErrorCode2["TIMEOUT"] = "TIMEOUT";
  ApprovaErrorCode2["WEBSOCKET_ERROR"] = "WEBSOCKET_ERROR";
  ApprovaErrorCode2["NOT_FOUND"] = "NOT_FOUND";
  ApprovaErrorCode2["FORBIDDEN"] = "FORBIDDEN";
  ApprovaErrorCode2["UNAUTHORIZED"] = "UNAUTHORIZED";
  ApprovaErrorCode2["CONFLICT"] = "CONFLICT";
  ApprovaErrorCode2["RATE_LIMITED"] = "RATE_LIMITED";
  ApprovaErrorCode2["SERVER_ERROR"] = "SERVER_ERROR";
  return ApprovaErrorCode2;
})(ApprovaErrorCode || {});
var ApprovaError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ApprovaError";
  }
  code;
  details;
};

// src/connection/deepLink.ts
function buildApprovaDeepLink(scheme, params) {
  const normalizedScheme = scheme.trim().replace(/:\/+$/, "").replace(/\/+$/, "");
  if (!normalizedScheme) {
    throw new Error("Approva app scheme cannot be empty.");
  }
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
function openApprovaDeepLink(deepLink) {
  window.location.assign(deepLink);
}
async function generateQrCode(value) {
  return QRCode.toDataURL(value, {
    width: 320,
    margin: 2
  });
}

// src/connection/ConnectionManager.ts
var ConnectionManager = class {
  constructor(config) {
    this.config = config;
  }
  config;
  pollingTimers = /* @__PURE__ */ new Map();
  stoppedSessions = /* @__PURE__ */ new Set();
  async connect(options = {}) {
    if (!options.forceNew && this.config.sessionManager.isActive()) {
      const session = this.config.sessionManager.getSession();
      if (!session) {
        throw new ApprovaError(
          "SESSION_REQUIRED" /* SESSION_REQUIRED */,
          "Active session could not be loaded."
        );
      }
      return {
        sessionId: session.id,
        status: "connected",
        expiresAt: session.expiresAt,
        deepLink: ""
      };
    }
    let connection;
    try {
      connection = await this.config.http.post("", {
        appId: this.config.appId,
        origin: this.config.origin,
        appName: this.config.appName,
        scopes: this.config.scopes,
        userId: this.config.userId
      });
    } catch (error) {
      if (error instanceof ApprovaError) {
        throw error;
      }
      throw new ApprovaError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        "Failed to create an Approva session.",
        error
      );
    }
    const sessionId = connection.id;
    const deepLink = buildApprovaDeepLink(this.config.appScheme, {
      action: "connect",
      sessionId
    });
    const result = {
      sessionId,
      status: "pending",
      expiresAt: connection.expiresAt,
      deepLink
    };
    if (options.generateQr) {
      result.qrCode = await generateQrCode(deepLink);
    }
    this.config.events.emit("connection.pending", result);
    this.startPolling(sessionId);
    if (options.openApp !== false) {
      openApprovaDeepLink(deepLink);
    }
    return result;
  }
  async disconnect() {
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
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        "Failed to disconnect the Approva session.",
        error
      );
    }
    this.config.sessionManager.clear();
    this.config.events.emit("disconnected", void 0);
  }
  destroy() {
    for (const sessionId of this.pollingTimers.keys()) {
      this.stopPolling(sessionId);
    }
  }
  startPolling(sessionId) {
    if (this.pollingTimers.has(sessionId)) {
      return;
    }
    this.stoppedSessions.delete(sessionId);
    void this.pollSession(sessionId);
  }
  async pollSession(sessionId) {
    if (this.stoppedSessions.has(sessionId)) {
      return;
    }
    try {
      const session = await this.config.http.get(
        `/${encodeURIComponent(sessionId)}`
      );
      if (session.status === "active") {
        this.stopPolling(sessionId);
        this.config.sessionManager.setSession(session);
        this.config.events.emit("connected", {
          sessionId: session.id,
          status: "connected",
          expiresAt: session.expiresAt,
          deepLink: ""
        });
        return;
      }
      if (session.status === "rejected") {
        this.stopPolling(sessionId);
        this.config.events.emit("connection.rejected", {
          sessionId: session.id,
          status: "rejected",
          expiresAt: session.expiresAt,
          deepLink: ""
        });
        return;
      }
      if (session.status === "revoked") {
        this.stopPolling(sessionId);
        this.config.sessionManager.clear();
        this.config.events.emit("disconnected", void 0);
        return;
      }
      this.schedulePoll(sessionId);
    } catch (error) {
      console.warn("[Approva] Session polling failed:", error);
      this.schedulePoll(sessionId);
    }
  }
  schedulePoll(sessionId) {
    if (this.stoppedSessions.has(sessionId)) {
      return;
    }
    if (this.pollingTimers.has(sessionId)) {
      return;
    }
    const timer = setTimeout(() => {
      this.pollingTimers.delete(sessionId);
      void this.pollSession(sessionId);
    }, 5e3);
    this.pollingTimers.set(sessionId, timer);
  }
  stopPolling(sessionId) {
    this.stoppedSessions.add(sessionId);
    const timer = this.pollingTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(sessionId);
    }
  }
};

// src/authorization/AuthorizationManager.ts
var AuthorizationManager = class {
  constructor(config) {
    this.config = config;
  }
  config;
  async authorize(options) {
    if (!this.config.sessionManager.isActive()) {
      throw new ApprovaError(
        "SESSION_REQUIRED" /* SESSION_REQUIRED */,
        "Connect an Approva device before requesting authorization."
      );
    }
    const session = this.config.sessionManager.getSession();
    if (!session) {
      throw new ApprovaError(
        "SESSION_REQUIRED" /* SESSION_REQUIRED */,
        "Approva session is unavailable."
      );
    }
    const request = await this.config.http.post(
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
        expiresInSeconds: options.expiresInSeconds ?? 300
      }
    );
    this.config.events.emit("authorization.pending", request);
    const deepLink = buildApprovaDeepLink("approva", {
      action: "authorize",
      requestId: request.requestId,
      sessionId: session.id,
      callbackUrl: window.location.href
    });
    openApprovaDeepLink(deepLink);
  }
};

// src/session/session.storage.ts
var STORAGE_KEY = "approva.session";
function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
function loadSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// src/session/SessionManager.ts
var SessionManager = class {
  session;
  constructor() {
    this.session = loadSession();
  }
  setSession(session) {
    this.session = session;
    saveSession(session);
  }
  getSession() {
    return this.session;
  }
  clear() {
    this.session = null;
    clearSession();
  }
  isActive() {
    if (!this.session) {
      return false;
    }
    if (this.session.status !== "active") {
      return false;
    }
    return new Date(this.session.expiresAt).getTime() > Date.now();
  }
};
var HttpClient = class {
  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ""),
      timeout: config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      /**
       * Allows browser cookies to be sent when
       * the backend uses credentialed CORS.
       */
      withCredentials: true
    });
  }
  config;
  client;
  async get(path) {
    return this.request(path, {
      method: "GET"
    });
  }
  async post(path, body) {
    return this.request(path, {
      method: "POST",
      data: body
    });
  }
  async put(path, body) {
    return this.request(path, {
      method: "PUT",
      data: body
    });
  }
  async patch(path, body) {
    return this.request(path, {
      method: "PATCH",
      data: body
    });
  }
  async delete(path, body) {
    return this.request(path, {
      method: "DELETE",
      data: body
    });
  }
  async request(path, config) {
    try {
      const response = await this.client.request({
        url: path,
        ...config
      });
      return response.data;
    } catch (error) {
      throw this.toApprovaError(error, path);
    }
  }
  toApprovaError(error, path) {
    if (error instanceof ApprovaError) {
      return error;
    }
    if (axios.isAxiosError(error)) {
      return this.handleAxiosError(error, path);
    }
    return new ApprovaError(
      "NETWORK_ERROR" /* NETWORK_ERROR */,
      "Unable to communicate with Approva.",
      {
        path,
        cause: error instanceof Error ? error.message : error
      }
    );
  }
  handleAxiosError(error, path) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApprovaError(
        "TIMEOUT" /* TIMEOUT */,
        "Approva request timed out.",
        {
          path,
          cause: error.message
        }
      );
    }
    if (!error.response) {
      return new ApprovaError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        "Unable to communicate with Approva.",
        {
          path,
          cause: error.message
        }
      );
    }
    const status = error.response.status;
    const data = error.response.data;
    const message = data?.message ?? data?.error ?? `Approva request failed with status ${status}.`;
    const code = this.resolveErrorCode(status, data?.code);
    return new ApprovaError(code, message, {
      path,
      status,
      details: data?.details ?? data
    });
  }
  resolveErrorCode(status, serverCode) {
    if (serverCode && this.isApprovaErrorCode(serverCode)) {
      return serverCode;
    }
    switch (status) {
      case 400:
        return "INVALID_REQUEST" /* INVALID_REQUEST */;
      case 401:
        return "UNAUTHORIZED" /* UNAUTHORIZED */;
      case 403:
        return "FORBIDDEN" /* FORBIDDEN */;
      case 404:
        return "NOT_FOUND" /* NOT_FOUND */;
      case 409:
        return "CONFLICT" /* CONFLICT */;
      case 410:
        return "SESSION_EXPIRED" /* SESSION_EXPIRED */;
      case 408:
        return "TIMEOUT" /* TIMEOUT */;
      case 422:
        return "INVALID_REQUEST" /* INVALID_REQUEST */;
      case 429:
        return "RATE_LIMITED" /* RATE_LIMITED */;
      case 500:
      case 502:
      case 503:
      case 504:
        return "SERVER_ERROR" /* SERVER_ERROR */;
      default:
        return "NETWORK_ERROR" /* NETWORK_ERROR */;
    }
  }
  isApprovaErrorCode(code) {
    return Object.values(ApprovaErrorCode).includes(code);
  }
};

// src/events/EventEmitter.ts
var EventEmitter = class {
  listeners = /* @__PURE__ */ new Map();
  on(event, handler) {
    let listeners = this.listeners.get(event);
    if (!listeners) {
      listeners = /* @__PURE__ */ new Set();
      this.listeners.set(event, listeners);
    }
    listeners.add(handler);
    return () => {
      this.off(event, handler);
    };
  }
  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }
  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(data);
    }
  }
  removeAllListeners() {
    this.listeners.clear();
  }
};
var ApprovaEnvironmentSchema = z.enum([
  "development",
  "staging",
  "production"
]);
var ApprovaClientConfigSchema = z.object({
  /**
   * Public identifier assigned to the application
   * integrating Approva.
   */
  appId: z.string().min(1, "Approva appId is required"),
  /**
   * Optional user ID associated with the SDK connection.
   */
  userId: z.string().min(1, "userId cannot be empty").optional(),
  /**
   * Application origin.
   *
   * Example:
   * http://localhost:3000
   */
  origin: z.string().url("origin must be a valid URL"),
  /**
   * Permissions requested when establishing
   * an Approva connection.
   *
   * Example:
   * ["connect", "approve"]
   */
  scopes: z.array(z.string().min(1)).min(1, "At least one scope is required"),
  /**
   * Approva API base URL.
   */
  apiUrl: z.string().url("apiUrl must be a valid URL"),
  /**
   * Environment the SDK is operating in.
   */
  environment: ApprovaEnvironmentSchema.default("production"),
  /**
   * Optional public API key.
   *
   * This must NEVER be treated as a secret.
   */
  publicKey: z.string().min(1).optional(),
  /**
   * URL scheme used to open the Approva mobile app.
   *
   * Example:
   * approva://
   */
  appScheme: z.string().min(1).default("approva://"),
  /**
   * Deep-link path used for connection requests.
   */
  connectionPath: z.string().min(1).default("/connect"),
  /**
   * Deep-link path used for authorization requests.
   */
  authorizationPath: z.string().min(1).default("/authorize"),
  /**
   * Optional URL of the Approva web fallback.
   */
  webFallbackUrl: z.string().url().optional(),
  /**
   * Request timeout in milliseconds.
   */
  requestTimeoutMs: z.number().int().positive().default(15e3),
  /**
   * Number of times the SDK will retry transient
   * network requests.
   */
  maxRetries: z.number().int().min(0).max(5).default(2),
  /**
   * Whether browser debug logging is enabled.
   */
  debug: z.boolean().default(false)
});
var DEFAULT_CONFIG = {
  apiUrl: "http://localhost:3000",
  environment: "development",
  appScheme: "approva://",
  connectionPath: "/connect",
  authorizationPath: "/authorize",
  requestTimeoutMs: 15e3,
  maxRetries: 2,
  debug: false
};
function createClientConfig(config) {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  const result = ApprovaClientConfigSchema.safeParse(mergedConfig);
  if (!result.success) {
    const formattedErrors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(
      `Invalid Approva Web SDK configuration:
${formattedErrors}`
    );
  }
  return result.data;
}

// src/client/ApprovaClient.ts
var ApprovaClient = class {
  http;
  events;
  sessionManager;
  connectionManager;
  authorizationManager;
  config;
  constructor(config) {
    this.config = createClientConfig(config);
    this.events = new EventEmitter();
    this.http = new HttpClient({
      baseUrl: this.config.apiUrl,
      timeout: this.config.requestTimeout ?? 15e3
    });
    this.sessionManager = new SessionManager();
    this.connectionManager = new ConnectionManager({
      appId: this.config.appId,
      origin: this.config.origin,
      userId: this.config.userId,
      scopes: this.config.scopes,
      appName: this.config.appName,
      appScheme: this.config.appScheme ?? "approva",
      http: this.http,
      sessionManager: this.sessionManager,
      events: this.events
    });
    this.authorizationManager = new AuthorizationManager({
      appId: this.config.appId,
      http: this.http,
      sessionManager: this.sessionManager,
      events: this.events
    });
  }
  /**
   * Establish an Approva connection.
   */
  async connect(options = {}) {
    return this.connectionManager.connect(options);
  }
  /**
   * Request authorization for an operation.
   */
  async authorize(options) {
    return this.authorizationManager.authorize(options);
  }
  /**
   * Get the currently active Approva session.
   */
  getSession() {
    return this.sessionManager.getSession();
  }
  /**
   * Disconnect and revoke the current session.
   */
  async disconnect() {
    await this.connectionManager.disconnect();
  }
  /**
   * Subscribe to an Approva event.
   */
  on(event, handler) {
    return this.events.on(event, handler);
  }
  /**
   * Remove an event listener.
   */
  off(event, handler) {
    this.events.off(event, handler);
  }
  /**
   * Completely destroy the SDK instance.
   */
  destroy() {
    this.sessionManager.clear();
    this.events.removeAllListeners();
  }
  /**
   * Return the normalized SDK configuration.
   */
  getConfig() {
    return this.config;
  }
};

export { ApprovaClient, ApprovaError, ApprovaErrorCode };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map