'use client';

import { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function TournamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Tournament page error:', error);
  }, [error]);

  return (
    <Box maxWidth={600} mx="auto" px={3} py={8} textAlign="center">
      <Typography variant="h6" color="error" gutterBottom>
        Failed to load tournament
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {error.message || 'An unexpected error occurred'}
        {error.digest && ` (digest: ${error.digest})`}
      </Typography>
      <Button onClick={reset} variant="outlined">Try again</Button>
    </Box>
  );
}
