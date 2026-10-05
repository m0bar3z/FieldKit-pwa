import "server-only";

import { type ComponentType, createElement, Suspense } from "react";
import { requireUser } from "@/lib/auth";

// Each page owns its session boundary so it also applies below shared layouts.
export function withAuthentication<Props extends object>(
  Page: ComponentType<Props>,
) {
  async function VerifiedPage({ pageProps }: { pageProps: Props }) {
    await requireUser();
    return createElement(Page, pageProps);
  }

  return function AuthenticatedPage(props: Props) {
    return (
      <Suspense fallback={<output>Checking your session…</output>}>
        <VerifiedPage pageProps={props} />
      </Suspense>
    );
  };
}
