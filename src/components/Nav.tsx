import {
  Home,
  Mic,
  Activity,
  BellRing,
  SlidersHorizontal,
  History,
  ShieldCheck,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';
import type { ScreenId } from '@/types';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'permission', label: 'Setup', icon: Mic },
  { id: 'listening', label: 'Listening', icon: Activity },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  { id: 'history', label: 'History', icon: History },
  { id: 'test', label: 'Test Clip', icon: FlaskConical },
  { id: 'diagnostics', label: 'Privacy & Offline', icon: ShieldCheck },
];

interface NavProps {
  current: ScreenId;
  onNavigate: (id: ScreenId) => void;
  unreadAlert?: boolean;
}

export function Nav({ current, onNavigate, unreadAlert }: NavProps) {
  return (
    <>
      {/* Skip link for keyboard users */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Top bar (all sizes) */}
      <header className="sticky top-0 z-30 border-b border-ink-500/40 bg-ink-800/80 backdrop-blur supports-[backdrop-filter]:bg-ink-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-teal-300 rounded-lg"
            aria-label="SunoSuraksha home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400 text-ink-900">
              <BellRing className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-50">
              Suno<span className="text-teal-300">Suraksha</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
                    active
                      ? 'bg-teal-400/15 text-teal-200'
                      : 'text-slate-300 hover:bg-ink-600/60 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary mobile"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-500/40 bg-ink-800/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl items-stretch justify-between px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <li key={item.id} className="flex-1">
                <button
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={`relative flex w-full flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${
                    active ? 'text-teal-300' : 'text-slate-400'
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {item.id === 'listening' && unreadAlert && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    )}
                  </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
