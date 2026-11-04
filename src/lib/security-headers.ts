/**
 * HTTP security headers sent with every response (wired up in next.config.ts).
 *
 * The Content Security Policy only lets the page load code, styles, fonts and images from this
 * site. Next.js streams pages with small inline scripts, so script-src needs 'unsafe-inline';
 * a nonce-based policy would make every page dynamic for little gain on a site that renders no
 * user-written HTML. Development also needs 'unsafe-eval' and a websocket for hot reload.
 */

export interface Header {
  key: string;
  value: string;
}

export function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders(dev: boolean): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
    // Old browsers that ignore frame-ancestors: no framing (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    // HTTPS only for two years. Browsers ignore this header on plain-HTTP localhost.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}
