/**
 * Resolve a media path from the API (e.g. /media/...) to an absolute URL for <img src>.
 */
export function getMediaUrl(path?: string | null): string | null {
  if (path == null || path === "") return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = (import.meta.env.VITE_MEDIA_URL || "http://localhost:8000").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
