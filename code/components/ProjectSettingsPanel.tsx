import React, { useMemo } from 'react';
import { PROJECT_COMPONENT_KEYS, type ProjectComponentKey, type ProjectVisibilitySettings } from '../types';
import {
  DEFAULT_PROJECT_VISIBILITY,
  getProjectComponentGroups,
} from '../utils/projectVisibility';

interface ProjectSettingsPanelProps {
  settings: ProjectVisibilitySettings;
  onToggle: (component: ProjectComponentKey, isVisible: boolean) => void;
  onReset: () => void;
}

const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({ settings, onToggle, onReset }) => {
  const componentGroups = useMemo(() => getProjectComponentGroups(), []);
  const isDefaultConfiguration = useMemo(
    () => PROJECT_COMPONENT_KEYS.every((key) => settings[key] === DEFAULT_PROJECT_VISIBILITY[key]),
    [settings],
  );

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 space-y-6 shadow-lg shadow-slate-950/20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-slate-100">Project surface settings</h3>
          <p className="text-sm text-slate-400">
            Choose which modules stay visible for this project. Changes are saved instantly and only affect the current atlas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isDefaultConfiguration) {
              onReset();
            }
          }}
          disabled={isDefaultConfiguration}
          className="inline-flex items-center gap-2 self-start rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition-colors hover:border-cyan-400/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset to defaults
        </button>
      </header>

      <div className="space-y-6">
        {componentGroups.map((group) => (
          <div key={group.key} className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{group.title}</p>
              <p className="text-xs text-slate-500">{group.description}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {group.items.map((item) => {
                const isEnabled = settings[item.key];
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-950/70 p-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => onToggle(item.key, !isEnabled)}
                      className={`relative inline-flex h-6 w-12 flex-shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                        isEnabled
                          ? 'border-cyan-400/60 bg-cyan-500/30'
                          : 'border-slate-700/60 bg-slate-800/80'
                      }`}
                    >
                      <span className="sr-only">Toggle {item.label}</span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProjectSettingsPanel;
