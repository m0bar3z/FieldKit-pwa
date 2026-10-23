"use client";

import { useEffect } from "react";
import { refreshNotes, refreshTasks } from "@/lib/api/client";
import { calendarDateAt, TIME_ZONE_COOKIE } from "@/lib/products/presentation";
import { refreshAppBadge } from "@/lib/pwa/app-badge";

export function TaskClock() {
  useEffect(() => {
    let previousDay = "";
    function updateClock() {
      if (document.visibilityState !== "visible") return;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}`;
      const changedZone = !document.cookie.split("; ").includes(cookie);
      const today = calendarDateAt(new Date(), timeZone);
      if (changedZone) {
        // biome-ignore lint/suspicious/noDocumentCookie: This preference also works on browsers without the Cookie Store API.
        document.cookie = `${cookie}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      }
      if (changedZone || (previousDay && previousDay !== today)) {
        refreshTasks();
        void refreshAppBadge();
      }
      if (changedZone) refreshNotes();
      previousDay = today;
    }
    updateClock();
    const timer = window.setInterval(updateClock, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") updateClock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
