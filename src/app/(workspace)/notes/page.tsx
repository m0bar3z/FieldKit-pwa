import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { NoteCollection } from "@/components/fieldkit/product-collections";
import { getWorkspace } from "@/lib/product-queries";

export const metadata: Metadata = { title: "Notes" };

async function NotesPage() {
  const { notes } = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="Your personal workspace"
        title="Notes"
        description="Ideas and field notes, all in one place."
        actions={
          <LinkButton href="/notes/new">
            <PlusIcon data-icon="inline-start" />
            New note
          </LinkButton>
        }
      />
      <NoteCollection notes={notes} />
    </>
  );
}

export default withAuthentication(NotesPage);
