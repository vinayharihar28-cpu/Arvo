"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganizationDetails } from "@/lib/supabase/queries";
import {
  Building2,
  Phone,
  MapPin,
  Tag,
  Hash,
  Upload,
  QrCode,
  Users,
  UserPlus,
  Trash2,
  Save,
  Loader2,
  UserCheck,
} from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"general" | "team">("team");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [orgId, setOrgId] = useState<string>("");

  // General settings state
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  
  // Custom PAN & Bank Details state
  const [panNumber, setPanNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");

  // Team settings state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("billing_agent");

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

      let isGlobalAdmin = false;
      if (profile) {
        setIsSuperAdmin(profile.is_super_admin);
        isGlobalAdmin = profile.is_super_admin;
      }

      // Get user's org membership and role
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1);

      let currentRole = "";
      if (memberData && memberData.length > 0) {
        const id = memberData[0].organization_id;
        currentRole = memberData[0].role || "";
        setOrgId(id);
        setUserRole(currentRole);
        const details = await getOrganizationDetails(supabase, id);
        if (details) {
          setBusinessName(details.name || "");
          setGstin(details.gst_number || "");
          setPhone(details.phone || "");
          setTagline(details.tagline || "");
          setAddress(details.address || "");
          setLogoUrl(details.logo_url || "");
          setQrUrl(details.qr_code_url || "");
          setPanNumber(details.pan_number || "");
          setBankName(details.bank_name || "");
          setAccountNumber(details.account_number || "");
          setIfscCode(details.ifsc_code || "");
          setBranchName(details.branch_name || "");
          setUpiId(details.upi_id || "");
        }
      }

      if (isGlobalAdmin || currentRole === "owner" || currentRole === "admin") {
        setActiveTab("general");
      } else {
        setActiveTab("team");
      }
    }
    loadSettings();
  }, []);

  // Load team members
  useEffect(() => {
    async function loadMembers() {
      if (!orgId) return;

      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          profiles (
            email,
            full_name
          )
        `)
        .eq("organization_id", orgId);

      if (!error && data) {
        setTeamMembers(data);
      }
    }
    loadMembers();
  }, [orgId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setIsLoading(true);

    const updates = {
      name: businessName,
      gst_number: gstin,
      phone,
      tagline,
      address,
      logo_url: logoUrl,
      qr_code_url: qrUrl,
      pan_number: panNumber,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: ifscCode,
      branch_name: branchName,
      upi_id: upiId,
    };

    const { error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", orgId);

    if (error) {
      alert("Error saving settings: " + error.message);
    } else {
      alert("Settings saved successfully!");
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "qr") => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", orgId);
      formData.append("type", type);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Upload failed");
      }

      if (type === "logo") setLogoUrl(json.url);
      if (type === "qr") setQrUrl(json.url);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !orgId) return;

    // Search profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      alert("No registered user found with this email. Please ask them to sign up first!");
      return;
    }

    // Check if user is already a member
    if (teamMembers.some((m) => m.profiles?.email?.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      alert("User is already a member of this workspace!");
      return;
    }

    // Insert into organization_members
    const { error: insertError } = await supabase
      .from("organization_members")
      .insert([
        {
          organization_id: orgId,
          user_id: profile.id,
          role: inviteRole,
        },
      ]);

    if (insertError) {
      alert("Error adding member: " + insertError.message);
      return;
    }

    // Reload team list
    const { data: membersList } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        profiles (
          email,
          full_name
        )
      `)
      .eq("organization_id", orgId);

    if (membersList) setTeamMembers(membersList);
    setInviteEmail("");
    alert(`Successfully added ${inviteEmail} as ${inviteRole}!`);
  };

  const handleRemoveMember = async (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error removing member: " + error.message);
        return;
      }

      setTeamMembers(teamMembers.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Workspace Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your business profile details and team access</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(isSuperAdmin || userRole === "owner" || userRole === "admin") && (
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
              activeTab === "general"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-4.5 h-4.5" />
            General Details
          </button>
        )}
        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === "team" || (!(isSuperAdmin || userRole === "owner" || userRole === "admin") && activeTab === "general")
              ? "border-violet-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          Team & RBAC
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === "general" && (isSuperAdmin || userRole === "owner" || userRole === "admin") && (
        <form onSubmit={handleSaveGeneral} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Name */}
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
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  placeholder="e.g. Swastik Tours"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                GSTIN / Tax Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Hash className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Terms & Conditions (formerly Tagline) */}
            <div>
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Terms & Conditions
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3 flex items-start text-zinc-500">
                  <Tag className="w-5 h-5" />
                </span>
                <textarea
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. 1. Goods once sold cannot be taken back."
                  rows={4}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Business Address
              </label>
              <div className="relative">
                <span className="absolute top-3 left-3 text-zinc-500">
                  <MapPin className="w-5 h-5" />
                </span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Complete business/office address..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bank Details & PAN section */}
          <div className="pt-6 border-t border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Bank & PAN Details (GST Compliant)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PAN Number */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Company PAN Number
                </label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder="e.g. ABKPH3349E"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  UPI ID (For Billing QR Code)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. merchant@upi"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Bank of India"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 840730150000015"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="e.g. BKID0008407"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              {/* Branch Name */}
              <div>
                <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. JC Road"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Logo & QR Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800">
            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                Business Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-zinc-700" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-medium text-zinc-200 rounded-xl cursor-pointer transition-colors active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "logo")}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-zinc-500 mt-2">Square PNG or JPG recommended. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* QR Code Upload */}
            <div className="space-y-3">
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                UPI / Payment QR Code
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-8 h-8 text-zinc-700" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-medium text-zinc-200 rounded-xl cursor-pointer transition-colors active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    Upload QR Code
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "qr")}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-zinc-500 mt-2">Upload your UPI QR image to print on invoices.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 py-2.5 px-6 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl shadow-lg shadow-violet-600/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4.5 h-4.5" />
              )}
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* Team / RBAC Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Add Team Member Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-400" />
              Invite Team Member
            </h2>

            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="member@company.com"
                  className="w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">
                  Access Role
                </label>
                {isSuperAdmin ? (
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  >
                    <option value="owner">Owner (Full Permissions)</option>
                    <option value="admin">Admin (Manage settings & users)</option>
                    <option value="billing_agent">Billing Agent (Generate Invoices)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value="Billing Agent (Generate Invoices)"
                    className="w-full px-4 py-2.5 bg-zinc-950/45 border border-zinc-800/80 rounded-xl text-zinc-400 focus:outline-none transition-all text-sm cursor-not-allowed"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer text-sm"
              >
                Send Invite
              </button>
            </form>
          </div>

          {/* Members Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Workspace Members</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase bg-zinc-950/40 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">User</th>
                    <th className="px-6 py-3.5 font-semibold">Role</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/65">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                            {member.profiles.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{member.profiles.full_name}</p>
                            <p className="text-xs text-zinc-500">{member.profiles.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          member.role === "owner"
                            ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                            : member.role === "admin"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-800"
                        }`}>
                          <UserCheck className="w-3.5 h-3.5" />
                          {member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Billing Agent"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {member.role !== "owner" ? (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500 italic pr-2">Workspace Owner</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
