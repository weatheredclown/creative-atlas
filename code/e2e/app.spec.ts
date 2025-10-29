import { test, expect } from '@playwright/test';

test.describe('Creative Atlas smoke test', () => {
  test('loads the dashboard shell', async ({ page }) => {
    await page.goto('/?guest=1');
    await expect(page.getByRole('heading', { name: 'Creative Atlas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Seed' })).toBeVisible();
    await expect(page.getByText('Daily Quests')).toBeVisible();
  });
});
