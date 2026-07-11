# Modelo híbrido Supabase + Google Sheets / Apps Script

## Modos

`NEXT_PUBLIC_DATA_MODE = mock | supabase | apps-script | hybrid`.

## Política de fuente de verdad

- **Supabase** es la base operativa **autoritativa**.
- **Google Sheets** es una integración **transitoria** (importación/exportación o publicación gestionada
  por negocio). No debe convertirse en una segunda base maestra descontrolada.

Rango de autoridad para fusión: `supabase > archive_api > google_sheets > object_storage > mock`.

## Lectura de convocatorias (modo híbrido)

`hybrid-provider.ts` + `merge.ts`:

1. Se consultan **ambas** fuentes en paralelo (ventana amplia).
2. Se normalizan al mismo modelo `JobPublication`/`JobSummary`.
3. Se **deduplica** por `reference` (externalReference estable).
4. Resolución de conflictos **determinista**: gana la fuente más autoritativa; a igualdad, la
   `publishedAt` más reciente.
5. Se registra el `sourceProvider` en metadatos.
6. Si una fuente falla, se devuelven resultados válidos de la otra (**modo degradado**); los
   diagnósticos van solo a logs de desarrollo, nunca a la UI del candidato.

```ts
mergeJobSummaries([
  { provider: 'supabase',     items: supabaseJobs },
  { provider: 'google_sheets', items: sheetJobs },
]); // → deduplicado, priorizado y ordenado por fecha
```

## Escrituras de candidato

Identidad, registro, envío de postulaciones, respuestas de evaluación y registros sensibles apuntan a
**Supabase** cuando está configurado. **No** se escribe información sensible del candidato a Google
Sheets desde el navegador. Una integración de escritura vía Apps Script, si fuera necesaria, debe
hacerse mediante un **adaptador de servidor autenticado**, no desde código público.

## Expectativas de seguridad de Apps Script

Los endpoints de Apps Script se tratan como **frontera de red no confiable**:

- Timeout + `AbortController`.
- Validación de respuesta con **Zod** y verificación de versión de esquema (`SUPPORTED_APPS_SCRIPT_SCHEMA`).
- Reintento solo para lecturas idempotentes, con *backoff* acotado.
- *Circuit breaker* ante fallos repetidos.
- Normalización de errores y **sin logging sensible**.
- **Nunca** se exponen IDs de hoja privados ni secretos en el navegador.
- Se recomienda un **proxy server-side** (route handler / server action) cuando CORS o seguridad lo
  requieran.

## Migración

Los IDs estables (`externalReference`) permiten migrar registros de Sheets a Supabase sin romper URLs
ni referencias de postulaciones. El *mapper* de Apps Script prefija los ids (`gs:<ref>`) y marca
`sourceProvider = 'google_sheets'`.
