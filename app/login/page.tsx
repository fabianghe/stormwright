import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, hasAnyUser, signupAllowed } from "@/lib/auth";
import { SOUNDS_COOKIE, THEME_COOKIE, parseSounds, parseTheme } from "@/lib/theme";
import { randomGreeting } from "@/lib/greetings";
import { AppearanceMenu } from "@/components/appearance-options";
import { AuthForm } from "@/components/auth-form";
import { PreferencesProvider } from "@/components/preferences";
import { WelcomeFeatures, WelcomeIntro } from "@/components/welcome";

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
          <WelcomeIntro className="sw-after-form lg:col-start-1 lg:row-start-1" />
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="space-y-3 lg:sticky lg:top-12">
              <AuthForm firstRun={firstRun} canSignUp={canSignUp} greeting={randomGreeting()} />
              <div className="sw-after-form">
                <AppearanceMenu />
              </div>
            </div>
          </div>
          <WelcomeFeatures className="sw-after-form-late lg:col-start-1 lg:row-start-2" />
        </div>
      </div>
    </PreferencesProvider>
  );
}
