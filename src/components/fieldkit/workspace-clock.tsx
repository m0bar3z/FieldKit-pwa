"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { calendarDateAt, TIME_ZONE_COOKIE } from "@/lib/product-presentation";
import { useWorkspaceFeedback } from "./workspace-feedback";

export function WorkspaceClock() {
  const router = useRouter();
  const { hasBlockingChanges } = useWorkspaceFeedback();
  useEffect(() => {
    let previousDay = "";
    function updateClock() {
      if (hasBlockingChanges() || document.visibilityState !== "visible")
        return;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}`;
      const changedZone = !document.cookie.split("; ").includes(cookie);
      const today = calendarDateAt(new Date(), timeZone);
      if (changedZone) {
        // biome-ignore lint/suspicious/noDocumentCookie: This preference also works on browsers without the Cookie Store API.
        document.cookie = `${cookie}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      }
      if (changedZone || (previousDay && previousDay !== today))
        router.refresh();
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
  }, [router, hasBlockingChanges]);
  return null;
}
