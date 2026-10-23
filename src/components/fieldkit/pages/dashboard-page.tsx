"use client";

import {
  BookOpenIcon,
  CalendarDaysIcon,
  Clock3Icon,
  PlusIcon,
} from "lucide-react";
import { EmptyItems } from "@/components/fieldkit/feedback/empty-items";
import { PageHeading } from "@/components/fieldkit/layout/page-heading";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { NoteCard } from "@/components/fieldkit/notes/note-card";
import { OnlineIndicator } from "@/components/fieldkit/pwa/online-indicator";
import { TaskCollection } from "@/components/fieldkit/tasks/task-collection";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useNotes } from "@/hooks/use-notes";
import { useTasks } from "@/hooks/use-tasks";
import { DataState } from "../feedback/data-state";

export function DashboardPage() {
  const tasks = useTasks();
  const notes = useNotes();
  const tasksData = tasks.data;
  const notesData = notes.data;
  if (tasks.error || notes.error || !tasksData || !notesData)
    return (
      <DataState
        error={tasks.error || notes.error}
        retry={() => {
          tasks.retry();
          notes.retry();
        }}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow={`Your notes and tasks · ${tasksData.timeZone}`}
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
            count: tasksData.counts.dueToday,
            caption: "Open tasks due on your local date",
            icon: CalendarDaysIcon,
          },
          {
            label: "Overdue",
            count: tasksData.counts.overdue,
            caption: "Pick it up when you're ready",
            icon: Clock3Icon,
          },
          {
            label: "Notes",
            count: notesData.items.length,
            caption: "Ideas in your notes and tasks",
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
          <TaskCollection
            tasks={tasksData.items}
            timeZone={tasksData.timeZone}
          />
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
            {!notesData.items.length && (
              <EmptyItems
                kind="notes"
                title="An open page for your ideas"
                description="Capture your first thought in your notes and tasks."
                action={{ href: "/notes/new", label: "Write a note" }}
              />
            )}
            {notesData.items.slice(0, 3).map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                timeZone={tasksData.timeZone}
              />
            ))}
          </section>
        </div>
      </div>
      {/* TODO(PWA): Connect reminder delivery, offline state, and synchronization in later phases. */}
    </>
  );
}
