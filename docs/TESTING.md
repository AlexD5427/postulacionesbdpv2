# Estrategia de pruebas

Priorizamos por riesgo: primero la lógica que protege las **reglas de producto** y los **límites de
seguridad/privacidad**.

## Unitarias (Vitest) — 43 pruebas

- **Filtrado de DTO público**: `stripInternalFields` elimina campos internos en profundidad;
  `toJobSummary` no filtra bloques.
- **Fusión híbrida**: dedupe por `reference`, prioridad de proveedor, desempate por fecha, orden.
- **Mapper de Apps Script**: normalización de enums, booleanos, prefijo de id, descarte de campos
  internos.
- **Validación de respuestas de evaluación**: `isAnswered` / `validateAnswer` por tipo.
- **Telemetría**: lista blanca de campos (nunca respuestas), secuencia, re-encolado ante fallos.
- **Redacción de logs**: enmascara claves sensibles; IP gruesa.
- **Query de convocatorias mock**: filtros/orden/paginación y ausencia de campos prohibidos.
- **Estado de accesibilidad**: *clamp* del tamaño de texto, atributos en `<html>`.

## Componentes (Testing Library)

- `JobCard`: muestra info neutral y **nunca** afinidad/match/score (guardia de regla de producto).
- `AssessmentConsentScreen`: divulga el monitoreo y **bloquea el inicio** hasta marcar ambas casillas.

## End-to-end (Playwright) — `e2e/`

Cubren los flujos requeridos (navegar convocatorias, abrir detalle, registro en mock, perfil, CV,
envío de postulación, consentimiento y ejecución de evaluación, teclado, *reduced motion*, tema
claro/oscuro, y **verificación de que no aparece estado interno ni score**).

```bash
npm run test:e2e:install   # descarga Chromium (requiere acceso a cdn.playwright.dev)
npm run test:e2e
```

> En entornos sin acceso a la CDN de Playwright, las e2e no pueden descargar navegadores. Ejecútalas
> en CI/local con red. El servidor de pruebas arranca en modo mock automáticamente.

## Accesibilidad

- Automático: `@axe-core/playwright` sobre páginas clave (falla ante violaciones *serious*/*critical*).
- Manual: ver la sección de verificación en [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

## Comandos

```bash
npm run typecheck   # tsc estricto
npm run lint        # ESLint
npm run test        # Vitest
npm run check       # los tres anteriores
npm run build       # build de producción
```
