
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickFactForm from '../QuickFactForm';
import * as geminiService from '../../services/geminiService';

// Mock the geminiService
vi.mock('../../services/geminiService', () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe('QuickFactForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    projectTitle: 'Test Project',
    artifacts: [],
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isSubmitting: false,
  };

  it('renders correctly', () => {
    render(<QuickFactForm {...defaultProps} />);
    expect(screen.getByLabelText(/Fact/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save fact/i })).toBeInTheDocument();
    // The button has an aria-label which overrides the visible text
    expect(screen.getByRole('button', { name: /Use a surprise prompt/i })).toBeInTheDocument();
  });

  it('shows loading state when submitting', () => {
    // Render with isSubmitting=true
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);

    // Expect "Saving..." text and disabled state
    const saveButton = screen.getByRole('button', { name: /Saving.../i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Expect Spinner (now has role="status")
    const spinner = within(saveButton).getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'loading');
  });

  it('shows loading state when generating surprise prompt', async () => {
    // Mock the service to return a delayed promise so we can catch the loading state
    interface Inspiration { fact: string; spark?: string }
    let resolvePromise: ((value: Inspiration) => void) | undefined;

    const promise = new Promise<Inspiration>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(geminiService.generateQuickFactInspiration).mockReturnValue(promise);

    render(<QuickFactForm {...defaultProps} />);

    // The button has an aria-label "Use a surprise prompt", which overrides the visible text "Surprise me"
    const surpriseButton = screen.getByRole('button', { name: /Use a surprise prompt/i });
    fireEvent.click(surpriseButton);

    // Expect "Summoning..." text to be visible
    expect(surpriseButton).toHaveTextContent(/Summoning…/i);

    // Expect Spinner
    const spinner = within(surpriseButton).getByRole('status');
    expect(spinner).toBeInTheDocument();

    // Resolve promise to clean up
    if (resolvePromise) {
        resolvePromise({ fact: 'Test Fact', spark: 'Test Spark' });
    }

    await waitFor(() => {
        expect(surpriseButton).toHaveTextContent(/Surprise me/i);
    });
  });
});
