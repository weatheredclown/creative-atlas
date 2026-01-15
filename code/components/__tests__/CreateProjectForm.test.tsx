
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CreateProjectForm from '../CreateProjectForm';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock gemini service
vi.mock('../../services/geminiService', () => ({
  generateProjectFromDescription: vi.fn(),
}));

// Mock Icons
vi.mock('../Icons', () => ({
  IntelligenceLogo: () => <span data-testid="intelligence-logo" />,
  Spinner: () => <span data-testid="spinner" />,
}));

describe('CreateProjectForm', () => {
  it('shows loading state when submitting', async () => {
    const user = userEvent.setup();
    // Create a promise we can control or just a timeout
    const handleCreate = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    const handleClose = vi.fn();

    render(<CreateProjectForm onCreate={handleCreate} onClose={handleClose} />);

    const titleInput = screen.getByLabelText(/Project Title/i);
    await user.type(titleInput, 'Test Project');

    const createButton = screen.getByRole('button', { name: /Create Project/i });
    expect(createButton).not.toBeDisabled();

    await user.click(createButton);

    // Check loading state immediately after click
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveTextContent(/Creating/i);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledTimes(1);
    });

    // After completion, isCreating should be false
    await waitFor(() => {
        expect(createButton).not.toBeDisabled();
        expect(createButton).toHaveTextContent(/Create Project/i);
    });
  });
});
