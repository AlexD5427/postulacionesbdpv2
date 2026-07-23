# Documento explicativo · Rediseño "Liquid Glass BDP" + i18n + accesibilidad y dock

> **En una frase:** reescribimos por completo la capa visual del portal fusionando el material
> **Liquid Glass** (línea madre) con un lenguaje editorial de paneles a sangre, tarjetas flotantes,
> marquees y transiciones tipo iOS/Figma —recoloreado a la marca del banco (azul `#004282` + cian
> `#00b0d8`)— y sumamos un **dock flotante** estilo macOS, **cuatro idiomas** (es/en/qu/ay), un
> **preloader** de marca, un **buscador ⌘K** y un centro de **accesibilidad** mucho más amplio.

---

## Contexto

### Para quien llega sin contexto (puedes saltar esta parte si ya conoces el proyecto)

El proyecto es el **portal público de candidatos** del Banco de Desarrollo Productivo BDP S.A.M.,
construido con **Next.js 15 (App Router)** y **React 19**. Es la primera pieza de un futuro
HRIS/HCM: la gente se registra, explora convocatorias (que se hidratan desde un proveedor de datos),
gestiona su perfil/CV y rinde evaluaciones.

Dos ideas del sistema son clave para entender el cambio:

- **Tokens de diseño en CSS.** Los colores, radios, sombras y tiempos viven como *custom
  properties* en `src/design-system/tokens/*.css`, separados en **primitivos** (escalas crudas
  `--p-*`) y **semánticos** (roles como `--color-primary`). Tailwind consume los semánticos. Cambiar
  la marca es, sobre todo, **remapear tokens** — no tocar componentes.
- **Liquid Glass.** Superficies translúcidas con *backdrop-filter*, borde de *hairline* y un
  *highlight* interno. Cada variante (`glass`, `glass-elevated`, `glass-navigation`…) tiene
  *fallbacks* de accesibilidad (opaca bajo "transparencia reducida" / alto contraste).

> 🔑 **Concepto clave — `whileInView` (scroll-reveal):** muchas secciones aparecen con una animación
> al entrar en el *viewport*. Bajo *movimiento reducido* se renderizan estáticas. Esto importa para
> las capturas: una captura de página completa **no** dispara el observador de intersección, así que
> las secciones bajo el pliegue salen "vacías" salvo que se active *reduced motion* (que las hace
> visibles de inmediato).

### Contexto específico del cambio

El usuario pidió una fusión entre el diseño actual (Liquid Glass) y el lenguaje de una web de
referencia muy animada y editorial (paneles de color a sangre, dock inferior, marquees, contadores),
pero **con los colores del banco** y con el **Liquid Glass como línea madre**. Además: dock inferior
por defecto (superior opcional), **logo del BDP en lugar del ícono de casa**, cuatro idiomas,
favicon propio, más accesibilidad (daltonismo, TTS…), un preloader "Trabaja en BDP S.A.M.", y ~10
funciones nuevas útiles para postulantes (excluyendo el *tracking* de fase de postulación).

---

## Intuición

Piensa en el rediseño como **tres capas superpuestas sobre la misma estructura**:

1. **Color.** La web de referencia "fluía" en naranja/crema. Reemplazamos ese flujo por el
   **degradado azul→cian** del banco. Como todo el color pasa por tokens semánticos, recolorear fue
   redefinir `--color-primary`, `--color-secondary` y un puñado de degradados `--grad-brand*`; los
   cientos de usos de `text-primary`/`bg-accent` cambiaron solos.

   > 🎨 **Ejemplo concreto:** los "paneles naranjas" de la referencia se volvieron `.section-brand`
   > — un panel con `--grad-brand-strong` y una **aurora** animada (dos-tres resplandores cian/azul
   > que respiran). El mismo patrón, otra identidad.

2. **Movimiento.** El "feel" iOS/Figma se logra con tres piezas: **scroll suave** (Lenis),
   **springs** suaves (curvas `cubic-bezier` de rebote leve) y **micro-animaciones** reutilizables
   (contador que cuenta al aparecer, marquee infinito, glow que sigue el cursor). Todo detrás del
   interruptor de *movimiento reducido*.

3. **Navegación.** El corazón de la referencia es su **dock**. Lo reconstruimos como un dock estilo
   macOS: los íconos **se agrandan por proximidad** al cursor (usando un `MotionValue` con la
   posición X del ratón y una interpolación por distancia), con submenús que emergen con *spring*.
   El "home" es el **isotipo del BDP**.

Para los idiomas, la intuición es una **tabla con respaldo**: el español es la fuente de verdad;
inglés/quechua/aymara son *parciales*; una clave ausente cae al español. Así nunca hay texto roto y
la cobertura puede crecer sin romper nada.

---

## Código

### 1. Recoloreo por tokens

`primitives.css` gana la escala **cian** (`--p-cyan-*`, con `#00b0d8` exacto) y afina el **azul**
(`#004282`). `semantic.css` reasigna roles y añade degradados de marca:

```css
--color-primary: var(--p-blue-700);   /* #004282 */
--color-secondary: var(--p-cyan-500); /* #00b0d8 */
--grad-brand: linear-gradient(135deg, rgb(var(--p-blue-700)), rgb(var(--p-cyan-500)));
--on-brand: 255 255 255;              /* texto sobre paneles de marca */
```

`tailwind.config.ts` expone `secondary`, `on-brand`, radios `4xl`, tipografías display y nuevos
*easings*/keyframes (`marquee`, `float`).

### 2. Logo y favicon

Del SVG oficial reconstruimos componentes React tematizables: `BdpMark` (isotipo de 5 teselas) y
`BdpLettermark` (letras "BDP"). El favicon (`src/app/icon.svg`) es el isotipo sobre el degradado de
marca; hay además un icono *maskable* para la PWA (`manifest.ts`).

```tsx
<BdpMark tone="gradient" />   // héroe / preloader
<BdpMark tone="white" />      // sobre panel de marca
<BdpMark tone="brand" />      // dock / navbar (azul + cian)
```

### 3. Internacionalización (4 idiomas)

Un i18n propio, sin dependencias. `es` es `as const` y de ahí sale el tipo de claves; los demás son
`Partial`. El hook es **seguro para hidratación** (primer render siempre en español):

```ts
const active = hydrated ? locale : DEFAULT_LOCALE; // evita desajuste servidor/cliente
const t = (key, vars) => translate(active, key, vars); // respaldo: locale → es → clave
```

Un script en línea en `layout.tsx` fija `<html lang>` antes del *paint*. Ver [`I18N.md`](I18N.md).

### 4. El Dock (magnificación por proximidad)

```tsx
const distance = useTransform(mouseX, (val) => {
  const b = ref.current?.getBoundingClientRect();
  return b ? val - b.left - b.width / 2 : 9999;
});
const size = useSpring(useTransform(distance, [-150, 0, 150], [44, 64, 44]),
  { mass: 0.1, stiffness: 170, damping: 14 });
```

Bajo *movimiento reducido* el tamaño es fijo. El dock se oculta en autenticación y en el *runner* de
evaluaciones, y su posición (abajo/arriba) vive en un `ui-store` persistido y se cambia desde el
centro de accesibilidad.

### 5. Preloader, buscador ⌘K y *chrome* global

`ShellChrome` agrupa el *chrome* siempre montado: `Preloader` (una vez por sesión, vía
`sessionStorage`), `ScrollProgress`, `Dock`, `CommandPalette` (⌘K/Ctrl+K, navega a secciones y
convocatorias), `BackToTop`, `ReadingRuler` y `OnboardingTour`.

### 6. Accesibilidad v2

El *store* de accesibilidad suma `colorVision`, `readingFont`, `readingRuler`, `largeCursor`, que se
reflejan como atributos en `<html>` (aplicados antes del *paint*). Los **filtros de daltonismo** son
`feColorMatrix` (`ColorVisionFilters`) referenciados con `filter: url(#…)` sobre `<html>`:
verificamos que **no** rompe el posicionamiento fijo del dock/lanzador. El **TTS** usa la Web Speech
API en el idioma activo.

### 7. Landing, navbar, footer y login

La landing (`LandingView`, cliente) compone héroe con orbes líquidos + titular display animado por
palabras, showcase, **panel de marca con contadores**, convocatorias, **marquee** de talento, pasos,
testimonios en vidrio y CTA. El login pasó a un **split-screen**: panel de marca con orbes +
formulario en vidrio, con idioma/tema en la barra.

> ♿ **Todo respeta accesibilidad:** Lenis y las animaciones se apagan con *reduced motion*; el vidrio
> se opaca con *transparencia reducida*; el estado nunca depende solo del color.

---

## Verificación

Validado de forma automatizada y con un navegador real (Chromium vía Playwright) en modo **mock**
(sin credenciales), en claro y oscuro y en los 4 idiomas.

- ✅ `npm run typecheck` — sin errores (modo estricto).
- ✅ `npm run lint` — sin advertencias.
- ✅ `npm run test` — **43** pruebas en verde.
- ✅ `npm run build` — compila; se generan `/icon.svg` y `/manifest.webmanifest`; las páginas
  públicas siguen siendo estáticas.
- ✅ **Navegador real:** landing (claro/oscuro), `/jobs`, `/login` (split), buscador ⌘K, dock
  arriba/abajo, panel de accesibilidad y **cambio de idioma a quechua** verificados por captura.
- ✅ **Filtro de daltonismo:** con `deuteranopia` activo, los colores se remapean y el **dock sigue
  fijo** al *viewport* (comprobado midiendo su *bounding box*).

> 🌐 **Nota sobre imágenes:** en el entorno de prueba `images.unsplash.com` está bloqueado por egress
> de red, así que las portadas de convocatoria salen vacías en las capturas. En Vercel/producción
> cargan con normalidad (el host ya está en `next.config.mjs` y en `img-src`). El rediseño **no**
> introduce dependencias de red nuevas: Lenis viene por npm y las tipografías son del sistema.

### QA manual sugerido

1. `npm install && npm run build && npm run start`, abre `http://localhost:3000`.
2. Observa el **preloader** "Trabaja en BDP S.A.M." (aparece una vez por sesión) y el **dock**
   inferior con el logo del BDP.
3. Pulsa **⌘K / Ctrl+K**: busca una convocatoria y navega con flechas + Enter.
4. Cambia el **idioma** (globo 🌐) a inglés, quechua y aymara; confirma que el *chrome* se traduce.
5. Abre **Accesibilidad** (botón inferior derecho): prueba daltonismo, cursor grande, fuente legible,
   regla de lectura, lectura en voz alta y **mover el dock arriba**.
6. Activa **movimiento reducido**: el scroll deja de ser suave, el preloader se acorta y las
   animaciones se detienen.
7. Redimensiona a móvil (~375px): el dock queda centrado abajo sin tapar contenido.

---

## Alternativas

### A. i18n propio vs. librería (`next-intl` / `react-i18next`)

| ✅ i18n propio (elegido) | ⚠️ i18n propio |
| --- | --- |
| Cero dependencias; *bundle* mínimo | Menos funciones (ICU plurales, fechas) que una librería madura |
| Tipado estricto de claves derivado del español | Hay que mantener el resolutor y el respaldo a mano |
| Respaldo elegante y control total de la hidratación | Sin ecosistema de herramientas de traducción |

Elegimos lo propio porque el volumen de cadenas del MVP es acotado y el tipado + respaldo cubren la
necesidad sin peso extra. Si el catálogo crece mucho (o se necesitan plurales ICU), migrar a
`next-intl` es directo.

### B. Motion: **framer-motion + Lenis** vs. **GSAP + ScrollTrigger**

| ✅ framer-motion + Lenis (elegido) | ⚠️ framer-motion + Lenis |
| --- | --- |
| Ya usábamos framer-motion; Lenis es pequeño y moderno | Efectos *timeline* muy complejos son más verbosos que en GSAP |
| Excelente integración con React y *reduced motion* | Dos motores de animación conviviendo |
| Sin licencias ni scripts externos | — |

GSAP es potentísimo para *timelines*, pero añade peso y su valor no compensa para este alcance; la
documentación previa ya descartaba GSAP/Three.js por costo/beneficio.

---

## Personas sugeridas para consultar

- **AlexD5427** (propietario del repositorio): es quien tiene el contexto de producto, marca y
  despliegue (Vercel). Es la referencia principal para decisiones de identidad visual, alcance del
  rediseño y para validar las traducciones de quechua/aymara con hablantes nativos.

> ℹ️ Todo el historial de estos archivos proviene de *commits* generados por IA en un origen único
> (no hay múltiples autores humanos con conocimiento distribuido), por lo que la persona con más
> contexto es el propietario del repo.

---

## Cuestionario

<details>
<summary><strong>1. ¿Por qué recolorear a la marca del banco tocó tan poco los componentes?</strong></summary>

- **A.** Porque se usaron reemplazos de texto en cada archivo.
- **B.** Porque el color vive en **tokens semánticos** y los componentes consumen esos roles, no
  valores crudos. ✅
- **C.** Porque Tailwind detecta la marca automáticamente.
- **D.** Porque se desactivó el tema oscuro.

**Explicación:** al redefinir `--color-primary`, `--color-secondary` y los degradados `--grad-brand*`
en `semantic.css`, todos los usos de `text-primary`/`bg-accent`/etc. cambian a la vez. Esa es la
razón de separar primitivos y semánticos (A y C son incorrectas; D no tiene relación).
</details>

<details>
<summary><strong>2. En una captura de página completa, ¿por qué algunas secciones salían "vacías"?</strong></summary>

- **A.** Porque el CSS no cargó.
- **B.** Porque usan scroll-reveal (`whileInView`) y una captura *fullPage* no dispara el observador
  de intersección; se arreglan las capturas activando *reduced motion*. ✅
- **C.** Porque faltaban las traducciones.
- **D.** Porque el servidor devolvía 500.

**Explicación:** `Reveal` arranca en `opacity: 0` y anima al entrar en *viewport*. La captura de toda
la altura no "hace scroll", así que el observador no marca visibles las secciones bajo el pliegue.
Con *reduced motion* se renderizan estáticas (visibles) de inmediato.
</details>

<details>
<summary><strong>3. ¿Cómo evita el sistema de idiomas un desajuste de hidratación?</strong></summary>

- **A.** Renderizando siempre en el idioma del navegador.
- **B.** Usando cookies leídas por el servidor.
- **C.** Forzando el **español** en el primer render (servidor y cliente) y cambiando al idioma
  persistido tras `useEffect`. ✅
- **D.** Deshabilitando la hidratación.

**Explicación:** el idioma vive en `localStorage`, que el servidor no ve. Si el primer render de
cliente usara el idioma guardado, el HTML del servidor (español) no coincidiría. Por eso ambos
arrancan en español y luego se sincroniza; `<html lang>` se ajusta con un script pre-*paint*.
</details>

<details>
<summary><strong>4. El filtro de daltonismo se aplica en <code>&lt;html&gt;</code>. ¿Cuál era el riesgo y cómo se comprobó?</strong></summary>

- **A.** Que rompiera el `position: fixed` del dock/lanzador; se verificó midiendo el *bounding box*
  del dock (sigue pegado al *viewport*). ✅
- **B.** Que cambiara el idioma.
- **C.** Que desactivara el scroll suave.
- **D.** Que borrara el favicon.

**Explicación:** aplicar `filter` a un ancestro puede crear un bloque contenedor para descendientes
fijos. Al aplicarlo en la raíz, los navegadores mantienen los fijos respecto al *viewport*; se
confirmó por captura que el dock permanece abajo con `deuteranopia` activo.
</details>

<details>
<summary><strong>5. ¿Qué garantiza que el rediseño sigue siendo accesible con "movimiento reducido"?</strong></summary>

- **A.** Nada; las animaciones siempre corren.
- **B.** Lenis **no se inicializa**, `Reveal` renderiza estático, y las animaciones CSS (marquee,
  orbes, aurora, dock magnético, preloader) se neutralizan bajo `[data-motion='reduced']`. ✅
- **C.** Se oculta todo el contenido animado.
- **D.** Solo se desactiva en móvil.

**Explicación:** el mismo interruptor del centro de accesibilidad (y `prefers-reduced-motion` del SO)
controla todo el movimiento. `SmoothScroll` comprueba la preferencia y no arranca Lenis; el CSS
envuelve cada animación en `:not([data-motion='reduced'])`.
</details>
