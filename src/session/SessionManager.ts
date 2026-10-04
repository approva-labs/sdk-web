import type { ApprovaSession } from "./session.types";

import { saveSession, loadSession, clearSession } from "./session.storage";

export class SessionManager {
  private session: ApprovaSession | null;

  constructor() {
    this.session = loadSession();
  }

  setSession(session: ApprovaSession): void {
    this.session = session;
    saveSession(session);
  }

  getSession(): ApprovaSession | null {
    return this.session;
  }

  clear(): void {
    this.session = null;
    clearSession();
  }

  isActive(): boolean {
    if (!this.session) {
      return false;
    }

    if (this.session.status !== "active") {
      return false;
    }

    return new Date(this.session.expiresAt).getTime() > Date.now();
  }
}
