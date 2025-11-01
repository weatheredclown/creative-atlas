import React, { createContext, useContext, useMemo, useState } from 'react';

interface DepthPreferencesContextValue {
  showDetailedFields: boolean;
  toggleDetailedFields: () => void;
  setShowDetailedFields: (value: boolean) => void;
}

const DepthPreferencesContext = createContext<DepthPreferencesContextValue | undefined>(undefined);

interface DepthPreferencesProviderProps {
  children: React.ReactNode;
}

export const DepthPreferencesProvider: React.FC<DepthPreferencesProviderProps> = ({ children }) => {
  const [showDetailedFields, setShowDetailedFields] = useState(false);

  const value = useMemo<DepthPreferencesContextValue>(() => ({
    showDetailedFields,
    toggleDetailedFields: () => setShowDetailedFields((previous) => !previous),
    setShowDetailedFields,
  }), [showDetailedFields]);

  return <DepthPreferencesContext.Provider value={value}>{children}</DepthPreferencesContext.Provider>;
};

export const useDepthPreferences = (): DepthPreferencesContextValue => {
  const context = useContext(DepthPreferencesContext);
  if (!context) {
    throw new Error('useDepthPreferences must be used within a DepthPreferencesProvider');
  }
  return context;
};

