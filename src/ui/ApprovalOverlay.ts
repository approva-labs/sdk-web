export class ApprovalOverlay {
  private element: HTMLDivElement | null = null;

  show(message = "Waiting for approval…"): void {
    this.destroy();

    const overlay = document.createElement("div");

    overlay.style.position = "fixed";

    overlay.style.inset = "0";

    overlay.style.background = "rgba(255,255,255,0.96)";

    overlay.style.display = "flex";

    overlay.style.alignItems = "center";

    overlay.style.justifyContent = "center";

    overlay.style.zIndex = "1000000";

    overlay.innerHTML = `
      <div style="
        text-align: center;
        font-family: sans-serif;
      ">
        <div style="
          width: 42px;
          height: 42px;
          border: 4px solid #ddd;
          border-top-color: #111;
          border-radius: 50%;
          animation: approva-spin 1s linear infinite;
          margin: 0 auto 16px;
        "></div>

        <div style="
          font-size: 16px;
          font-weight: 600;
        ">
          ${escapeHtml(message)}
        </div>
      </div>

      <style>
        @keyframes approva-spin {
          to {
            transform: rotate(360deg);
          }
        }
      </style>
    `;

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
