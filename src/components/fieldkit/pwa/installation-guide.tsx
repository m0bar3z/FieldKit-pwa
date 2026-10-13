"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useInstalledApp } from "@/hooks/use-installed-app";
import { installationGuides } from "@/lib/pwa/installation-guides";

export function InstallationGuide() {
  const isStandalone = useInstalledApp();

  if (isStandalone) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 min-w-11"
            aria-label="How to install FieldKit"
            title="How to install FieldKit"
          />
        }
      >
        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
        <span className="hidden sm:inline">Install FieldKit</span>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Install FieldKit</DialogTitle>
          <DialogDescription>
            Keep your notes and tasks within easy reach from your home screen or
            desktop. Follow the instructions for your device.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {installationGuides.map(({ title, browser, steps }) => (
            <Card key={title} size="sm">
              <CardHeader>
                <CardTitle>
                  <h3>{title}</h3>
                </CardTitle>
                <CardDescription>{browser}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex list-decimal flex-col gap-2 pl-5">
                  {steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Menu names vary by browser. If you opened FieldKit inside another app,
          open it in your browser first to find the installation options.
        </p>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
