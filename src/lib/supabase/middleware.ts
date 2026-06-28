import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Strict allowed Admin Emails list
  // Put your exact 1 or 2 administrator email addresses here:
  const ALLOWED_ADMINS = [
    "admin@arvo.com",
    "vinayharihar28@gmail.com", // Replace with your actual email.
    "hvinay225@gmail.com"
  ];

  // Protect routes starting with /dashboard
  const isDashboardRoute = path.startsWith("/dashboard");
  const isSuperAdminRoute = path.startsWith("/dashboard/admin");
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  const isPendingApprovalRoute = path.startsWith("/pending-approval");

  if (!user && (isDashboardRoute || isPendingApprovalRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check approval and admin status for logged in users
  if (user && (isDashboardRoute || isPendingApprovalRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin, is_approved, email")
      .eq("id", user.id)
      .single();

    const userEmail = user.email || profile?.email || "";
    const isSuperAdmin = profile?.is_super_admin && ALLOWED_ADMINS.includes(userEmail.toLowerCase());

    // 1. Super Admin route check
    if (isSuperAdminRoute && !isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // 2. Regular user approval check
    if (!profile?.is_approved && !isSuperAdmin) {
      if (!isPendingApprovalRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/pending-approval";
        return NextResponse.redirect(url);
      }
    } else {
      // If approved user tries to go to pending-approval, send them to dashboard
      if (isPendingApprovalRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
