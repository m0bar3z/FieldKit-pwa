import { formatTaskUpdated } from "@/lib/products/presentation";

export function TaskUpdated({
  timestamp,
  timeZone,
}: {
  timestamp: number | null;
  timeZone: string;
}) {
  const label = formatTaskUpdated(timestamp, timeZone);
  if (label === null || timestamp === null) return null;
  return (
    <time
      dateTime={new Date(timestamp).toISOString()}
      className="text-xs text-muted-foreground"
    >
      {label}
    </time>
  );
}
