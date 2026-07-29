# Estrategia de pruebas

Priorizamos por riesgo: primero la lógica que protege las **reglas de producto** y los **límites de
seguridad/privacidad**.

## Unitarias (Vitest)

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
- **Módulo público de evaluaciones** (beta): transporte (`redirect: follow`, `text/plain`,
  reintento solo en lecturas, `requestId` reutilizado), borrado de claves de respuesta, clasificación
  del endpoint, formato de respuesta por tipo de pregunta y guardias estáticas de seguridad (sin
  `fetch` en componentes, sin acciones administrativas, CSP). Ver
  [`PUBLIC_ASSESSMENTS_BETA.md`](PUBLIC_ASSESSMENTS_BETA.md) §9.

## Componentes (Testing Library)

- `JobCard`: muestra info neutral y **nunca** afinidad/match/score (guardia de regla de producto).
- `AssessmentConsentScreen`: divulga el monitoreo y **bloquea el inicio** hasta marcar ambas casillas.
- `AccessForm` (evaluaciones públicas): la casilla de privacidad es una puerta real y el documento no
  se reescribe silenciosamente.
- `PublicAssessmentFlow`: recorrido completo sin sesión, doble clic, reintento con el mismo
  `requestId`, revisión manual sin mostrar un cero y cierre por tiempo.

## End-to-end (Playwright) — `e2e/`

Cubren los flujos requeridos (navegar convocatorias, abrir detalle, registro en mock, perfil, CV,
envío de postulación, consentimiento y ejecución de evaluación, teclado, *reduced motion*, tema
claro/oscuro, y **verificación de que no aparece estado interno ni score**).

`e2e/public-assessments.spec.ts` cubre el módulo público (beta) de punta a punta: acceso desde la
portada sin sesión, enlace con código, respuesta de todas las familias de control, código
inexistente, obligatorias faltantes, doble clic, reintento sin duplicar el intento, temporizador y
operación solo con teclado. `e2e/screenshots.public-assessments.spec.ts` genera las capturas de la
revisión visual (ejecución manual).

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
