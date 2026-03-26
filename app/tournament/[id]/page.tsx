import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TournamentEditor from '@/components/TournamentEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/auth/login');

  const { id } = await params;

  const tournament = await prisma.yfTournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      data: true,
      ownerId: true,
      shares: { where: { userId: session.user.id }, select: { canEdit: true } },
    },
  });

  if (!tournament) notFound();

  const isOwner = tournament.ownerId === session.user.id;
  const share = tournament.shares[0];
  const canEdit = isOwner || (share?.canEdit ?? false);

  if (!isOwner && !share) redirect('/dashboard');

  return (
    <TournamentEditor
      tournamentId={id}
      initialData={tournament.data}
      canEdit={canEdit}
    />
  );
}
