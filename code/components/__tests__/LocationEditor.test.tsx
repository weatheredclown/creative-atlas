
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LocationEditor from '../LocationEditor';
import { Artifact, ArtifactType } from '../../types';
import { DepthPreferencesProvider, useDepthPreferences } from '../../contexts/DepthPreferencesContext';

// Helper component to toggle depth
const DepthToggler = () => {
    const { toggleDetailedFields } = useDepthPreferences();
    return <button onClick={toggleDetailedFields}>Toggle Depth</button>;
};

describe('LocationEditor', () => {
  const mockArtifact: Artifact = {
    id: 'art-1',
    projectId: 'proj-1',
    ownerId: 'user-1',
    type: ArtifactType.Location,
    title: 'Test Location',
    summary: 'A test location',
    status: 'draft',
    tags: [],
    relations: [],
    data: {
      description: 'A dark and stormy place',
      features: [
        {
          id: 'feat-1',
          name: 'Spooky Tree',
          description: 'A very old tree',
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOnUpdate = vi.fn();
  const mockProjectArtifacts: Artifact[] = [];
  const mockOnAddRelation = vi.fn();
  const mockOnRemoveRelation = vi.fn();

  it('renders accessible delete button for features when depth is enabled', async () => {
    render(
      <DepthPreferencesProvider>
        <DepthToggler />
        <LocationEditor
            artifact={mockArtifact}
            onUpdateArtifactData={mockOnUpdate}
            projectArtifacts={mockProjectArtifacts}
            onAddRelation={mockOnAddRelation}
            onRemoveRelation={mockOnRemoveRelation}
        />
      </DepthPreferencesProvider>
    );

    // Initial state: details hidden
    expect(screen.queryByLabelText('Delete feature')).not.toBeInTheDocument();

    // Toggle depth on
    fireEvent.click(screen.getByText('Toggle Depth'));

    // Verify delete button has aria-label and title
    const deleteBtn = screen.getByLabelText('Delete feature');
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveAttribute('title', 'Delete feature');
  });
});
