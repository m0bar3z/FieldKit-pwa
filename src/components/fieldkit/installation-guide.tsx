"use client";

import { DownloadIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
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

const guides = [
  {
    title: "Android",
    browser: "Google Chrome",
    steps: [
      "Open FieldKit in Chrome and tap the three-dot menu (⋮).",
      "Choose Install app or Add to Home screen, then Install if shown.",
      "Confirm installation, then open FieldKit from your home screen or app drawer.",
    ],
  },
  {
    title: "iPhone & iPad",
    browser: "Safari",
    steps: [
      "Open FieldKit in Safari and tap Share.",
      "Choose Add to Home Screen. Keep Open as Web App enabled if shown.",
      "Tap Add, then open FieldKit from your home screen.",
    ],
  },
  {
    title: "Desktop",
    browser: "Google Chrome or Microsoft Edge",
    steps: [
      "Open FieldKit in Chrome or Edge.",
      "Click the install icon in the address bar, or find the installation option in the browser menu.",
      "Confirm Install, then open FieldKit from your apps or start menu.",
    ],
  },
];

function subscribe(callback: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  return () => displayMode.removeEventListener("change", callback);
}

function getSnapshot() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosNavigator.standalone === true
  );
}

function getServerSnapshot() {
  return false;
}

export function InstallationGuide() {
  const isStandalone = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

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
          {guides.map(({ title, browser, steps }) => (
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
