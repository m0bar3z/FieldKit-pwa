"use client";

import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { TaskFilter } from "@/lib/product-types";

export function SearchControls({
  subject,
  query,
  onQueryChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
}: {
  subject: string;
  query: string;
  onQueryChange: (value: string) => void;
  status?: TaskFilter;
  onStatusChange?: (value: TaskFilter) => void;
  category?: string;
  onCategoryChange?: (value: string) => void;
}) {
  return (
    <search
      aria-label={`Search ${subject}`}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <InputGroup className="min-h-11 max-w-md">
        <InputGroupInput
          aria-label={`Search ${subject}`}
          placeholder={`Search ${subject}…`}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          maxLength={200}
          type="search"
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      {onStatusChange && (
        <NativeSelect
          aria-label="Filter tasks by status"
          value={status ?? "all"}
          onChange={(event) => onStatusChange(event.target.value as TaskFilter)}
          className="min-h-11 w-full sm:w-auto"
        >
          <NativeSelectOption value="all">All tasks</NativeSelectOption>
          <NativeSelectOption value="open">Open</NativeSelectOption>
          <NativeSelectOption value="completed">Completed</NativeSelectOption>
          <NativeSelectOption value="overdue">Overdue</NativeSelectOption>
          <NativeSelectOption value="today">Due today</NativeSelectOption>
          <NativeSelectOption value="upcoming">Upcoming</NativeSelectOption>
          <NativeSelectOption value="unscheduled">
            No due date
          </NativeSelectOption>
        </NativeSelect>
      )}
      {onCategoryChange && (
        <NativeSelect
          aria-label="Filter projects by category"
          value={category ?? "all"}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="min-h-11 w-full sm:w-auto"
        >
          <NativeSelectOption value="all">All categories</NativeSelectOption>
          <NativeSelectOption value="personal">Personal</NativeSelectOption>
          <NativeSelectOption value="work">Work</NativeSelectOption>
          <NativeSelectOption value="travel">Travel</NativeSelectOption>
        </NativeSelect>
      )}
    </search>
  );
}
