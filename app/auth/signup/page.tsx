'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Box, Button, TextField, Typography, Link, Alert, CircularProgress, Paper,
} from '@mui/material';
import { signUp } from '@/lib/auth/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const { error: err } = await signUp.email({ name: trimmedName, email: trimmedEmail, password });
    if (err) {
      setError(err.message ?? 'Could not create account.');
      setLoading(false);
    } else {
      setLoading(false);
      router.push('/dashboard');
    }
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Paper elevation={2} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Create an account
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Free for the quiz bowl community.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            autoComplete="name"
          />
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
            inputProps={{ minLength: 8 }}
            autoComplete="new-password"
          />
          <TextField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
          </Button>
        </Box>

        <Typography variant="body2" mt={3} textAlign="center">
          Already have an account?{' '}
          <Link component={NextLink} href="/auth/login">Sign in</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
