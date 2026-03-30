'use client';

import { useMemo, useState } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Tabs, Tab,
} from '@mui/material';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';

interface Props {
  handle: TournamentHandle;
}

export default function StatsTab({ handle }: Props) {
  const { tournament } = handle;
  const [view, setView] = useState<'teams' | 'individuals'>('teams');

  const standings = useMemo(() => {
    if (!tournament.readyToAddMatches()) return null;
    tournament.compileStats(true);
    return tournament.stats;
  // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [handle.version]);

  if (!tournament.readyToAddMatches()) {
    return <Alert severity="info">Add teams and a schedule before viewing stats.</Alert>;
  }

  if (!standings || standings.length === 0 || standings.every((s) => s.pools.every((p) => p.poolTeams.length === 0))) {
    return <Alert severity="info">No match data yet. Enter some games to see standings.</Alert>;
  }

  const scoringRules = tournament.scoringRules;
  const useBonuses = scoringRules?.useBonuses ?? true;
  const tuCount = scoringRules?.maximumRegulationTossupCount ?? 20;
  const answerTypes = scoringRules?.answerTypes ?? [];
  const hasPowers = answerTypes.some((at) => at.isPower);
  const hasNegs = answerTypes.some((at) => at.isNeg);

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="teams" label="Team Standings" />
        <Tab value="individuals" label="Individuals" />
      </Tabs>

      {view === 'teams' && standings.map((phaseSt) => (
        <Box key={phaseSt.phase.name}>
          <Typography variant="h6" fontWeight={700} mb={2}>{phaseSt.phase.name}</Typography>
          {phaseSt.pools.map((poolSt) => (
            <Card key={poolSt.pool.name} sx={{ mb: 2 }}>
              {phaseSt.pools.length > 1 && (
                <Box px={2} py={1} sx={{ bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
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
                      {useBonuses && <TableCell align="right" sx={{ fontWeight: 700 }}>PPB</TableCell>}
                      {hasPowers && <TableCell align="right" sx={{ fontWeight: 700 }}>Pow</TableCell>}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>10s</TableCell>
                      {hasNegs && <TableCell align="right" sx={{ fontWeight: 700 }}>Neg</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poolSt.poolTeams.map((ts, i) => {
                      const ppg = ts.getPtsPerRegTuhString(tuCount);
                      const ppb = ts.getPtsPerBonusString();
                      const powers = hasPowers
                        ? ts.tossupCounts.filter((ac) => ac.answerType?.isPower).reduce((s, ac) => s + (ac.number ?? 0), 0)
                        : null;
                      const tens = ts.tossupCounts.filter((ac) => ac.answerType?.value === 10).reduce((s, ac) => s + (ac.number ?? 0), 0);
                      const negs = hasNegs
                        ? ts.tossupCounts.filter((ac) => ac.answerType?.isNeg).reduce((s, ac) => s + (ac.number ?? 0), 0)
                        : null;
                      return (
                        <TableRow key={ts.team.name} hover>
                          <TableCell sx={{ color: 'text.disabled', width: 32 }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{ts.team.name}</TableCell>
                          <TableCell align="center">{ts.getRecord()}</TableCell>
                          <TableCell align="right">{ppg}</TableCell>
                          {useBonuses && <TableCell align="right">{ppb}</TableCell>}
                          {hasPowers && <TableCell align="right">{powers}</TableCell>}
                          <TableCell align="right">{tens}</TableCell>
                          {hasNegs && <TableCell align="right">{negs}</TableCell>}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          ))}
        </Box>
      ))}

      {view === 'individuals' && standings.map((phaseSt) => {
        const playerStats = phaseSt.players;
        if (!playerStats || playerStats.length === 0) {
          return (
            <Alert key={phaseSt.phase.name} severity="info">
              No individual stats for {phaseSt.phase.name}. Add players to teams and enter per-player stats in games.
            </Alert>
          );
        }

        return (
          <Box key={phaseSt.phase.name}>
            <Typography variant="h6" fontWeight={700} mb={2}>{phaseSt.phase.name}</Typography>
            <Card>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>GP</TableCell>
                      {hasPowers && <TableCell align="right" sx={{ fontWeight: 700 }}>Pow</TableCell>}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>10s</TableCell>
                      {hasNegs && <TableCell align="right" sx={{ fontWeight: 700 }}>Neg</TableCell>}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>TUH</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Pts</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Pts/TUH</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {playerStats.map((ps) => {
                      const powers = hasPowers
                        ? ps.tossupCounts.filter((ac) => ac.answerType?.isPower).reduce((s, ac) => s + (ac.number ?? 0), 0)
                        : null;
                      const tens = ps.tossupCounts.filter((ac) => ac.answerType?.value === 10).reduce((s, ac) => s + (ac.number ?? 0), 0);
                      const negs = hasNegs
                        ? ps.tossupCounts.filter((ac) => ac.answerType?.isNeg).reduce((s, ac) => s + (ac.number ?? 0), 0)
                        : null;
                      const pptuh = ps.getPptuh();
                      return (
                        <TableRow key={`${ps.player.name}-${ps.team.name}`} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{ps.player.name}</TableCell>
                          <TableCell>{ps.team.name}</TableCell>
                          <TableCell align="right">{ps.gamesPlayed.toFixed(1)}</TableCell>
                          {hasPowers && <TableCell align="right">{powers}</TableCell>}
                          <TableCell align="right">{tens}</TableCell>
                          {hasNegs && <TableCell align="right">{negs}</TableCell>}
                          <TableCell align="right">{ps.tossupsHeard}</TableCell>
                          <TableCell align="right">{ps.getTotalPoints()}</TableCell>
                          <TableCell align="right">
                            {pptuh !== undefined ? pptuh.toFixed(2) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        );
      })}
    </Box>
  );
}
