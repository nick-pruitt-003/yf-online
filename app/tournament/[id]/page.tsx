import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { Box, Typography } from '@mui/material';
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

  if (typeof tournament.data !== 'object' || tournament.data === null || Array.isArray(tournament.data)) {
    return (
      <Box maxWidth={600} mx="auto" px={3} py={8} textAlign="center">
        <Typography variant="h6" color="error" gutterBottom>Tournament data is invalid</Typography>
        <Typography color="text.secondary">The stored data for this tournament could not be loaded.</Typography>
      </Box>
    );
  }

  return (
    <TournamentEditor
      tournamentId={id}
      initialData={tournament.data}
      canEdit={canEdit}
      isOwner={isOwner}
    />
  );
}
