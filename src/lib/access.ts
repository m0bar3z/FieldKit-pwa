import "server-only";

import { eq, sql } from "drizzle-orm";
import { requireUser } from "./auth";
import { db } from "./db";
import { users } from "./schema";

type UserTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Future product operations must use this boundary rather than privileged db queries.
// The caller supplies neither an owner ID nor a JWT; both come from verified cookies.
export async function withUserDatabase<T>(
  operation: (transaction: UserTransaction, ownerId: number) => Promise<T>,
): Promise<T> {
  const user = await requireUser();

  // Provision only the identity verified by Supabase, never a client-supplied mapping.
  // onConflictDoNothing makes concurrent first requests safe without editing profiles.
  await db
    .insert(users)
    .values({ authId: user.id })
    .onConflictDoNothing({ target: users.authId });
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authId, user.id));
  if (!owner) throw new Error("Unable to resolve the authenticated owner");

  return db.transaction(async (transaction) => {
    // Transaction-local claims and role prevent leakage through pooled connections.
    await transaction.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user.id, role: "authenticated" })}, true)`,
    );
    await transaction.execute(sql`set local role authenticated`);
    return operation(transaction, owner.id);
  });
}
