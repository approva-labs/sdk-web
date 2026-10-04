import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";

import { ApprovaError, ApprovaErrorCode } from "./errors";

import type { HttpClientConfig } from "./transport.types";

interface ApprovaErrorResponse {
  message?: string;
  code?: string;
  details?: unknown;
  error?: string;
}

export class HttpClient {
  private readonly client: AxiosInstance;

  constructor(private readonly config: HttpClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ""),
      timeout: config.timeout,

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      /**
       * Allows browser cookies to be sent when
       * the backend uses credentialed CORS.
       */
      withCredentials: true,
    });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: "GET",
    });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      data: body,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      data: body,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      data: body,
    });
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      data: body,
    });
  }

  private async request<T>(
    path: string,
    config: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        url: path,
        ...config,
      });

      return response.data;
    } catch (error) {
      throw this.toApprovaError(error, path);
    }
  }

  private toApprovaError(error: unknown, path: string): ApprovaError {
    /**
     * Don't wrap errors that have already
     * been normalized.
     */
    if (error instanceof ApprovaError) {
      return error;
    }

    /**
     * Axios error.
     */
    if (axios.isAxiosError(error)) {
      return this.handleAxiosError(error, path);
    }

    /**
     * Unknown JavaScript error.
     */
    return new ApprovaError(
      ApprovaErrorCode.NETWORK_ERROR,
      "Unable to communicate with Approva.",
      {
        path,
        cause: error instanceof Error ? error.message : error,
      }
    );
  }

  private handleAxiosError(
    error: AxiosError<ApprovaErrorResponse>,
    path: string
  ): ApprovaError {
    /**
     * Timeout.
     *
     * Axios uses ECONNABORTED or ETIMEDOUT
     * depending on configuration/version.
     */
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApprovaError(
        ApprovaErrorCode.TIMEOUT,
        "Approva request timed out.",
        {
          path,
          cause: error.message,
        }
      );
    }

    /**
     * Request was sent but the server did
     * not return a response.
     *
     * Usually:
     * - server unavailable
     * - DNS failure
     * - CORS/network failure
     * - connection refused
     */
    if (!error.response) {
      return new ApprovaError(
        ApprovaErrorCode.NETWORK_ERROR,
        "Unable to communicate with Approva.",
        {
          path,
          cause: error.message,
        }
      );
    }

    const status = error.response.status;

    const data = error.response.data;

    /**
     * Prefer the error returned by the
     * Approva backend.
     */
    const message =
      data?.message ??
      data?.error ??
      `Approva request failed with status ${status}.`;

    /**
     * Convert HTTP status into a stable
     * SDK error code.
     */
    const code = this.resolveErrorCode(status, data?.code);

    return new ApprovaError(code, message, {
      path,
      status,
      details: data?.details ?? data,
    });
  }

  private resolveErrorCode(
    status: number,
    serverCode?: string
  ): ApprovaErrorCode {
    /**
     * If the backend sends one of our known
     * error codes, preserve it.
     */
    if (serverCode && this.isApprovaErrorCode(serverCode)) {
      return serverCode;
    }

    switch (status) {
      case 400:
        return ApprovaErrorCode.INVALID_REQUEST;

      case 401:
        return ApprovaErrorCode.UNAUTHORIZED;

      case 403:
        return ApprovaErrorCode.FORBIDDEN;

      case 404:
        return ApprovaErrorCode.NOT_FOUND;

      case 409:
        return ApprovaErrorCode.CONFLICT;

      case 410:
        return ApprovaErrorCode.SESSION_EXPIRED;

      case 408:
        return ApprovaErrorCode.TIMEOUT;

      case 422:
        return ApprovaErrorCode.INVALID_REQUEST;

      case 429:
        return ApprovaErrorCode.RATE_LIMITED;

      case 500:
      case 502:
      case 503:
      case 504:
        return ApprovaErrorCode.SERVER_ERROR;

      default:
        return ApprovaErrorCode.NETWORK_ERROR;
    }
  }

  private isApprovaErrorCode(code: string): code is ApprovaErrorCode {
    return Object.values(ApprovaErrorCode).includes(code as ApprovaErrorCode);
  }
}
