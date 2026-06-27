import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

function applyTheme(isLight: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  if (isLight) {
    root.classList.add('theme-light');
    localStorage.setItem('theme', 'light');
  } else {
    root.classList.remove('theme-light');
    localStorage.setItem('theme', 'dark');
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('theme-transitioning');
    });
  });
}

function prefersLight(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const useLight = stored === 'light' || (stored !== 'dark' && prefersLight());
    if (useLight) {
      setIsLight(true);
      document.documentElement.classList.add('theme-light');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        if (e.matches) {
          setIsLight(true);
          document.documentElement.classList.add('theme-light');
        } else {
          setIsLight(false);
          document.documentElement.classList.remove('theme-light');
        }
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setIsLight((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden
        ${isLight
          ? 'bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100'
          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      style={{ transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease' }}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          transform: mounted ? (isLight ? 'rotate(0deg)' : 'rotate(90deg)') : 'rotate(0deg)',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {isLight ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
      </span>
    </button>
  );
}
