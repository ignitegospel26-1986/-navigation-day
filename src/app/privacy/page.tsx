import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "隱私說明",
  description: "你的紀錄只存在你自己的 Google 帳號裡。",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-10">
        <PrivacyContent />

        <div className="mt-12">
          <Link href="/" className="btn btn-ghost px-5 py-2.5 text-sm">
            ← 回首頁
          </Link>
        </div>
      </main>
    </div>
  );
}
