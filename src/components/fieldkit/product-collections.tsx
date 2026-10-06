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
import type {
  Note,
  Project,
  Task,
  TaskFilter,
  TaskGroup,
} from "@/lib/product-types";
import { NoteCard, ProjectCard, TaskList } from "./content-cards";
import { EmptyItems } from "./empty-items";
import { SearchControls } from "./search-controls";

export function ProjectCollection({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all");
  const filtered = projects.filter(
    (project) =>
      matchesSearch(query, project.name, project.description) &&
      (category === "all" || project.category === category),
  );
  return (
    <div className="flex flex-col gap-5">
      <SearchControls
        subject="projects"
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />
      <output className="text-xs text-muted-foreground">
        {filtered.length} of {projects.length} projects
      </output>
      {filtered.length ? (
        <section
          aria-label="Projects"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      ) : (
        <EmptyItems
          kind="projects"
          title={
            projects.length ? "No matching projects" : "Room for your next idea"
          }
          description={
            projects.length
              ? "Try another search or category."
              : "Create a project to keep your tasks and notes together."
          }
        />
      )}
    </div>
  );
}

export function NoteCollection({
  notes,
  projectId,
}: {
  notes: Note[];
  projectId: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = notes.filter((note) =>
    matchesSearch(query, note.title, note.content, note.projectName),
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
            href: `/notes/new?project=${projectId}`,
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

export function TaskCollection({
  tasks,
  projectId,
  projectName,
}: {
  tasks: Task[];
  projectId?: string;
  projectName?: string;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState<TaskFilter>("all");
  const filtered = filterTasks(tasks, query, status);
  const groups = projectId
    ? [
        {
          group: "today" as const,
          title: "Small steps, steady progress.",
          caption: `Everything on the list for ${projectName ?? "this project"}.`,
          tasks: filtered,
        },
      ]
    : sections
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
                    !projectId && section.group === "overdue"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {section.tasks.length}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TaskList tasks={section.tasks} showProject={!projectId} />
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
            href: projectId ? `/tasks/new?project=${projectId}` : "/tasks/new",
            label: "Create a task",
          }}
        />
      )}
    </div>
  );
}
