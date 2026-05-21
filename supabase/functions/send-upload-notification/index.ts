import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { ownerEmail, fileName, fileSize, portalTitle, workspaceSlug } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const fileSizeKB = fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : "unbekannt";

    const emailBody = {
      from: "TresorLink <noreply@uploads.tresorlink.de>",
      to: [ownerEmail],
      subject: `Neue Datei hochgeladen – ${portalTitle || "Ihr Portal"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">📁 Neue Datei erhalten</h2>
          <p style="color: #4b5563; margin-bottom: 16px;">Ein Mandant hat eine neue Datei in Ihr Portal hochgeladen.</p>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 6px; overflow: hidden;">
            <tr style="background: #f3f4f6;">
              <td style="padding: 10px 16px; font-weight: bold; color: #374151; width: 40%;">Portal</td>
              <td style="padding: 10px 16px; color: #111827;">${portalTitle || workspaceSlug || "–"}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; font-weight: bold; color: #374151;">Dateiname</td>
              <td style="padding: 10px 16px; color: #111827;">${fileName}</td>
            </tr>
            <tr style="background: #f3f4f6;">
              <td style="padding: 10px 16px; font-weight: bold; color: #374151;">Dateigröße</td>
              <td style="padding: 10px 16px; color: #111827;">${fileSizeKB}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #6b7280; font-size: 13px;">
            Melden Sie sich in Ihrem <a href="https://tresorlink.de/dashboard" style="color: #4f46e5;">TresorLink-Dashboard</a> an, um die Datei einzusehen.
          </p>
        </div>
      `,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Resend error: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("send-upload-notification error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
