import {
  DownloadIcon,
  FileImageIcon,
  FileTextIcon,
  PaperclipIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DemoAttachment } from "@/lib/demo-content";
import { EmptyItems } from "./empty-items";

export function Attachments({ items = [] }: { items?: DemoAttachment[] }) {
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
          <Button variant="outline" className="min-h-11" disabled>
            <PlusIcon data-icon="inline-start" />
            Add file
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* TODO(product): Select, upload, download, and remove files after storage integration. */}
        {/* TODO(PWA): Store attachment blobs locally and upload them after reconnecting. */}
        {items.length === 0 ? (
          <EmptyItems
            kind="attachments"
            title="A little extra context"
            description="Photos, documents, and sketches will live here."
          />
        ) : (
          items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border">
              {item.kind === "image" && (
                <Image
                  src="/demo-neighborhood-map.svg"
                  alt="Sample neighborhood map with a park, bookshop, and coffee stop"
                  width={720}
                  height={360}
                  className="h-auto w-full"
                />
              )}
              <div className="flex items-center gap-3 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {item.kind === "image" ? (
                    <FileImageIcon className="size-5" />
                  ) : (
                    <FileTextIcon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.size} · Sample attachment
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Download ${item.name}`}
                  disabled
                >
                  <DownloadIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Remove ${item.name}`}
                  disabled
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
