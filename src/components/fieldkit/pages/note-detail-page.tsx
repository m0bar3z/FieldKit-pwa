"use client";

import { BookOpenIcon } from "lucide-react";
import { notFound } from "next/navigation";
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
import { useWorkspace } from "@/hooks/use-workspace";
import { formatNoteUpdated } from "@/lib/products/presentation";
import { WorkspaceDataState } from "../feedback/workspace-data-state";
import { NoteSyncStatus } from "../notes/note-sync-status";

export function NoteDetailPage({ id }: { id: string }) {
  const { workspace, error, retry } = useWorkspace();

  if (error || !workspace)
    return <WorkspaceDataState error={error} retry={retry} />;

  const note = workspace.notes.find((item) => item.id === id);

  if (!note) notFound();
  return (
    <>
      <NoteSyncStatus note={note} />
      <PageHeading
        eyebrow="Note"
        title={note.title}
        description={formatNoteUpdated(note.updated, workspace.timeZone)}
        back={{ href: "/notes", label: "All notes" }}
        actions={<EditItemDialog note={note} />}
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
          <Attachments items={note.attachments} kind="note" parentId={id} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>
              A note in your personal workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Badge variant="outline">Plain-text note</Badge>
            <Separator />
            <DeleteDialog
              kind="note"
              title={note.title}
              id={id}
              version={note.version}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
