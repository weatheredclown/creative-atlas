import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TemplateGallery from '../TemplateGallery';
import { ArtifactType, TemplateCategory } from '../../types';

const categories: TemplateCategory[] = [
  {
    id: 'test',
    title: 'Test Kits',
    description: 'Sample templates for testing.',
    recommendedFor: ['Aurora'],
    templates: [
      {
        id: 'kit-a',
        name: 'Kit A',
        description: 'Hydrates a wiki entry.',
        tags: ['wiki'],
        hydrate: {
          artifacts: [
            {
              key: 'seed',
              type: ArtifactType.Wiki,
              title: 'Aurora Overview',
              summary: 'Summary',
            },
          ],
        },
      },
      {
        id: 'kit-b',
        name: 'Kit B',
        description: 'Hydrates two entries.',
        hydrate: {
          artifacts: [
            {
              key: 'one',
              type: ArtifactType.Scene,
              title: 'Scene A',
              summary: 'A',
            },
            {
              key: 'two',
              type: ArtifactType.Task,
              title: 'Task A',
              summary: 'B',
            },
          ],
        },
      },
    ],
  },
];

describe('TemplateGallery', () => {
  it('calls apply callback when a template is selected', async () => {
    const user = userEvent.setup();
    const onApplyTemplate = vi.fn();

    render(
      <TemplateGallery
        categories={categories}
        activeProjectTitle="Aurora"
        onApplyTemplate={onApplyTemplate}
      />,
    );

    const button = screen.getByRole('button', { name: /Add 1 seed/i });
    await user.click(button);

    expect(onApplyTemplate).toHaveBeenCalledWith(categories[0].templates[0]);
  });

  it('shows loading state when a template is being applied', () => {
    const { rerender } = render(
      <TemplateGallery
        categories={categories}
        activeProjectTitle="Aurora"
        onApplyTemplate={vi.fn()}
      />,
    );

    rerender(
      <TemplateGallery
        categories={categories}
        activeProjectTitle="Aurora"
        onApplyTemplate={vi.fn()}
        applyingTemplateId="kit-b"
      />,
    );

    expect(screen.getByRole('button', { name: /Adding kit/i })).toBeInTheDocument();
  });

  it('renders status messages when provided', () => {
    render(
      <TemplateGallery
        categories={categories}
        activeProjectTitle="Aurora"
        statusMessage="Added starter artifacts!"
      />,
    );

    expect(screen.getByText(/Added starter artifacts!/i)).toBeInTheDocument();
  });
});
