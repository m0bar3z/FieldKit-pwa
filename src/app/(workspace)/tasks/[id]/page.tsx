import { notFound } from "next/navigation";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { TaskDetailPage } from "@/components/fieldkit/pages/task-detail-page";
import { isProductId } from "@/lib/products/input";

async function Page({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  return <TaskDetailPage id={id} />;
}
export default withAuthentication(Page);
