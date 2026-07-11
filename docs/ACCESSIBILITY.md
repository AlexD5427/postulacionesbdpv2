# Accesibilidad

**Objetivo: WCAG 2.2 AA**, con mejoras AAA seleccionadas (especialmente control de movimiento).

## Global

- HTML semántico, `lang="es"`, regiones *landmark* y jerarquía de encabezados.
- **Enlace "Saltar al contenido"** (`SkipLink`) visible al enfocar.
- Navegación completa por teclado y **foco visible** en todo momento (`:focus-visible`).
- Diálogos con **atrapado y restauración de foco** (Radix Dialog).
- Etiquetas para lectores de pantalla, mensajes de error accesibles (`role="alert"`,
  `aria-invalid`, `aria-errormessage` vía el primitivo `Field`).
- **Regiones *live*** para feedback asíncrono (guardado, contadores, estados de carga).
- Contraste suficiente; el estado **no** se comunica solo con color (los `Badge` usan texto + forma).
- Zoom de texto hasta 200% (tipografía en `rem` escalada por `--a11y-font-scale`), sin desplazamiento
  horizontal.
- **Sin funcionalidad exclusiva de *hover*** ni de arrastrar: el reordenamiento del CV y del *ranking*
  usa botones subir/bajar.
- `alt` en imágenes; subtítulos y transcripción para video con voz (`AccessibleVideo`).

## Centro de accesibilidad

Panel persistente (botón flotante en todas las páginas) con controles **independientes** que
persisten localmente y se aplican antes del *paint*:

- Aumentar / reducir / restaurar tamaño de texto.
- Alto contraste.
- Reducir movimiento.
- Reducir transparencia (vuelve opaco el vidrio).
- Modo de lectura cómoda (interlineado y ancho de línea).
- Resaltar enlaces y botones.
- Foco reforzado.
- Restaurar valores predeterminados.

Respeta además los ajustes del sistema operativo (`prefers-reduced-motion`, esquema de color).

## Evaluaciones

Antes de comenzar se muestran: instrucciones de teclado, expectativa de tiempo, política de
guardado/reanudación, **divulgación del monitoreo técnico**, y una opción de **solicitar una
adaptación** con la aclaración de que hacerlo **no afecta la postulación**. No se penaliza el uso de
tecnología de apoyo; no se fuerza pantalla completa ni se bloquean acciones del navegador.

## Verificación (QA manual sugerido)

1. **Teclado**: recorre toda la app solo con Tab/Shift+Tab/Enter/Espacio/flechas. Verifica el orden y
   que el foco nunca quede atrapado fuera de un diálogo.
2. **Lector de pantalla** (NVDA/VoiceOver): verifica encabezados, etiquetas de formularios, anuncios
   *live* y nombres de botones con solo íconos.
3. **Zoom 200%**: aumenta el zoom del navegador; no debe haber *scroll* horizontal ni recortes.
4. **Alto contraste** y **transparencia reducida**: actívalos en el centro de accesibilidad.
5. **Reduced motion**: actívalo y confirma que no hay animaciones esenciales ni parpadeos.
6. **Táctil móvil**: objetivos ≥ 44px, hojas inferiores, sin dependencia de *hover*.
7. **Errores de formulario**: envía formularios vacíos y confirma mensajes accesibles.
8. **Video**: verifica subtítulos/transcripción y pausa fuera de viewport.

### Automatizado

`e2e/accessibility.spec.ts` ejecuta **axe-core** sobre páginas clave (fallando ante violaciones
*serious*/*critical*) y comprueba el enlace de saltar al contenido por teclado.
