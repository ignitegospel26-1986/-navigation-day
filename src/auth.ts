import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * OAuth scopes — deliberately minimal.
 *  - drive.file      : create / read / write ONLY the files this app makes —
 *                      the folder AND the spreadsheet (the Sheets API accepts
 *                      drive.file for app-created files, so no broad
 *                      `spreadsheets` scope is needed). Non-sensitive scope.
 *  - calendar.events : optional reminder sync into the user's own calendar.
 *                      The only sensitive scope, requested for calendar sync.
 */
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

/** Exchange a refresh token for a fresh access token. */
async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token as string,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      access_token: refreshed.access_token,
      expires_at: Math.floor(Date.now() / 1000 + (refreshed.expires_in as number)),
      // Google only returns a new refresh_token occasionally; keep the old one.
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      error: undefined,
    };
  } catch (err) {
    console.error("Failed to refresh access token", err);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SCOPES,
          access_type: "offline", // needed to receive a refresh_token
          prompt: "consent", // force consent so refresh_token is issued
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist the tokens Google handed us.
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        };
      }

      // Still valid (30s safety margin) → reuse.
      if (
        typeof token.expires_at === "number" &&
        Date.now() < token.expires_at * 1000 - 30_000
      ) {
        return token;
      }

      // Expired → refresh.
      if (token.refresh_token) {
        return await refreshAccessToken(token as Record<string, unknown>);
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.access_token as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
