/**
 * Resolves image URL for display. Backend stores relative paths like /uploads/avatars/xxx.jpg;
 * those must be requested from the API origin.
 */
export function resolveImageUrl(
  url: string | null | undefined,
  apiBase: string
): string | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${apiBase.replace(/\/$/, "")}${path}`;
}
