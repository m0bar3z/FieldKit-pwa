"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useUser } from "@/components/auth/user-provider";
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
import { useAppFeedback } from "@/hooks/use-app-feedback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ApiRequestError, apiRequest, refreshItems } from "@/lib/api/client";
import { setServerErrors } from "@/lib/forms/server-errors";
import type { FormResponse } from "@/lib/forms/types";
import { IndexedDbAction, IndexedDbRecordType } from "@/lib/indexed-db/enums";
import { addToStore } from "@/lib/indexed-db/indexed-db";
import { itemFormValues } from "@/lib/products/form-values";
import { type ItemFormValues, itemFormSchema } from "@/lib/products/schemas";
import { ProductForm } from "../forms/product-form";
import { SaveButton } from "../forms/save-button";
import { LinkButton } from "../navigation/link-button";
import { ItemFields } from "./item-fields";

export function NewItemEditor({ kind }: { kind: "task" | "note" }) {
  const { notify } = useAppFeedback();
  const user = useUser();
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: itemFormValues(kind),
  });
  const submitting = useRef(false);
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const isOnline = useOnlineStatus();

  async function handleSubmit(values: ItemFormValues) {
    if (submitting.current || navigating) return;
    submitting.current = true;
    try {
      const stringifiedValues = JSON.stringify(values);

      if (isOnline) {
        const result = await apiRequest<FormResponse>(
          `/api/${kind === "task" ? "tasks" : "notes"}`,
          {
            method: "POST",
            body: stringifiedValues,
            headers: { "X-FieldKit-User": user.id },
          },
        );

        if (!result.destination) refreshItems(kind);

        if (result.success) notify(result.success);

        if (result.destination) {
          setNavigating(true);
          router.push(result.destination as Route);
        }
      } else {
        if (kind === "task")
          throw new Error("Connect to the internet to create a task.");
        await addToStore("notes", {
          userId: user.id,
          payload: values,
          kind,
          action: IndexedDbAction.Create,
          recordType: IndexedDbRecordType.PendingChange,
        });

        setNavigating(true);
        router.push("/notes");

        notify("Completed!");
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerErrors(form.setError, error.result);
        return;
      }
      form.setError("root.server", {
        message: "Unable to save changes. Please try again.",
      });
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {kind === "task"
            ? "One clear next step"
            : "Give your ideas a little space"}
        </CardTitle>
        <CardDescription>
          Start with a title. Everything stays in your notes and tasks.
        </CardDescription>
      </CardHeader>
      <ProductForm
        form={form}
        onSubmit={form.handleSubmit(handleSubmit)}
        navigating={navigating}
        pendingLabel={navigating ? "Opening saved item…" : "Saving…"}
      >
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
