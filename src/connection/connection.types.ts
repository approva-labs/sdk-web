export type ConnectionStatus =
  | "idle"
  | "pending"
  | "connected"
  | "rejected"
  | "expired"
  | "disconnected";

export interface ConnectOptions {
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

export interface Connection {
  sessionId: string;

  status: ConnectionStatus;

  expiresAt: string;

  deepLink: string;

  qrCode?: string;
}
