"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentProfile, getUserOrganizations } from "@/lib/supabase/queries";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Bell,
  User as UserIcon,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

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

  useEffect(() => {
    async function loadData() {
      const userProfile = await getCurrentProfile(supabase);

      if (userProfile) {
        setProfile(userProfile);
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

  const navItems: { name: string; href: string; icon: any }[] = [];

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
    <div className="min-h-screen flex bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-[var(--sidebar-border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain rounded-xl" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">
              ARVO
            </span>
          </Link>
        </div>

        {/* Org Switcher */}
        {!profile?.is_super_admin && (
          <div className="p-4 border-b border-[var(--sidebar-border)] relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-surface-alt)] border border-[var(--border-default)] transition-all text-left text-sm font-medium"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="truncate text-[var(--text-primary)]">
                  {currentOrg ? currentOrg.name : "Select Org"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            </button>

            {isOrgDropdownOpen && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-xl z-50 overflow-hidden py-1">
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
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] transition-colors flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
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

        {/* Nav */}
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-9 h-9 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {profile?.full_name || "Guest"}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {profile?.email || ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[var(--border-default)] bg-[var(--header-bg)] backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile menu */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-contain rounded-xl" />
            <span className="font-semibold text-sm truncate max-w-[120px]">
              {profile?.is_super_admin ? "Super Admin" : (currentOrg ? currentOrg.name : "ARVO")}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600" />
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 p-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] border border-[var(--border-default)] rounded-full pr-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-violet-600/15 text-violet-400 flex items-center justify-center font-bold text-xs">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-[var(--text-secondary)]">
                  {profile?.full_name?.split(" ")[0]}
                </span>
                <ChevronDown className="hidden sm:inline w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-[var(--border-default)]">
                    <p className="text-xs font-medium text-[var(--text-muted)]">Logged in as</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{profile?.email}</p>
                  </div>
                  {!profile?.is_super_admin && currentRole !== "billing_agent" && (
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] transition-colors"
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
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-red-950/20 hover:text-red-400 text-red-400 border-t border-[var(--border-default)] transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--bg-base)]">
          {children}
        </main>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative flex flex-col w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] z-10 p-4">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2 mb-8 mt-2">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain rounded-xl" />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-violet-500 to-indigo-400 bg-clip-text text-transparent">ARVO</span>
            </div>

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
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[var(--sidebar-border)] pt-4 mt-auto">
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
