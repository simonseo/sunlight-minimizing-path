import { expect, test } from '@playwright/test';

test('shows the research route comparison with live-condition controls', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /walk cooler/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /fastest/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /cooler/i })).toBeVisible();
  await expect(page.getByText('Live Santa Monica conditions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  await page.getByLabel('Departure time').fill('09:00');
  await expect(page.getByText('Sun bearing')).toBeVisible();
});

test('keeps core controls usable at mobile width', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('From')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'To' })).toBeVisible();
  await expect(page.getByLabel('Departure time')).toBeVisible();
});
