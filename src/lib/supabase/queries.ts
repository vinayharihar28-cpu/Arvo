import { SupabaseClient } from "@supabase/supabase-js";

// Profile Queries
export async function getCurrentProfile(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
}

// Organization Queries
export async function getUserOrganizations(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        logo_url
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching organizations:", error);
    return [];
  }
  return data.map(item => {
    const org = Array.isArray(item.organizations)
      ? item.organizations[0]
      : item.organizations;
    return {
      organizationId: item.organization_id,
      role: item.role,
      organization: org as any,
    };
  });
}

export async function getOrganizationDetails(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) {
    console.error("Error fetching organization details:", error);
    return null;
  }
  return data;
}

// Customers
export async function getCustomers(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data;
}

// Products & Services
export async function getProducts(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("products_services")
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data;
}

// Categories
export async function getCategories(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data;
}

// Invoices
export async function getInvoices(supabase: SupabaseClient, orgId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      customers (
        id,
        name,
        email
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }
  return data;
}

export async function getInvoiceDetails(supabase: SupabaseClient, invoiceId: string) {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      *,
      customers (
        *
      ),
      organizations (
        *
      )
    `)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    console.error("Error fetching invoice:", invoiceError);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);

  if (itemsError) {
    console.error("Error fetching invoice items:", itemsError);
    return null;
  }

  return {
    ...invoice,
    items: items || []
  };
}
