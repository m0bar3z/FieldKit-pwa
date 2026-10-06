import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <output className="text-sm text-muted-foreground">
        Loading your workspace…
      </output>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {["first", "second", "third"].map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
