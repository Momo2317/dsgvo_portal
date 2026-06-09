import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

const FROM_EMAIL = 'TresorLink <noreply@uploads.tresorlink.de>';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const workspaceId = body.workspaceId || null;

    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    const { data: inviteResult, error: inviteError } = await supabase.rpc(
      'invite_team_member',
      {
        p_email: email,
        p_workspace_id: workspaceId,
      }
    );

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }
    if (!inviteResult?.success) {
      return NextResponse.json(
        { error: inviteResult?.error || 'Einladung fehlgeschlagen' },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { success: true, emailSent: false, warning: 'Server-Konfiguration unvollständig' }
      );
    }

    const service = createClient(supabaseUrl, serviceKey);

    let inviteToken = inviteResult?.invite_token as string | undefined;
    if (!inviteToken) {
      const { data: memberRow } = await service
        .from('team_members')
        .select('invite_token')
        .eq('owner_id', user.id)
        .eq('member_email', email)
        .maybeSingle();
      inviteToken = memberRow?.invite_token ?? undefined;
    }

    const [{ data: profile }, workspaceResult] = await Promise.all([
      service
        .from('user_profiles')
        .select('full_name, company, email')
        .eq('id', user.id)
        .maybeSingle(),
      workspaceId
        ? service
            .from('workspaces')
            .select('name, slug')
            .eq('id', workspaceId)
            .eq('owner_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn('[team-invite] RESEND_API_KEY not configured');
      return NextResponse.json({
        success: true,
        emailSent: false,
        warning: 'E-Mail-Versand ist nicht konfiguriert',
      });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresorlink.de';
    const inviterName =
      profile?.full_name?.trim() ||
      profile?.company?.trim() ||
      profile?.email ||
      'Ihr Team';
    const portalName =
      workspaceResult.data?.name?.trim() ||
      workspaceResult.data?.slug ||
      null;
    if (!inviteToken) {
      console.error('[team-invite] No invite_token for', email);
      return NextResponse.json(
        {
          success: true,
          emailSent: false,
          error: 'Einladungslink konnte nicht erstellt werden. Bitte Migration prüfen.',
        },
        { status: 200 }
      );
    }

    const signupUrl = `${siteUrl}/einladung/${inviteToken}`;

    const portalLine = portalName
      ? `<p style="color: #4b5563; margin-bottom: 16px;">Zugewiesenes Upload-Portal: <strong>${portalName}</strong></p>`
      : '';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `${inviterName} hat Sie zu TresorLink eingeladen`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Team-Einladung bei TresorLink</h2>
            <p style="color: #4b5563; margin-bottom: 16px;">
              <strong>${inviterName}</strong> hat Sie eingeladen, dem Team beizutreten.
            </p>
            ${portalLine}
            <p style="color: #4b5563; margin-bottom: 20px;">
              Erstellen Sie Ihr Konto über den persönlichen Einladungslink. Ihre E-Mail-Adresse und das Unternehmen
              <strong>${profile?.company?.trim() || inviterName}</strong> sind dabei bereits hinterlegt.
            </p>
            <a href="${signupUrl}" style="display: inline-block; background: #1a56db; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
              Einladung annehmen &amp; registrieren
            </a>
            <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
              Falls der Button nicht funktioniert: <a href="${signupUrl}" style="color: #4f46e5;">${signupUrl}</a>
            </p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[team-invite] Resend error:', result);
      return NextResponse.json(
        {
          success: true,
          emailSent: false,
          error: result?.message || 'E-Mail konnte nicht gesendet werden',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, emailSent: true, id: result.id });
  } catch (err: any) {
    console.error('[team-invite] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
