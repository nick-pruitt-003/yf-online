'use client';

import { Box, Typography, TextField, Checkbox, FormControlLabel, Divider, Paper } from '@mui/material';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

export default function GeneralTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const t = tournament;

  const field = (label: string, value: string, onChange: (v: string) => void, type = 'text') => (
    <TextField
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      fullWidth
      size="small"
      slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
      disabled={!canEdit}
    />
  );

  const check = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <FormControlLabel
      label={label}
      control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={!canEdit} size="small" />}
    />
  );

  return (
    <Box display="flex" flexDirection="column" gap={3} maxWidth={700}>
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Tournament Info
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          {field('Tournament Name', t.name, (v) => update((tr) => { tr.name = v; }))}
          {field('Site / Venue', t.tournamentSite?.name ?? '', (v) => update((tr) => {
            if (tr.tournamentSite) tr.tournamentSite.name = v;
          }))}
          <Box display="flex" gap={2}>
            {field('Start Date', t.startDate ?? '', (v) => update((tr) => { tr.startDate = v; }), 'date')}
            {field('End Date', t.endDate ?? '', (v) => update((tr) => { tr.endDate = v; }), 'date')}
          </Box>
          {field('Question Set', t.questionSet ?? '', (v) => update((tr) => { tr.questionSet = v; }))}
        </Box>
      </Paper>

      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Player Tracking
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0}>
          {check('Track player year / grade', t.trackPlayerYear, (v) => update((tr) => { tr.trackPlayerYear = v; }))}
          {check('Track small school', t.trackSmallSchool, (v) => update((tr) => { tr.trackSmallSchool = v; }))}
          {check('Track JV', t.trackJV, (v) => update((tr) => { tr.trackJV = v; }))}
          {check('Track undergraduate', t.trackUG, (v) => update((tr) => { tr.trackUG = v; }))}
          {check('Track Division II', t.trackDiv2, (v) => update((tr) => { tr.trackDiv2 = v; }))}
        </Box>
      </Paper>

      {t.phases.length > 0 && (
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Packet Names
          </Typography>
          <Box display="flex" flexDirection="column" gap={1.5}>
            {t.phases.flatMap((ph) =>
              ph.rounds.map((r) => (
                <Box key={r.number} display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    {ph.name} R{r.number}
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={`Packet ${r.number}`}
                    value={r.packet?.name ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => update((tr) => {
                      const phase = tr.phases.find((p) => p === ph);
                      const round = phase?.rounds.find((rd) => rd.number === r.number);
                      if (round?.packet) round.packet.name = e.target.value;
                    })}
                  />
                </Box>
              ))
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
