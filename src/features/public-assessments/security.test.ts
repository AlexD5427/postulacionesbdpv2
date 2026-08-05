import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from '@/core/security/headers.mjs';

/**
 * Invariantes de seguridad, comprobadas leyendo el código fuente.
 *
 * ── Por qué una prueba estática y no confianza ───────────────────────────────
 * Las garantías de este módulo no son propiedades de una función concreta, sino de
 * TODO el módulo: «no hay `innerHTML` en ninguna parte», «no se nombra ninguna acción
 * administrativa», «no se lee ninguna variable de servidor». Una prueba de
 * comportamiento no puede cubrir eso porque no sabe qué archivos existirán mañana.
 * Leer el directorio sí, y una regresión introducida en un archivo nuevo falla igual
 * que en uno viejo.
 */

const RAIZ = join(process.cwd(), 'src/features/public-assessments');

function archivosDelModulo(directorio = RAIZ): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) return archivosDelModulo(ruta);
    return /\.(ts|tsx)$/.test(entrada) ? [ruta] : [];
  });
}

const ARCHIVOS = archivosDelModulo();
const FUENTE = ARCHIVOS.filter((ruta) => !/\.test\.tsx?$/.test(ruta));

function leer(ruta: string): string {
  return readFileSync(ruta, 'utf8');
}

/** Contenido de todos los archivos de producción del módulo, sin comentarios. */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('el módulo existe y es autocontenido', () => {
  it('tiene archivos de producción y de prueba', () => {
    expect(FUENTE.length).toBeGreaterThan(10);
    expect(ARCHIVOS.length).toBeGreaterThan(FUENTE.length);
  });

  /**
   * El módulo debe poder retirarse en un solo commit. Si algo de fuera importa sus
   * interioridades, retirarlo rompe otra cosa. La única puerta legítima es la ruta.
   */
  it('nada fuera del módulo lo importa, salvo su propia ruta', () => {
    const fuera: string[] = [];
    const recorrer = (directorio: string) => {
      for (const entrada of readdirSync(directorio)) {
        const ruta = join(directorio, entrada);
        if (statSync(ruta).isDirectory()) {
          if (ruta.includes('public-assessments')) continue;
          recorrer(ruta);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entrada)) continue;
        if (leer(ruta).includes('features/public-assessments')) fuera.push(ruta);
      }
    };
    recorrer(join(process.cwd(), 'src'));

    const permitidos = fuera.filter(
      (ruta) => !ruta.includes(join('app', '(public)', 'evaluaciones')),
    );
    expect(permitidos, `importan el módulo desde fuera: ${permitidos.join(', ')}`).toEqual([]);
  });
});

describe('sin inyección de HTML', () => {
  /**
   * El modelo de texto enriquecido se diseñó para que renderizarlo fuera seguro sin
   * sanear nada: lo único que puede existir es texto y marcas de una lista blanca.
   * Meterlo en HTML tira ese diseño a la basura y devuelve el problema del XSS a un
   * sitio donde ya estaba resuelto.
   */
  it('no usa dangerouslySetInnerHTML, innerHTML, eval ni Function', () => {
    const prohibidos = [
      'dangerouslySetInnerHTML',
      '.innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'document.write',
      'eval(',
      'new Function(',
    ];
    for (const ruta of FUENTE) {
      const contenido = sinComentarios(leer(ruta));
      for (const patron of prohibidos) {
        expect(contenido, `${ruta} contiene «${patron}»`).not.toContain(patron);
      }
    }
  });
});

describe('sin superficie administrativa', () => {
  /**
   * `EV_ADMIN_ACTIONS` del backend tiene veintidós acciones que pueden publicar,
   * borrar, calificar o exportar. Ninguna puede aparecer en el navegador de un
   * candidato, ni siquiera como cadena suelta.
   */
  const ACCIONES_ADMIN = [
    'listEvaluations',
    'getEvaluation',
    'createEvaluation',
    'saveEvaluation',
    'duplicateEvaluation',
    'publishEvaluation',
    'transitionEvaluation',
    'relaunchEvaluation',
    'rollbackEvaluation',
    'deleteEvaluation',
    'purgeEvaluation',
    'listAttempts',
    'getAttempt',
    'exportAttempt',
    'gradeAnswer',
    'annulAttempt',
    'listLogs',
    'pruneLogs',
    'getMetrics',
    'diagnose',
    'install',
    'repair',
  ];

  it('no nombra ninguna acción administrativa', () => {
    for (const ruta of FUENTE) {
      const contenido = sinComentarios(leer(ruta));
      for (const accion of ACCIONES_ADMIN) {
        expect(contenido, `${ruta} nombra «${accion}»`).not.toContain(`'${accion}'`);
        expect(contenido, `${ruta} nombra «${accion}»`).not.toContain(`"${accion}"`);
      }
    }
  });

  it('no envía ninguna llave de administración', () => {
    for (const ruta of FUENTE) {
      const contenido = sinComentarios(leer(ruta));
      for (const clave of ['llaveAdmin', 'adminKey', 'EV_ADMIN_KEY', 'EV_ATTEMPT_SECRET']) {
        expect(contenido, `${ruta} menciona «${clave}»`).not.toContain(clave);
      }
    }
  });

  it('solo usa las cinco acciones públicas del candidato', () => {
    const contrato = leer(join(RAIZ, 'domain/contract.ts'));
    const acciones = [...contrato.matchAll(/'(openAssessment|startAttempt|heartbeat|saveProgress|submitAttempt)'/g)];
    expect(new Set(acciones.map((coincidencia) => coincidencia[1])).size).toBe(5);
  });
});

describe('sin secretos ni variables de servidor', () => {
  /**
   * Todo lo que este módulo lee del entorno tiene que ser `NEXT_PUBLIC_*`. Cualquier
   * otra variable la incrustaría el compilador en el paquete del navegador o llegaría
   * como `undefined`, y las dos formas de fallar son malas.
   */
  it('solo lee variables públicas', () => {
    for (const ruta of FUENTE) {
      const contenido = leer(ruta);
      const variables = [...contenido.matchAll(/process\.env\.([A-Z0-9_]+)/g)];
      for (const [, nombre] of variables) {
        expect(nombre, `${ruta} lee ${nombre}`).toMatch(/^NEXT_PUBLIC_/);
      }
      for (const sospechoso of ['SERVICE_ROLE', 'SECRET', 'PRIVATE_KEY', 'PASSPHRASE']) {
        expect(contenido, `${ruta} menciona ${sospechoso}`).not.toContain(sospechoso);
      }
    }
  });

  /**
   * El token del intento es una credencial. Guardarlo en almacenamiento del navegador
   * permitiría reanudar sin identificarse, lo cual suena cómodo hasta que se piensa en
   * un equipo compartido. El camino correcto ya existe y es mejor: volver a escribir el
   * número identificador y dejar que el backend retome el intento.
   */
  it('no guarda el token ni los datos personales en el almacenamiento del navegador', () => {
    // Se quitan los comentarios: el propio archivo explica por qué NO usa
    // `localStorage`, y esa explicación no debe hacer fallar la comprobación.
    const borrador = sinComentarios(leer(join(RAIZ, 'state/draft.ts')));
    expect(borrador).toContain('sessionStorage');
    expect(borrador).not.toContain('localStorage');

    const guardado = borrador.slice(borrador.indexOf('export interface Borrador'));
    for (const campo of ['token', 'nombre', 'documento', 'carnet']) {
      expect(guardado.slice(0, guardado.indexOf('}')), `el borrador guarda «${campo}»`).not.toContain(
        campo,
      );
    }
  });

  it('ningún componente llama a fetch por su cuenta', () => {
    const componentes = FUENTE.filter((ruta) => ruta.includes('/components/'));
    expect(componentes.length).toBeGreaterThan(5);
    for (const ruta of componentes) {
      expect(sinComentarios(leer(ruta)), `${ruta} llama a fetch`).not.toContain('fetch(');
    }
  });
});

describe('cabeceras de seguridad del portal', () => {
  const cabeceras = securityHeaders();
  const csp = cabeceras.find((cabecera) => cabecera.key === 'Content-Security-Policy')?.value ?? '';
  const permisos = cabeceras.find((cabecera) => cabecera.key === 'Permissions-Policy')?.value ?? '';

  /**
   * Los DOS orígenes de Google son obligatorios: se llama a `script.google.com`, que
   * responde `302` hacia `script.googleusercontent.com`, y **la política se aplica
   * también al destino de la redirección**. Omitir el segundo produce una petición
   * bloqueada que parece exactamente un corte de red.
   */
  it('permite los dos orígenes de Apps Script, y solo esos dos', () => {
    const connect = /connect-src ([^;]+)/.exec(csp)?.[1] ?? '';
    expect(connect).toContain('https://script.google.com');
    expect(connect).toContain('https://script.googleusercontent.com');
    // Sin comodines sobre Google: sería abrir mucho más de lo necesario.
    expect(connect).not.toContain('*.google.com');
    expect(connect).not.toContain('*.googleusercontent.com');
  });

  it('mantiene cerradas las vías de inyección más peligrosas', () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  /**
   * Sin proctoring, y comprobado. El módulo declara que no usa cámara ni micrófono; la
   * política de permisos lo hace cierto a nivel de navegador, no sólo de promesa.
   */
  it('deniega cámara, micrófono y ubicación', () => {
    for (const permiso of ['camera=()', 'microphone=()', 'geolocation=()']) {
      expect(permisos).toContain(permiso);
    }
  });
});
