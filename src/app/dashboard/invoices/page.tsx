"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getInvoices, getCustomers, getProducts, getOrganizationDetails } from "@/lib/supabase/queries";
import { generateInvoicePDF } from "@/lib/utils/pdfGenerator";
import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  Printer,
  Download,
  Trash2,
  Calendar,
  Users,
  Package,
  Percent,
  PlusCircle,
  Save,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Info,
  Edit2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gst_number: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  gst_rate: number;
  category_id?: string;
}

interface InvoiceItem {
  product_id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "void";
  customer_id: string;
  customers: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gst_number: string;
  };
  items?: InvoiceItem[];
}

export default function InvoicesPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string>("");
  const [orgDetails, setOrgDetails] = useState<any>({
    name: "",
    logo_url: "",
    gst_number: "",
    address: "",
    phone: "",
    tagline: "",
    qr_code_url: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Catalogs
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Invoices list state
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form Invoice States
  const [invNum, setInvNum] = useState("");
  const [invIssueDate, setInvIssueDate] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invStatus, setInvStatus] = useState<Invoice["status"]>("draft");
  const [invCustomerId, setInvCustomerId] = useState("");
  const [invItems, setInvItems] = useState<InvoiceItem[]>([]);

  // Subtotal & taxes
  const [invSubtotal, setInvSubtotal] = useState(0);
  const [invGstTotal, setInvGstTotal] = useState(0);
  const [invNetTotal, setInvNetTotal] = useState(0);

  // Load catalogs
  useEffect(() => {
    async function loadData() {
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

        const details = await getOrganizationDetails(supabase, id);
        if (details) setOrgDetails(details);

        const dbInvoices = await getInvoices(supabase, id);
        const dbCustomers = await getCustomers(supabase, id);
        const dbProducts = await getProducts(supabase, id);

        if (dbInvoices) setInvoices(dbInvoices);
        if (dbCustomers) setCustomers(dbCustomers);
        if (dbProducts) setProducts(dbProducts);
      }
    }
    loadData();
  }, []);

  // Calculate Invoice Totals dynamically
  useEffect(() => {
    let sub = 0;
    let gst = 0;
    invItems.forEach((item) => {
      sub += item.quantity * item.unit_price;
      gst += item.gst_amount;
    });
    setInvSubtotal(sub);
    setInvGstTotal(gst);
    setInvNetTotal(sub + gst);
  }, [invItems]);

  const startNewInvoice = () => {
    const nextNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`;
    setInvNum(nextNum);
    setInvIssueDate(new Date().toISOString().split("T")[0]);
    setInvDueDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); // 10 days due
    setInvStatus("draft");
    setInvCustomerId(customers[0]?.id || "");
    setInvItems([
      {
        product_id: "",
        name: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        gst_rate: 18.0,
        gst_amount: 0,
        total: 0,
      },
    ]);
    setViewMode("create");
  };

  const startEditInvoice = async (inv: Invoice) => {
    // Fetch full items if not already loaded
    let items: InvoiceItem[] = inv.items || [];
    if (!items.length) {
      const { data: itemRows } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id);
      items = itemRows || [];
    }
    setEditingInvoiceId(inv.id);
    setInvNum(inv.invoice_number);
    setInvIssueDate(inv.issue_date);
    setInvDueDate(inv.due_date);
    setInvStatus(inv.status);
    setInvCustomerId(inv.customer_id);
    setInvItems(
      items.length
        ? items
        : [{ product_id: "", name: "", description: "", quantity: 1, unit_price: 0, gst_rate: 18, gst_amount: 0, total: 0 }]
    );
    setViewMode("edit");
  };

  const openViewInvoice = async (inv: Invoice) => {
    // 1. Fetch full customer details
    const { data: customerFull } = await supabase
      .from("customers")
      .select("*")
      .eq("id", inv.customer_id)
      .single();

    // 2. Fetch line items
    const { data: itemRows } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);

    setSelectedInvoice({
      ...inv,
      customers: customerFull || inv.customers,
      items: itemRows || [],
    });
    setViewMode("view");
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItems = [...invItems];
    newItems[index] = {
      product_id: productId,
      name: product.name,
      description: product.description || "",
      quantity: 1,
      unit_price: product.price,
      gst_rate: product.gst_rate,
      gst_amount: (product.price * 1 * product.gst_rate) / 100,
      total: product.price * 1 + (product.price * 1 * product.gst_rate) / 100,
    };
    setInvItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invItems];
    const item = { ...newItems[index], [field]: value };

    // Calculate row total
    if (field === "quantity" || field === "unit_price" || field === "gst_rate") {
      const qty = field === "quantity" ? parseFloat(value) || 0 : item.quantity;
      const price = field === "unit_price" ? parseFloat(value) || 0 : item.unit_price;
      const gstRate = field === "gst_rate" ? parseFloat(value) || 0 : item.gst_rate;

      const subtotal = qty * price;
      const gstAmount = (subtotal * gstRate) / 100;
      item.gst_amount = gstAmount;
      item.total = subtotal + gstAmount;
    }

    newItems[index] = item;
    setInvItems(newItems);
  };

  const addInvoiceItemRow = () => {
    setInvItems([
      ...invItems,
      {
        product_id: "",
        name: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        gst_rate: 18.0,
        gst_amount: 0,
        total: 0,
      },
    ]);
  };

  const removeInvoiceItemRow = (index: number) => {
    if (invItems.length === 1) return;
    setInvItems(invItems.filter((_, idx) => idx !== index));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNum.trim() || !invCustomerId || !orgId) {
      alert("Please fill in all details");
      return;
    }

    const customer = customers.find((c) => c.id === invCustomerId);
    if (!customer) return;

    const invoicePayload = {
      organization_id: orgId,
      customer_id: invCustomerId,
      invoice_number: invNum,
      issue_date: invIssueDate,
      due_date: invDueDate,
      subtotal: invSubtotal,
      gst_amount: invGstTotal,
      total_amount: invNetTotal,
      status: invStatus,
    };

    if (editingInvoiceId) {
      // UPDATE existing invoice
      const { error } = await supabase
        .from("invoices")
        .update(invoicePayload)
        .eq("id", editingInvoiceId);

      if (error) { alert("Error updating invoice: " + error.message); return; }

      // Delete old items and re-insert
      await supabase.from("invoice_items").delete().eq("invoice_id", editingInvoiceId);

      const itemRows = invItems.map((item) => ({
        invoice_id: editingInvoiceId,
        product_id: item.product_id || null,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        gst_rate: item.gst_rate,
        gst_amount: item.gst_amount,
        total: item.total,
      }));
      const { error: itemsError } = await supabase.from("invoice_items").insert(itemRows);
      if (itemsError) { alert("Error saving invoice items: " + itemsError.message); }
    } else {
      // INSERT new invoice
      const { data, error } = await supabase
        .from("invoices")
        .insert([invoicePayload])
        .select();

      if (error) { alert("Error saving invoice: " + error.message); return; }

      if (data && data[0]) {
        const itemRows = invItems.map((item) => ({
          invoice_id: data[0].id,
          product_id: item.product_id || null,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount,
          total: item.total,
        }));
        const { error: itemsError } = await supabase.from("invoice_items").insert(itemRows);
        if (itemsError) { alert("Error saving invoice items: " + itemsError.message); }
      }
    }

    const dbInvoices = await getInvoices(supabase, orgId);
    if (dbInvoices) setInvoices(dbInvoices);

    setEditingInvoiceId(null);
    setViewMode("list");
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    // In order to download PDF, we need full invoice items.
    let fullInvoiceData = inv;
    if (!inv.items) {
      if (orgId) {
        const { data: itemRows } = await supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", inv.id);
        fullInvoiceData = { ...inv, items: itemRows || [] };
      }
    }

    const pdfPayload = {
      invoice_number: fullInvoiceData.invoice_number,
      issue_date: fullInvoiceData.issue_date,
      due_date: fullInvoiceData.due_date,
      subtotal: fullInvoiceData.subtotal,
      gst_amount: fullInvoiceData.gst_amount,
      total_amount: fullInvoiceData.total_amount,
      status: fullInvoiceData.status,
      customers: {
        name: fullInvoiceData.customers.name,
        email: fullInvoiceData.customers.email,
        phone: fullInvoiceData.customers.phone,
        address: fullInvoiceData.customers.address,
        gst_number: fullInvoiceData.customers.gst_number,
      },
      organizations: orgDetails,
      items: fullInvoiceData.items || [],
    };

    generateInvoicePDF(pdfPayload);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customers.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = statusFilter === "all" || inv.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. LIST MODE */}
      {viewMode === "list" && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Billing & Invoices</h1>
              <p className="text-zinc-400 text-sm mt-1">Generate professional tax invoices, calculate GST, and download PDFs</p>
            </div>
            <button
              onClick={startNewInvoice}
              className="flex items-center justify-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              New Invoice
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search invoice number or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent transition-all text-xs"
              />
            </div>
            <div className="flex gap-2">
              {["all", "draft", "sent", "paid", "void"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border cursor-pointer ${
                    statusFilter === status
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase bg-zinc-950/40 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Invoice No</th>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Issue Date</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/65">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4.5 h-4.5 text-violet-400" />
                            <span className="font-semibold text-white">{inv.invoice_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{inv.customers.name}</p>
                            <p className="text-xs text-zinc-500">{inv.customers.email || ""}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400">{inv.issue_date}</td>
                        <td className="px-6 py-4 font-semibold text-white">
                          ₹{inv.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "sent"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : inv.status === "void"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-800"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleDownloadPDF(inv)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEditInvoice(inv)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all cursor-pointer"
                              title="Edit Invoice"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openViewInvoice(inv)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                              title="View Details"
                            >
                              <ChevronRight className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-xs italic">
                        No invoices found. Generate your first bill!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. CREATE / EDIT INVOICE FORM */}
      {(viewMode === "create" || viewMode === "edit") && (
        <form onSubmit={handleSaveInvoice} className="space-y-6 max-w-5xl mx-auto">
          {/* Form Header */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setEditingInvoiceId(null); setViewMode("list"); }}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {viewMode === "edit" ? "Edit Invoice" : "Create Invoice"}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">Configure invoice details, select products, and adjust tax rates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column - Details and Products */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core Details Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invNum}
                    onChange={(e) => setInvNum(e.target.value)}
                    placeholder="INV-XXXX"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 text-sm"
                  />
                </div>

                {/* Customer Selection */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Customer / Client
                  </label>
                  <select
                    value={invCustomerId}
                    onChange={(e) => setInvCustomerId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 text-sm"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.gst_number ? `(${c.gst_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invIssueDate}
                    onChange={(e) => setInvIssueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 text-sm"
                  />
                </div>
              </div>

              {/* Items Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-semibold text-white">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addInvoiceItemRow}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4.5 h-4.5" />
                    Add Row
                  </button>
                </div>

                {/* Dynamic Item list */}
                <div className="space-y-6">
                  {invItems.map((item, index) => (
                    <div key={index} className="space-y-3 p-4 bg-zinc-950/45 border border-zinc-800/80 rounded-2xl relative">
                      {/* Remove Row Button */}
                      {invItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInvoiceItemRow(index)}
                          className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Main selectors and pricing */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                        {/* Product Selector */}
                        <div className="sm:col-span-3">
                          <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider mb-1">
                            Fetch Product
                          </label>
                          <select
                            value={item.product_id}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600"
                          >
                            <option value="">Choose item...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Item Name Input (if customizing manually) */}
                        <div className="sm:col-span-3">
                          <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider mb-1">
                            Item Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Flight Booking"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, "name", e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600"
                          />
                        </div>

                        {/* Qty */}
                        <div className="sm:col-span-2">
                          <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600 text-center"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider mb-1">
                            Unit Price (₹)
                          </label>
                          <input
                            type="number"
                            required
                            step="any"
                            value={item.unit_price === 0 ? "" : item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600 text-right"
                          />
                        </div>

                        {/* GST Percent (Select Override) */}
                        <div className="sm:col-span-2">
                          <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider mb-1">
                            GST %
                          </label>
                          <select
                            value={item.gst_rate}
                            onChange={(e) => handleItemChange(index, "gst_rate", e.target.value)}
                            className="w-full px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>

                      {/* Description Input (Displays underneath catalog name) */}
                      <div className="space-y-1.5 pt-1.5">
                        <label className="block text-zinc-500 text-[10px] uppercase font-semibold tracking-wider">
                          Description (Displays below product/service in PDF)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Include package details, sightseeing itineraries, room types, flight schedules..."
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600"
                        />
                      </div>

                      {/* Math Summary for row */}
                      <div className="flex justify-end gap-6 text-xs text-zinc-500 font-medium pt-2 border-t border-zinc-900/60">
                        <span>
                          GST: <strong className="text-zinc-300">₹{item.gst_amount.toFixed(2)}</strong>
                        </span>
                        <span>
                          Total: <strong className="text-violet-400">₹{item.total.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Review & Publish */}
            <div className="space-y-6">
              {/* Total Calculation Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-white border-b border-zinc-800 pb-2">
                  Invoice Summary
                </h3>

                <div className="space-y-3 text-sm text-zinc-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-zinc-200">
                      ₹{invSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span className="font-semibold text-zinc-200">
                      ₹{invGstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-zinc-800 pt-3 flex justify-between text-base font-bold">
                    <span className="text-white">Net Bill:</span>
                    <span className="text-violet-400">
                      ₹{invNetTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Invoice Status</label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as Invoice["status"])}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-600"
                  >
                    <option value="draft">Draft (Save only)</option>
                    <option value="sent">Sent (Unpaid)</option>
                    <option value="paid">Paid (Cleared)</option>
                    <option value="void">Void (Cancelled)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-600/10 cursor-pointer"
                  >
                    <Save className="w-4.5 h-4.5" />
                    {viewMode === "edit" ? "Update Invoice" : "Save & Generate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className="w-full py-2.5 px-4 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900/60 text-zinc-400 text-xs rounded-xl font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 3. VIEW DETAIL PREVIEW MODE */}
      {viewMode === "view" && selectedInvoice && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setViewMode("list");
              }}
              className="flex items-center gap-2 py-2 px-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="flex items-center gap-2 py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors cursor-pointer text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Clean Glass Card Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative space-y-8 overflow-hidden text-sm">
            {/* Top Logo and Invoice ID */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-zinc-800 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-xs">
                    A
                  </div>
                  <span className="font-bold text-xl text-white">{orgDetails.name}</span>
                </div>
                <p className="text-zinc-500 text-xs italic">{orgDetails.tagline}</p>
              </div>

              <div className="text-right sm:text-right">
                <h2 className="text-2xl font-bold text-violet-400">TAX INVOICE</h2>
                <p className="text-zinc-400 font-semibold mt-1">Invoice: {selectedInvoice.invoice_number}</p>
                <p className="text-zinc-500 text-xs mt-1">Issued: {selectedInvoice.issue_date}</p>
              </div>
            </div>

            {/* From / To Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-zinc-800 pb-6 text-zinc-400">
              {/* From Company */}
              <div className="space-y-1.5">
                <h4 className="text-zinc-300 font-bold uppercase text-xs tracking-wider">From</h4>
                <p className="font-semibold text-white">{orgDetails.name}</p>
                <p className="text-xs leading-relaxed max-w-xs">{orgDetails.address}</p>
                <p className="text-xs">Ph: {orgDetails.phone}</p>
                <p className="text-xs font-mono font-bold text-violet-400">GSTIN: {orgDetails.gst_number}</p>
              </div>

              {/* To Customer */}
              <div className="space-y-1.5">
                <h4 className="text-zinc-300 font-bold uppercase text-xs tracking-wider">Bill To</h4>
                <p className="font-semibold text-white">{selectedInvoice.customers.name}</p>
                <p className="text-xs leading-relaxed max-w-xs">{selectedInvoice.customers.address || "N/A"}</p>
                <p className="text-xs">Ph: {selectedInvoice.customers.phone || "N/A"}</p>
                {selectedInvoice.customers.gst_number && (
                  <p className="text-xs font-mono font-bold text-violet-400">
                    GSTIN: {selectedInvoice.customers.gst_number}
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Items Table Preview */}
            <div className="space-y-3">
              <h4 className="text-zinc-300 font-bold uppercase text-xs tracking-wider">Bill Items</h4>
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/40 text-zinc-500 border-b border-zinc-800 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-center">GST Rate</th>
                      <th className="px-4 py-3 text-right">GST Amt</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-[11px] text-zinc-500 max-w-sm mt-0.5 whitespace-pre-line leading-relaxed">
                            {item.description}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-right">₹{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center text-indigo-400">{item.gst_rate}%</td>
                        <td className="px-4 py-3.5 text-right">₹{item.gst_amount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-white">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col sm:flex-row justify-between items-end pt-4 border-t border-zinc-800">
              {/* Status Banner */}
              <div className="mb-4 sm:mb-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  selectedInvoice.status === "paid"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  Invoice Status: {selectedInvoice.status}
                </span>
              </div>

              {/* Totals Box */}
              <div className="w-full sm:w-64 space-y-2 text-zinc-400 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium text-white">₹{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax (GST):</span>
                  <span className="font-medium text-white">₹{selectedInvoice.gst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-zinc-800 pt-2">
                  <span className="text-white">Net Payable:</span>
                  <span className="text-violet-400">₹{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
