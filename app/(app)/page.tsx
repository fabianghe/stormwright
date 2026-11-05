import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { randomGreeting } from "@/lib/greetings";
import { HomeView } from "@/components/home-view";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <HomeView greeting={randomGreeting()} />;
}
