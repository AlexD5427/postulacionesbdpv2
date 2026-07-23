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

---

## Rediseño 2026 — "Liquid Glass BDP" (fusión con lenguaje editorial)

El rediseño fusiona el **Liquid Glass** (línea madre) con un lenguaje editorial de paneles a sangre,
tarjetas flotantes, marquees y transiciones tipo iOS/Figma, **recoloreado** a la identidad del banco.

### Marca y color

- Paleta anclada en los dos sellos oficiales del BDP: **azul institucional `#004282`** y
  **cian `#00b0d8`**. De ahí derivan todos los degradados, resplandores y tintes de vidrio.
- `--color-primary` = azul, `--color-secondary`/`--color-accent` = cian, `--color-ring` = cian.
- **Degradados de marca** (`--grad-brand`, `--grad-brand-strong`, `--grad-brand-soft`) y tokens
  `--on-brand`/`--on-brand-muted` para texto sobre paneles de marca.

### Logo

El isotipo oficial (cinco teselas hexagonales) y las letras "BDP" se reconstruyeron como componentes
React tematizables desde el SVG de marca:

- `BdpMark` (isotipo) — tonos `brand` / `mono` / `white` / `gradient`. Se usa en dock, navbar,
  preloader, login y favicon (`src/app/icon.svg`, más un icono *maskable* para la PWA).
- `BdpLettermark` (letras BDP) — para el remate editorial del pie de página.
- `Logo` compone isotipo + "BDP · Talento".

### Movimiento (iOS / Figma "smart animate")

- Nuevos *easings*: `--ease-ios`, `--ease-spring-soft`, `--ease-spring-bounce`.
- **Scroll suave** con **Lenis** (`SmoothScroll`), desactivado bajo *reduced motion*.
- Utilidades de movimiento reutilizables: `AnimatedCounter` (conteo al entrar en viewport),
  `Marquee` (cinta infinita con máscara), `Spotlight` (glow que sigue el cursor), más `Reveal`.
- **Preloader** de marca ("Trabaja en BDP S.A.M."), una vez por sesión.
- **Barra de progreso de scroll**, **volver arriba** y **tour de bienvenida** (coach-marks).

### El Dock

`Dock` es la navegación flotante principal (estilo macOS): **magnificación por proximidad**,
pop-overs con *spring* y el **isotipo del BDP** en lugar del ícono de casa. **Abajo por defecto**;
un ajuste (`DockPositionControl`, en el centro de accesibilidad) lo mueve arriba. Se oculta en las
pantallas de autenticación y en el *runner* de evaluaciones.

### Secciones y superficies nuevas (globals.css)

- `.section-brand` — panel de marca con **aurora** animada (azul↔cian) y `.grain` (ruido fino).
- `.glass-brand` — vidrio con tinte de marca para superficies premium (héroe).
- `.liquid-orb` — discos/orbes flotantes decorativos del héroe.
- `.marquee`, `.dock-*`, `.preloader`, `.spotlight`, `.reading-ruler`, `.scroll-progress`,
  `.text-display` — todas con *fallbacks* de accesibilidad.

Radios más generosos (hasta `--radius-4xl`) y tipografía display (`--text-6xl/7xl`).

### Regla de idiomas

Todo texto visible pasa por i18n en **4 idiomas** (es/en/qu/ay). Ver [`I18N.md`](I18N.md).
