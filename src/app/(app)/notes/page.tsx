import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NotesPage } from "@/components/fieldkit/pages/notes-page";

export const metadata: Metadata = { title: "Notes" };

export default withAuthentication(NotesPage);
