import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LinkButton } from "@/components/fieldkit/navigation/link-button";
import { getCurrentUser } from "@/lib/auth/session";
import { productIdSchema } from "@/lib/products/schemas";

async function OpenReminder({ searchParams }: PageProps<"/reminders/open">) {
  const params = await searchParams;
  const taskId = productIdSchema.safeParse(params.taskId);
  if (!taskId.success || typeof params.userId !== "string") redirect("/tasks");
  const user = await getCurrentUser();
  if (!user) {
    const next = `/reminders/open?taskId=${taskId.data}&userId=${encodeURIComponent(params.userId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (user.id === params.userId) redirect(`/tasks/${taskId.data}`);
  return (
    <div className="flex flex-col items-start gap-4">
      <h1>Reminder for another account</h1>
      <p>
        Sign out using the header, then sign in with the account that created
        this reminder.
      </p>
      <LinkButton href="/tasks">View this account’s tasks</LinkButton>
    </div>
  );
}
export default function ReminderPage(props: PageProps<"/reminders/open">) {
  return (
    <Suspense fallback={<output>Opening your reminder…</output>}>
      <OpenReminder {...props} />
    </Suspense>
  );
}
