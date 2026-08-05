# Seguridad

La seguridad es un requisito de primera clase. Este documento resume los controles del frontend y los
límites que el backend deberá reforzar.

## Cabeceras HTTP

Definidas de forma central en `src/core/security/headers.mjs` y aplicadas en `next.config.mjs`:

- **Content-Security-Policy** con `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`. `img-src`/`media-src`
  listan explícitamente los orígenes permitidos (Unsplash de ejemplo, `*.supabase.co`, `*.r2.dev`) —
  cada origen está documentado. `connect-src` añade **dos** orígenes de Google para el módulo público
  de evaluaciones: `https://script.google.com` (el `/exec` al que se llama) y
  `https://script.googleusercontent.com` (el destino del `302` que Google devuelve, porque la CSP se
  aplica también al destino de la redirección). Sin comodines `*.google.com`; ver
  [`PUBLIC_ASSESSMENTS.md`](PUBLIC_ASSESSMENTS.md) §10. `'unsafe-eval'` de scripts solo se habilita en **desarrollo** (React
  Fast Refresh). Los estilos usan `'unsafe-inline'` por la inyección en runtime de Tailwind/Next.
- **Referrer-Policy** `strict-origin-when-cross-origin`, **X-Content-Type-Options** `nosniff`,
  **X-Frame-Options** `DENY`.
- **Permissions-Policy** que **niega** cámara, micrófono, geolocalización, *browsing-topics*, USB,
  sensores, etc.
- **Cross-Origin-Opener-Policy** y **Cross-Origin-Resource-Policy** `same-origin`.
- **HSTS** solo en producción (HTTPS).

> Ajusta `img-src`/`media-src`/`connect-src` al conectar proveedores reales; evita comodines amplios
> sin justificación. Usa *nonces*/hashes si necesitas *inline scripts* en producción.

## Entrada y salida

- Todas las respuestas de red no confiables (Apps Script) se validan con **Zod** y verificación de
  versión de esquema.
- Los formularios se validan con Zod/RHF (UX) — el servidor debe re-validar (autoridad).
- **Nunca** se renderiza HTML de proveedor: el texto enriquecido usa un **esquema restringido**
  (`RichText`) sin `dangerouslySetInnerHTML`. Esto previene XSS desde contenido de ATS/hoja de
  cálculo.
- Contrato preparado para validación de archivos en servidor (tipo/tamaño), normalización de nombres
  y estado de escaneo de malware; los tipos ejecutables se rechazarán. No se confía en el MIME del
  navegador.

## Módulo público de evaluaciones (temporal, sin login)

La ruta `/evaluaciones` es pública por diseño: sin sesión, sin cookies y sin correo. Sus controles
están documentados en [`PUBLIC_ASSESSMENTS.md`](PUBLIC_ASSESSMENTS.md) §10 y verificados en
`src/features/public-assessments/security.test.ts`, que los comprueba **leyendo el código fuente**
para que una regresión en un archivo nuevo falle igual que en uno viejo. En resumen:

- **La clave de respuestas no llega al navegador.** `quitarClavesProhibidas()` borra `correcta`,
  `claveEmparejamiento`, `respuestaEsperada`, `modoPuntaje`, `puntajeAprobacion` y quince más
  **antes** de validar el DTO. Es la segunda defensa: la primera es la proyección con lista blanca
  del servidor, y esta existe porque el portal no controla qué versión del script está desplegada.
  Una fuga se registra con los **nombres** de las claves, nunca sus valores.
- **El cliente no puede enviar una nota.** El tipo de respuesta no tiene campos de calificación.
- **Sin superficie administrativa.** Las veintidós acciones administrativas del backend no se nombran
  en ningún archivo del módulo y ninguna llamada lleva llave de administración.
- **Datos personales.** El nombre y el carnet viven en estado de componente y viajan sólo en
  `startAttempt`; no van a la URL, ni al almacenamiento del navegador, ni a un log. El campo del
  documento lleva `autocomplete="off"` porque en un equipo compartido el autocompletado lo ofrecería
  a la siguiente persona.
- **El token del intento no se guarda.** Es una credencial; reanudar se hace volviendo a escribir el
  número identificador y dejando que el backend retome el intento.
- **Sin proctoring.** El rastro de integridad registra visibilidad de pestaña, foco, copiar/pegar
  (**sólo la longitud**), tiempos y navegación, y se **declara antes de empezar**. Nada de cámara,
  micrófono, pantalla, biometría ni huella del dispositivo; la política de permisos lo hace cierto a
  nivel de navegador.
- **Sin inyección de HTML.** Ni `dangerouslySetInnerHTML`, ni `innerHTML`, ni `eval`.

## Límite de autenticación

- La **guardia de rutas del candidato es de UX, no de autorización** (`RequireAuth`). El backend debe
  validar la sesión en cada request.
- Se evitarán tokens sensibles de larga vida en `localStorage`; con backend real se usarán cookies
  seguras (`HttpOnly`, `SameSite`).
- El frontend **nunca** recibe la *service-role key* de Supabase, credenciales de R2, ni acceso
  directo a PostgreSQL local o a la red bancaria interna. Toda operación privilegiada ocurre en el
  servidor.

## Contratos de abuso (preparados)

Interfaces previstas para: *rate limiting*, CAPTCHA solo cuando el riesgo lo justifique, verificación
de correo, protección de cuentas duplicadas, **claves de idempotencia** (ya usadas en el envío de
postulaciones), *throttling* de envíos, auditoría y límites de tamaño/cantidad de archivos. **No** se
implementa *fingerprinting* invasivo.

## Logging

`src/core/observability/logger.ts` emite JSON estructurado y **redacta** (`redact.ts`) contraseñas,
tokens, contenido de CV, respuestas de evaluación, documentos personales, IPs completas (se enmascara
a `x.x`) y textos de consentimiento con datos personales. En producción solo se emiten `warn`/`error`.
Sin *trackers* de terceros por defecto.

## Dependencias

Versiones estables y parcheadas; `package-lock.json` versionado. Ejecuta `npm audit` periódicamente y
evita dependencias abandonadas. Sin scripts remotos ni `eval` en producción.
