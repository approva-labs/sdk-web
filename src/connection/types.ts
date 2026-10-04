import type { HttpClient } from "../transport/HttpClient";
import type { SessionManager } from "../session/SessionManager";
import type { EventEmitter } from "../events/EventEmitter";

export interface ConnectionManagerConfig {
  appId: string;
  userId?: string;
  appName?: string;
  origin?: string;
  scopes?: string[];
  appScheme: string;

  http: HttpClient;

  sessionManager: SessionManager;

  events: EventEmitter;
}
