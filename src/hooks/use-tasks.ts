"use client";

import { useEffect } from "react";
import { TASKS_CHANGED } from "@/lib/api/client";
import type { TasksData } from "@/lib/products/types";
import { updateAppBadge } from "@/lib/pwa/app-badge";
import { useItems } from "./use-items";

export function useTasks() {
  const result = useItems<TasksData>("tasks", TASKS_CHANGED);
  const overdue = result.data?.counts.overdue;
  useEffect(() => {
    if (overdue !== undefined) void updateAppBadge(overdue);
  }, [overdue]);
  return result;
}
