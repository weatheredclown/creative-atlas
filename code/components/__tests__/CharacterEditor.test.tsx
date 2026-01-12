import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterEditor from '../CharacterEditor';
import { Artifact, ArtifactType, CharacterData } from '../../types';
import { DepthPreferencesProvider } from '../../contexts/DepthPreferencesContext';
import RevealDepthToggle from '../RevealDepthToggle';
import { TutorialLanguageProvider } from '../../contexts/TutorialLanguageContext';

// Helper component to reveal depth in tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <TutorialLanguageProvider>
      <DepthPreferencesProvider>
        <RevealDepthToggle />
        {children}
      </DepthPreferencesProvider>
    </TutorialLanguageProvider>
  );
};

describe('CharacterEditor', () => {
  const mockArtifact: Artifact = {
    id: 'char-1',
    title: 'Test Character',
    type: ArtifactType.Character,
    summary: 'A test character',
    content: '',
    tags: [],
    relations: [],
    data: {
      bio: 'Bio',
      traits: [
        { id: 't1', key: 'Strength', value: 'High' }
      ]
    } as CharacterData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockUpdate = vi.fn();
  const mockAddRelation = vi.fn();
  const mockRemoveRelation = vi.fn();

  it('renders trait delete button with accessibility labels when depth is revealed', () => {
    render(
      <TestWrapper>
        <CharacterEditor
          artifact={mockArtifact}
          onUpdateArtifactData={mockUpdate}
          projectArtifacts={[]}
          onAddRelation={mockAddRelation}
          onRemoveRelation={mockRemoveRelation}
        />
      </TestWrapper>
    );

    // Reveal detailed fields
    const toggleButton = screen.getByRole('button', { name: /reveal advanced fields/i });
    fireEvent.click(toggleButton);

    const deleteButton = screen.getByRole('button', { name: 'Remove trait Strength' });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveAttribute('title', 'Remove trait Strength');
  });

  it('renders add trait inputs with accessibility labels when depth is revealed', () => {
    render(
      <TestWrapper>
        <CharacterEditor
          artifact={mockArtifact}
          onUpdateArtifactData={mockUpdate}
          projectArtifacts={[]}
          onAddRelation={mockAddRelation}
          onRemoveRelation={mockRemoveRelation}
        />
      </TestWrapper>
    );

    // Reveal detailed fields
    const toggleButton = screen.getByRole('button', { name: /reveal advanced fields/i });
    fireEvent.click(toggleButton);

    const keyInput = screen.getByLabelText('New trait key');
    const valueInput = screen.getByLabelText('New trait value');

    expect(keyInput).toBeInTheDocument();
    expect(valueInput).toBeInTheDocument();
  });
});
