# Motor de evaluaciones

Las evaluaciones se renderizan desde **esquemas** generados por el ATS interno. El *runner* nunca se
codifica para un test único.

## Modelo (`AssessmentDefinition`)

Metadatos, versión, instrucciones, `disclaimer`, duración estimada, ventana de disponibilidad,
política de intentos/reanudación/tiempo, **secciones** con **preguntas**, `consentVersion`,
`monitoringPolicyVersion`, opciones de accesibilidad y política de envío. Las **respuestas correctas
nunca** están en la definición que llega al candidato.

## Tipos de pregunta (renderizadores)

`single_choice`, `multiple_choice`, `true_false`, `short_text`, `long_text`, `numeric`, `currency`,
`date`, `ranking`, `likert`, `scenario`, `table_interpretation`. `file_response` y `media_response`
están **deshabilitados** por defecto (muestran un aviso).

Cada tipo: renderizador accesible (teclado/AT/móvil), validación (`answer-validation.ts`),
serialización y modo revisión. El *ranking* se ordena con botones subir/bajar (no *drag-only*).

## Contenido demostrativo

Ejemplos **originales** y no clínicos para Oficial de Créditos, Gerente de Agencia y Cajero/a, cada
uno con el aviso obligatorio:

> "Evaluación demostrativa para el MVP. No es un diagnóstico clínico ni psicológico y no se presenta
> como un instrumento psicométrico validado."

## Ejecución (`AssessmentRunner`)

Preflight → **consentimiento transparente** → inicio → navegación por secciones/preguntas → guardado
automático → reanudación → indicador de progreso → tiempo restante (solo si es cronometrada) → estado
de conexión → confirmación de envío → **comprobante de finalización**.

Sin patrones oscuros: no se impide salir, no se fuerza pantalla completa, no se bloquean acciones del
navegador y **cambiar de pestaña no se presenta como prueba de mala conducta**.

## Reglas de producto

- Sin puntaje de afinidad, ranking ni recomendación automática visible.
- El envío **no depende** del éxito de la telemetría (ver
  `ASSESSMENT_TELEMETRY_AND_PRIVACY.md`).
- El candidato puede solicitar una adaptación o evaluación alternativa antes de comenzar.
