# Implementación de "Liquid Glass"

Esta es una interpretación **propia** del lenguaje de vidrio esmerilado. No se copian activos,
layouts, íconos ni código de terceros.

## Anatomía de una superficie

Cada superficie de vidrio combina cuatro ingredientes:

1. **Tinte translúcido** — `background-color: rgb(var(--glass-tint) / <alpha>)`.
2. **Backdrop filter** — `backdrop-filter: blur(var(--blur-*)) saturate(var(--glass-saturate))`.
3. **Borde de hairline** que capta luz — `border` con `--glass-border`.
4. **Highlight interno + sombra externa** que simulan refracción/profundidad — pseudo-elemento
   `::before` con un degradado enmascarado y `box-shadow` con `--shadow-glass-*`.

```css
.glass {
  background-color: rgb(var(--glass-tint) / var(--glass-alpha-standard));
  border: 1px solid rgb(var(--glass-border) / var(--glass-border-alpha));
  box-shadow: var(--shadow-glass-md);
  backdrop-filter: blur(var(--blur-md)) saturate(var(--glass-saturate));
}
.glass::before { /* highlight superior enmascarado */ }
```

## Fallbacks (la legibilidad siempre gana)

Definidos en `tokens/glass.css` y `globals.css`:

- **Transparencia reducida / alto contraste** (`[data-transparency='reduced']`,
  `[data-contrast='high']`): el vidrio se vuelve **opaco** (`alpha = 1`) y el blur pasa a `0`.
- **Navegador sin `backdrop-filter`** (`@supports not (...)`): superficie casi opaca (`0.98`).
- **Móvil**: se reducen intensidad de blur y capas translúcidas; se evita apilar múltiples
  *backdrop-filters* a pantalla completa.

## Rendimiento

- Se evita animar `blur`/`box-shadow` de forma sostenida.
- El fondo ambiental (`.ambient-bg`) es un degradado fijo con *blobs*, no un bucle de render.
- Las superficies densas (formularios, evaluaciones, contenido legal) usan variantes con mayor
  opacidad para garantizar contraste de texto.

## Niveles de calidad visual (tiers)

- **Tier 0** — *fallback* estático accesible (sin blur, superficies opacas).
- **Tier 1** — Liquid Glass en CSS (por defecto).
- **Tier 2** — componentes con movimiento (Motion for React).
- **Tier 3** — escena WebGL ambiental **opcional** (flag `NEXT_PUBLIC_ENABLE_WEBGL`, apagado; no
  implementado en el MVP para no añadir dependencias pesadas).

El *tier* se decide con *reduced motion*, transparencia reducida, precisión del puntero, tamaño de
viewport, flags y ajustes del usuario — **sin** *fingerprinting* de dispositivo.
