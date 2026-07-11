# Sistema de diseño — "Liquid Glass HR"

## Filosofía

Superficies translúcidas, profundidad por capas, suavidad óptica y transiciones fluidas, con
prioridad absoluta a la **legibilidad** y a una sensación de **confianza bancaria** cálida (no un
minimalismo *fintech* frío). El vidrio es un material visual, nunca una excusa para reducir el
contraste.

## Tokens (única fuente de verdad)

Los tokens son **CSS custom properties** en `src/design-system/tokens/`:

- `primitives.css`: escalas crudas (colores `--p-*`, radios, espaciado, tipografía fluida con
  `clamp`, `z-index`, duraciones y *easings* de movimiento, opacidades). Los componentes **no** usan
  primitivos directamente.
- `semantic.css`: mapeo por rol (`--color-background`, `--color-foreground`, `--color-primary`,
  estados, `--color-border`, `--color-ring`) para light / dark / alto contraste. Cambiar de tema solo
  remapea semántica.
- `glass.css`: variables del material (tinte, blur, saturación, borde, *highlight*, sombra) y sus
  *fallbacks* de accesibilidad.

Tailwind (`tailwind.config.ts`) consume estos tokens (`rgb(var(--token) / <alpha-value>)`), de modo
que no hay valores crudos dispersos por los componentes.

## Variantes de vidrio

Definidas como clases en `globals.css` y expuestas por el primitivo `GlassSurface`:
`glass-subtle`, `glass` (standard), `glass-elevated`, `glass-floating`, `glass-navigation`,
`glass-modal`, `glass-media`, `glass-input`. Cada variante define tinte, blur, saturación, borde,
*highlight* interno y sombra externa, con comportamiento en claro/oscuro.

## Capas y `z-index`

Escala explícita (`--z-base…--z-toast`): entorno decorativo → contenido → superficies → navegación
flotante → *overlays* → modales → controles de accesibilidad → *toasts*. Se evitan `z-index`
arbitrarios.

## Primitivos

`Button`, `GlassSurface`, `Card`, `Input/Textarea`, `Select` (nativo), `Label`, `Field` (asocia
label/descr./error vía `aria-*`), `Checkbox`, `RadioGroup`, `Switch`, `Dialog`, `Accordion`,
`Tooltip`, `Progress`, `Badge` (estado por **texto + forma**, no solo color), `Skeleton`, `Spinner`,
`PasswordInput`, `ChipMultiSelect`. Todos construidos sobre Radix cuando aplica.

## Movimiento

Ver [`docs`](DESIGN_SYSTEM.md) y `src/design-system/motion/`:

- CSS para color/opacidad/sombra; Motion for React para presencia, *layout* y gestos.
- Presupuestos: nada bloquea el *input*; se pausan animaciones cuando el documento está oculto; se
  respeta `prefers-reduced-motion` y el ajuste del usuario. Se prefieren `transform`/`opacity`.
- `Reveal`/`RevealGroup` renderizan estáticamente bajo *reduced motion*.

## Temas

`next-themes` con `data-theme` (light/dark/system). Alto contraste y transparencia reducida son
atributos independientes (`data-contrast`, `data-transparency`) que remapean tokens. Un script inline
en el `layout` aplica las preferencias antes del primer *paint* para evitar parpadeos.
