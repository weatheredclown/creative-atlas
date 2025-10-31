import { test, expect } from '@playwright/test';

test.describe('Creative Atlas smoke test', () => {
  test('loads the dashboard shell', async ({ page }) => {
    await page.goto('/?guest=1');

  // The tutorial modal opens by default, so we close it first.
  await page.getByRole('button', { name: 'Close modal' }).click();

  // Now, verify the main dashboard elements are visible.
    await expect(page.getByRole('heading', { name: 'Creative Atlas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Seed' })).toBeVisible();
    await expect(page.getByText('Daily Quests')).toBeVisible();
  });
});
