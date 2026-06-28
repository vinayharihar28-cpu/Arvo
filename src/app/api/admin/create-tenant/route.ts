import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerSupabase();

    // 1. Verify that the requesting user is a logged-in Super Admin
    const { data: { user: adminUser }, error: adminAuthError } = await supabaseServer.auth.getUser();
    
    if (adminAuthError || !adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("is_super_admin, email")
      .eq("id", adminUser.id)
      .single();

    const allowedAdmins = ["vinayharihar28@gmail.com", "hvinay225@gmail.com", "admin@arvo.com"];
    const adminEmail = adminUser.email || adminProfile?.email || "";
    const isAllowed = adminProfile?.is_super_admin && allowedAdmins.includes(adminEmail.toLowerCase());

    if (profileError || !isAllowed) {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // 2. Parse request payload
    const { orgName, gstin, ownerName, ownerEmail, ownerPassword } = await request.json();

    if (!orgName || !ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Instantiate Supabase client with the Service Role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfiguration: missing service role key" }, { status: 500 });
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Check if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", ownerEmail.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: "A user with this email address already exists." }, { status: 400 });
    }

    // 5. Pre-approve the email address in pre_approved_emails table
    const { error: preApproveError } = await supabaseAdmin
      .from("pre_approved_emails")
      .insert([
        {
          email: ownerEmail.trim().toLowerCase(),
        },
      ]);

    if (preApproveError) {
      return NextResponse.json({ error: "Failed to pre-approve email: " + preApproveError.message }, { status: 550 });
    }

    // 6. Create user in Supabase Auth (fires trigger handle_new_user in DB)
    const { data: createdAuthData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail.trim().toLowerCase(),
      password: ownerPassword,
      email_confirm: true, // auto-confirm email to allow instant login
      user_metadata: {
        full_name: ownerName.trim(),
      },
    });

    if (createUserError || !createdAuthData.user) {
      // Clean up placeholder if auth creation fails
      await supabaseAdmin.from("pre_approved_emails").delete().eq("email", ownerEmail.trim().toLowerCase());
      return NextResponse.json({ error: "Auth creation failed: " + createUserError?.message }, { status: 400 });
    }

    const newUserId = createdAuthData.user.id;

    // 7. Create the Organization
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert([
        {
          name: orgName.trim(),
          gst_number: gstin ? gstin.trim() : null,
        },
      ])
      .select()
      .single();

    if (orgError || !orgData) {
      // Clean up user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: "Organization creation failed: " + orgError?.message }, { status: 400 });
    }

    // 8. Link the User as the owner of the new Organization
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert([
        {
          organization_id: orgData.id,
          user_id: newUserId,
          role: "owner",
        },
      ]);

    if (memberError) {
      // Clean up user and organization
      await supabaseAdmin.from("organizations").delete().eq("id", orgData.id);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: "Failed to link member role: " + memberError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Tenant workspace "${orgName}" and owner account "${ownerEmail}" successfully provisioned.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
