import { BookOpenIcon, FolderIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { withAuthentication } from "@/components/auth/authenticated-page";
import { Attachments } from "@/components/fieldkit/attachments";
import { DeleteDialog } from "@/components/fieldkit/delete-dialog";
import { EditItemDialog } from "@/components/fieldkit/editors";
import { LinkButton } from "@/components/fieldkit/link-button";
import { PageHeading } from "@/components/fieldkit/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { isProductId } from "@/lib/product-input";
import { getWorkspace } from "@/lib/product-queries";

async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const { id } = await params;
  if (!isProductId(id)) notFound();
  const workspace = await getWorkspace();
  const note = workspace.notes.find((item) => item.id === id);
  if (!note) notFound();
  const project = workspace.projects.find((item) => item.id === note.projectId);
  if (!project) notFound();
  return (
    <>
      <PageHeading
        eyebrow={project.name}
        title={note.title}
        description={note.updated}
        back={{ href: `/projects/${project.id}`, label: "Back to project" }}
        actions={<EditItemDialog note={note} projects={workspace.projects} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-4" />
                From your notebook
              </CardTitle>
              <CardDescription>A thought to come back to.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {note.content || "This note is empty."}
              </p>
            </CardContent>
          </Card>
          <Attachments items={note.attachments} kind="note" parentId={id} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Filed away in</CardTitle>
            <CardDescription>Everything has a little home.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <FolderIcon className="size-4 text-muted-foreground" />
              <LinkButton
                href={`/projects/${project.id}`}
                variant="link"
                className="justify-start p-0"
              >
                {project.name}
              </LinkButton>
            </div>
            <Badge variant="outline">Plain-text note</Badge>
            <Separator />
            <DeleteDialog
              kind="note"
              title={note.title}
              id={id}
              version={note.version}
            />
          </CardContent>
        </Card>
      </div>
      {/* TODO(PWA): Preserve note drafts locally and synchronize edits in a future phase. */}
    </>
  );
}

export default withAuthentication(NotePage);
