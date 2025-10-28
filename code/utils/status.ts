export const STATUS_STYLE_MAP: Record<string, string> = {
  idea: 'bg-slate-800/60 text-slate-200 border border-slate-600/60',
  draft: 'bg-sky-900/40 text-sky-200 border border-sky-600/50',
  'in-progress': 'bg-amber-900/40 text-amber-100 border border-amber-600/50',
  todo: 'bg-slate-800/70 text-slate-200 border border-slate-600/60',
  alpha: 'bg-purple-900/40 text-purple-100 border border-purple-600/50',
  beta: 'bg-indigo-900/40 text-indigo-100 border border-indigo-600/50',
  released: 'bg-emerald-900/40 text-emerald-100 border border-emerald-600/50',
  done: 'bg-emerald-900/40 text-emerald-100 border border-emerald-600/50',
  active: 'bg-emerald-900/40 text-emerald-100 border border-emerald-600/50',
  paused: 'bg-amber-900/40 text-amber-100 border border-amber-600/50',
  archived: 'bg-slate-900/60 text-slate-300 border border-slate-700/60',
  shipped: 'bg-sky-900/40 text-sky-100 border border-sky-600/50',
};

export const getStatusClasses = (status: string): string => {
  const key = status.toLowerCase();
  return STATUS_STYLE_MAP[key] ?? 'bg-slate-800/60 text-slate-200 border border-slate-600/60';
};

export const formatStatusLabel = (status: string): string =>
  status
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
