"use client";

import { useState } from "react";
import { api } from "@/lib/client-api";
import { playKey, playReturn } from "@/lib/typewriter-sound";
import { usePreferences } from "@/components/preferences";

export function AuthForm({ firstRun, canSignUp }: { firstRun: boolean; canSignUp: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(firstRun ? "signup" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { sounds } = usePreferences();

  const typewriter = (event: React.KeyboardEvent) => {
    if (!sounds || event.metaKey || event.ctrlKey || event.repeat) return;
    if (event.key === "Enter") playReturn();
    else if (event.key === "Backspace") playKey(true);
    else if (event.key.length === 1) playKey();
  };

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
    <div className="sw-fade-in w-full [animation-delay:80ms]">
      <form onSubmit={submit} onKeyDown={typewriter} className="sw-page space-y-4 rounded-2xl px-7 py-8">
        <h2 className="font-display text-2xl">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
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
        {canSignUp && !firstRun && (
          <p className="text-center text-sm text-ink-faint">
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
      </form>
    </div>
  );
}
