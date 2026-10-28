import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, icon, children, className = '', actions }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-ink-500/40 bg-ink-700/60 p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-teal-300">{icon}</span>}
            {title && (
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
