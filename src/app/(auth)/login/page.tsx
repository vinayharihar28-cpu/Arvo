"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <Image src="/logo.png" alt="Swastik Tours Logo" width={64} height={64} className="object-contain rounded-xl" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">ARVO</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Sign in to your ARVO billing workspace</p>
      </div>

      {errorMsg && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-400/20 text-red-500 dark:text-red-200 text-sm rounded-lg text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
              <Mail className="w-5 h-5" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
              <Lock className="w-5 h-5" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full flex items-center justify-center py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-default)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-[var(--text-muted)] bg-[var(--bg-surface)]">or continue with</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading || isGoogleLoading}
        type="button"
        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-alt)] rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign in with Google
          </>
        )}
      </button>

      <p className="text-[var(--text-muted)] text-sm text-center mt-8">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-violet-500 hover:text-violet-400 font-medium transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
