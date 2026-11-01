import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasAnyUser, signupAllowed } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const [firstRun, canSignUp] = await Promise.all([hasAnyUser().then((has) => !has), signupAllowed()]);
  return <AuthForm firstRun={firstRun} canSignUp={canSignUp} />;
}
