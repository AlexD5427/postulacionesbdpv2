# Modelo de contenido y media

## Contenido *headless* dirigido por el ATS

El detalle de convocatoria **no** está codificado alrededor de puestos concretos. Se renderiza desde
una lista ordenada de **bloques** (`JobContentBlock`) que el ATS puede componer sin cambios de
frontend.

Tipos de bloque soportados: `hero`, `summary`, `rich_text`, `responsibilities`, `requirements`,
`benefits`, `location`, `image_gallery`, `video`, `quote`, `statistics`, `callout`, `faq`,
`application_instructions`, `assessment_info`, `contact_help`, `downloadable_resource`.

Cada bloque admite: `id` estable, `type`, `order`, `visible`, variante de tema/layout, tratamiento de
fondo, referencias de media, `motionPreset`, layout móvil, fechas de publicación, estado
`draft/published` y `schemaVersion`.

## Registro de renderizadores

`src/features/jobs/components/blocks/JobBlockRenderer.tsx` mapea `tipo de bloque → componente
validado` mediante un `switch` exhaustivo sobre la unión discriminada. **Los tipos desconocidos
degradan con elegancia**: no rompen la página, se omiten y se registra una advertencia de desarrollo.
No se ejecuta código arbitrario del backend ni se inyecta HTML/JS/CSS sin control.

## Texto enriquecido restringido

`RichText` renderiza un árbol de nodos validado (`paragraph/heading/list/quote` con marcas
`bold/italic`) a elementos React seguros. **No** existe `dangerouslySetInnerHTML`.

## Modelo `MediaAsset`

Campos: `id`, `type`, `provider`, `storageKey`, `publicPreviewURL`, `signedURLRequired`, `mimeType`,
`width`, `height`, `duration`, `aspectRatio`, `altText`, `caption`, `transcript`, `posterAsset`,
`focalPointX/Y`, `interactionPreset`, `motionPreset`, `mobileFallback`, `reducedMotionFallback`,
`accessibilityDescription`, `visibility`, `publicationStatus`.

No se asume que los activos sean públicos: `signedURLRequired` prepara la resolución de URLs firmadas
(R2) desde el servidor.

## Comportamiento interactivo

- **`InteractiveImage`**: inclinación/paralaje sutil **solo con puntero fino** (mouse), desactivado
  bajo *reduced motion*, usando *motion values* (sin re-render por movimiento). Nunca oculta
  información tras *hover* ni interfiere con el *scroll* táctil.
- **`AccessibleVideo`**: aspecto explícito (evita CLS), auto-pausa fuera de viewport y con pestaña
  oculta, subtítulos + transcripción, sin autoplay con sonido; bajo *reduced motion* muestra el
  póster.
- **`ImageGallery`**: cuadrícula responsiva con `alt`/caption por elemento.
