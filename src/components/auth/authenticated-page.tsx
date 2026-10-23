import "server-only";

import { type ComponentType, createElement, Suspense } from "react";
import { AppLoading } from "@/components/fieldkit/layout/app-loading";
import { requireUser } from "@/lib/auth/session";
import { UserProvider } from "./user-provider";

// Each page owns its session boundary so it also applies below shared layouts.
export function withAuthentication<Props extends object>(
  Page: ComponentType<Props>,
) {
  async function VerifiedPage({ pageProps }: { pageProps: Props }) {
    const user = await requireUser();
    return (
      <UserProvider user={user}>{createElement(Page, pageProps)}</UserProvider>
    );
  }

  return function AuthenticatedPage(props: Props) {
    return (
      <Suspense fallback={<AppLoading />}>
        <VerifiedPage pageProps={props} />
      </Suspense>
    );
  };
}
