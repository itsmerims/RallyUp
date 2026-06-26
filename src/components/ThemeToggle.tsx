import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsLight(true);
      document.documentElement.classList.add('theme-light');
    }
  }, []);

  const toggleTheme = () => {
    setIsLight((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('theme-light');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        localStorage.setItem('theme', 'dark');
      }
      return next;
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
      title="Toggle Theme"
    >
      {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}
