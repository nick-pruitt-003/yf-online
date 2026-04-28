'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Box, Button, TextField, Typography, Card, CardContent, CircularProgress, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();

      const res = await fetch('/api/tournament/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContents: text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to import tournament');
      }

      const { id } = await res.json();
      router.push(`/tournament/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    } finally {
      // Reset the input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
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
        Create a new YellowFruit tournament or import an existing .yft file.
      </Typography>

      <Card><CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
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
              <NextLink href="/dashboard" style={{ textDecoration: 'none' }} onClick={(e) => { if (loading) e.preventDefault(); }}>
                <Button variant="text" disabled={loading}>Cancel</Button>
              </NextLink>
              <Button type="submit" variant="contained" disabled={loading || !name.trim()}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Tournament'}
              </Button>
            </Box>
          </Box>
        </form>

        <Divider sx={{ my: 3 }}>or</Divider>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept=".yft"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <Box textAlign="center">
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            Import .yft File
          </Button>
          <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
            Opens an existing YellowFruit tournament file
          </Typography>
        </Box>
      </CardContent></Card>
    </Box>
  );
}
