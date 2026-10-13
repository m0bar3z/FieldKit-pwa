"use client";

import { useState } from "react";
import { matchesSearch } from "@/lib/products/presentation";
import type { Note } from "@/lib/products/types";
import { EmptyItems } from "../feedback/empty-items";
import { SearchControls } from "../forms/search-controls";
import { NoteCard } from "./note-card";

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
