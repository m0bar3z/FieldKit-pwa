import { discardProduct, retryProduct } from "../product-sync/runtime";
import type { Task } from "../types";

export {
  startProductSync as startTaskSync,
  syncProducts as syncTaskChanges,
} from "../product-sync/runtime";
export {
  deleteTask,
  saveTask,
  setTaskCompletion,
} from "../product-sync/writes";
export const retryTaskChange = (task: Task) =>
  retryProduct("task", task.localId ?? task.id, task.userId);
export const discardTaskChange = (task: Task) =>
  discardProduct("task", task.localId ?? task.id, task.userId);
