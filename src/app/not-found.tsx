import { EmptyItems } from "@/components/fieldkit/empty-items";

export default function NotFound() {
  return (
    <EmptyItems
      kind="projects"
      title="This page has wandered off."
      description="The project, task, or note you’re looking for isn’t here. Let’s head back to your workspace."
      action={{ href: "/projects", label: "Back to projects" }}
    />
  );
}
