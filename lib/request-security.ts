/** Browser mutation policy. Do not trust client-supplied forwarded host headers. */
export function isSameOriginMutation(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) return true;
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return !req.headers.has("cookie"); // authenticated browser mutations must identify origin
  try {
    const source = new URL(origin);
    const target = new URL(req.url);
    const host = req.headers.get("host") || target.host;
    return ["http:", "https:"].includes(source.protocol) && source.host === host &&
      (source.protocol === target.protocol || target.protocol === "http:"); // TLS-terminating local proxy
  } catch { return false; }
}

export function demoActionsEnabled(): boolean {
  return process.env.AYBEK_ENABLE_DEMO_ACTIONS === "1";
}

export function safeReturnPath(value: string | null, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return fallback;
  return value;
}
