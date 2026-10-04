import type { Connection } from "../connection/connection.types";

export class ConnectionModal {
  private element: HTMLDivElement | null = null;

  show(connection: Connection): void {
    this.destroy();

    const overlay = document.createElement("div");

    overlay.style.position = "fixed";

    overlay.style.inset = "0";

    overlay.style.background = "rgba(0,0,0,.45)";

    overlay.style.display = "flex";

    overlay.style.alignItems = "center";

    overlay.style.justifyContent = "center";

    overlay.style.zIndex = "999999";

    const card = document.createElement("div");

    card.style.background = "#fff";

    card.style.borderRadius = "16px";

    card.style.padding = "24px";

    card.style.width = "min(420px, calc(100vw - 32px))";

    card.innerHTML = `
      <div style="
        font-family: sans-serif;
        text-align: center;
      ">
        <h2>Connect Approva</h2>

        <p style="
          color: #666;
          line-height: 1.5;
        ">
          Open Approva on your trusted
          device to connect this website.
        </p>

        <a
          href="${escapeAttribute(connection.deepLink)}"
          style="
            display: inline-block;
            background: #111;
            color: #fff;
            padding: 12px 18px;
            border-radius: 10px;
            text-decoration: none;
          "
        >
          Open Approva
        </a>

        ${
          connection.qrCode
            ? `
              <div style="margin-top:20px">
                <img
                  src="${connection.qrCode}"
                  width="220"
                  height="220"
                  alt="Approva connection QR code"
                />
              </div>
            `
            : ""
        }
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

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
