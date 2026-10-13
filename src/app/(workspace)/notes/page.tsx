import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { NoteCollection } from "@/components/fieldkit/notes/note-collection";
import { getWorkspace } from "@/lib/products/queries";

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
