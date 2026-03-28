import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import NextLink from 'next/link';
import {
  Box, Button, Typography, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import TournamentCard from '@/components/TournamentCard';

export default async function DashboardPage() {
  let session;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (e) {
    console.error('[dashboard] getSession error:', e);
    throw e;
  }
  if (!session) redirect('/auth/login');

  let owned: { id: string; name: string; updatedAt: Date }[] = [];
  let shared: { tournament: { id: string; name: string; updatedAt: Date; owner: { name: string } } }[] = [];
  try {
    [owned, shared] = await Promise.all([
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
  } catch (e) {
    console.error('[dashboard] Prisma query error:', e);
    throw e;
  }

  return (
    <Box maxWidth={800} mx="auto" px={3} py={5}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Typography variant="h4" fontWeight={700}>My Tournaments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} href="/tournament/new" LinkComponent={NextLink}>
          New tournament
        </Button>
      </Box>

      {owned.length === 0 && shared.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Typography color="text.secondary" mb={2}>
            No tournaments yet. Create one to get started.
          </Typography>
          <Button variant="outlined" href="/tournament/new" LinkComponent={NextLink}>
            Create your first tournament
          </Button>
        </Box>
      ) : (
        <>
          {owned.map((t) => (
            <TournamentCard key={t.id} id={t.id} name={t.name} updatedAt={t.updatedAt} />
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
                  updatedAt={t.updatedAt}
                  sharedBy={t.owner.name}
                />
              ))}
            </>
          )}
        </>
      )}
    </Box>
  );
}
