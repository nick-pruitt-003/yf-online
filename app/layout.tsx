import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import ThemeRegistry from '@/components/ThemeRegistry';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'YellowFruit Online',
  description: 'Quiz bowl tournament statkeeping for the community',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <ThemeRegistry>
          {children}
          <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.75rem', color: '#888', borderTop: '1px solid #eee', marginTop: 'auto' }}>
            YellowFruit Online — based on{' '}
            <a href="https://github.com/ANadig/YellowFruit" style={{ color: 'inherit' }}>YellowFruit</a>
            {' '}by Andrew Nadig.{' '}
            <a href="https://github.com/nick-pruitt-003/yf-online" style={{ color: 'inherit' }}>Source code</a>
            {' '}(AGPL 3.0).
          </footer>
        </ThemeRegistry>
      </body>
    </html>
  );
}
