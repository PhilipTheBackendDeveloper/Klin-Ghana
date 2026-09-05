import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared admin page header: title + subtitle + right-aligned actions,
 * inside the same rounded white card every screen already used ad hoc.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs ${className}`}>
    <div>
      <h2 className="font-['Outfit',sans-serif] text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
