import React, { createContext, useContext } from 'react';

import { type TutorialLanguage } from '../types';

const TutorialLanguageContext = createContext<TutorialLanguage>('en');

interface TutorialLanguageProviderProps {
  language: TutorialLanguage;
  children: React.ReactNode;
}

export const TutorialLanguageProvider: React.FC<TutorialLanguageProviderProps> = ({ language, children }) => (
  <TutorialLanguageContext.Provider value={language}>
    {children}
  </TutorialLanguageContext.Provider>
);

export const useTutorialLanguage = (): TutorialLanguage => useContext(TutorialLanguageContext);

export default TutorialLanguageContext;
