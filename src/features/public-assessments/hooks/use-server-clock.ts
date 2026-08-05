'use client';

/**
 * El reloj de la prueba, cuyo dueño es el servidor.
 *
 * ── La invariante ────────────────────────────────────────────────────────────
 * `startAttempt` calcula el límite con la hora del **servidor** y lo guarda. A
 * partir de ahí el navegador sólo cuenta hacia atrás para mover los dígitos en
 * pantalla, y cada latido (`heartbeat`) y cada guardado (`saveProgress`) devuelven
 * los segundos restantes recalculados en el servidor y **corrigen** la cuenta local.
 *
 * Consecuencias, todas deseables: cambiar la hora del equipo no regala tiempo;
 * recargar la página tampoco; suspender el portátil no congela el reloj (al volver,
 * el primer latido pone la verdad); y una pestaña en segundo plano, cuyos
 * temporizadores el navegador ralentiza a propósito, se resincroniza al volver en
 * lugar de ir minutos por detrás.
 *
 * ── Por qué la cuenta local existe si el servidor manda ─────────────────────
 * Porque un reloj que sólo avanza cada veinte segundos parece roto. La cuenta local
 * es cosmética; la autoridad es el servidor, y el hook lo refleja separando
 * `sincronizar()` (verdad) de su tictac interno (apariencia).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RelojServidor {
  /** Segundos restantes, o `null` si la prueba no tiene límite. */
  restantes: number | null;
  /** Duración total en segundos, para dibujar el aro de progreso. */
  totalSegundos: number | null;
  /** Llega a cero. Se calcula aquí para que nadie lo derive con `<= 0` a mano. */
  expirado: boolean;
  /** Aplica la verdad del servidor. */
  sincronizar: (segundosRestantes: number | null) => void;
}

export function useRelojServidor({
  segundosIniciales,
  duracionMinutos,
  corriendo,
}: {
  segundosIniciales: number | null;
  duracionMinutos: number | null;
  /** `false` detiene el tictac (intento enviado). */
  corriendo: boolean;
}): RelojServidor {
  const [restantes, setRestantes] = useState<number | null>(segundosIniciales);

  /**
   * Total de referencia del aro.
   *
   * Se toma el mayor entre la duración configurada y lo que quedaba al empezar: si
   * el candidato **retoma** un intento, `segundosIniciales` es menor que la duración
   * y usar la duración haría que el aro apareciera ya consumido, que es correcto y
   * es justo lo que se quiere mostrar. El máximo protege del caso raro en que la
   * ventana de aplicación recorta el límite y deja `segundosIniciales` por encima.
   */
  const total = useRef<number | null>(
    duracionMinutos !== null
      ? Math.max(duracionMinutos * 60, segundosIniciales ?? 0)
      : segundosIniciales,
  );

  const sincronizar = useCallback((segundosRestantes: number | null) => {
    setRestantes((previo) => {
      if (segundosRestantes === null) return previo === null ? null : previo;
      // Nunca hacia arriba salvo corrección grande: un salto de +2 s por la latencia
      // de la red haría que el reloj pareciera ir hacia atrás y hacia delante. Una
      // diferencia de más de cinco segundos sí es una corrección real (el equipo
      // estuvo suspendido) y se aplica tal cual.
      if (previo === null) return segundosRestantes;
      if (segundosRestantes < previo) return segundosRestantes;
      return segundosRestantes - previo > 5 ? segundosRestantes : previo;
    });
  }, []);

  useEffect(() => {
    if (!corriendo) return;
    setRestantes((previo) => previo);
    const temporizador = window.setInterval(() => {
      setRestantes((previo) => (previo === null ? null : Math.max(0, previo - 1)));
    }, 1000);
    return () => window.clearInterval(temporizador);
  }, [corriendo]);

  return {
    restantes,
    totalSegundos: total.current,
    expirado: restantes !== null && restantes <= 0,
    sincronizar,
  };
}
