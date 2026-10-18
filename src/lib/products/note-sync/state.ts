type NoteSyncState = {
  running: Promise<void> | null;
  rescanRequested: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  subscribers: number;
};

// Shared by the runner, retry scheduler, and app lifecycle.
export const noteSyncState: NoteSyncState = {
  running: null,
  rescanRequested: false,
  timer: undefined,
  subscribers: 0,
};
