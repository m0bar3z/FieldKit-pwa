"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";
import {
  FeedbackContext,
  type FormStatus,
  type Notice,
} from "./workspace-feedback-context";

export function WorkspaceFeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const guards = useRef(new Map<string, FormStatus>());
  const noticeId = useRef(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const setGuard = useCallback((id: string, status: FormStatus | null) => {
    if (status && (status.dirty || status.pending))
      guards.current.set(id, status);
    else guards.current.delete(id);
  }, []);
  const hasBlockingChanges = useCallback(() => guards.current.size > 0, []);
  const notify = useCallback((message: string) => {
    setNotice({ id: ++noticeId.current, message, kind: "success" });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);
  const requestLeave = useCallback((next: () => void) => {
    const statuses = [...guards.current.values()];
    if (statuses.some((status) => status.pending)) {
      setNotice({
        id: ++noticeId.current,
        message: "Please wait until saving finishes.",
        kind: "info",
      });
    } else if (statuses.some((status) => status.dirty)) {
      setLeave(() => next);
    } else next();
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!guards.current.size) return;
      event.preventDefault();
      // Required for browsers that still use the legacy beforeunload signal.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return (
    <FeedbackContext
      value={{
        setGuard,
        hasBlockingChanges,
        requestLeave,
        notify,
        notice,
        dismiss,
      }}
    >
      {children}
      <UnsavedChangesDialog leave={leave} onClose={() => setLeave(null)} />
    </FeedbackContext>
  );
}
