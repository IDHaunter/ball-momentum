import { expect, test } from '@playwright/test';

test('settings are accessible from the main menu and return to it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeHidden();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'BALL MOMENTUM' })).toBeVisible();
});

test('settings opened during a level return to the pause menu without leaving the level', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden();
  await page.getByRole('button', { name: 'Back' }).click();

  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByText('First Momentum')).toBeVisible();
});

test('returning to the main menu requires confirmation and can be cancelled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();

  await expect(page.getByRole('dialog', { name: 'Leave this level?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Restart' })).toBeHidden();
  await page.getByRole('button', { name: 'Stay in game' }).click();
  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeVisible();

  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('button', { name: 'Leave level' }).click();
  await expect(page.getByRole('heading', { name: 'BALL MOMENTUM' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Take a breather' })).toBeHidden();
});
