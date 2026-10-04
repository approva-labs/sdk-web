import type { AuthorizationRequest } from "../authorization/authorization.types";

export class ApprovaModal {
  private element: HTMLDivElement | null = null;

  show(request: AuthorizationRequest): void {
    this.destroy();

    const overlay = document.createElement("div");

    overlay.style.position = "fixed";

    overlay.style.inset = "0";

    overlay.style.background = "rgba(0, 0, 0, 0.45)";

    overlay.style.display = "flex";

    overlay.style.alignItems = "center";

    overlay.style.justifyContent = "center";

    overlay.style.zIndex = "999999";

    const card = document.createElement("div");

    card.style.background = "#ffffff";

    card.style.borderRadius = "16px";

    card.style.padding = "24px";

    card.style.width = "min(420px, calc(100vw - 32px))";

    card.innerHTML = `
      <div style="font-family: sans-serif">
        <div style="
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        ">
          Approva authorization
        </div>

        <h2 style="
          margin: 0 0 12px;
          font-size: 22px;
        ">
          ${escapeHtml(request.description)}
        </h2>

        ${
          request.amount
            ? `
              <div style="
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
              ">
                ${escapeHtml(request.amount)}
                ${request.currency ? escapeHtml(` ${request.currency}`) : ""}
              </div>
            `
            : ""
        }

        <div style="
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        ">
          Open Approva on your trusted
          device to approve this request.
        </div>
      </div>
    `;

    overlay.appendChild(card);

    document.body.appendChild(overlay);

    this.element = overlay;
  }

  destroy(): void {
    this.element?.remove();

    this.element = null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
