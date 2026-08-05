# `public-assessments` — módulo temporal, sin inicio de sesión

Este directorio contiene **todo** el módulo público de evaluaciones. Está pensado para
retirarse en un solo commit cuando el portal exija acceso con Google.

## Cómo se retira

```bash
rm -rf src/features/public-assessments
rm -rf 'src/app/(public)/evaluaciones'
rm e2e/public-assessments.spec.ts
rm docs/PUBLIC_ASSESSMENTS.md
```

Y tres retoques de una línea: la entrada de la barra pública
(`shared/components/PublicNavbar.tsx`), la celda del dock
(`features/shell/components/Dock.tsx`) y la tarjeta de la portada
(`features/landing/components/LandingView.tsx`).

Nada más importa este directorio; `security.test.ts` lo comprueba recorriendo `src/`.
No hay estado global, no pasa por `DataProvider`, no toca el motor autenticado de
`(candidate)/candidate/assessments` y no deja migraciones pendientes.

## Mapa del directorio

```
assessment.css              Lenguaje visual del módulo (acentos, aurora, controles).
                            Vive aquí para desaparecer con él.

domain/                     Nada de red, nada de React. Se prueba sin montar un DOM.
  contract.ts               El contrato del backend 2.0.0, tipado. Fuente única.
  question-types.ts         Los 39 tipos, espejo de `08_Types.gs` del ATS.
  rich-text.ts              Modelo de texto enriquecido: saneamiento y texto plano.
  identifier.ts             Número identificador (CI-Proceso-Año) y código público.
  answers.ts                Forma del valor por tipo, validación y serialización.

api/                        La frontera con el mundo. Nada de React.
  endpoint.ts               Clasifica la URL del Web App ANTES de usarla.
  transport.ts              Las tres reglas de Apps Script, en un solo sitio.
  envelope.ts               Lectura del envoltorio y `solicitudId`.
  payloads.ts               Borra claves prohibidas y valida con Zod.
  errors.ts                 Un error con dos audiencias: candidato y operador.
  client.ts                 Las cinco acciones del candidato, tipadas.
  demo.ts                   Backend local que habla el mismo contrato.

hooks/
  use-server-clock.ts       El reloj, cuyo dueño es el servidor.
  use-integrity.ts          Rastro de integridad, con cola confirmable.

state/
  draft.ts                  Borrador en sessionStorage. Sin token, sin datos personales.

components/
  PublicAssessmentFlow.tsx  Orquestador: acceso → antesala → prueba → comprobante.
  AccessScreen.tsx          Número identificador, nombre y consentimiento.
  BriefingScreen.tsx        Antesala: instrucciones e integridad, antes del reloj.
  RunnerScreen.tsx          La prueba: reloj, autoguardado, latido, envío.
  QuestionCard.tsx          Una pregunta o un bloque de contenido.
  AnswerControl.tsx         Un control por forma de respuesta (catorce).
  ReviewDialog.tsx          Revisión previa al envío, con pendientes navegables.
  ReceiptScreen.tsx         Comprobante. Nunca muestra una nota que no llegó.
  RichText.tsx              Renderizador seguro. Sin innerHTML, jamás.
  pieces.tsx                Reloj, progreso, navegador y avisos.
```

## Lo que hay que saber antes de tocar algo

1. **El servidor manda.** El navegador nunca calcula una nota, nunca decide un estado y
   nunca ve una clave de respuesta.
2. **Un `solicitudId` por intención, y el mismo al reintentar.** Es el único mecanismo
   de idempotencia que existe. Renovarlo en un reintento duplica el intento.
3. **Las tres reglas del transporte** (`redirect: follow`, `text/plain`, `solicitudId`)
   viven en `api/transport.ts` y en ningún otro sitio.
4. **El texto enriquecido no se convierte a HTML nunca.** Se sanea en `api/payloads.ts`
   y se pinta recorriendo nodos.
5. **Si añades un tipo de pregunta**, añádelo en `domain/question-types.ts` y en la
   lista de `domain/question-types.test.ts`. La suite falla si sólo lo pones en uno.

El contrato completo, el porqué de cada decisión y las limitaciones reconocidas están
en [`docs/PUBLIC_ASSESSMENTS.md`](../../../docs/PUBLIC_ASSESSMENTS.md).
