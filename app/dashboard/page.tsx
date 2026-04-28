import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  Box, Button, Typography, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TournamentCard from '@/components/TournamentCard';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/auth/login');

  const [owned, shared] = await Promise.all([
    prisma.yfTournament.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, updatedAt: true },
    }),
    prisma.yfTournamentShare.findMany({
      where: { userId: session.user.id },
      include: {
        tournament: { select: { id: true, name: true, updatedAt: true, owner: { select: { name: true } } } },
      },
      orderBy: { tournament: { updatedAt: 'desc' } },
    }),
  ]);

  return (
    <Box maxWidth={800} mx="auto" px={3} py={5}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h4" fontWeight={700}>My Tournaments</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} href="/tournament/new">
            New tournament
          </Button>
          <LogoutButton />
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={4}>{session.user.email}</Typography>

      {owned.length === 0 && shared.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Typography color="text.secondary" mb={2}>
            No tournaments yet. Create one to get started.
          </Typography>
          <Button variant="outlined" href="/tournament/new">
            Create your first tournament
          </Button>
        </Box>
      ) : (
        <>
          {owned.map((t) => (
            <TournamentCard key={t.id} id={t.id} name={t.name} updatedAt={t.updatedAt.toISOString()} />
          ))}

          {shared.length > 0 && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" fontWeight={600} mb={2}>Shared with me</Typography>
              {shared.map(({ tournament: t }) => (
                <TournamentCard
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  updatedAt={t.updatedAt.toISOString()}
                  sharedBy={t.owner.name ?? undefined}
                />
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
}
