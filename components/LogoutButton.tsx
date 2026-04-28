'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from '@/lib/auth/client';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<LogoutIcon />}
      onClick={handleLogout}
    >
      Log out
    </Button>
  );
}
