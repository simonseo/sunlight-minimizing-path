import { expect, test } from '@playwright/test';

test('shows the research route comparison and allows changing conditions', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /walk cooler/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /fastest/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /cooler/i })).toBeVisible();
  await page.getByLabel('Weather scenario').selectOption('marine');
  await expect(page.getByText(/cloud-filtered direct sun/i)).toBeVisible();
});

test('keeps core controls usable at mobile width', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('From')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'To' })).toBeVisible();
  await expect(page.getByLabel('Departure time')).toBeVisible();
});
