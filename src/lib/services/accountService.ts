'use client';

import { createClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';

export interface TeamMembership {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  ownerName: string;
  ownerCompany: string;
}

export const accountService = {
  async getTeamMembership(): Promise<TeamMembership | null> {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const supabase = createClient();
    const { data: membership, error } = await supabase
      .from('team_members')
      .select('id, owner_id, workspace_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !membership) return null;

    const { data: ownerProfile } = await supabase
      .from('user_profiles')
      .select('full_name, company, email')
      .eq('id', membership.owner_id)
      .maybeSingle();

    return {
      id: membership.id,
      ownerId: membership.owner_id,
      workspaceId: membership.workspace_id,
      ownerName:
        ownerProfile?.full_name?.trim() ||
        ownerProfile?.company?.trim() ||
        ownerProfile?.email ||
        'Ihr Team',
      ownerCompany:
        ownerProfile?.company?.trim() ||
        ownerProfile?.full_name?.trim() ||
        'Unternehmen',
    };
  },

  async isTeamMember(): Promise<boolean> {
    const membership = await this.getTeamMembership();
    return Boolean(membership);
  },

  async getBillingUserId(): Promise<string | null> {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const membership = await this.getTeamMembership();
    if (membership) return null;

    return user.id;
  },

  async getPlanOwnerUserId(): Promise<string | null> {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const membership = await this.getTeamMembership();
    return membership?.ownerId ?? user.id;
  },
};
