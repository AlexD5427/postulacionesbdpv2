'use client';

/**
 * El runner: la evaluación tal como se responde.
 *
 * ── Lo que este componente garantiza ─────────────────────────────────────────
 *  · **El reloj es del servidor.** La cuenta local sólo mueve los dígitos; cada
 *    latido y cada guardado la corrigen con la verdad. Cambiar la hora del equipo,
 *    suspenderlo o recargar la página no regala ni un segundo.
 *  · **El progreso vive en el servidor.** `saveProgress` es idempotente por pregunta,
 *    así que se manda el cuestionario completo en cada autoguardado en lugar de
 *    llevar la cuenta de qué cambió: la contabilidad de deltas es exactamente donde
 *    se pierden respuestas.
 *  · **Un envío, una vez.** Un `ref` cierra la puerta antes de que React vuelva a
 *    pintar, así que ni un doble clic ni la expiración del tiempo pueden disparar dos
 *    envíos. Y si el envío falla, el reintento reutiliza el MISMO `solicitudId`.
 *  · **Autoenvío al expirar**, marcado como automático, para que el revisor sepa que
 *    la prueba se cerró sola.
 *  · **Nada se pierde en una recarga.** Sin token guardado: se vuelve a identificar y
 *    el backend retoma el intento con su tiempo real y sus respuestas.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudOff,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Save,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Alert } from '@/shared/components/Alert';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';
import type { ComprobanteIntento, InicioIntento, RespuestaEnviada } from '../domain/contract';
import {
  aRespuestasEnviadas,
  entradasDe,
  estaRespondida,
  etiquetaDePregunta,
  obligatoriasPendientes,
  opcionalesOmitidas,
  preguntasContestables,
  preguntasDesconocidas,
  problemaDeRespuesta,
  sembrarRespuestas,
  type MapaMetricas,
  type MapaRespuestas,
  type ValorRespuesta,
} from '../domain/answers';
import { textoPlanoBreve } from '../domain/rich-text';
import { enviarIntento, guardarProgreso, latido, nuevaSolicitudId } from '../api/client';
import { admiteReintento, mensajeParaCandidato, pistaParaCandidato } from '../api/errors';
import { useIntegridad } from '../hooks/use-integrity';
import { useRelojServidor } from '../hooks/use-server-clock';
import { borrarBorrador, cargarBorrador, guardarBorrador } from '../state/draft';
import { QuestionCard } from './QuestionCard';
import { RichText } from './RichText';
import { ReviewDialog, type PendienteRevision } from './ReviewDialog';
import { DemoBanner, ProgressMeter, QuestionNavigator, TimerRing } from './pieces';

/** Cada cuántos milisegundos se pregunta al servidor por el reloj. */
const LATIDO_MS = 20_000;

type EstadoGuardado = 'inactivo' | 'guardando' | 'guardado' | 'fallido';

interface Props {
  inicio: InicioIntento;
  demostracion: boolean;
  onEnviado: (comprobante: ComprobanteIntento) => void;
}

export function RunnerScreen({ inicio, demostracion, onEnviado }: Props) {
  const reducido = useReducedMotion();
  const { prueba } = inicio;
  const secciones = prueba.secciones;

  /* ------------------------------- Estado -------------------------------- */

  const [respuestas, setRespuestas] = useState<MapaRespuestas>(() => {
    // Lo que el servidor tiene manda; encima se aplica el borrador local, que sólo
    // puede contener lo respondido DESPUÉS del último guardado.
    const delServidor = sembrarRespuestas(secciones, inicio.respuestasPrevias);
    const local = cargarBorrador(inicio.intentoId, prueba.codigo, prueba.versionEtiqueta);
    return local ? { ...delServidor, ...local } : delServidor;
  });

  const [pagina, setPagina] = useState(0);
  const [mostrarProblemas, setMostrarProblemas] = useState(false);
  const [revisionAbierta, setRevisionAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('inactivo');
  const [navegadorAbierto, setNavegadorAbierto] = useState(false);
  const [aviso, setAviso] = useState<{ mensaje: string; pista: string; reintentable: boolean } | null>(
    null,
  );

  const metricas = useRef<MapaMetricas>({});
  const preguntaActiva = useRef<string | null>(null);
  const yaEnviado = useRef(false);
  /** Se crea una vez: un reintento del envío debe reutilizarlo tal cual. */
  const solicitudEnvio = useRef(nuevaSolicitudId());
  const contenedor = useRef<HTMLDivElement>(null);

  const reloj = useRelojServidor({
    segundosIniciales: inicio.segundosRestantes,
    duracionMinutos: prueba.aplicacion.duracionMinutos,
    corriendo: !enviando && !yaEnviado.current,
  });

  const integridad = useIntegridad({
    politica: prueba.integridad,
    iniciadoEn: inicio.iniciadoEn,
    activo: !yaEnviado.current,
  });

  /* --------------------------- Datos derivados ---------------------------- */

  const contestables = useMemo(() => preguntasContestables(secciones), [secciones]);
  const desconocidas = useMemo(() => preguntasDesconocidas(secciones), [secciones]);

  const numeroDe = useMemo(() => {
    const mapa = new Map<string, number>();
    contestables.forEach(({ pregunta }, indice) => mapa.set(pregunta.id, indice + 1));
    return mapa;
  }, [contestables]);

  const respondidas = contestables.filter(({ pregunta }) =>
    estaRespondida(respuestas[pregunta.id]),
  ).length;

  const pendientes = useMemo(
    () => obligatoriasPendientes(secciones, respuestas),
    [secciones, respuestas],
  );
  const omitidas = useMemo(() => opcionalesOmitidas(secciones, respuestas), [secciones, respuestas]);

  /**
   * Paginación según la navegación que el autor configuró.
   *
   * `libre` es una sola página con todo (lo más cómodo y lo más frecuente);
   * `secuencial` una página por sección; `una_por_pagina` una por bloque. Se paginan
   * TODAS las entradas, contenido incluido: un título de sección que aparece en la
   * página equivocada rompe el sentido de las preguntas que introduce.
   */
  const paginas = useMemo(() => {
    const todas = entradasDe(secciones);
    if (prueba.aplicacion.navegacion === 'una_por_pagina') return todas.map((entrada) => [entrada]);
    if (prueba.aplicacion.navegacion === 'secuencial') {
      return secciones.map((seccion) =>
        seccion.preguntas.map((pregunta) => ({ seccion, pregunta })),
      );
    }
    return [todas];
  }, [prueba.aplicacion.navegacion, secciones]);

  const indicePagina = Math.min(pagina, Math.max(0, paginas.length - 1));
  // Se memoriza para que su identidad sea estable: `idsEnPagina` depende de ella y, con
  // un `??` suelto, se recalcularía en cada renderizado y arrastraría al navegador de
  // preguntas con él.
  const paginaActual = useMemo(() => paginas[indicePagina] ?? [], [paginas, indicePagina]);
  const idsEnPagina = useMemo(
    () => new Set(paginaActual.map(({ pregunta }) => pregunta.id)),
    [paginaActual],
  );

  const entradasNavegador = useMemo(
    () =>
      contestables.map(({ pregunta }) => ({
        id: pregunta.id,
        numero: numeroDe.get(pregunta.id) ?? 0,
        etiqueta: textoPlanoBreve(pregunta.enunciado, 60),
        respondida: estaRespondida(respuestas[pregunta.id]),
        obligatoriaPendiente: pregunta.obligatoria && !estaRespondida(respuestas[pregunta.id]),
        // Con una sola página todo es alcanzable; con varias, sólo lo de esta página.
        alcanzable: paginas.length === 1 || idsEnPagina.has(pregunta.id),
      })),
    [contestables, numeroDe, respuestas, paginas.length, idsEnPagina],
  );

  const congelado = enviando || reloj.expirado || yaEnviado.current;

  /* ------------------------- Cuerpo de la petición ------------------------ */

  const cuerpoRespuestas = useCallback(
    (): RespuestaEnviada[] => aRespuestasEnviadas(secciones, respuestas, metricas.current),
    [secciones, respuestas],
  );

  /* -------------------------------- Envío -------------------------------- */

  const enviar = useCallback(
    async (automatico: boolean) => {
      // Puerta antes de cualquier `await`: dos clics seguidos no pueden atravesarla,
      // porque no hay ningún punto de suspensión entre la lectura y la escritura.
      if (yaEnviado.current) return;
      yaEnviado.current = true;
      setEnviando(true);
      setAviso(null);

      const lote = integridad.tomarLote();
      lote.push({
        tipo: automatico ? 'envio_automatico' : 'envio_manual',
        // Una secuencia alta y única para el cierre: el servidor descarta lo que ya
        // registró, así que sólo importa que no choque con un evento anterior.
        secuencia: 1_000_000,
        ocurridoEn: new Date().toISOString(),
      });

      try {
        const comprobante = await enviarIntento(
          inicio.intentoId,
          inicio.token,
          cuerpoRespuestas(),
          lote,
          automatico,
          solicitudEnvio.current,
        );
        integridad.confirmarLote(lote);
        borrarBorrador(inicio.intentoId);
        onEnviado(comprobante);
      } catch (error) {
        // Se reabre la puerta: el envío no ocurrió y la persona tiene que poder
        // reintentar. El `solicitudId` NO se renueva, así que si en realidad sí llegó
        // al servidor, el reintento devuelve el comprobante original en lugar de
        // registrar un segundo envío.
        yaEnviado.current = false;
        setEnviando(false);
        integridad.devolverLote(lote);
        setAviso({
          mensaje: mensajeParaCandidato(error),
          pista: pistaParaCandidato(error),
          reintentable: admiteReintento(error),
        });
      }
    },
    [cuerpoRespuestas, inicio.intentoId, inicio.token, integridad, onEnviado],
  );

  /* ----------------------------- Autoguardado ---------------------------- */

  const guardar = useCallback(
    async (silencioso: boolean) => {
      if (yaEnviado.current) return;
      if (!silencioso) setEstadoGuardado('guardando');
      const lote = integridad.tomarLote();
      try {
        const resultado = await guardarProgreso(
          inicio.intentoId,
          inicio.token,
          cuerpoRespuestas(),
          lote,
          // Cada autoguardado es una intención distinta y lleva su propio
          // identificador: reutilizar uno haría que el segundo se tratara como
          // repetición y no guardara nada.
          nuevaSolicitudId(),
        );
        integridad.confirmarLote(lote);
        reloj.sincronizar(resultado.segundosRestantes);
        setEstadoGuardado('guardado');
      } catch {
        // Un autoguardado fallido no interrumpe la prueba: se avisa en la barra y se
        // vuelve a intentar en el siguiente ciclo, con los eventos recuperados.
        integridad.devolverLote(lote);
        setEstadoGuardado('fallido');
      }
    },
    [cuerpoRespuestas, inicio.intentoId, inicio.token, integridad, reloj],
  );

  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  useEffect(() => {
    const cada = prueba.aplicacion.guardadoAutomaticoSegundos;
    if (cada <= 0) return;
    const temporizador = window.setInterval(() => {
      void guardarRef.current(true);
    }, cada * 1000);
    return () => window.clearInterval(temporizador);
  }, [prueba.aplicacion.guardadoAutomaticoSegundos]);

  /* -------------------------------- Latido ------------------------------- */

  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  useEffect(() => {
    // Sin límite de tiempo no hay nada que sincronizar: el latido sólo existe para
    // que el reloj sea del servidor.
    if (inicio.segundosRestantes === null) return;
    const temporizador = window.setInterval(() => {
      void (async () => {
        if (yaEnviado.current) return;
        try {
          const estado = await latido(inicio.intentoId, inicio.token);
          reloj.sincronizar(estado.segundosRestantes);
          if (estado.expirado && prueba.aplicacion.autoenviarAlExpirar) {
            void enviarRef.current(true);
          }
        } catch {
          // Un latido perdido no cambia nada: la cuenta local sigue y el siguiente
          // latido corrige. Molestar con un error por esto sería ruido.
        }
      })();
    }, LATIDO_MS);
    return () => window.clearInterval(temporizador);
  }, [
    inicio.intentoId,
    inicio.segundosRestantes,
    inicio.token,
    prueba.aplicacion.autoenviarAlExpirar,
    reloj,
  ]);

  /* --------------------------- Autoenvío al expirar ---------------------- */

  useEffect(() => {
    if (!reloj.expirado || yaEnviado.current) return;
    if (prueba.aplicacion.autoenviarAlExpirar) {
      setAviso({
        mensaje: 'Se agotó el tiempo. Estamos enviando tus respuestas…',
        pista: '',
        reintentable: false,
      });
      void enviarRef.current(true);
    } else {
      setAviso({
        mensaje: 'Se agotó el tiempo. Pulsa «Enviar» para registrar lo que respondiste.',
        pista: '',
        reintentable: false,
      });
    }
  }, [reloj.expirado, prueba.aplicacion.autoenviarAlExpirar]);

  /* ------------------------- Tiempo por pregunta ------------------------- */

  /**
   * Se atribuye un segundo por tictac a la pregunta activa.
   *
   * «Activa» es la que tiene el foco dentro, no la que está visible: con navegación
   * libre están todas visibles a la vez, y repartir el tiempo entre todas no diría
   * nada. Es la definición honesta de «tiempo dedicado a una pregunta».
   */
  useEffect(() => {
    if (!prueba.integridad.registrarTiempos) return;
    const temporizador = window.setInterval(() => {
      const id = preguntaActiva.current;
      if (!id || yaEnviado.current || document.hidden) return;
      const actual = metricas.current[id] ?? { visitas: 0, cambios: 0, segundos: 0 };
      metricas.current[id] = { ...actual, segundos: actual.segundos + 1 };
    }, 1000);
    return () => window.clearInterval(temporizador);
  }, [prueba.integridad.registrarTiempos]);

  const alEnfocar = useCallback((evento: React.FocusEvent<HTMLDivElement>) => {
    const contenedorPregunta = (evento.target as HTMLElement).closest?.('[id^="pregunta-"]');
    if (!contenedorPregunta) return;
    preguntaActiva.current = contenedorPregunta.id.replace('pregunta-', '');
  }, []);

  /* ----------------------------- Borrador local -------------------------- */

  useEffect(() => {
    guardarBorrador({
      codigo: prueba.codigo,
      intentoId: inicio.intentoId,
      versionEtiqueta: prueba.versionEtiqueta,
      respuestas,
    });
  }, [respuestas, inicio.intentoId, prueba.codigo, prueba.versionEtiqueta]);

  /* -------------------------------- Acciones ----------------------------- */

  const responder = useCallback(
    (preguntaId: string, valor: ValorRespuesta) => {
      if (congelado) return;
      const actual = metricas.current[preguntaId] ?? { visitas: 1, cambios: 0, segundos: 0 };
      metricas.current[preguntaId] = { ...actual, cambios: actual.cambios + 1 };
      preguntaActiva.current = preguntaId;
      setRespuestas((previo) => ({ ...previo, [preguntaId]: valor }));
      integridad.registrar('pregunta_respondida', { preguntaId });
      // Se vuelve a poner en «inactivo» para que el indicador no siga diciendo
      // «guardado» cuando ya hay cambios sin guardar. Es una mentira pequeña y
      // corrosiva: la gente cierra la pestaña confiando en ese texto.
      setEstadoGuardado('inactivo');
    },
    [congelado, integridad],
  );

  const irAPregunta = useCallback(
    (preguntaId: string) => {
      setRevisionAbierta(false);
      // Con varias páginas, primero hay que ir a la que contiene la pregunta.
      const destino = paginas.findIndex((entradas) =>
        entradas.some(({ pregunta }) => pregunta.id === preguntaId),
      );
      if (destino >= 0 && destino !== indicePagina) setPagina(destino);

      // Se espera un fotograma para que la página nueva exista en el DOM.
      window.requestAnimationFrame(() => {
        const nodo = document.getElementById(`pregunta-${preguntaId}`);
        if (!nodo) return;
        nodo.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
        // El foco va al primer control real: llevar la vista sin llevar el foco deja
        // a quien navega con teclado exactamente donde estaba.
        const control = nodo.querySelector<HTMLElement>(
          'input:not([type="hidden"]), select, textarea, button:not([tabindex="-1"])',
        );
        control?.focus({ preventScroll: true });
      });
    },
    [indicePagina, paginas, reducido],
  );

  const cambiarPagina = useCallback(
    (destino: number) => {
      const acotado = Math.max(0, Math.min(paginas.length - 1, destino));
      setPagina(acotado);
      integridad.registrar('seccion_cambiada', { detalle: { hacia: String(acotado + 1) } });
      // Guardar al cambiar de página: es el momento natural de un punto de control y
      // el más probable para que alguien cierre la pestaña creyendo que terminó.
      void guardarRef.current(true);
      window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    },
    [integridad, paginas.length, reducido],
  );

  const abrirRevision = () => {
    setMostrarProblemas(true);
    setRevisionAbierta(true);
  };

  const aPendiente = (entrada: { pregunta: { id: string } }): PendienteRevision => ({
    id: entrada.pregunta.id,
    numero: numeroDe.get(entrada.pregunta.id) ?? 0,
    etiqueta: etiquetaDePregunta(
      contestables.find(({ pregunta }) => pregunta.id === entrada.pregunta.id)!.pregunta,
      0,
    ),
  });

  /* --------------------------------- Vista ------------------------------- */

  const etiquetaGuardado: Record<EstadoGuardado, { texto: string; icono: ReactNode }> = {
    inactivo: {
      texto: 'Cambios sin guardar',
      icono: <Save className="h-3.5 w-3.5" aria-hidden />,
    },
    guardando: {
      texto: 'Guardando…',
      icono: <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />,
    },
    guardado: {
      texto: 'Progreso guardado',
      icono: <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />,
    },
    fallido: {
      texto: 'Sin conexión: se reintentará',
      icono: <CloudOff className="h-3.5 w-3.5 text-warning" aria-hidden />,
    },
  };

  return (
    <div className="flex flex-col gap-4" onFocusCapture={alEnfocar}>
      {demostracion && <DemoBanner />}

      {/* -------------------------- Barra de mando -------------------------- */}
      {/*
        Compacta a propósito, y esto se aprendió probándola en un navegador de verdad.
        La primera versión apilaba título, reloj, progreso y navegador de preguntas: unos
        200 px permanentemente fijos, que en un portátil es la quinta parte de la
        pantalla, y que además TAPABAN la opción a la que el navegador acababa de
        desplazarse. Ahora son dos filas de ~80 px y el navegador se abre bajo demanda,
        flotando: ocupa altura sólo cuando alguien lo pide.
      */}
      <GlassSurface
        variant="navigation"
        radius="3xl"
        padding="none"
        className="ev-commandbar relative flex flex-col gap-2 p-3"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{prueba.titulo}</h1>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {etiquetaGuardado[estadoGuardado].icono}
              {etiquetaGuardado[estadoGuardado].texto}
              {inicio.retomado && (
                <span className="rounded-full bg-info/15 px-2 py-0.5 text-[0.65rem] font-semibold text-info">
                  intento retomado
                </span>
              )}
            </p>
          </div>

          {contestables.length > 1 && (
            <button
              type="button"
              onClick={() => setNavegadorAbierto((abierto) => !abierto)}
              aria-expanded={navegadorAbierto}
              // El texto se oculta por debajo de `sm` para que la barra quepa en un
              // móvil, así que el nombre accesible tiene que venir del `aria-label`: sin
              // él, el botón se anunciaba sólo como el número de pendientes.
              aria-label={navegadorAbierto ? 'Cerrar la lista de preguntas' : 'Ir a una pregunta'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {navegadorAbierto ? (
                <X className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">Preguntas</span>
              {pendientes.length > 0 && (
                <span className="ev-tabular rounded-full bg-warning/20 px-1.5 text-[0.65rem] font-bold text-warning">
                  {pendientes.length}
                </span>
              )}
            </button>
          )}

          {reloj.restantes !== null && (
            <TimerRing restantes={reloj.restantes} totalSegundos={reloj.totalSegundos} />
          )}
        </div>

        {prueba.aplicacion.mostrarProgreso && (
          <ProgressMeter respondidas={respondidas} total={contestables.length} />
        )}

        {/* Panel del navegador: flotante, así que no aumenta la altura fija. */}
        <AnimatePresence>
          {navegadorAbierto && contestables.length > 1 && (
            <motion.div
              initial={reducido ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducido ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="glass-elevated absolute left-2 right-2 top-full z-nav mt-2 rounded-2xl p-3"
            >
              <QuestionNavigator
                entradas={entradasNavegador}
                actual={preguntaActiva.current}
                onIr={(id) => {
                  setNavegadorAbierto(false);
                  irAPregunta(id);
                }}
                className="flex-wrap"
              />
              <p className="mt-2 text-[0.7rem] text-muted-foreground">
                Con marca: respondida · en ámbar: obligatoria pendiente.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassSurface>

      {/* ------------------------------ Avisos ----------------------------- */}
      <AnimatePresence initial={false}>
        {aviso && (
          <motion.div
            initial={reducido ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducido ? undefined : { opacity: 0, y: -8 }}
          >
            <Alert tone={aviso.reintentable ? 'warning' : 'info'}>
              <div className="flex flex-col gap-2">
                <span>{aviso.mensaje}</span>
                {aviso.pista && <span className="text-xs">{aviso.pista}</span>}
                {aviso.reintentable && (
                  <Button size="sm" variant="glass" className="w-fit" onClick={() => void enviar(false)}>
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Reintentar el envío
                  </Button>
                )}
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {desconocidas.length > 0 && (
        <Alert tone="info" title="Algunas preguntas no se pueden responder aquí">
          Esta evaluación incluye {desconocidas.length}{' '}
          {desconocidas.length === 1 ? 'pregunta de un tipo' : 'preguntas de tipos'} que el portal
          todavía no sabe mostrar. Están señaladas y{' '}
          <span className="font-semibold">no impiden que envíes</span> el resto.
        </Alert>
      )}

      {/* ---------------------------- Preguntas ---------------------------- */}
      {/*
        El espacio inferior no es decorativo: sin él, la última pregunta queda
        permanentemente debajo de la barra de envío, que es fija. Con él, cualquier
        pregunta puede colocarse por encima de la barra al desplazarse.
      */}
      <div ref={contenedor} className="pb-44">
        <motion.ol
          key={indicePagina}
          className="flex list-none flex-col"
          style={{ gap: 'var(--ev-gap)' }}
          initial={reducido ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        >
          {paginaActual.map(({ seccion, pregunta }, indice) => {
            const anterior = paginaActual[indice - 1];
            const abreSeccion = indice === 0 || anterior?.seccion.id !== seccion.id;
            return (
              <li
                key={pregunta.id}
                className="flex list-none flex-col"
                style={{ gap: 'var(--ev-gap)' }}
              >
                {abreSeccion && seccion.titulo && (
                  <header className="flex flex-col gap-1 pt-2">
                    <h2
                      className="text-xs font-bold uppercase tracking-[0.14em]"
                      // Tono con tinta: el acento vivo no llega a 4,5:1 en texto pequeño.
                      style={{ color: 'rgb(var(--ev-accent-ink))' }}
                    >
                      {seccion.titulo}
                    </h2>
                    <RichText doc={seccion.descripcion} compacto className="text-muted-foreground" />
                  </header>
                )}
                <QuestionCard
                  pregunta={pregunta}
                  numero={prueba.tema.mostrarNumeracion ? (numeroDe.get(pregunta.id) ?? 0) : 0}
                  indice={indice}
                  valor={respuestas[pregunta.id]}
                  respondida={estaRespondida(respuestas[pregunta.id])}
                  problema={problemaDeRespuesta(pregunta, respuestas[pregunta.id])}
                  mostrarProblemas={mostrarProblemas}
                  bloqueado={congelado}
                  bloquearPegado={prueba.integridad.bloquearPegado}
                  onChange={(valor) => responder(pregunta.id, valor)}
                  onVista={() => {
                    const actual = metricas.current[pregunta.id] ?? {
                      visitas: 0,
                      cambios: 0,
                      segundos: 0,
                    };
                    metricas.current[pregunta.id] = { ...actual, visitas: actual.visitas + 1 };
                    integridad.registrar('pregunta_vista', { preguntaId: pregunta.id });
                  }}
                  onPegar={(caracteres) =>
                    integridad.registrar('pegar', {
                      preguntaId: pregunta.id,
                      detalle: { caracteres },
                    })
                  }
                  onCopiar={() => integridad.registrar('copiar', { preguntaId: pregunta.id })}
                />
              </li>
            );
          })}
        </motion.ol>
      </div>

      {/* ------------------------ Barra inferior --------------------------- */}
      <GlassSurface
        variant="navigation"
        radius="3xl"
        padding="none"
        className="ev-bottombar flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4"
      >
        <div className="flex items-center gap-2">
          {paginas.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={indicePagina === 0 || !prueba.aplicacion.permitirRetroceso || congelado}
                onClick={() => cambiarPagina(indicePagina - 1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Anterior
              </Button>
              <span className="ev-tabular text-xs text-muted-foreground">
                {indicePagina + 1} / {paginas.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={indicePagina >= paginas.length - 1 || congelado}
                onClick={() => cambiarPagina(indicePagina + 1)}
              >
                Siguiente
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendientes.length > 0 && (
            <span className="hidden items-center gap-1.5 text-xs text-warning sm:flex">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {pendientes.length}{' '}
              {pendientes.length === 1 ? 'obligatoria pendiente' : 'obligatorias pendientes'}
            </span>
          )}
          <Button onClick={abrirRevision} loading={enviando} disabled={enviando || yaEnviado.current}>
            <Send className="h-4 w-4" aria-hidden />
            Enviar la evaluación
          </Button>
        </div>
      </GlassSurface>

      <ReviewDialog
        abierto={revisionAbierta}
        respondidas={respondidas}
        total={contestables.length}
        obligatoriasPendientes={pendientes.map(aPendiente)}
        opcionalesOmitidas={omitidas.map(aPendiente)}
        enviando={enviando}
        onCerrar={() => setRevisionAbierta(false)}
        onIrAPregunta={irAPregunta}
        onConfirmar={() => {
          setRevisionAbierta(false);
          void enviar(false);
        }}
      />
    </div>
  );
}
