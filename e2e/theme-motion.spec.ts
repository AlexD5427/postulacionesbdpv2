import { test, expect } from '@playwright/test';

test.describe('Tema y movimiento', () => {
  test('permite cambiar entre claro y oscuro', async ({ page }) => {
    await page.goto('/');
    // Open the accessibility center and switch to dark.
    await page.getByRole('button', { name: /Abrir centro de accesibilidad/i }).click();
    await page.getByRole('radio', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('radio', { name: 'Claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('permite activar movimiento reducido', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir centro de accesibilidad/i }).click();
    await page.getByLabel(/Reducir movimiento/i).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  });

  test('permite aumentar el tamaño del texto', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir centro de accesibilidad/i }).click();
    await page.getByRole('button', { name: /Aumentar tamaño del texto/i }).click();
    const scale = await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--a11y-font-scale'));
    expect(Number(scale)).toBeGreaterThan(1);
  });
});
