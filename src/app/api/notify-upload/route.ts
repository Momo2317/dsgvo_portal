import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function resolveNotifyRecipient(
  workspaceSlug?: string,
  workspaceId?: string
): Promise<{
  email: string | null;
  portalTitle: string | null;
}> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return { email: null, portalTitle: null };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  if (workspaceId) {
    const { data } = await supabase
      .from('branding_settings')
      .select('notify_email, portal_title')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return {
      email: data?.notify_email?.trim() || null,
      portalTitle: data?.portal_title || null,
    };
  }

  if (workspaceSlug) {
    const { data } = await supabase
      .from('branding_settings')
      .select('notify_email, portal_title, workspaces!inner(slug)')
      .eq('workspaces.slug', workspaceSlug)
      .maybeSingle();
    return {
      email: data?.notify_email?.trim() || null,
      portalTitle: data?.portal_title || null,
    };
  }

  return { email: null, portalTitle: null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ownerEmail,
      fileName,
      fileSize,
      portalTitle,
      workspaceSlug,
      workspaceId,
    } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
    }

    const resolved = await resolveNotifyRecipient(workspaceSlug, workspaceId);
    const recipient = resolved.email || ownerEmail?.trim() || null;

    if (!recipient) {
      return NextResponse.json(
        { error: 'No notification email configured for this portal' },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const fileSizeKB = fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : 'unbekannt';
    const title = portalTitle || resolved.portalTitle || workspaceSlug || 'Ihr Portal';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TresorLink <noreply@uploads.tresorlink.de>',
        to: [recipient],
        subject: `Neue Datei hochgeladen – ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Neue Datei erhalten</h2>
            <p style="color: #4b5563; margin-bottom: 16px;">Ein Mandant hat eine neue Datei in Ihr Portal hochgeladen.</p>
            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 6px; overflow: hidden;">
              <tr style="background: #f3f4f6;">
                <td style="padding: 10px 16px; font-weight: bold; color: #374151; width: 40%;">Portal</td>
                <td style="padding: 10px 16px; color: #111827;">${title}</td>
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
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return NextResponse.json(
        { error: result?.message || 'Email send failed', detail: result },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: result.id, sentTo: recipient });
  } catch (err: any) {
    console.error('notify-upload route error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
