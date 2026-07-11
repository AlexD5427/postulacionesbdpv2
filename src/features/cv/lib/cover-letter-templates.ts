import type { CoverLetterTemplateKey } from '@/shared/types/domain';

/**
 * Configurable example cover-letter templates. Plain text in the MVP (future:
 * restricted rich text). These are starting points the candidate fully edits.
 */
export const COVER_LETTER_TEMPLATES: Record<
  CoverLetterTemplateKey,
  { label: string; description: string; body: string }
> = {
  formal_banking: {
    label: 'Banca formal',
    description: 'Tono institucional y sobrio, ideal para roles financieros.',
    body: `Estimado equipo de Talento del Banco de Desarrollo Productivo BDP S.A.M.:

Me dirijo a ustedes con gran interés en la convocatoria publicada. Cuento con formación y experiencia en el ámbito financiero, y me identifico con la misión del banco de impulsar el desarrollo productivo del país.

A lo largo de mi trayectoria he desarrollado sólidas capacidades de análisis, atención al detalle y orientación al cliente, siempre con apego a la ética y a la normativa vigente.

Agradezco de antemano la oportunidad de ser considerado(a) en este proceso y quedo a disposición para ampliar cualquier información.

Atentamente,`,
  },
  customer_service: {
    label: 'Atención al cliente',
    description: 'Cálido y orientado al servicio.',
    body: `Estimado equipo de Talento del BDP:

Me entusiasma postular a esta convocatoria porque disfruto acompañar a las personas y brindarles una experiencia de servicio cercana y confiable.

Tengo facilidad para comunicarme con claridad, resolver dudas con paciencia y mantener la calma en situaciones exigentes. Creo firmemente que una buena atención construye confianza y relaciones duraderas.

Estaré encantado(a) de aportar mi vocación de servicio al equipo del banco.

Cordialmente,`,
  },
  commercial: {
    label: 'Rol comercial',
    description: 'Enfocado en resultados y relaciones.',
    body: `Estimado equipo de Talento del BDP:

Postulo a esta convocatoria motivado(a) por el reto de generar impacto comercial responsable. Me caracteriza la orientación a resultados, la construcción de relaciones de confianza y la capacidad de entender las necesidades de cada cliente.

Estoy convencido(a) de que el crecimiento sostenible nace de escuchar y ofrecer soluciones adecuadas, en línea con los valores del banco.

Quedo a disposición para conversar sobre cómo puedo contribuir a los objetivos del equipo.

Saludos cordiales,`,
  },
  leadership: {
    label: 'Liderazgo',
    description: 'Para posiciones de conducción de equipos.',
    body: `Estimado equipo de Talento del BDP:

Me presento a esta convocatoria con el compromiso de liderar equipos de forma cercana, ética y orientada a resultados sostenibles. A lo largo de mi carrera he aprendido que el mejor desempeño surge cuando las personas se sienten escuchadas y acompañadas.

Aporto experiencia en la gestión operativa, el desarrollo del talento y la toma de decisiones con criterio y responsabilidad.

Será un honor contribuir al propósito del banco de impulsar el desarrollo productivo de Bolivia.

Atentamente,`,
  },
  analytical: {
    label: 'Rol analítico',
    description: 'Para perfiles de análisis y datos.',
    body: `Estimado equipo de Talento del BDP:

Postulo a esta convocatoria motivado(a) por transformar datos en decisiones sólidas. Me caracterizan el pensamiento analítico, la rigurosidad y la atención al detalle.

Disfruto identificar patrones, anticipar riesgos y comunicar hallazgos de forma clara para apoyar decisiones informadas y responsables.

Agradezco la oportunidad de aportar mi capacidad analítica al equipo del banco.

Cordialmente,`,
  },
};

export const COVER_LETTER_TEMPLATE_LIST = Object.entries(COVER_LETTER_TEMPLATES).map(
  ([key, value]) => ({ key: key as CoverLetterTemplateKey, ...value }),
);
