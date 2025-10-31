import { test, expect } from '@playwright/test';

test.describe('Creative Atlas smoke test', () => {
  test('loads the dashboard shell', async ({ page }) => {
    await page.goto('/?guest=1');
    await expect(page.getByRole('heading', { name: 'Creative Atlas', level: 1 })).toBeVisible();

    // The tutorial will be pointing at the "New Project" button, so we need to click it to advance.
    await page.locator('#create-new-project-button').click();

    await expect(page.getByRole('button', { name: 'New Seed' })).toBeVisible();
    await expect(page.getByText('Daily Quests')).toBeVisible();
  });
});
