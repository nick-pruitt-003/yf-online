'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Select, MenuItem, FormControl, InputLabel, Divider,
  Tooltip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';
import { Phase, PhaseTypes } from '@/lib/yfdata/Phase';
import { Pool } from '@/lib/yfdata/Pool';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

// ─── Phase dialog ─────────────────────────────────────────────────────────────

interface PhaseDialogState {
  open: boolean;
  phase: Phase | null; // null = new phase
  name: string;
  type: PhaseTypes;
  firstRound: number;
  lastRound: number;
}

const emptyPhaseDialog = (defaults: Partial<PhaseDialogState> = {}): PhaseDialogState => ({
  open: false,
  phase: null,
  name: '',
  type: PhaseTypes.Prelim,
  firstRound: 1,
  lastRound: 5,
  ...defaults,
});

// ─── Pool dialog ──────────────────────────────────────────────────────────────

interface PoolDialogState {
  open: boolean;
  phase: Phase | null;
  pool: Pool | null; // null = new pool
  name: string;
  size: number;
}

const emptyPoolDialog = (): PoolDialogState => ({
  open: false,
  phase: null,
  pool: null,
  name: '',
  size: 4,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const [phaseDialog, setPhaseDialog] = useState<PhaseDialogState>(emptyPhaseDialog);
  const [poolDialog, setPoolDialog] = useState<PoolDialogState>(emptyPoolDialog);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<Phase | null>(null);

  const phases = tournament.phases;

  // ── Phase CRUD ──────────────────────────────────────────────────────────────

  const openNewPhase = () => {
    const lastRound = tournament.getLastFullPhase()?.lastRoundNumber() ?? 0;
    setPhaseDialog(emptyPhaseDialog({
      open: true,
      name: phases.length === 0 ? 'Prelims' : 'Playoffs',
      type: phases.length === 0 ? PhaseTypes.Prelim : PhaseTypes.Playoff,
      firstRound: lastRound + 1,
      lastRound: lastRound + 5,
    }));
  };

  const openEditPhase = (phase: Phase) => {
    setPhaseDialog({
      open: true,
      phase,
      name: phase.name,
      type: phase.phaseType,
      firstRound: phase.firstRoundNumber(),
      lastRound: phase.lastRoundNumber(),
    });
  };

  const savePhase = () => {
    const { phase, name, type, firstRound, lastRound } = phaseDialog;
    if (!name.trim() || firstRound < 1 || lastRound < firstRound) return;

    update((t) => {
      if (phase) {
        // Edit existing
        phase.name = name.trim();
        phase.setRoundRange(firstRound, lastRound);
      } else {
        // New phase: use addBlankPhase then configure
        const code = (t.phases.filter((p) => p.phaseType !== PhaseTypes.Tiebreaker).length + 1).toString();
        const newPhase = new Phase(type, firstRound, lastRound, code, name.trim());
        newPhase.addBlankPool();
        // Insert before finals phases
        let insertIdx = t.phases.length;
        while (insertIdx > 0 && t.phases[insertIdx - 1].phaseType === PhaseTypes.Finals) {
          insertIdx--;
        }
        t.phases.splice(insertIdx, 0, newPhase);
      }
    });
    setPhaseDialog(emptyPhaseDialog());
  };

  const deletePhase = (phase: Phase) => {
    update((t) => t.deletePhase(phase));
    setDeletePhaseTarget(null);
  };

  // ── Pool CRUD ───────────────────────────────────────────────────────────────

  const openNewPool = (phase: Phase) => {
    setPoolDialog({ open: true, phase, pool: null, name: 'New Pool', size: 4 });
  };

  const openEditPool = (phase: Phase, pool: Pool) => {
    setPoolDialog({ open: true, phase, pool, name: pool.name, size: pool.size });
  };

  const savePool = () => {
    const { phase, pool, name, size } = poolDialog;
    if (!phase || !name.trim() || size < 2) return;

    update(() => {
      if (pool) {
        pool.name = name.trim();
        pool.size = size;
      } else {
        phase.addBlankPool();
        const newPool = phase.pools[phase.pools.length - 1];
        newPool.name = name.trim();
        newPool.size = size;
      }
    });
    setPoolDialog(emptyPoolDialog());
  };

  const deletePool = (phase: Phase, pool: Pool) => {
    update(() => phase.deletePool(pool));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const phaseTypeLabel: Record<PhaseTypes, string> = {
    [PhaseTypes.Prelim]: 'Prelim',
    [PhaseTypes.Playoff]: 'Playoff',
    [PhaseTypes.Finals]: 'Finals',
    [PhaseTypes.Tiebreaker]: 'Tiebreaker',
  };
  const phaseTypeColor: Record<PhaseTypes, 'primary' | 'secondary' | 'warning' | 'default'> = {
    [PhaseTypes.Prelim]: 'primary',
    [PhaseTypes.Playoff]: 'secondary',
    [PhaseTypes.Finals]: 'warning',
    [PhaseTypes.Tiebreaker]: 'default',
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h6" fontWeight={600}>Phases &amp; Pools</Typography>
        {canEdit && (
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openNewPhase}>
            Add Phase
          </Button>
        )}
      </Box>

      {phases.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography color="text.secondary" mb={2}>No phases yet.</Typography>
          {canEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewPhase}>
              Add First Phase
            </Button>
          )}
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {phases.map((phase) => (
            <Card key={phase.name}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Chip
                  label={phaseTypeLabel[phase.phaseType]}
                  size="small"
                  color={phaseTypeColor[phase.phaseType]}
                  variant="outlined"
                />
                <Typography fontWeight={600} flex={1}>{phase.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Round{phase.rounds.length > 1 ? 's' : ''}{' '}
                  {phase.rounds.length > 1
                    ? `${phase.firstRoundNumber()}–${phase.lastRoundNumber()}`
                    : phase.firstRoundNumber()}
                </Typography>
                {canEdit && (
                  <>
                    <Tooltip title="Edit phase">
                      <IconButton size="small" onClick={() => openEditPhase(phase)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete phase">
                      <IconButton size="small" color="error" onClick={() => setDeletePhaseTarget(phase)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>

              {phase.isFullPhase() && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Pools</Typography>
                    {canEdit && (
                      <Button size="small" startIcon={<AddIcon />} onClick={() => openNewPool(phase)}>
                        Add Pool
                      </Button>
                    )}
                  </Box>
                  {phase.pools.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ ml: 1 }}>No pools</Typography>
                  ) : (
                    <List dense disablePadding>
                      {phase.pools.map((pool) => (
                        <ListItem key={pool.name} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText
                            primary={pool.name}
                            secondary={`Size: ${pool.size} teams`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                          {canEdit && (
                            <ListItemSecondaryAction>
                              <Tooltip title="Edit pool">
                                <IconButton size="small" onClick={() => openEditPool(phase, pool)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete pool">
                                <IconButton size="small" color="error" onClick={() => deletePool(phase, pool)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Phase dialog ── */}
      <Dialog open={phaseDialog.open} onClose={() => setPhaseDialog(emptyPhaseDialog())} maxWidth="xs" fullWidth>
        <DialogTitle>{phaseDialog.phase ? 'Edit Phase' : 'Add Phase'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Phase Name"
              value={phaseDialog.name}
              onChange={(e) => setPhaseDialog((d) => ({ ...d, name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Phase Type</InputLabel>
              <Select
                value={phaseDialog.type}
                label="Phase Type"
                onChange={(e) => setPhaseDialog((d) => ({ ...d, type: e.target.value as PhaseTypes }))}
                disabled={!!phaseDialog.phase}
              >
                <MenuItem value={PhaseTypes.Prelim}>Prelim</MenuItem>
                <MenuItem value={PhaseTypes.Playoff}>Playoff</MenuItem>
                <MenuItem value={PhaseTypes.Finals}>Finals</MenuItem>
                <MenuItem value={PhaseTypes.Tiebreaker}>Tiebreaker</MenuItem>
              </Select>
            </FormControl>
            <Box display="flex" gap={1}>
              <TextField
                label="First Round"
                type="number"
                value={phaseDialog.firstRound}
                onChange={(e) => setPhaseDialog((d) => ({ ...d, firstRound: parseInt(e.target.value, 10) || 1 }))}
                fullWidth
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Last Round"
                type="number"
                value={phaseDialog.lastRound}
                onChange={(e) => setPhaseDialog((d) => ({ ...d, lastRound: parseInt(e.target.value, 10) || 1 }))}
                fullWidth
                slotProps={{ htmlInput: { min: phaseDialog.firstRound } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhaseDialog(emptyPhaseDialog())}>Cancel</Button>
          <Button
            variant="contained"
            onClick={savePhase}
            disabled={!phaseDialog.name.trim() || phaseDialog.lastRound < phaseDialog.firstRound}
          >
            {phaseDialog.phase ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Pool dialog ── */}
      <Dialog open={poolDialog.open} onClose={() => setPoolDialog(emptyPoolDialog())} maxWidth="xs" fullWidth>
        <DialogTitle>{poolDialog.pool ? 'Edit Pool' : 'Add Pool'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Pool Name"
              value={poolDialog.name}
              onChange={(e) => setPoolDialog((d) => ({ ...d, name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="Pool Size (# of teams)"
              type="number"
              value={poolDialog.size}
              onChange={(e) => setPoolDialog((d) => ({ ...d, size: parseInt(e.target.value, 10) || 4 }))}
              fullWidth
              slotProps={{ htmlInput: { min: 2 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoolDialog(emptyPoolDialog())}>Cancel</Button>
          <Button
            variant="contained"
            onClick={savePool}
            disabled={!poolDialog.name.trim() || poolDialog.size < 2}
          >
            {poolDialog.pool ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete phase confirm ── */}
      <Dialog open={!!deletePhaseTarget} onClose={() => setDeletePhaseTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Phase?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Deleting <strong>{deletePhaseTarget?.name}</strong> will remove all its pools and matches.
            This cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePhaseTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deletePhaseTarget && deletePhase(deletePhaseTarget)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
