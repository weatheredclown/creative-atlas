import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import QuickFactForm from '../QuickFactForm';

// Mock geminiService
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

  it('displays accessible validation error when submitting empty fact', () => {
    render(<QuickFactForm {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save fact/i });
    fireEvent.click(saveButton);

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent(/capture at least one sentence/i);
    expect(errorMessage).toHaveAttribute('id', 'quick-fact-error');

    const input = screen.getByLabelText(/^fact/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'quick-fact-error');
  });
});
