import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import QuickFactForm from '../QuickFactForm';
import { generateQuickFactInspiration } from '../../services/geminiService';

vi.mock('../../services/geminiService', () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe('QuickFactForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    expect(screen.getByLabelText(/Why it matters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save fact/i })).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when submitted', async () => {
    render(<QuickFactForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Fact/i), { target: { value: 'Something happened.' } });
    fireEvent.change(screen.getByLabelText(/Why it matters/i), { target: { value: 'It matters.' } });

    fireEvent.click(screen.getByRole('button', { name: /Save fact/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        fact: 'Something happened.',
        detail: 'It matters.',
      });
    });
  });

  it('displays validation error if fact is empty', async () => {
    render(<QuickFactForm {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Save fact/i }));

    await waitFor(() => {
      // Look for the error message text
      expect(screen.getByText(/Capture at least one sentence for your fact./i)).toBeInTheDocument();
    });

    const errorMsg = screen.getByText(/Capture at least one sentence for your fact./i);
    expect(errorMsg).toHaveAttribute('role', 'alert');
    expect(errorMsg).toHaveAttribute('id', 'quick-fact-error');

    const input = screen.getByLabelText(/Fact/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'quick-fact-error');

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles "Surprise me" functionality', async () => {
    (generateQuickFactInspiration as Mock).mockResolvedValue({
      fact: 'Generated fact',
      spark: 'Generated spark',
    });

    render(<QuickFactForm {...defaultProps} />);

    const surpriseButton = screen.getByRole('button', { name: /Use a surprise prompt/i });
    fireEvent.click(surpriseButton);

    expect(screen.getByText(/Summoning…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Generated fact')).toBeInTheDocument();
    });
  });

  it('shows loading state when isSubmitting is true', () => {
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);

    const button = screen.getByRole('button', { name: /Saving.../i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
