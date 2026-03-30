'use client';

import { useMemo } from 'react';
import NextLink from 'next/link';
import { Box, Paper, Typography, Chip } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Props {
  id: string;
  name: string;
  updatedAt: string;
  sharedBy?: string;
}

export default function TournamentCard({ id, name, updatedAt, sharedBy }: Props) {
  const date = useMemo(() => new Date(updatedAt), [updatedAt]);
  return (
    <Paper
      component={NextLink}
      href={`/tournament/${id}`}
      elevation={0}
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 2,
        mb: 1.5,
        textDecoration: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
      }}
    >
      <EmojiEventsIcon color="primary" />
      <Box flex={1}>
        <Typography fontWeight={600}>{name}</Typography>
        <Typography variant="caption" color="text.secondary">
          Last edited {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          {sharedBy ? ` · shared by ${sharedBy}` : ''}
        </Typography>
      </Box>
      {sharedBy && <Chip label="Shared" size="small" variant="outlined" />}
    </Paper>
  );
}
