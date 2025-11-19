import { test, expect } from '@playwright/test';

test.describe('Creative Atlas smoke test', () => {
  test('loads the dashboard shell', async ({ page }) => {
    await page.goto('/?guest=1');
    await expect(page.getByRole('heading', { name: 'Creative Atlas', level: 1 })).toBeVisible();

    const newProjectButton = page.locator('#create-new-project-button');
    if (!(await newProjectButton.isVisible())) {
      const backToAtlasButton = page.getByRole('button', { name: 'Back to Atlas' });
      if (await backToAtlasButton.isVisible()) {
        await backToAtlasButton.click();
      }
    }

    await newProjectButton.click({ force: true });
    await page.getByRole('button', { name: /Select project/i }).first().click({ force: true });

    await page.getByLabel('Open profile drawer').click();
    const profileDrawer = page.getByRole('dialog', { name: 'Profile drawer' });
    await expect(profileDrawer.getByText('Daily Quests')).toBeVisible();
  });
});
