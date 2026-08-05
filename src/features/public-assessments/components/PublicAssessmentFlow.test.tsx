import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  ComprobanteIntento,
  InicioIntento,
  PortadaPublica,
  PruebaPublica,
} from '../domain/contract';

/**
 * Recorrido completo del módulo, en un navegador simulado.
 *
 * Se simula el **cliente** y no `fetch`, a propósito: el transporte ya tiene su propia
 * suite (`api/transport.test.ts`) y mezclar las dos capas haría que un cambio en las
 * cabeceras rompiera pruebas de interfaz. Aquí se comprueba el comportamiento que ve
 * la persona: qué se pide, qué se muestra, qué se envía y qué no puede pasar dos veces.
 */

vi.mock('../api/endpoint', () => ({
  endpointEvaluaciones: () => ({ estado: 'listo', url: 'https://x/exec', diagnostico: '' }),
  esModoDemostracion: () => false,
}));

const abrirEvaluacion = vi.fn();
const iniciarIntento = vi.fn();
const enviarIntento = vi.fn();
const guardarProgreso = vi.fn();
const latido = vi.fn();
let contadorSolicitudes = 0;

vi.mock('../api/client', async () => {
  const real = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...real,
    abrirEvaluacion: (...args: unknown[]) => abrirEvaluacion(...args),
    iniciarIntento: (...args: unknown[]) => iniciarIntento(...args),
    enviarIntento: (...args: unknown[]) => enviarIntento(...args),
    guardarProgreso: (...args: unknown[]) => guardarProgreso(...args),
    latido: (...args: unknown[]) => latido(...args),
    nuevaSolicitudId: () => {
      contadorSolicitudes += 1;
      return `req_${contadorSolicitudes}`;
    },
  };
});

import { ErrorEvaluaciones } from '../api/errors';
import { PublicAssessmentFlow } from './PublicAssessmentFlow';

/* ------------------------------ Datos de prueba --------------------------- */

function texto(cadena: string) {
  return { v: 1, b: [{ t: 'p' as const, s: [{ x: cadena }] }] };
}

const PRUEBA: PruebaPublica = {
  codigo: 'EV-RIES-4F2A',
  titulo: 'Evaluación de Riesgo Crediticio',
  descripcion: 'Prueba de conocimientos.',
  instrucciones: texto('Lee con atención.'),
  versionEtiqueta: 'v1.0',
  totalPreguntas: 3,
  aplicacion: {
    duracionMinutos: 30,
    navegacion: 'libre',
    permitirRetroceso: true,
    mostrarProgreso: true,
    autoenviarAlExpirar: true,
    // 0 desactiva el autoguardado por temporizador: en una prueba con temporizadores
    // reales, un intervalo suelto convierte los fallos en intermitentes.
    guardadoAutomaticoSegundos: 0,
  },
  participante: {
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre completo', obligatorio: true, activo: true },
      { clave: 'documento', etiqueta: 'Documento', obligatorio: true, activo: true },
    ],
    requiereConsentimiento: true,
    textoConsentimiento: 'Autorizo el tratamiento de mis respuestas.',
    visibilidadResultado: 'solo_envio',
  },
  integridad: {
    registrarCambioPestana: true,
    registrarCopiaPegado: true,
    registrarTiempos: false,
    registrarNavegacion: true,
    bloquearPegado: false,
    bloquearMenuContextual: false,
    // `false` para que `beforeunload` no interfiera con el desmontaje del test.
    avisarAlSalir: false,
    pantallaCompletaSugerida: false,
    umbralRiesgo: 5,
  },
  tema: {
    acento: 'esmeralda',
    densidad: 'comoda',
    portadaUrl: '',
    logoUrl: '',
    mostrarNumeracion: true,
    animaciones: true,
  },
  secciones: [
    {
      id: 'sec_1',
      titulo: 'Conocimientos',
      descripcion: { v: 1, b: [] },
      limiteSegundos: null,
      preguntas: [
        {
          id: 'pr_unica',
          tipo: 'opcion_unica',
          enunciado: texto('¿En qué categoría se clasifica una mora de 45 días?'),
          ayuda: { v: 1, b: [] },
          obligatoria: true,
          configuracion: {},
          opciones: [
            { id: 'op_a', valor: 'op_a', texto: texto('Categoría A') },
            { id: 'op_b', valor: 'op_b', texto: texto('Categoría B') },
          ],
          puntos: 10,
        },
        {
          id: 'pr_texto',
          tipo: 'texto_corto',
          enunciado: texto('Define riesgo crediticio.'),
          ayuda: { v: 1, b: [] },
          obligatoria: true,
          configuracion: {},
          opciones: [],
        },
        {
          id: 'pr_opcional',
          tipo: 'texto_corto',
          enunciado: texto('Comentarios adicionales.'),
          ayuda: { v: 1, b: [] },
          obligatoria: false,
          configuracion: {},
          opciones: [],
        },
      ],
    },
  ],
};

const PORTADA: PortadaPublica = {
  codigo: 'EV-RIES-4F2A',
  disponible: true,
  motivo: '',
  mensaje: '',
  titulo: PRUEBA.titulo,
  horaServidor: '2026-08-05T10:00:00Z',
  descripcion: PRUEBA.descripcion,
  instrucciones: PRUEBA.instrucciones,
  versionEtiqueta: 'v1.0',
  totalPreguntas: 3,
  duracionMinutos: 30,
  intentosMaximos: 1,
  participante: {
    campos: PRUEBA.participante.campos,
    requiereConsentimiento: true,
    textoConsentimiento: PRUEBA.participante.textoConsentimiento,
  },
  integridad: PRUEBA.integridad,
  tema: PRUEBA.tema,
  ventanaFin: '',
};

function inicio(parcial: Partial<InicioIntento> = {}): InicioIntento {
  return {
    intentoId: 'in_abc123',
    token: 'v1.token',
    retomado: false,
    horaServidor: '2026-08-05T10:00:00Z',
    iniciadoEn: '2026-08-05T10:00:00Z',
    limiteEn: '2026-08-05T10:30:00Z',
    segundosRestantes: 1800,
    respuestasPrevias: [],
    prueba: PRUEBA,
    ...parcial,
  };
}

const COMPROBANTE: ComprobanteIntento = {
  intentoId: 'in_abc123',
  evaluacion: PRUEBA.titulo,
  estado: 'enviado',
  enviadoEn: '2026-08-05T10:12:00Z',
  envioAutomatico: false,
  repetido: false,
  respuestasRegistradas: 2,
  calificacionPendiente: true,
  segundosUsados: 720,
};

/* --------------------------------- Ayudantes ------------------------------ */

async function identificarse(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText(/número identificador/i), '1234567-12-2026');
  await usuario.type(screen.getByLabelText(/nombre completo/i), 'Ana Quispe Mamani');
  await usuario.click(screen.getByRole('checkbox'));
  await usuario.click(screen.getByRole('button', { name: /continuar/i }));
}

async function entrarALaPrueba(usuario: ReturnType<typeof userEvent.setup>) {
  await identificarse(usuario);
  await screen.findByRole('heading', { name: PRUEBA.titulo });
  const casillas = screen.getAllByRole('checkbox');
  for (const casilla of casillas) await usuario.click(casilla);
  await usuario.click(screen.getByRole('button', { name: /comenzar la evaluación/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /enviar la evaluación/i })).toBeInTheDocument());
}

/* --------------------------------- Montaje -------------------------------- */

beforeEach(() => {
  contadorSolicitudes = 0;
  abrirEvaluacion.mockReset().mockResolvedValue(PORTADA);
  iniciarIntento.mockReset().mockResolvedValue(inicio());
  enviarIntento.mockReset().mockResolvedValue(COMPROBANTE);
  guardarProgreso.mockReset().mockResolvedValue({
    guardadoEn: '2026-08-05T10:05:00Z',
    respuestasGuardadas: 1,
    horaServidor: '2026-08-05T10:05:00Z',
    segundosRestantes: 1500,
    expirado: false,
  });
  latido.mockReset().mockResolvedValue({
    intentoId: 'in_abc123',
    estado: 'en_curso',
    horaServidor: '2026-08-05T10:05:00Z',
    limiteEn: '2026-08-05T10:30:00Z',
    segundosRestantes: 1500,
    expirado: false,
    ultimoGuardadoEn: '',
  });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ========================================================================== */

describe('recorrido completo sin inicio de sesión', () => {
  it('lleva a un candidato del enlace al comprobante', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);

    // 1 · Acceso: con el código en el enlace sólo se piden dos datos.
    expect(screen.getByLabelText(/número identificador/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/código de la evaluación/i)).not.toBeInTheDocument();

    await identificarse(usuario);
    expect(abrirEvaluacion).toHaveBeenCalledWith('EV-RIES-4F2A');

    // 2 · Antesala: se confirma la identidad y se declara lo que se registra.
    await screen.findByRole('heading', { name: PRUEBA.titulo });
    expect(screen.getByText('1234567-12-2026')).toBeInTheDocument();
    expect(screen.getByText(/qué se registra durante la evaluación/i)).toBeInTheDocument();
    expect(screen.getByText(PRUEBA.participante.textoConsentimiento)).toBeInTheDocument();

    for (const casilla of screen.getAllByRole('checkbox')) await usuario.click(casilla);
    await usuario.click(screen.getByRole('button', { name: /comenzar la evaluación/i }));

    // 3 · Prueba: el intento se crea con los datos correctos.
    await waitFor(() => expect(iniciarIntento).toHaveBeenCalledTimes(1));
    const [codigo, participante, extra] = iniciarIntento.mock.calls[0] as [
      string,
      Record<string, string>,
      Record<string, unknown>,
    ];
    expect(codigo).toBe('EV-RIES-4F2A');
    expect(participante).toMatchObject({
      nombre: 'Ana Quispe Mamani',
      documento: '1234567',
      numeroIdentificador: '1234567-12-2026',
    });
    expect(extra.consentimiento).toBe(true);

    await screen.findByRole('button', { name: /enviar la evaluación/i });
    // Se afirma sobre la barra de progreso y no sobre el texto: `aria-valuenow` es la
    // fuente semántica, la misma que anuncia un lector de pantalla.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');

    // 4 · Responder.
    await usuario.click(screen.getByRole('radio', { name: /categoría b/i }));
    await usuario.type(
      screen.getByRole('textbox', { name: /define riesgo crediticio/i }),
      'La probabilidad de impago.',
    );
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2'),
    );

    // 5 · Revisión y envío.
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/pregunta opcional omitida/i)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: /enviar ahora/i }));

    // 6 · Comprobante.
    await screen.findByRole('heading', { name: /evaluación enviada/i });
    expect(screen.getByText('in_abc123')).toBeInTheDocument();
    expect(screen.getByText(/revisa una persona del equipo evaluador/i)).toBeInTheDocument();
  });

  /**
   * La forma exacta de las respuestas es el contrato con el calificador. Un `opciones`
   * donde debería ir `valor` produce una respuesta incorrecta que nadie atribuiría al
   * cliente.
   */
  it('envía las respuestas con la forma que el calificador espera y sin campos de nota', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    await usuario.click(screen.getByRole('radio', { name: /categoría a/i }));
    await usuario.type(
      screen.getByRole('textbox', { name: /define riesgo crediticio/i }),
      'Riesgo de impago',
    );
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /enviar ahora/i }),
    );

    await waitFor(() => expect(enviarIntento).toHaveBeenCalledTimes(1));
    const [, , respuestas, , automatico] = enviarIntento.mock.calls[0] as [
      string,
      string,
      { preguntaId: string; opciones?: string[]; valor?: unknown }[],
      unknown,
      boolean,
    ];

    const unica = respuestas.find((r) => r.preguntaId === 'pr_unica');
    const abierta = respuestas.find((r) => r.preguntaId === 'pr_texto');
    expect(unica?.opciones).toEqual(['op_a']);
    expect(unica).not.toHaveProperty('valor');
    expect(abierta?.valor).toBe('Riesgo de impago');
    expect(automatico).toBe(false);

    const serializado = JSON.stringify(respuestas);
    for (const prohibida of ['correcta', 'puntosObtenidos', 'nota', 'aprobado']) {
      expect(serializado).not.toContain(prohibida);
    }
  });

  /**
   * La proyección pública del servidor no incluye la clave de respuestas, pero esta
   * prueba mira lo que de verdad importa: que no aparezca en el DOM. Un `data-*` o un
   * atributo de depuración descuidado la filtraría igual.
   */
  it('nunca pinta una clave de respuesta en la pantalla', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    const html = document.body.innerHTML;
    for (const prohibida of ['correcta', 'claveEmparejamiento', 'respuestaEsperada', 'modoPuntaje']) {
      expect(html).not.toContain(prohibida);
    }
  });
});

/* ========================================================================== */

describe('envíos duplicados', () => {
  it('un doble clic no envía dos veces', async () => {
    const usuario = userEvent.setup();
    let resolver: (valor: ComprobanteIntento) => void = () => {};
    enviarIntento.mockImplementation(
      () =>
        new Promise<ComprobanteIntento>((resuelve) => {
          resolver = resuelve;
        }),
    );

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);
    await usuario.click(screen.getByRole('radio', { name: /categoría a/i }));
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));

    const dialogo = await screen.findByRole('dialog');
    const boton = within(dialogo).getByRole('button', { name: /enviar ahora/i });
    await usuario.click(boton);
    await usuario.click(boton).catch(() => undefined);

    expect(enviarIntento).toHaveBeenCalledTimes(1);
    resolver(COMPROBANTE);
    await screen.findByRole('heading', { name: /evaluación enviada/i });
  });

  /**
   * El caso más importante de todo el módulo. Si el reintento usara un identificador
   * nuevo, el candidato acabaría con dos intentos en la hoja de cálculo y el reclutador
   * no sabría cuál vale.
   */
  it('el reintento reutiliza el MISMO solicitudId, así que no duplica el intento', async () => {
    const usuario = userEvent.setup();
    enviarIntento
      .mockRejectedValueOnce(
        new ErrorEvaluaciones('TRANSPORTE', { diagnostico: 'sin red durante la prueba' }),
      )
      .mockResolvedValueOnce(COMPROBANTE);

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);
    await usuario.click(screen.getByRole('radio', { name: /categoría a/i }));
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /enviar ahora/i }),
    );

    // Falla y ofrece reintentar.
    const reintentar = await screen.findByRole('button', { name: /reintentar el envío/i });
    await usuario.click(reintentar);

    await screen.findByRole('heading', { name: /evaluación enviada/i });
    expect(enviarIntento).toHaveBeenCalledTimes(2);
    const primero = (enviarIntento.mock.calls[0] as unknown[])[5];
    const segundo = (enviarIntento.mock.calls[1] as unknown[])[5];
    expect(segundo).toBe(primero);
  });

  it('muestra el comprobante original cuando el servidor ya lo tenía registrado', async () => {
    const usuario = userEvent.setup();
    enviarIntento.mockResolvedValue({ ...COMPROBANTE, repetido: true });

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /enviar ahora/i }),
    );

    await screen.findByRole('heading', { name: /evaluación enviada/i });
    expect(screen.getByText(/ya estaba registrado/i)).toBeInTheDocument();
    expect(screen.getByText(/no se creó ningún duplicado/i)).toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('obligatorias pendientes', () => {
  it('las lista, permite saltar a cada una y aun así deja enviar', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/2 preguntas obligatorias sin responder/i)).toBeInTheDocument();

    // Cada pendiente es navegable: informar sin ayudar a encontrarla no sirve.
    const atajo = within(dialogo).getByRole('button', { name: /mora de 45 días/i });
    await usuario.click(atajo);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Y se puede enviar incompleta: quien decide es quien rinde la prueba.
    await usuario.click(screen.getByRole('button', { name: /enviar la evaluación/i }));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /enviar ahora/i }),
    );
    await screen.findByRole('heading', { name: /evaluación enviada/i });
  });
});

/* ========================================================================== */

describe('intento retomado', () => {
  /**
   * Recargar no reinicia nada. El backend devuelve el mismo intento con su tiempo real
   * y sus respuestas, y el runner las siembra en lugar de empezar en blanco.
   */
  it('siembra las respuestas del servidor y lo anuncia', async () => {
    const usuario = userEvent.setup();
    iniciarIntento.mockResolvedValue(
      inicio({
        retomado: true,
        segundosRestantes: 600,
        respuestasPrevias: [
          { preguntaId: 'pr_unica', opciones: ['op_b'], valor: null },
          { preguntaId: 'pr_texto', opciones: [], valor: 'respuesta anterior' },
        ],
      }),
    );

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    expect(screen.getByText(/intento retomado/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('radio', { name: /categoría b/i })).toBeChecked();
    expect(screen.getByRole('textbox', { name: /define riesgo crediticio/i })).toHaveValue(
      'respuesta anterior',
    );
    // El reloj muestra el tiempo REAL que queda, no la duración completa.
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('evaluación no disponible', () => {
  it('muestra el motivo del servidor y ofrece volver a comprobar si es transitorio', async () => {
    const usuario = userEvent.setup();
    abrirEvaluacion.mockResolvedValue({
      ...PORTADA,
      disponible: false,
      motivo: 'pausada',
      mensaje: 'La evaluación está pausada temporalmente. Vuelve a intentarlo más tarde.',
    });

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await identificarse(usuario);

    await screen.findByText(/pausada temporalmente/i);
    expect(screen.getByRole('button', { name: /volver a comprobar/i })).toBeInTheDocument();
  });

  it('no ofrece reintento cuando el plazo ya terminó', async () => {
    const usuario = userEvent.setup();
    abrirEvaluacion.mockResolvedValue({
      ...PORTADA,
      disponible: false,
      motivo: 'ventana_cerrada',
      mensaje: 'El plazo para realizar esta evaluación ya terminó.',
    });

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await identificarse(usuario);

    await screen.findByText(/ya terminó/i);
    expect(screen.queryByRole('button', { name: /volver a comprobar/i })).not.toBeInTheDocument();
  });
});

/* ========================================================================== */

describe('el reloj y el autoenvío', () => {
  /**
   * Al llegar a cero se envía **una sola vez** y con la marca de automático, para que
   * el revisor sepa que la prueba se cerró sola en lugar de suponer que el candidato la
   * entregó a medias.
   */
  it('envía solo al agotarse el tiempo, marcado como automático', async () => {
    const usuario = userEvent.setup();
    iniciarIntento.mockResolvedValue(inicio({ segundosRestantes: 2 }));

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    await waitFor(() => expect(enviarIntento).toHaveBeenCalledTimes(1), { timeout: 6000 });
    const [, , , , automatico] = enviarIntento.mock.calls[0] as unknown[];
    expect(automatico).toBe(true);
    await screen.findByRole('heading', { name: /evaluación|cerrada/i });
  });

  it('no muestra reloj cuando la evaluación no tiene límite', async () => {
    const usuario = userEvent.setup();
    iniciarIntento.mockResolvedValue(
      inicio({
        segundosRestantes: null,
        limiteEn: '',
        prueba: { ...PRUEBA, aplicacion: { ...PRUEBA.aplicacion, duracionMinutos: null } },
      }),
    );

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await entrarALaPrueba(usuario);

    expect(screen.queryByTestId('ev-timer')).not.toBeInTheDocument();
    expect(latido).not.toHaveBeenCalled();
  });
});

/* ========================================================================== */

describe('sin código en el enlace', () => {
  it('pide el código de la evaluación en lugar de dejar un callejón sin salida', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow />);

    const campoCodigo = screen.getByLabelText(/código de la evaluación/i);
    expect(campoCodigo).toBeInTheDocument();

    await usuario.type(screen.getByLabelText(/número identificador/i), '1234567-12-2026');
    await usuario.type(screen.getByLabelText(/nombre completo/i), 'Ana Quispe');
    await usuario.type(campoCodigo, 'ev-ries-4f2a');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: /continuar/i }));

    // Se normaliza a mayúsculas: un código pegado en minúsculas no debe fallar.
    await waitFor(() => expect(abrirEvaluacion).toHaveBeenCalledWith('EV-RIES-4F2A'));
  });
});

/* ========================================================================== */

describe('campos adicionales del participante', () => {
  /**
   * `nombre`, `documento` y `proceso` los cubre el número identificador. El resto
   * —correo, teléfono, cargo, observaciones— es configurable por evaluación, y si el
   * autor marca alguno como obligatorio, `evParticipantData_` **rechaza el inicio**.
   * Sin pedirlos, esa evaluación sería imposible de empezar y el candidato vería un
   * error que no puede resolver.
   */
  it('pide los campos que el autor activó y los envía en el participante', async () => {
    const usuario = userEvent.setup();
    abrirEvaluacion.mockResolvedValue({
      ...PORTADA,
      participante: {
        campos: [
          { clave: 'nombre', etiqueta: 'Nombre completo', obligatorio: true, activo: true },
          { clave: 'documento', etiqueta: 'Documento', obligatorio: true, activo: true },
          { clave: 'correo', etiqueta: 'Correo electrónico', obligatorio: true, activo: true },
          { clave: 'cargo', etiqueta: 'Cargo al que postula', obligatorio: false, activo: true },
        ],
        requiereConsentimiento: false,
        textoConsentimiento: '',
      },
    });

    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await identificarse(usuario);
    await screen.findByRole('heading', { name: PRUEBA.titulo });

    // El obligatorio bloquea el arranque.
    await usuario.click(screen.getByRole('checkbox', { name: /he leído/i }));
    const comenzar = screen.getByRole('button', { name: /comenzar la evaluación/i });
    expect(comenzar).toBeDisabled();

    // Y valida el formato del correo antes de gastar un viaje al servidor.
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'no-es-correo');
    await usuario.tab();
    expect(await screen.findByText(/correo electrónico válido/i)).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText(/correo electrónico/i));
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'ana@example.com');
    await usuario.type(screen.getByLabelText(/cargo al que postula/i), 'Analista de Crédito');
    await usuario.click(screen.getByRole('button', { name: /comenzar la evaluación/i }));

    await waitFor(() => expect(iniciarIntento).toHaveBeenCalledTimes(1));
    const [, participante] = iniciarIntento.mock.calls[0] as [string, Record<string, unknown>];
    expect(participante.extra).toEqual({
      correo: 'ana@example.com',
      cargo: 'Analista de Crédito',
    });
  });

  it('no pide nada cuando la evaluación solo usa nombre y documento', async () => {
    const usuario = userEvent.setup();
    render(<PublicAssessmentFlow codigoInicial="EV-RIES-4F2A" />);
    await identificarse(usuario);
    await screen.findByRole('heading', { name: PRUEBA.titulo });
    expect(screen.queryByText(/datos que pide esta evaluación/i)).not.toBeInTheDocument();
  });
});
