const LOCKS = [
  "fieldkit-product-sync",
  "fieldkit-task-changes",
  "fieldkit-note-edits",
];

// Retain old locks during this release so an older page's upload can finish first.
export function withProductLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return action();
  const acquire = async (index: number): Promise<T> =>
    index === LOCKS.length
      ? action()
      : navigator.locks.request(LOCKS[index] ?? "fieldkit-product-sync", () =>
          acquire(index + 1),
        );
  return acquire(0);
}
