import { refreshWorkspace } from "@/lib/api/client";

const CHANNEL_NAME = "fieldkit-note-edits";
let channel: BroadcastChannel | undefined;

export function notifyNoteChanges() {
  refreshWorkspace();
  channel?.postMessage("changed");
}

export function subscribeToNoteSyncEvents(
  onReconnect: () => void,
  onNoteChange: () => void,
) {
  window.addEventListener("online", onReconnect);

  if (typeof BroadcastChannel === "undefined") return;

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = () => {
    refreshWorkspace();
    onNoteChange();
  };
}

export function unsubscribeFromNoteSyncEvents(onReconnect: () => void) {
  window.removeEventListener("online", onReconnect);

  channel?.close();
  channel = undefined;
}
