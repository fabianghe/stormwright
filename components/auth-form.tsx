"use client";

import { useState } from "react";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { api } from "@/lib/client-api";
import { LogoMark } from "@/components/logo";

export function AuthForm({ firstRun, canSignUp }: { firstRun: boolean; canSignUp: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(firstRun ? "signup" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { body: { username, password } });
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-16">
      <div className="sw-fade-in w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 w-fit">
            <LogoMark size={56} />
          </div>
          <h1 className="font-display text-5xl tracking-wide">{APP_NAME}</h1>
          <p className="mt-3 text-ink-soft">
            <span className="sw-caret">{TAGLINE}</span>
          </p>
        </div>

        <form onSubmit={submit} className="sw-page space-y-4 rounded-2xl px-7 py-8">
          {firstRun && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm leading-relaxed text-ink-soft">
              Welcome. This is a fresh install: create the first account, it&apos;s yours.
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-ink-faint">Username</span>
            <input
              className="sw-input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-ink-faint">Password</span>
            <input
              className="sw-input"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </label>
          {error && <p className="text-sm text-[var(--c-effects)]">{error}</p>}
          <button type="submit" disabled={busy} className="sw-btn sw-btn-primary w-full justify-center !py-2.5 disabled:opacity-60">
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {canSignUp && !firstRun && (
          <p className="mt-6 text-center text-sm text-ink-faint">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="text-accent underline underline-offset-4"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
