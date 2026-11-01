import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HomeView } from "@/components/home-view";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <HomeView username={user.username} />;
}
