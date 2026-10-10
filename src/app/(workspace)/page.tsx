import {
  BookOpenIcon,
  CalendarDaysIcon,
  Clock3Icon,
  PlusIcon,
} from "lucide-react";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NoteCard } from "@/components/fieldkit/content-cards";
import { EmptyItems } from "@/components/fieldkit/empty-items";
import { LinkButton } from "@/components/fieldkit/link-button";
import { OnlineIndicator } from "@/components/fieldkit/online-indicator";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { TaskCollection } from "@/components/fieldkit/product-collections";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getWorkspace } from "@/lib/product-queries";

async function Home() {
  const workspace = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow={`Your workspace · ${workspace.timeZone}`}
        status={<OnlineIndicator />}
        title="A little focus for today."
        description="Your tasks, notes, and plans. A little easier to keep together."
        actions={
          <>
            <LinkButton href="/notes/new" variant="outline">
              <BookOpenIcon />
              New note
            </LinkButton>
            <LinkButton href="/tasks/new">
              <PlusIcon />
              New task
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Due today",
            count: workspace.counts.dueToday,
            caption: "Open tasks due on your local date",
            icon: CalendarDaysIcon,
          },
          {
            label: "Overdue",
            count: workspace.counts.overdue,
            caption: "Pick it up when you're ready",
            icon: Clock3Icon,
          },
          {
            label: "Notes",
            count: workspace.counts.notes,
            caption: "Ideas in your personal workspace",
            icon: BookOpenIcon,
          },
        ].map(({ label, count, caption, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardAction>
                <Icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {count}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-label="Your task list"
          className="flex min-w-0 flex-col gap-5"
        >
          <TaskCollection tasks={workspace.tasks} />
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="recent-notes-heading"
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h2 id="recent-notes-heading" className="text-sm font-semibold">
                Worth remembering
              </h2>
              <LinkButton href="/notes" variant="link">
                All notes
              </LinkButton>
            </div>
            {!workspace.notes.length && (
              <EmptyItems
                kind="notes"
                title="An open page for your ideas"
                description="Capture your first thought in your personal workspace."
                action={{ href: "/notes/new", label: "Write a note" }}
              />
            )}
            {workspace.notes.slice(0, 3).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </section>
        </div>
      </div>
      {/* TODO(PWA): Connect reminder delivery, offline state, and synchronization in later phases. */}
    </>
  );
}

export default withAuthentication(Home);
