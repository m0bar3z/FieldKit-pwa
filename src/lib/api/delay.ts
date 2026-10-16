import "server-only";

export async function simulateApiDelay(): Promise<void> {
  const milliseconds = 1000 + Math.floor(Math.random() * 2001);
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
