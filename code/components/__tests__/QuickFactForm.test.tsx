import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickFactForm from '../QuickFactForm';
import { generateQuickFactInspiration } from '../../services/geminiService';

vi.mock('../../services/geminiService', () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe('QuickFactForm', () => {
  const defaultProps = {
    projectTitle: 'Test Project',
    artifacts: [],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it('renders form elements correctly', () => {
    render(<QuickFactForm {...defaultProps} />);
    // Use getAllByLabelText because there might be multiple elements matching "Fact" (e.g. placeholder or something else?)
    // Actually getByLabelText should be specific enough if labels are correct.
    // The label is "Fact", input id is "quick-fact".
    expect(screen.getByLabelText(/^Fact$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Why it matters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save fact/i })).toBeInTheDocument();
  });

  it('displays validation error when fact is empty', () => {
    render(<QuickFactForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Save fact/i }));
    expect(screen.getByText(/Capture at least one sentence/i)).toBeInTheDocument();
  });

  it('applies accessible error attributes', () => {
    render(<QuickFactForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Save fact/i }));

    const input = screen.getByLabelText(/^Fact$/i);
    const errorMsg = screen.getByText(/Capture at least one sentence/i);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(errorMsg).toHaveAttribute('role', 'alert');
  });

  it('shows loading state when submitting', () => {
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });

  it('shows loading state when generating prompt', async () => {
    // Mock implementation to hang so we can check loading state
    (generateQuickFactInspiration as any).mockImplementation(() => new Promise(() => {}));
    render(<QuickFactForm {...defaultProps} />);

    // The button has aria-label="Use a surprise prompt" which overrides the text content
    fireEvent.click(screen.getByRole('button', { name: /Use a surprise prompt/i }));

    expect(screen.getByRole('button', { name: /Summoning/i })).toBeInTheDocument();
  });
});
