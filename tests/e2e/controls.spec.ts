import { expect, test } from '@playwright/test';

test('pause and resume are available from the HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeHidden();
});
