"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { filterTasks, matchesSearch } from "@/lib/product-presentation";
import type { Note, Task, TaskFilter, TaskGroup } from "@/lib/product-types";
import { NoteCard, TaskList } from "./content-cards";
import { EmptyItems } from "./empty-items";
import { SearchControls } from "./search-controls";

export function NoteCollection({ notes }: { notes: Note[] }) {
  const [query, setQuery] = useState("");
  const filtered = notes.filter((note) =>
    matchesSearch(query, note.title, note.content),
  );
  return (
    <div className="flex flex-col gap-5">
      <SearchControls subject="notes" query={query} onQueryChange={setQuery} />
      <output className="text-xs text-muted-foreground">
        {filtered.length} of {notes.length} notes
      </output>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <EmptyItems
          kind="notes"
          title={
            notes.length ? "No matching notes" : "An open page for your ideas"
          }
          description={
            notes.length
              ? "Try another title or a word from your note."
              : "Capture something worth remembering."
          }
          action={{
            href: "/notes/new",
            label: "Write a note",
          }}
        />
      )}
    </div>
  );
}

const sections: { group: TaskGroup; title: string; caption: string }[] = [
  { group: "overdue", title: "Needs a little attention", caption: "Overdue" },
  { group: "today", title: "On your list today", caption: "Today" },
  { group: "upcoming", title: "A little further ahead", caption: "Upcoming" },
  { group: "unscheduled", title: "When you're ready", caption: "No due date" },
  { group: "completed", title: "Steps you've taken", caption: "Completed" },
];

export function TaskCollection({ tasks }: { tasks: Task[] }) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState<TaskFilter>("all");
  const filtered = filterTasks(tasks, query, status);
  const groups = sections
    .map((section) => ({
      ...section,
      tasks: filtered.filter((task) => task.group === section.group),
    }))
    .filter((section) => section.tasks.length);
  return (
    <div className="flex flex-col gap-5">
      <SearchControls
        subject="tasks"
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
      />
      <output className="text-xs text-muted-foreground">
        {filtered.length} of {tasks.length} tasks
      </output>
      {filtered.length ? (
        groups.map((section) => (
          <Card key={section.group}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.caption}</CardDescription>
              <CardAction>
                <Badge
                  variant={
                    section.group === "overdue" ? "destructive" : "secondary"
                  }
                >
                  {section.tasks.length}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TaskList tasks={section.tasks} />
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyItems
          kind="tasks"
          title={
            tasks.length ? "No matching tasks" : "Start with one small step"
          }
          description={
            tasks.length
              ? "Try another search or status."
              : "Add a task and give your plans a little direction."
          }
          action={{
            href: "/tasks/new",
            label: "Create a task",
          }}
        />
      )}
    </div>
  );
}
