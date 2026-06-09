import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  PLAN_LIMITS,
  storageLimitBytes,
  type PlanType,
} from '@/lib/planLimits';

export interface PortalLimitsResponse {
  plan: PlanType;
  maxFileSizeMb: number;
  storageGb: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  customDomain: boolean;
  maxUsers: number;
  maxPortals: number;
  portalCount: number;
  teamMemberCount: number;
  autoDeleteDays: number;
}

async function getStorageUsedBytesForOwner(ownerId: string): Promise<number> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return 0;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', ownerId);

  const workspaceIds = (workspaces || []).map((w) => w.id);
  if (!workspaceIds.length) return 0;

  const { data } = await supabase
    .from('uploaded_files')
    .select('file_size')
    .in('workspace_id', workspaceIds);

  return (data || []).reduce((sum, row) => sum + (row.file_size || 0), 0);
}

async function getPortalCount(ownerId: string): Promise<number> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return 0;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { count } = await supabase
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId);

  return count || 0;
}

async function getTeamMemberCount(ownerId: string): Promise<number> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return 1;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { count } = await supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId);

  return 1 + (count || 0);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const defaults = PLAN_LIMITS.starter;

    if (!workspaceId) {
      return NextResponse.json({
        plan: 'starter',
        maxFileSizeMb: defaults.maxFileSizeMb,
        storageGb: defaults.storageGb,
        storageUsedBytes: 0,
        storageLimitBytes: storageLimitBytes(defaults),
        customDomain: defaults.customDomain,
        maxUsers: defaults.maxUsers,
        maxPortals: defaults.maxPortals,
        portalCount: 0,
        teamMemberCount: 1,
        autoDeleteDays: defaults.autoDeleteDays,
      } satisfies PortalLimitsResponse);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (!workspace?.owner_id) {
      return NextResponse.json({
        plan: 'starter',
        maxFileSizeMb: defaults.maxFileSizeMb,
        storageGb: defaults.storageGb,
        storageUsedBytes: 0,
        storageLimitBytes: storageLimitBytes(defaults),
        customDomain: defaults.customDomain,
        maxUsers: defaults.maxUsers,
        maxPortals: defaults.maxPortals,
        portalCount: 0,
        teamMemberCount: 1,
        autoDeleteDays: defaults.autoDeleteDays,
      } satisfies PortalLimitsResponse);
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', workspace.owner_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    const plan = ((subscription?.plan as PlanType) || 'starter');
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
    const ownerId = workspace.owner_id;
    const [storageUsedBytes, portalCount, teamMemberCount] = await Promise.all([
      getStorageUsedBytesForOwner(ownerId),
      getPortalCount(ownerId),
      getTeamMemberCount(ownerId),
    ]);

    return NextResponse.json({
      plan,
      maxFileSizeMb: limits.maxFileSizeMb,
      storageGb: limits.storageGb,
      storageUsedBytes,
      storageLimitBytes: storageLimitBytes(limits),
      customDomain: limits.customDomain,
      maxUsers: limits.maxUsers,
      maxPortals: limits.maxPortals,
      portalCount,
      teamMemberCount,
      autoDeleteDays: limits.autoDeleteDays,
    } satisfies PortalLimitsResponse);
  } catch (err: any) {
    console.error('[portal-limits] error:', err.message);
    const defaults = PLAN_LIMITS.starter;
    return NextResponse.json({
      plan: 'starter',
      maxFileSizeMb: defaults.maxFileSizeMb,
      storageGb: defaults.storageGb,
      storageUsedBytes: 0,
      storageLimitBytes: storageLimitBytes(defaults),
      customDomain: defaults.customDomain,
      maxUsers: defaults.maxUsers,
      maxPortals: defaults.maxPortals,
      portalCount: 0,
      teamMemberCount: 1,
      autoDeleteDays: defaults.autoDeleteDays,
    } satisfies PortalLimitsResponse);
  }
}
