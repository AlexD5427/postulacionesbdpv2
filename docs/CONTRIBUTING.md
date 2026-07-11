# Guía de contribución

## Flujo

1. Trabaja en ramas y abre PRs pequeñas y enfocadas.
2. Antes de subir, corre `npm run check` (typecheck + lint + test) y `npm run build`.
3. Mantén la app **ejecutable** después de cada lote de cambios.

## Convenciones

- **TypeScript estricto**. Evita `any`; prefiere tipos de dominio de `shared/types/domain`.
- **Sin llamadas directas a proveedores** desde componentes: usa *hooks* que consuman
  `getDataProvider()`.
- **Tokens, no valores crudos**: usa las clases/variables del sistema de diseño.
- **Accesibilidad primero**: todo control debe ser operable por teclado, con etiqueta y foco visible.
  Nada de funcionalidad exclusiva de *hover* o de arrastrar.
- **Reglas de producto**: nunca introduzcas afinidad/match/score, línea de tiempo del proceso interno,
  ni datos internos de decisión de empleo en el frontend público.
- **Privacidad**: no registres datos personales/sensibles; usa `logger` (redacta automáticamente).

## Estructura de una *feature*

```
features/<dominio>/
  components/   # UI
  hooks/        # TanStack Query / lógica de cliente
  schemas/      # Zod
  lib/          # helpers puros
  types/        # tipos específicos de la feature
```

## Pruebas

- Añade pruebas unitarias para lógica pura (mappers, validación, fusión, telemetría).
- Añade pruebas de componente para *guardias* de reglas de producto y accesibilidad.
- Nombra los tests en español; usa mensajes claros.

## Commits

- Mensajes descriptivos (es/en). Incluye co-autoría cuando corresponda.
- No subas secretos. `.env.local` está en `.gitignore`.
