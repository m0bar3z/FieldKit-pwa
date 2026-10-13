"use client";

import { createNote, createTask } from "@/app/(workspace)/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";
import { LinkButton } from "../navigation/link-button";
import { ItemFields } from "./item-fields";

export function NewItemEditor({ kind }: { kind: "task" | "note" }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {kind === "task"
            ? "One clear next step"
            : "Give your ideas a little space"}
        </CardTitle>
        <CardDescription>
          Start with a title. Everything stays in your personal workspace.
        </CardDescription>
      </CardHeader>
      <ProductForm action={kind === "task" ? createTask : createNote}>
        <CardContent className="flex flex-col gap-6">
          <ItemFields kind={kind} prefix={`new-${kind}`} />
          <Separator />
          <FieldGroup>
            <Field>
              <FieldTitle>Attachments</FieldTitle>
              <FieldDescription>
                Create this {kind} first, then add files on its detail page.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        {/* TODO(PWA): Save drafts and attachments locally when offline support is developed. */}
        <CardFooter className="flex-wrap justify-end gap-4">
          <LinkButton
            href={kind === "task" ? "/tasks" : "/notes"}
            variant="outline"
          >
            Cancel
          </LinkButton>
          <SaveButton>Create {kind}</SaveButton>
        </CardFooter>
      </ProductForm>
    </Card>
  );
}
