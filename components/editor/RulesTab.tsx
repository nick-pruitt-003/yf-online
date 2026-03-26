'use client';

import {
  Box, Typography, Paper, TextField, Switch, FormControlLabel,
  Alert, Chip, Divider,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import type { TournamentHandle } from '@/lib/yfweb/useTournament';

interface Props {
  handle: TournamentHandle;
  canEdit: boolean;
}

export default function RulesTab({ handle, canEdit }: Props) {
  const { tournament, update } = handle;
  const rules = tournament.scoringRules;
  const locked = tournament.hasMatchData;
  const editable = canEdit && !locked;

  if (!rules) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary">No scoring rules configured.</Typography>
      </Paper>
    );
  }

  const numField = (label: string, value: number, onChange: (v: number) => void, min?: number, max?: number) => (
    <TextField
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={!editable}
      size="small"
      slotProps={{ htmlInput: { min, max, style: { width: 80 } } }}
    />
  );

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <FormControlLabel
      label={label}
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={!editable} size="small" />}
    />
  );

  return (
    <Box display="flex" flexDirection="column" gap={3} maxWidth={700}>
      {locked && (
        <Alert icon={<LockIcon />} severity="warning">
          Scoring rules are locked because match data exists. Delete all matches to edit rules.
        </Alert>
      )}

      {/* Tossup answer types */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Tossup Answer Types
        </Typography>
        <Box display="flex" flexDirection="column" gap={1.5}>
          {rules.answerTypes.map((aType, i) => (
            <Box key={i} display="flex" alignItems="center" gap={2}>
              <Chip
                label={aType.value > 0 ? `+${aType.value}` : String(aType.value)}
                size="small"
                color={aType.value > 10 ? 'primary' : aType.value > 0 ? 'default' : 'error'}
                variant="outlined"
                sx={{ minWidth: 48, fontWeight: 700 }}
              />
              <Typography variant="body2" flex={1}>{aType.label ?? (aType.value > 0 ? 'Correct' : 'Neg')}</Typography>
              <TextField
                label="Points"
                type="number"
                size="small"
                value={aType.value}
                disabled={!editable}
                onChange={(e) => update((t) => {
                  if (t.scoringRules) t.scoringRules.answerTypes[i].value = Number(e.target.value);
                })}
                slotProps={{ htmlInput: { style: { width: 64 } } }}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Round length */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Round Length
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          {numField(
            'Tossups per round',
            rules.maximumRegulationTossupCount,
            (v) => update((t) => { if (t.scoringRules) t.scoringRules.maximumRegulationTossupCount = v; }),
            1, 100,
          )}
          {numField(
            'Max players per team',
            rules.maximumPlayersPerTeam,
            (v) => update((t) => { if (t.scoringRules) t.scoringRules.maximumPlayersPerTeam = v; }),
            1, 10,
          )}
        </Box>
      </Paper>

      {/* Bonus settings */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Bonus Settings
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          {toggle(
            'Use bonuses',
            rules.useBonuses,
            (v) => update((t) => { if (t.scoringRules) t.scoringRules.useBonuses = v; }),
          )}
          {rules.useBonuses && (
            <>
              <Divider />
              <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
                {numField(
                  'Bonus divisor (parts)',
                  rules.bonusDivisor,
                  (v) => update((t) => { if (t.scoringRules) t.scoringRules.bonusDivisor = v; }),
                  1, 10,
                )}
                {rules.pointsPerBonusPart !== undefined && numField(
                  'Points per part',
                  rules.pointsPerBonusPart,
                  (v) => update((t) => { if (t.scoringRules) t.scoringRules.pointsPerBonusPart = v; }),
                  0, 100,
                )}
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* Overtime */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Overtime
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap" alignItems="center">
          {numField(
            'Overtime tossups',
            rules.minimumOvertimeQuestionCount ?? 1,
            (v) => update((t) => { if (t.scoringRules) t.scoringRules.minimumOvertimeQuestionCount = v; }),
            1, 20,
          )}
          {toggle(
            'Overtime includes bonuses',
            rules.overtimeIncludesBonuses,
            (v) => update((t) => { if (t.scoringRules) t.scoringRules.overtimeIncludesBonuses = v; }),
          )}
        </Box>
      </Paper>
    </Box>
  );
}
