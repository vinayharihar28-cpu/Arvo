"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProducts, getCategories } from "@/lib/supabase/queries";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  Loader2,
  Search,
  Tag,
  DollarSign,
  Percent,
  FileText,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  hsn_sac?: string;
  price: number;
  gst_rate: number;
  category_id?: string;
  categories?: Category | null;
}

export default function InventoryPage() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Categories & Products state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modals / Form states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodHsn, setProdHsn] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodGst, setProdGst] = useState("18.00");
  const [prodCategory, setProdCategory] = useState("");

  // Load from Supabase
  useEffect(() => {
    async function loadInventory() {
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
        
        const dbCats = await getCategories(supabase, id);
        const dbProds = await getProducts(supabase, id);

        if (dbCats) setCategories(dbCats);
        if (dbProds) setProducts(dbProds);
      }
    }
    loadInventory();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !orgId) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ organization_id: orgId, name: newCategoryName }])
      .select();

    if (error) {
      alert("Error saving category: " + error.message);
    } else if (data) {
      setCategories([...categories, data[0]]);
    }

    setNewCategoryName("");
    setIsCategoryModalOpen(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !orgId) return;

    const payload = {
      organization_id: orgId,
      name: prodName,
      description: prodDesc,
      hsn_sac: prodHsn.trim() || null,
      price: parseFloat(prodPrice),
      gst_rate: parseFloat(prodGst),
      category_id: prodCategory || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products_services")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        alert("Error: " + error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("products_services")
        .insert([payload])
        .select();

      if (error) {
        alert("Error: " + error.message);
        return;
      }
      if (data) {
        const selectedCat = categories.find((c) => c.id === prodCategory) || null;
        setProducts([...products, { ...data[0], categories: selectedCat }]);
      }
    }
    
    // Reload
    const dbProds = await getProducts(supabase, orgId);
    if (dbProds) setProducts(dbProds);

    closeProductModal();
  };

  const openProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdDesc(product.description || "");
      setProdHsn(product.hsn_sac || "");
      setProdPrice(product.price.toString());
      setProdGst(product.gst_rate.toString());
      setProdCategory(product.category_id || "");
    } else {
      setEditingProduct(null);
      setProdName("");
      setProdDesc("");
      setProdHsn("");
      setProdPrice("");
      setProdGst("18.00");
      setProdCategory(categories[0]?.id || "");
    }
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      if (orgId) {
        const { error } = await supabase.from("products_services").delete().eq("id", id);
        if (error) {
          alert("Error deleting: " + error.message);
          return;
        }
      }
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.categories && p.categories.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title / Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory & Catalog</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage billing items, professional services, and custom categories</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-violet-400" />
            Add Category
          </button>
          <button
            onClick={() => openProductModal()}
            className="flex items-center justify-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-violet-600/10 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Service/Product
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search items, descriptions or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent transition-all text-xs"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase bg-zinc-950/40 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Product/Service</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">HSN/SAC</th>
                <th className="px-6 py-4 font-semibold">Base Price</th>
                <th className="px-6 py-4 font-semibold">GST Rate</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/65">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-violet-400 shrink-0">
                          <Package className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{p.name}</p>
                          <p className="text-xs text-zinc-500 max-w-sm mt-0.5 line-clamp-1">
                            {p.description || "No description provided."}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.categories ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-600/10 text-violet-400 border border-violet-500/20">
                          {p.categories.name}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.hsn_sac ? (
                        <span className="font-mono text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{p.hsn_sac}</span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      ₹{p.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-medium text-indigo-400">{p.gst_rate}%</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openProductModal(p)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-xs italic">
                    No products or services found. Create your first item above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CATEGORY CREATION MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-violet-400" />
                Add Category
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cab Services"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE/PRODUCT CREATION & EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-400" />
                {editingProduct ? "Edit Service / Product" : "Add Service / Product"}
              </h3>
              <button
                onClick={closeProductModal}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Item Name */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Item/Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Srinagar Day Sightseeing"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* HSN/SAC Code */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 9988 or 4911"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm font-mono"
                  />
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Base Price (₹)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="e.g. 3500"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>

                {/* Default GST Rate */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" /> GST Rate (%)
                  </label>
                  <select
                    value={prodGst}
                    onChange={(e) => setProdGst(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  >
                    <option value="0.00">0% (GST Free / Exempt)</option>
                    <option value="5.00">5% (Tour / Economy)</option>
                    <option value="12.00">12% (Business Services)</option>
                    <option value="18.00">18% (Standard Services)</option>
                    <option value="28.00">28% (Luxury / Premium)</option>
                  </select>
                </div>

                {/* Category Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Category
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  >
                    <option value="">No Category (Uncategorized)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Invoice Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="This description will automatically be printed on invoices under the product name..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-violet-600 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
              >
                {editingProduct ? "Save Changes" : "Save Service"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
