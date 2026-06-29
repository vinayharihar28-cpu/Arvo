"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentProfile, getUserOrganizations } from "@/lib/supabase/queries";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Bell,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";

const LogoIcon = () => (
  <img src="/logo.png" alt="Logo" className="h-5 w-5 object-contain" />
);

interface Org {
  id: string;
  name: string;
  logo_url?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Load user and organizations
  useEffect(() => {
    async function loadData() {
      // Try to load from Supabase
      const userProfile = await getCurrentProfile(supabase);

      if (userProfile) {
        setProfile(userProfile);
        
        // If super admin, bypass organization loading and onboarding redirects
        if (userProfile.is_super_admin) {
          if (pathname === "/dashboard" || pathname === "/dashboard/") {
            router.push("/dashboard/admin");
          }
          return;
        }
      } else {
        router.push("/login");
        return;
      }

      const userOrgs = await getUserOrganizations(supabase);
      if (userOrgs && userOrgs.length > 0) {
        setOrganizations(userOrgs);
        setCurrentOrg(userOrgs[0].organization);
        setCurrentRole(userOrgs[0].role);

        // Redirect logic for billing_agent
        if (userOrgs[0].role === "billing_agent") {
          const restrictedPaths = [
            "/dashboard/customers",
            "/dashboard/inventory",
            "/dashboard/settings",
            "/dashboard/admin"
          ];
          const isRestricted = restrictedPaths.some(p => pathname.startsWith(p)) || pathname === "/dashboard" || pathname === "/dashboard/";
          if (isRestricted) {
            router.push("/dashboard/invoices");
          }
        }
      } else {
        router.push("/onboarding");
      }
    }
    loadData();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [];

  // Super Admins only manage the global platform console.
  // Standard clients only see their own workspace metrics and settings.
  if (profile?.is_super_admin) {
    navItems.push({ name: "Super Admin", href: "/dashboard/admin", icon: LogoIcon });
  } else if (currentRole === "billing_agent") {
    navItems.push(
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText }
    );
  } else {
    navItems.push(
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Inventory", href: "/dashboard/inventory", icon: Package }
    );
    if (currentRole === "owner" || currentRole === "admin") {
      navItems.push({ name: "Settings", href: "/dashboard/settings", icon: Settings });
    }
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain rounded-xl" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              ARVO
            </span>
          </Link>
        </div>

        {/* Organization Switcher */}
        {!profile?.is_super_admin && (
          <div className="p-4 border-b border-zinc-800 relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-800/80 transition-all text-left text-sm font-medium"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="truncate text-zinc-200">
                  {currentOrg ? currentOrg.name : "Select Org"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {organizations.map((item) => (
                  <button
                    key={item.organizationId}
                    onClick={() => {
                      setCurrentOrg(item.organization);
                      setCurrentRole(item.role);
                      setIsOrgDropdownOpen(false);
                      if (item.role === "billing_agent") {
                        const restrictedPaths = [
                          "/dashboard/customers",
                          "/dashboard/inventory",
                          "/dashboard/settings",
                          "/dashboard/admin"
                        ];
                        const isRestricted = restrictedPaths.some(p => pathname.startsWith(p)) || pathname === "/dashboard" || pathname === "/dashboard/";
                        if (isRestricted) {
                          router.push("/dashboard/invoices");
                        }
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate">{item.organization.name}</span>
                    <span className="ml-auto text-[10px] uppercase font-bold text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-md bg-violet-500/5">
                      {item.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Footer */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-zinc-200 truncate">
                  {profile?.full_name || "Guest"}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {profile?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-400 hover:text-white md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Org Name (for mobile) */}
          <div className="md:hidden flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain rounded-xl" />
            <span className="font-semibold text-sm truncate max-w-[120px]">
              {profile?.is_super_admin ? "Super Admin" : (currentOrg ? currentOrg.name : "ARVO")}
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications */}
            <button className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600" />
            </button>

            {/* Profile Menu for Header */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full pr-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-violet-600/15 text-violet-400 flex items-center justify-center font-bold text-xs">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-zinc-300">
                  {profile?.full_name?.split(" ")[0]}
                </span>
                <ChevronDown className="hidden sm:inline w-3 h-3 text-zinc-500" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-zinc-800">
                    <p className="text-xs font-medium text-zinc-500">Logged in as</p>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{profile?.email}</p>
                  </div>
                  {!profile?.is_super_admin && currentRole !== "billing_agent" && (
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-zinc-800 text-zinc-300 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Business Profile
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-red-950/20 hover:text-red-400 text-red-300 border-t border-zinc-800 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Section */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-950">
          {children}
        </main>
      </div>

      {/* Sidebar for Mobile / Drawer overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay backdrop */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 z-10 p-4">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Brand Header */}
            <div className="flex items-center gap-2 mb-8 mt-2">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain rounded-xl" />
              <span className="font-bold text-xl tracking-tight text-white">ARVO</span>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer Log out */}
            <div className="border-t border-zinc-800 pt-4 mt-auto">
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
