"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserOrganizations } from "@/lib/supabase/queries";
import { Building2, Save, Loader2, LogOut } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingOrgs, setCheckingOrgs] = useState(true);

  // Check if they already have organizations
  useEffect(() => {
    async function checkOrgs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Query database for active memberships
      const { data: memberships, error } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!error && memberships && memberships.length > 0) {
        // If they already have an organization, redirect straight to dashboard
        router.push("/dashboard");
      } else {
        setCheckingOrgs(false);
      }
    }
    checkOrgs();
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // 1. Insert organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert([{ name: orgName }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Map user as 'owner'
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert([
          {
            organization_id: orgData.id,
            user_id: user.id,
            role: "owner",
          },
        ]);

      if (memberError) throw memberError;

      alert(`Workspace "${orgName}" created successfully!`);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      alert("Error setting up workspace: " + err.message);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (checkingOrgs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/15 blur-[120px] pointer-events-none" />

      {/* Form Container */}
      <div className="relative w-full max-w-md p-8 sm:p-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl z-10 mx-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xl shadow-lg shadow-violet-600/10 mx-auto">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create Your Workspace</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Welcome to ARVO! To start issuing invoices, setting up catalogs, and managing clients, let&apos;s create your business workspace.
          </p>
        </div>

        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Business / Company Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Building2 className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                placeholder="e.g. Swastik Tours"
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Initialize Workspace
              </>
            )}
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
