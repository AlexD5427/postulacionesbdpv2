'use client';

/**
 * Orquestador del módulo público de evaluaciones.
 *
 *   acceso  →  antesala  →  prueba  →  comprobante
 *
 * Cada pantalla es un componente tonto: recibe datos y devuelve intenciones. Aquí
 * viven las tres decisiones que no se pueden delegar.
 *
 * ── 1 · Dónde empieza el reloj ───────────────────────────────────────────────
 * `openAssessment` no crea nada y no trae preguntas; `startAttempt` crea el intento y
 * arranca el temporizador **en el servidor**. Separarlos en dos pantallas es lo que
 * evita que alguien pierda dos minutos de su prueba leyendo las instrucciones.
 *
 * ── 2 · Idempotencia ─────────────────────────────────────────────────────────
 * `solicitudInicio` se crea una vez por intención de empezar y se reutiliza al
 * reintentar. Si el servidor reconoce ese identificador ya procesado devuelve
 * `{ repetida: true }` en lugar de la prueba: entonces se pide un identificador
 * NUEVO y se vuelve a llamar, porque el backend reconocerá el intento en curso por
 * documento y lo retomará con su tiempo real y sus respuestas. Reintentar con el
 * mismo identificador devolvería la misma repetición para siempre, que es
 * exactamente el bucle en el que caía la iteración anterior.
 *
 * ── 3 · Qué se le cuenta a quien responde ────────────────────────────────────
 * Los errores de infraestructura se registran y se muestran como «no disponible». Los
 * mensajes que el backend escribió PARA el candidato («el plazo ya terminó», «ya
 * realizaste esta evaluación») se muestran tal cual: son la única información útil
 * que tiene la pantalla y ocultarlos no protege nada. La distinción vive en
 * `errors.ts`, no aquí.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ServerCrash } from 'lucide-react';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { logger } from '@/core/observability/logger';
import type { ComprobanteIntento, InicioIntento, PortadaPublica } from '../domain/contract';
import { normalizarCodigoEvaluacion } from '../domain/identifier';
import {
  abrirEvaluacion,
  esRepeticionDeInicio,
  iniciarIntento,
  nuevaSolicitudId,
} from '../api/client';
import { esModoDemostracion } from '../api/endpoint';
import {
  esProblemaDeConfiguracion,
  mensajeParaCandidato,
  pistaParaCandidato,
} from '../api/errors';
import { AccessScreen, type DatosAcceso } from './AccessScreen';
import { BriefingScreen } from './BriefingScreen';
import { RunnerScreen } from './RunnerScreen';
import { ReceiptScreen } from './ReceiptScreen';

type Fase = 'acceso' | 'antesala' | 'prueba' | 'comprobante';

interface ErrorVisible {
  mensaje: string;
  pista?: string;
}

interface Props {
  /** Código que venía en el enlace (`?codigo=`, `?code=` o `?c=`). */
  codigoInicial?: string;
}

export function PublicAssessmentFlow({ codigoInicial }: Props) {
  const demostracion = esModoDemostracion();

  const [fase, setFase] = useState<Fase>('acceso');
  const [portada, setPortada] = useState<PortadaPublica | null>(null);
  const [inicio, setInicio] = useState<InicioIntento | null>(null);
  const [comprobante, setComprobante] = useState<ComprobanteIntento | null>(null);
  const [acceso, setAcceso] = useState<DatosAcceso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState<ErrorVisible | null>(null);
  const [errorInicio, setErrorInicio] = useState<ErrorVisible | null>(null);
  const [errorFatal, setErrorFatal] = useState<string | null>(null);

  /** Identificador de la intención «empezar esta evaluación». */
  const solicitudInicio = useRef<string>(nuevaSolicitudId());

  const codigoDelEnlace = codigoInicial ? normalizarCodigoEvaluacion(codigoInicial) : '';

  /* ------------------------------ Tema visual ---------------------------- */

  /**
   * El acento y la densidad que el autor eligió en el ATS.
   *
   * Se aplican como atributos en la raíz del módulo, y el CSS deriva de ahí todo el
   * color. Así una evaluación «esmeralda» tiñe el aro del reloj, las opciones
   * elegidas, el canto de las tarjetas y el sello del comprobante sin una sola
   * condición repartida por los componentes.
   */
  const tema = inicio?.prueba.tema ?? portada?.tema;

  /* ------------------------------- Acciones ------------------------------ */

  const abrir = useCallback(async (datos: DatosAcceso) => {
    setCargando(true);
    setErrorAcceso(null);
    setErrorFatal(null);
    try {
      const resultado = await abrirEvaluacion(datos.codigo);
      setAcceso(datos);
      setPortada(resultado);
      // Identificación nueva es intención nueva: identificador nuevo.
      solicitudInicio.current = nuevaSolicitudId();
      setErrorInicio(null);
      setFase('antesala');
    } catch (error) {
      if (esProblemaDeConfiguracion(error)) {
        // Un problema del portal, no de la persona. Se registra con el diagnóstico
        // completo para quien opera y en pantalla se dice lo justo.
        logger.error('evaluaciones: no se pudo abrir la evaluación', {
          diagnostico: error instanceof Error ? error.message : 'desconocido',
        });
        setErrorFatal(mensajeParaCandidato(error));
      } else {
        setErrorAcceso({ mensaje: mensajeParaCandidato(error), pista: pistaParaCandidato(error) });
      }
    } finally {
      setCargando(false);
    }
  }, []);

  const comenzar = useCallback(
    async (consentimiento: boolean, reintentoLimpio = false) => {
      if (!acceso || !portada) return;
      setCargando(true);
      setErrorInicio(null);
      if (reintentoLimpio) solicitudInicio.current = nuevaSolicitudId();

      try {
        const resultado = await iniciarIntento(
          acceso.codigo,
          {
            nombre: acceso.nombre,
            documento: acceso.numero.carnet,
            numeroIdentificador: acceso.numero.completo,
          },
          {
            consentimiento,
            // Se manda la zona horaria (no la ubicación) porque el informe del revisor
            // muestra horas y sin ella se leerían en UTC.
            zonaHoraria:
              typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
            agenteUsuario:
              typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 280) : '',
            solicitudId: solicitudInicio.current,
          },
        );
        setInicio(resultado);
        setFase('prueba');
      } catch (error) {
        if (esRepeticionDeInicio(error) && !reintentoLimpio) {
          // Segundo clic o reintento tras un corte: el intento ya existe. Con un
          // identificador nuevo, el backend lo retoma en lugar de duplicarlo.
          setCargando(false);
          void comenzar(consentimiento, true);
          return;
        }
        setErrorInicio({ mensaje: mensajeParaCandidato(error), pista: pistaParaCandidato(error) });
      } finally {
        setCargando(false);
      }
    },
    [acceso, portada],
  );

  const volverAlAcceso = useCallback(() => {
    setFase('acceso');
    setPortada(null);
    setAcceso(null);
    setErrorInicio(null);
  }, []);

  /* ---------------------------- Título del documento --------------------- */

  useEffect(() => {
    const titulo = inicio?.prueba.titulo ?? portada?.titulo;
    if (!titulo) return;
    const anterior = document.title;
    document.title = `${titulo} · BDP`;
    return () => {
      document.title = anterior;
    };
  }, [inicio?.prueba.titulo, portada?.titulo]);

  /* --------------------------------- Vista ------------------------------- */

  if (errorFatal) {
    return (
      <Contenedor tema={tema}>
        <GlassSurface
          variant="elevated"
          radius="3xl"
          padding="lg"
          className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/15 text-danger">
            <ServerCrash className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Evaluaciones no disponibles</h1>
          <p className="text-muted-foreground">{errorFatal}</p>
          <p className="text-sm text-muted-foreground">
            No es algo que puedas resolver desde aquí. Avisa a la persona que te envió el enlace y
            vuelve a intentarlo más tarde.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Volver a intentarlo
          </Button>
        </GlassSurface>
      </Contenedor>
    );
  }

  return (
    <Contenedor tema={tema}>
      {fase === 'acceso' && (
        <AccessScreen
          codigoDelEnlace={codigoDelEnlace || undefined}
          enviando={cargando}
          error={errorAcceso}
          demostracion={demostracion}
          onEnviar={(datos) => void abrir(datos)}
        />
      )}

      {fase === 'antesala' && portada && acceso && (
        <BriefingScreen
          portada={portada}
          nombre={acceso.nombre}
          numeroIdentificador={acceso.numero.completo}
          iniciando={cargando}
          error={errorInicio}
          demostracion={demostracion}
          onComenzar={(consentimiento) => void comenzar(consentimiento)}
          onVolver={volverAlAcceso}
          onReintentar={() => void abrir(acceso)}
        />
      )}

      {fase === 'prueba' && inicio && (
        <RunnerScreen
          inicio={inicio}
          demostracion={demostracion}
          onEnviado={(recibo) => {
            setComprobante(recibo);
            setFase('comprobante');
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {fase === 'comprobante' && comprobante && (
        <ReceiptScreen comprobante={comprobante} demostracion={demostracion} />
      )}

      {cargando && fase === 'acceso' && (
        <div className="mt-6 grid place-items-center" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
          <span className="sr-only">Abriendo la evaluación…</span>
        </div>
      )}
    </Contenedor>
  );
}

/**
 * Raíz del módulo: aporta el acento, la densidad y la aurora.
 *
 * El `data-acento` viaja aquí y no en cada componente porque el CSS deriva de él
 * todo el color del runner. Es la diferencia entre un tema y una condición repetida
 * treinta veces.
 */
function Contenedor({
  tema,
  children,
}: {
  tema: { acento: string; densidad: string } | undefined;
  children: React.ReactNode;
}) {
  return (
    <div
      className="ev-root relative"
      data-acento={tema?.acento ?? 'cian'}
      data-densidad={tema?.densidad ?? 'comoda'}
    >
      <div className="ev-aurora" aria-hidden />
      <motion.div
        className="relative z-content"
        initial={false}
        animate={{ opacity: 1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
