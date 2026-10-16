import { ArrowRightIcon, BookOpenIcon } from "lucide-react";
import { WorkspaceLink as Link } from "@/components/fieldkit/navigation/workspace-link";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNoteUpdated } from "@/lib/products/presentation";
import type { Note } from "@/lib/products/types";

export function NoteCard({ note, timeZone }: { note: Note; timeZone: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Link
            href={`/notes/${note.id}`}
            className="hover:underline underline-offset-4"
          >
            {note.title}
          </Link>
        </CardTitle>
        <CardAction>
          <BookOpenIcon className="size-4 text-muted-foreground" />
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
        <Link
          href={`/notes/${note.id}`}
          aria-label={`Read ${note.title}`}
          className="flex min-h-11 items-center gap-2 text-sm font-medium"
        >
          Read
          <ArrowRightIcon className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
