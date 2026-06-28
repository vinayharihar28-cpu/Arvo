"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCustomers } from "@/lib/supabase/queries";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  Mail,
  Phone,
  MapPin,
  Hash,
  Save,
  Loader2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gst_number: string;
}

export default function CustomersPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custGst, setCustGst] = useState("");

  useEffect(() => {
    async function loadCustomers() {
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
        const dbCustomers = await getCustomers(supabase, id);
        if (dbCustomers) {
          setCustomers(dbCustomers);
        }
      }
    }
    loadCustomers();
  }, []);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !orgId) return;
    setIsLoading(true);

    const payload = {
      organization_id: orgId,
      name: custName,
      email: custEmail,
      phone: custPhone,
      address: custAddress,
      gst_number: custGst,
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingCustomer.id);

      if (error) {
        alert("Error updating customer: " + error.message);
        setIsLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select();

      if (error) {
        alert("Error creating customer: " + error.message);
        setIsLoading(false);
        return;
      }
      if (data) {
        setCustomers([...customers, data[0]]);
      }
    }

    // Reload
    const dbCustomers = await getCustomers(supabase, orgId);
    if (dbCustomers) setCustomers(dbCustomers);

    setIsLoading(false);
    closeModal();
  };

  const openModal = (customer: Customer | null = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustName(customer.name);
      setCustEmail(customer.email || "");
      setCustPhone(customer.phone || "");
      setCustAddress(customer.address || "");
      setCustGst(customer.gst_number || "");
    } else {
      setEditingCustomer(null);
      setCustName("");
      setCustEmail("");
      setCustPhone("");
      setCustAddress("");
      setCustGst("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"?`)) {
      if (orgId) {
        const { error } = await supabase.from("customers").delete().eq("id", id);
        if (error) {
          alert("Error deleting customer: " + error.message);
          return;
        }
      }
      setCustomers(customers.filter((c) => c.id !== id));
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customer Manager</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage billing contacts, shipping/billing addresses, and customer GSTINs</p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Customer
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search customers by name, email, phone or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent transition-all text-xs"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700/60 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{c.name}</h3>
                      {c.gst_number ? (
                        <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-violet-400 bg-violet-600/10 border border-violet-500/20 px-2 py-0.5 rounded-md mt-1 font-mono">
                          GSTIN: {c.gst_number}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] text-zinc-500 font-semibold mt-1">
                          Consumer / No GSTIN
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t border-zinc-800 text-sm text-zinc-400">
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-500" />
                      <a href={`mailto:${c.email}`} className="hover:text-zinc-200 transition-colors truncate">
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-zinc-500" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => openModal(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg transition-colors border border-zinc-800/80 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs rounded-lg transition-colors border border-red-950/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-xs italic">
            No customers found. Click Add Customer to add your first client contact!
          </div>
        )}
      </div>

      {/* CREATE & EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                {editingCustomer ? "Edit Customer Details" : "Add New Customer"}
              </h3>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Customer / Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Travels or Suresh Sharma"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 99887 76655"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* GST Number */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> Customer GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA1111A1Z1 (Leave blank if unregistered)"
                    value={custGst}
                    onChange={(e) => setCustGst(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Billing Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Full invoice billing/shipping address..."
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4.5 h-4.5" />
                )}
                Save Customer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
