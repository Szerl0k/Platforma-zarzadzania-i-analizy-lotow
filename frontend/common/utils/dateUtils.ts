/**
 * Formats an ISO datetime string into a localized PL format.
 *
 * @param iso - The ISO string to format, or null.
 * @returns A formatted date string (e.g. "05.04, 14:30") or "—" if null.
 */
export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
