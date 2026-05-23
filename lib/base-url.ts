// Railway sets RAILWAY_PUBLIC_DOMAIN automatically; we prefer NEXT_PUBLIC_BASE_URL
// if explicitly configured, then fall back to Railway's domain, then localhost.
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'http://localhost:3000';
}
