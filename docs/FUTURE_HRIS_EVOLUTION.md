# Evolución hacia el HRIS/HCM (sin convertirse en monolito)

Este portal es el primer módulo público de una plataforma mayor. Estas son las costuras que permiten
crecer sin reescribir.

## De candidato a persona

- `PersonIdentity` es deliberadamente **más amplia** que "candidato" y puede convertirse en la
  identidad compartida de empleados, evaluadores y personal de RR. HH.
- La invitación de candidato puede evolucionar a **onboarding de candidato seleccionado** sin cambiar
  la identidad base.

## Fronteras de datos que se deben preservar

- El **CV digital** (autoría del candidato) se mantiene **distinto** del futuro **expediente del
  empleado** (autoría de RR. HH.).
- Los documentos de reclutamiento pasan a documentos del empleado **solo** mediante un flujo explícito
  de RR. HH., nunca por copia implícita.
- Los datos de decisión de empleo (rank, fit, etapa, notas de entrevista, razones de rechazo) **nunca**
  cruzan al portal público.

## Separación por roles y aplicaciones

- Grupos de rutas o **aplicaciones separadas** por rol: `candidate-portal`, `hr-admin`,
  `archive-console`, `onboarding-portal`.
- **Sistema de diseño compartido** y **paquetes de dominio** compartidos.
- **Integración de auth compartida**, pero **políticas de autorización separadas** por aplicación.
- La lógica de autorización de servidor **no** se comparte vía paquetes de frontend.

## Migración a monorepo (posible)

```
apps/    candidate-portal · hr-admin · archive-console · onboarding-portal
packages/ design-system · domain · api-contracts · validation · auth · observability · configuration
```

Los primitivos de diseño no asumen nada del portal de candidatos, lo que facilita extraerlos a un
paquete.

## Fronteras futuras

- **Archive API** del banco para procesos cerrados / registros históricos (proveedor `archive_api`).
- **Object storage** (R2) para documentos privados.
- **Document intelligence** y, más adelante, **pgvector + RAG** para búsqueda/resumen sobre registros
  **autorizados**, siempre server-side y con acceso controlado.
- Retención de datos por dominio (postulaciones vs. expediente vs. telemetría), con la telemetría de
  evaluación almacenada por separado y con retención corta.
