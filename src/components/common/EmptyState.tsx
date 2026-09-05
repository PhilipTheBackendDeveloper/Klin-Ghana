import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

/**
 * Shared empty-state block used across list/board/chart panels so every
 * "nothing here yet" moment in the app looks and reads the same way.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center ${
      compact ? 'p-5' : 'p-10'
    } ${className}`}
  >
    <div className={`flex items-center justify-center rounded-2xl bg-white text-slate-400 shadow-xs ring-1 ring-slate-100 ${compact ? 'h-9 w-9 mb-2.5' : 'h-12 w-12 mb-3.5'}`}>
      <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.8} />
    </div>
    <div className={`font-bold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</div>
    {description && (
      <p className={`mt-1 max-w-sm text-slate-500 ${compact ? 'text-[11px]' : 'text-xs'}`}>{description}</p>
    )}
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
      >
        {action.label}
      </button>
    )}
  </div>
);
