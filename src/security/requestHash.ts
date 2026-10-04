export async function hashAuthorizationRequest(
  request: unknown
): Promise<string> {
  const canonical = canonicalize(request);

  const encoder = new TextEncoder();

  const data = encoder.encode(canonical);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return bytesToHex(new Uint8Array(digest));
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const object = value as Record<string, unknown>;

  const keys = Object.keys(object).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(",")}}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
