'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Box, Button, TextField, Typography, Link, Alert, CircularProgress, Paper,
} from '@mui/material';
import { signIn } from '@/lib/auth/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signIn.email({ email, password });
      if (err) {
        setError(err.message ?? 'Invalid email or password.');
      } else {
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Paper elevation={2} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Sign in to YellowFruit
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Track your quiz bowl tournaments online.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
          </Button>
        </Box>

        <Typography variant="body2" mt={3} textAlign="center">
          Don&apos;t have an account?{' '}
          <Link component={NextLink} href="/auth/signup">Create one</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
