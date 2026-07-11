# Arquitectura de acceso a datos (backend-agnóstica)

## Contratos (puertos)

`src/core/data/repositories.ts` define interfaces provider-neutral:

`AuthRepository`, `CandidateRepository`, `CVRepository`, `CoverLettersRepository`, `JobsRepository`,
`ApplicationsRepository`, `AssessmentsRepository`, `NotificationsRepository`, `DocumentsRepository`,
`MediaRepository`, `TelemetryRepository`. Se agrupan en `DataProvider`.

La UI/`hooks` dependen **solo** de estos contratos. Es inversión de dependencias clásica: cambiar de
backend no toca ningún componente.

## Adaptadores (implementaciones)

`src/infrastructure/providers/`:

- **mock** — en memoria + `localStorage`; datos semilla (5 convocatorias de La Paz, 3 evaluaciones).
  Funciona en servidor (memoria) y navegador (`localStorage`).
- **supabase** — *boundary* listo para integrar (ver `BACKEND_INTEGRATION_PLAN.md`).
- **google-apps-script** — lecturas públicas de convocatorias con `httpJson` endurecido y *mapper*.
- **hybrid** — compone un primario autoritativo + un secundario de lectura y fusiona resultados.

## Selección de proveedor

`factory.ts` → `getDataProvider()` (memoizado) elige según `NEXT_PUBLIC_DATA_MODE` y **degrada a
mock** si faltan credenciales/endpoints, de modo que la app siempre corre.

## Mappers y DTO público

`src/infrastructure/mappers/public-dto.ts`:

- `stripInternalFields()` elimina **recursivamente** campos internos de decisión de empleo
  (`fitScore`, `rank`, `hiringProbability`, `interviewerNotes`, `internalProcessStage`, …) — defensa
  en profundidad ante datos accidentales del proveedor.
- `toJobSummary()` proyecta solo campos públicos para las tarjetas del directorio.

## Cliente HTTP endurecido

`src/infrastructure/clients/http.ts` (`httpJson`): timeout con `AbortController`, validación Zod +
versión de esquema, reintento con *backoff* **solo** para lecturas idempotentes, *circuit breaker* por
endpoint, normalización de errores (`AppError`) y `credentials: 'omit'`.

## Metadatos de proveedor y migración

Cada entidad multi-origen lleva `ProviderMetadata` (`id` UUID interno, `externalReference` estable,
`sourceProvider`, `authoritative`, `sourceVersion`, `lastSynchronizedAt`) para deduplicar, resolver
conflictos y migrar registros de Apps Script a Supabase **sin romper URLs** (las convocatorias se
enrutan por `reference`).
