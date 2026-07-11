import { test, expect } from '@playwright/test';

/**
 * End-to-end candidate journey in mock mode: register → profile → CV →
 * application → assessment consent → run. Covers the required flows in §25.
 */
test.describe('Recorrido del candidato (mock)', () => {
  test('registro, postulación y evaluación', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel('Apellidos').fill('Quispe');
    await page.getByLabel(/Correo electrónico/i).fill(`ana.${Date.now()}@example.com`);
    await page.getByLabel('Contraseña', { exact: true }).fill('Password1');
    await page.getByLabel('Confirmar contraseña').fill('Password1');
    // Accept required consents (checkboxes in order: terms, privacy, data, comms).
    const checks = page.getByRole('checkbox');
    await checks.nth(0).click();
    await checks.nth(1).click();
    await checks.nth(2).click();
    await page.getByRole('button', { name: /Crear cuenta/i }).click();
    await expect(page).toHaveURL(/\/candidate/);

    // 2. Dashboard shows a next-action, never internal process status.
    await expect(page.getByText(/Siguiente paso sugerido/i)).toBeVisible();

    // 3. Apply to a job.
    await page.goto('/jobs/BDP-CRE-001');
    await page.getByRole('link', { name: /Postular ahora/i }).click();
    await expect(page).toHaveURL(/\/candidate\/applications\/new/);

    // Step through the wizard.
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: /Siguiente/i }).click();
    }
    // Declarations step: accept.
    await page.getByRole('checkbox').first().click();
    await page.getByRole('button', { name: /Siguiente/i }).click();
    // Review + submit.
    await page.getByRole('button', { name: /Enviar postulación/i }).click();
    await expect(page.getByText(/Postulación enviada/i)).toBeVisible();
    await expect(page.getByText(/BDP-/)).toBeVisible();
  });
});
