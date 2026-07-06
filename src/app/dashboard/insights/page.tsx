import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Insights } from "@/components/insights";

export default async function InsightsPage() {
  const session = await auth();
  if (!session) redirect("/");
  return <Insights />;
}
