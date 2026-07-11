# Telemetría de integridad y privacidad de las evaluaciones

## Principios

La telemetría es un **subsistema aislado** (`src/features/assessments/telemetry/`). Nunca se mezcla
con las respuestas. Es contexto de seguridad **débil** para revisión humana autorizada, **nunca** un
criterio de rechazo automático.

## Qué se recopila (MVP)

Solo señales de integridad/continuidad: hora de inicio/fin, tiempo por pregunta, navegación entre
preguntas, eventos de guardado/envío, cambios de visibilidad de la página, interrupciones y
recuperación de conexión, y —si el servidor lo provee— una categoría de cliente **gruesa**.

Eventos: `attempt_started`, `attempt_resumed`, `question_viewed`, `answer_saved`, `answer_changed`,
`section_changed`, `visibility_hidden`, `visibility_visible`, `connection_lost`,
`connection_restored`, `autosave_failed`, `submission_started`, `submission_completed`.

## Qué NO se recopila

Nada de: dinámica de tecleo, portapapeles, grabación de pantalla, cámara/micrófono, biometría,
historial, fuentes/apps instaladas, *fingerprints* de canvas/WebGL/audio, identificadores de
hardware, información entre sitios, *fingerprints* persistentes, geolocalización precisa o detección
de VPN en el navegador.

## Garantías técnicas

- **Lista blanca de campos**: `AssessmentTelemetry.record()` filtra cualquier propiedad fuera de
  `{questionId, sectionId, elapsedMilliseconds, visibilityState, clientCategory}`. Aunque se intente
  colar `value`/`answer`/`ip`, se descarta. (Cubierto por pruebas unitarias.)
- **Sin contenido de respuestas** por construcción; sin secretos; sin *fingerprints*.
- **Lotes** (por intervalo y por umbral de tamaño) en vez de un request por evento.
- **Cola acotada** (máx. 200); si se está *offline* o el envío falla, los eventos se **re-encolan** y
  se descartan los más antiguos por encima del límite (sin crecimiento ilimitado).
- **Mejor esfuerzo**: los fallos de telemetría **nunca** bloquean el envío de la evaluación.

## Consentimiento (redacción de ejemplo — requiere aprobación legal)

Antes de comenzar se muestra la divulgación textual mandada por la especificación y **dos casillas**
explícitas ("He leído las instrucciones" y "Consiento la recopilación técnica descrita"). Se almacena
`consentVersion`, `timestamp`, `assessmentVersion`, id de intento, `locale` y referencia de política.

> Esta redacción es una muestra y **no** reemplaza la revisión legal/privacidad del banco.

## Señales de IP/VPN del servidor (futuro)

Cualquier señal de riesgo de IP o VPN/proxy debe ser: server-side, configurable, transparente,
revisada legalmente, almacenada **por separado** de las respuestas, con retención corta, tratada como
señal débil, disponible solo para revisión humana autorizada y **nunca** como rechazo automático.
