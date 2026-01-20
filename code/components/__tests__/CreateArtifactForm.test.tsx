
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateArtifactForm from '../CreateArtifactForm';

describe('CreateArtifactForm', () => {
  it('shows loading state during submission', async () => {
    const onCreate = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const onClose = vi.fn();

    render(
      <CreateArtifactForm
        onCreate={onCreate}
        onClose={onClose}
      />
    );

    // Fill in the required title
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'New Artifact' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Artifact/i });
    fireEvent.click(submitButton);

    // Verify loading state
    expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Wait for the mock promise to resolve
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'New Artifact',
        type: expect.any(String), // Default type
        summary: '',
        sourceArtifactId: null
      });
    });

    // After resolution, the loading state should be gone and onClose should be called
    await waitFor(() => {
      expect(screen.queryByText(/Creating.../i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Artifact/i })).toBeEnabled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
