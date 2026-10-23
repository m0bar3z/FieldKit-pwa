"use client";

import { PlusIcon } from "lucide-react";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { NoteCollection } from "@/components/fieldkit/notes/note-collection";
import { useNotes } from "@/hooks/use-notes";
import { DataState } from "../feedback/data-state";

export function NotesPage() {
  const { data, error, retry } = useNotes();

  if (error || !data) return <DataState error={error} retry={retry} />;

  const notes = data.items;

  return (
    <>
      <PageHeading
        eyebrow="Your notes and tasks"
        title="Notes"
        description="Ideas and field notes, all in one place."
        actions={
          <LinkButton href="/notes/new">
            <PlusIcon data-icon="inline-start" />
            New note
          </LinkButton>
        }
      />
      <NoteCollection notes={notes} timeZone={data.timeZone} />
    </>
  );
}
