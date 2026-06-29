"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <Image src="/logo.png" alt="Swastik Tours Logo" width={64} height={64} className="object-contain rounded-xl" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Reset Password</h1>
        <p className="text-[var(--text-muted)] text-sm mt-2 text-center max-w-sm">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-400/20 text-red-500 dark:text-red-200 text-sm rounded-lg text-center">
          {errorMsg}
        </div>
      )}

      {isSuccess ? (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Check your email</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              We&apos;ve sent a password reset link to <span className="font-medium text-[var(--text-primary)]">{email}</span>.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full mt-2 py-2.5 px-4 bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium rounded-xl transition-all"
          >
            Return to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-5">
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

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full flex items-center justify-center py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
