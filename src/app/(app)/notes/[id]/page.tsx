import { notFound } from "next/navigation";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { NoteDetailPage } from "@/components/fieldkit/pages/note-detail-page";
import { isProductId } from "@/lib/products/input";

async function Page({ params }: PageProps<"/notes/[id]">) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  return <NoteDetailPage id={id} />;
}
export default withAuthentication(Page);
