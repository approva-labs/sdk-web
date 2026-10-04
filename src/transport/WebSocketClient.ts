import { io, type Socket } from "socket.io-client";

import { ApprovaError, ApprovaErrorCode } from "./errors";

import type { WebSocketConfig } from "./transport.types";

export type WebSocketMessageHandler = (message: unknown) => void;

export class WebSocketClient {
  private socket: Socket | null = null;

  private handlers = new Set<WebSocketMessageHandler>();

  private manuallyClosed = false;

  private connecting: Promise<void> | null = null;

  constructor(private readonly config: WebSocketConfig) {}

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.manuallyClosed = false;

    this.connecting = new Promise<void>((resolve, reject) => {
      const socket = io(this.config.url, {
        path: this.config.path ?? "/socket.io",

        transports: ["websocket"],

        autoConnect: false,

        reconnection: this.config.autoReconnect ?? true,

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,

        timeout: this.config.timeout ?? 10000,
      });

      this.socket = socket;

      let settled = false;

      const handleConnect = () => {
        if (settled) {
          return;
        }

        settled = true;

        console.log("[Approva Web SDK] Realtime connected:", socket.id);

        resolve();
      };

      const handleInitialError = (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;

        console.error("[Approva Web SDK] Realtime connection failed:", error);

        reject(
          new ApprovaError(
            ApprovaErrorCode.WEBSOCKET_ERROR,
            "Approva realtime connection failed.",
            error
          )
        );
      };

      socket.once("connect", handleConnect);

      socket.once("connect_error", handleInitialError);

      /**
       * Connection lifecycle.
       */
      socket.on("disconnect", (reason) => {
        console.log("[Approva Web SDK] Realtime disconnected:", reason);

        if (this.socket === socket && !this.manuallyClosed) {
          console.log("[Approva Web SDK] Socket.IO will attempt reconnection.");
        }
      });

      socket.on("connect_error", (error) => {
        /**
         * After the initial connection,
         * Socket.IO handles reconnection.
         */
        if (settled) {
          console.error("[Approva Web SDK] Realtime reconnect error:", error);
        }
      });

      /**
       * Forward every Socket.IO event
       * to the SDK event layer.
       */
      socket.onAny((event, ...args) => {
        const message =
          args.length === 1
            ? {
                type: event,

                ...(typeof args[0] === "object" && args[0] !== null
                  ? args[0]
                  : {
                      data: args[0],
                    }),
              }
            : {
                type: event,
                data: args,
              };

        for (const handler of this.handlers) {
          try {
            handler(message);
          } catch (error) {
            console.error("[Approva Web SDK] Message handler failed:", error);
          }
        }
      });

      socket.connect();
    }).finally(() => {
      this.connecting = null;
    });

    return this.connecting;
  }

  send(event: string, data?: unknown): void {
    if (!this.socket || !this.socket.connected) {
      throw new ApprovaError(
        ApprovaErrorCode.WEBSOCKET_ERROR,
        "Approva realtime connection is not connected."
      );
    }

    this.socket.emit(event, data);
  }

  onMessage(handler: WebSocketMessageHandler): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  on(event: string, handler: (...args: any[]) => void): () => void {
    if (!this.socket) {
      throw new ApprovaError(
        ApprovaErrorCode.WEBSOCKET_ERROR,
        "Approva realtime connection has not been initialized."
      );
    }

    this.socket.on(event, handler);

    return () => {
      this.socket?.off(event, handler);
    };
  }

  emit(event: string, data?: unknown): void {
    this.send(event, data);
  }

  /**
   * Join an Approva session room.
   */
  joinSession(sessionId: string): void {
    this.send("session.join", {
      sessionId,
    });
  }

  /**
   * Leave an Approva session room.
   */
  leaveSession(sessionId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("session.leave", {
      sessionId,
    });
  }

  close(): void {
    this.manuallyClosed = true;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = null;
    this.connecting = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
