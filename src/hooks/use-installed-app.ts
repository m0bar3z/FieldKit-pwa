"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  return () => displayMode.removeEventListener("change", callback);
}

function getSnapshot() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

function getServerSnapshot() {
  return false;
}

export function useInstalledApp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
