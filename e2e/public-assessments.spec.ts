import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Módulo público de evaluaciones, en un navegador real.
 *
 * Se ejecuta contra el backend de **demostración** (`NEXT_PUBLIC_DATA_MODE=mock` sin
 * endpoint configurado), que habla exactamente el mismo contrato que el Web App de
 * Apps Script: los mismos datos, el mismo reloj de servidor, la misma reanudación por
 * documento y las mismas repeticiones idempotentes.
 *
 * Lo que estas pruebas cubren y las de componente no pueden: los controles nativos
 * respondiendo a un ratón y a un teclado de verdad, el desplazamiento, el foco, la
 * barra fija, el diseño en un móvil y las capturas de la revisión visual.
 */

const CODIGO = 'EV-DEMO-2026';
const NUMERO = '1234567-12-2026';

/** Directorio de las capturas. Se revisan a mano y se adjuntan a la PR. */
const CAPTURAS = 'test-results/capturas';

/**
 * Captura estable.
 *
 * `animations: 'disabled'` congela la aurora del fondo, el barrido de los controles y
 * las transiciones de Framer Motion. Sin eso, Playwright espera a que la página se
 * quede quieta y una animación en bucle no se queda quieta nunca.
 */
async function capturar(page: Page, nombre: string, { completa = true } = {}) {
  // El portal muestra un precargador a pantalla completa en la primera visita. Es
  // `fixed`, y en una captura de página completa un elemento `fixed` se dibuja en la
  // parte superior de la imagen y tapa el contenido: la captura sale inservible para
  // revisar el diseño aunque la página esté perfecta. Se espera a que desaparezca.
  await page
    .getByRole('status', { name: /trabaja en bdp/i })
    .waitFor({ state: 'hidden', timeout: 8000 })
    .catch(() => undefined);

  /*
   * Se captura con movimiento reducido emulado, y hay una razón concreta.
   *
   * Las tarjetas de pregunta entran con `whileInView`, así que arrancan invisibles y
   * aparecen al entrar en pantalla. Con `animations: 'disabled'` de Playwright, las que
   * nunca entraron se quedan congeladas en invisible y la captura de página completa
   * sale medio vacía. Con movimiento reducido, el módulo salta las animaciones de
   * entrada y todo se pinta de una vez.
   *
   * De paso, esto ejercita el camino de accesibilidad: si algo sólo fuera visible
   * gracias a una animación, saldría en blanco aquí.
   */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);

  // Las capturas son un apoyo para la revisión visual, no una afirmación. Playwright
  // espera a `document.fonts.ready` antes de disparar y en algunas ejecuciones esa
  // promesa no resuelve; que eso tumbe una prueba funcional sería un falso negativo.
  await page
    .screenshot({
      path: `${CAPTURAS}/${nombre}.png`,
      fullPage: completa,
      animations: 'disabled',
      timeout: 8000,
    })
    .catch(() => undefined);

  await page.emulateMedia({ reducedMotion: null });
}

async function irAlAcceso(page: Page) {
  await page.goto(`/evaluaciones?codigo=${CODIGO}`);
  // El portal muestra un recorrido guiado en la primera visita; se cierra si aparece
  // para que no tape el formulario.
  const cerrarTour = page.getByRole('button', { name: /cerrar|saltar|entendido/i }).first();
  if (await cerrarTour.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cerrarTour.click().catch(() => undefined);
  }
  await expect(page.getByRole('heading', { name: /rendir una evaluación/i })).toBeVisible();
}

async function identificarse(page: Page) {
  await page.getByLabel(/número identificador/i).fill(NUMERO);
  await page.getByLabel(/nombre completo/i).fill('Ana Quispe Mamani');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: /continuar/i }).click();
  await expect(page.getByRole('heading', { name: /analista de crédito/i })).toBeVisible();
}

async function comenzar(page: Page) {
  for (const casilla of await page.getByRole('checkbox').all()) await casilla.click();
  await page.getByRole('button', { name: /comenzar la evaluación/i }).click();
  await expect(page.getByRole('button', { name: /enviar la evaluación/i })).toBeVisible();
}

/** Abre el panel del navegador de preguntas, que está cerrado por omisión. */
async function abrirNavegador(page: Page) {
  // Se busca por el nombre accesible y no por el texto visible: por debajo de `sm` el
  // texto «Preguntas» se oculta para que la barra quepa, y el nombre lo aporta el
  // `aria-label`. Si un día se quita, esta prueba falla en el proyecto móvil.
  await page.getByRole('button', { name: 'Ir a una pregunta' }).click();
  await expect(page.getByRole('navigation', { name: /ir a una pregunta/i })).toBeVisible();
}

/* ========================================================================== */

test.describe('acceso', () => {
  test('con el código en el enlace solo pide el número identificador y el nombre', async ({ page }) => {
    await irAlAcceso(page);

    await expect(page.getByLabel(/número identificador/i)).toBeVisible();
    await expect(page.getByLabel(/nombre completo/i)).toBeVisible();
    // El código venía en el enlace: no se vuelve a pedir, sólo se muestra.
    await expect(page.getByLabel(/código de la evaluación/i)).toHaveCount(0);
    await expect(page.getByText(CODIGO)).toBeVisible();

    await capturar(page, '01-acceso');
  });

  test('el eco de las tres partes aparece al escribir el número', async ({ page }) => {
    await irAlAcceso(page);
    await page.getByLabel(/número identificador/i).fill(NUMERO);

    await expect(page.getByText('1234567', { exact: true })).toBeVisible();
    await expect(page.getByText('12', { exact: true })).toBeVisible();
    await expect(page.getByText('2026', { exact: true })).toBeVisible();

    await capturar(page, '02-acceso-eco');
  });

  test('la casilla de datos personales bloquea el avance', async ({ page }) => {
    await irAlAcceso(page);
    await page.getByLabel(/número identificador/i).fill(NUMERO);
    await page.getByLabel(/nombre completo/i).fill('Ana Quispe');

    await expect(page.getByRole('button', { name: /continuar/i })).toBeDisabled();
    await page.getByRole('checkbox').click();
    await expect(page.getByRole('button', { name: /continuar/i })).toBeEnabled();
  });

  test('un número mal formado explica qué parte está mal', async ({ page }) => {
    await irAlAcceso(page);
    await page.getByLabel(/número identificador/i).fill('12-12-2026');
    await page.getByLabel(/nombre completo/i).click();
    // Se limita a la alerta del formulario: Next añade su propio `role="alert"` para
    // anunciar los cambios de ruta, y `getByRole('alert')` encontraría los dos.
    await expect(page.locator('form [role="alert"]')).toContainText(/carnet de identidad/i);
  });

  test('sin código en el enlace, lo pide en lugar de dejar un callejón sin salida', async ({ page }) => {
    await page.goto('/evaluaciones');
    await expect(page.getByLabel(/código de la evaluación/i)).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('antesala', () => {
  test('declara lo que se registra y confirma la identidad antes de arrancar el reloj', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);

    await expect(page.getByText(/qué se registra durante la evaluación/i)).toBeVisible();
    // La promesa explícita: sin cámara, sin micrófono, sin grabación.
    await expect(page.getByText(/no se usa/i)).toBeVisible();
    // La identidad, para poder corregir un carnet mal escrito antes de empezar.
    await expect(page.getByText(NUMERO)).toBeVisible();
    await expect(page.getByRole('button', { name: /comenzar la evaluación/i })).toBeDisabled();

    await capturar(page, '03-antesala');
  });

  test('permite corregir los datos sin haber empezado', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await page.getByRole('button', { name: /no soy yo/i }).click();
    await expect(page.getByLabel(/número identificador/i)).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('la prueba', () => {
  test('muestra el reloj, el progreso y el navegador de preguntas', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    await expect(page.getByTestId('ev-timer')).toBeVisible();
    await expect(page.getByRole('progressbar')).toBeVisible();

    await capturar(page, '04-prueba', { completa: false });

    // El navegador de preguntas vive en un panel bajo demanda: la barra fija se
    // mantiene compacta y no tapa la pregunta a la que se acaba de desplazar.
    await abrirNavegador(page);
    await capturar(page, '04b-navegador', { completa: false });
  });

  test('responder actualiza el progreso y marca la pregunta', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('radio', { name: /categoría b/i }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  /**
   * Todos los tipos del catálogo, en una sola prueba. Es el caso que descubre un
   * control que no se dibuja: la evaluación de demostración cubre las catorce formas
   * de respuesta a propósito.
   */
  test('dibuja todos los tipos de control sin errores de consola', async ({ page }) => {
    const errores: string[] = [];
    page.on('console', (mensaje) => {
      if (mensaje.type() === 'error') errores.push(mensaje.text());
    });
    page.on('pageerror', (error) => errores.push(error.message));

    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    // Controles de cada familia.
    await expect(page.getByRole('radio', { name: /categoría a/i })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /documento de identidad vigente/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.getByRole('spinbutton').first()).toBeVisible();
    await expect(page.getByRole('slider')).toBeVisible();
    // La cuadrícula es una tabla en escritorio y un conjunto de tarjetas apiladas por
    // debajo de `sm`: una tabla de cinco columnas con desplazamiento horizontal en un
    // móvil es una forma fiable de marcar la celda equivocada.
    const anchoVisible = page.viewportSize()?.width ?? 1280;
    if (anchoVisible >= 640) {
      await expect(page.getByRole('table').first()).toBeVisible();
    } else {
      await expect(page.getByRole('group', { name: /hojas de cálculo/i })).toBeVisible();
    }
    await expect(page.getByRole('textbox', { name: /hueco 1 de 2/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /bajar «Desembolso»/i })).toBeVisible();

    await capturar(page, '05-todos-los-tipos');
    expect(errores, `errores en consola: ${errores.join(' | ')}`).toEqual([]);
  });

  test('ordenar funciona con teclado, sin arrastrar', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    const bajar = page.getByRole('button', { name: /bajar «Desembolso» a la posición 2/i });
    await bajar.scrollIntoViewIfNeeded();
    await bajar.click();
    // «Solicitud» era el segundo; al bajar «Desembolso» pasa a ser el primero.
    await expect(page.getByRole('listitem').filter({ hasText: 'Solicitud' }).first()).toBeVisible();
  });

  test('el navegador de preguntas salta a la pregunta y le pone el foco', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    await abrirNavegador(page);
    const pastilla = page.getByRole('button', { name: /pregunta 12/i });
    await pastilla.click();
    // El foco viaja con la vista: llevar una sin la otra deja a quien usa teclado donde estaba.
    await expect(page.locator(':focus')).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('revisión y envío', () => {
  test('la revisión lista las obligatorias pendientes y permite saltar a ellas', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    await page.getByRole('button', { name: /enviar la evaluación/i }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText(/obligatorias sin responder/i)).toBeVisible();

    await capturar(page, '06-revision', { completa: false });

    await dialogo.getByRole('button', { name: /mora de 45 días/i }).click();
    await expect(dialogo).toBeHidden();
  });

  test('recorrido completo hasta el comprobante', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    // Se responden las obligatorias.
    await page.getByRole('radio', { name: /categoría b/i }).click();
    await page.getByRole('checkbox', { name: /documento de identidad vigente/i }).click();
    await page.getByRole('checkbox', { name: /respaldo de ingresos/i }).click();
    await page.getByRole('radio', { name: 'Falso' }).click();
    await page.getByRole('spinbutton').first().fill('60');
    await page
      .getByRole('textbox', { name: /una frase/i })
      .fill('La probabilidad de que un deudor no cumpla con sus obligaciones.');
    await page
      .getByRole('textbox', { name: /productor sin historial/i })
      .fill(
        'Levantaría información en campo sobre el ciclo productivo, verificaría referencias comerciales de proveedores y acopiadores, y construiría un flujo de caja proyectado con base en rendimientos históricos de la zona. Complementaría con visita al predio y validación de activos productivos, además de referencias de la comunidad y del sindicato agrario correspondiente.',
      );
    await page.getByRole('checkbox', { name: /lo declaro/i }).click();

    await page.getByRole('button', { name: /enviar la evaluación/i }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText(/opcional/i).first()).toBeVisible();
    await dialogo.getByRole('button', { name: /enviar ahora/i }).click();

    await expect(page.getByRole('heading', { name: /evaluación enviada/i })).toBeVisible();
    // El comprobante es lo único que la persona tiene si hay que reclamar algo.
    await expect(page.getByText(/identificador de tu intento/i)).toBeVisible();
    await expect(page.getByText(/^in_demo_/)).toBeVisible();

    await capturar(page, '07-comprobante');
  });

  /**
   * El código de demostración `EV-DEMO-REINT` falla el primer envío a propósito. Es la
   * única forma de comprobar de verdad que el reintento no duplica el intento.
   */
  test('un envío fallido se puede reintentar sin duplicar el intento', async ({ page }) => {
    await page.goto('/evaluaciones?codigo=EV-DEMO-REINT');
    await page.getByLabel(/número identificador/i).fill('7654321-9-2026');
    await page.getByLabel(/nombre completo/i).fill('Luis Condori');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /continuar/i }).click();
    await comenzar(page);

    await page.getByRole('button', { name: /enviar la evaluación/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /enviar ahora/i }).click();

    const reintentar = page.getByRole('button', { name: /reintentar el envío/i });
    await expect(reintentar).toBeVisible();
    await capturar(page, '08-reintento', { completa: false });

    await reintentar.click();
    await expect(page.getByRole('heading', { name: /evaluación enviada/i })).toBeVisible();
  });

  test('un intento ya enviado no se puede repetir con el mismo documento', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);
    await page.getByRole('button', { name: /enviar la evaluación/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /enviar ahora/i }).click();
    await expect(page.getByRole('heading', { name: /evaluación enviada/i })).toBeVisible();

    // Se vuelve a entrar con el MISMO número identificador.
    await irAlAcceso(page);
    await identificarse(page);
    for (const casilla of await page.getByRole('checkbox').all()) await casilla.click();
    await page.getByRole('button', { name: /comenzar la evaluación/i }).click();
    await expect(page.getByText(/solo se permite un intento/i)).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('reanudación', () => {
  /**
   * Recargar no reinicia nada. El backend retoma el intento por documento y devuelve el
   * tiempo real y las respuestas: por eso este módulo no necesita guardar el token del
   * intento en ningún sitio.
   */
  test('recargar y volver a identificarse recupera las respuestas', async ({ page }) => {
    await page.goto('/evaluaciones?codigo=EV-DEMO-2026');
    await page.getByLabel(/número identificador/i).fill('5555555-3-2026');
    await page.getByLabel(/nombre completo/i).fill('Rosa Villca');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /continuar/i }).click();
    await comenzar(page);

    await page.getByRole('radio', { name: /categoría c/i }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    await page.reload();
    await page.getByLabel(/número identificador/i).fill('5555555-3-2026');
    await page.getByLabel(/nombre completo/i).fill('Rosa Villca');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /continuar/i }).click();
    await comenzar(page);

    await expect(page.getByText(/intento retomado/i)).toBeVisible();
    await expect(page.getByRole('radio', { name: /categoría c/i })).toBeChecked();
  });
});

/* ========================================================================== */

test.describe('indisponibilidad', () => {
  test('una evaluación pausada lo dice y ofrece volver a comprobar', async ({ page }) => {
    await page.goto('/evaluaciones?codigo=EV-DEMO-PAUSA');
    await page.getByLabel(/número identificador/i).fill(NUMERO);
    await page.getByLabel(/nombre completo/i).fill('Ana Quispe');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await expect(page.getByText(/pausada temporalmente/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /volver a comprobar/i })).toBeVisible();
    await capturar(page, '09-pausada');
  });

  test('un código inexistente no revela si la evaluación existe', async ({ page }) => {
    await page.goto('/evaluaciones?codigo=EV-NO-EXISTE');
    await page.getByLabel(/número identificador/i).fill(NUMERO);
    await page.getByLabel(/nombre completo/i).fill('Ana Quispe');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await expect(page.getByText(/no pudimos abrir la evaluación/i)).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('modo demostración', () => {
  test('avisa de forma permanente en cada pantalla', async ({ page }) => {
    await irAlAcceso(page);
    await expect(page.getByText(/modo demostración/i)).toBeVisible();
    await identificarse(page);
    await expect(page.getByText(/modo demostración/i)).toBeVisible();
    await comenzar(page);
    await expect(page.getByText(/modo demostración/i)).toBeVisible();
  });
});

/* ========================================================================== */

test.describe('la clave de respuestas no sale del servidor', () => {
  test('ninguna respuesta de red ni el DOM contienen la clave', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);

    const html = await page.content();
    for (const prohibida of [
      'correcta',
      'claveEmparejamiento',
      'respuestaEsperada',
      'modoPuntaje',
      'puntajeAprobacion',
    ]) {
      expect(html, `el DOM contiene «${prohibida}»`).not.toContain(prohibida);
    }
  });
});

/* ========================================================================== */

test.describe('accesibilidad', () => {
  /**
   * `e2e/accessibility.spec.ts` ya audita `/evaluaciones`, pero sólo alcanza el
   * formulario de acceso: es la única pantalla del módulo a la que se llega sin
   * identificarse. La antesala y la prueba —donde está casi toda la interacción y
   * viven los catorce controles— quedaban fuera, así que se auditan aquí, ya dentro
   * del flujo.
   */
  const auditar = async (page: Page, etapa: string) => {
    /*
     * Se audita el estado **asentado**, con movimiento reducido emulado.
     *
     * Las tarjetas de pregunta entran entre `opacity: 0` y `1`. Sin esto, axe puede
     * medir el contraste de un fotograma intermedio —con la tarjeta a media
     * transparencia— y reportar un incumplimiento que no existe en ningún estado
     * estable. Se vio como un fallo intermitente que sólo aparecía en el proyecto móvil,
     * porque el dispositivo emulado es más lento y la animación seguía en marcha.
     *
     * Auditar con movimiento reducido no rebaja la exigencia: es el modo en que el
     * módulo se pinta de una vez, y el contraste de un fotograma de transición no es un
     * requisito de la norma.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Margen suficiente para que termine la entrada escalonada: hasta 0,28 s de retraso
    // más 0,3 s de transición. Emular movimiento reducido no cancela una animación que ya
    // está en marcha, así que hay que esperarla.
    await page.waitForTimeout(900);

    const resultado = await new AxeBuilder({ page })
      // Se audita el módulo, no el portal completo. La barra pública, el dock y el botón
      // del centro de accesibilidad ya los audita `e2e/accessibility.spec.ts`, y tienen
      // incumplimientos propios y anteriores a este módulo (separación entre el botón
      // flotante y el dock en pantallas estrechas). Mezclarlos aquí haría que esta suite
      // fallara por algo que este módulo no puede arreglar, y —peor— acostumbraría a
      // ignorarla.
      .include('.ev-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const graves = resultado.violations.filter(
      (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical',
    );
    await page.emulateMedia({ reducedMotion: null });

    expect(
      graves,
      `${etapa}: ${JSON.stringify(
        graves.map((violacion) => ({ id: violacion.id, nodos: violacion.nodes.length })),
        null,
        2,
      )}`,
    ).toEqual([]);
  };

  test('la antesala y la prueba no tienen violaciones graves', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await auditar(page, 'antesala');

    await comenzar(page);
    await auditar(page, 'prueba');

    // El navegador de preguntas es un panel que aparece: se audita abierto.
    await abrirNavegador(page);
    await auditar(page, 'navegador de preguntas');
  });

  test('el comprobante no tiene violaciones graves', async ({ page }) => {
    await irAlAcceso(page);
    await identificarse(page);
    await comenzar(page);
    await page.getByRole('button', { name: /enviar la evaluación/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /enviar ahora/i }).click();
    await expect(page.getByRole('heading', { name: /evaluación enviada/i })).toBeVisible();
    await auditar(page, 'comprobante');
  });
});
