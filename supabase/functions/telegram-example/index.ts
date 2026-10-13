// Example Supabase Edge Function. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as server secrets.
// Invoke this only from trusted server-side ticket/request workflows; never expose bot secrets in the browser.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("INTERNAL_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-internal-secret") !== secret) return new Response("Unauthorized", { status: 401 });
  const { kind, id, title, message } = await req.json();
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return new Response("Telegram secrets are not configured", { status: 500 });
  const text = `TURBO OS · ${String(kind).slice(0,40)}\nID: ${String(id).slice(0,100)}\n${String(title).slice(0,180)}\n${String(message).slice(0,1800)}`;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) return new Response("Telegram notification failed", { status: 502 });
  return new Response("ok", { status: 200 });
});
