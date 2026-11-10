/** datetime-local represents the browser's local time, not UTC. */
export function reminderLocalTime(timestamp: number | null | undefined) {
  if (timestamp == null) return "";
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function reminderTimestamp(value: string): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  // Reject nonexistent local times (e.g. a daylight-saving clock jump).
  return Number.isFinite(timestamp) && reminderLocalTime(timestamp) === value
    ? timestamp
    : Number.NaN;
}
export function reminderSelectionError(
  selected: number | null | undefined,
  original?: number | null,
  now = Date.now(),
) {
  return selected != null && selected !== original && selected <= now
    ? "Choose a future reminder time, or clear the reminder."
    : null;
}
