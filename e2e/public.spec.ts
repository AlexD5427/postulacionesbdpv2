import { test, expect } from '@playwright/test';

/**
 * Public browsing flows + the critical product-rule guardrails.
 * Runs in mock mode (see playwright.config.ts). Requires `npm run test:e2e:install`.
 */
test.describe('Portal público', () => {
  test('la landing carga y enlaza a convocatorias', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: /Ver convocatorias/i }).first().click();
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('el directorio de convocatorias muestra tarjetas y permite abrir el detalle', async ({ page }) => {
    await page.goto('/jobs');
    const firstCard = page.getByRole('link', { name: /Ver posición/i }).first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/jobs\/BDP-/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('la página de convocatoria NO muestra afinidad, puntaje ni etapa interna del proceso', async ({ page }) => {
    await page.goto('/jobs/BDP-CRE-001');
    const body = (await page.textContent('body'))?.toLowerCase() ?? '';
    for (const forbidden of ['afinidad', 'match', 'compatibilidad', 'probabilidad de contrat', 'ranking', 'puntaje', 'fit score', 'etapa del proceso']) {
      expect(body).not.toContain(forbidden);
    }
  });

  test('la búsqueda filtra las convocatorias', async ({ page }) => {
    await page.goto('/jobs');
    await page.getByLabel('Buscar').fill('gerente');
    await expect(page.getByRole('heading', { name: /Gerente de Agencia/i })).toBeVisible();
  });
});
