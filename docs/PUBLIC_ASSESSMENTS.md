# Módulo público de evaluaciones — cómo funciona y cómo se retira

> **Alcance.** Un candidato **sin cuenta y sin sesión** abre `/evaluaciones`, se
> identifica con su **número identificador** (`CarnetDeIdentidad-N.ºdeProceso-Año`),
> responde la evaluación que le asignó el equipo de Talento Humano y la envía al Web
> App de Apps Script del ATS, que la califica y la registra en Google Sheets.
>
> Es un módulo **temporal, aislado y desechable**. No reemplaza ni modifica el motor
> autenticado de `(candidate)/candidate/assessments`. Vive en carpetas propias, no
> pasa por `DataProvider` y nada fuera de él lo importa salvo su ruta — hay una
> prueba que lo verifica.

---

## 1 · Cómo retirar el módulo

Cuando llegue el acceso con Google, el módulo entero sale en un commit:

```bash
rm -rf src/features/public-assessments
rm -rf 'src/app/(public)/evaluaciones'
rm e2e/public-assessments.spec.ts
```

Y después, tres retoques de una línea cada uno:

| Archivo | Qué quitar |
| --- | --- |
| `src/shared/components/PublicNavbar.tsx` | la entrada `{ href: '/evaluaciones', … }` |
| `src/features/shell/components/Dock.tsx` | la celda «Evaluaciones» |
| `src/features/landing/components/LandingView.tsx` | la tarjeta «¿Recibiste un código?» |

Opcionalmente, en `src/core/config/env.ts` y `src/core/security/headers.mjs`: la
variable `NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL` y los dos orígenes de
`script.google.com` en `connect-src`, si ninguna otra parte los usa.

No hay que tocar el ATS, ni migrar datos, ni desmontar nada del libro de cálculo.

---

## 2 · Por qué la iteración anterior no funcionaba

Merece un apartado porque la causa **no** era de red ni de configuración, y el
síntoma no la señalaba.

El módulo anterior se escribió contra una versión del backend de Evaluaciones que ya
no existe. La PR #19 del ATS lo eliminó completo (−34 775 líneas) y lo reconstruyó
desde cero. El contrato cambió por entero:

| | Antes (módulo retirado) | Ahora (backend 2.0.0) |
| --- | --- | --- |
| Envoltorio | `{ ok, requestId, data, error:{code,message,details}, warnings }` | `{ ok, accion, solicitudId, datos, error:{codigo,mensaje,pista,detalle,traza}, avisos, meta }` |
| Cuerpo | `{ action, requestId, payload }` | `{ accion, solicitudId, cliente, payload }` |
| Abrir | `getPublicAssessment { publicCode }` | `openAssessment { codigo }` |
| Empezar | `startAttempt { publicCode, participant:{name,document} }` | `startAttempt { codigo, participante:{nombre,documento}, procesoId }` |
| Progreso | *no existía* | `saveProgress` |
| Reloj | del cliente | `heartbeat`, del servidor |
| Tipos | 54 «familias de control» inventadas aquí | los 39 tipos del servidor |
| Reanudar | borrador en `sessionStorage` | el servidor devuelve el intento en curso |

Ninguna llamada del módulo anterior podía funcionar: el servidor respondía
`UNSUPPORTED_ACTION` a acciones con nombres que ya no existían, y el cliente
intentaba leer `data` de una respuesta que traía `datos`. Parchear eso no tenía
sentido; había que reescribirlo contra el contrato real.

---

## 3 · El número identificador

**Formato:** `CarnetDeIdentidad-N.ºdeProceso-Año`. Por ejemplo `1234567-12-2026` o
`8765432LP-4-2026`.

Identifica **a la persona dentro de un proceso**, no la evaluación. Se acepta con
espacios, en minúsculas y con guiones tipográficos; se normaliza a mayúsculas sin
espacios y los ceros a la izquierda del proceso se descartan (`04` y `4` son el
mismo proceso).

### Dónde acaba cada parte, en la hoja de cálculo

| Parte | Viaja como | Columna de `Intentos` | ¿Siempre? |
| --- | --- | --- | --- |
| Carnet | `participante.documento` | `participante_documento` | Sí |
| Número completo | `procesoId` (raíz del payload) | **`proceso_id`** | **Sí** |
| Número completo | `participante.proceso` | `participante_json` | Solo si el autor activó el campo «Proceso» |
| Año | — | — | Va dentro del número completo |

La columna `proceso_id` es la garantía: `evStartAttempt_` la escribe siempre, sin
depender de ninguna configuración. El campo `proceso` es redundante a propósito, para
que el número aparezca junto al resto de los datos del participante cuando el autor
activa ese campo.

El **carnet** es además la clave con la que el backend reconoce a quien vuelve
(retoma su intento en curso) y con la que aplica el límite de intentos.

### Y el código de la evaluación

Sigue existiendo, porque el backend lo necesita para saber **qué** prueba abrir: un
mismo proceso puede tener varias evaluaciones. La resolución hace que el problema
desaparezca en la práctica:

- **Con el enlace de la invitación** (`/evaluaciones?codigo=EV-XXXX-1234`), que es el
  camino normal: sólo se pide el número identificador y el nombre.
- **Sin enlace**: se pide también el código, con su etiqueta explicando de dónde
  sale. Ocultarlo dejaría un callejón sin salida.

Se aceptan `?codigo=`, `?code=` y `?c=`.

---

## 4 · Contrato utilizado

Fuente de verdad: **`docs/evaluaciones/CONTRATO_FRONTEND.md`** del ATS
(`AlexD5427/Claude-bdp`), backend **2.0.0**, esquema de hojas **2**, snapshot **2**,
texto enriquecido **1**. Ese repositorio **no se modificó**.

Cinco acciones, todas públicas (`EV_PUBLIC_ACTIONS`), ninguna con llave de
administración:

| Acción | Tipo | Payload | Para qué |
| --- | --- | --- | --- |
| `openAssessment` | lectura | `{ codigo }` | Portada. **No trae preguntas.** |
| `startAttempt` | escritura | `{ codigo, participante, procesoId, consentimiento, zonaHoraria, agenteUsuario }` | Crea o **retoma** el intento y entrega la prueba |
| `heartbeat` | lectura | `{ intentoId, token }` | Sincroniza el reloj del servidor |
| `saveProgress` | escritura | `{ intentoId, token, respuestas, eventos }` | Autoguardado |
| `submitAttempt` | escritura | `{ intentoId, token, respuestas, eventos, automatico }` | Cierra y califica |

### Transporte · tres reglas que no se pueden relajar

Implementadas en un solo sitio (`api/transport.ts`) y verificadas en
`api/transport.test.ts`:

1. **`redirect: 'follow'`** en toda petición. Google contesta `302` y el cuerpo vive
   detrás de la redirección; sin seguirla, la llamada falla con un `404`
   desconcertante.
2. **`Content-Type: text/plain;charset=utf-8`** en el `POST`. Un Web App no puede
   contestar el *preflight* de CORS que dispararía `application/json`. El cuerpo sigue
   siendo JSON; sólo cambia la etiqueta.
3. **Un `solicitudId` único por intención, y el MISMO al reintentar.** Es el único
   mecanismo de idempotencia que existe.

Además: `credentials: 'omit'` (es un tercero), `cache: 'no-store'`, timeout de 15 s en
lecturas y 45 s en escrituras (`submitAttempt` califica la prueba completa dentro de
la petición).

**Reintentos:** las lecturas se reintentan con retroceso (600/1400 ms); las escrituras
**nunca** de forma automática. Un error de negocio (`ok: false`) es una respuesta
válida y no se reintenta.

### El caso que rompía el módulo anterior, y sigue vigente

> [!IMPORTANT]
> Cuando el servidor reconoce un `solicitudId` ya procesado,
> `19_Router.gs → evWithLock_` **no vuelve a ejecutar la acción**: devuelve
> `{ repetida: true, referencia, procesadoEn, resumen }` con el aviso
> `SOLICITUD_REPETIDA`. Ese cuerpo **no tiene la forma del comprobante**, así que un
> cliente que sólo conozca el caso feliz trata un reintento legítimo como respuesta
> malformada — justo el camino de un candidato con red inestable, que es el que más
> necesita que funcione.

Este módulo acepta las dos formas en las tres escrituras, y cada una hace lo correcto:

- **`submitAttempt`**: construye un comprobante honesto con la referencia y el estado
  del `resumen`. **No inventa una nota**: mostrar un cero porque el campo no vino
  sería decirle a alguien que sacó 0 por un problema de red.
- **`startAttempt`**: el intento existe pero la respuesta no sirve para empezar. Se
  pide un `solicitudId` **nuevo** y se vuelve a llamar; el backend encuentra el intento
  en curso por documento y lo retoma. Reintentar con el mismo identificador devolvería
  la misma repetición para siempre.
- **`saveProgress`**: devuelve un resultado neutro. Lo guardado sigue guardado, y
  mostrar un error por algo que salió bien alarma sin motivo.

---

## 5 · El reloj es del servidor

`startAttempt` calcula el límite con la hora del servidor. El navegador sólo cuenta
hacia atrás para mover los dígitos, y cada `heartbeat` (cada 20 s) y cada
`saveProgress` **corrigen** la cuenta local con la verdad.

Consecuencias: cambiar la hora del equipo no regala tiempo, recargar tampoco,
suspender el portátil no congela el reloj (al volver, el primer latido pone la verdad)
y una pestaña en segundo plano —cuyos temporizadores el navegador ralentiza a
propósito— se resincroniza al volver.

Al llegar a cero, el formulario se congela y se envía **una sola vez**, marcado como
automático. Sin duración configurada no se muestra ningún contador y no se llama al
latido: nunca se inventa un límite.

---

## 6 · Progreso y reanudación

El progreso vive **en el servidor**. `saveProgress` se llama con el intervalo que el
autor configuró (20 s por omisión) y al cambiar de página. Es idempotente por
pregunta (`evAnswerId_` es determinista), así que se manda el cuestionario completo en
cada guardado en lugar de llevar la cuenta de qué cambió: la contabilidad de deltas es
exactamente donde se pierden respuestas.

**Reanudar** es volver a escribir el número identificador. `startAttempt` devuelve
`retomado: true` con el mismo `intentoId`, el tiempo restante real y las
`respuestasPrevias`. Por eso este módulo **no guarda el token del intento** en ningún
sitio: es una credencial, y guardarla permitiría reanudar sin identificarse en un
equipo compartido.

El borrador local (`state/draft.ts`) sólo cubre la ventana entre dos guardados:
`sessionStorage` (muere con la pestaña), acotado por versión publicada, caduca a las
6 h, se borra al enviar, y **no guarda nombre, carnet ni token**.

---

## 7 · Tipos de pregunta

El runner es genérico sobre los **39 tipos** del catálogo del servidor
(`08_Types.gs`), agrupados por su **forma de valor** (`expects`) y no por familias
inventadas aquí. `domain/question-types.test.ts` compara el catálogo local con la
lista del contrato: si el ATS añade un tipo y aquí falta, la suite falla.

| Forma | Tipos | Qué se envía |
| --- | --- | --- |
| `opcion` | `opcion_unica`, `desplegable`, `verdadero_falso`, `si_no_na`, `casilla_aceptacion`, `opcion_imagen` | `{ opciones: ["op_a"] }` |
| `opciones` | `opcion_multiple` | `{ opciones: ["op_a","op_b"] }` |
| `texto` | `texto_corto`, `texto_largo`, `correo`, `telefono`, `enlace`, `codigo` | `{ valor: "texto" }` |
| `numero` | `numero`, `decimal`, `porcentaje`, `moneda`, `duracion` | `{ valor: 1250.5 }` — número, no cadena |
| `escala` | `escala_lineal`, `estrellas`, `deslizador` | `{ valor: 4 }` |
| `fecha` / `hora` | `fecha`, `hora`, `fecha_hora` | `{ valor: "2026-07-30" }` |
| `matriz` | `cuadricula_opcion`, `likert` | `{ valor: { "op_fila": "Alto" } }` — la **etiqueta** de columna |
| `matriz` múltiple | `cuadricula_casillas` | `{ valor: { "op_fila": ["A","B"] } }` |
| `orden` | `ordenar` | `{ valor: ["op_3","op_1"] }` — el orden elegido |
| `emparejamiento` | `emparejar` | `{ valor: { "op_a": "su pareja" } }` |
| `clasificacion` | `clasificar` | `{ valor: { "op_a": "Grupo A" } }` |
| `huecos` | `rellenar_huecos` | `{ valor: { "h1": "corriente" } }` |
| `archivo` | `archivo_enlace` | `{ valor: "https://…" }` |
| `ninguno` | los 7 `contenido_*` | nada |

Un tipo que el ATS añada y este módulo no conozca muestra un aviso honesto, no cuenta
para el progreso y **no bloquea el envío**: el candidato no puede arreglar un
desajuste entre dos despliegues.

### Dos detalles que parecen menores y no lo son

- En **matriz** el valor es la **etiqueta** de la columna, no un índice ni un id: el
  calificador compara con `claveEmparejamiento`, que el autor escribe como texto de
  columna. Mandar un índice produciría siempre una respuesta incorrecta y nadie lo
  notaría hasta ver las notas.
- En **ordenar** el orden inicial es exactamente el que llegó del servidor, que ya
  viene mezclado de forma determinista por intento. Reordenarlo en el cliente
  cambiaría la prueba al recargar la página.

### Mejoras sobre el runner de referencia del ATS

- **Huecos en línea.** Los campos se dibujan dentro de la frase, donde estaban los
  `___`, en lugar de una lista de «Hueco 1 / Hueco 2» al pie. Las claves siguen siendo
  `h1…hn` en orden de aparición, **idénticas** a las del ATS: si los dos runners
  numeraran distinto, la misma respuesta se calificaría de forma distinta según por
  dónde entró el candidato.
- **Emparejar con desplegable.** Las parejas correctas viven en `claveEmparejamiento` y
  el servidor no las publica, así que el ATS cae en un campo de texto libre. Aquí, si
  el autor rellenó `configuracion.grupos`, se ofrece un desplegable; si no, texto
  libre igual que el ATS.
- **Cuadrículas responsivas.** Tabla con encabezados asociados en escritorio; tarjetas
  apiladas por debajo de `sm`. Una tabla de cinco columnas con desplazamiento
  horizontal en un móvil es una forma fiable de marcar la celda equivocada.

---

## 8 · Interfaz y diseño

Todo el módulo se construye **sobre** el Liquid Glass del portal (`.glass`,
`--glass-*`, `--shadow-glass-*`), no en paralelo. Lo propio vive en
`assessment.css`, junto al módulo, para que desaparezca con él.

- **Acento del autor.** `tema.acento` (los seis de `EV_ACENTOS`) se aplica como
  atributo en la raíz y el CSS deriva de ahí el aro del reloj, las opciones elegidas,
  el canto de las tarjetas y el sello del comprobante. Sin condicionales repartidos.
- **Aurora de fondo** propia, más presente que el `ambient-bg` del portal, porque una
  evaluación es una sesión de trabajo de media hora.
- **Barra de mando fija** con aro de temporizador (SVG, `stroke-dashoffset`, cambia de
  tono a los 5 min y al último minuto), medidor de progreso y estado del autoguardado.
- **Navegador de preguntas**: pastillas numeradas con tres estados. Se salta a una
  pregunta y **el foco viaja con la vista**.
- **Canto de luz** en cada tarjeta: sin responder · respondida · obligatoria
  pendiente. Permite recorrer una página larga sin leer.
- **Controles**: área de toque de fila completa, indicador con muelle, barrido de luz,
  control segmentado con realce que se desliza (`layoutId`), estrellas con vista
  previa, deslizador con marcador en vivo, ordenar con arrastre **y** botones.
- **Comprobante** con sello animado (trazo dibujado con CSS) e identificador copiable.

Todo respeta `[data-motion='reduced']`, `[data-transparency='reduced']` y
`[data-contrast='high']`, igual que el resto del portal. **Ningún estado se comunica
sólo con color**: lo respondido lleva marca, lo pendiente icono, y el reloj crítico
texto además de tono.

---

## 9 · Integridad

El backend nuevo **sí** admite el rastro de integridad, así que este módulo lo
conecta — era la limitación reconocida nº 1 de la iteración anterior.

Se registra: visibilidad de la pestaña, foco de la ventana, copiar, cortar, pegar
(**sólo la longitud**), menú contextual, intento de imprimir, pantalla completa,
redimensionado, navegación, inactividad e intentos de salir. Y el tiempo por pregunta,
atribuido a la pregunta que **tiene el foco** (con navegación libre están todas
visibles a la vez; repartir el tiempo entre todas no diría nada).

**No** se usa cámara, micrófono, pantalla, biometría, huella del dispositivo ni
detección de VPN. No se lee el contenido del portapapeles.

Se **anuncia antes de empezar**, con la lista literal de lo que se registra. Dos
razones, y la segunda es la que manda: una vigilancia silenciosa no es aceptable, y
una que no se anunció **no sirve como evidencia** en un proceso impugnable.

La cola de eventos se **reserva** al enviar y se confirma cuando el servidor acepta
(`tomarLote` / `confirmarLote` / `devolverLote`). Vaciarla al leer parecía más simple y
perdía los eventos exactos de la petición que se cayó, que son los del momento
interesante. El servidor deduplica por número de secuencia.

---

## 10 · Seguridad y privacidad

- **La clave de respuestas no sale del servidor.** La primera defensa es
  `13_Public.gs` (lista blanca campo por campo). La segunda es
  `quitarClavesProhibidas()`, que borra recursivamente `correcta`,
  `claveEmparejamiento`, `respuestaEsperada`, `modoPuntaje`, `puntajeAprobacion`,
  `retroalimentacion`, `notasInternas` y quince más **antes** de validar el DTO. Existe
  porque el portal no controla qué versión del script está desplegada. Una fuga se
  registra como defecto del backend con los **nombres** de las claves, nunca sus
  valores.
  - `puntos` **no** está en la lista: es el peso de la pregunta, no la clave, y el
    backend lo publica a propósito.
- **El cliente no puede enviar una nota.** `RespuestaEnviada` no tiene campos de
  calificación. No es una omisión: es una garantía en tiempo de compilación.
- **Sin inyección de HTML.** Ni `dangerouslySetInnerHTML`, ni `innerHTML`, ni `eval`,
  ni `new Function` en todo el módulo. El modelo de texto enriquecido se diseñó para
  que renderizarlo fuera seguro sin sanear nada; los enlaces se filtran a `http`,
  `https` y `mailto` en la frontera de red.
- **Sin superficie administrativa.** Las veintidós acciones de `EV_ADMIN_ACTIONS` no
  se nombran en ningún archivo, y ninguna llamada lleva `llaveAdmin`.
- **Datos personales.** El nombre y el carnet viven en estado de componente y viajan
  sólo en `startAttempt`. No van a la URL, ni al almacenamiento del navegador, ni a una
  línea de registro (`logger` además redacta por nombre de clave). El campo del
  documento lleva `autocomplete="off"`: en un equipo compartido, el autocompletado lo
  ofrecería a la siguiente persona.
- **CSP.** `connect-src` incluye los **dos** orígenes de Google —`script.google.com` y
  `script.googleusercontent.com`— porque la política se aplica también al destino del
  `302`. Omitir el segundo produce una petición bloqueada que parece un corte de red.
  Sin comodines.

`security.test.ts` comprueba todo lo anterior **leyendo el código fuente**, así que
una regresión en un archivo nuevo falla igual que en uno viejo.

---

## 11 · Configuración

| Variable | Obligatoria | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL` | sí, en producción | URL del Web App de **Evaluaciones**, terminada en `/exec` |

Es pública a propósito: no contiene ningún secreto y sólo sirve las cinco acciones
saneadas. Conserva el nombre que ya tenía, así que quien la configuró no tiene que
volver a hacerlo.

`api/endpoint.ts` clasifica el valor **antes** de usarlo y nombra la variable en el
diagnóstico: falta, no es absoluta, no es `https`, parece administrativa, no termina en
`/exec`, o apunta a un despliegue `/dev` en producción. Un endpoint equivocado no se
«intenta de todos modos», porque el error de red resultante manda a buscar el problema
donde no está.

### Modo demostración

Sin endpoint **y** con `NEXT_PUBLIC_DATA_MODE=mock` (+ `NEXT_PUBLIC_ENABLE_MOCKS`), el
módulo usa `api/demo.ts`, que habla el mismo contrato: mismo reloj de servidor, misma
reanudación por documento, mismas repeticiones idempotentes. La interfaz lo **anuncia
de forma permanente**. Fuera de ese caso, sin endpoint se muestra un error de
configuración: nunca se finge un envío correcto.

La demostración **no califica**: el servidor es la única autoridad de notas y duplicar
sus reglas crearía una segunda verdad que se desincroniza en la primera semana.

| Código | Para qué |
| --- | --- |
| `EV-DEMO-2026` | Evaluación completa: cubre las catorce formas de respuesta |
| `EV-DEMO-REINT` | Falla el **primer** envío a propósito, para ejercitar el reintento |
| `EV-DEMO-PAUSA` | Evaluación pausada: pantalla de indisponibilidad transitoria |

---

## 12 · Cómo probarlo

### En local, sin configurar nada

```bash
npm install
npm run dev
# http://localhost:3000/evaluaciones?codigo=EV-DEMO-2026
```

### Contra el Apps Script real

1. En `.env.local`:

   ```bash
   NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
   ```

2. Comprueba el despliegue antes de abrir el navegador:

   ```bash
   curl -sL "$NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL?accion=ping"
   ```

   Debe responder `{"ok":true,…,"datos":{"servicio":"evaluaciones","version":"2.0.0",…}}`.
   Si responde HTML de inicio de sesión, el despliegue todavía no es público.

3. `npm run dev`, abre `/evaluaciones?codigo=<CÓDIGO>` con una evaluación
   **publicada** en el ATS y completa el flujo.
4. Verifica en el libro: una fila en `Intentos` con `estado = enviado`,
   `participante_documento` = tu carnet y **`proceso_id`** = tu número identificador
   completo; una fila por respuesta en `Respuestas`; y los eventos en `Integridad`.

### Comprobaciones

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e:install   # una vez
npx playwright test e2e/public-assessments.spec.ts
```

---

## 13 · Limitaciones reconocidas

1. **Las claves de los huecos se infieren.** `respuestaEsperada.huecos[].clave` no se
   publica (revelarlo sería revelar la estructura de la respuesta), así que se numeran
   `h1…hn` por orden de aparición de los `___`. Es **exactamente** lo que hace el
   runner del ATS, y por eso las dos vías califican igual. Si el autor define claves
   con otro nombre, la pregunta queda para revisión manual en lugar de puntuar mal.
2. **`emparejar` sin `grupos`** cae en texto libre, porque el servidor no publica las
   parejas posibles. Es una limitación del contrato, no de la interfaz.
3. **Una cuadrícula sin columnas** no se puede responder: se muestra un aviso en lugar
   de inventar un formato que nadie podría revisar.
4. **Un tipo desconocido** se señala y no bloquea (§7).
5. **Ramificación (`reglas`) no implementada.** El backend guarda reglas de salto pero
   no las aplica en la proyección pública, así que el runner presenta todas las
   preguntas. Documentado, no olvidado.
6. **i18n parcial.** El interior del runner está en español, igual que el runner
   autenticado que ya existía. Los accesos (barra, dock, portada) sí están en las
   cuatro locales. `docs/I18N.md` ya reconoce que quechua y aymara cubren el núcleo de
   alta visibilidad.
7. **Depende de que el despliegue del Web App sea accesible «para cualquier
   persona».** Si el ATS lo cambia, el diagnóstico lo dice, pero el candidato sólo verá
   que la evaluación no está disponible.
