import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility checks (axe-core). These complement — never replace —
 * the manual checks documented in ACCESSIBILITY.md.
 */
const PAGES = ['/', '/jobs', '/jobs/BDP-CRE-001', '/accessibility', '/login', '/register'];

for (const path of PAGES) {
  test(`sin violaciones de accesibilidad serias en ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
  });
}

test('la navegación por teclado alcanza el enlace de saltar al contenido', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Saltar al contenido principal/i })).toBeFocused();
});
