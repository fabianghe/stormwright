import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppShell } from "@/components/app-shell";
import { SOUNDS_COOKIE } from "@/components/preferences";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [documents, jar] = await Promise.all([listDocuments(user.id), cookies()]);
  return (
    <AppShell username={user.username} documents={documents} theme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      sounds={jar.get(SOUNDS_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
