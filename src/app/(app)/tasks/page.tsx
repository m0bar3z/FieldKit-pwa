import type { Metadata } from "next";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { TasksPage } from "@/components/fieldkit/pages/tasks-page";

export const metadata: Metadata = { title: "Tasks" };

export default withAuthentication(TasksPage);
