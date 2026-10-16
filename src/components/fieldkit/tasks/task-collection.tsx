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
import { filterTasks } from "@/lib/products/presentation";
import { taskSections } from "@/lib/products/task-sections";
import type { Task, TaskFilter } from "@/lib/products/types";
import { EmptyItems } from "../feedback/empty-items";
import { SearchControls } from "../forms/search-controls";
import { TaskList } from "./task-list";

export function TaskCollection({
  tasks,
  timeZone,
}: {
  tasks: Task[];
  timeZone: string;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState<TaskFilter>("all");
  const filtered = filterTasks(tasks, query, status);
  const groups = taskSections
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
              <TaskList tasks={section.tasks} timeZone={timeZone} />
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
