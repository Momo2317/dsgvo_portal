# Next development

## Team roles

Introduce explicit roles for team members (beyond owner vs member today).

Suggested starting points:

- Add `role` on `team_members` (e.g. `admin`, `member`, `viewer`)
- Enforce permissions in RLS and dashboard routes (who can invite, remove, edit branding, delete files)
- Show role in Team UI; allow owner to change role per member
- Optional: role-based sidebar (e.g. viewers read-only, admins manage portal settings)

## Portal assignment

Invite flow already supports optional `workspace_id`; improve the product around it.

Suggested starting points:

- Require or strongly encourage portal selection when inviting
- Team member dashboard: show only assigned portal(s), not all owner portals when unassigned
- On accept invite: auto-create a dedicated workspace under the **owner** if none was assigned (one upload link per member)
- Team list: show assigned portal name/slug; allow owner to reassign portal after invite
- Validate portal count against plan limits before assign/create

## Related code

| Area | Path |
|------|------|
| Team invite API | `src/app/api/team-invite/route.ts` |
| Team page | `src/app/dashboard/team/page.tsx` |
| Membership / plan inheritance | `src/lib/services/accountService.ts` |
| Workspace list | `src/lib/services/portalService.ts` → `getMyWorkspaces` |
| DB: team + tokens | `supabase/migrations/20260609*.sql` |
| DB: member access | `supabase/migrations/20260609130000_team_member_access.sql` |
