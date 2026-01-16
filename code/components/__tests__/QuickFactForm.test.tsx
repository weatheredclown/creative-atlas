import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickFactForm from '../QuickFactForm';

describe('QuickFactForm', () => {
  const defaultProps = {
    projectTitle: 'Test Project',
    artifacts: [],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it('renders with initial state', () => {
    render(<QuickFactForm {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save fact/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
    expect(screen.queryByText(/saving/i)).not.toBeInTheDocument();
  });

  it('displays loading state when submitting', () => {
    render(<QuickFactForm {...defaultProps} isSubmitting={true} />);

    const saveButton = screen.getByRole('button', { name: /saving fact/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    // Use a more specific query or check for the spinner if possible,
    // but text change is a good start.
  });
});
