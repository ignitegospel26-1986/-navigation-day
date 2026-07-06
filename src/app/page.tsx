import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Landing } from "@/components/landing";

// Unauthenticated visitors see the 導航日 intro page. Anyone already signed in
// is sent straight to their dashboard (which handles onboarding vs. console).
export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <Landing />;
}
