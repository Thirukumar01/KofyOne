'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'kofyone-theme';

// Client-side subscription for localStorage theme
function subscribeToTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getStoredThemeSnapshot(): Theme {
  try {
    const item = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (item === 'light' || item === 'dark' || item === 'system') {
      return item;
    }
  } catch {
    // Ignore storage errors
  }
  return 'system';
}

function getServerThemeSnapshot(): Theme {
  return 'system';
}

// Client-side subscription for system dark mode preference
function subscribeToSystemTheme(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemThemeSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerSystemThemeSnapshot(): boolean {
  return true; // default dark on server
}

// Mounted store to safely avoid hydration mismatch without synchronous setState in effect
function subscribeToMounted() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getServerMountedSnapshot() {
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useSyncExternalStore(
    subscribeToTheme,
    getStoredThemeSnapshot,
    getServerThemeSnapshot
  );

  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const currentTheme: Theme = activeTheme ?? storedTheme;

  const isSystemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemThemeSnapshot
  );

  const [, startTransition] = useTransition();

  const resolvedTheme: ResolvedTheme =
    currentTheme === 'system' ? (isSystemDark ? 'dark' : 'light') : currentTheme;

  // Apply DOM attributes in effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    startTransition(() => {
      setActiveTheme(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Ignore storage errors
      }
    });
  };

  const toggleTheme = () => {
    const nextTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme: currentTheme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

/**
 * 1-Click Header / Navbar Theme Toggle Button
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToMounted,
    getMountedSnapshot,
    getServerMountedSnapshot
  );

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted
          ? isDark
            ? 'Switch to Light Theme'
            : 'Switch to Dark Theme'
          : 'Toggle theme'
      }
      title={
        mounted
          ? isDark
            ? 'Switch to Light Mode'
            : 'Switch to Dark Mode'
          : 'Toggle theme'
      }
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0DCDD] bg-white text-[#292526] shadow-xs transition-colors hover:bg-[#FCECEB] hover:text-[#292526] focus-visible:outline-2 focus-visible:outline-[#B94A50] dark:border-[#2E2C30] dark:bg-[#1E1E22] dark:text-[#F6F5F3] dark:hover:bg-[#252429] dark:hover:text-[#F6F5F3]',
        className
      )}
    >
      <span className="sr-only">Toggle theme</span>
      {/* Sun icon: visible in dark mode to switch to light */}
      <Sun
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          mounted && isDark ? 'rotate-0 scale-100 text-amber-400' : 'hidden'
        )}
      />
      {/* Moon icon: visible in light mode to switch to dark */}
      <Moon
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          mounted && !isDark ? 'rotate-0 scale-100 text-zinc-700' : 'hidden'
        )}
      />
      {/* Fallback before mounting */}
      {!mounted && <Sun className="h-4 w-4 text-zinc-400" />}
    </button>
  );
}

/**
 * Visual Theme Selector Cards for Settings Page
 */
export function ThemeSelectorCards() {
  const { theme, setTheme } = useTheme();

  const options: { id: Theme; label: string; desc: string; icon: typeof Sun }[] = [
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Sleek dark canvas with glowing accents, ideal for low-light environments.',
      icon: Moon,
    },
    {
      id: 'light',
      label: 'Light (White) Mode',
      desc: 'Crisp, high-contrast white & slate palette for daytime focus.',
      icon: Sun,
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically aligns with your operating system color scheme.',
      icon: Laptop,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border text-left transition-all',
              isSelected
                ? 'border-[#B94A50] bg-[#FCECEB] dark:bg-[rgba(217,140,145,0.15)] shadow-xs ring-1 ring-[#B94A50] dark:ring-[#D98C91]'
                : 'border-[#F0DCDD] dark:border-[#2E2C30] hover:border-[#B94A50]/50 dark:hover:border-[#D98C91]/50 bg-white dark:bg-[#1E1E22]'
            )}
          >
            <div className="flex w-full items-center justify-between mb-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  isSelected
                    ? 'bg-[#B94A50] text-white dark:text-[#F6F5F3]'
                    : 'bg-[#FCECEB] dark:bg-[#252429] text-[#777171] dark:text-[#A8A2A2]'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {isSelected && (
                <span className="text-[11px] font-semibold text-[#B94A50] dark:text-[#D98C91]">
                  Active
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {opt.label}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
