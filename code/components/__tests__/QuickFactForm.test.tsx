
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickFactForm from '../QuickFactForm';
import { Artifact, ArtifactType } from '../../types';

// Mock the geminiService
vi.mock('../../services/geminiService', () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe('QuickFactForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockArtifacts: Artifact[] = [
    {
      id: '1',
      title: 'Test Artifact',
      type: ArtifactType.Character,
      summary: 'A test character',
      tags: [],
      relations: [],
      projectId: 'p1',
      ownerId: 'u1',
    }
  ];

  it('renders correctly', () => {
    render(
      <QuickFactForm
        projectTitle="Test Project"
        artifacts={mockArtifacts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={false}
      />
    );
    expect(screen.getByLabelText(/Fact/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save fact/i })).toBeInTheDocument();
  });

  it('shows loading state when submitting', () => {
    render(
      <QuickFactForm
        projectTitle="Test Project"
        artifacts={mockArtifacts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    // This expectation is for the NEW behavior.
    const saveButton = screen.getByRole('button', { name: /Saving.../i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });
});
