import { render, screen } from '@testing-library/react';
import React from 'react';
import CharacterEditor from '../CharacterEditor';
import { ArtifactType, CharacterData, Artifact } from '../../types';
import { describe, it, expect, vi } from 'vitest';

// Mock the context hook
vi.mock('../../contexts/DepthPreferencesContext', () => ({
  useDepthPreferences: () => ({
    showDetailedFields: true,
    toggleDetailedFields: vi.fn(),
  }),
  DepthPreferencesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockArtifact: Artifact = {
  id: 'test-char',
  title: 'Test Character',
  type: ArtifactType.Character,
  summary: 'A test character',
  tags: [],
  relations: [],
  status: 'draft',
  projectId: 'test-project',
  ownerId: 'test-user',
  data: {
    bio: 'Test bio',
    traits: [],
  } as CharacterData,
};

describe('CharacterEditor Accessibility', () => {
  it('has accessible labels for trait input fields', () => {
    render(
      <CharacterEditor
        artifact={mockArtifact}
        onUpdateArtifactData={vi.fn()}
        projectArtifacts={[]}
        onAddRelation={vi.fn()}
        onRemoveRelation={vi.fn()}
      />
    );

    // Check for Trait Name input
    const traitNameInput = screen.getByPlaceholderText('Trait (e.g., Age)');
    expect(traitNameInput).toHaveAttribute('aria-label', 'Trait name');

    // Check for Trait Value input
    const traitValueInput = screen.getByPlaceholderText('Value (e.g., 27)');
    expect(traitValueInput).toHaveAttribute('aria-label', 'Trait value');
  });

  it('has accessible label for relation search input', () => {
    render(
      <CharacterEditor
        artifact={mockArtifact}
        onUpdateArtifactData={vi.fn()}
        projectArtifacts={[]}
        onAddRelation={vi.fn()}
        onRemoveRelation={vi.fn()}
      />
    );

    // Check for Search inputs in Sidebar (there are multiple)
    const searchInputs = screen.getAllByPlaceholderText('Search by title or type');
    expect(searchInputs.length).toBeGreaterThan(0);

    // Check that each has a descriptive aria-label
    searchInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-label', expect.stringMatching(/Search candidates for/));
    });
  });
});
