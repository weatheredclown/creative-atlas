import { render, screen, fireEvent } from '@testing-library/react';
import QuickFactForm from '../QuickFactForm';
import { vi } from 'vitest';

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
    expect(screen.getByLabelText(/^Fact$/i)).toBeInTheDocument();
  });

  it('displays validation error with accessible attributes when submitting empty fact', () => {
    render(<QuickFactForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /Save fact/i });
    fireEvent.click(submitButton);

    const errorMessage = screen.getByText(/Capture at least one sentence/i);
    expect(errorMessage).toBeInTheDocument();

    // These assertions should fail before my changes
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(errorMessage).toHaveAttribute('id', 'quick-fact-error');

    const textarea = screen.getByLabelText(/^Fact$/i);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'quick-fact-error');
  });

  it('shows loading state when isSubmitting is true', () => {
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);

    // We expect the button to show "Saving..." and be disabled
    // This will fail if the text hasn't changed
    const submitButton = screen.getByRole('button', { name: /Saving/i });
    expect(submitButton).toBeDisabled();
  });
});
