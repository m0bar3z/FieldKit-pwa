import { startTransition } from "react";

// Await the action inside a React transition while RHF tracks the whole request.
export function runServerAction<T>(action: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    startTransition(async () => {
      try {
        resolve(await action());
      } catch (error) {
        reject(error);
      }
    });
  });
}
