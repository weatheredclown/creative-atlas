
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateProjectForm from '../CreateProjectForm';
import { vi, describe, it, expect } from 'vitest';

// Mock the icons
vi.mock('../Icons', () => ({
  IntelligenceLogo: () => <span>IntelligenceLogo</span>,
  Spinner: () => <span>Spinner</span>,
}));

// Mock the service
vi.mock('../services/geminiService', () => ({
  generateProjectFromDescription: vi.fn(),
}));

describe('CreateProjectForm', () => {
  it('displays validation error and accessible attributes when title is empty', () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();

    const { container } = render(<CreateProjectForm onCreate={onCreate} onClose={onClose} />);

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');
    fireEvent.submit(form);

    const errorMessage = screen.getByText(/Title is required/i);
    expect(errorMessage).toBeInTheDocument();

    const input = screen.getByLabelText(/Project Title/i);

    // Check for accessibility attributes
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'project-title-error');

    expect(errorMessage).toHaveAttribute('id', 'project-title-error');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});
