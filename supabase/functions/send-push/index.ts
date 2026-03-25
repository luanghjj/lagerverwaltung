import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidEmail = Deno.env.get("VAPID_EMAIL") || "mailto:admin@okyu-gastro.de";

webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  }

  try {
    const { event_type, standort_id, title, body, roles, url } = await req.json();

    const sb = createClient(supabaseUrl, supabaseKey);

    // Query subscriptions theo role
    let query = sb.from("push_subscriptions").select("*");
    if (roles && roles.length > 0) {
      query = query.in("user_role", roles);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    // Lọc theo standorte
    const filtered = (subs || []).filter((s: any) => {
      if (!standort_id) return true;
      if (s.user_standorte.includes("all")) return true;
      return s.user_standorte.includes(standort_id);
    });

    // Gửi push
    const results = await Promise.allSettled(
      filtered.map(async (s: any) => {
        const sub = { endpoint: s.endpoint, keys: JSON.parse(s.keys) };
        const payload = JSON.stringify({
          title: title || "Lagerverwaltung",
          body: body || "",
          icon: "./icons/icon-192.png",
          tag: event_type || "lager",
          url: url || "./",
        });
        return webpush.sendNotification(sub, payload);
      })
    );

    // Xóa subscriptions hết hạn (410)
    const expired = results
      .map((r, i) => r.status === "rejected" && r.reason?.statusCode === 410 ? filtered[i].endpoint : null)
      .filter(Boolean);

    if (expired.length > 0) {
      await sb.from("push_subscriptions").delete().in("endpoint", expired);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(
      JSON.stringify({ sent, total: filtered.length, expired: expired.length }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
