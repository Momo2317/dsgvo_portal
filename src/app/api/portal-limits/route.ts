import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Plan limits map
const PLAN_LIMITS: Record<string, { maxFileSizeMb: number; storageGb: number }> = {
  starter: { maxFileSizeMb: 20, storageGb: 10 },
  kanzlei: { maxFileSizeMb: 100, storageGb: 50 },
  premium: { maxFileSizeMb: -1, storageGb: 250 }, // -1 = unlimited
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ maxFileSizeMb: 20, storageGb: 10 });
    }

    const supabase = await createClient();

    // Get workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace?.owner_id) {
      return NextResponse.json({ maxFileSizeMb: 20, storageGb: 10 });
    }

    // Get owner's active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', workspace.owner_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    const plan = (subscription?.plan as string) || 'starter';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

    return NextResponse.json(limits);
  } catch (err: any) {
    console.error('[portal-limits] error:', err.message);
    return NextResponse.json({ maxFileSizeMb: 20, storageGb: 10 });
  }
}
