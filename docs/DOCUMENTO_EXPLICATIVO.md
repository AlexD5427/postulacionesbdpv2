# Documento explicativo — Portal público de candidatos BDP (PR #1)

> Documento explicativo del PR de fundación del portal público de candidatos del **Banco de
> Desarrollo Productivo BDP S.A.M.** Redactado para lectura pausada, con contexto para principiantes
> y detalle para revisores.

## Contexto

**Para quien recién llega (puedes saltar si ya conoces el proyecto).** El banco quiere una web
pública donde personas externas exploren convocatorias y postulen. Hoy existe un ATS interno; lo
nuevo es un **frontend público separado**. La consigna clave: no construir una landing desechable,
sino la **primera pieza de un futuro sistema de RR. HH. (HRIS/HCM)**, con límites que permitan crecer
sin reescribir.

El repositorio estaba **vacío** (solo `README` y `LICENSE`), por lo que se hizo una **inicialización
limpia** con Next.js 15 (App Router) + React 19 + TypeScript estricto.

**Contexto específico del cambio.** Este PR entrega el MVP de reclutamiento completo en modo *mock*
(sin credenciales): páginas públicas, autenticación, panel del candidato (perfil, CV, cartas,
postulaciones, notificaciones), motor de evaluaciones con consentimiento y telemetría aislada, un
sistema de diseño "Liquid Glass", un centro de accesibilidad y una capa de datos backend-agnóstica.

## Intuición

La idea central es **desacoplar** tres cosas que suelen mezclarse:

1. **La UI** no sabe de Supabase ni de Google Sheets. Habla con *contratos* de repositorio. Cambiar
   de backend es cambiar un adaptador, no la interfaz.
2. **El contenido** (convocatorias y evaluaciones) llega como *esquemas* del ATS y se renderiza con un
   **registro de bloques**. Publicar un puesto nuevo no requiere tocar código.
3. **Las reglas de producto** (nada de afinidad/score, nada de línea de tiempo interna, telemetría
   mínima y transparente) se hacen cumplir con *guardias* verificables, no con buenas intenciones.

Ejemplo concreto: en modo `hybrid`, si llegan dos versiones de la convocatoria `BDP-CRE-001` (una de
Supabase, otra de una hoja de cálculo), la función `mergeJobSummaries` deduplica por `reference`,
**prefiere Supabase** (más autoritativo) y, a igualdad, la fecha más reciente. Si una fuente falla, se
devuelven los resultados de la otra sin mostrar errores al candidato.

## Código (recorrido)

**1) Contratos y proveedores (inversión de dependencias).**

```ts
// src/core/data/repositories.ts — la UI depende de esto, no de un SDK
export interface JobsRepository {
  listJobs(filters, page): Promise<Paginated<JobSummary>>;
  getJob(id): Promise<JobPublication | null>;
}
```

Adaptadores en `src/infrastructure/providers/`: `mock`, `supabase` (boundary), `google-apps-script`,
`hybrid`. El `factory.ts` elige según `NEXT_PUBLIC_DATA_MODE` y **degrada a mock** si faltan
credenciales.

**2) Guardia de reglas de producto (DTO público).**

```ts
// src/infrastructure/mappers/public-dto.ts
stripInternalFields(record); // elimina fitScore, rank, hiringProbability,
                             // interviewerNotes, internalProcessStage, ...
```

**3) Contenido dirigido por esquema.** `JobBlockRenderer` mapea `tipo de bloque → componente` con un
`switch` exhaustivo; los tipos desconocidos se omiten con elegancia. El texto enriquecido usa un
**esquema restringido** (sin `dangerouslySetInnerHTML`).

**4) Motor de evaluaciones + telemetría aislada.** `AssessmentRunner` renderiza secciones/preguntas
desde la definición. La telemetría (`telemetry-controller.ts`) **filtra por lista blanca** de campos,
va en lotes, es acotada y *offline-safe*, y **nunca bloquea el envío**.

```ts
// Aunque se intente colar la respuesta, se descarta:
telemetry.record('answer_changed', { questionId: 'q1', value: 'SECRETO' });
// -> el evento solo conserva { questionId }.
```

**5) Sistema de diseño "Liquid Glass".** Tokens en CSS custom properties (primitives → semantic →
glass), variantes de vidrio con *fallbacks* para transparencia reducida / alto contraste / navegadores
sin `backdrop-filter`.

**6) Accesibilidad y seguridad.** Centro de accesibilidad persistente (tamaño de texto, contraste,
movimiento, transparencia, lectura, foco), aplicado antes del *paint*. CSP y cabeceras en
`src/core/security/headers.mjs`.

## Verificación

Ejecutado en este entorno (todo en verde):

- `npm run typecheck` — TypeScript estricto, sin errores.
- `npm run lint` — ESLint sin advertencias.
- `npm run test` — **43 pruebas** unitarias/de componentes.
- `npm run build` — build de producción (24 rutas).
- *Smoke test* de rutas (`200` en `/`, `/jobs`, `/jobs/BDP-CRE-001`, `/accessibility`, `/login`,
  `/register`, `/candidate`) y verificación de **cabeceras de seguridad** (CSP, X-Frame-Options DENY,
  Permissions-Policy que niega cámara/micrófono, etc.).
- Guardia de regla de producto: escaneo de términos prohibidos en la página de convocatoria
  (afinidad/score/etapa) — ausentes en contenido visible.

**QA manual sugerido:** 1) recorre con teclado (Tab) toda la app y verifica foco visible; 2) abre el
centro de accesibilidad y prueba tamaño de texto, alto contraste, reducir movimiento y transparencia;
3) regístrate en mock, completa perfil/CV y postula a `BDP-CRE-001`, confirmando el número de
confirmación y la ausencia de estado interno; 4) abre una evaluación, revisa la divulgación y confirma
que el inicio se bloquea hasta marcar ambas casillas.

> Las pruebas e2e (Playwright) están escritas pero requieren descargar navegadores
> (`npm run test:e2e:install`) en un entorno con acceso a `cdn.playwright.dev`; en el entorno de
> construcción la CDN está bloqueada por *egress*.

## Alternativas

**A. Estado del servidor: TanStack Query (elegido) vs. `fetch` en RSC + Server Actions.**

| TanStack Query (elegido) | RSC + Server Actions |
| --- | --- |
| ✔ Caché, reintentos y estados de carga/errores listos | ✔ Menos JS en el cliente |
| ✔ Ideal para el panel interactivo del candidato | ✔ Más simple para lectura pura |
| ✘ Añade JS de cliente | ✘ Autosave de borradores y mutaciones optimistas más engorrosos |

**B. Estilos: Tailwind + CSS variables (elegido) vs. CSS-in-JS.**

| Tailwind + tokens (elegido) | CSS-in-JS |
| --- | --- |
| ✔ Sin runtime; tokens como única fuente de verdad | ✔ Estilos co-ubicados y dinámicos |
| ✔ Excelente para *fallbacks* del vidrio | ✘ Costo en runtime y fricción con RSC |

## Personas sugeridas para consultar

El repositorio era *greenfield* (solo el commit inicial), por lo que **no hay autores previos** con
contexto sobre estos archivos. La referencia natural es la persona propietaria del repositorio
(**Axlllalex**), especialmente para: la política de fuente de verdad Supabase/Sheets, la redacción
legal del consentimiento de evaluaciones y la identidad de marca del banco. Dado que gran parte del
código fue generado con asistencia de IA, conviene una revisión humana enfocada en esos tres puntos.

## Cuestionario

<details>
<summary>1. ¿Por qué la UI no importa el SDK de Supabase directamente?</summary>

- a) Por rendimiento del bundle.
- **b) Por inversión de dependencias: la UI depende de contratos de repositorio y los adaptadores son intercambiables. ✅**
- c) Porque Supabase no tiene SDK de navegador.
- d) Por una limitación de Next.js.

Depender de interfaces (`JobsRepository`, etc.) permite cambiar mock↔supabase↔hybrid sin tocar
componentes. (a) es un efecto menor; (c) es falso; (d) no aplica.
</details>

<details>
<summary>2. En modo híbrido, ¿qué gana ante un conflicto de la misma convocatoria?</summary>

- a) La primera fuente que responde.
- b) Google Sheets, por ser gestionada por negocio.
- **c) La fuente más autoritativa (Supabase > Sheets); a igualdad, la fecha más reciente. ✅**
- d) Se muestran ambas.

`mergeJobSummaries` deduplica por `reference` y usa el rango de proveedor con desempate por
`publishedAt`.
</details>

<details>
<summary>3. ¿Qué garantiza que la telemetría no filtre respuestas?</summary>

- a) Un try/catch alrededor del envío.
- **b) Una lista blanca de campos en `record()` que descarta todo lo demás. ✅**
- c) Cifrado del payload.
- d) Que el backend lo ignore.

Aunque se pase `value`/`answer`, solo sobreviven `questionId`, `sectionId`, `elapsedMilliseconds`,
`visibilityState`, `clientCategory`.
</details>

<details>
<summary>4. ¿Cómo se evita XSS desde contenido del ATS/hoja de cálculo?</summary>

- a) Escapando manualmente cada cadena.
- b) Con DOMPurify sobre HTML del proveedor.
- **c) No se renderiza HTML del proveedor: texto enriquecido con esquema restringido y sin `dangerouslySetInnerHTML`. ✅**
- d) Con la CSP únicamente.

La CSP ayuda, pero la defensa estructural es no renderizar HTML arbitrario.
</details>

<details>
<summary>5. La guardia `RequireAuth` del área de candidato, ¿es un control de seguridad?</summary>

- a) Sí, protege los datos del candidato.
- **b) No: es solo UX; la autorización real debe validarse en el servidor. ✅**
- c) Sí, porque usa cookies.
- d) Depende del proveedor.

Ocultar rutas nunca es autorización; el backend debe validar cada request (ver `docs/SECURITY.md`).
</details>
