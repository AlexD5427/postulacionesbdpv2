# Documento explicativo · Arreglo de carga (CSP) + mejora visual Liquid Glass

> **En una frase:** la aplicación se veía **en blanco** en producción porque la
> política de seguridad de contenido (CSP) bloqueaba los scripts internos de
> Next.js; al corregir la CSP y un bootstrap roto, la app vuelve a hidratarse, y
> encima subimos el nivel visual (Liquid Glass, movimiento y un layout más
> ancho) sin tocar la accesibilidad.

---

## Contexto

### Para quien llega sin contexto (puedes saltarte esta parte si ya conoces Next.js y CSP)

Este proyecto es un **portal público de candidatos** construido con **Next.js 15
(App Router)** y **React 19**. Con el App Router, el servidor no envía solo HTML:
también envía el árbol de componentes de servidor "serializado" dentro de
pequeñas etiquetas `<script>` **en línea** (por ejemplo `self.__next_f.push(...)`).
El navegador ejecuta esos scripts para **hidratar** la página: convertir el HTML
estático en una interfaz interactiva de React.

Una **Content-Security-Policy (CSP)** es una cabecera HTTP que le dice al
navegador *de dónde* puede cargar y ejecutar recursos. La directiva `script-src`
controla qué scripts se permiten. Si se pone `script-src 'self'`, el navegador
**solo** ejecuta archivos `.js` servidos desde el mismo origen y **rechaza todo
script en línea** (los `<script>…</script>` escritos directamente en el HTML),
salvo que se autoricen explícitamente con `'unsafe-inline'`, un *hash* o un
*nonce*.

> 🔎 **Concepto clave — hidratación:** sin hidratación, React nunca "toma
> control" del HTML. Los botones no responden, los menús no abren y —lo más
> importante aquí— cualquier animación de entrada que arranque oculta se queda
> oculta para siempre.

### Contexto específico del cambio

El proyecto define su CSP de forma centralizada en
[`src/core/security/headers.mjs`](../src/core/security/headers.mjs), que
`next.config.mjs` aplica a todas las rutas. La directiva era:

```js
'script-src': ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])],
```

Es decir, en **producción** solo `'self'`. Un comentario afirmaba que "Next
inyecta un nonce/hash para su bootstrap", pero eso **no es cierto** salvo que se
genere un *nonce* por petición desde un *middleware*. Aquí no hay middleware ni
nonce, así que el navegador bloqueaba **todos** los scripts en línea de Next.

Como si fuera poco, había un segundo problema latente en
[`src/app/layout.tsx`](../src/app/layout.tsx): un pequeño script en línea aplica
las preferencias de accesibilidad **antes del primer pintado** (para evitar
parpadeos). Ese script interpola la constante `A11Y_STORAGE_KEY`, pero la
importaba desde el *store* de accesibilidad, un módulo marcado con `'use client'`.
Al compilarse en el servidor, esa constante se sustituye por un "stub" de
referencia de cliente que se serializa como el texto
`function(){throw Error("…It's not possible…")}`. Ese texto tiene un apóstrofo
sin escapar dentro de una cadena con comillas simples → **error de sintaxis**
(`missing ) after argument list`).

---

## Intuición

Imagina que el HTML es un escenario de teatro ya montado, y los scripts en línea
son los **tramoyistas** que encienden las luces y hacen que los actores se
muevan. La CSP `script-src 'self'` era un portero que **no dejaba entrar a
ningún tramoyista** que no viniera con credencial de archivo externo. Resultado:
el escenario está montado (el HTML existe), pero **nadie enciende las luces**.

¿Y por qué la pantalla quedaba *completamente* en blanco y no solo "sin
interactividad"? Porque casi todo el contenido está envuelto en el componente
`Reveal` (Framer Motion), que renderiza su estado inicial con `opacity: 0` y lo
anima a `opacity: 1` **al hidratarse**. Sin tramoyistas, la animación nunca
corre y todo se queda invisible.

> 🧪 **Ejemplo concreto:** al abrir `/` en un navegador real con la CSP vieja, la
> consola mostraba 20+ mensajes `Refused to execute inline script …` y la
> captura de pantalla era un rectángulo blanco. Tras el arreglo, la misma página
> muestra el *hero*, las convocatorias destacadas, "Cómo postular", los
> compromisos y el CTA.

La solución conceptual: **dejar entrar a los tramoyistas de Next**. La forma más
compatible con generación estática y con Vercel es permitir `'unsafe-inline'` en
`script-src`. Mantenemos cerradas las puertas realmente peligrosas
(`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`).

---

## Código

### 1. Arreglo de la CSP (la causa raíz)

`src/core/security/headers.mjs`:

```js
// Antes (producción): bloqueaba todo script en línea → página en blanco
'script-src': ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])],

// Después: se autorizan los scripts en línea de Next (bootstrap + streaming)
'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
```

Actualicé además el comentario para explicar por qué `'unsafe-inline'` es
necesario y por qué el enfoque de *nonce* (que obligaría a render dinámico en
todas las rutas) no encaja con un portal mayormente estático.

### 2. Arreglo del bootstrap de accesibilidad (error de sintaxis)

Moví la constante a su **propio módulo sin `'use client'`** para que sea segura
tanto en cliente como en servidor:

```ts
// src/features/accessibility/state/storage-key.ts  (NUEVO, sin 'use client')
export const A11Y_STORAGE_KEY = 'bdp.a11y.v1';
```

```ts
// accessibility-store.ts  → ahora importa y re-exporta la constante
import { A11Y_STORAGE_KEY } from './storage-key';
export { A11Y_STORAGE_KEY };
```

```ts
// layout.tsx  → importa desde el módulo server-safe
import { A11Y_STORAGE_KEY } from '@/features/accessibility/state/storage-key';
```

El script en línea del `<head>` ahora se emite correctamente como
`localStorage.getItem('bdp.a11y.v1')`.

### 3. Mejora visual (Liquid Glass + movimiento + layout)

En `src/app/globals.css`:

- **Layout más ancho:** `.container-page` pasa de `max-width: 80rem` a `90rem`,
  con *padding* lateral fluido `clamp(1rem, 5vw, 4rem)` para conservar márgenes
  generosos en pantallas anchas sin ocupar toda la pantalla.
- **Fondo ambiental con vida:** dos orbes de luz difusa que derivan lentamente
  (`ambient-drift-a/b`), puro CSS, desactivados bajo *reduced motion* y *reduced
  transparency*.
- **Sheen especular** (`.glass-sheen`): un reflejo que recorre las superficies
  premium (hero, CTA).
- **Superficies interactivas** (`.glass-interactive`): elevación al pasar el
  cursor + un barrido de luz; con *transition* desactivada bajo *reduced motion*.
- **Titular con degradado animado** (`.text-gradient-animated`) y un halo suave.

Estas clases se aplicaron de forma quirúrgica en la landing
([`page.tsx`](../src/app/(public)/page.tsx)) y en las tarjetas de convocatoria
([`JobCard.tsx`](../src/features/jobs/components/JobCard.tsx)).

> ♿ **Todo respeta la accesibilidad:** cada efecto está detrás de
> `:not([data-motion='reduced'])` y/o `[data-transparency='reduced']`, los mismos
> interruptores que ya controla el centro de accesibilidad.

---

## Verificación

Todo se validó de forma automatizada y con un navegador real (Chromium vía
Playwright), en modo **mock** (sin credenciales).

- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — sin advertencias.
- ✅ `npm run test` — **43** pruebas en verde.
- ✅ `npm run build` — compila; las páginas siguen siendo estáticas.
- ✅ **Navegador real:** `/` ya **no** queda en blanco; **0** errores en consola
  (antes: 20+ `Refused to execute inline script`).
- ✅ **axe-core** (WCAG 2.2 AA) en `/`, `/jobs`, `/jobs/BDP-CRE-001`,
  `/accessibility`, `/login`, `/register`: **0** violaciones serias/críticas.
- ✅ **Interacción:** el centro de accesibilidad cambia tema (claro/oscuro),
  aumenta el tamaño de texto y activa *movimiento reducido* correctamente.

### QA manual sugerido

1. `npm install && npm run build && npm run start`, abre `http://localhost:3000`.
2. Verifica que la landing carga con contenido (no en blanco) y sin errores en la
   consola del navegador (F12).
3. Abre el **centro de accesibilidad** (botón inferior derecho) y cambia a tema
   **Oscuro**; confirma buen contraste. Activa **movimiento reducido** y confirma
   que los orbes/sheen se detienen.
4. Redimensiona a ~1920px de ancho: el contenido ocupa más pantalla pero conserva
   márgenes; a ~375px, la navegación colapsa en el menú móvil.
5. Pasa el cursor por una tarjeta de convocatoria: debe elevarse con un barrido
   de luz.

> 🌐 **Nota sobre imágenes:** en el entorno de prueba, `images.unsplash.com` está
> bloqueado por egress de red, así que las fotos salen vacías en las capturas.
> En Vercel/producción cargan con normalidad (el host ya está en
> `next.config.mjs` y en `img-src`).

---

## Alternativas

Consideré otra forma **ortogonal** de resolver el bloqueo de scripts:

| ✅ Ventajas — CSP con *nonce* vía middleware | ⚠️ Desventajas — CSP con *nonce* vía middleware |
| --- | --- |
| CSP más estricta (sin `'unsafe-inline'`), mejor defensa ante XSS | Obliga a **render dinámico** en todas las rutas: se pierde la generación estática |
| Es el patrón "oficial" recomendado por Next.js | Peor rendimiento/coste (cada visita re-renderiza en el servidor) |
| El *nonce* se propaga automáticamente a los scripts de Next | Más piezas móviles: middleware, *matcher*, y riesgo de fugas si no se aplica en todos lados |

Elegí `'unsafe-inline'` porque el portal es **mayormente estático** y la
prioridad es que funcione al 100% en Vercel con buen rendimiento; el modelo de
amenaza (MVP en mock, sin datos sensibles reales todavía) no justifica sacrificar
la estática. La ruta del *nonce* queda documentada como evolución futura cuando
se conecte el backend real.

---

## Personas sugeridas para consultar

- **AlexD5427** (propietario del repositorio): fusionó la base del proyecto y es
  quien tiene el contexto de producto y despliegue. Es la referencia principal
  para decisiones sobre CSP/seguridad y sobre el alcance visual.

> ℹ️ El grueso del código nació de un único *commit* de base generado por IA
> ("feat: foundation…"), por lo que **no hay múltiples autores humanos** con
> conocimiento distribuido de estos archivos: la persona con más contexto es el
> propietario del repo.

---

## Cuestionario

<details>
<summary><strong>1. ¿Por qué la página se veía completamente en blanco y no solo "sin interactividad"?</strong></summary>

- **A.** Porque faltaban las imágenes de Unsplash.
- **B.** Porque el contenido está envuelto en `Reveal` (opacity 0 → 1) y, sin hidratación, nunca se hace visible. ✅
- **C.** Porque el CSS no cargaba.
- **D.** Porque el servidor devolvía 500.

**Explicación:** el HTML del servidor sí contenía el contenido, pero `Reveal`
arranca en `opacity: 0` y anima al hidratar. La CSP bloqueaba los scripts, no
había hidratación, y todo quedaba invisible (A y C son incorrectas: las imágenes
y el CSS son independientes; D es incorrecta: el servidor respondía 200).
</details>

<details>
<summary><strong>2. ¿Qué directiva de CSP causaba el bloqueo?</strong></summary>

- **A.** `img-src`
- **B.** `style-src`
- **C.** `script-src 'self'` sin `'unsafe-inline'`/nonce/hash. ✅
- **D.** `frame-ancestors 'none'`

**Explicación:** `script-src` controla la ejecución de scripts; al ser solo
`'self'` rechazaba los `<script>` en línea de Next. `style-src` ya tenía
`'unsafe-inline'`; `img-src` y `frame-ancestors` no afectan la ejecución de JS.
</details>

<details>
<summary><strong>3. ¿Por qué el bootstrap de accesibilidad lanzaba "missing ) after argument list"?</strong></summary>

- **A.** Un punto y coma faltante.
- **B.** `A11Y_STORAGE_KEY` venía de un módulo `'use client'` y en el servidor se serializó como un stub con un apóstrofo sin escapar. ✅
- **C.** `localStorage` no existe en el servidor.
- **D.** El JSON estaba corrupto.

**Explicación:** importar una constante desde un módulo cliente hace que el
build la reemplace por una referencia de cliente; su texto contenía `It's` con
apóstrofo dentro de una cadena `'...'`, rompiendo la sintaxis. La solución fue
moverla a un módulo neutral (sin `'use client'`).
</details>

<details>
<summary><strong>4. ¿Por qué no se eligió la CSP con nonce vía middleware?</strong></summary>

- **A.** Porque no funciona en Next.js.
- **B.** Porque obligaría a render dinámico en todas las rutas y se perdería la estática/rendimiento. ✅
- **C.** Porque es menos segura.
- **D.** Porque Vercel no soporta middleware.

**Explicación:** el nonce es por-petición, lo que fuerza a renderizar dinámico
cada ruta. Para un portal mayormente estático, eso perjudica rendimiento y coste.
Es *más* seguro (por eso queda como evolución futura), y sí funciona en Next y en
Vercel (A, C y D son incorrectas).
</details>

<details>
<summary><strong>5. ¿Cómo se garantiza que las nuevas animaciones no perjudican la accesibilidad?</strong></summary>

- **A.** Se desactivan en móvil.
- **B.** Están detrás de `:not([data-motion='reduced'])` y `[data-transparency='reduced']`, controlados por el centro de accesibilidad. ✅
- **C.** Usan `!important`.
- **D.** No se puede garantizar.

**Explicación:** cada efecto (orbes, sheen, hover, degradado animado) se apaga
cuando el usuario pide movimiento/transparencia reducidos, reutilizando los
mismos atributos del sistema de accesibilidad ya existente. axe-core confirmó 0
violaciones serias.
</details>
