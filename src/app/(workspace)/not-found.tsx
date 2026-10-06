import { LinkButton } from "@/components/fieldkit/link-button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>This item is unavailable</EmptyTitle>
        <EmptyDescription>
          It may have been deleted, or you may not have access to it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <LinkButton href="/projects" variant="outline">
          Back to projects
        </LinkButton>
      </EmptyContent>
    </Empty>
  );
}
