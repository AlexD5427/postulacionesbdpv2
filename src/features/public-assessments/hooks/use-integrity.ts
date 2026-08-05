'use client';

/**
 * Registro de integridad en el navegador.
 *
 * ── Qué es y qué no es ───────────────────────────────────────────────────────
 * Una prueba sin supervisión presencial no se puede «vigilar», pero sí se puede
 * DOCUMENTAR. Esto acumula la secuencia de lo que ocurrió durante el intento para
 * que quien revise el resultado tenga contexto en lugar de una nota suelta. No es
 * proctoring: no hay cámara, ni micrófono, ni pantalla, ni biometría, ni huella del
 * dispositivo, ni detección de VPN. Aparte de ser lo correcto, es lo único que un
 * navegador puede hacer sin pedir permisos, y prometer más sería mentir.
 *
 * Se registra: visibilidad de la pestaña, foco de la ventana, copiar, cortar, pegar
 * (**sólo la longitud** del texto), menú contextual, intento de imprimir, pantalla
 * completa, redimensionado, navegación entre preguntas, inactividad e intentos de
 * salir.
 *
 * No se registra: el contenido del portapapeles, capturas, otras pestañas ni nada
 * del resto del equipo.
 *
 * ── Por qué la cola se vacía sólo al confirmar ──────────────────────────────
 * `tomarLote()` **no** borra la cola: la reserva. Se confirma con `confirmarLote()`
 * cuando el servidor acepta, y se devuelve con `devolverLote()` si falla. Vaciarla
 * al leer parecía más simple y perdía los eventos exactos de la petición que se
 * cayó, que son justo los del momento interesante. El servidor deduplica por número
 * de secuencia (`evPrepareEvents_`), así que reenviar es gratis.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { EventoEnviado, PoliticaIntegridad } from '../domain/contract';

/** Segundos de quietud a partir de los cuales se anota inactividad. */
const INACTIVIDAD_SEGUNDOS = 90;
/** Segundos fuera de la pestaña a partir de los cuales el evento sube de nivel. */
const AUSENCIA_PROLONGADA_SEGUNDOS = 60;
/** Un parpadeo de foco (abrir un desplegable) no es un evento. */
const FOCO_MINIMO_MS = 1500;
/** Tope de la cola: `EV_LIMITS.EVENTS_PER_REQUEST` en el servidor. */
const MAXIMO_EN_COLA = 400;

export interface RegistroIntegridad {
  /** Anota un evento a mano (navegación, respuesta, pegado…). */
  registrar: (
    tipo: string,
    extra?: {
      preguntaId?: string;
      detalle?: Record<string, number | string>;
      duracionMs?: number;
    },
  ) => void;
  /** Reserva los eventos pendientes sin borrarlos. */
  tomarLote: () => EventoEnviado[];
  /** El servidor los aceptó: se descartan. */
  confirmarLote: (lote: EventoEnviado[]) => void;
  /** El envío falló: vuelven a la cola, en su orden. */
  devolverLote: (lote: EventoEnviado[]) => void;
}

export function useIntegridad({
  politica,
  iniciadoEn,
  activo,
}: {
  politica: PoliticaIntegridad;
  iniciadoEn: string;
  /** `false` congela el registro (intento enviado o tiempo agotado). */
  activo: boolean;
}): RegistroIntegridad {
  const cola = useRef<EventoEnviado[]>([]);
  const secuencia = useRef(0);
  const inicioMs = useRef(Date.parse(iniciadoEn) || Date.now());
  const ocultaDesde = useRef<number | null>(null);
  const sinFocoDesde = useRef<number | null>(null);
  const ultimaActividad = useRef(Date.now());
  const estaActivo = useRef(activo);
  estaActivo.current = activo;

  // La política vive en una referencia para que el efecto de suscripción no se
  // vuelva a montar cuando el objeto cambia de identidad (llega nuevo en cada
  // respuesta del servidor pero con el mismo contenido). Remontarlo perdería los
  // temporizadores de ausencia a medias.
  const reglas = useRef(politica);
  reglas.current = politica;

  const registrar = useCallback(
    (
      tipo: string,
      extra: {
        preguntaId?: string;
        detalle?: Record<string, number | string>;
        duracionMs?: number;
      } = {},
    ) => {
      if (!estaActivo.current) return;
      secuencia.current += 1;
      const ahora = Date.now();
      cola.current.push({
        tipo,
        secuencia: secuencia.current,
        ocurridoEn: new Date(ahora).toISOString(),
        segundosDesdeInicio: Math.max(0, Math.round((ahora - inicioMs.current) / 1000)),
        ...(extra.preguntaId ? { preguntaId: extra.preguntaId } : {}),
        ...(extra.duracionMs ? { duracionMs: Math.round(extra.duracionMs) } : {}),
        ...(extra.detalle ? { detalle: extra.detalle } : {}),
      });
      // Tope defensivo: una prueba larga con mucho movimiento no debe llenar la
      // memoria ni mandar megabytes. Se conservan los más recientes.
      if (cola.current.length > MAXIMO_EN_COLA) {
        cola.current = cola.current.slice(-MAXIMO_EN_COLA);
      }
    },
    [],
  );

  const tomarLote = useCallback((): EventoEnviado[] => [...cola.current], []);

  const confirmarLote = useCallback((lote: EventoEnviado[]) => {
    if (lote.length === 0) return;
    const confirmadas = new Set(lote.map((evento) => evento.secuencia));
    cola.current = cola.current.filter((evento) => !confirmadas.has(evento.secuencia));
  }, []);

  const devolverLote = useCallback((lote: EventoEnviado[]) => {
    if (lote.length === 0) return;
    const presentes = new Set(cola.current.map((evento) => evento.secuencia));
    const recuperados = lote.filter((evento) => !presentes.has(evento.secuencia));
    if (recuperados.length === 0) return;
    cola.current = [...recuperados, ...cola.current].sort((a, b) => a.secuencia - b.secuencia);
  }, []);

  /* ------------------------------ Suscripciones ---------------------------- */

  useEffect(() => {
    registrar('inicio');

    const alCambiarVisibilidad = () => {
      if (!reglas.current.registrarCambioPestana) return;
      if (document.hidden) {
        ocultaDesde.current = Date.now();
        return;
      }
      const desde = ocultaDesde.current;
      ocultaDesde.current = null;
      if (desde === null) return;
      const duracionMs = Date.now() - desde;
      const segundos = Math.round(duracionMs / 1000);
      registrar(segundos >= AUSENCIA_PROLONGADA_SEGUNDOS ? 'ausencia_prolongada' : 'pestana_oculta', {
        duracionMs,
        detalle: { segundos },
      });
      registrar('pestana_visible');
    };

    const alPerderFoco = () => {
      if (!reglas.current.registrarCambioPestana) return;
      sinFocoDesde.current = Date.now();
    };

    const alRecuperarFoco = () => {
      if (!reglas.current.registrarCambioPestana) return;
      const desde = sinFocoDesde.current;
      sinFocoDesde.current = null;
      if (desde === null) return;
      const duracionMs = Date.now() - desde;
      if (duracionMs < FOCO_MINIMO_MS) return;
      registrar('foco_perdido', { duracionMs, detalle: { segundos: Math.round(duracionMs / 1000) } });
      registrar('foco_recuperado');
    };

    const alCopiar = () => {
      if (reglas.current.registrarCopiaPegado) registrar('copiar');
    };
    const alCortar = () => {
      if (reglas.current.registrarCopiaPegado) registrar('cortar');
    };
    const alMenuContextual = (evento: MouseEvent) => {
      registrar('menu_contextual');
      if (reglas.current.bloquearMenuContextual) evento.preventDefault();
    };
    const alImprimir = () => registrar('impresion');
    const alRedimensionar = () => {
      registrar('ventana_redimensionada', {
        detalle: { ancho: window.innerWidth, alto: window.innerHeight },
      });
    };
    const alPantallaCompleta = () => {
      registrar(document.fullscreenElement ? 'pantalla_completa_on' : 'pantalla_completa_off');
    };
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (!estaActivo.current) return;
      registrar('salida_intentada');
      if (reglas.current.avisarAlSalir) {
        // El navegador muestra su propio diálogo; el texto no se puede elegir.
        evento.preventDefault();
        evento.returnValue = '';
      }
    };
    const alTeclado = (evento: KeyboardEvent) => {
      ultimaActividad.current = Date.now();
      // Combinaciones habituales de captura de pantalla. Detectarlas no las impide
      // —ningún navegador puede— pero deja constancia, que es de lo que se trata.
      if (
        evento.key === 'PrintScreen' ||
        (evento.metaKey && evento.shiftKey && /^[34567]$/.test(evento.key))
      ) {
        registrar('captura_sospechosa');
      }
    };
    const alMover = () => {
      ultimaActividad.current = Date.now();
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('blur', alPerderFoco);
    window.addEventListener('focus', alRecuperarFoco);
    document.addEventListener('copy', alCopiar);
    document.addEventListener('cut', alCortar);
    document.addEventListener('contextmenu', alMenuContextual);
    window.addEventListener('beforeprint', alImprimir);
    window.addEventListener('resize', alRedimensionar);
    document.addEventListener('fullscreenchange', alPantallaCompleta);
    window.addEventListener('beforeunload', alSalir);
    document.addEventListener('keydown', alTeclado);
    document.addEventListener('mousemove', alMover);

    const vigilante = window.setInterval(() => {
      if (!reglas.current.registrarTiempos || !estaActivo.current) return;
      const quieto = Math.round((Date.now() - ultimaActividad.current) / 1000);
      if (quieto >= INACTIVIDAD_SEGUNDOS) {
        registrar('inactividad', { detalle: { segundos: quieto } });
        ultimaActividad.current = Date.now();
      }
    }, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('blur', alPerderFoco);
      window.removeEventListener('focus', alRecuperarFoco);
      document.removeEventListener('copy', alCopiar);
      document.removeEventListener('cut', alCortar);
      document.removeEventListener('contextmenu', alMenuContextual);
      window.removeEventListener('beforeprint', alImprimir);
      window.removeEventListener('resize', alRedimensionar);
      document.removeEventListener('fullscreenchange', alPantallaCompleta);
      window.removeEventListener('beforeunload', alSalir);
      document.removeEventListener('keydown', alTeclado);
      document.removeEventListener('mousemove', alMover);
      window.clearInterval(vigilante);
    };
  }, [registrar]);

  return { registrar, tomarLote, confirmarLote, devolverLote };
}
