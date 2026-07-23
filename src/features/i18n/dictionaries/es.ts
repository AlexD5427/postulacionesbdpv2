/**
 * Spanish (Latin America) dictionary — the SOURCE OF TRUTH.
 *
 * The keys defined here form the `TranslationKey` union. Every other locale is
 * a `Partial` of this shape, so missing keys fall back to Spanish and TypeScript
 * flags typos. Keep keys grouped by area and dot-namespaced.
 */
export const es = {
  // --- Brand ---------------------------------------------------------------
  'brand.name': 'BDP Talento',
  'brand.legal': 'Banco de Desarrollo Productivo BDP S.A.M.',
  'brand.tagline': 'Trabaja en BDP S.A.M.',

  // --- Preloader -----------------------------------------------------------
  'preloader.title': 'Trabaja en BDP S.A.M.',
  'preloader.subtitle': 'Talento que impulsa el desarrollo productivo de Bolivia',

  // --- Common actions ------------------------------------------------------
  'action.continue': 'Continuar',
  'action.back': 'Volver',
  'action.close': 'Cerrar',
  'action.open': 'Abrir',
  'action.viewAll': 'Ver todas',
  'action.search': 'Buscar',
  'action.apply': 'Postular',
  'action.explore': 'Explorar',
  'action.learnMore': 'Conocer más',
  'action.getStarted': 'Comenzar',
  'action.skip': 'Saltar',

  // --- Navigation ----------------------------------------------------------
  'nav.jobs': 'Convocatorias',
  'nav.help': 'Ayuda',
  'nav.accessibility': 'Accesibilidad',
  'nav.login': 'Ingresar',
  'nav.register': 'Crear cuenta',
  'nav.home': 'Inicio',
  'nav.menu': 'Menú',
  'nav.openMenu': 'Abrir menú',
  'nav.closeMenu': 'Cerrar menú',
  'nav.primary': 'Navegación principal',
  'nav.logout': 'Cerrar sesión',

  // --- Candidate navigation ------------------------------------------------
  'candnav.section': 'Mi espacio',
  'candnav.home': 'Inicio',
  'candnav.profile': 'Perfil',
  'candnav.cv': 'CV digital',
  'candnav.letters': 'Cartas',
  'candnav.applications': 'Postulaciones',
  'candnav.assessments': 'Evaluaciones',
  'candnav.notifications': 'Notificaciones',
  'candnav.settings': 'Ajustes',

  // --- Dock ----------------------------------------------------------------
  'dock.home': 'Inicio',
  'dock.jobs': 'Convocatorias',
  'dock.help': 'Ayuda',
  'dock.accessibility': 'Accesibilidad',
  'dock.search': 'Buscar (⌘K)',
  'dock.account': 'Mi espacio',
  'dock.label': 'Accesos rápidos',
  'dock.position.moveTop': 'Mover el dock arriba',
  'dock.position.moveBottom': 'Mover el dock abajo',
  'dock.position.label': 'Posición del dock',
  'dock.position.bottom': 'Abajo',
  'dock.position.top': 'Arriba',

  // --- Language switcher ---------------------------------------------------
  'lang.change': 'Cambiar idioma',
  'lang.label': 'Idioma',
  'lang.es': 'Español',
  'lang.en': 'Inglés',
  'lang.qu': 'Quechua',
  'lang.ay': 'Aymara',

  // --- Landing: hero -------------------------------------------------------
  'home.hero.badge': 'Banco de Desarrollo Productivo BDP S.A.M.',
  'home.hero.title.a': 'Construye tu carrera',
  'home.hero.title.b': 'impulsando el desarrollo',
  'home.hero.title.c': 'de Bolivia.',
  'home.hero.subtitle':
    'Explora nuestras convocatorias, crea tu perfil profesional y postula de forma sencilla, accesible y segura. Nos pondremos en contacto contigo cuando corresponda.',
  'home.hero.ctaPrimary': 'Ver convocatorias',
  'home.hero.ctaSecondary': 'Crear cuenta de candidato',
  'home.hero.trust.free': 'Sin costo para postular',
  'home.hero.trust.a11y': 'Diseñado para todas las personas',
  'home.hero.trust.privacy': 'Privacidad primero',
  'home.hero.scroll': 'Desliza',

  // --- Landing: stats ------------------------------------------------------
  'home.stats.title': 'Un banco que crece con su gente',
  'home.stats.subtitle':
    'Somos una institución pública que impulsa el desarrollo productivo del país. Estas son oportunidades reales de crecimiento.',
  'home.stats.areas': 'Áreas profesionales',
  'home.stats.cities': 'Ciudades en Bolivia',
  'home.stats.commitment': 'Compromiso con la accesibilidad',

  // --- Landing: offer showcase --------------------------------------------
  'home.offer.title': 'Todo tu proceso, en una sola plataforma',
  'home.offer.subtitle': 'Del registro a la postulación, acompañado en cada paso.',
  'home.offer.profile.title': 'Perfil profesional',
  'home.offer.profile.body': 'Construye una vez tu perfil y reutilízalo en cada convocatoria.',
  'home.offer.cv.title': 'CV digital',
  'home.offer.cv.body': 'Un currículum estructurado, exportable e impecable.',
  'home.offer.jobs.title': 'Convocatorias vivas',
  'home.offer.jobs.body': 'Explora oportunidades que se actualizan en tiempo real.',
  'home.offer.assessments.title': 'Evaluaciones justas',
  'home.offer.assessments.body': 'Demuestra tu talento con evaluaciones claras y accesibles.',

  // --- Landing: how to apply ----------------------------------------------
  'home.how.title': 'Cómo postular',
  'home.how.subtitle': 'Cuatro pasos simples, sin complicaciones.',
  'home.how.step': 'Paso',
  'home.how.s1.title': 'Crea tu cuenta',
  'home.how.s1.body': 'Regístrate con tu correo en menos de un minuto.',
  'home.how.s2.title': 'Completa tu CV',
  'home.how.s2.body': 'Construye tu perfil y CV digital una sola vez.',
  'home.how.s3.title': 'Postula',
  'home.how.s3.body': 'Aplica a las convocatorias que te interesen.',
  'home.how.s4.title': 'Te contactamos',
  'home.how.s4.body': 'El banco se comunicará contigo cuando corresponda.',

  // --- Landing: featured jobs ---------------------------------------------
  'home.featured.title': 'Convocatorias destacadas',
  'home.featured.subtitle': 'Oportunidades abiertas seleccionadas para ti.',

  // --- Landing: skills marquee --------------------------------------------
  'home.marquee.title': 'Talento que buscamos',

  // --- Landing: testimonials ----------------------------------------------
  'home.voices.title': 'Voces del BDP',
  'home.voices.subtitle': 'Personas que impulsan el desarrollo productivo, cada día.',
  'home.voices.q1':
    'Postular fue clarísimo y accesible. Ajusté el tamaño del texto y todo se sintió pensado para mí.',
  'home.voices.q2':
    'Me encantó poder reutilizar mi CV digital en varias convocatorias sin volver a empezar.',
  'home.voices.q3':
    'La plataforma se ve moderna y transparente. Nunca dudé de en qué parte del proceso estaba.',
  'home.voices.r1': 'Analista de Riesgos',
  'home.voices.r2': 'Oficial de Créditos',
  'home.voices.r3': 'Especialista en Tecnología',

  // --- Landing: commitments ------------------------------------------------
  'home.commit.a11y.title': 'Compromiso con la accesibilidad',
  'home.commit.a11y.body':
    'Cumplimos pautas WCAG 2.2 AA. Ajusta tamaño de texto, contraste, movimiento y más desde el centro de accesibilidad, disponible en todo momento.',
  'home.commit.privacy.title': 'Privacidad primero',
  'home.commit.privacy.body':
    'Solo recopilamos la información necesaria. Tú controlas tus datos y puedes solicitar su exportación o eliminación cuando quieras.',
  'home.commit.support.title': 'Estamos para ayudarte',
  'home.commit.support.body':
    '¿Necesitas apoyo o una adaptación para postular? Escríbenos y te acompañamos.',

  // --- Landing: CTA --------------------------------------------------------
  'home.cta.title': '¿List@ para dar el siguiente paso?',
  'home.cta.subtitle': 'Crea tu cuenta y postula a las convocatorias del BDP S.A.M.',
  'home.cta.primary': 'Crear cuenta',
  'home.cta.secondary': 'Explorar convocatorias',

  // --- Footer --------------------------------------------------------------
  'footer.about':
    'Portal de talento del Banco de Desarrollo Productivo BDP S.A.M. Impulsamos el desarrollo productivo de Bolivia con procesos de selección accesibles y transparentes.',
  'footer.col.talent': 'Talento',
  'footer.col.resources': 'Recursos',
  'footer.col.legal': 'Legal',
  'footer.link.jobs': 'Convocatorias',
  'footer.link.register': 'Crear cuenta',
  'footer.link.login': 'Ingresar',
  'footer.link.help': 'Centro de ayuda',
  'footer.link.accessibility': 'Accesibilidad',
  'footer.link.privacy': 'Privacidad',
  'footer.link.terms': 'Términos',
  'footer.rights': 'La Paz, Bolivia. Todos los derechos reservados.',
  'footer.nopay': 'Nunca te pediremos pagos para postular. Cuida tu información.',

  // --- Accessibility center ------------------------------------------------
  'a11y.title': 'Centro de accesibilidad',
  'a11y.subtitle':
    'Ajusta la interfaz a tus necesidades. Tus preferencias se guardan en este dispositivo.',
  'a11y.open': 'Abrir centro de accesibilidad',
  'a11y.section.text': 'Tamaño del texto',
  'a11y.section.theme': 'Tema',
  'a11y.section.vision': 'Visión y color',
  'a11y.section.reading': 'Lectura',
  'a11y.section.prefs': 'Preferencias',
  'a11y.section.interface': 'Interfaz',
  'a11y.font.increase': 'Aumentar tamaño del texto',
  'a11y.font.decrease': 'Reducir tamaño del texto',
  'a11y.font.reset': 'Restaurar tamaño del texto',
  'a11y.contrast': 'Alto contraste',
  'a11y.contrast.desc': 'Aumenta el contraste de texto y bordes.',
  'a11y.motion': 'Reducir movimiento',
  'a11y.motion.desc': 'Minimiza animaciones y transiciones.',
  'a11y.transparency': 'Reducir transparencia',
  'a11y.transparency.desc': 'Vuelve opacas las superficies de vidrio.',
  'a11y.reading': 'Modo lectura cómoda',
  'a11y.reading.desc': 'Mayor interlineado y ancho de línea limitado.',
  'a11y.links': 'Resaltar enlaces y botones',
  'a11y.focus': 'Foco reforzado',
  'a11y.focus.desc': 'Indicador de foco más visible al navegar con teclado.',
  'a11y.colorblind': 'Filtro para daltonismo',
  'a11y.colorblind.desc': 'Compensa la percepción del color en pantalla.',
  'a11y.colorblind.none': 'Ninguno',
  'a11y.colorblind.protanopia': 'Protanopia (rojo)',
  'a11y.colorblind.deuteranopia': 'Deuteranopia (verde)',
  'a11y.colorblind.tritanopia': 'Tritanopia (azul)',
  'a11y.dyslexia': 'Fuente legible',
  'a11y.dyslexia.desc': 'Tipografía y espaciado más amables para la lectura.',
  'a11y.ruler': 'Regla de lectura',
  'a11y.ruler.desc': 'Una banda que sigue tu cursor para no perder la línea.',
  'a11y.cursor': 'Cursor grande',
  'a11y.cursor.desc': 'Aumenta el tamaño del puntero.',
  'a11y.tts': 'Lectura en voz alta',
  'a11y.tts.desc': 'Escucha el contenido de la página (texto a voz).',
  'a11y.tts.play': 'Leer esta página',
  'a11y.tts.stop': 'Detener lectura',
  'a11y.tts.unsupported': 'Tu navegador no admite la lectura en voz alta.',
  'a11y.reset': 'Restaurar valores predeterminados',

  // --- Auth (shell) --------------------------------------------------------
  'auth.aside.title': 'Trabaja en BDP S.A.M.',
  'auth.aside.subtitle': 'Una sola cuenta para tu perfil, tu CV y tus postulaciones.',
  'auth.aside.p1': 'Perfil y CV reutilizables en cada convocatoria',
  'auth.aside.p2': 'Proceso accesible y transparente',
  'auth.aside.p3': 'Tus datos siempre bajo tu control',
  'auth.backToJobs': 'Ver convocatorias',

  // --- Theme ---------------------------------------------------------------
  'theme.label': 'Tema',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',

  // --- Command palette -----------------------------------------------------
  'cmd.placeholder': 'Buscar convocatorias, secciones o acciones…',
  'cmd.empty': 'Sin resultados.',
  'cmd.group.nav': 'Navegación',
  'cmd.group.jobs': 'Convocatorias',
  'cmd.group.actions': 'Acciones',
  'cmd.hint': 'Consejo: abre esto con ⌘K / Ctrl+K',
  'cmd.open': 'Abrir buscador rápido',

  // --- Onboarding tour -----------------------------------------------------
  'tour.next': 'Siguiente',
  'tour.prev': 'Anterior',
  'tour.done': 'Entendido',
  'tour.skip': 'Saltar guía',
  'tour.step': 'de',
  'tour.dock.title': 'Tu dock de accesos rápidos',
  'tour.dock.body':
    'Navega desde aquí a cualquier parte del portal. El logo del BDP te lleva al inicio; puedes moverlo arriba desde Accesibilidad.',
  'tour.search.title': 'Busca al instante',
  'tour.search.body': 'Abre el buscador con ⌘K (o Ctrl+K) para saltar a convocatorias y secciones.',
  'tour.lang.title': 'Cuatro idiomas',
  'tour.lang.body': 'Cambia entre español, inglés, quechua y aymara cuando quieras.',
  'tour.a11y.title': 'Accesibilidad siempre a mano',
  'tour.a11y.body':
    'Ajusta tamaño de texto, contraste, color, lectura en voz alta y mucho más desde este botón.',

  // --- Jobs (recently viewed) ---------------------------------------------
  'jobs.recent.title': 'Vistas recientemente',
  'jobs.recent.clear': 'Limpiar',

  // --- Misc / utility ------------------------------------------------------
  'util.backToTop': 'Volver arriba',
  'util.newBadge': 'Nuevo',
} as const;

export type TranslationKey = keyof typeof es;
/** Values are plain strings; other locales provide a Partial of these keys. */
export type Dictionary = Record<TranslationKey, string>;
