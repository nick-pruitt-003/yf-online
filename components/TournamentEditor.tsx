'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import {
  Box, AppBar, Toolbar, Typography, Tabs, Tab, Button,
  Chip, Snackbar, Alert, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Checkbox, List, ListItem,
  ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShareIcon from '@mui/icons-material/Share';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTournament } from '@/lib/yfweb/useTournament';
import GeneralTab from '@/components/editor/GeneralTab';
import TeamsTab from '@/components/editor/TeamsTab';
import RulesTab from '@/components/editor/RulesTab';
import StatsTab from '@/components/editor/StatsTab';
import ScheduleTab from '@/components/editor/ScheduleTab';
import GamesTab from '@/components/editor/GamesTab';

interface TournamentEditorProps {
  tournamentId: string;
  initialData: unknown;
  canEdit: boolean;
  isOwner: boolean;
}

const TABS = ['General', 'Rules', 'Teams', 'Schedule', 'Games', 'Stats'] as const;
type TabName = typeof TABS[number];

// ─── Share types ──────────────────────────────────────────────────────────────

interface ShareEntry {
  id: string;
  userId: string;
  canEdit: boolean;
  user: { id: string; name: string; email: string };
}

interface Snapshot {
  id: string;
  createdAt: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function TournamentEditor({ tournamentId, initialData, canEdit, isOwner }: TournamentEditorProps) {
  const handle = useTournament(initialData);
  const { tournament, dirty, clearDirty, serialize } = handle;

  const [tab, setTab] = useState<TabName>('General');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  // ── Sharing dialog ──────────────────────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareCanEdit, setShareCanEdit] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  // ── History dialog ──────────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);

  const openShareDialog = async () => {
    setShareOpen(true);
    setShareError('');
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/shares`);
      if (res.ok) setShares(await res.json());
    } catch {
      // ignore; list just stays empty
    }
  };

  const addShare = async () => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail.trim(), canEdit: shareCanEdit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to share');
      setShares((prev) => {
        const exists = prev.findIndex((s) => s.userId === data.userId);
        if (exists !== -1) {
          const next = [...prev];
          next[exists] = data;
          return next;
        }
        return [...prev, data];
      });
      setShareEmail('');
      setShareCanEdit(false);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setShareLoading(false);
    }
  };

  const removeShare = async (userId: string) => {
    try {
      await fetch(`/api/tournament/${tournamentId}/shares?userId=${userId}`, { method: 'DELETE' });
      setShares((prev) => prev.filter((s) => s.userId !== userId));
    } catch {
      // ignore
    }
  };

  const openHistoryDialog = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/snapshots`);
      if (res.ok) setSnapshots(await res.json());
    } catch {
      // ignore
    }
  };

  const restoreSnapshot = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: restoreTarget.id }),
      });
      if (!res.ok) throw new Error('Restore failed');
      // Reload the page so the restored data is loaded fresh.
      window.location.reload();
    } catch {
      setToast({ msg: 'Failed to restore version', severity: 'error' });
      setRestoring(false);
      setRestoreTarget(null);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    if (!canEdit || !dirty) return;
    setSaveStatus('saving');
    try {
      const data = serialize();
      const res = await fetch(`/api/tournament/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, name: tournament.name }),
      });
      if (!res.ok) throw new Error('Save failed');
      clearDirty();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
      setToast({ msg: 'Autosave failed', severity: 'error' });
    }
  }, [tournamentId, dirty, canEdit, serialize, clearDirty, tournament.name]);

  // ── Autosave: 2 s debounce after each change ────────────────────────────────

  const versionRef = useRef(handle.version);
  useEffect(() => {
    if (!canEdit || !dirty) return;
    versionRef.current = handle.version;
    const timeout = setTimeout(() => {
      if (versionRef.current === handle.version) save();
    }, 2000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line @eslint-react/exhaustive-deps -- handle.version is the change signal
  }, [handle.version, canEdit, dirty, save]);

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportYft = () => {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.name || 'tournament'}.yft`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [exporting, setExporting] = useState(false);

  const exportReports = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/reports`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to export reports');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tournament.name || 'tournament'}_reports.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Export failed', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // ── Save status label ──────────────────────────────────────────────────────

  const statusLabel = (() => {
    if (saveStatus === 'saving') return 'Saving…';
    if (saveStatus === 'saved' && !dirty) return 'Saved';
    if (dirty) return 'Unsaved';
    return null;
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Tooltip title="Back to dashboard">
            <IconButton component={NextLink} href="/dashboard" size="small" edge="start" color="inherit">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" fontWeight={700} flex={1} noWrap>
            {tournament.name || 'Untitled Tournament'}
          </Typography>

          {!canEdit && <Chip label="Read only" size="small" variant="outlined" />}

          {statusLabel && (
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {saveStatus === 'saving' && <CircularProgress size={10} color="inherit" />}
              {statusLabel}
            </Typography>
          )}

          <Tooltip title="Export .yft file">
            <IconButton size="small" onClick={exportYft} color="inherit">
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export HTML stat reports (ZIP)">
            <span>
              <IconButton size="small" onClick={exportReports} color="inherit" disabled={exporting}>
                {exporting ? <CircularProgress size={16} color="inherit" /> : <AssessmentIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          {canEdit && (
            <Tooltip title="Version history">
              <IconButton size="small" onClick={openHistoryDialog} color="inherit">
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {isOwner && (
            <Tooltip title="Share tournament">
              <IconButton size="small" onClick={openShareDialog} color="inherit">
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>

        <Tabs
          value={tab}
          onChange={(_, v: TabName) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
          sx={{ minHeight: 40, px: 2, '& .MuiTab-root': { minHeight: 40, py: 0 } }}
        >
          {TABS.map((t) => <Tab key={t} label={t} value={t} />)}
        </Tabs>
      </AppBar>

      <Box flex={1} px={3} py={3} maxWidth={1100} mx="auto" width="100%">
        {tab === 'General'  && <GeneralTab handle={handle} canEdit={canEdit} />}
        {tab === 'Rules'    && <RulesTab handle={handle} canEdit={canEdit} />}
        {tab === 'Teams'    && <TeamsTab handle={handle} canEdit={canEdit} />}
        {tab === 'Schedule' && <ScheduleTab handle={handle} canEdit={canEdit} />}
        {tab === 'Games'    && <GamesTab handle={handle} canEdit={canEdit} />}
        {tab === 'Stats'    && <StatsTab handle={handle} />}
      </Box>

      {/* ── Share dialog ── */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Tournament</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {shares.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Not shared with anyone yet.</Typography>
            ) : (
              <List dense disablePadding>
                {shares.map((s) => (
                  <ListItem key={s.userId} disablePadding>
                    <ListItemText
                      primary={s.user.name}
                      secondary={`${s.user.email}${s.canEdit ? ' · can edit' : ' · view only'}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" color="error" onClick={() => removeShare(s.userId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Box display="flex" gap={1} alignItems="flex-end" flexWrap="wrap">
              <TextField
                label="Email address"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                onKeyDown={(e) => { if (e.key === 'Enter') addShare(); }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shareCanEdit}
                    onChange={(e) => setShareCanEdit(e.target.checked)}
                    size="small"
                  />
                }
                label="Can edit"
                sx={{ mr: 0 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={addShare}
                disabled={shareLoading || !shareEmail.trim()}
              >
                {shareLoading ? <CircularProgress size={16} color="inherit" /> : 'Share'}
              </Button>
            </Box>

            {shareError && <Alert severity="error">{shareError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── History dialog ── */}
      <Dialog open={historyOpen} onClose={() => { setHistoryOpen(false); setRestoreTarget(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Version History</DialogTitle>
        <DialogContent>
          {snapshots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No saved versions yet. Versions are captured automatically as you edit.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ mt: 1 }}>
              {snapshots.map((snap) => (
                <ListItem key={snap.id} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={new Date(snap.createdAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Restore this version">
                      <IconButton size="small" onClick={() => setRestoreTarget(snap)}>
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHistoryOpen(false); setRestoreTarget(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Restore confirm dialog ── */}
      <Dialog open={!!restoreTarget} onClose={() => setRestoreTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Restore this version?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Your current state will be saved as a version before restoring, so you can undo if needed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={restoreSnapshot} disabled={restoring}>
            {restoring ? <CircularProgress size={16} color="inherit" /> : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {toast && (
        <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
