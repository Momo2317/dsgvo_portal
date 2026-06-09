import TeamInvitePage from './components/TeamInvitePage';

export default async function EinladungPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TeamInvitePage token={token} />;
}
