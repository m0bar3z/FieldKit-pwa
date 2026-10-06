"use client";

import { CheckCircle2Icon, InfoIcon, XIcon } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type FormStatus = { dirty: boolean; pending: boolean };
type Notice = { id: number; message: string; kind: "success" | "info" };
const FeedbackContext = createContext<{
  setGuard: (id: string, status: FormStatus | null) => void;
  hasBlockingChanges: () => boolean;
  requestLeave: (leave: () => void) => void;
  notify: (message: string) => void;
  notice: Notice | null;
  dismiss: () => void;
} | null>(null);

export function useOptionalWorkspaceFeedback() {
  return useContext(FeedbackContext);
}

export function useWorkspaceFeedback() {
  const context = useOptionalWorkspaceFeedback();
  if (!context) throw new Error("Workspace feedback provider is missing.");
  return context;
}

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
      <AlertDialog
        open={Boolean(leave)}
        onOpenChange={(open) => !open && setLeave(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes have not been saved. Keep editing or discard them to
              leave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                const next = leave;
                setLeave(null);
                // Keep guarding any forms that remain mounted (including when
                // the chosen link points to the current route).
                next?.();
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FeedbackContext>
  );
}

export function WorkspaceFeedback() {
  const { notice, dismiss } = useWorkspaceFeedback();
  if (!notice) return null;
  return (
    <Alert key={notice.id}>
      {notice.kind === "success" ? <CheckCircle2Icon /> : <InfoIcon />}
      <AlertTitle>
        {notice.kind === "success" ? "Done" : "Please wait"}
      </AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss message"
          onClick={dismiss}
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}
