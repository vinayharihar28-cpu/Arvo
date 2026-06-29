"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Optional: We can check if the user is actually authenticated
    // The middleware and callback should have established a session.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg("Your password reset link is invalid or has expired. Please request a new one.");
      }
    };
    checkSession();
  }, [supabase.auth]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      setIsLoading(false);
      // Wait a moment so the user sees the success state, then redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <Image src="/logo.png" alt="Swastik Tours Logo" width={64} height={64} className="object-contain rounded-xl" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Set New Password</h1>
        <p className="text-[var(--text-muted)] text-sm mt-2 text-center max-w-sm">
          Please enter your new password below.
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
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Password Updated</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Your password has been successfully reset. Redirecting to dashboard...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider mb-2">
              New Password
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

          <div>
            <label className="block text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full flex items-center justify-center py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
