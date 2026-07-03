// ============================================================
// Metcalf Marine Exhaust — quote-submit Edge Function
// Captures a quote request into `mmx_quotes` and emails info@mmxhaust.com.
//
// Deploy:  supabase functions deploy quote-submit --no-verify-jwt
// Secrets (set once):
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set QUOTE_TO=info@mmxhaust.com
//   supabase secrets set QUOTE_FROM="Metcalf Site <quotes@metcalfmarineexhaust.com>"
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://metcalfmarineexhaust.com",
  "https://www.metcalfmarineexhaust.com",
];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

function esc(s: string) {
  return String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // --- validate the essentials ---
    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim();
    if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Name and a valid email are required." }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }

    // --- tiny honeypot: if a hidden field is filled, silently accept & drop (bots) ---
    if ((body.company ?? "").toString().trim() !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const row = {
      name,
      email,
      vessel: (body.vessel ?? "").toString().trim() || null,
      engines: (body.engines ?? "").toString().trim() || null,
      need: (body.need ?? "").toString().trim() || null,
      details: (body.details ?? "").toString().trim() || null,
      source_page: (body.source_page ?? "index").toString().slice(0, 40),
    };

    // --- 1) persist to Supabase (system of record) ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: inserted, error: dbErr } = await supabase
      .from("mmx_quotes").insert(row).select("id, created_at").single();
    if (dbErr) throw new Error("db: " + dbErr.message);

    // --- 2) notify the team by email (Resend) ---
    const to = Deno.env.get("QUOTE_TO") ?? "info@mmxhaust.com";
    const from = Deno.env.get("QUOTE_FROM") ?? "Metcalf Site <quotes@metcalfmarineexhaust.com>";
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (resendKey) {
      const html = `
        <h2 style="font-family:Georgia,serif;color:#0c2536;margin:0 0 12px">New quote request</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Name</b></td><td>${esc(row.name)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Email</b></td><td><a href="mailto:${esc(row.email)}">${esc(row.email)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Vessel</b></td><td>${esc(row.vessel ?? "—")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Engines</b></td><td>${esc(row.engines ?? "—")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Need</b></td><td>${esc(row.need ?? "—")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667;vertical-align:top"><b>Details</b></td><td>${esc(row.details ?? "—").replace(/\n/g, "<br>")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#667"><b>Page</b></td><td>${esc(row.source_page)}</td></tr>
        </table>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#889;margin-top:16px">
          Ref ${inserted.id} · ${new Date(inserted.created_at).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
        </p>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from, to, reply_to: row.email,
          subject: `New quote — ${row.name}${row.vessel ? " · " + row.vessel : ""}`,
          html,
        }),
      });
      // Don't fail the whole request if email hiccups — the lead is already saved.
      if (!emailRes.ok) console.error("resend error:", await emailRes.text());
    } else {
      console.warn("RESEND_API_KEY not set — lead saved to DB, no email sent.");
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      status: 200, headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Something went wrong. Please call 954-463-4650." }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
