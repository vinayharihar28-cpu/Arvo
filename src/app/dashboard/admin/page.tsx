"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Building,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function AdminPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // RBAC States
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("billing_agent");
  const [isInviteSubmitting, setIsInviteSubmitting] = useState(false);

  // Form states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgGstin, setNewOrgGstin] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrgMembers(orgId: string) {
    if (!orgId) {
      setOrgMembers([]);
      return;
    }
    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        user_id,
        profiles (
          email,
          full_name
        )
      `)
      .eq("organization_id", orgId);

    if (!error && data) {
      setOrgMembers(data);
    }
  }

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgMembers(selectedOrgId);
    } else {
      setOrgMembers([]);
    }
  }, [selectedOrgId]);

  async function loadOrgs() {
    const { data: orgList, error: orgError } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        created_at,
        gst_number,
        organization_members (count)
      `);
      
    if (!orgError && orgList) {
      const mappedOrgs = orgList.map((org: any) => ({
        id: org.id,
        name: org.name,
        created_at: new Date(org.created_at).toLocaleDateString(),
        gst_number: org.gst_number,
        members_count: org.organization_members?.[0]?.count || 0
      }));
      setOrganizations(mappedOrgs);
      if (mappedOrgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(mappedOrgs[0].id);
      }
    }
  }

  async function loadUsers() {
    const { data: profileList, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        is_super_admin,
        is_approved,
        organization_members (
          organizations (
            name
          )
        )
      `);
      
    if (!profileError && profileList) {
      const mappedUsers = profileList.map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name || "New Account",
        is_super_admin: p.is_super_admin,
        is_approved: p.is_approved,
        organization_name: p.organization_members?.[0]?.organizations?.name || "No Workspace Linked"
      }));
      setUsers(mappedUsers);
    }
  }

  useEffect(() => {
    async function loadAllAdminData() {
      setIsLoading(true);
      await Promise.all([loadOrgs(), loadUsers()]);
      setIsLoading(false);
    }
    loadAllAdminData();
  }, []);

  const handleAddOrgMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedOrgId) return;

    setIsInviteSubmitting(true);
    try {
      // Search profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        alert("No registered user found with this email. Please ask them to sign up first!");
        setIsInviteSubmitting(false);
        return;
      }

      // Check if user is already a member
      if (orgMembers.some((m) => m.profiles?.email?.toLowerCase() === inviteEmail.trim().toLowerCase())) {
        alert("User is already a member of this workspace!");
        setIsInviteSubmitting(false);
        return;
      }

      // Insert into organization_members
      const { error: insertError } = await supabase
        .from("organization_members")
        .insert([
          {
            organization_id: selectedOrgId,
            user_id: profile.id,
            role: inviteRole,
          },
        ]);

      if (insertError) {
        alert("Error adding member: " + insertError.message);
        setIsInviteSubmitting(false);
        return;
      }

      setInviteEmail("");
      await loadOrgMembers(selectedOrgId);
      await loadOrgs();
      alert(`Successfully added ${inviteEmail} as ${inviteRole}!`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsInviteSubmitting(false);
    }
  };

  const handleRemoveOrgMember = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove member "${name}" from this organization?`)) {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error removing member: " + error.message);
        return;
      }

      setOrgMembers(orgMembers.filter((m) => m.id !== id));
      await loadOrgs();
      alert("Member removed successfully!");
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      alert("Error updating member role: " + error.message);
    } else {
      await loadOrgMembers(selectedOrgId);
      alert("Role updated successfully!");
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/create-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgName: newOrgName,
          gstin: newOrgGstin,
          ownerName,
          ownerEmail,
          ownerPassword,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to create organization.");
      }

      setNewOrgName("");
      setNewOrgGstin("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      await Promise.all([loadOrgs(), loadUsers()]);
      alert(resData.message || "Workspace and Owner account successfully created!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete organization "${name}"? This will delete all associated data!`)) {
      const { error } = await supabase.from("organizations").delete().eq("id", id);
      if (error) {
        alert("Error deleting organization: " + error.message);
      } else {
        await Promise.all([loadOrgs(), loadUsers()]);
        alert("Organization deleted successfully!");
      }
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_super_admin: !currentStatus })
      .eq("id", userId);
      
    if (error) {
      alert("Error updating admin status: " + error.message);
    } else {
      await loadUsers();
    }
  };

  const handleToggleApproval = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: !currentStatus })
      .eq("id", userId);
      
    if (error) {
      alert("Error updating approval status: " + error.message);
    } else {
      await loadUsers();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">SaaS Console (Super Admin)</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage global multi-tenant workspaces, approve user access, and delegate roles</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Organizations</p>
            <h3 className="text-3xl font-bold text-white mt-1">{organizations.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active SaaS Users</p>
            <h3 className="text-3xl font-bold text-white mt-1">{users.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between sm:col-span-2 lg:col-span-1 shadow-xl">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Administrators</p>
            <h3 className="text-3xl font-bold text-white mt-1">
              {users.filter((u) => u.is_super_admin).length}
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Org & List Orgs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Organizations Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Active Organizations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase bg-zinc-950/40 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Workspace Name</th>
                    <th className="px-6 py-3.5 font-semibold">GSTIN</th>
                    <th className="px-6 py-3.5 font-semibold">Users</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/65">
                  {organizations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-zinc-500 text-sm">
                        No active workspaces found.
                      </td>
                    </tr>
                  ) : (
                    organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{org.name}</p>
                              <p className="text-[10px] text-zinc-500">Created: {org.created_at}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{org.gst_number || "N/A"}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-850 border border-zinc-800 text-zinc-400">
                            {org.members_count} members
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteOrg(org.id, org.name)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                            title="Delete Workspace"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Directory */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Global User Access Control</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase bg-zinc-950/40 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">User</th>
                    <th className="px-6 py-3.5 font-semibold">Workspace</th>
                    <th className="px-6 py-3.5 font-semibold">Dashboard Access</th>
                    <th className="px-6 py-3.5 font-semibold">Super Admin</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/65">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 text-sm">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{user.full_name}</p>
                            <p className="text-xs text-zinc-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{user.organization_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            user.is_approved
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}>
                            {user.is_approved ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Approved
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Pending Approval
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            user.is_super_admin
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : "bg-zinc-850 text-zinc-500 border border-zinc-800"
                          }`}>
                            {user.is_super_admin ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Toggle Approval Button */}
                            {["vinayharihar28@gmail.com", "hvinay225@gmail.com", "admin@arvo.com"].includes(user.email.toLowerCase()) ? (
                              <button
                                disabled
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-zinc-800 text-zinc-600 bg-zinc-950/20 cursor-not-allowed font-medium"
                              >
                                Platform Admin
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleApproval(user.id, user.is_approved)}
                                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                                    user.is_approved
                                      ? "bg-emerald-950/20 border-emerald-800 text-emerald-400 hover:bg-emerald-900/20"
                                      : "bg-zinc-950 border-zinc-800 text-zinc-450 hover:text-white"
                                  }`}
                                  title={user.is_approved ? "Revoke Dashboard Access" : "Grant Dashboard Access"}
                                >
                                  {user.is_approved ? "Revoke Access" : "Approve User"}
                                </button>

                                {/* Toggle Super Admin Button */}
                                <button
                                  onClick={() => handleToggleAdmin(user.id, user.is_super_admin)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    user.is_super_admin
                                      ? "bg-purple-500/5 border-purple-500/10 text-purple-400 hover:bg-purple-500/10"
                                      : "border-transparent text-zinc-500 hover:text-purple-400 hover:bg-purple-500/5"
                                  }`}
                                  title={user.is_super_admin ? "Revoke Super Admin Privilege" : "Grant Super Admin Privilege"}
                                >
                                  <ShieldAlert className="w-4.5 h-4.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workspace Team & RBAC Management */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-6 p-6">
            <div className="border-b border-zinc-850 pb-4">
              <h2 className="text-lg font-semibold text-white">Workspace Members & RBAC</h2>
              <p className="text-xs text-zinc-400 mt-1">Manage team members and roles for a specific organization</p>
            </div>

            {/* Select Organization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Select Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                >
                  <option value="">-- Choose Workspace --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedOrgId ? (
              <div className="space-y-6 pt-2">
                {/* Invite Member to Selected Org Form */}
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Add Member to Selected Workspace</h3>
                  <form onSubmit={handleAddOrgMember} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-[200px] w-full">
                      <label className="block text-zinc-450 text-xs font-medium mb-1.5">
                        User Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        placeholder="member@company.com"
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-xs"
                      />
                    </div>

                    <div className="w-full sm:w-48">
                      <label className="block text-zinc-450 text-xs font-medium mb-1.5">
                        Access Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-xs"
                      >
                        <option value="owner">Owner (Full Permissions)</option>
                        <option value="admin">Admin (Manage settings & users)</option>
                        <option value="billing_agent">Billing Agent (Generate Invoices)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isInviteSubmitting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-all text-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {isInviteSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Member"
                      )}
                    </button>
                  </form>
                </div>

                {/* Workspace Members Table */}
                <div className="border border-zinc-850 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                      <thead className="text-xs uppercase bg-zinc-950/60 text-zinc-550 border-b border-zinc-850">
                        <tr>
                          <th className="px-4 py-3 font-semibold">User</th>
                          <th className="px-4 py-3 font-semibold">Role</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850/65">
                        {orgMembers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-zinc-500 text-xs">
                              No members in this organization yet.
                            </td>
                          </tr>
                        ) : (
                          orgMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-zinc-800/5 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-white text-xs">{member.profiles?.full_name || "N/A"}</p>
                                  <p className="text-[10px] text-zinc-450">{member.profiles?.email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                  className="px-2 py-1 bg-zinc-950 border border-zinc-850 rounded text-zinc-350 focus:outline-none text-[11px] cursor-pointer"
                                >
                                  <option value="owner">Owner</option>
                                  <option value="admin">Admin</option>
                                  <option value="billing_agent">Billing Agent</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveOrgMember(member.id, member.profiles?.full_name || "Member")}
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-xs italic text-center py-6">Please select an organization to manage its members.</p>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions Form */}
        <div className="space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                Provision Tenant
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Simultaneously create workspace and register pre-approved owner</p>
            </div>
            
            <form onSubmit={handleCreateOrg} className="space-y-4 pt-2">
              {/* Workspace Details */}
              <div className="space-y-3 pb-3 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Workspace details</h3>
                <div>
                  <label className="block text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    required
                    placeholder="e.g. Swastik Tours"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={newOrgGstin}
                    onChange={(e) => setNewOrgGstin(e.target.value)}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Owner Account Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Owner Account</h3>
                <div>
                  <label className="block text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    placeholder="e.g. owner@swastiktours.com"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  "Provision Tenant"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
