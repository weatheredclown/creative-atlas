import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateArtifactForm from '../CreateArtifactForm';

describe('CreateArtifactForm', () => {
  const mockOnCreate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <CreateArtifactForm
        onCreate={mockOnCreate}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    render(
      <CreateArtifactForm
        onCreate={mockOnCreate}
        onClose={mockOnClose}
      />
    );

    await user.type(screen.getByLabelText(/Title/i), 'New Artifact');
    await user.click(screen.getByRole('button', { name: /Create Artifact/i }));

    expect(mockOnCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Artifact',
    }));
  });

  it('shows loading state during async creation', async () => {
    const user = userEvent.setup();
    let resolveCreate: () => void = () => {};
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    mockOnCreate.mockReturnValue(createPromise);

    render(
      <CreateArtifactForm
        onCreate={mockOnCreate}
        onClose={mockOnClose}
      />
    );

    await user.type(screen.getByLabelText(/Title/i), 'Async Artifact');
    await user.click(screen.getByRole('button', { name: /Create Artifact/i }));

    expect(screen.getByRole('button', { name: /Creating.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();

    resolveCreate();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeEnabled();
    });
  });
});
