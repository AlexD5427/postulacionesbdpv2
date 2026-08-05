/**
 * Backend de demostración: el mismo contrato, sin red.
 *
 * ── Para qué sirve y para qué NO ─────────────────────────────────────────────
 * Sirve para desarrollar la interfaz, para las pruebas de componente y para que
 * `npm run dev` funcione recién clonado el repositorio, sin credenciales ni
 * despliegues. Habla exactamente el mismo contrato que el Web App: las mismas
 * formas de datos, el mismo reloj de servidor, la misma reanudación por documento
 * y las mismas repeticiones idempotentes.
 *
 * **No** sirve como respaldo silencioso. `esModoDemostracion()` sólo es cierto sin
 * endpoint y con el modo simulado activado de forma explícita, y la interfaz lo
 * anuncia de forma permanente en pantalla. Un módulo que finge guardar un intento
 * en un proceso de selección real sería mucho peor que uno que falla.
 *
 * Lo que aquí NO se replica, a propósito: la calificación. El servidor es la única
 * autoridad de notas y duplicar sus reglas en el navegador crearía una segunda
 * verdad que se desincroniza en la primera semana. La demostración devuelve
 * `calificacionPendiente` y no inventa ninguna nota.
 */

import type {
  ComprobanteIntento,
  EventoEnviado,
  InicioIntento,
  LatidoIntento,
  PortadaPublica,
  ProgresoGuardado,
  PruebaPublica,
  RespuestaEnviada,
  SeccionPublica,
} from '../domain/contract';
import { ErrorEvaluaciones } from './errors';

/** Código de la evaluación completa: cubre las catorce formas de respuesta. */
export const CODIGO_DEMO = 'EV-DEMO-2026';
/** Código pausado: ejercita la pantalla de indisponibilidad transitoria. */
export const CODIGO_DEMO_PAUSADA = 'EV-DEMO-PAUSA';
/** Código cuyo primer envío falla: ejercita el reintento con el mismo id. */
export const CODIGO_DEMO_REINTENTO = 'EV-DEMO-REINT';

const CODIGOS_JUGABLES = new Set([CODIGO_DEMO, CODIGO_DEMO_REINTENTO]);

function texto(cadena: string) {
  return { v: 1, b: [{ t: 'p' as const, s: [{ x: cadena }] }] };
}

function vacio() {
  return { v: 1, b: [] };
}

function opcion(id: string, etiqueta: string) {
  return { id, valor: id, texto: texto(etiqueta) };
}

const SECCIONES: SeccionPublica[] = [
  {
    id: 'sec_conocimientos',
    titulo: 'Conocimientos del negocio',
    descripcion: texto('Responde con base en la normativa vigente del sistema financiero.'),
    limiteSegundos: null,
    preguntas: [
      {
        id: 'pr_aviso',
        tipo: 'contenido_aviso',
        enunciado: texto(
          'Esta es una evaluación de demostración. Nada de lo que respondas aquí se guarda en ningún sistema.',
        ),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { tonoAviso: 'info' },
        opciones: [],
      },
      {
        id: 'pr_unica',
        tipo: 'opcion_unica',
        enunciado: {
          v: 1,
          b: [
            {
              t: 'p',
              s: [
                { x: 'Un cliente presenta ' },
                { x: 'mora de 45 días', m: ['b'] },
                { x: '. ¿En qué categoría se clasifica la operación?' },
              ],
            },
          ],
        },
        ayuda: texto('Considera únicamente el criterio de días de atraso.'),
        obligatoria: true,
        configuracion: {},
        opciones: [
          opcion('op_a', 'Categoría A — riesgo normal'),
          opcion('op_b', 'Categoría B — riesgo potencial'),
          opcion('op_c', 'Categoría C — riesgo real'),
        ],
        puntos: 10,
      },
      {
        id: 'pr_multiple',
        tipo: 'opcion_multiple',
        enunciado: texto('¿Cuáles de estos documentos son obligatorios en una carpeta de crédito?'),
        ayuda: texto('Puedes elegir más de uno.'),
        obligatoria: true,
        configuracion: { minimoSelecciones: 2, maximoSelecciones: 3 },
        opciones: [
          opcion('op_ci', 'Documento de identidad vigente'),
          opcion('op_ingresos', 'Respaldo de ingresos'),
          opcion('op_fotos', 'Fotografías del domicilio'),
          opcion('op_plan', 'Plan de inversión'),
        ],
        puntos: 10,
      },
      {
        id: 'pr_vf',
        tipo: 'verdadero_falso',
        enunciado: texto('El BDP puede otorgar crédito sin evaluar la capacidad de pago.'),
        ayuda: vacio(),
        obligatoria: true,
        configuracion: {},
        opciones: [opcion('op_v', 'Verdadero'), opcion('op_f', 'Falso')],
        puntos: 5,
      },
      {
        id: 'pr_desplegable',
        tipo: 'desplegable',
        enunciado: texto('Selecciona el sector al que corresponde un crédito para riego tecnificado.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: {},
        opciones: [
          opcion('op_agro', 'Agropecuario'),
          opcion('op_manu', 'Manufactura'),
          opcion('op_turismo', 'Turismo'),
        ],
      },
    ],
  },
  {
    id: 'sec_numerica',
    titulo: 'Razonamiento numérico',
    descripcion: texto('Puedes usar calculadora. Redondea a dos decimales cuando corresponda.'),
    limiteSegundos: null,
    preguntas: [
      {
        id: 'pr_numero',
        tipo: 'numero',
        enunciado: texto('¿Cuántos meses tiene un plazo de 5 años?'),
        ayuda: vacio(),
        obligatoria: true,
        configuracion: { minimo: 0, maximo: 999, paso: 1 },
        opciones: [],
        puntos: 5,
      },
      {
        id: 'pr_moneda',
        tipo: 'moneda',
        enunciado: texto('Cuota mensual de un crédito de Bs 120 000 a 60 meses sin intereses.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { moneda: 'BOB', decimales: 2, prefijo: 'Bs' },
        opciones: [],
      },
      {
        id: 'pr_porcentaje',
        tipo: 'porcentaje',
        enunciado: texto('¿Qué porcentaje del total representa una cartera de Bs 30 000 sobre Bs 200 000?'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { minimo: 0, maximo: 100, sufijo: '%' },
        opciones: [],
      },
      {
        id: 'pr_escala',
        tipo: 'escala_lineal',
        enunciado: texto('¿Qué tan cómodo te sientes construyendo un flujo de caja?'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: {
          minimo: 1,
          maximo: 5,
          paso: 1,
          etiquetaMinimo: 'Poco cómodo',
          etiquetaMaximo: 'Muy cómodo',
        },
        opciones: [],
      },
      {
        id: 'pr_estrellas',
        tipo: 'estrellas',
        enunciado: texto('Valora la claridad de estas instrucciones.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { estrellas: 5 },
        opciones: [],
      },
      {
        id: 'pr_deslizador',
        tipo: 'deslizador',
        enunciado: texto('¿Qué porcentaje de tu jornada dedicarías a visitas de campo?'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { minimo: 0, maximo: 100, paso: 5, sufijo: '%' },
        opciones: [],
      },
    ],
  },
  {
    id: 'sec_estructuras',
    titulo: 'Criterio y organización',
    descripcion: vacio(),
    limiteSegundos: null,
    preguntas: [
      {
        id: 'pr_ordenar',
        tipo: 'ordenar',
        enunciado: texto('Ordena las etapas del ciclo de crédito, de la primera a la última.'),
        ayuda: texto('Usa los botones de subir y bajar, o arrastra si te resulta más cómodo.'),
        obligatoria: true,
        configuracion: {},
        opciones: [
          opcion('op_desembolso', 'Desembolso'),
          opcion('op_solicitud', 'Solicitud'),
          opcion('op_seguimiento', 'Seguimiento'),
          opcion('op_evaluacion', 'Evaluación'),
        ],
        puntos: 10,
      },
      {
        id: 'pr_clasificar',
        tipo: 'clasificar',
        enunciado: texto('Clasifica cada concepto según corresponda.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { grupos: ['Activo', 'Pasivo'] },
        opciones: [
          opcion('op_caja', 'Caja y bancos'),
          opcion('op_prov', 'Cuentas por pagar'),
          opcion('op_inv', 'Inventario'),
          opcion('op_oblig', 'Obligaciones financieras'),
        ],
      },
      {
        id: 'pr_emparejar',
        tipo: 'emparejar',
        enunciado: texto('Empareja cada indicador con lo que mide.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { grupos: ['Liquidez', 'Endeudamiento', 'Rentabilidad'] },
        opciones: [
          opcion('op_corriente', 'Razón corriente'),
          opcion('op_deuda', 'Deuda sobre patrimonio'),
          opcion('op_roe', 'ROE'),
        ],
      },
      {
        id: 'pr_matriz',
        tipo: 'cuadricula_opcion',
        enunciado: texto('Indica tu nivel de experiencia en cada herramienta.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { columnasMatriz: ['Ninguna', 'Básica', 'Avanzada'] },
        opciones: [
          opcion('op_excel', 'Hojas de cálculo'),
          opcion('op_sql', 'Consultas SQL'),
          opcion('op_bi', 'Tableros de datos'),
        ],
      },
      {
        id: 'pr_likert',
        tipo: 'likert',
        enunciado: texto('¿Qué tanto te identificas con estas afirmaciones?'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: {
          columnasMatriz: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'],
        },
        opciones: [
          opcion('op_equipo', 'Prefiero trabajar en equipo'),
          opcion('op_campo', 'Disfruto el trabajo de campo'),
        ],
      },
      {
        id: 'pr_huecos',
        tipo: 'rellenar_huecos',
        enunciado: texto(
          'La razón ______ mide la capacidad de pago a corto plazo y la razón de ______ mide el peso de la deuda.',
        ),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: {},
        opciones: [],
      },
    ],
  },
  {
    id: 'sec_abiertas',
    titulo: 'Respuestas abiertas',
    descripcion: texto('Estas preguntas las revisa una persona del equipo evaluador.'),
    limiteSegundos: null,
    preguntas: [
      {
        id: 'pr_corto',
        tipo: 'texto_corto',
        enunciado: texto('En una frase: ¿qué es el riesgo crediticio?'),
        ayuda: vacio(),
        obligatoria: true,
        configuracion: { marcador: 'Escribe tu respuesta', maximoCaracteres: 160 },
        opciones: [],
      },
      {
        id: 'pr_largo',
        tipo: 'texto_largo',
        enunciado: texto(
          'Describe cómo abordarías la evaluación de un productor sin historial crediticio.',
        ),
        ayuda: texto('Entre 200 y 1200 caracteres.'),
        obligatoria: true,
        configuracion: { lineas: 6, minimoCaracteres: 200, maximoCaracteres: 1200 },
        opciones: [],
        puntos: 20,
      },
      {
        id: 'pr_fecha',
        tipo: 'fecha',
        enunciado: texto('¿Desde qué fecha podrías incorporarte?'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: {},
        opciones: [],
      },
      {
        id: 'pr_enlace',
        tipo: 'archivo_enlace',
        enunciado: texto('Si tienes un portafolio, comparte el enlace.'),
        ayuda: vacio(),
        obligatoria: false,
        configuracion: { ayudaArchivo: 'Comparte el enlace con permiso de lectura.' },
        opciones: [],
      },
      {
        id: 'pr_acepta',
        tipo: 'casilla_aceptacion',
        enunciado: texto('Declaro que las respuestas son de mi autoría.'),
        ayuda: vacio(),
        obligatoria: true,
        configuracion: {},
        opciones: [opcion('op_si', 'Sí, lo declaro')],
      },
    ],
  },
];

function pruebaDemo(codigo: string): PruebaPublica {
  return {
    codigo,
    titulo: 'Evaluación de demostración · Analista de Crédito',
    descripcion: 'Recorrido completo por todos los tipos de pregunta del sistema.',
    instrucciones: {
      v: 1,
      b: [
        { t: 'p', s: [{ x: 'Lee cada consigna con atención. Puedes moverte libremente entre las preguntas.' }] },
        { t: 'ul', s: [{ x: 'Tus respuestas se guardan de forma automática.' }] },
        { t: 'ul', s: [{ x: 'Las preguntas marcadas con asterisco son obligatorias.' }] },
        { t: 'ul', s: [{ x: 'Al terminar verás un comprobante con el identificador de tu intento.' }] },
      ],
    },
    versionEtiqueta: 'v1.0 (demostración)',
    totalPreguntas: SECCIONES.reduce((total, seccion) => total + seccion.preguntas.length, 0),
    aplicacion: {
      duracionMinutos: 30,
      navegacion: 'libre',
      permitirRetroceso: true,
      mostrarProgreso: true,
      autoenviarAlExpirar: true,
      guardadoAutomaticoSegundos: 20,
    },
    participante: {
      campos: [
        { clave: 'nombre', etiqueta: 'Nombre completo', obligatorio: true, activo: true },
        { clave: 'documento', etiqueta: 'Documento de identidad (CI)', obligatorio: true, activo: true },
        { clave: 'proceso', etiqueta: 'Proceso', obligatorio: false, activo: true },
      ],
      requiereConsentimiento: true,
      textoConsentimiento:
        'Autorizo al Banco de Desarrollo Productivo a tratar mis respuestas con la finalidad de evaluar mi postulación al proceso de selección correspondiente.',
      visibilidadResultado: 'solo_envio',
    },
    integridad: {
      registrarCambioPestana: true,
      registrarCopiaPegado: true,
      registrarTiempos: true,
      registrarNavegacion: true,
      bloquearPegado: false,
      bloquearMenuContextual: false,
      avisarAlSalir: true,
      pantallaCompletaSugerida: false,
      umbralRiesgo: 5,
    },
    tema: {
      acento: 'cian',
      densidad: 'comoda',
      portadaUrl: '',
      logoUrl: '',
      mostrarNumeracion: true,
      animaciones: true,
    },
    secciones: SECCIONES,
  };
}

/* -------------------------- Estado local del simulador -------------------- */

interface IntentoDemo {
  id: string;
  codigo: string;
  documento: string;
  iniciadoEn: number;
  limiteEn: number | null;
  respuestas: Map<string, RespuestaEnviada>;
  eventos: number;
  enviado: boolean;
  enviadoEn: string;
  envioAutomatico: boolean;
  /** Envíos rechazados a propósito, para ejercitar el reintento. */
  fallosProvocados: number;
}

/**
 * Los intentos del simulador, persistidos en `sessionStorage`.
 *
 * ── Por qué persistir, y por qué ahí ─────────────────────────────────────────
 * Las dos conductas más difíciles de creer sin verlas son «recargar no reinicia nada»
 * y «solo se permite un intento», y las dos dependen de que el servidor recuerde. Con
 * el estado sólo en memoria, cada recarga daba un backend virgen: la demostración
 * afirmaba hablar el mismo contrato y precisamente en esos dos puntos se comportaba al
 * revés que el real. Ahora sobrevive a una recarga y las dos se pueden comprobar a mano
 * y en las pruebas de navegador.
 *
 * `sessionStorage` y no `localStorage` por la misma razón que el borrador: muere con la
 * pestaña, así que la próxima persona que use el equipo empieza de cero.
 *
 * Nada de esto existe en el camino real: el backend de verdad guarda en Google Sheets.
 */
const CLAVE_ESTADO = 'bdp.ev.demo.intentos';

const intentos = new Map<string, IntentoDemo>();
let contador = 0;
let hidratado = false;

function almacen(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Forma serializable de un intento: `Map` no sobrevive a `JSON.stringify`. */
interface IntentoSerializado extends Omit<IntentoDemo, 'respuestas'> {
  respuestas: RespuestaEnviada[];
}

function hidratar(): void {
  if (hidratado) return;
  hidratado = true;
  const store = almacen();
  if (!store) return;
  try {
    const bruto = store.getItem(CLAVE_ESTADO);
    if (!bruto) return;
    const guardado = JSON.parse(bruto) as { contador: number; intentos: IntentoSerializado[] };
    contador = Number(guardado.contador) || 0;
    for (const entrada of guardado.intentos ?? []) {
      intentos.set(entrada.id, {
        ...entrada,
        respuestas: new Map(entrada.respuestas.map((r) => [r.preguntaId, r])),
      });
    }
  } catch {
    store.removeItem(CLAVE_ESTADO);
  }
}

function persistir(): void {
  const store = almacen();
  if (!store) return;
  try {
    const serializado: IntentoSerializado[] = [...intentos.values()].map((intento) => ({
      ...intento,
      respuestas: [...intento.respuestas.values()],
    }));
    store.setItem(CLAVE_ESTADO, JSON.stringify({ contador, intentos: serializado }));
  } catch {
    // Cuota agotada: la demostración sigue funcionando en memoria.
  }
}

/** Reinicia el simulador. Lo usan las pruebas entre casos. */
export function reiniciarDemostracion(): void {
  intentos.clear();
  contador = 0;
  hidratado = true;
  almacen()?.removeItem(CLAVE_ESTADO);
}

function ahora(): string {
  return new Date().toISOString();
}

function tokenDe(intentoId: string): string {
  return `v1.demo.${intentoId}`;
}

function exigirIntento(intentoId: string, token: string): IntentoDemo {
  hidratar();
  const intento = intentos.get(intentoId);
  if (!intento) {
    throw new ErrorEvaluaciones('NOT_FOUND', {
      mensajeCandidato: 'Este intento no existe. Vuelve a abrir el enlace de la evaluación.',
    });
  }
  if (token !== tokenDe(intentoId)) {
    throw new ErrorEvaluaciones('FORBIDDEN', {
      mensajeCandidato: 'La credencial de este intento no es válida.',
    });
  }
  return intento;
}

function segundosRestantes(intento: IntentoDemo): number | null {
  if (intento.limiteEn === null) return null;
  return Math.max(0, Math.round((intento.limiteEn - Date.now()) / 1000));
}

/* ------------------------------- Las acciones ----------------------------- */

export const backendDemostracion = {
  abrir(codigo: string): Promise<PortadaPublica> {
    const normalizado = codigo.trim().toUpperCase();

    if (normalizado === CODIGO_DEMO_PAUSADA) {
      return Promise.resolve({
        codigo: normalizado,
        disponible: false,
        motivo: 'pausada',
        mensaje: 'La evaluación está pausada temporalmente. Vuelve a intentarlo más tarde.',
        titulo: 'Evaluación de demostración · pausada',
        horaServidor: ahora(),
      });
    }
    if (!CODIGOS_JUGABLES.has(normalizado)) {
      throw new ErrorEvaluaciones('NOT_FOUND', {
        mensajeCandidato: 'No existe ninguna evaluación con ese código.',
        pista: `En modo demostración los códigos válidos son ${CODIGO_DEMO}, ${CODIGO_DEMO_REINTENTO} y ${CODIGO_DEMO_PAUSADA}.`,
      });
    }

    const prueba = pruebaDemo(normalizado);
    return Promise.resolve({
      codigo: normalizado,
      disponible: true,
      motivo: '',
      mensaje: '',
      titulo: prueba.titulo,
      horaServidor: ahora(),
      descripcion: prueba.descripcion,
      instrucciones: prueba.instrucciones,
      versionEtiqueta: prueba.versionEtiqueta,
      totalPreguntas: prueba.totalPreguntas,
      duracionMinutos: prueba.aplicacion.duracionMinutos,
      intentosMaximos: 1,
      participante: {
        campos: prueba.participante.campos,
        requiereConsentimiento: prueba.participante.requiereConsentimiento,
        textoConsentimiento: prueba.participante.textoConsentimiento,
      },
      integridad: prueba.integridad,
      tema: prueba.tema,
      ventanaFin: '',
    });
  },

  iniciar(codigo: string, payload: Record<string, unknown>): Promise<InicioIntento> {
    hidratar();
    const normalizado = codigo.trim().toUpperCase();
    const prueba = pruebaDemo(normalizado);
    const participante = (payload.participante ?? {}) as Record<string, string>;
    const documento = String(participante.documento ?? '');

    if (prueba.participante.requiereConsentimiento && payload.consentimiento !== true) {
      throw new ErrorEvaluaciones('VALIDATION_ERROR', {
        mensajeCandidato: 'Hay que aceptar el consentimiento informado antes de empezar.',
      });
    }

    // Reanudación por documento, igual que `evStartAttempt_`.
    for (const intento of intentos.values()) {
      if (intento.codigo !== normalizado || intento.documento !== documento) continue;
      if (intento.enviado) {
        throw new ErrorEvaluaciones('FORBIDDEN', {
          mensajeCandidato: 'Ya realizaste esta evaluación y solo se permite un intento.',
        });
      }
      return Promise.resolve({
        intentoId: intento.id,
        token: tokenDe(intento.id),
        retomado: true,
        horaServidor: ahora(),
        iniciadoEn: new Date(intento.iniciadoEn).toISOString(),
        limiteEn: intento.limiteEn === null ? '' : new Date(intento.limiteEn).toISOString(),
        segundosRestantes: segundosRestantes(intento),
        respuestasPrevias: [...intento.respuestas.values()].map((respuesta) => ({
          preguntaId: respuesta.preguntaId,
          opciones: respuesta.opciones ?? [],
          valor: respuesta.valor ?? null,
        })),
        prueba,
      });
    }

    contador += 1;
    const id = `in_demo_${contador}`;
    const duracion = prueba.aplicacion.duracionMinutos;
    const intento: IntentoDemo = {
      id,
      codigo: normalizado,
      documento,
      iniciadoEn: Date.now(),
      limiteEn: duracion === null ? null : Date.now() + duracion * 60_000,
      respuestas: new Map(),
      eventos: 0,
      enviado: false,
      enviadoEn: '',
      envioAutomatico: false,
      fallosProvocados: 0,
    };
    intentos.set(id, intento);
    persistir();

    return Promise.resolve({
      intentoId: id,
      token: tokenDe(id),
      retomado: false,
      horaServidor: ahora(),
      iniciadoEn: new Date(intento.iniciadoEn).toISOString(),
      limiteEn: intento.limiteEn === null ? '' : new Date(intento.limiteEn).toISOString(),
      segundosRestantes: segundosRestantes(intento),
      respuestasPrevias: [],
      prueba,
    });
  },

  latido(intentoId: string, token: string): Promise<LatidoIntento> {
    const intento = exigirIntento(intentoId, token);
    const restantes = segundosRestantes(intento);
    return Promise.resolve({
      intentoId,
      estado: intento.enviado ? 'enviado' : 'en_curso',
      horaServidor: ahora(),
      limiteEn: intento.limiteEn === null ? '' : new Date(intento.limiteEn).toISOString(),
      segundosRestantes: restantes,
      expirado: !intento.enviado && restantes !== null && restantes <= 0,
      ultimoGuardadoEn: '',
    });
  },

  guardar(
    intentoId: string,
    token: string,
    respuestas: RespuestaEnviada[],
    eventos: EventoEnviado[],
  ): Promise<ProgresoGuardado> {
    const intento = exigirIntento(intentoId, token);
    if (intento.enviado) {
      throw new ErrorEvaluaciones('CONFLICT', {
        mensajeCandidato: 'Este intento ya fue enviado y no admite más cambios.',
      });
    }
    for (const respuesta of respuestas) intento.respuestas.set(respuesta.preguntaId, respuesta);
    intento.eventos += eventos.length;
    persistir();
    const restantes = segundosRestantes(intento);
    return Promise.resolve({
      guardadoEn: ahora(),
      respuestasGuardadas: respuestas.length,
      horaServidor: ahora(),
      segundosRestantes: restantes,
      expirado: restantes !== null && restantes <= 0,
    });
  },

  enviar(
    intentoId: string,
    token: string,
    respuestas: RespuestaEnviada[],
    eventos: EventoEnviado[],
    automatico: boolean,
  ): Promise<ComprobanteIntento> {
    const intento = exigirIntento(intentoId, token);

    // Reenvío tras una desconexión: no se recalcula ni se sobrescribe nada, igual
    // que hace `evSubmitAttempt_` cuando el intento ya está enviado.
    if (intento.enviado) {
      return Promise.resolve(comprobante(intento, true));
    }

    // El código de reintento falla el PRIMER envío a propósito, para poder
    // comprobar de verdad que el segundo intento no duplica el registro.
    if (intento.codigo === CODIGO_DEMO_REINTENTO && intento.fallosProvocados === 0) {
      intento.fallosProvocados += 1;
      persistir();
      throw new ErrorEvaluaciones('TRANSPORTE', {
        diagnostico: 'fallo provocado por el código de demostración de reintento',
      });
    }

    for (const respuesta of respuestas) intento.respuestas.set(respuesta.preguntaId, respuesta);
    intento.eventos += eventos.length;
    intento.enviado = true;
    intento.enviadoEn = ahora();
    intento.envioAutomatico = automatico;
    persistir();
    return Promise.resolve(comprobante(intento, false));
  },
};

function comprobante(intento: IntentoDemo, repetido: boolean): ComprobanteIntento {
  return {
    intentoId: intento.id,
    evaluacion: pruebaDemo(intento.codigo).titulo,
    estado: 'enviado',
    enviadoEn: intento.enviadoEn,
    envioAutomatico: intento.envioAutomatico,
    repetido,
    respuestasRegistradas: intento.respuestas.size,
    // La demostración no califica: el servidor es la única autoridad de notas.
    calificacionPendiente: true,
    segundosUsados: Math.round((Date.now() - intento.iniciadoEn) / 1000),
  };
}
