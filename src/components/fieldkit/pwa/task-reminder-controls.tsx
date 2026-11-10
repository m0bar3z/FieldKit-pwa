"use client";

import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  disableTaskPush,
  enableTaskPush,
  inspectTaskPush,
  type PushStatus,
  pushSupported,
} from "@/lib/push/client";

export function TaskReminderControls() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const [denied, setDenied] = useState(false);
  const online = useOnlineStatus();
  useEffect(() => {
    if (!open) return;
    let active = true;
    setSupported(pushSupported());
    setDenied("Notification" in window && Notification.permission === "denied");
    setStatus(null);
    setError("");
    setBusy(false);
    if (!pushSupported() || !online) return;
    setBusy(true);
    void inspectTaskPush()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to check reminders.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [open, online]);
  async function change(enable: boolean) {
    if (!status || busy) return;
    setBusy(true);
    setError("");
    try {
      if (enable) await enableTaskPush(status.userId, status.publicKey);
      else await disableTaskPush(status.userId);
      setStatus(await inspectTaskPush());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to change reminders.",
      );
      setDenied(Notification.permission === "denied");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (busy) details.cancel();
        else setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label="Task reminders"
          />
        }
      >
        <BellIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Task reminders</DialogTitle>
          <DialogDescription>
            Receive a notification at the reminder time you choose on a task.
          </DialogDescription>
        </DialogHeader>
        {!supported ? (
          <p>
            Use a supported browser over HTTPS. On iPhone or iPad, add FieldKit
            to your Home Screen using the installation guide, then open the
            installed app.
          </p>
        ) : !online ? (
          <p>Connect to the internet to manage notifications.</p>
        ) : status && !status.configured ? (
          <p>Task reminders have not been configured on this server.</p>
        ) : (
          <p>
            {status?.subscribed
              ? "Task reminders are enabled for this account on this device."
              : "Enable notifications on this device, then set a reminder when creating or editing a task."}
          </p>
        )}
        {denied && (
          <p>
            Notifications are blocked. Allow them in your browser or device
            settings, then reopen this dialog.
          </p>
        )}
        {busy && (
          <output className="flex items-center gap-2">
            <Spinner /> Updating notification settings…
          </output>
        )}
        {error && <FieldError role="alert">{error}</FieldError>}
        <DialogFooter showCloseButton>
          {supported && online && status && (
            <Button
              disabled={
                busy || (!status.subscribed && (!status.configured || denied))
              }
              onClick={() => void change(!status.subscribed)}
            >
              {status.subscribed ? "Disable reminders" : "Enable reminders"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
