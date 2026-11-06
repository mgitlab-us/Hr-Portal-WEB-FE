const DEFAULT_API_URL = 'http://localhost:4000/api/v1';
const DEFAULT_SOCKET_URL = 'http://localhost:4000';

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

/**
 * Resolve the origin Socket.IO should connect to.
 *
 * The REST API is served from a same-origin path (`/api/v1`) in production and
 * proxied by Vercel, but WebSocket upgrades are not proxied by that path. When
 * the API URL is relative we therefore need the API host directly.
 *
 * Set `NEXT_PUBLIC_SOCKET_URL` to override the inferred origin.
 */
export function getSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

  if (/^https?:\/\//i.test(apiUrl)) {
    try {
      const apiOrigin = new URL(apiUrl).origin;
      // A same-origin absolute URL has the same WebSocket limitation as a
      // relative path, so let the host-based fallback below handle it.
      if (typeof window === 'undefined' || apiOrigin !== window.location.origin) {
        return apiOrigin;
      }
    } catch {
      return DEFAULT_SOCKET_URL;
    }
  }

  if (typeof window === 'undefined') {
    return DEFAULT_SOCKET_URL;
  }

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEFAULT_SOCKET_URL;
  }

  // The deployed web app uses the `www.` host and proxies REST calls through
  // `/api/v1`; the Socket.IO server lives on the API subdomain.
  if (hostname === 'itapin.com' || hostname.endsWith('.itapin.com')) {
    return 'https://api.itapin.com';
  }

  return window.location.origin;
}
