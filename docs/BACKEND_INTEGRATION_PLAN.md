# Plan de integración de backend

Topología futura (documentada, no implementada por completo):

```
Frontend público
  → Backend for Frontend / API segura
    → Supabase PostgreSQL (registros activos estructurados)
    → Supabase Auth (identidad del candidato)
    → Cloudflare R2 (documentos y media privados)
    → Google Sheets / Apps Script (integración transitoria)
    → Archive API del banco (registros históricos)
    → PostgreSQL local + almacenamiento protegido (procesos cerrados)
    → Servicio de procesamiento de documentos (futuro)
    → pgvector + RAG (futuro)
    → Servicios de IA autorizados (futuro)
```

El frontend **nunca** accede a: *service-role key* de Supabase, credenciales de R2, PostgreSQL local,
bases de la red bancaria interna, ni secretos de IA. Toda operación privilegiada ocurre en el
servidor.

## Conectar Supabase

1. `npm i @supabase/supabase-js`.
2. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; pon
   `NEXT_PUBLIC_DATA_MODE=supabase`.
3. En `src/infrastructure/providers/supabase/supabase-provider.ts`, crea el cliente de navegador y
   sustituye los repositorios **uno a uno** (empezando por `auth`). Mantén los *mappers* en
   `infrastructure/mappers` como costura: la UI nunca ve la forma de fila de Supabase.
4. Operaciones privilegiadas (con `SUPABASE_SERVICE_ROLE_KEY`) → **route handler / server action**,
   nunca en el cliente.
5. Sustituye la guardia de UX por validación de sesión server-side (cookies seguras).

## Conectar Google Apps Script (lecturas)

1. Publica un endpoint de solo lectura que devuelva el esquema de `schema.ts`
   (`{ schemaVersion, jobs: [...] }`).
2. Configura `NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL` y `NEXT_PUBLIC_ENABLE_GOOGLE_APPS_SCRIPT=true`;
   usa `NEXT_PUBLIC_DATA_MODE=apps-script` o `hybrid`.
3. Para producción, coloca un **proxy server-side** (route handler) si CORS/seguridad lo requieren.
4. Las escrituras desde Sheets, si son necesarias, van por un adaptador de servidor autenticado con
   `APPS_SCRIPT_SERVER_SECRET`.

## Conectar Cloudflare R2 (documentos/foto)

1. `DocumentsRepository.createUploadIntent()` debe implementarse en el **servidor**: valida
   tipo/tamaño, genera una **URL firmada** temporal y devuelve `documentId`.
2. El navegador sube directo a la URL firmada; nunca tiene `R2_*`.
3. `MediaRepository.resolveAsset()` resuelve URLs firmadas para activos `signedURLRequired`.
4. Reactiva `signedURLRequired` y añade el host de R2 a `img-src`/`media-src` de la CSP.

## Cómo funcionan los esquemas del ATS

- **Convocatorias**: el ATS define `JobPublication` con bloques (`MEDIA_CONTENT_MODEL.md`). El portal
  renderiza vía el registro de bloques; tipos nuevos degradan con elegancia.
- **Evaluaciones**: el ATS define `AssessmentDefinition` con secciones/preguntas
  (`ASSESSMENT_ENGINE.md`). El *runner* es genérico; añadir un tipo de pregunta implica un renderizador
  + su validación Zod.
- **Preguntas de postulación**: `JobPublication.applicationQuestions` alimenta el paso del asistente.
