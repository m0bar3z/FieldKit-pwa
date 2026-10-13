import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ServerFormState } from "./types";

export function setServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  result: ServerFormState,
): boolean {
  const fields = Object.entries(result.fields ?? result.errors ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
  for (const [name, message] of fields)
    setError(
      name as Path<T>,
      { type: "server", message },
      { shouldFocus: true },
    );
  if (result.error)
    setError("root.server", { type: "server", message: result.error });
  return Boolean(result.error || fields.length);
}
