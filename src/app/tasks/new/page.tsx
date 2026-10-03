import type { Metadata } from "next";
import { NewItemEditor } from "@/components/fieldkit/editors";
import { PageHeading } from "@/components/fieldkit/page-heading";

export const metadata: Metadata = { title: "New task" };

export default function NewTaskPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <PageHeading
        eyebrow="A fresh start"
        title="What’s your next step?"
        description="Turn a little intention into something you can come back to."
        back={{ href: "/projects", label: "Back to projects" }}
      />
      <NewItemEditor kind="task" />
    </div>
  );
}
