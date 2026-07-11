# Arquitectura del frontend

## Principios

1. **Orientado a *features***: cada dominio (auth, jobs, cv, applications, assessments, …) agrupa sus
   `components/`, `hooks/`, `schemas/`, `services/`, `types/`. Evitamos una colección plana de
   componentes sin relación.
2. **Inversión de dependencias en el acceso a datos**: la UI depende de *contratos* de repositorio
   (`src/core/data/repositories.ts`), nunca de un SDK concreto. Los adaptadores viven en
   `src/infrastructure/providers/`.
3. **Límites explícitos**: los componentes de presentación no llaman a Supabase, Apps Script ni
   Cloudflare directamente. Consumen *hooks* de aplicación (TanStack Query) que usan el proveedor
   activo.
4. **Modelo de dominio provider-neutral**: `src/shared/types/domain` define las entidades. Los
   *mappers* traducen respuestas de proveedor a dominio y **descartan** cualquier campo interno de
   decisión de empleo.

## Estructura

```
src/
  app/                      # App Router: (public) (auth) (candidate) + api
  core/                     # config, auth types, data contracts, errors, observability, security
  design-system/            # tokens (CSS), primitives, motion, themes
  features/                 # auth, jobs, applications, cv, assessments, notifications,
                            # candidate-profile, media-content, accessibility
  infrastructure/           # providers (mock/supabase/apps-script/hybrid), mappers, clients
  shared/                   # components, hooks, lib, utils, types/domain
  test/                     # setup de Vitest
e2e/                        # especificaciones Playwright
docs/                       # esta documentación
```

## Flujo de datos (lectura)

```
Componente (client) ──► hook TanStack Query ──► getDataProvider() ──► Repositorio (contrato)
                                                                         │
                            ┌────────────────────────────────────────────┤
                            ▼                 ▼                 ▼          ▼
                          mock            supabase*        apps-script   hybrid
                                                                         │
                                                   mappers → modelo de dominio (sin campos internos)
```

`*` Los proveedores Supabase/Apps Script son límites listos para integrar (ver
`BACKEND_INTEGRATION_PLAN.md`). En el MVP el *factory* degrada a mock cuando faltan credenciales.

## Server vs. Client Components

- Páginas de **contenido público** (landing, detalle de convocatoria) son **Server Components**:
  hacen la lectura con `getDataProvider()` en el servidor y envían HTML con mínimo JS.
- Las zonas **interactivas** (directorio con filtros, panel del candidato, *runner* de evaluación)
  son Client Components con TanStack Query. El proveedor mock funciona en ambos entornos (memoria en
  servidor, `localStorage` en navegador).

## Límites entre *features*

- Se importa desde la "API pública" de cada *feature* (sus componentes/hooks exportados), evitando
  alcanzar archivos internos de otra *feature*.
- El modelo de dominio compartido vive en `shared/types/domain` para no crear dependencias cruzadas
  entre *features*.

## Preparado para monorepo

El código está organizado para migrar (sin forzarlo ahora) a:

```
apps/ candidate-portal · hr-admin · archive-console · onboarding-portal
packages/ design-system · domain · api-contracts · validation · auth · observability · configuration
```

Los primitivos de `design-system` no asumen nada del portal de candidatos, y **no** se comparte
lógica de autorización de servidor a través de paquetes de frontend.
