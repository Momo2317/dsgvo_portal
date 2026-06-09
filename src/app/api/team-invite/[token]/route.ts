import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return NextResponse.json({ error: 'Ungültige Einladung' }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server nicht konfiguriert' }, { status: 500 });
    }

    const service = createClient(supabaseUrl, serviceKey);

    const { data: invite, error } = await service
      .from('team_members')
      .select(
        `
        member_email,
        status,
        member_user_id,
        owner_id,
        workspaces ( name, slug )
      `
      )
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !invite) {
      return NextResponse.json({ error: 'Einladung nicht gefunden oder abgelaufen' }, { status: 404 });
    }

    const { data: ownerProfile } = await service
      .from('user_profiles')
      .select('full_name, company, email')
      .eq('id', invite.owner_id)
      .maybeSingle();

    const company =
      ownerProfile?.company?.trim() ||
      ownerProfile?.full_name?.trim() ||
      'Ihr Unternehmen';
    const inviterName =
      ownerProfile?.full_name?.trim() ||
      ownerProfile?.company?.trim() ||
      ownerProfile?.email ||
      'Ihr Team';

    const workspace = invite.workspaces as { name?: string; slug?: string } | null;
    const portalName = workspace?.name?.trim() || workspace?.slug || null;

    return NextResponse.json({
      email: invite.member_email,
      company,
      inviterName,
      portalName,
      alreadyRegistered: Boolean(invite.member_user_id),
      status: invite.status,
    });
  } catch (err: any) {
    console.error('[team-invite/token] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
