'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Box, Button, TextField, Typography, Paper, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), siteName: siteName.trim(), date }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create tournament');
      }

      const { id } = await res.json();
      router.push(`/tournament/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={560} mx="auto" px={3} py={5}>
      <NextLink href="/dashboard" style={{ textDecoration: 'none' }}>
        <Box display="flex" alignItems="center" gap={0.5} mb={4} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
          <ArrowBackIcon fontSize="small" />
          <Typography variant="body2">Back to dashboard</Typography>
        </Box>
      </NextLink>

      <Typography variant="h4" fontWeight={700} mb={1}>New Tournament</Typography>
      <Typography color="text.secondary" mb={4}>
        Create a new YellowFruit tournament. You can edit all settings later.
      </Typography>

      <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" flexDirection="column" gap={2.5}>
            <TextField
              label="Tournament Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
              placeholder="e.g. LIQBA Spring Invitational 2026"
            />
            <TextField
              label="Site / Venue"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              fullWidth
              placeholder="e.g. Central High School"
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {error && (
              <Typography color="error" variant="body2">{error}</Typography>
            )}

            <Box display="flex" justifyContent="flex-end" gap={1.5} mt={1}>
              <NextLink href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="text" disabled={loading}>Cancel</Button>
              </NextLink>
              <Button type="submit" variant="contained" disabled={loading || !name.trim()}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Tournament'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
