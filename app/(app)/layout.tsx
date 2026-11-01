import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocuments } from "@/lib/documents";
import { ACTIVE_PROJECT_COOKIE, listProjects } from "@/lib/projects";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppShell } from "@/components/app-shell";
import { SOUNDS_COOKIE } from "@/components/preferences";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [projects, jar] = await Promise.all([listProjects(user.id), cookies()]);
  const activeProject = projects.find((project) => project.id === jar.get(ACTIVE_PROJECT_COOKIE)?.value) ?? projects[0];
  const documents = await listDocuments(user.id, activeProject.id);
  return (
    <AppShell
      username={user.username}
      documents={documents}
      projects={projects}
      activeProject={activeProject}
      theme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      sounds={jar.get(SOUNDS_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
