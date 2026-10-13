import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond(401, { error: "Sign in first." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    return respond(500, { error: "Account deletion is not configured on the server." });
  }

  try {
    const body = await req.json();
    if (body?.confirmation !== "DELETE MY ZUZU ACCOUNT") {
      return respond(400, { error: "The confirmation phrase did not match." });
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) return respond(401, { error: "Your session is invalid or expired." });

    const userId = userResult.user.id;
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Remove files first so a deleted account cannot leave orphaned private uploads.
    const { data: objects, error: listError } = await admin.storage
      .from("zuzu-user-files")
      .list(userId, { limit: 1000 });
    if (listError) return respond(500, { error: "Could not prepare your private files for deletion." });

    const paths = (objects || []).filter((item) => item.id && item.name).map((item) => userId + "/" + item.name);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from("zuzu-user-files").remove(paths);
      if (removeError) return respond(500, { error: "Could not delete all private files. Your account was not deleted." });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return respond(500, { error: "Could not delete the account. Please try again." });

    return respond(200, { success: true });
  } catch {
    return respond(400, { error: "Invalid request." });
  }
});
