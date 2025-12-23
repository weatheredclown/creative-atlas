import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimelineEditor from '../TimelineEditor';
import { Artifact, ArtifactType } from '../../types';

describe('TimelineEditor', () => {
  const mockArtifact: Artifact = {
    id: 'art-1',
    projectId: 'proj-1',
    ownerId: 'user-1',
    type: ArtifactType.Timeline,
    title: 'My Timeline',
    summary: 'A test timeline',
    status: 'draft',
    tags: [],
    relations: [],
    data: {
      events: [
        {
          id: 'ev-1',
          date: '2023-01-01',
          title: 'Event One',
          description: 'First event',
        },
      ],
    },
  };

  const mockOnUpdate = vi.fn();

  it('renders timeline events', () => {
    render(
      <TimelineEditor
        artifact={mockArtifact}
        onUpdateArtifactData={mockOnUpdate}
      />
    );

    expect(screen.getByText('Event One')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
  });

  it('has accessible buttons for edit and delete', () => {
    render(
      <TimelineEditor
        artifact={mockArtifact}
        onUpdateArtifactData={mockOnUpdate}
      />
    );

    // These should exist if the buttons have aria-labels
    const editButton = screen.getByLabelText('Edit event');
    const deleteButton = screen.getByLabelText('Delete event');

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
  });
});
