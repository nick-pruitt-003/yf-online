'use client';

import { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Divider, DialogContentText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';
import { addTeamToTournament, deleteTeamFromTournament } from '@/lib/yfweb/useTournament';
import { Team } from '@/lib/yfdata/Team';
import { Player } from '@/lib/yfdata/Player';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

interface TeamDialogState {
  open: boolean;
  editTeam: Team | null;
  orgName: string;
  teamName: string;
  playersText: string; // one player per line
}

const emptyDialog = (): TeamDialogState => ({
  open: false,
  editTeam: null,
  orgName: '',
  teamName: '',
  playersText: '',
});

export default function TeamsTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const [dialog, setDialog] = useState<TeamDialogState>(emptyDialog);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);

  const allTeams = tournament.getListOfAllTeams();
  const totalTeams = allTeams.length;

  const openNew = () => setDialog({ open: true, editTeam: null, orgName: '', teamName: '', playersText: '' });

  const openEdit = (team: Team) => {
    const reg = tournament.registrations.find((r) => r.teams.includes(team));
    setDialog({
      open: true,
      editTeam: team,
      orgName: reg?.name ?? '',
      teamName: team.name,
      playersText: team.players.map((p) => p.name).join('\n'),
    });
  };

  const handleSave = () => {
    const { editTeam, orgName, teamName, playersText } = dialog;
    const players = playersText.split('\n').map((s) => s.trim()).filter(Boolean);

    if (!teamName.trim()) return;

    if (editTeam) {
      update((t) => {
        editTeam.name = teamName.trim();
        editTeam.players = players.map((name, idx) => {
          const byIndex = editTeam.players[idx];
          if (byIndex) { byIndex.name = name; return byIndex; }
          return new Player(name);
        });
        // Update org name if changed
        const reg = t.registrations.find((r) => r.teams.includes(editTeam));
        if (reg && orgName.trim()) reg.name = orgName.trim();
      });
    } else {
      update((t) => {
        addTeamToTournament(t, orgName.trim() || teamName.trim(), teamName.trim(), players);
      });
    }

    setDialog(emptyDialog());
  };

  const handleDelete = (team: Team) => {
    if (tournament.teamHasPlayedAnyMatch(team)) return;
    setConfirmDelete(team);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Teams</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalTeams} team{totalTeams !== 1 ? 's' : ''} registered
          </Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} size="small">
            Add Team
          </Button>
        )}
      </Box>

      {totalTeams === 0 ? (
        <Card sx={{ textAlign: 'center' }}>
          <Box p={4}>
            <Typography color="text.secondary">No teams yet. Add a team to get started.</Typography>
          </Box>
        </Card>
      ) : (
        tournament.registrations.map((reg) => (
          <Card key={reg.name} sx={{ mb: 2 }}>
            <Box px={2} py={1.5} display="flex" alignItems="center" gap={1} sx={{ bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>{reg.name}</Typography>
              <Chip label={`${reg.teams.length} team${reg.teams.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
            </Box>
            <List dense disablePadding>
              {reg.teams.map((team, i) => (
                <Box key={`${reg.name}-${team.name}`}>
                  {i > 0 && <Divider />}
                  <ListItem sx={{ py: 1 }}>
                    <ListItemText
                      primary={<Typography fontWeight={600}>{team.name}</Typography>}
                      secondary={
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.5} flexWrap="wrap">
                          <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {team.players.length > 0
                              ? team.players.map((p) => p.name).join(', ')
                              : 'No players'}
                          </Typography>
                        </Box>
                      }
                    />
                    {canEdit && (
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => openEdit(team)} sx={{ mr: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(team)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                </Box>
              ))}
            </List>
          </Card>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete team?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmDelete) update((t) => deleteTeamFromTournament(t, confirmDelete));
              setConfirmDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog(emptyDialog())} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.editTeam ? 'Edit Team' : 'Add Team'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Organization / School"
              value={dialog.orgName}
              onChange={(e) => setDialog((d) => ({ ...d, orgName: e.target.value }))}
              fullWidth
              size="small"
              helperText="e.g. Central High School — leave blank to use team name"
              autoFocus
            />
            <TextField
              label="Team Name"
              value={dialog.teamName}
              onChange={(e) => setDialog((d) => ({ ...d, teamName: e.target.value }))}
              fullWidth
              size="small"
              required
              helperText="e.g. Central A, Central B"
            />
            <TextField
              label="Players (one per line)"
              value={dialog.playersText}
              onChange={(e) => setDialog((d) => ({ ...d, playersText: e.target.value }))}
              fullWidth
              multiline
              minRows={4}
              size="small"
              placeholder={"Alice Smith\nBob Jones\nCarol Wu"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(emptyDialog())}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!dialog.teamName.trim()}>
            {dialog.editTeam ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
