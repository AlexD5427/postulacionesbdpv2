/**
 * Resolución de la dirección del Web App de Evaluaciones.
 *
 * ── Por qué se clasifica antes de llamar ─────────────────────────────────────
 * Una URL equivocada no se puede «intentar de todos modos». Si se intenta, el
 * navegador devuelve un error de red y ese error manda a buscar el problema donde
 * no está: se revisa la conexión, el despliegue, los permisos del libro… cuando lo
 * único que pasaba es que la variable tenía el valor de otra variable. El ATS
 * perdió días así, y la conclusión quedó escrita en su documentación: clasificar
 * la configuración por adelantado y **nombrar la variable** en el diagnóstico.
 *
 * El diagnóstico es para quien opera el portal, nunca para el candidato: a él se
 * le dice que la evaluación no está disponible, porque no puede hacer nada con la
 * palabra «variable de entorno».
 *
 * La variable conserva el nombre que ya tenía (`NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL`)
 * a propósito: quien ya la configuró en el proveedor de hosting no tiene que
 * volver a hacerlo, y el valor —la URL `…/exec` del despliegue— es el mismo.
 */

import { env, isProduction } from '@/core/config/env';

export type EstadoEndpoint =
  /** URL absoluta y plausible: integración real activa. */
  | 'listo'
  /** No hay URL configurada. */
  | 'ausente'
  /** Hay una URL, pero no puede ser la del Web App de Evaluaciones. */
  | 'invalido';

export interface Endpoint {
  estado: EstadoEndpoint;
  /** Vacío salvo cuando `estado === 'listo'`. */
  url: string;
  /** Explicación para quien opera. Nunca se muestra a un candidato. */
  diagnostico: string;
}

const VARIABLE = 'NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL';

/**
 * Clasifica un valor bruto.
 *
 * Se exporta para poder probar las reglas sin tocar `process.env`, que en Next
 * está sustituido en tiempo de compilación y no se puede mutar en una prueba.
 */
export function clasificarEndpoint(
  bruto: string | undefined,
  { produccion = isProduction }: { produccion?: boolean } = {},
): Endpoint {
  const valor = (bruto ?? '').trim();
  if (!valor) {
    return {
      estado: 'ausente',
      url: '',
      diagnostico: `Falta ${VARIABLE}. Debe contener la dirección completa del Web App de Evaluaciones (https://script.google.com/macros/s/…/exec).`,
    };
  }

  let analizada: URL;
  try {
    analizada = new URL(valor);
  } catch {
    return {
      estado: 'invalido',
      url: '',
      diagnostico: `${VARIABLE} no es una URL absoluta. Debe empezar por https:// y no ser una ruta interna del portal.`,
    };
  }

  if (analizada.protocol !== 'https:') {
    return {
      estado: 'invalido',
      url: '',
      diagnostico: `${VARIABLE} debe usar https://.`,
    };
  }

  // Defensa contra apuntar el runner público a una superficie administrativa.
  if (/\/api\/(evaluations|evaluaciones)(\/|$)/i.test(analizada.pathname) || /admin/i.test(analizada.pathname)) {
    return {
      estado: 'invalido',
      url: '',
      diagnostico: `${VARIABLE} apunta a una ruta administrativa. El módulo público solo puede usar el Web App de Evaluaciones (…/exec).`,
    };
  }

  // Los despliegues de Apps Script terminan en `/exec` (publicado) o `/dev`.
  if (!/\/(exec|dev)$/.test(analizada.pathname)) {
    return {
      estado: 'invalido',
      url: '',
      diagnostico: `${VARIABLE} debe terminar en /exec (o /dev solo para un despliegue de prueba). Copia la dirección del despliegue del Web App, no la del editor de Apps Script.`,
    };
  }

  /**
   * `/dev` sirve el código guardado en el editor y **solo responde a cuentas que
   * pueden editar el script**: un candidato recibiría una página HTML de inicio de
   * sesión de Google en lugar de JSON. Es útil mientras se prueba y está mal en
   * producción, donde el error es invisible hasta que llega la primera persona
   * real.
   */
  if (produccion && analizada.pathname.endsWith('/dev')) {
    return {
      estado: 'invalido',
      url: '',
      diagnostico: `${VARIABLE} apunta a un despliegue /dev, que exige sesión de Google y sirve el código sin publicar. En producción debe terminar en /exec.`,
    };
  }

  return { estado: 'listo', url: analizada.toString(), diagnostico: '' };
}

/** El endpoint del entorno actual. */
export function endpointEvaluaciones(): Endpoint {
  return clasificarEndpoint(env.NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL);
}

/**
 * ¿Se debe usar el backend de demostración?
 *
 * Sólo cuando NO hay endpoint **y** el despliegue está explícitamente en modo
 * simulado. Nunca como respaldo silencioso: sin endpoint y sin modo simulado, el
 * flujo muestra un error de configuración en lugar de fingir que se guardó un
 * intento. Fingir un envío correcto sería la peor de las mentiras posibles en un
 * proceso de selección.
 */
export function esModoDemostracion(): boolean {
  return (
    endpointEvaluaciones().estado !== 'listo' &&
    env.NEXT_PUBLIC_DATA_MODE === 'mock' &&
    env.NEXT_PUBLIC_ENABLE_MOCKS
  );
}
