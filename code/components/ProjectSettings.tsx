import React from 'react';
import { UserProfile } from '../types';

interface ProjectSettingsProps {
  profile: UserProfile;
  onUpdateProfile: (update: { settings: Partial<UserProfile['settings']> }) => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ profile, onUpdateProfile }) => {
  const { settings } = profile;

  const handleToggle = (key: keyof UserProfile['settings']['components']) => {
    onUpdateProfile({
      settings: {
        components: {
          ...settings.components,
          [key]: !settings.components[key],
        },
      },
    });
  };

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Project Settings</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-md font-semibold text-slate-400 mb-2">Component Visibility</h3>
          <div className="space-y-2">
            {Object.keys(settings.components).map((key) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.components[key as keyof UserProfile['settings']['components']]}
                  onChange={() => handleToggle(key as keyof UserProfile['settings']['components'])}
                  className="form-checkbox h-5 w-5 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500"
                />
                <span className="text-slate-300">{key.replace(/Visible$/, '')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
