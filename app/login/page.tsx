import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, hasAnyUser, signupAllowed } from "@/lib/auth";
import { SOUNDS_COOKIE, THEME_COOKIE, parseSounds, parseTheme } from "@/lib/theme";
import { AppearanceMenu } from "@/components/appearance-options";
import { AuthForm } from "@/components/auth-form";
import { PreferencesProvider } from "@/components/preferences";
import { WelcomeActions, WelcomeFeatures, WelcomeIntro, WelcomeMap } from "@/components/welcome";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const [firstRun, canSignUp, jar] = await Promise.all([hasAnyUser().then((has) => !has), signupAllowed(), cookies()]);
  return (
    <PreferencesProvider
      initialTheme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      initialSounds={parseSounds(jar.get(SOUNDS_COOKIE)?.value)}
    >
      <div className="relative z-10 min-h-full px-5 py-12 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-14">
          <WelcomeIntro className="lg:col-start-1 lg:row-start-1" />
          <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="space-y-3">
              <AuthForm firstRun={firstRun} canSignUp={canSignUp} />
              <AppearanceMenu />
            </div>
            <WelcomeMap />
            <WelcomeActions />
          </div>
          <WelcomeFeatures className="lg:col-start-1 lg:row-start-2" />
        </div>
      </div>
    </PreferencesProvider>
  );
}
