import { test, expect, type Page } from '@playwright/test';

/**
 * Public assessment module (temporary beta) — end-to-end.
 *
 * Runs in mock mode (see playwright.config.ts), where no Evaluations endpoint is
 * configured and the module therefore serves its local demo assessment. The demo
 * adapter reproduces the backend's real behaviour for the paths that matter:
 * `NOT_FOUND`, idempotent replay, and a forced first failure so the retry path
 * (same `requestId`) is genuinely exercised.
 *
 * Requires `npm run test:e2e:install` once (downloads Chromium).
 */

const DEMO_CODE = 'EVL-DEMO-2026';
const RETRY_CODE = 'EVL-DEMO-REINTENTO';

/**
 * Mark the first-run onboarding tour as seen. Its spotlight overlay is modal by
 * design and would swallow the clicks these tests make on the landing page; the
 * tour itself has its own coverage in `theme-motion.spec.ts`.
 */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'bdp.ui.v1',
      JSON.stringify({ state: { dockPosition: 'bottom', tourSeen: true }, version: 0 }),
    );
  });
}

async function identify(page: Page, options?: { code?: string }) {
  if (options?.code) {
    await page.getByLabel(/código de la evaluación/i).fill(options.code);
  }
  await page.getByLabel(/nombre completo/i).fill('Ana Pérez Quispe');
  await page.getByLabel(/^Carnet de Identidad/).fill('1234567 LP');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /continuar/i }).click();
}

/** Tick every preflight checkbox (instructions + consent) and start. */
async function startAttempt(page: Page) {
  const checkboxes = page.getByRole('checkbox');
  for (let i = 0; i < (await checkboxes.count()); i += 1) {
    await checkboxes.nth(i).check();
  }
  await page.getByRole('button', { name: /comenzar evaluación/i }).click();
}

test.describe('Evaluaciones públicas (beta)', () => {
  test('se llega desde la página principal sin iniciar sesión', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    await page.getByRole('link', { name: /rendir mi evaluación/i }).click();
    await expect(page).toHaveURL(/\/evaluaciones/);
    await expect(page.getByRole('heading', { name: /rendir una evaluación/i })).toBeVisible();
    // No login wall anywhere.
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toHaveCount(0);
  });

  test('un enlace con código prellena el formulario y oculta el campo', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await expect(page.getByLabel(/código de la evaluación/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /continuar/i })).toBeDisabled();
  });

  test('flujo completo: identificarse, responder todos los tipos y recibir comprobante', async ({
    page,
  }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await identify(page);

    // Preflight
    await expect(page.getByRole('heading', { name: /analista de riesgo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /comenzar evaluación/i })).toBeDisabled();
    await startAttempt(page);

    // --- Section 1: choice types -------------------------------------------
    await expect(page.getByRole('heading', { name: /conocimientos/i })).toBeVisible();
    await page.getByRole('radio', { name: /relación cuota \/ ingreso/i }).check();
    await page.getByRole('checkbox', { name: /declaraciones impositivas/i }).check();
    await page.getByRole('radio', { name: /^Falso$/ }).check();
    await page.getByLabel(/qué área revisa/i).selectOption({ label: 'Riesgos' });
    await page.getByRole('button', { name: /siguiente/i }).click();

    // --- Section 2: numbers, dates, likert, ranking ------------------------
    await expect(page.getByRole('heading', { name: /datos y criterio/i })).toBeVisible();
    await page.getByLabel(/años de experiencia/i).fill('5');
    await page.getByLabel(/monto máximo/i).fill('150000');
    await page.getByLabel(/desde qué fecha/i).fill('2026-09-01');
    await page.getByRole('radio', { name: /de acuerdo/i }).first().check();
    // Ordering is keyboard/button driven, never drag-only. The first item's
    // "up" button is correctly disabled, so the second one is used.
    await page.getByRole('button', { name: /^Subir/ }).nth(1).click();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // --- Section 3: open answers + a disabled type --------------------------
    await expect(page.getByRole('heading', { name: /situaciones/i })).toBeVisible();
    await page.getByLabel(/crédito responsable/i).fill('Uno que el cliente puede pagar.');
    await expect(page.getByText(/requiere adjuntar un archivo/i)).toBeVisible();

    // --- Review + submit ---------------------------------------------------
    await page.getByRole('button', { name: /revisar y enviar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /enviar respuestas/i }).click();

    await expect(
      page.getByRole('heading', { name: /tus respuestas fueron recibidas correctamente/i }),
    ).toBeVisible();
    // Pending manual review is stated; a zero is never shown.
    await expect(page.getByText(/tus respuestas están en revisión/i)).toBeVisible();
  });

  test('nunca aparecen claves de respuesta ni puntajes durante el intento', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await identify(page);
    await startAttempt(page);

    const body = (await page.textContent('body'))?.toLowerCase() ?? '';
    for (const forbidden of [
      'iscorrect',
      'is_correct',
      'answerkey',
      'scorevalue',
      'passingscore',
      'pointsawarded',
      'puntaje',
      'respuesta correcta es',
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  test('un código inexistente muestra un mensaje genérico', async ({ page }) => {
    await page.goto('/evaluaciones');
    await identify(page, { code: 'EVL-NO-EXISTE' });

    await expect(page.getByText('Esta evaluación no está disponible.')).toBeVisible();
    const body = (await page.textContent('body'))?.toLowerCase() ?? '';
    for (const leak of ['borrador', 'pausada', 'archivada', 'draft']) {
      expect(body).not.toContain(leak);
    }
  });

  test('una pregunta obligatoria sin responder bloquea el envío', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await identify(page);
    await startAttempt(page);

    // Jump straight to the end without answering anything. Each hop waits for the
    // next section heading so the smooth-scrolling layout has settled before the
    // following click (otherwise the assertion races the animation on mobile).
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByRole('heading', { name: /datos y criterio/i })).toBeVisible();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByRole('heading', { name: /situaciones/i })).toBeVisible();
    await page.getByRole('button', { name: /revisar y enviar/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/faltan respuestas obligatorias/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /enviar respuestas/i })).toHaveCount(0);
  });

  test('el doble clic no duplica el envío', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${RETRY_CODE}`);
    await identify(page);
    await startAttempt(page);
    await page.getByLabel(/por qué te interesa/i).fill('Por el impacto social del banco.');

    await page.getByRole('button', { name: /revisar y enviar/i }).click();
    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: /enviar respuestas/i });
    await confirm.dblclick();

    // The demo backend rejects the first submission of this code on purpose.
    await expect(page.getByText(/el servicio está ocupado/i)).toBeVisible();
    // A double click produced exactly one failure, not two submissions.
    await expect(page.getByRole('button', { name: /reintentar el envío/i })).toHaveCount(1);
  });

  test('reintentar tras un fallo conserva las respuestas y no duplica el intento', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${RETRY_CODE}`);
    await identify(page);
    await startAttempt(page);
    const answer = 'Quiero aportar al desarrollo productivo.';
    await page.getByLabel(/por qué te interesa/i).fill(answer);

    await page.getByRole('button', { name: /revisar y enviar/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /enviar respuestas/i }).click();

    await expect(page.getByText(/el servicio está ocupado/i)).toBeVisible();
    // Nothing was lost.
    await expect(page.getByLabel(/por qué te interesa/i)).toHaveValue(answer);
    await expect(page.getByText(/usa el mismo identificador de envío/i)).toBeVisible();

    await page.getByRole('button', { name: /reintentar el envío/i }).click();
    await expect(
      page.getByRole('heading', { name: /tus respuestas fueron recibidas correctamente/i }),
    ).toBeVisible();
    // One attempt id on the receipt — the retry did not open a second attempt.
    await expect(page.getByText(/identificador del intento/i)).toBeVisible();
  });

  test('el temporizador aparece solo cuando la evaluación tiene duración', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await identify(page);
    await startAttempt(page);
    await expect(page.getByText(/tiempo restante/i)).toBeAttached();

    await page.goto(`/evaluaciones?code=${RETRY_CODE}`);
    await identify(page);
    await startAttempt(page);
    await expect(page.getByText(/tiempo restante/i)).toHaveCount(0);
  });

  test('el runner se puede operar solo con el teclado', async ({ page }) => {
    await page.goto(`/evaluaciones?code=${DEMO_CODE}`);
    await identify(page);
    await startAttempt(page);

    // Reach the first radio group by keyboard and select with the arrow keys.
    const firstOption = page.getByRole('radio', { name: /relación cuota \/ ingreso/i });
    await firstOption.focus();
    await page.keyboard.press('Space');
    await expect(firstOption).toBeChecked();

    // Every ordering control is a real button with an accessible name.
    await page.getByRole('button', { name: /siguiente/i }).click();
    const up = page.getByRole('button', { name: /^Subir/ }).nth(1);
    await up.focus();
    await expect(up).toBeFocused();
    await page.keyboard.press('Enter');
  });
});
