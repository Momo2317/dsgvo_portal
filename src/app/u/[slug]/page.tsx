import ClientPortalPage from '../../client-upload-portal/components/ClientPortalPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceUploadPage({ params }: Props) {
  const { slug } = await params;
  return <ClientPortalPage slug={slug} />;
}
