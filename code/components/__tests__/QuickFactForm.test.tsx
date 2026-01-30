import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import QuickFactForm from '../QuickFactForm';

// Mock geminiService to avoid network calls
vi.mock('../../services/geminiService', () => ({
  generateQuickFactInspiration: vi.fn(),
}));

describe('QuickFactForm Accessibility', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    projectTitle: 'Test Project',
    artifacts: [],
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isSubmitting: false,
  };

  it('displays validation error with accessible attributes when submitting empty fact', () => {
    render(<QuickFactForm {...defaultProps} />);

    const submitButton = screen.getByText('Save fact');
    fireEvent.click(submitButton);

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Capture at least one sentence for your fact.');
    expect(errorMessage).toHaveAttribute('id', 'quick-fact-error');

    const input = screen.getByLabelText('Fact');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'quick-fact-error');
  });

  it('does not display validation attributes initially', () => {
    render(<QuickFactForm {...defaultProps} />);

    const input = screen.getByLabelText('Fact');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).not.toHaveAttribute('aria-describedby');

    const errorMessage = screen.queryByRole('alert');
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('clears validation error when user types', () => {
    render(<QuickFactForm {...defaultProps} />);

    const submitButton = screen.getByText('Save fact');
    fireEvent.click(submitButton);

    const input = screen.getByLabelText('Fact');
    fireEvent.change(input, { target: { value: 'Something' } });

    expect(input).toHaveAttribute('aria-invalid', 'false');

    const errorMessage = screen.queryByRole('alert');
    expect(errorMessage).not.toBeInTheDocument();
  });
});
