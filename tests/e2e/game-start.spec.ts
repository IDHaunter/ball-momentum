import { expect, test } from '@playwright/test';

test('loads the game and starts the tutorial level', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'BALL MOMENTUM' })).toBeVisible();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByText('First Momentum')).toBeVisible();
});
