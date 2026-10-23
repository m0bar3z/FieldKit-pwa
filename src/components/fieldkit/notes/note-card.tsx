import { ArrowRightIcon, BookOpenIcon } from "lucide-react";
import { AppLink as Link } from "@/components/fieldkit/navigation/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import { formatNoteUpdated } from "@/lib/products/presentation";
import type { Note } from "@/lib/products/types";

export function NoteCard({ note, timeZone }: { note: Note; timeZone: string }) {
  const isLocal = note.localId !== undefined;
  const card = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          {isLocal ? (
            <DialogTrigger className="cursor-pointer text-left hover:underline underline-offset-4">
              {note.title}
            </DialogTrigger>
          ) : (
            <Link
              href={`/notes/${note.id}`}
              className="hover:underline underline-offset-4"
            >
              {note.title}
            </Link>
          )}
        </CardTitle>
        <CardAction>
          {note.syncStatus === NoteSyncStatus.Failed ? (
            <Badge variant="destructive">Sync failed</Badge>
          ) : isLocal || note.syncStatus === NoteSyncStatus.Pending ? (
            <Badge variant="secondary">Pending sync</Badge>
          ) : (
            <BookOpenIcon className="size-4 text-muted-foreground" />
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {note.excerpt}
        </p>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {formatNoteUpdated(note.updated, timeZone)}
        </span>
        {isLocal ? (
          <DialogTrigger
            aria-label={`Read ${note.title}`}
            render={<Button variant="ghost" className="min-h-11" />}
          >
            Read
            <ArrowRightIcon data-icon="inline-end" />
          </DialogTrigger>
        ) : (
          <Link
            href={`/notes/${note.id}`}
            aria-label={`Read ${note.title}`}
            className="flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            Read
            <ArrowRightIcon className="size-4" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );

  if (!isLocal) return card;

  return (
    <Dialog>
      {card}
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="break-words">{note.title}</DialogTitle>
          <DialogDescription>
            Saved on this device. This note hasn’t been synced yet.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {formatNoteUpdated(note.updated, timeZone)}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-7">
          {note.content || "This note is empty."}
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
