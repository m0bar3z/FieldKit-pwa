"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";
import { FeedbackContext, type Notice } from "./app-feedback-context";

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const noticeId = useRef(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((message: string) => {
    setNotice({ id: ++noticeId.current, message, kind: "success" });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);

  return (
    <FeedbackContext value={{ notify, notice, dismiss }}>
      {children}
    </FeedbackContext>
  );
}
