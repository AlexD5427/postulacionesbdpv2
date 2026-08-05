# Documento explicativo — evaluaciones públicas sin login

> Se elimina por completo el módulo temporal público de evaluaciones y se reconstruye
> desde cero contra el contrato real del backend de Evaluaciones del ATS. Incluye el
> rediseño de la interfaz y la corrección de siete defectos que sólo aparecieron al
> probar en un navegador de verdad.

---

## Contexto

### Para quien llega nuevo (puede saltarse si ya conoce el sistema)

El sistema de reclutamiento del Banco de Desarrollo Productivo tiene **dos frentes web
y un almacén compartido**:

| Pieza | Repositorio | Quién la usa |
| --- | --- | --- |
| ATS de reclutamiento | `AlexD5427/Claude-bdp` | El equipo de Talento Humano: crea evaluaciones, las publica y revisa resultados |
| Portal de postulantes | `AlexD5427/postulacionesbdpv2` | Las personas candidatas |
| Backend de Evaluaciones | Apps Script sobre un libro de Google Sheets | Ninguna persona directamente: es la autoridad |

El backend de Evaluaciones no es un servidor convencional. Es un **Web App de Google
Apps Script** publicado desde el propio libro de cálculo, y esa elección impone tres
reglas de transporte que no se pueden negociar:

1. Google contesta `302` a toda llamada y el cuerpo vive **detrás** de la redirección:
   hay que seguirla.
2. Un Web App no puede contestar el *preflight* de CORS que dispara
   `application/json`, así que el `POST` viaja con
   `Content-Type: text/plain;charset=utf-8` aunque el contenido sea JSON.
3. No hay transacciones: la idempotencia la aporta el cliente con un identificador de
   solicitud por intención.

El reparto de responsabilidades es tajante y conviene tenerlo presente para leer el
resto: **el servidor decide todo lo que importa**. Calcula la nota, decide el estado
del intento, es dueño del reloj y jamás entrega la clave de respuestas al navegador. El
portal dibuja y recoge.

### El contexto específico de este cambio

En julio, el ATS **borró su módulo de evaluaciones completo y lo reescribió desde
cero** (PR #19: 213 archivos y 34 775 líneas eliminadas). No fue una refactorización:
cambiaron el envoltorio de las respuestas, los nombres de todas las acciones, el idioma
de los campos y el modelo de datos.

El portal de postulantes tenía, desde antes, un módulo temporal para que un candidato
**sin cuenta** pudiera rendir una evaluación (PR #4). Ese módulo se escribió contra el
backend anterior. Cuando el anterior dejó de existir, el módulo dejó de funcionar por
completo.

Este cambio lo reconstruye.

---

## Intuición

### El módulo no estaba roto: estaba hablando otro idioma

Es tentador leer «la lectura de evaluaciones no funciona» como un problema de red, de
permisos del despliegue o de una variable mal puesta. No lo era. El cliente y el
servidor tenían **contratos incompatibles de principio a fin**.

> [!IMPORTANT]
> **El diagnóstico, en una tabla.** No había ni una sola llamada que pudiera funcionar.

| | Módulo retirado | Backend 2.0.0 |
| --- | --- | --- |
| Cuerpo | `{ action, requestId, payload }` | `{ accion, solicitudId, cliente, payload }` |
| Respuesta | `{ ok, data, error:{code,message} }` | `{ ok, datos, error:{codigo,mensaje,pista,traza}, avisos, meta }` |
| Abrir | `getPublicAssessment { publicCode }` | `openAssessment { codigo }` |
| Empezar | `startAttempt { publicCode, participant:{name} }` | `startAttempt { codigo, participante:{nombre}, procesoId }` |
| Guardar progreso | *no existía* | `saveProgress` |
| Reloj | del cliente | `heartbeat`, del servidor |
| Tipos de pregunta | 54 «familias» inventadas en el portal | los 39 tipos del servidor |

El servidor respondía `UNSUPPORTED_ACTION` a nombres que ya no existían, y el cliente
intentaba leer `data` de una respuesta que traía `datos`. Parchear eso no tenía sentido.

### Lo que el backend nuevo regala, y el módulo anterior no podía aprovechar

Esta es la parte interesante: el backend reescrito **resuelve por sí solo tres de las
cuatro limitaciones** que el módulo anterior había documentado como irresolubles.

| Limitación reconocida antes | Cómo desaparece ahora |
| --- | --- |
| «Cierre por tiempo del lado del cliente» | El servidor calcula el límite y lo recalcula en cada latido y cada guardado |
| «Sin progreso en el servidor: sólo borrador local» | `saveProgress` existe y es idempotente por pregunta |
| «Sin límite de intentos: el endpoint no lo aplica» | El backend retoma el intento en curso por documento y aplica el máximo |
| «Sin telemetría de integridad» | El backend la admite, así que se conecta y **se declara antes de empezar** |

> [!NOTE]
> La lección general: cuando un contrato cambia tanto, reescribir el cliente no es sólo
> traducir nombres. Es descubrir qué se puede dejar de simular.

### El número identificador

El encargo pedía sustituir el código de la evaluación por un **número identificador**
con formato `CarnetDeIdentidad-N.ºdeProceso-Año` (por ejemplo `1234567-12-2026`).

Es un cambio pequeño con una consecuencia de diseño que merece explicarse. El número
identificador dice **quién eres y en qué proceso**; no dice **qué evaluación rindes**
—un mismo proceso puede tener varias—. El backend necesita las dos cosas.

La resolución hace que el problema desaparezca en la práctica:

- **Con el enlace de la invitación** (`/evaluaciones?codigo=EV-XXXX-1234`), que es el
  camino normal: se pide sólo el número identificador y el nombre. **Una sola cosa que
  escribir.**
- **Sin enlace**: se pide también el código, con su etiqueta explicando de dónde sale.
  Ocultarlo dejaría un callejón sin salida.

Y cada parte del número acaba donde le sirve al reclutador:

| Parte | Viaja como | Columna de la hoja `Intentos` | ¿Siempre? |
| --- | --- | --- | --- |
| Carnet | `participante.documento` | `participante_documento` | Sí |
| Número completo | `procesoId` | **`proceso_id`** | **Sí** |
| Número completo | `participante.proceso` | `participante_json` | Sólo si el autor activó el campo |

La columna `proceso_id` es la garantía: `evStartAttempt_` la escribe siempre, sin
depender de ninguna configuración. Y el **carnet** es además la clave con la que el
backend reconoce a quien vuelve y con la que aplica el límite de intentos, así que
reanudar sale gratis.

---

## Código

78 archivos, +12 776 / −5 845 líneas. El módulo entero vive en
`src/features/public-assessments/` y se retira borrando ese directorio, su ruta y tres
líneas.

### El dominio: nada de red, nada de React

`domain/contract.ts` declara el contrato **una vez**, y todo lo demás se deriva de ahí.
Así un cambio en el ATS se nota como un error de compilación y no como una pantalla en
blanco.

`domain/answers.ts` traduce el estado local a lo que el calificador espera. Dos
detalles que parecen menores y no lo son:

```ts
// En una cuadrícula el valor es la ETIQUETA de la columna, no un índice ni un id:
// el calificador compara con `claveEmparejamiento`, que el autor escribe como texto
// de columna. Mandar un índice produciría siempre una respuesta incorrecta y nadie
// lo notaría hasta ver las notas.
{ valor: { op_fila1: 'Alto' } }
```

```ts
// El cero y el `false` son respuestas válidas: `0` en una escala o en un importe es
// información. El error clásico es `if (!valor)`.
export function estaRespondida(valor: ValorRespuesta | undefined): boolean {
  if (typeof contenido === 'number') return Number.isFinite(contenido);
  if (typeof contenido === 'boolean') return true;
  // …
}
```

Y la garantía más importante del módulo es un tipo, no una comprobación:

```ts
/**
 * Este tipo **no tiene** campos de calificación, y eso es la defensa: el cliente no
 * puede enviar `correcta`, `puntosObtenidos`, `nota` ni `aprobado` ni por accidente.
 */
export interface RespuestaEnviada {
  preguntaId: string;
  opciones?: string[];
  valor?: unknown;
  segundos?: number;
}
```

### La frontera: las tres reglas en un solo sitio

```ts
const respuesta = await fetch(endpoint.url, {
  method: 'POST',
  redirect: 'follow',                                      // Regla 1: Google contesta 302
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Regla 2: sin preflight
  body: JSON.stringify(cuerpo),
  credentials: 'omit',                                     // es un tercero
  cache: 'no-store',
  signal,
});
```

Las lecturas se reintentan con retroceso; **las escrituras no se reintentan solas,
nunca**. Aunque el servidor sea idempotente, un reintento automático esconde el problema
de red que conviene ver y convierte un envío en una operación cuyo número de ejecuciones
nadie puede contar. Quien reintenta es la persona, con un botón, y el **mismo**
identificador de solicitud.

### El caso que rompía el módulo anterior, y que sigue vigente

> [!WARNING]
> **Hallazgo del backend.** Cuando el servidor reconoce un `solicitudId` ya procesado,
> `19_Router.gs → evWithLock_` **no vuelve a ejecutar la acción**: devuelve
> `{ repetida: true, referencia, procesadoEn, resumen }`. Ese cuerpo **no tiene la forma
> del comprobante**, así que un cliente que sólo conozca el caso feliz trata un
> reintento legítimo como respuesta malformada — justo el camino de un candidato con red
> inestable, que es el que más necesita que funcione.

El módulo acepta las dos formas en las tres escrituras, y cada una hace algo distinto
porque el remedio correcto es distinto:

- **`submitAttempt`**: construye un comprobante honesto con la referencia y el estado
  del resumen. Y **no inventa una nota**: mostrar un cero porque el campo no vino sería
  decirle a alguien que sacó 0 en su evaluación por un problema de red.
- **`startAttempt`**: el intento existe pero la respuesta no sirve para empezar. Se pide
  un identificador **nuevo** y se vuelve a llamar: el backend encuentra el intento en
  curso por documento y lo retoma. Reintentar con el mismo identificador devolvería la
  misma repetición para siempre.
- **`saveProgress`**: devuelve un resultado neutro. Lo guardado sigue guardado, y
  mostrar un error por algo que salió bien alarma sin motivo en mitad de una prueba
  cronometrada.

### El reloj

```ts
const sincronizar = (segundosRestantes: number | null) => {
  setRestantes((previo) => {
    if (previo === null) return segundosRestantes;
    if (segundosRestantes < previo) return segundosRestantes;
    // Nunca hacia arriba salvo corrección grande: un salto de +2 s por latencia haría
    // que el reloj pareciera ir hacia atrás y hacia delante. Más de cinco segundos sí
    // es una corrección real (el equipo estuvo suspendido) y se aplica tal cual.
    return segundosRestantes - previo > 5 ? segundosRestantes : previo;
  });
};
```

La cuenta local es **cosmética**; la autoridad es el servidor. Cambiar la hora del
equipo no regala tiempo, recargar tampoco, y una pestaña en segundo plano —cuyos
temporizadores el navegador ralentiza a propósito— se resincroniza al volver.

### Integridad, con una cola confirmable

La cola de eventos se **reserva** al enviar y se confirma cuando el servidor acepta:

```ts
tomarLote()     // devuelve una copia; NO borra
confirmarLote() // el servidor aceptó: se descartan
devolverLote()  // el envío falló: vuelven a la cola, en orden
```

Vaciarla al leer parecía más simple y perdía los eventos exactos de la petición que se
cayó, que son justo los del momento interesante. El servidor deduplica por número de
secuencia, así que reenviar es gratis.

### El diseño

Todo se construye **sobre** el Liquid Glass del portal, no en paralelo. Lo propio vive
en `assessment.css`, junto al módulo, para desaparecer con él.

- **Acento del autor.** Los seis acentos del ATS se aplican como atributo en la raíz y
  el CSS deriva de ahí el aro del reloj, las opciones elegidas, el canto de las tarjetas
  y el sello del comprobante. Sin condicionales repartidos por treinta componentes.
- **Barra de mando compacta** con aro de temporizador en SVG que cambia de tono a los
  cinco minutos y al último minuto, medidor de progreso y estado del autoguardado.
- **Canto de luz** en cada tarjeta: sin responder · respondida · obligatoria pendiente.
  Permite recorrer una página larga y ver qué falta **sin leer**.
- **Navegador de preguntas** en un panel bajo demanda, con pastillas numeradas y tres
  estados.
- **Huecos en línea**: los campos se dibujan dentro de la frase, donde estaban los
  guiones, en lugar de una lista de «Hueco 1 / Hueco 2» al pie que obliga a reconstruir
  mentalmente la correspondencia.
- **Cuadrículas responsivas**: tabla con encabezados asociados en escritorio, tarjetas
  apiladas en móvil. Una tabla de cinco columnas con desplazamiento horizontal en un
  teléfono es una forma fiable de marcar la celda equivocada.

**Ningún estado se comunica sólo con color.** Lo respondido lleva marca, lo pendiente
lleva icono y el reloj crítico lleva texto además de tono.

---

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ sin errores |
| `npm run lint` | ✅ sin advertencias |
| `npm run test` | ✅ **208** pruebas (eran 119) |
| `npm run build` | ✅ `/evaluaciones` 47,9 kB / 224 kB |
| `npx playwright test e2e/public-assessments.spec.ts` | ✅ **46/46** (Chromium + Pixel 7) |
| axe-core sobre antesala, prueba, navegador y comprobante | ✅ sin violaciones *serious* / *critical* |

### Los siete defectos que sólo aparecieron al abrir un navegador

Esta es la parte del trabajo que más conviene mirar, porque **ninguno** de estos
defectos era visible en las pruebas de componente: todos necesitaban un navegador con
disposición real, y tres de ellos, un teléfono.

> [!NOTE]
> La moraleja no es «hay que probar en un navegador». Es que las pruebas de componente
> en un DOM simulado no tienen disposición, y por lo tanto **no pueden ver nada que
> dependa de dónde están las cosas**.

1. **La barra de mando tapaba las opciones.** Apilaba título, reloj, progreso y
   navegador: unos 200 px permanentemente fijos, la quinta parte de la pantalla de un
   portátil. Al desplazarse hasta una pregunta, la barra la cubría. Se hizo compacta y
   el navegador pasó a un panel bajo demanda.
2. **La barra de mando se pintaba encima de la barra pública del portal.** Las dos son
   `sticky` y comparten capa; al ir después en el documento, ganaba la del módulo. Ahora
   se sienta a la altura de la navegación.
3. **El dock del portal tapaba el botón «Enviar la evaluación» en un móvil.** Es `fixed`
   abajo y comparte capa. Un candidato pulsaba el dock y se iba de la evaluación, o
   simplemente no podía enviar. **Sólo se ve en un teléfono.**
4. **El botón del navegador de preguntas perdía su nombre accesible por debajo de
   `sm`**, porque el texto se oculta para que la barra quepa. Se anunciaba únicamente
   como el número de pendientes.
5. **Activar «movimiento reducido» con la evaluación abierta hacía desaparecer las
   preguntas.** Las tarjetas entraban con `whileInView` desde `opacity: 0`; al cambiar
   la preferencia en caliente, el objetivo de la animación desaparecía y quedaban
   congeladas en invisible. El portal permite activarla desde el centro de
   accesibilidad, así que era alcanzable por una persona real. Ahora el estado final se
   aplica siempre, sin depender de ningún observador.
6. **Contraste insuficiente en 31 nodos.** El acento vivo se usaba para títulos de
   sección, números de pregunta y texto blanco sobre el segmentado. Un cian 500 sobre
   blanco ronda 2,7:1 y la norma pide 4,5:1 en texto pequeño. No se veía mal: se veía
   **bonito**, que es justo lo que hace que este defecto llegue a producción. Se añadió
   una variante con tinta del acento (`--ev-accent-ink`).
7. **Estructura de lista inválida y objetivos pequeños.** `<ol>` con hijos `<div>`, un
   deslizador sin nombre accesible y los botones de reordenar por debajo de los 24×24 px
   que exige la WCAG 2.2 (criterio 2.5.8).

Y uno más, de pulido, que apareció mirando una captura: en «rellenar huecos» la frase
salía **dos veces**, porque el enunciado ya la contenía y el control la repetía con los
campos dentro.

### Fallos preexistentes, verificados con `git stash` sobre `main`

No tienen relación con este cambio y se comprobó ejecutándolos sin él:

- contraste en `/jobs/BDP-CRE-001`;
- separación entre el botón flotante de accesibilidad y el dock en pantallas estrechas;
- `e2e/public.spec.ts` y `e2e/candidate.spec.ts`, que chocan con el *overlay* del
  recorrido de primera visita (**5** fallos en `main`, **4** en esta rama).

Por eso la auditoría de accesibilidad del módulo se limita a su propio contenedor
(`.ev-root`): mezclarla con el resto del portal haría fallar la suite por algo que este
módulo no puede arreglar y —peor— acostumbraría a ignorarla.

### Control de calidad manual, paso a paso

**Sin configurar nada** (backend de demostración local):

1. `npm install && npm run dev`
2. Abrir `http://localhost:3000/evaluaciones?codigo=EV-DEMO-2026`. Debe aparecer el
   aviso permanente de **modo demostración**.
3. Escribir `1234567-12-2026` y ver aparecer las tres partes reconocidas debajo del
   campo.
4. Continuar, leer la declaración de integridad, marcar las dos casillas y comenzar.
5. Responder algunas preguntas: el aro del reloj avanza, el progreso sube y el canto de
   las tarjetas se enciende.
6. **Recargar la página** y volver a entrar con el mismo número: debe decir «intento
   retomado» y conservar las respuestas y el tiempo real.
7. Enviar y comprobar el comprobante con el identificador copiable.
8. Volver a entrar con el mismo número: debe decir que sólo se permite un intento.
9. Probar `?codigo=EV-DEMO-REINT`: el primer envío falla a propósito; el botón de
   reintento debe llevar al comprobante **sin duplicar** el intento.
10. Probar `?codigo=EV-DEMO-PAUSA`: pantalla de indisponibilidad con «Volver a
    comprobar».

**Contra el Apps Script real**: poner la variable, comprobar `?accion=ping` con `curl`,
completar el flujo y verificar en el libro una fila en `Intentos` con
`estado = enviado`, `participante_documento` igual al carnet y **`proceso_id`** igual al
número identificador completo.

---

## Alternativas

### 1 · Traducir el módulo anterior en lugar de reescribirlo

| A favor | En contra |
| --- | --- |
| Diferencia mucho menor y más fácil de revisar | Los 54 «tipos de control» inventados en el portal no tienen equivalente en los 39 del servidor: había que rehacer todos los controles igual |
| Conserva las pruebas existentes | El reloj, el progreso y la reanudación eran **simulaciones** que el backend nuevo ya resuelve: traducir habría conservado las tres |
| Menos superficie nueva | Las abstracciones estaban modeladas sobre otro contrato; cada capa habría quedado con una forma que ya no describe nada |

Se descartó porque lo que había que conservar era el **propósito** del módulo, que está
bien pensado, no su implementación.

### 2 · Un proxy en el portal (`/api/evaluaciones`) en lugar de llamar directo a Apps Script

| A favor | En contra |
| --- | --- |
| Oculta el origen de Google y evita los dos orígenes en la política de seguridad | El ATS ya tuvo un proxy serverless y lo **eliminó**: era la mitad de sus incidencias |
| Permitiría cachear en el borde | Convierte la ruta en dinámica y obliga a un entorno de servidor donde hoy no hay ninguno |
| Podría normalizar errores en un solo sitio | Añade un salto donde perder la traza del backend, que es lo que permite encontrar la entrada exacta del diario en la hoja `Registro` |

No aporta seguridad: las cinco acciones son públicas por diseño y no hay ningún secreto
que custodiar.

### 3 · Guardar el token del intento para reanudar sin volver a identificarse

| A favor | En contra |
| --- | --- |
| Recargar continuaría sin escribir nada | Es una **credencial**: quien abra la pestaña después continúa el intento de otra persona. En un telecentro o una sala compartida eso es un problema real |
| Un paso menos | El camino correcto ya existe y es mejor: el backend retoma el intento por documento con su tiempo real y sus respuestas |

Se descartó por eso: la comodidad que aporta ya la da el servidor sin guardar nada.

---

## Personas sugeridas para consultar

Este cambio lo generó una IA, así que conviene que lo revise quien tenga contexto propio
de las partes que toca.

- **AlexD5427** — es el único autor de todos los commits de los dos repositorios,
  incluidos el rediseño Liquid Glass (PR #3), el módulo público anterior (PR #4) y la
  reconstrucción del backend del ATS (PR #19). Tiene el contexto de las tres piezas que
  este cambio conecta, y en particular es quien puede decir si el reparto del número
  identificador entre `participante_documento` y `proceso_id` encaja con cómo el equipo
  de Talento Humano lee la hoja de cálculo.

No hay más colaboradores en el historial de ninguno de los dos repositorios, así que no
hay a quién más señalar con criterio. Si el equipo del banco tiene una persona
responsable de accesibilidad, vale la pena que mire los siete defectos de la sección de
verificación: cinco eran de accesibilidad y ninguno se veía mal.

---

## Cuestionario

<details>
<summary>1 · ¿Por qué el módulo anterior no podía funcionar, ni con la variable de entorno bien puesta?</summary>

- **a)** El despliegue del Web App no permitía acceso anónimo.
- **b)** El cliente hablaba un contrato distinto: otras acciones, otro envoltorio y otro
  idioma en los campos. ✅
- **c)** Faltaban los dos orígenes de Google en la política de seguridad.
- **d)** El reloj del cliente se desincronizaba del servidor.

**b) es correcta.** El ATS borró y reescribió su backend: `getPublicAssessment` pasó a
`openAssessment`, `{ action, requestId, data }` pasó a `{ accion, solicitudId, datos }`.
El servidor respondía `UNSUPPORTED_ACTION` y el cliente leía `data` de una respuesta que
traía `datos`.

**a)** habría dado una página HTML de inicio de sesión, un síntoma distinto que el
módulo nuevo detecta y nombra. **c)** era correcto ya antes, y de hecho se conserva.
**d)** era una limitación reconocida, no la causa.
</details>

<details>
<summary>2 · Un candidato pulsa «Enviar», se le cae la red y reintenta. ¿Qué evita que queden dos intentos en la hoja?</summary>

- **a)** El servidor detecta respuestas duplicadas y las descarta.
- **b)** El reintento reutiliza el mismo `solicitudId`, y el servidor devuelve el
  resultado original en lugar de ejecutar otra vez. ✅
- **c)** El cliente comprueba antes si ya existe un intento enviado.
- **d)** El envío se reintenta automáticamente una sola vez.

**b) es correcta.** El identificador se crea una vez por intención y se reutiliza
literalmente. Al reconocerlo, `evWithLock_` no vuelve a ejecutar la acción: devuelve
`{ repetida: true, referencia, resumen }`, y el cliente construye el comprobante desde
ahí.

**d)** es justo lo contrario de lo que hace: las escrituras **nunca** se reintentan
solas, porque eso ocultaría el problema de red y haría imposible contar las ejecuciones.
</details>

<details>
<summary>3 · En una repetición idempotente el `resumen` no trae la nota. ¿Qué muestra el comprobante?</summary>

- **a)** Un 0, porque el campo no vino.
- **b)** «Pendiente de revisión».
- **c)** No muestra nota, y explica que el envío quedó registrado. ✅
- **d)** Vuelve a pedir el envío para obtener la nota.

**c) es correcta.** Es la regla que gobierna esa pantalla: no se muestra nada que el
servidor no haya dicho.

**a)** sería decirle a alguien que sacó 0 en su evaluación por un problema de red.
**b)** afirmaría algo que no se sabe. **d)** rompería la idempotencia que acaba de
protegerle el intento.
</details>

<details>
<summary>4 · ¿Por qué el valor de una cuadrícula es la etiqueta de la columna y no su índice?</summary>

- **a)** Porque el índice cambiaría si el autor reordena las columnas.
- **b)** Porque el calificador compara con `claveEmparejamiento`, que el autor escribe
  como texto de columna. ✅
- **c)** Porque las etiquetas son más legibles en la hoja de cálculo.
- **d)** Porque el servidor no recibe la configuración de columnas.

**b) es correcta.** `evGradeMatrix_` normaliza y compara con `claveEmparejamiento`.
Mandar un índice produciría **siempre** una respuesta incorrecta, y nadie lo notaría
hasta ver las notas: no hay error, no hay excepción, sólo candidatos que suspenden.

**a)** y **c)** son ciertas pero secundarias.
</details>

<details>
<summary>5 · ¿Por qué las tarjetas de pregunta se animan con <code>animate</code> y no con <code>whileInView</code>?</summary>

- **a)** Porque `whileInView` no funciona con desplazamiento suave.
- **b)** Porque el observador de intersección no está disponible en todos los
  navegadores.
- **c)** Porque al activar «movimiento reducido» en caliente las tarjetas quedaban
  congeladas en invisible. ✅
- **d)** Porque escalonar la entrada exige conocer el índice.

**c) es correcta.** Con `whileInView` la tarjeta arranca en `opacity: 0` y sólo se
muestra cuando el observador la ve entrar. El portal permite activar «movimiento
reducido» desde su centro de accesibilidad **con la evaluación abierta**: al hacerlo
desaparecía el objetivo de la animación y las preguntas se volvían invisibles. Con
`animate`, el estado final se aplica siempre.

**d)** es un efecto secundario agradable, no la razón. **b)** se cubre aparte, en la
detección de visita.
</details>
