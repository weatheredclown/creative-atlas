
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateArtifactForm from '../CreateArtifactForm';

describe('CreateArtifactForm', () => {
  const mockOnCreate = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onCreate: mockOnCreate,
    onClose: mockOnClose,
    sourceArtifactId: null,
    defaultType: null,
  };

  it('renders correctly', () => {
    render(<CreateArtifactForm {...defaultProps} />);
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Artifact Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeInTheDocument();
  });

  it('calls onCreate with correct data when submitted', async () => {
    render(<CreateArtifactForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Artifact' } });
    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: 'A summary' } });

    // Use fireEvent.submit directly on the form or click the button
    fireEvent.click(screen.getByRole('button', { name: /Create Artifact/i }));

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledWith({
        title: 'New Artifact',
        type: expect.any(String), // Default type
        summary: 'A summary',
        sourceArtifactId: null,
      });
    });
  });

  it('shows loading state during async creation', async () => {
    let resolvePromise: (value: void) => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnCreate.mockReturnValue(promise);

    render(<CreateArtifactForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Async Artifact' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Artifact/i }));

    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();

    // Finish the promise
    resolvePromise!();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Creating.../i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeEnabled();
    });
  });

  it('does not close the modal if creation fails', async () => {
     mockOnCreate.mockRejectedValue(new Error('Failed'));

     render(<CreateArtifactForm {...defaultProps} />);

     fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Fail Artifact' } });
     fireEvent.click(screen.getByRole('button', { name: /Create Artifact/i }));

     await waitFor(() => {
       expect(mockOnCreate).toHaveBeenCalled();
     });

     // Should still be "Creating..." briefly then back to normal, but NOT closed
     // Since mockOnCreate rejected, the component catches it and sets isCreating false.
     // It does NOT call onClose.

     await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeEnabled();
     });

     expect(mockOnClose).not.toHaveBeenCalled();
  });
});
