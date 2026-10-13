export function snapshotForm(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form).entries()].filter(
      ([name]) => name !== "id" && name !== "version",
    ),
  );
}
