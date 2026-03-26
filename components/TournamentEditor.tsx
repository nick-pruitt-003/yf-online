'use client';

import { useCallback, useState } from 'react';
import NextLink from 'next/link';
import {
  Box, AppBar, Toolbar, Typography, Tabs, Tab, Button,
  Chip, Snackbar, Alert, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import { useTournament } from '@/lib/yfweb/useTournament';
import GeneralTab from '@/components/editor/GeneralTab';
import TeamsTab from '@/components/editor/TeamsTab';
import RulesTab from '@/components/editor/RulesTab';
import StatsTab from '@/components/editor/StatsTab';

interface TournamentEditorProps {
  tournamentId: string;
  initialData: unknown;
  canEdit: boolean;
}

const TABS = ['General', 'Rules', 'Teams', 'Schedule', 'Games', 'Stats'] as const;
type TabName = typeof TABS[number];

export default function TournamentEditor({ tournamentId, initialData, canEdit }: TournamentEditorProps) {
  const handle = useTournament(initialData);
  const { tournament, dirty, clearDirty, serialize } = handle;

  const [tab, setTab] = useState<TabName>('General');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const save = useCallback(async () => {
    if (!canEdit || !dirty) return;
    setSaving(true);
    try {
      const data = serialize();
      const res = await fetch(`/api/tournament/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, name: tournament.name }),
      });
      if (!res.ok) throw new Error('Save failed');
      clearDirty();
      setToast({ msg: 'Saved', severity: 'success' });
    } catch {
      setToast({ msg: 'Failed to save', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [tournamentId, dirty, canEdit, serialize, clearDirty, tournament.name]);

  const exportYft = () => {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.name || 'tournament'}.yft`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Tooltip title="Back to dashboard">
            <IconButton component={NextLink} href="/dashboard" size="small" edge="start">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" fontWeight={700} flex={1} noWrap>
            {tournament.name || 'Untitled Tournament'}
          </Typography>

          {!canEdit && <Chip label="Read only" size="small" variant="outlined" />}
          {dirty && <Chip label="Unsaved" size="small" color="warning" variant="outlined" />}

          <Tooltip title="Export .yft file">
            <IconButton size="small" onClick={exportYft}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {canEdit && (
            <Button
              size="small"
              variant={dirty ? 'contained' : 'outlined'}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
              onClick={save}
              disabled={saving || !dirty}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </Toolbar>

        <Tabs
          value={tab}
          onChange={(_, v: TabName) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, px: 2, '& .MuiTab-root': { minHeight: 40, py: 0 } }}
        >
          {TABS.map((t) => <Tab key={t} label={t} value={t} />)}
        </Tabs>
      </AppBar>

      <Box flex={1} px={3} py={3} maxWidth={1100} mx="auto" width="100%">
        {tab === 'General'  && <GeneralTab handle={handle} canEdit={canEdit} />}
        {tab === 'Rules'    && <RulesTab handle={handle} canEdit={canEdit} />}
        {tab === 'Teams'    && <TeamsTab handle={handle} canEdit={canEdit} />}
        {tab === 'Schedule' && <ComingSoon name="Schedule" note="Phase and pool management coming next." />}
        {tab === 'Games'    && <ComingSoon name="Games" note="Match score entry coming next." />}
        {tab === 'Stats'    && <StatsTab handle={handle} />}
      </Box>

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

function ComingSoon({ name, note }: { name: string; note?: string }) {
  return (
    <Box textAlign="center" py={10}>
      <Typography variant="h6" color="text.secondary" gutterBottom>{name} — coming soon</Typography>
      {note && <Typography variant="body2" color="text.disabled">{note}</Typography>}
    </Box>
  );
}
