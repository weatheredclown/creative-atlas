
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateArtifactForm from '../CreateArtifactForm';
import { vi, describe, it, expect } from 'vitest';

describe('CreateArtifactForm', () => {
  it('displays validation error and accessible attributes when title is empty', () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();

    const { container } = render(<CreateArtifactForm onCreate={onCreate} onClose={onClose} />);

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');
    fireEvent.submit(form);

    const errorMessage = screen.getByText(/Title is required/i);
    expect(errorMessage).toBeInTheDocument();

    const input = screen.getByLabelText(/Title/i);

    // Check for accessibility attributes
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'artifact-title-error');

    expect(errorMessage).toHaveAttribute('id', 'artifact-title-error');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});
