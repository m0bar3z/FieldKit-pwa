import type { ItemFormValues } from "./schemas";
import type { Note, Task } from "./types";

export function itemFormValues(
  kind: "task" | "note",
  item?: Task | Note,
): ItemFormValues {
  const identity = item ? { id: item.id, version: String(item.version) } : {};
  if (kind === "task")
    return {
      kind,
      title: item?.title ?? "",
      description: item && "description" in item ? item.description : "",
      dueDate: item && "dueDate" in item ? item.dueDate : "",
      ...identity,
    };
  return {
    kind,
    title: item?.title ?? "",
    content: item && "content" in item ? item.content : "",
    ...identity,
  };
}
