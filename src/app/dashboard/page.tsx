import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  return <Dashboard name={session.user?.name} />;
}
