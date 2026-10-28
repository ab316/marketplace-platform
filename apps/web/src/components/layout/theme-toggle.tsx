'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '../ui/button.tsx';

/**
 * Light/dark switch.
 *
 * The server cannot know the resolved theme, so the icon is only rendered after mount; showing
 * one before then produces a visible flip on hydration. The button itself renders immediately so
 * the header does not shift.
 */
export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Switch theme'}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" aria-hidden="true" />
        ) : (
          <Moon className="size-4" aria-hidden="true" />
        )
      ) : (
        <span className="size-4" />
      )}
    </Button>
  );
};
