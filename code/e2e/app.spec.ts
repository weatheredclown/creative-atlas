import { test, expect } from '@playwright/test';

test.describe('Creative Atlas smoke test', () => {
  test('loads the dashboard shell', async ({ page }) => {
    await page.goto('/?guest=1');
    await expect(page.getByRole('heading', { name: 'Creative Atlas', level: 1 })).toBeVisible();

    const newProjectButton = page.locator('#create-new-project-button');

    // If a project is already selected (e.g. due to workspace URL persistence) the sidebar will show
    // the "Back to Atlas" button instead of the project creation control. Exit back to the project
    // list so the tutorial can continue clicking the "New Project" button.
    if (!(await newProjectButton.isVisible())) {
      const backToAtlasButton = page.getByRole('button', { name: 'Back to Atlas' });
      if (await backToAtlasButton.isVisible()) {
        await backToAtlasButton.click({ force: true });
      }
      await expect(newProjectButton).toBeVisible();
    }

    // The tutorial will be pointing at the "New Project" button, so we need to click it to advance.
    await newProjectButton.click({ force: true });

    // Select the first available project so the workspace shell renders.
    const firstProjectCard = page.getByRole('button', { name: /Select project/i }).first();
    await firstProjectCard.click();

    await expect(page.locator('#add-new-artifact-button')).toBeVisible();

    const profileDrawerButton = page.getByRole('button', { name: 'Open profile drawer' });
    await profileDrawerButton.click();

    const profileDrawer = page.getByRole('dialog', { name: 'Profile drawer' });
    await expect(profileDrawer).toBeVisible();
    await expect(profileDrawer.getByText('Daily Quests')).toBeVisible();
  });
});
