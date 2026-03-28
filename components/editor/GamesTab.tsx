'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Paper, IconButton, TextField,
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
import type { Team } from '@/lib/yfdata/Team';
import type { Phase } from '@/lib/yfdata/Phase';
import type { Round } from '@/lib/yfdata/Round';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

// ─── Match dialog ─────────────────────────────────────────────────────────────

interface MatchDialogState {
  open: boolean;
  phase: Phase | null;
  round: Round | null;
  match: Match | null; // null = new match
  leftTeamName: string;
  rightTeamName: string;
  tuh: string;
  leftScore: string;
  rightScore: string;
  leftForfeit: boolean;
  rightForfeit: boolean;
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
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function GamesTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [matchDialog, setMatchDialog] = useState<MatchDialogState>(emptyMatchDialog);
  const [deleteTarget, setDeleteTarget] = useState<{ phase: Phase; round: Round; match: Match } | null>(null);

  const allTeams: Team[] = tournament.getListOfAllTeams();
  const phases = tournament.phases.filter((p) => p.isFullPhase());
  const activePhase: Phase | undefined = phases[phaseIdx];

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
    });
  };

  const saveMatch = () => {
    const { phase, round, match, leftTeamName, rightTeamName, tuh, leftScore, rightScore, leftForfeit, rightForfeit } = matchDialog;
    if (!phase || !round) return;
    if (!leftTeamName || !rightTeamName) return;
    if (leftTeamName === rightTeamName) return;

    const leftTeam = allTeams.find((t) => t.name === leftTeamName);
    const rightTeam = allTeams.find((t) => t.name === rightTeamName);
    if (!leftTeam || !rightTeam) return;

    const tuhNum = parseInt(tuh, 10) || undefined;
    const leftPts = leftScore !== '' ? parseInt(leftScore, 10) : undefined;
    const rightPts = rightScore !== '' ? parseInt(rightScore, 10) : undefined;

    update(() => {
      if (match) {
        // Edit existing
        match.leftTeam.team = leftTeam;
        match.rightTeam.team = rightTeam;
        match.tossupsRead = tuhNum;
        match.leftTeam.points = leftPts;
        match.rightTeam.points = rightPts;
        match.leftTeam.forfeitLoss = leftForfeit;
        match.rightTeam.forfeitLoss = rightForfeit;
      } else {
        // New match
        const newMatch = new Match(leftTeam, rightTeam, tournament.scoringRules.answerTypes);
        newMatch.tossupsRead = tuhNum;
        newMatch.leftTeam.points = leftPts;
        newMatch.rightTeam.points = rightPts;
        newMatch.leftTeam.forfeitLoss = leftForfeit;
        newMatch.rightTeam.forfeitLoss = rightForfeit;
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Phase tabs */}
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
              <Paper key={round.number} variant="outlined" sx={{ p: 2 }}>
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
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ── Match dialog ── */}
      <Dialog open={matchDialog.open} onClose={() => setMatchDialog(emptyMatchDialog())} maxWidth="sm" fullWidth>
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
                  onChange={(e) => setMatchDialog((d) => ({ ...d, leftTeamName: e.target.value }))}
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
                  onChange={(e) => setMatchDialog((d) => ({ ...d, rightTeamName: e.target.value }))}
                >
                  {allTeams.map((t) => (
                    <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Scores row */}
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

            {/* Forfeit row */}
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
