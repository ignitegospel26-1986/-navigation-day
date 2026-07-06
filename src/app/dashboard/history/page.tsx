import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { History } from "@/components/history";

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect("/");
  return <History />;
}
