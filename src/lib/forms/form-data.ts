export function toFormData(values: Record<string, unknown>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    data.set(name, value instanceof Blob ? value : String(value));
  }
  return data;
}
