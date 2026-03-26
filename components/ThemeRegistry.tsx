'use client';

import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    primary: { main: '#1a5276' },
    secondary: { main: '#f39c12' },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  },
});

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
