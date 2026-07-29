import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Screenshot capture for the visual review of the public assessment module.
 * Not part of the assertion suite: run explicitly with
 *   npx playwright test --project=chromium e2e/screenshots.public-assessments.ts
 */

const OUT = 'test-results/screens';

async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'bdp.ui.v1',
      JSON.stringify({ state: { dockPosition: 'bottom', tourSeen: true }, version: 0 }),
    );
    window.sessionStorage.setItem('bdp.intro.v1', '1');
  });
}

async function identify(page: Page) {
  await page.getByLabel(/nombre completo/i).fill('Ana Pérez Quispe');
  await page.getByLabel(/^Carnet de Identidad/).fill('1234567 LP');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /continuar/i }).click();
}

async function startAttempt(page: Page) {
  const checkboxes = page.getByRole('checkbox');
  for (let i = 0; i < (await checkboxes.count()); i += 1) await checkboxes.nth(i).check();
  await page.getByRole('button', { name: /comenzar evaluación/i }).click();
}

test('capturas del módulo público de evaluaciones', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await skipOnboarding(page);

  await page.goto('/');
  await page.getByRole('heading', { name: /¿recibiste un código de evaluación\?/i }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/01-landing-acceso.png` });

  await page.goto('/evaluaciones');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-formulario.png`, fullPage: true });

  await page.getByLabel(/código de la evaluación/i).fill('EVL-DEMO-2026');
  await identify(page);
  await page.getByRole('heading', { name: /analista de riesgo/i }).waitFor();
  await page.screenshot({ path: `${OUT}/03-preflight.png`, fullPage: true });

  await startAttempt(page);
  await page.getByRole('heading', { name: /conocimientos/i }).waitFor();
  await page.getByRole('radio', { name: /relación cuota \/ ingreso/i }).check();
  await page.getByRole('checkbox', { name: /declaraciones impositivas/i }).check();
  await page.screenshot({ path: `${OUT}/04-runner-seccion1.png`, fullPage: true });

  await page.getByRole('radio', { name: /^Falso$/ }).check();
  await page.getByLabel(/qué área revisa/i).selectOption({ label: 'Riesgos' });
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByLabel(/años de experiencia/i).fill('5');
  await page.getByLabel(/monto máximo/i).fill('150000');
  await page.getByLabel(/desde qué fecha/i).fill('2026-09-01');
  await page.getByRole('radio', { name: /^De acuerdo$/ }).check();
  await page.screenshot({ path: `${OUT}/05-runner-seccion2.png`, fullPage: true });

  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByLabel(/crédito responsable/i).fill('Uno que el cliente puede pagar sin ahogarse.');
  await page.screenshot({ path: `${OUT}/06-runner-seccion3.png`, fullPage: true });

  await page.getByRole('button', { name: /revisar y enviar/i }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/07-confirmacion.png` });

  await page.getByRole('dialog').getByRole('button', { name: /enviar respuestas/i }).click();
  await page.getByRole('heading', { name: /recibidas correctamente/i }).waitFor();
  await page.screenshot({ path: `${OUT}/08-comprobante.png`, fullPage: true });

});

test('capturas de estados de error del módulo público', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await skipOnboarding(page);

  // Error state: unknown code.
  await page.goto('/evaluaciones');
  await page.getByLabel(/código de la evaluación/i).fill('EVL-NO-EXISTE');
  await identify(page);
  await page.getByText('Esta evaluación no está disponible.').waitFor();
  await page.screenshot({ path: `${OUT}/09-codigo-invalido.png`, fullPage: true });

});

test('capturas de validación y reintento del módulo público', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await skipOnboarding(page);

  // Missing required answers.
  await page.goto('/evaluaciones?code=EVL-DEMO-2026');
  await identify(page);
  await startAttempt(page);
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByRole('button', { name: /revisar y enviar/i }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/10-faltan-obligatorias.png` });

  // Retry after a failure (demo code forces one failure).
  await page.goto('/evaluaciones?code=EVL-DEMO-REINTENTO');
  await identify(page);
  await startAttempt(page);
  await page.getByLabel(/por qué te interesa/i).fill('Por el impacto social del banco.');
  await page.getByRole('button', { name: /revisar y enviar/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /enviar respuestas/i }).click();
  await page.getByText(/el servicio está ocupado/i).waitFor();
  await page.screenshot({ path: `${OUT}/11-reintento.png`, fullPage: true });

});

test('capturas móvil y tema oscuro del módulo público', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await skipOnboarding(page);

  // Dark theme + mobile viewport.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/evaluaciones?code=EVL-DEMO-2026');
  await identify(page);
  await startAttempt(page);
  await page.getByRole('radio', { name: /relación cuota \/ ingreso/i }).check();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/12-movil-oscuro.png`, fullPage: true });
});
