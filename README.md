# Portal público de candidatos — Banco de Desarrollo Productivo BDP S.A.M.

Frontend público, accesible y **backend-agnóstico** para el reclutamiento y la selección del
**Banco de Desarrollo Productivo BDP S.A.M.** (La Paz, Bolivia). Está construido como el **primer
módulo público** de una futura plataforma HRIS/HCM ("People Portal"), con límites arquitectónicos
claros para crecer sin reescribir el frontend.

Toda la interfaz está en **español (Latinoamérica)**.

> **Reglas de producto no negociables**: el portal nunca muestra al candidato una línea de tiempo del
> proceso interno, ni puntajes de afinidad/match, ni decisiones automatizadas de empleo. La telemetría
> de las evaluaciones es transparente, mínima y aislada, sin fingerprinting. Ver
> [`docs/ASSESSMENT_TELEMETRY_AND_PRIVACY.md`](docs/ASSESSMENT_TELEMETRY_AND_PRIVACY.md).

---

## Stack

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Framework | **Next.js 15 (App Router)** + **React 19** | RSC para páginas de contenido, streaming, rutas. |
| Lenguaje | **TypeScript** (modo estricto + `noUncheckedIndexedAccess`) | Seguridad de tipos de extremo a extremo. |
| Estilos | **Tailwind CSS** + **CSS custom properties** | Tokens semánticos como única fuente de verdad. |
| Estado servidor | **TanStack Query** | Caché, reintentos y estados de carga/errores. |
| Estado cliente | **Zustand** | Accesibilidad y preferencias locales (poco estado). |
| Formularios | **React Hook Form** + **Zod** | Validación declarativa y accesible. |
| Movimiento | **Motion for React (framer-motion)** | Sistema de movimiento con *reduced-motion*. |
| Primitivos UI | **Radix UI** | Accesibilidad probada (diálogos, tabs, etc.). |
| Íconos | **lucide-react** | — |
| Pruebas | **Vitest** + **Testing Library** + **Playwright** + **axe-core** | Unitarias, componentes, e2e y accesibilidad. |

No se instalaron GSAP, Three.js/React Three Fiber ni Storybook: el WebGL es un *tier* opcional
documentado detrás de un flag y no aporta valor suficiente para el MVP frente a su costo.

---

## Requisitos

- **Node.js ≥ 20.11** (probado con Node 22).
- npm (se incluye `package-lock.json`).

## Comandos

```bash
npm install            # instalar dependencias
npm run dev            # desarrollo (http://localhost:3000)
npm run build          # build de producción
npm run start          # servir el build
npm run typecheck      # tsc --noEmit (modo estricto)
npm run lint           # ESLint (next/core-web-vitals)
npm run test           # pruebas unitarias + de componentes (Vitest)
npm run check          # typecheck + lint + test
npm run test:e2e:install  # descargar Chromium para Playwright (requiere red)
npm run test:e2e          # pruebas end-to-end (Playwright)
```

**Modo mock por defecto: la aplicación funciona sin ninguna credencial.**

---

## Rutas para probar

| Ruta | Descripción |
| --- | --- |
| `/` | Landing pública (Liquid Glass, convocatorias destacadas). |
| `/jobs` | Directorio con búsqueda, filtros, orden y paginación. |
| `/jobs/BDP-CRE-001` | Detalle dinámico renderizado desde bloques de contenido. |
| `/accessibility`, `/privacy`, `/terms`, `/help` | Contenido y centro de accesibilidad. |
| `/register`, `/login`, `/forgot-password`, `/reset-password` | Autenticación. |
| `/candidate` | Panel del candidato (requiere sesión; en mock, cualquier registro/login sirve). |
| `/candidate/profile`, `/cv`, `/cover-letters` | Perfil, CV digital, cartas. |
| `/candidate/applications`, `/candidate/applications/new?job=<id>` | Historial y asistente de postulación. |
| `/candidate/assessments`, `/candidate/assessments/<id>` | Evaluaciones y *runner*. |
| `/candidate/notifications`, `/candidate/settings` | Notificaciones y ajustes. |
| `/api/health` | Estado del servicio (sin datos sensibles). |

---

## Variables de entorno

Copia [`.env.example`](.env.example) a `.env.local`. Todo tiene valores por defecto seguros para
mock. Resumen:

- **Cliente (`NEXT_PUBLIC_*`)**: `NEXT_PUBLIC_DATA_MODE` (`mock|supabase|apps-script|hybrid`), flags
  de funcionalidades y endpoints públicos.
- **Solo servidor (sin `NEXT_PUBLIC_`)**: `SUPABASE_SERVICE_ROLE_KEY`, `R2_*`,
  `APPS_SCRIPT_SERVER_SECRET`, etc. **El navegador nunca debe requerir estos valores.**

La configuración se valida con Zod al inicio (`src/core/config/env.ts`) y falla de forma clara en
desarrollo.

### Cambiar el modo de datos

Ajusta `NEXT_PUBLIC_DATA_MODE`. El *factory* en `src/infrastructure/providers/factory.ts` selecciona
el proveedor y **degrada a mock** si faltan credenciales, de modo que la app siempre es ejecutable.

---

## Documentación

| Documento | Contenido |
| --- | --- |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Estructura por *features*, límites y flujo de datos. |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Tokens, primitivos, movimiento, temas. |
| [LIQUID_GLASS_IMPLEMENTATION](docs/LIQUID_GLASS_IMPLEMENTATION.md) | Material "Liquid Glass" y sus *fallbacks*. |
| [ACCESSIBILITY](docs/ACCESSIBILITY.md) | WCAG 2.2 AA, centro de accesibilidad, QA manual. |
| [SECURITY](docs/SECURITY.md) | Cabeceras, CSP, límites de auth, logging redactado. |
| [DATA_PROVIDER_ARCHITECTURE](docs/DATA_PROVIDER_ARCHITECTURE.md) | Contratos de repositorio y proveedores. |
| [HYBRID_SUPABASE_APPS_SCRIPT](docs/HYBRID_SUPABASE_APPS_SCRIPT.md) | Modelo híbrido y política de fuente de verdad. |
| [MEDIA_CONTENT_MODEL](docs/MEDIA_CONTENT_MODEL.md) | Bloques de contenido y modelo de media. |
| [ASSESSMENT_ENGINE](docs/ASSESSMENT_ENGINE.md) | Motor de evaluaciones *schema-driven*. |
| [ASSESSMENT_TELEMETRY_AND_PRIVACY](docs/ASSESSMENT_TELEMETRY_AND_PRIVACY.md) | Telemetría de integridad y privacidad. |
| [BACKEND_INTEGRATION_PLAN](docs/BACKEND_INTEGRATION_PLAN.md) | Cómo conectar Supabase, Apps Script y R2. |
| [FUTURE_HRIS_EVOLUTION](docs/FUTURE_HRIS_EVOLUTION.md) | Evolución hacia el HRIS/HCM sin monolito. |
| [TESTING](docs/TESTING.md) | Estrategia de pruebas y verificación de accesibilidad. |
| [CONTRIBUTING](docs/CONTRIBUTING.md) | Convenciones y flujo de trabajo. |

---

## Estado de la verificación

- ✅ `npm run build` (producción) — compila.
- ✅ `npm run typecheck` — sin errores (modo estricto).
- ✅ `npm run lint` — sin advertencias.
- ✅ `npm run test` — 43 pruebas unitarias/de componentes en verde.
- ⚠️ `npm run test:e2e` — las especificaciones están escritas; requieren descargar navegadores
  (`npm run test:e2e:install`) en un entorno con acceso a `cdn.playwright.dev`.

## Limitaciones conocidas (MVP)

- Los proveedores Supabase/Apps Script/R2 son **límites** listos para integrar; el MVP opera en mock.
- La guardia de rutas del candidato es de UX, **no** de autorización (ver SECURITY).
- La exportación a PDF del CV usa "Imprimir/Guardar como PDF" del navegador.
- Las cabeceras HSTS solo aplican en producción sobre HTTPS.
