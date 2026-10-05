import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NewItemEditor } from "@/components/fieldkit/editors";
import { PageHeading } from "@/components/fieldkit/page-heading";

export const metadata: Metadata = { title: "New note" };

async function NewNotePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7">
      <PageHeading
        eyebrow="A place to think"
        title="Something worth remembering."
        description="Catch a thought before it slips away. There’s no perfect way to begin."
        back={{ href: "/projects", label: "Back to projects" }}
      />
      <NewItemEditor kind="note" />
    </div>
  );
}

export default withAuthentication(NewNotePage);
