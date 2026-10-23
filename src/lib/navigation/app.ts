import { BookOpenIcon, ListTodoIcon, SunIcon } from "lucide-react";
import type { Route } from "next";

export const primaryNavigation = [
  { href: "/", label: "Today", icon: SunIcon },
  { href: "/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/notes", label: "Notes", icon: BookOpenIcon },
] satisfies { href: Route; label: string; icon: typeof SunIcon }[];

export function isAppRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
