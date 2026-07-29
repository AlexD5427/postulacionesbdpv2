# Módulo público de evaluaciones (beta temporal)

> **Alcance.** Un candidato **sin cuenta y sin sesión** entra a `/evaluaciones`, se
> identifica con nombre y Carnet de Identidad, abre una evaluación publicada por
> su `publicCode`, la responde y la envía al Web App de Apps Script del ATS, que
> la califica y la registra en Google Sheets.
>
> Es un módulo **temporal, aislado y desechable**: no reemplaza ni modifica el
> motor de evaluaciones autenticado de `(candidate)/candidate/assessments`. Vive
> en carpetas propias para poder retirarse en un solo commit.

## 1 · Rutas y superficie

| Elemento | Ruta / archivo |
| --- | --- |
| Ruta pública | `/evaluaciones` y `/evaluaciones?code=EVL-XXXX-YYYY` (`?c=` también sirve) |
| Página (Server Component) | `src/app/(public)/evaluaciones/page.tsx` |
| Orquestador (Client) | `src/features/public-assessments/components/PublicAssessmentFlow.tsx` |
| Acceso desde la portada | tarjeta «¿Recibiste un código de evaluación?» en `LandingView` |
| Otros accesos | enlace «Evaluaciones» en la barra pública y celda en el dock |

La ruta es pública de verdad: no usa el guard de sesión, no lee ni escribe
cookies, no pide correo y no habilita ningún permiso del navegador. `robots` está
en `noindex` porque una evaluación se distribuye por enlace directo.

## 2 · Contrato utilizado

Fuente de verdad: `docs/evaluations/API_CONTRACT.md` y
`docs/evaluations/PORTAL_CANDIDATES_HANDOFF.md` del repositorio del ATS
(`AlexD5427/Claude-bdp`), que **no se modificó**.

Se usan exactamente tres acciones públicas (más `ping`, solo para diagnóstico):

| Acción | Tipo | Payload que envía el portal |
| --- | --- | --- |
| `getPublicAssessment` | lectura | `{ publicCode }` |
| `startAttempt` | escritura | `{ publicCode, participant: { name, document }, userAgent }` |
| `submitAttempt` | escritura | `{ publicCode, attemptId, participant, answers, userAgent, durationSeconds }` |

`listPublicAssessments` **no** se usa: el flujo es por enlace o por código, y
listar evaluaciones publicadas sería exponer información que nadie pidió.

### Transporte (reglas no negociables)

Implementadas en `src/infrastructure/evaluations/transport.ts` y verificadas en
`transport.test.ts`:

1. `redirect: 'follow'` en toda petición. Google responde `302`; sin seguirlo la
   app falla con `404` en producción.
2. `POST` con `Content-Type: text/plain;charset=utf-8`. El despliegue por omisión
   de Apps Script no contesta el *preflight* de CORS que dispararía
   `application/json`.
3. Timeout de 15 s con `AbortController`.
4. `credentials: 'omit'`: es un endpoint de terceros, no viaja ninguna cookie.
5. Reintentos automáticos **solo** en lecturas (600/1200 ms). Las escrituras nunca
   se reintentan solas.

### `requestId` e idempotencia

`requestId` se genera **una vez por intención** (`crypto.randomUUID()` con
prefijo `req_`) y se reutiliza literalmente en cada reintento. Un id nuevo crearía
un segundo intento. El flujo guarda dos ids en refs: uno para `startAttempt` y
otro para `submitAttempt`.

> [!IMPORTANT]
> **Hallazgo verificado en el backend.** Cuando el servidor reconoce un
> `requestId` ya procesado, `RequestService.gs → evalWithWriteLock_` **no vuelve a
> ejecutar la acción**: devuelve `{ idempotentReplay: true, reference,
> processedAt, summary }` con la advertencia `IDEMPOTENT_REPLAY`. Ese cuerpo no
> tiene la forma de `submitAttempt`, así que un cliente que solo conozca el caso
> feliz tratará un reintento legítimo como respuesta malformada — justo el camino
> que recorre un candidato con red inestable. El mapper acepta las dos formas
> (`mapAttemptStart`, `mapAttemptReceipt`) y hay pruebas para ambas.

### Campos prohibidos

`FORBIDDEN_ASSESSMENT_KEYS` (en `public-dto.ts`) enumera todo lo que no puede
llegar al navegador: `isCorrect`, `correctAnswer`, `answerKey`, `matchingKey`,
`expectedValue`, `scoreValue`, `pointsAwarded`, `maxPoints`, `scoringMode`,
`passingScore`, `feedback`, `internalInstructions`, `createdBy`/`updatedBy`,
`entityVersion`, `tags`, `rules`, `rubrics` y el `assessmentId` interno.

`stripForbiddenKeys()` los borra recursivamente **antes** de validar el DTO. Si
aparece alguno se registra como defecto de seguridad del backend (solo los
nombres de las claves, nunca los valores) y el dato se descarta. Hay pruebas de
regresión que fallan si la lista deja de aplicarse.

En la dirección contraria, el tipo `PublicAnswerInput` no tiene ningún campo de
calificación, así que el cliente **no puede** enviar `score`, `passed`,
`isCorrect` ni `pointsAwarded` ni por accidente.

## 3 · Flujo funcional

```
/evaluaciones
   │  código + nombre + carnet + aceptación de privacidad   (AccessForm)
   ▼
getPublicAssessment(publicCode)                            error genérico si falla
   │
   ▼
Preflight: título, instrucciones, duración, consentimiento (PreflightScreen)
   │  «He leído las instrucciones» [+ consentimiento si el contrato lo exige]
   ▼
startAttempt(requestId_A)  ─► attemptId + startedAt
   │
   ▼
Runner por secciones (PublicQuestionField)                 borrador en sessionStorage
   │  progreso · temporizador · validación · navegación libre
   ▼
Revisión: obligatorias faltantes vs. opcionales omitidas   (SubmitReviewDialog)
   │  confirmación explícita
   ▼
submitAttempt(requestId_B)  ─► comprobante                 reintento con el MISMO id
   ▼
Comprobante (AttemptReceipt)                               borrador borrado
```

### Estados de error mostrados al candidato

| Código | Mensaje |
| --- | --- |
| `NOT_FOUND` | Esta evaluación no está disponible. |
| `VALIDATION_ERROR` | No se pudo validar el formulario. Revisa tus respuestas o contacta al equipo. |
| `CONFLICT` | Esta evaluación ya fue enviada. |
| `LOCK_TIMEOUT` | El servicio está ocupado. Inténtalo nuevamente en unos segundos. |
| `SCHEMA_ERROR` | La evaluación no está disponible temporalmente. |
| `INTERNAL_ERROR` | Ocurrió un error inesperado. Inténtalo nuevamente más tarde. |
| red / timeout | No pudimos conectarnos con el servicio de evaluaciones… |
| configuración | La evaluación no está disponible temporalmente. |

Un código inexistente, un borrador, una evaluación pausada, cerrada o archivada
producen **el mismo** mensaje: el candidato no puede distinguir el motivo, igual
que decidió el backend. El `message` del servidor se registra (redactado) pero
nunca se muestra.

## 4 · Tipos de pregunta

El runner es genérico: lee `questionType` y lo traduce a una **familia de
control** con `question-controls.ts`, que refleja el registro del ATS
(`docs/evaluations/QUESTION_TYPES.md`, 54 tipos).

| Familia | Tipos del ATS | Qué se envía |
| --- | --- | --- |
| `content` | los 12 `c_*` | nada (bloque de contenido) |
| `radio` | `q_single_choice`, `q_true_false`, `q_yes_no_na`, `q_image_choice`, `q_likert` | `selectedOptionId` |
| `checkbox` | `q_multiple_choice`, `q_multiselect` | `selectedOptionIds[]` |
| `select` | `q_dropdown` | `selectedOptionId` |
| `text` / `textarea` | `q_short_text`, `q_long_text`, `q_scenario`, `q_multi_step_case`, `q_chart_interpretation` | `value` (texto, con *trim*) |
| `number` | `q_integer`, `q_decimal`, `q_percentage`, `q_currency`, `q_numeric_scale`, `q_stars` | `value` (número) |
| `date` / `time` / `datetime` | `q_date`, `q_time`, `q_datetime` | `value` (texto ISO) |
| `ordering` | `q_ranking`, `q_ordering`, `q_matching`, `q_categorization` | `value` = `{ optionId: "posición" }` (1-based) |
| `matrix` | `q_matrix`, `q_likert_matrix`, `q_editable_table` | `value` = `{ fila: columna }` |
| `upload` / `pending` | `q_file_response`, `q_hotspot` y los 11 contratos de simulación | **nada**: aviso explicativo |
| `unsupported` | cualquier tipo desconocido | **nada**: aviso explicativo |

Un tipo nuevo en el backend no rompe el portal: cae en `unsupported`, se explica
en pantalla y no se envía ninguna respuesta inventada. Las preguntas que el
runner no puede responder **no bloquean** el envío aunque estén marcadas como
obligatorias.

### Accesibilidad de los controles

Cada control usa `Field` (label + `aria-describedby` + `aria-invalid`), respeta
`accessibility.ariaLabel` y muestra `longDescription` cuando existe. El
ordenamiento se opera con botones «subir»/«bajar» con nombre accesible — **nunca**
depende de arrastrar. La matriz es una tabla con encabezados de fila y columna y
radios etiquetados «fila: columna». El foco se mueve al título de la sección al
navegar, y el temporizador no es una región *live* (un anuncio por segundo sería
hostil).

## 5 · Temporizador y cierre por tiempo

Si `durationMinutes` existe, el límite se calcula desde `startedAt` (dato del
servidor) y se muestra con `useCountdown`, que limpia su `setInterval` al
desmontar. A menos de dos minutos aparece un aviso; al llegar a cero el
formulario se congela y se envía **una sola vez** (guardado con un `ref`). Si no
hay duración no se muestra ningún contador: nunca se inventa un límite.

> [!NOTE]
> **Limitación del contrato.** El cierre por tiempo es responsabilidad del
> cliente: el servidor registra `duration_seconds` para auditoría pero no rechaza
> un envío tardío. Una pestaña cerrada antes del cierre simplemente no envía.

## 6 · Borrador local

`state/draft-storage.ts` guarda en **`sessionStorage`** (muere con la pestaña) lo
mínimo para sobrevivir a una recarga accidental: `publicCode`,
`assessmentVersion`, `attemptId`, `startedAt`, `submitRequestId` y las respuestas.

- **No guarda nombre ni documento.** Al reanudar se piden otra vez; la fila del
  intento ya tiene los valores capturados en `startAttempt`.
- Está **acotado por versión**: si el ATS publicó una versión nueva, el borrador
  se descarta en vez de replicarse contra otras preguntas. También caduca a las 6
  horas.
- Conserva el `submitRequestId`, de modo que un reintento después de una recarga
  sigue siendo el mismo envío y no duplica el intento.
- Se borra al enviar con éxito.

Nada de esto es «progreso en el servidor»: el backend no tiene endpoint de
progreso parcial y este módulo no finge tenerlo.

## 7 · Configuración

| Variable | Obligatoria | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL` | sí, en producción | URL absoluta del Web App de **Evaluaciones**, terminada en `/exec` (o `/dev` en un despliegue de prueba) |

Es pública a propósito: no contiene secretos y solo sirve las cuatro acciones
saneadas. **No** es el mismo despliegue que
`NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL` (convocatorias) y nunca debe apuntar a
una ruta administrativa.

`endpoint.ts` clasifica el valor antes de usarlo y nombra la variable en el
diagnóstico: falta, no es absoluta, no es `https`, parece administrativa o no
termina en `/exec`. Un endpoint equivocado no se «intenta de todos modos», porque
el error de red resultante manda a buscar el problema donde no está (la lección de
`docs/evaluations/REPARACION_2026-07.md` en el ATS).

### Modo demostración

Sin endpoint **y** con `NEXT_PUBLIC_DATA_MODE=mock` (+ `NEXT_PUBLIC_ENABLE_MOCKS`),
el módulo usa `demo-public-assessments.ts`: dos evaluaciones locales que pasan por
el mismo mapper y los mismos esquemas Zod. La pantalla lo advierte («Modo
demostración… nada se guarda»). Fuera de ese caso, sin endpoint el flujo muestra
un error de configuración: **no** simula un envío exitoso.

Códigos de demostración: `EVL-DEMO-2026` (cubre todas las familias de control) y
`EVL-DEMO-REINTENTO` (falla el primer envío a propósito, para ejercitar el
reintento con el mismo `requestId`).

### CSP

`connect-src` incorpora **dos** orígenes de Google, explícitos y sin comodines:

```
https://script.google.com            el /exec al que se llama
https://script.googleusercontent.com el destino del 302 que Google devuelve
```

La CSP se aplica también al destino de la redirección: omitir el segundo origen
produce una petición bloqueada que parece un corte de red. Está cubierto por
`security.test.ts`, que además comprueba que no se abrió ningún comodín
`*.google.com` y que cámara, micrófono y geolocalización siguen denegados.

## 8 · Privacidad y seguridad

- El nombre y el documento viven en estado de componente y viajan **solo** en
  `startAttempt` y `submitAttempt`. No van a la URL, ni a `localStorage`, ni a un
  log. `logger` además redacta por nombre de clave (`redact.ts`).
- El formulario explica para qué se piden los datos y bloquea el avance hasta que
  se acepta el tratamiento. El texto de consentimiento de la evaluación es el que
  define el banco en el ATS (`consent.consentText`): **no se inventa copia legal**.
- Sin proctoring de ningún tipo: nada de cámara, micrófono, pantalla, biometría,
  *fingerprinting*, portapapeles, dinámica de tecleo ni detección de VPN. Cambiar
  de pestaña no se registra.
- **La telemetría de integridad no se conecta** en este módulo (ver §10).
- Sin `dangerouslySetInnerHTML`, sin `eval`, sin HTML de proveedor: todo el
  contenido del ATS se renderiza como texto.
- El módulo no importa nada de `src/app/api` y no conoce ninguna acción
  administrativa; `security.test.ts` lo verifica leyendo los archivos.

## 9 · Pruebas

| Archivo | Qué cubre |
| --- | --- |
| `src/infrastructure/evaluations/transport.test.ts` | `redirect: follow`, `text/plain`, `credentials: omit`, forma del cuerpo, reintento solo en lecturas, `requestId` reutilizado, mapeo de los seis códigos de error, ausencia de `auth` |
| `src/infrastructure/evaluations/mapper.test.ts` | borrado de claves prohibidas a cualquier profundidad, orden por `position`, tipo desconocido → `unsupported`, duración 0 → sin contador, DTO inválido → `SCHEMA_ERROR`, envoltorio de repetición idempotente, paridad de las 54 familias de control |
| `src/infrastructure/evaluations/endpoint.test.ts` | siete formas de configurar mal la URL |
| `src/features/public-assessments/model/answers.test.ts` | formato de respuesta por familia, cero como respuesta válida, sin claves de calificación, sin `questionId` repetidos, resumen de obligatorias/opcionales |
| `src/features/public-assessments/components/AccessForm.test.tsx` | validación, normalización sin reescribir el documento, la casilla como puerta real |
| `src/features/public-assessments/components/PublicAssessmentFlow.test.tsx` | recorrido completo, sin claves de respuesta en pantalla, `NOT_FOUND` genérico, obligatorias faltantes, doble clic, reintento con el mismo `requestId`, revisión manual sin cero, persistencia al navegar, expiración del tiempo |
| `src/features/public-assessments/security.test.ts` | sin variables de servidor, sin acciones administrativas, sin `fetch` en componentes, sin inyección de HTML, CSP y Permissions-Policy |
| `e2e/public-assessments.spec.ts` | 10 escenarios en navegador real (Chromium + Pixel 7) |
| `e2e/accessibility.spec.ts` | axe-core sobre `/evaluaciones` |

Capturas de la revisión visual: `e2e/screenshots.public-assessments.spec.ts`
(ejecución manual, escribe en `test-results/screens`).

## 10 · Limitaciones reconocidas

1. **Sin telemetría de integridad.** El subsistema existe
   (`features/assessments/telemetry`) pero está acoplado al intento autenticado.
   Conectarlo exigiría decidir la identidad anónima del candidato, y este módulo
   es explícitamente mínimo. Documentado, no olvidado.
2. **Sin límite de intentos.** `attemptPolicy.maxAttempts` existe en el modelo del
   ATS pero el endpoint público no lo aplica (§7 del *handoff*). Un candidato
   puede volver a entrar con el mismo código y abrir otro intento.
3. **Cierre por tiempo del lado del cliente** (§5).
4. **Reanudación acotada a la pestaña** (§6).
5. **`q_matrix` sin ejes** no se puede responder: se muestra un aviso en lugar de
   inventar un formato que nadie podría revisar.
6. **`q_file_response` y los contratos de simulación** quedan en modo lectura.
7. **i18n parcial.** Los accesos nuevos (barra, dock, tarjeta de la portada) están
   en las cuatro locales para las etiquetas cortas; el interior del runner está en
   español, igual que el runner autenticado que ya existía. `docs/I18N.md` ya
   reconoce que quechua y aymara cubren el núcleo de alta visibilidad y que el
   resto usa el respaldo al español. **Requiere revisión de hablantes nativos**
   antes de producción.
8. **Riesgo pendiente:** el módulo depende de que el despliegue del Web App sea
   accesible «para cualquier persona». Si el ATS lo cambia, el candidato verá
   `NOT_FOUND` o un error de red sin más contexto.

## 11 · Cómo probar

### En local, con datos de demostración

```bash
npm install
npm run dev
# http://localhost:3000/evaluaciones?code=EVL-DEMO-2026
```

Sin configurar nada: `NEXT_PUBLIC_DATA_MODE` es `mock` por omisión y el módulo
usa el adaptador de demostración (con su aviso en pantalla).

### Contra el Apps Script real

1. En `.env.local`:

   ```bash
   NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
   ```

2. Comprueba el despliegue antes de abrir el navegador:

   ```bash
   curl -sL "$NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL?action=ping"
   ```

   Debe responder `{"ok":true,…,"data":{"service":"evaluations",…}}`. Si responde
   HTML de inicio de sesión, el despliegue no es público todavía.

3. `npm run dev`, abre `/evaluaciones`, usa un `publicCode` de una evaluación
   **publicada** en el ATS y completa el flujo.
4. Verifica en la hoja de cálculo del backend: una fila en `Attempts` con
   `status = submitted` y una fila por respuesta en `Answers`.

### Comprobaciones

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e:install   # una vez
npm run test:e2e
```

## 12 · Pasos manuales mínimos

1. Configurar `NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL` en el proveedor de
   *hosting* (Vercel → Settings → Environment Variables) con la URL real del Web
   App de Evaluaciones.
2. Verificar en Apps Script que el despliegue tenga **«Quién tiene acceso:
   cualquier persona»** (`docs/evaluations/APPS_SCRIPT_SETUP.md §8` del ATS).
3. Volver a desplegar el portal para que la variable se incruste en el bundle.

No hace falta tocar el ATS, ni copiar secretos al frontend, ni editar las hojas de
cálculo a mano.
