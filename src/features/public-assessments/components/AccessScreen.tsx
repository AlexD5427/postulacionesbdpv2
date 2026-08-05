'use client';

/**
 * Puerta de entrada: el **Número identificador**.
 *
 * ── El cambio respecto de la iteración anterior ──────────────────────────────
 * Antes esta pantalla pedía el código de la evaluación (`EVL-XXXX-YYYY`), el nombre
 * y el carnet: tres datos, uno de ellos un código que el candidato no puede recordar
 * ni reconstruir. Ahora pide el **número identificador**
 * (`CarnetDeIdentidad-N.ºdeProceso-Año`), que es un dato que la persona **sabe**
 * porque lo forma con su propio documento y el proceso al que postula.
 *
 * ── Y el código de la evaluación, entonces ───────────────────────────────────
 * Sigue existiendo, porque el backend lo necesita para saber **qué** prueba abrir: el
 * número identificador dice quién eres y en qué proceso, no qué evaluación rindes (un
 * mismo proceso puede tener varias). La resolución es la que hace desaparecer el
 * problema en la práctica:
 *
 *  · **Con el enlace de la invitación** (`/evaluaciones?codigo=EV-…`), que es el
 *    camino normal, el código ya viene y aquí sólo se pide el número identificador y
 *    el nombre. Una sola cosa que escribir.
 *  · **Sin enlace**, se pide también el código, con su etiqueta explicando de dónde
 *    sale. Ocultarlo dejaría un callejón sin salida: la pantalla no podría abrir nada
 *    y el candidato no sabría por qué.
 *
 * ── Privacidad ───────────────────────────────────────────────────────────────
 * El nombre y el carnet viven en el estado del componente y viajan **sólo** al
 * backend de Evaluaciones. No van a la URL, ni a `localStorage`, ni a una línea de
 * registro. El formulario explica para qué se piden antes de pedirlos, y la casilla
 * de tratamiento de datos es una puerta real: sin marcarla no se puede continuar.
 */

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Fingerprint, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Field } from '@/design-system/primitives/Field';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Input } from '@/design-system/primitives/Input';
import { Alert } from '@/shared/components/Alert';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import {
  analizarNumeroIdentificador,
  formatearMientrasEscribe,
  normalizarCodigoEvaluacion,
  pareceCodigoEvaluacion,
  type NumeroIdentificador,
} from '../domain/identifier';
import { DemoBanner } from './pieces';

export interface DatosAcceso {
  numero: NumeroIdentificador;
  nombre: string;
  codigo: string;
}

interface Props {
  /** Código que llegó por el enlace, ya normalizado. */
  codigoDelEnlace?: string;
  enviando: boolean;
  /** Error seguro de mostrar de un intento anterior. */
  error?: { mensaje: string; pista?: string } | null;
  demostracion: boolean;
  onEnviar: (datos: DatosAcceso) => void;
}

export function AccessScreen({
  codigoDelEnlace,
  enviando,
  error,
  demostracion,
  onEnviar,
}: Props) {
  const reducido = useReducedMotion();
  const [numeroBruto, setNumeroBruto] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigoBruto, setCodigoBruto] = useState('');
  const [acepta, setAcepta] = useState(false);
  /**
   * Qué campos ha visitado la persona.
   *
   * Se lleva por campo y no con un único indicador global. Con uno global, salir del
   * primer campo pinta en rojo los dos siguientes, que nadie ha llegado a tocar: es
   * desalentador y hace ruido justo cuando alguien está intentando entrar. Al pulsar
   * «Continuar» se marcan todos, que es cuando sí hay que señalar lo que falta.
   */
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const tocar = (campo: string) => setTocados((previo) => ({ ...previo, [campo]: true }));

  const codigoEnElEnlace = Boolean(codigoDelEnlace);

  /**
   * Análisis en vivo del número identificador.
   *
   * Se calcula en cada tecla para poder mostrar las tres partes reconocidas debajo
   * del campo. Ese eco es lo que hace el formato evidente sin un párrafo de
   * instrucciones: escribes `1234567-12-2026` y ves «Carnet 1234567 · Proceso 12 ·
   * Año 2026». Si algo no encaja, lo dice en cuanto hay suficiente para saberlo.
   */
  const analisis = useMemo(() => analizarNumeroIdentificador(numeroBruto), [numeroBruto]);

  const codigo = codigoEnElEnlace
    ? (codigoDelEnlace ?? '')
    : normalizarCodigoEvaluacion(codigoBruto);

  const errorNumero =
    tocados.numero && !analisis.ok && numeroBruto.trim() !== '' ? analisis.mensaje : undefined;
  const errorNombre =
    tocados.nombre && nombre.trim().length < 3 ? 'Escribe tu nombre y apellidos.' : undefined;
  const errorCodigo =
    tocados.codigo && !codigoEnElEnlace && !pareceCodigoEvaluacion(codigo)
      ? 'Escribe el código que aparece en tu invitación.'
      : undefined;

  const listo =
    analisis.ok && nombre.trim().length >= 3 && pareceCodigoEvaluacion(codigo) && acepta;

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    setTocados({ numero: true, nombre: true, codigo: true });
    if (!listo || !analisis.ok) return;
    onEnviar({ numero: analisis.valor, nombre: nombre.trim().replace(/\s+/g, ' '), codigo });
  };

  return (
    <GlassSurface
      variant="elevated"
      radius="3xl"
      padding="lg"
      className="glass-sheen mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <header className="flex flex-col gap-3">
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl"
          style={{ backgroundColor: 'rgb(var(--ev-accent) / 0.14)', color: 'rgb(var(--ev-accent-ink))' }}
        >
          <Fingerprint className="h-7 w-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rendir una evaluación</h1>
          <p className="text-muted-foreground">
            Identifícate con tu <strong className="font-semibold text-foreground">número
            identificador</strong> para abrir la evaluación que te asignó el equipo de Talento
            Humano. No necesitas crear una cuenta.
          </p>
        </div>
      </header>

      {demostracion && <DemoBanner />}

      {error && (
        <Alert tone="warning" title="No pudimos abrir la evaluación">
          {error.mensaje}
          {error.pista ? <span className="mt-1 block text-xs">{error.pista}</span> : null}
        </Alert>
      )}

      <form noValidate className="flex flex-col gap-5" onSubmit={enviar}>
        <Field
          label="Número identificador"
          required
          description="Tres partes separadas por guiones: tu carnet de identidad, el número del proceso y el año. Por ejemplo: 1234567-12-2026."
          error={errorNumero}
        >
          {(campo) => (
            <Input
              {...campo}
              value={numeroBruto}
              onChange={(evento) => setNumeroBruto(formatearMientrasEscribe(evento.target.value))}
              onBlur={() => tocar('numero')}
              // `autoComplete="off"` y sin `name` reconocible: este valor contiene un
              // documento de identidad y no debe quedar en el autocompletado del
              // navegador de un equipo compartido.
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              placeholder="1234567-12-2026"
              disabled={enviando}
              className="ev-tabular text-lg tracking-wide"
            />
          )}
        </Field>

        {/* Eco de las partes reconocidas: hace el formato evidente sin explicarlo. */}
        <AnimatePresence initial={false}>
          {analisis.ok && (
            <motion.ul
              initial={reducido ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reducido ? undefined : { opacity: 0, height: 0 }}
              className="-mt-2 flex list-none flex-wrap gap-2 overflow-hidden"
            >
              {[
                { etiqueta: 'Carnet', valor: analisis.valor.carnet },
                { etiqueta: 'Proceso', valor: analisis.valor.proceso },
                { etiqueta: 'Año', valor: String(analisis.valor.anio) },
              ].map((parte) => (
                <li
                  key={parte.etiqueta}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: 'rgb(var(--ev-accent) / 0.4)',
                    backgroundColor: 'rgb(var(--ev-accent) / 0.08)',
                  }}
                >
                  <BadgeCheck
                    className="h-3.5 w-3.5"
                    style={{ color: 'rgb(var(--ev-accent-ink))' }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{parte.etiqueta}</span>
                  <span className="ev-tabular font-semibold">{parte.valor}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <Field label="Nombre completo" required error={errorNombre}>
          {(campo) => (
            <Input
              {...campo}
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              onBlur={() => tocar('nombre')}
              autoComplete="name"
              placeholder="Nombre y apellidos"
              disabled={enviando}
            />
          )}
        </Field>

        {codigoEnElEnlace ? (
          <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Evaluación</span>
            <span className="ev-tabular font-semibold">{codigoDelEnlace}</span>
          </p>
        ) : (
          <Field
            label="Código de la evaluación"
            required
            description="Aparece en el correo o el enlace de tu invitación. Si abriste el enlace completo, este campo no hace falta."
            error={errorCodigo}
          >
            {(campo) => (
              <Input
                {...campo}
                value={codigoBruto}
                onChange={(evento) =>
                  setCodigoBruto(normalizarCodigoEvaluacion(evento.target.value))
                }
                onBlur={() => tocar('codigo')}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="EV-XXXX-1234"
                disabled={enviando}
                className="ev-tabular"
              />
            )}
          </Field>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3.5 text-sm transition-colors hover:bg-muted/40">
          <Checkbox
            checked={acepta}
            disabled={enviando}
            className="mt-0.5 shrink-0"
            onCheckedChange={(marcado) => setAcepta(marcado === true)}
          />
          <span className="flex flex-col gap-1">
            <span>
              Acepto que el Banco de Desarrollo Productivo trate mi nombre, mi carnet de identidad y
              mis respuestas con la finalidad de evaluar mi postulación al proceso indicado.
            </span>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit font-medium text-primary underline underline-offset-4"
            >
              Leer el aviso de privacidad
            </Link>
          </span>
        </label>

        <Button type="submit" size="lg" loading={enviando} disabled={!listo || enviando}>
          Continuar
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
      </form>

      <ul className="flex list-none flex-col gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Tus datos viajan cifrados y sólo se envían al servicio de evaluaciones del banco.
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
          No se usa cámara, micrófono ni grabación de pantalla en ningún momento.
        </li>
      </ul>
    </GlassSurface>
  );
}
