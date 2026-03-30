'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Alert, Divider, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';
import { Match } from '@/lib/yfdata/Match';
import type AnswerType from '@/lib/yfdata/AnswerType';
import type { Team } from '@/lib/yfdata/Team';
import type { Phase } from '@/lib/yfdata/Phase';
import type { Round } from '@/lib/yfdata/Round';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlayerRow {
  playerName: string;
  tuh: string;
  counts: Record<number, string>; // answerType.value → count
}

interface MatchDialogState {
  open: boolean;
  phase: Phase | null;
  round: Round | null;
  match: Match | null;
  leftTeamName: string;
  rightTeamName: string;
  tuh: string;
  leftScore: string;
  rightScore: string;
  leftForfeit: boolean;
  rightForfeit: boolean;
  leftPlayers: PlayerRow[];
  rightPlayers: PlayerRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyPlayerRow(playerName: string, answerTypes: AnswerType[]): PlayerRow {
  const counts: Record<number, string> = {};
  for (const at of answerTypes) counts[at.value] = '';
  return { playerName, tuh: '', counts };
}

function playersFromMatch(matchPlayers: import('@/lib/yfdata/MatchPlayer').MatchPlayer[], answerTypes: AnswerType[]): PlayerRow[] {
  return matchPlayers.map((mp) => {
    const counts: Record<number, string> = {};
    for (const at of answerTypes) {
      const ac = mp.answerCounts.find((a) => a.answerType?.value === at.value);
      counts[at.value] = ac?.number !== undefined ? String(ac.number) : '';
    }
    return {
      playerName: mp.player?.name ?? '',
      tuh: mp.tossupsHeard !== undefined ? String(mp.tossupsHeard) : '',
      counts,
    };
  });
}

function playersFromTeam(team: Team, answerTypes: AnswerType[]): PlayerRow[] {
  return team.players.map((p) => emptyPlayerRow(p.name, answerTypes));
}

const emptyMatchDialog = (): MatchDialogState => ({
  open: false,
  phase: null,
  round: null,
  match: null,
  leftTeamName: '',
  rightTeamName: '',
  tuh: '20',
  leftScore: '',
  rightScore: '',
  leftForfeit: false,
  rightForfeit: false,
  leftPlayers: [],
  rightPlayers: [],
});

// ─── Player stats grid ───────────────────────────────────────────────────────

interface PlayerGridProps {
  label: string;
  players: PlayerRow[];
  answerTypes: AnswerType[];
  onChange: (updated: PlayerRow[]) => void;
  teamScore?: number;
  useBonuses?: boolean;
}

function PlayerGrid({ label, players, answerTypes, onChange, teamScore, useBonuses }: PlayerGridProps) {
  if (players.length === 0) return null;

  const update = (idx: number, patch: Partial<PlayerRow>) => {
    const next = players.map((r, i) => i === idx ? { ...r, ...patch } : r);
    onChange(next);
  };

  // Compute per-row tossup points and summary stats
  const rowPts = players.map((row) =>
    answerTypes.reduce((s, at) => s + at.value * (parseInt(row.counts[at.value] || '0', 10) || 0), 0),
  );
  const totalTossupPts = rowPts.reduce((s, p) => s + p, 0);
  const bonusesHeard = useBonuses
    ? answerTypes
        .filter((at) => at.value > 0)
        .reduce((s, at) => s + players.reduce((ps, row) => ps + (parseInt(row.counts[at.value] || '0', 10) || 0), 0), 0)
    : 0;
  const bonusPts = teamScore !== undefined ? teamScore - totalTossupPts : undefined;
  const ppb = bonusesHeard > 0 && bonusPts !== undefined ? (bonusPts / bonusesHeard).toFixed(2) : undefined;

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} mb={0.5}>{label}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Player</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, minWidth: 52 }}>TUH</TableCell>
            {answerTypes.map((at) => (
              <TableCell key={at.value} align="center" sx={{ fontWeight: 600, minWidth: 48 }}>
                {at.shortLabel}
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 600, minWidth: 48 }}>Pts</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((row, idx) => (
            <TableRow key={row.playerName}>
              <TableCell sx={{ fontSize: '0.8rem' }}>{row.playerName}</TableCell>
              <TableCell align="center" padding="none" sx={{ py: 0.25 }}>
                <TextField
                  value={row.tuh}
                  onChange={(e) => update(idx, { tuh: e.target.value })}
                  type="number"
                  size="small"
                  slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', padding: '2px 4px', width: 44 } } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                />
              </TableCell>
              {answerTypes.map((at) => (
                <TableCell key={at.value} align="center" padding="none" sx={{ py: 0.25 }}>
                  <TextField
                    value={row.counts[at.value] ?? ''}
                    onChange={(e) => update(idx, { counts: { ...row.counts, [at.value]: e.target.value } })}
                    type="number"
                    size="small"
                    slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', padding: '2px 4px', width: 44 } } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontSize: '0.8rem', color: rowPts[idx] !== 0 ? 'text.primary' : 'text.disabled' }}>
                {rowPts[idx]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {useBonuses && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {bonusPts !== undefined
            ? `Bonuses: ${bonusPts} pts | ${bonusesHeard} heard${ppb ? ` | ${ppb} ppb` : ''}`
            : `${bonusesHeard} bonus${bonusesHeard !== 1 ? 'es' : ''} heard`}
        </Typography>
      )}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GamesTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [matchDialog, setMatchDialog] = useState<MatchDialogState>(emptyMatchDialog);
  const [deleteTarget, setDeleteTarget] = useState<{ phase: Phase; round: Round; match: Match } | null>(null);

  const allTeams: Team[] = tournament.getListOfAllTeams();
  const phases = tournament.phases.filter((p) => p.isFullPhase());
  const activePhase: Phase | undefined = phases[phaseIdx];
  const scoringRules = tournament.scoringRules;
  const answerTypes = scoringRules?.answerTypes ?? [];
  const hasPlayers = allTeams.some((t) => t.players.length > 0);

  if (allTeams.length < 2) {
    return (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary">Add at least 2 teams before entering games.</Typography>
      </Box>
    );
  }

  if (phases.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary">Add phases in the Schedule tab before entering games.</Typography>
      </Box>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const initPlayers = (teamName: string, existingMatchTeam?: import('@/lib/yfdata/MatchTeam').MatchTeam): PlayerRow[] => {
    if (existingMatchTeam && existingMatchTeam.matchPlayers.length > 0) {
      return playersFromMatch(existingMatchTeam.matchPlayers, answerTypes);
    }
    const team = allTeams.find((t) => t.name === teamName);
    if (!team || team.players.length === 0) return [];
    return playersFromTeam(team, answerTypes);
  };

  // ── Match CRUD ──────────────────────────────────────────────────────────────

  const openNewMatch = (phase: Phase, round: Round) => {
    setMatchDialog({ ...emptyMatchDialog(), open: true, phase, round });
  };

  const openEditMatch = (phase: Phase, round: Round, match: Match) => {
    setMatchDialog({
      open: true,
      phase,
      round,
      match,
      leftTeamName: match.leftTeam.team?.name ?? '',
      rightTeamName: match.rightTeam.team?.name ?? '',
      tuh: match.tossupsRead?.toString() ?? '20',
      leftScore: match.leftTeam.points?.toString() ?? '',
      rightScore: match.rightTeam.points?.toString() ?? '',
      leftForfeit: match.leftTeam.forfeitLoss,
      rightForfeit: match.rightTeam.forfeitLoss,
      leftPlayers: initPlayers(match.leftTeam.team?.name ?? '', match.leftTeam),
      rightPlayers: initPlayers(match.rightTeam.team?.name ?? '', match.rightTeam),
    });
  };

  const handleTeamChange = (side: 'left' | 'right', teamName: string) => {
    const team = allTeams.find((t) => t.name === teamName);
    const players = team && team.players.length > 0 ? playersFromTeam(team, answerTypes) : [];
    setMatchDialog((d) => side === 'left'
      ? { ...d, leftTeamName: teamName, leftPlayers: players }
      : { ...d, rightTeamName: teamName, rightPlayers: players });
  };

  const applyPlayerStats = (matchTeam: import('@/lib/yfdata/MatchTeam').MatchTeam, rows: PlayerRow[]) => {
    for (const row of rows) {
      const mp = matchTeam.matchPlayers.find((m) => m.player?.name === row.playerName);
      if (!mp) continue;
      const tuh = row.tuh !== '' ? parseInt(row.tuh, 10) : undefined;
      mp.tossupsHeard = !isNaN(tuh!) ? tuh : undefined;
      for (const at of answerTypes) {
        const val = row.counts[at.value];
        const n = val !== '' ? parseInt(val, 10) : undefined;
        mp.setAnswerCount(at, !isNaN(n!) ? n : undefined);
      }
    }
  };

  const saveMatch = () => {
    const { phase, round, match, leftTeamName, rightTeamName, tuh, leftScore, rightScore,
      leftForfeit, rightForfeit, leftPlayers, rightPlayers } = matchDialog;
    if (!phase || !round) return;
    if (!leftTeamName || !rightTeamName || leftTeamName === rightTeamName) return;

    const leftTeam = allTeams.find((t) => t.name === leftTeamName);
    const rightTeam = allTeams.find((t) => t.name === rightTeamName);
    if (!leftTeam || !rightTeam) return;

    const tuhNum = parseInt(tuh, 10) || undefined;
    const leftPts = leftScore !== '' ? parseInt(leftScore, 10) : undefined;
    const rightPts = rightScore !== '' ? parseInt(rightScore, 10) : undefined;

    update(() => {
      if (match) {
        match.leftTeam.team = leftTeam;
        match.rightTeam.team = rightTeam;
        match.tossupsRead = tuhNum;
        match.leftTeam.points = leftPts;
        match.rightTeam.points = rightPts;
        match.leftTeam.forfeitLoss = leftForfeit;
        match.rightTeam.forfeitLoss = rightForfeit;
        if (leftPlayers.length > 0) applyPlayerStats(match.leftTeam, leftPlayers);
        if (rightPlayers.length > 0) applyPlayerStats(match.rightTeam, rightPlayers);
      } else {
        const newMatch = new Match(leftTeam, rightTeam, tournament.scoringRules.answerTypes);
        newMatch.tossupsRead = tuhNum;
        newMatch.leftTeam.points = leftPts;
        newMatch.rightTeam.points = rightPts;
        newMatch.leftTeam.forfeitLoss = leftForfeit;
        newMatch.rightTeam.forfeitLoss = rightForfeit;
        if (leftPlayers.length > 0) applyPlayerStats(newMatch.leftTeam, leftPlayers);
        if (rightPlayers.length > 0) applyPlayerStats(newMatch.rightTeam, rightPlayers);
        round.matches.push(newMatch);
      }
    });
    setMatchDialog(emptyMatchDialog());
  };

  const deleteMatch = () => {
    if (!deleteTarget) return;
    const { phase, round, match } = deleteTarget;
    update(() => phase.deleteMatch(match, round.number));
    setDeleteTarget(null);
  };

  const leftRightSame = matchDialog.leftTeamName && matchDialog.leftTeamName === matchDialog.rightTeamName;
  const teamsSelected = matchDialog.leftTeamName && matchDialog.rightTeamName && !leftRightSame;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {phases.length > 1 && (
        <Tabs
          value={phaseIdx}
          onChange={(_, v: number) => setPhaseIdx(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {phases.map((ph, i) => <Tab key={ph.name} label={ph.name} value={i} />)}
        </Tabs>
      )}

      {activePhase && (
        <Box display="flex" flexDirection="column" gap={3}>
          {activePhase.rounds.map((round) => {
            const matchCount = round.matches.length;
            return (
              <Card key={round.number}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography fontWeight={600}>
                      Round {round.name}
                      {matchCount > 0 && (
                        <Chip label={`${matchCount} game${matchCount !== 1 ? 's' : ''}`} size="small" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                    {canEdit && (
                      <Button size="small" startIcon={<AddIcon />} onClick={() => openNewMatch(activePhase, round)}>
                        Add Game
                      </Button>
                    )}
                  </Box>

                  {matchCount === 0 ? (
                    <Typography variant="body2" color="text.disabled">No games this round.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Home</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell align="center">TUH</TableCell>
                          <TableCell>Away</TableCell>
                          <TableCell align="right">Score</TableCell>
                          {canEdit && <TableCell />}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {round.matches.map((match, mIdx) => {
                          const lt = match.leftTeam;
                          const rt = match.rightTeam;
                          return (
                            <TableRow key={`${lt.team?.name ?? mIdx}-vs-${rt.team?.name ?? ''}`} hover>
                              <TableCell>{lt.team?.name ?? '—'}</TableCell>
                              <TableCell align="right">
                                {lt.forfeitLoss ? <Chip label="FF" size="small" color="error" /> : (lt.points ?? '—')}
                              </TableCell>
                              <TableCell align="center" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                {match.tossupsRead ?? '—'}
                              </TableCell>
                              <TableCell>{rt.team?.name ?? '—'}</TableCell>
                              <TableCell align="right">
                                {rt.forfeitLoss ? <Chip label="FF" size="small" color="error" /> : (rt.points ?? '—')}
                              </TableCell>
                              {canEdit && (
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => openEditMatch(activePhase, round, match)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget({ phase: activePhase, round, match })}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Match dialog ── */}
      <Dialog
        open={matchDialog.open}
        onClose={() => setMatchDialog(emptyMatchDialog())}
        maxWidth={hasPlayers && teamsSelected ? 'md' : 'sm'}
        fullWidth
      >
        <DialogTitle>{matchDialog.match ? 'Edit Game' : 'Add Game'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {leftRightSame && (
              <Alert severity="error">A team cannot play itself.</Alert>
            )}

            {/* Teams row */}
            <Box display="flex" gap={2} alignItems="center">
              <FormControl fullWidth>
                <InputLabel>Home Team</InputLabel>
                <Select
                  value={matchDialog.leftTeamName}
                  label="Home Team"
                  onChange={(e) => handleTeamChange('left', e.target.value)}
                >
                  {allTeams.map((t) => (
                    <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography color="text.secondary" sx={{ flexShrink: 0 }}>vs.</Typography>
              <FormControl fullWidth>
                <InputLabel>Away Team</InputLabel>
                <Select
                  value={matchDialog.rightTeamName}
                  label="Away Team"
                  onChange={(e) => handleTeamChange('right', e.target.value)}
                >
                  {allTeams.map((t) => (
                    <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Scores + TUH */}
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label={`${matchDialog.leftTeamName || 'Home'} Score`}
                type="number"
                value={matchDialog.leftScore}
                onChange={(e) => setMatchDialog((d) => ({ ...d, leftScore: e.target.value }))}
                fullWidth
                disabled={matchDialog.leftForfeit}
              />
              <TextField
                label="TUH"
                type="number"
                value={matchDialog.tuh}
                onChange={(e) => setMatchDialog((d) => ({ ...d, tuh: e.target.value }))}
                sx={{ width: 90, flexShrink: 0 }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label={`${matchDialog.rightTeamName || 'Away'} Score`}
                type="number"
                value={matchDialog.rightScore}
                onChange={(e) => setMatchDialog((d) => ({ ...d, rightScore: e.target.value }))}
                fullWidth
                disabled={matchDialog.rightForfeit}
              />
            </Box>

            {/* Forfeits */}
            <Box display="flex" gap={2}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <input
                  type="checkbox"
                  id="leftForfeit"
                  checked={matchDialog.leftForfeit}
                  onChange={(e) => setMatchDialog((d) => ({ ...d, leftForfeit: e.target.checked, leftScore: e.target.checked ? '' : d.leftScore }))}
                />
                <label htmlFor="leftForfeit">
                  <Typography variant="body2">Home forfeit</Typography>
                </label>
              </Box>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                <input
                  type="checkbox"
                  id="rightForfeit"
                  checked={matchDialog.rightForfeit}
                  onChange={(e) => setMatchDialog((d) => ({ ...d, rightForfeit: e.target.checked, rightScore: e.target.checked ? '' : d.rightScore }))}
                />
                <label htmlFor="rightForfeit">
                  <Typography variant="body2">Away forfeit</Typography>
                </label>
              </Box>
            </Box>

            {/* Player stats — only shown when teams have players */}
            {teamsSelected && answerTypes.length > 0 && (matchDialog.leftPlayers.length > 0 || matchDialog.rightPlayers.length > 0) && (
              <>
                <Divider>Player Stats</Divider>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
                  {matchDialog.leftPlayers.length > 0 && (
                    <Box flex={1} minWidth={0}>
                      <PlayerGrid
                        label={matchDialog.leftTeamName}
                        players={matchDialog.leftPlayers}
                        answerTypes={answerTypes}
                        onChange={(rows) => setMatchDialog((d) => ({ ...d, leftPlayers: rows }))}
                        teamScore={matchDialog.leftScore !== '' ? parseInt(matchDialog.leftScore, 10) : undefined}
                        useBonuses={scoringRules?.useBonuses}
                      />
                    </Box>
                  )}
                  {matchDialog.rightPlayers.length > 0 && (
                    <Box flex={1} minWidth={0}>
                      <PlayerGrid
                        label={matchDialog.rightTeamName}
                        players={matchDialog.rightPlayers}
                        answerTypes={answerTypes}
                        onChange={(rows) => setMatchDialog((d) => ({ ...d, rightPlayers: rows }))}
                        teamScore={matchDialog.rightScore !== '' ? parseInt(matchDialog.rightScore, 10) : undefined}
                        useBonuses={scoringRules?.useBonuses}
                      />
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialog(emptyMatchDialog())}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveMatch}
            disabled={!matchDialog.leftTeamName || !matchDialog.rightTeamName || !!leftRightSame}
          >
            {matchDialog.match ? 'Save' : 'Add Game'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Game?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget
              ? `${deleteTarget.match.leftTeam.team?.name ?? '?'} vs. ${deleteTarget.match.rightTeam.team?.name ?? '?'}`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={deleteMatch}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
