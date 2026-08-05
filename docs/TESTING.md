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
- **Módulo público de evaluaciones**: número identificador (formato, normalización y los cinco
  motivos de rechazo), forma del valor por tipo de pregunta, `0` y `false` como respuestas válidas,
  saneamiento del texto enriquecido (incluidos los enlaces `javascript:`), paridad de los 39 tipos
  con el catálogo del ATS, transporte (`redirect: follow`, `text/plain`, `credentials: omit`,
  reintento **solo** en lecturas, `solicitudId` reutilizado), las tres formas de repetición
  idempotente, borrado de claves de respuesta a cualquier profundidad, clasificación del endpoint y
  guardias estáticas de seguridad. Ver [`PUBLIC_ASSESSMENTS.md`](PUBLIC_ASSESSMENTS.md).

## Componentes (Testing Library)

- `JobCard`: muestra info neutral y **nunca** afinidad/match/score (guardia de regla de producto).
- `AssessmentConsentScreen`: divulga el monitoreo y **bloquea el inicio** hasta marcar ambas casillas.
- `AccessScreen` (evaluaciones públicas): la casilla de datos personales es una puerta real, el
  número identificador no se reescribe silenciosamente y el eco de sus tres partes aparece al
  escribir.
- `AnswerControl`: un caso por forma de respuesta (catorce), comprobando el **valor emitido** y no
  sólo que el control se pinte — un `opciones` donde el servidor espera `valor` produciría una
  respuesta incorrecta que nada señalaría como culpa del cliente.
- `PublicAssessmentFlow`: recorrido completo sin sesión, doble clic, reintento con el mismo
  `solicitudId`, intento retomado, autoenvío al expirar y comprobante sin inventar una nota.

## End-to-end (Playwright) — `e2e/`

Cubren los flujos requeridos (navegar convocatorias, abrir detalle, registro en mock, perfil, CV,
envío de postulación, consentimiento y ejecución de evaluación, teclado, *reduced motion*, tema
claro/oscuro, y **verificación de que no aparece estado interno ni score**).

`e2e/public-assessments.spec.ts` cubre el módulo público de punta a punta contra el backend de
demostración: acceso con el número identificador, eco de sus partes, antesala con la declaración de
integridad, todos los tipos de control **sin errores de consola**, ordenar sólo con teclado, salto a
una pregunta con el foco, revisión previa, envío, reintento sin duplicar, límite de intentos,
reanudación tras recargar, evaluación pausada y ausencia de la clave de respuestas en el DOM. La misma
suite escribe las capturas de la revisión visual en `test-results/capturas`.

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
