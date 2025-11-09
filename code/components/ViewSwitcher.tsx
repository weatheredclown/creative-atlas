import React from 'react';

import { ShareIcon, TableCellsIcon, ViewColumnsIcon } from './Icons';

type ViewMode = 'table' | 'graph' | 'kanban';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}

const VIEW_OPTIONS: Array<{ mode: ViewMode; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = [
  { mode: 'table', label: 'Table', Icon: TableCellsIcon },
  { mode: 'graph', label: 'Graph', Icon: ShareIcon },
  { mode: 'kanban', label: 'Kanban', Icon: ViewColumnsIcon },
];

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onChange }) => (
  <div className="flex items-center gap-1 rounded-lg bg-slate-700/50 p-1">
    {VIEW_OPTIONS.map(({ mode, label, Icon }) => {
      const isActive = viewMode === mode;
      return (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
            isActive ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      );
    })}
  </div>
);

export default ViewSwitcher;
