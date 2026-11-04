"use client";

import { BookOpenIcon } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Attachments } from "@/components/fieldkit/attachments/attachments";
import { DeleteDialog } from "@/components/fieldkit/editors/delete-dialog";
import { EditItemDialog } from "@/components/fieldkit/editors/edit-item-dialog";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNotes } from "@/hooks/use-notes";
import { formatNoteUpdated } from "@/lib/products/presentation";
import { DataState } from "../feedback/data-state";
import { LinkButton } from "../navigation/link-button";
import { NoteSyncStatus } from "../notes/note-sync-status";

export function NoteDetailPage({ id }: { id: string }) {
  const { data, error, retry } = useNotes();
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const note = data?.items.find(
    (item) => item.id === id || item.localId === id || item.legacyId === id,
  );
  useEffect(() => {
    if (note && note.id !== id && !note.localOnly)
      router.replace(`/notes/${note.id}`);
  }, [note, id, router]);
  if (deleted)
    return (
      <div className="flex flex-col items-start gap-4">
        <output>Note deleted on this device.</output>
        <LinkButton href="/notes">Back to notes</LinkButton>
      </div>
    );

  if (error || !data) return <DataState error={error} retry={retry} />;

  if (!note) notFound();
  return (
    <>
      <NoteSyncStatus note={note} />
      <PageHeading
        eyebrow="Note"
        title={note.title}
        description={formatNoteUpdated(note.updated, data.timeZone)}
        back={{ href: "/notes", label: "All notes" }}
        actions={!note.deletionPending && <EditItemDialog note={note} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-4" />
                From your notebook
              </CardTitle>
              <CardDescription>A thought to come back to.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {note.content || "This note is empty."}
              </p>
            </CardContent>
          </Card>
          {note.localOnly ? (
            <p className="text-sm text-muted-foreground">
              Sync this note before adding attachments.
            </p>
          ) : (
            <Attachments
              items={note.attachments}
              kind="note"
              parentId={note.id}
            />
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>A note in your notes and tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Badge variant="outline">Plain-text note</Badge>
            <Separator />
            {!note.deletionPending && (
              <DeleteDialog
                kind="note"
                note={note}
                onDeleted={() => setDeleted(true)}
                title={note.title}
                id={note.id}
                version={note.version}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
