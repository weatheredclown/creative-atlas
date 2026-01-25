import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ArtifactListItem from '../ArtifactListItem';
import { ArtifactType } from '../../types';
import type { Artifact } from '../../types';

describe('ArtifactListItem', () => {
  const mockArtifact: Artifact = {
    id: 'test-id',
    ownerId: 'owner-id',
    projectId: 'project-id',
    type: ArtifactType.Story,
    title: 'Test Artifact',
    summary: 'Test Summary',
    status: 'draft',
    tags: ['tag1'],
    relations: [],
    data: {},
  };

  const mockProps = {
    artifact: mockArtifact,
    onSelect: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onOpenCreateQuickFact: vi.fn(),
    onOpenCreateArtifact: vi.fn(),
    quickFactPreview: [],
    totalQuickFacts: 0,
    isSelected: false,
  };

  it('shows loading state during duplication', async () => {
    let resolveDuplicate: ((value: void | PromiseLike<void>) => void) | undefined;
    const onDuplicatePromise = new Promise<void>((resolve) => {
      resolveDuplicate = resolve;
    });

    const onDuplicateMock = vi.fn().mockReturnValue(onDuplicatePromise);

    render(<ArtifactListItem {...mockProps} onDuplicate={onDuplicateMock} />);

    const duplicateButton = screen.getByText('Duplicate');
    fireEvent.click(duplicateButton);

    // Check if loading state is shown
    expect(screen.getByText('Duplicating...')).toBeInTheDocument();
    // The button might have multiple text nodes or children, so getByRole is safer for disabled check
    // Use exact string to avoid matching the container div which has role="button" and contains the text
    const button = screen.getByRole('button', { name: 'Duplicating...' });
    expect(button).toBeDisabled();

    // Resolve the promise
    resolveDuplicate!();

    // Check if loading state is removed
    await waitFor(() => {
      expect(screen.getByText('Duplicate')).toBeInTheDocument();
    });

    // Use exact string to ensure we select the button and not the container
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled();
  });
});
