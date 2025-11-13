import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fixed admin credentials per user request
    const email = "adminskiy@gmail.com";
    const password = "qwerty123";

    // 1) Try to find user by email
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listErr) throw listErr;

    const existing = list.users.find((u: any) => u.email?.toLowerCase() === email);

    let userId: string | null = null;

    if (existing) {
      // 2a) Update password and confirm email
      const { data: upd, error: updErr } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password,
          email_confirm: true,
          user_metadata: { full_name: "Administrator" },
        },
      );
      if (updErr) throw updErr;
      userId = upd.user.id;
    } else {
      // 2b) Create user
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Administrator" },
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    // 3) Ensure admin role exists for the user
    if (userId) {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert([
          { user_id: userId, role: "admin" },
        ], { onConflict: "user_id,role", ignoreDuplicates: true });

      if (roleErr) throw roleErr;
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Admin ensured", email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errMsg = (e as any)?.message ?? String(e);
    console.error("seed-admin error", errMsg);
    return new Response(
      JSON.stringify({ ok: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
