export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
}

export interface WebSocketConfig {
  path: string;
  timeout: number;
  url: string;
  autoReconnect: boolean;
}

export interface ApiResponse<T> {
  data: T;
  requestId?: string;
}
