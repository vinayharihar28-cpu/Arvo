"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getInvoices, getCustomers } from "@/lib/supabase/queries";
import {
  TrendingUp,
  FileText,
  Users,
  AlertCircle,
  IndianRupee,
  Clock,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../components/ThemeProvider";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "void";
  customers: {
    name: string;
  };
}

export default function DashboardPage() {
  const supabase = createClient();
  const { theme } = useTheme();
  const [orgId, setOrgId] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const [revenue, setRevenue] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const getDynamicChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue: Record<string, number> = {};
    months.forEach((m) => { monthlyRevenue[m] = 0; });
    invoices.forEach((inv) => {
      if (inv.status === "paid" && inv.issue_date) {
        const dateObj = new Date(inv.issue_date);
        const monthName = months[dateObj.getMonth()];
        monthlyRevenue[monthName] += inv.total_amount;
      }
    });
    return months.map((name) => ({ name, revenue: monthlyRevenue[name] }));
  };

  useEffect(() => {
    setIsMounted(true);
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      if (memberData && memberData.length > 0) {
        const id = memberData[0].organization_id;
        setOrgId(id);

        const dbInvoices = await getInvoices(supabase, id);
        const dbCustomers = await getCustomers(supabase, id);

        if (dbCustomers) setCustomerCount(dbCustomers.length);

        if (dbInvoices) {
          setInvoices(dbInvoices);
          setInvoiceCount(dbInvoices.length);
          setRecentInvoices(dbInvoices.slice(0, 5));

          let paidSum = 0, pendingSum = 0;
          dbInvoices.forEach((inv) => {
            if (inv.status === "paid") paidSum += inv.total_amount;
            else if (inv.status === "sent") pendingSum += inv.total_amount;
          });
          setRevenue(paidSum);
          setPendingAmount(pendingSum);
        }
      }
    }
    loadStats();
  }, []);

  const isDark = theme === "dark";
  const chartGridColor   = isDark ? "#27272a" : "#e4e4e7";
  const chartAxisColor   = isDark ? "#71717a" : "#a1a1aa";
  const chartTooltipBg   = isDark ? "#18181b" : "#ffffff";
  const chartTooltipBdr  = isDark ? "#27272a" : "#e4e4e7";
  const chartTooltipText = isDark ? "#f4f4f5" : "#18181b";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard Overview</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Real-time performance analytics for your ARVO billing workspace</p>
        </div>
        <Link
          href="/dashboard/invoices"
          className="flex items-center justify-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98]"
        >
          Create Invoice
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              ₹{revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +12.5% this month
            </span>
          </div>
          <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Invoices Generated</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{invoiceCount}</h3>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold block mt-1">Total historical files</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Customers */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Active Customers</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{customerCount}</h3>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold block mt-1">Contacts in address book</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Pending Collectibles</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              ₹{pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5 mt-1">
              <Clock className="w-3 h-3" /> Awaiting clearing
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <h3 className="font-semibold text-[var(--text-primary)] text-base">Monthly Billing Performance</h3>
            <span className="text-xs text-[var(--text-muted)] font-medium">CY 2026</span>
          </div>
          <div className="h-72 w-full pt-4">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getDynamicChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="name" stroke={chartAxisColor} fontSize={11} />
                  <YAxis stroke={chartAxisColor} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      borderColor: chartTooltipBdr,
                      color: chartTooltipText,
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-xs italic">
                Loading analytics...
              </div>
            )}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h3 className="font-semibold text-[var(--text-primary)] text-base">Recent Bills</h3>
              <Link href="/dashboard/invoices" className="text-xs text-violet-500 hover:text-violet-400 font-semibold transition-colors">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-[var(--bg-surface-alt)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-strong)] transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)] text-xs truncate">
                        {inv.invoice_number}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{inv.customers.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-primary)] text-xs">
                      ₹{inv.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{inv.issue_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-default)] mt-6">
            <Link
              href="/dashboard/invoices"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-semibold rounded-xl transition-all"
            >
              Manage Invoice Ledger
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
