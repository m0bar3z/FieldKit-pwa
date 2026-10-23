"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import type { User } from "@/lib/auth/types";
import { startNoteSync } from "@/lib/products/note-sync";
import { refreshAppBadge } from "@/lib/pwa/app-badge";

const UserContext = createContext<User | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  useEffect(() => {
    void refreshAppBadge(user.id);
    return startNoteSync(user.id);
  }, [user.id]);
  useEffect(() => {
    const onSessionChange = (event: StorageEvent) => {
      if (event.key === "fieldkit-session-changed") window.location.reload();
    };
    window.addEventListener("storage", onSessionChange);
    return () => window.removeEventListener("storage", onSessionChange);
  }, []);
  return <UserContext value={user}>{children}</UserContext>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("Sign in to access your notes and tasks.");
  return user;
}
