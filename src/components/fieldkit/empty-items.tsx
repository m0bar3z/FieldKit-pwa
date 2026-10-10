import { BookOpenIcon, CheckCheckIcon, PaperclipIcon } from "lucide-react";
import type { Route } from "next";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LinkButton } from "./link-button";

const icons = {
  tasks: CheckCheckIcon,
  notes: BookOpenIcon,
  attachments: PaperclipIcon,
};

export function EmptyItems({
  kind,
  title,
  description,
  action,
}: {
  kind: keyof typeof icons;
  title: string;
  description: string;
  action?: { href: Route; label: string };
}) {
  const Icon = icons[kind];
  return (
    <Empty className="min-h-52 border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <LinkButton href={action.href} variant="outline">
            {action.label}
          </LinkButton>
        </EmptyContent>
      )}
    </Empty>
  );
}
