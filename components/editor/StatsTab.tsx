'use client';

import { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert,
} from '@mui/material';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';

interface Props {
  handle: TournamentHandle;
}

export default function StatsTab({ handle }: Props) {
  const { tournament } = handle;

  // compileStats mutates tournament.stats in place on the stable ref — intentional.
  // We depend on handle.version (bumped by every update) rather than the tournament
  // object itself, so stats recompile exactly when tournament data changes.
  const standings = useMemo(() => {
    if (!tournament.readyToAddMatches()) return null;
    tournament.compileStats(false);
    return tournament.stats;
  // eslint-disable-next-line @eslint-react/exhaustive-deps -- intentional: tournament is a stable ref; handle.version drives recomputation
  }, [handle.version]);

  if (!tournament.readyToAddMatches()) {
    return <Alert severity="info">Add teams and a schedule before viewing stats.</Alert>;
  }

  if (!standings || standings.length === 0 || standings.every((s) => s.pools.every((p) => p.poolTeams.length === 0))) {
    return <Alert severity="info">No match data yet. Enter some games to see standings.</Alert>;
  }

  const useBonuses = tournament.scoringRules?.useBonuses ?? true;
  const tuCount = tournament.scoringRules?.maximumRegulationTossupCount ?? 20;

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {standings.map((phaseSt) => (
        <Box key={phaseSt.phase.name}>
          <Typography variant="h6" fontWeight={700} mb={2}>{phaseSt.phase.name}</Typography>
          {phaseSt.pools.map((poolSt) => (
            <Paper key={poolSt.pool.name} elevation={0} variant="outlined" sx={{ mb: 2 }}>
              {phaseSt.pools.length > 1 && (
                <Box px={2} py={1} sx={{ bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight={600}>{poolSt.pool.name}</Typography>
                </Box>
              )}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>W-L</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>PPG</TableCell>
                      {useBonuses && (
                        <TableCell align="right" sx={{ fontWeight: 700 }}>PPB</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poolSt.poolTeams.map((ts, i) => {
                      const ppg = ts.getPtsPerRegTuhString(tuCount);
                      const ppb = ts.getPtsPerBonusString();
                      return (
                        <TableRow key={ts.team.name} hover>
                          <TableCell sx={{ color: 'text.disabled', width: 32 }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{ts.team.name}</TableCell>
                          <TableCell align="center">{ts.getRecord()}</TableCell>
                          <TableCell align="right">{ppg}</TableCell>
                          {useBonuses && <TableCell align="right">{ppb}</TableCell>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Box>
      ))}
    </Box>
  );
}
