"use client";

import { PaperclipIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Attachment } from "@/lib/products/types";
import { EmptyItems } from "../feedback/empty-items";
import { AttachmentRow } from "./attachment-row";
import { AttachmentUploadForm } from "./attachment-upload-form";

export function Attachments({
  items,
  kind,
  parentId,
}: {
  items: Attachment[];
  kind: "task" | "note";
  parentId: string;
}) {
  const [choosing, setChoosing] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaperclipIcon className="size-4" />
          Attachments
        </CardTitle>
        <CardDescription>
          Keep useful files close to your ideas.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={choosing}
            onClick={() => setChoosing(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Add file
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {choosing && (
          <AttachmentUploadForm
            kind={kind}
            parentId={parentId}
            close={() => setChoosing(false)}
          />
        )}
        {/* TODO(PWA): Store attachment blobs locally and upload them after reconnecting. */}
        {items.length === 0 ? (
          <EmptyItems
            kind="attachments"
            title="A little extra context"
            description="Add a photo, document, or text file to this item."
          />
        ) : (
          items.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              kind={kind}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
