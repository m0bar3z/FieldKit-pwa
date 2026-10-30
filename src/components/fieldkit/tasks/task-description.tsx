export function TaskDescription({ description }: { description: string }) {
  return (
    <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-7">
      {description || "No description."}
    </p>
  );
}
