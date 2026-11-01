"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { playKey, playReturn } from "@/lib/typewriter-sound";
import { usePreferences } from "@/components/preferences";

function TypedHeading({ text }: { text: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 1;
    let count = 0;
    let timer = 0;
    const tick = () => {
      count = Math.min(text.length, count + step);
      setShown(count);
      if (count < text.length) timer = window.setTimeout(tick, 45 + Math.random() * 50);
    };
    timer = window.setTimeout(tick, 550);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <h2 className="relative font-display text-2xl leading-snug" aria-label={text}>
      <span aria-hidden className="invisible">{text}▍</span>
      <span aria-hidden className="absolute inset-0">
        <span className={shown < text.length ? "sw-caret" : undefined}>{text.slice(0, shown)}</span>
      </span>
    </h2>
  );
}

export function AuthForm({ firstRun, canSignUp, greeting }: { firstRun: boolean; canSignUp: boolean; greeting: string }) {
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
    <div className="w-full">
      <form onSubmit={submit} onKeyDown={typewriter} className="sw-page sw-login-card space-y-4 rounded-2xl px-7 py-8">
        <TypedHeading key={mode} text={mode === "signup" ? "Create your account" : greeting} />
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
