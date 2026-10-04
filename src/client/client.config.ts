import { z } from "zod";

/**
 * Approva Web SDK configuration.
 *
 * This configuration is safe to use in a browser.
 *
 * IMPORTANT:
 * - Never put private keys here.
 * - Never put server secrets here.
 * - Never put database credentials here.
 * - Never put wallet private keys here.
 */

export const ApprovaEnvironmentSchema = z.enum([
  "development",
  "staging",
  "production",
]);

export type ApprovaEnvironment = z.infer<typeof ApprovaEnvironmentSchema>;

export const ApprovaClientConfigSchema = z.object({
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
  requestTimeoutMs: z.number().int().positive().default(15_000),

  /**
   * Number of times the SDK will retry transient
   * network requests.
   */
  maxRetries: z.number().int().min(0).max(5).default(2),

  /**
   * Whether browser debug logging is enabled.
   */
  debug: z.boolean().default(false),
});

export type ApprovaClientConfig = z.input<typeof ApprovaClientConfigSchema>;

export type ResolvedApprovaClientConfig = z.output<
  typeof ApprovaClientConfigSchema
>;

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Partial<ApprovaClientConfig> = {
  apiUrl: "http://localhost:3000",
  environment: "development",
  appScheme: "approva://",
  connectionPath: "/connect",
  authorizationPath: "/authorize",
  requestTimeoutMs: 15_000,
  maxRetries: 2,
  debug: false,
};

/**
 * Creates and validates the final SDK configuration.
 */
export function createClientConfig(
  config: ApprovaClientConfig
): ResolvedApprovaClientConfig {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const result = ApprovaClientConfigSchema.safeParse(mergedConfig);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid Approva Web SDK configuration:\n${formattedErrors}`
    );
  }

  return result.data;
}

/**
 * Determines whether the SDK is running in production.
 */
export function isProductionEnvironment(
  config: ResolvedApprovaClientConfig
): boolean {
  return config.environment === "production";
}

/**
 * Determines whether the SDK is running locally.
 */
export function isDevelopmentEnvironment(
  config: ResolvedApprovaClientConfig
): boolean {
  return config.environment === "development";
}

/**
 * Removes a trailing slash from a URL.
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Creates an Approva deep link.
 *
 * Example:
 *
 * approva://connect?appId=my-app&sessionId=abc
 */
export function createDeepLink(
  config: ResolvedApprovaClientConfig,
  path: string,
  params: Record<string, string | number | boolean>
): string {
  const normalizedScheme = config.appScheme.endsWith("://")
    ? config.appScheme
    : `${config.appScheme}://`;

  const normalizedPath = path.replace(/^\/+/, "");

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }

  return `${normalizedScheme}${normalizedPath}?${searchParams.toString()}`;
}

/**
 * Creates the connection deep link for the Approva app.
 */
export function createConnectionDeepLink(
  config: ResolvedApprovaClientConfig,
  params: {
    sessionId: string;
    challenge: string;
  }
): string {
  return createDeepLink(config, config.connectionPath, {
    appId: config.appId,
    sessionId: params.sessionId,
    challenge: params.challenge,
  });
}

/**
 * Creates an authorization deep link for an existing
 * Approva session.
 */
export function createAuthorizationDeepLink(
  config: ResolvedApprovaClientConfig,
  params: {
    sessionId: string;
    requestId: string;
  }
): string {
  return createDeepLink(config, config.authorizationPath, {
    appId: config.appId,
    sessionId: params.sessionId,
    requestId: params.requestId,
  });
}

/**
 * Returns the API endpoint used by the SDK.
 */
export function createApiUrl(
  config: ResolvedApprovaClientConfig,
  path: string
): string {
  const baseUrl = normalizeBaseUrl(config.apiUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

/**
 * Creates an AbortSignal with the SDK request timeout.
 */
export function createRequestTimeout(
  config: ResolvedApprovaClientConfig
): AbortSignal {
  return AbortSignal.timeout(config.requestTimeoutMs);
}

/**
 * Optional debug logger used internally by the SDK.
 */
export function createLogger(config: ResolvedApprovaClientConfig) {
  return {
    debug(...messages: unknown[]): void {
      if (!config.debug) {
        return;
      }

      console.debug("[Approva]", ...messages);
    },

    info(...messages: unknown[]): void {
      if (!config.debug) {
        return;
      }

      console.info("[Approva]", ...messages);
    },

    warn(...messages: unknown[]): void {
      console.warn("[Approva]", ...messages);
    },

    error(...messages: unknown[]): void {
      console.error("[Approva]", ...messages);
    },
  };
}
