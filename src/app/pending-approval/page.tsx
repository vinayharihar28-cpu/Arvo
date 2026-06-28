"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, LogOut, Clock, Loader2 } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const checkStatus = () => {
    // Force a hard window redirect to bypass Next.js layout cache and trigger middleware check
    window.location.href = "/dashboard";
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      
      {/* Card wrapper */}
      <div className="relative w-full max-w-md p-8 sm:p-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl z-10 mx-4 text-center space-y-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Access Pending Approval</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your registration is successful! However, because ARVO is a private billing console, your account must be approved by the administrator before you can access the dashboard.
          </p>
        </div>

        <div className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl text-xs text-zinc-500 flex items-start gap-2.5 text-left">
          <ShieldAlert className="w-4.5 h-4.5 text-violet-400 shrink-0 mt-0.5" />
          <span>If you are the owner, ensure you log in with your whitelisted email, or contact your administrator to approve this account.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={checkStatus}
            className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            I&apos;m Approved (Refresh)
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign Out
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
