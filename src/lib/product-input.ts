export type ProductKind = "project" | "task" | "note";
export type ProductActionState = {
  error?: string;
  fields?: Record<string, string>;
  success?: string;
  destination?: string;
};
export type ProjectInput = {
  name: string;
  description: string;
  category: "travel" | "work" | "personal";
};
export type TaskInput = {
  title: string;
  description: string;
  projectId: string;
  dueDate: string | null;
};
export type NoteInput = { title: string; content: string; projectId: string };

export class ProductInputError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Please check the highlighted fields.");
  }
}

export function isProductId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function text(
  form: FormData,
  key: string,
  max: number,
  required = false,
  trim = true,
) {
  const raw = form.get(key);
  if (raw !== null && typeof raw !== "string")
    throw new ProductInputError({ [key]: "Enter text, not a file." });
  const value = trim ? (raw ?? "").trim() : (raw ?? "");
  if (required && !value)
    throw new ProductInputError({ [key]: "This field is required." });
  if (value.includes("\0") || value.length > max)
    throw new ProductInputError({
      [key]: `Use at most ${max} characters without null characters.`,
    });
  return value;
}

export function readProductId(form: FormData, key = "id") {
  const value = form.get(key);
  if (!isProductId(value))
    throw new ProductInputError({ [key]: "Choose a valid item." });
  return value;
}

export function readVersion(form: FormData) {
  const raw = form.get("version");
  const value =
    typeof raw === "string" && /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : 0;
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw new ProductInputError({ version: "Refresh the page and try again." });
  return value;
}

export function readProject(form: FormData): ProjectInput {
  const name = text(form, "name", 120, true);
  const description = text(form, "description", 5000);
  const category = form.get("category");
  if (category !== "travel" && category !== "work" && category !== "personal")
    throw new ProductInputError({ category: "Choose a project category." });
  return { name, description, category };
}

export function readTask(form: FormData): TaskInput {
  const title = text(form, "title", 200, true);
  const description = text(form, "description", 10000);
  const projectId = readProductId(form, "projectId");
  const dueDate = text(form, "dueDate", 10);
  const date = new Date(`${dueDate}T00:00:00Z`);
  if (
    dueDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      dueDate < "0001-01-01" ||
      dueDate > "9999-12-31" ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dueDate)
  )
    throw new ProductInputError({ dueDate: "Choose a valid calendar date." });
  return { title, description, projectId, dueDate: dueDate || null };
}

export function readNote(form: FormData): NoteInput {
  return {
    title: text(form, "title", 200, true),
    content: text(form, "content", 100000, false, false),
    projectId: readProductId(form, "projectId"),
  };
}

export function readCompleted(form: FormData) {
  const value = form.get("completed");
  if (value !== "true" && value !== "false")
    throw new ProductInputError({
      completed: "Choose a valid completion state.",
    });
  return value === "true";
}
