import { EmptyItems } from "@/components/fieldkit/feedback/empty-items";

export default function NotFound() {
  return (
    <EmptyItems
      kind="notes"
      title="This page has wandered off."
      description="The task or note you’re looking for isn’t here. Let’s head back to your notes and tasks."
      action={{ href: "/", label: "Back to dashboard" }}
    />
  );
}
