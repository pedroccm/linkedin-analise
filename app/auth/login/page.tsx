"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "../password-input";
import { useDict } from "@/lib/i18n/client";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const a = useDict().auth;
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setInfo(a.signupConfirm);
      }
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo(a.resetSent);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  const title =
    mode === "signin" ? a.signInTitle : mode === "signup" ? a.signUpTitle : a.forgotTitle;

  const submitLabel = loading
    ? "…"
    : mode === "signin"
    ? a.signInBtn
    : mode === "signup"
    ? a.signUpBtn
    : a.sendResetBtn;

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">{title}</h1>

        {mode !== "forgot" && (
          <div className="flex gap-1 mb-6 bg-[var(--color-bg-2)] p-1 rounded-md">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-[var(--color-bg)] text-white"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {a.signInTab}
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-[var(--color-bg)] text-white"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {a.signUpTab}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[var(--color-text-muted)]">{a.email}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
              placeholder={a.emailPlaceholder}
            />
          </label>

          {mode !== "forgot" && (
            <PasswordInput
              label={a.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? a.passwordSignupPlaceholder : a.passwordSigninPlaceholder}
            />
          )}

          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
          {info && <p className="text-[var(--color-success)] text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors"
          >
            {submitLabel}
          </button>

          <div className="text-center text-sm">
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-[var(--color-text-muted)] hover:text-white"
              >
                {a.forgotLink}
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-[var(--color-text-muted)] hover:text-white"
              >
                {a.backToSignIn}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
