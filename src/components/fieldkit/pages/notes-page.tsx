"use client";

import { PlusIcon } from "lucide-react";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { NoteCollection } from "@/components/fieldkit/notes/note-collection";
import { useWorkspace } from "@/hooks/use-workspace";
import { WorkspaceDataState } from "../feedback/workspace-data-state";

export function NotesPage() {
  const { workspace, error, retry } = useWorkspace();
  if (error || !workspace)
    return <WorkspaceDataState error={error} retry={retry} />;
  const { notes } = workspace;
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
