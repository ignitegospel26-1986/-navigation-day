import { auth } from "@/auth";

/**
 * Returns the Google access token for the signed-in user, or null if there is
 * no valid session. Every Google call flows through the user's own token —
 * this server never holds a token of its own.
 */
export async function requireToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.accessToken) return null;
  if (session.error === "RefreshAccessTokenError") return null;
  return session.accessToken;
}
