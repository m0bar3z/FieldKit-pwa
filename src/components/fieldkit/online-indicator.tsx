"use client";

import { WifiIcon, WifiOffIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OnlineIndicator() {
  const isOnline = useOnlineStatus();
  const Icon = isOnline ? WifiIcon : WifiOffIcon;

  return (
    <Badge
      variant={isOnline ? "outline" : "destructive"}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={
        isOnline
          ? "You're connected to a network."
          : "You're offline. Some actions may be unavailable."
      }
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      <span className="sr-only">Network status: </span>
      {isOnline ? "Online" : "Offline"}
    </Badge>
  );
}
