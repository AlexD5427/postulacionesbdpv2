import type { Dictionary } from './es';

/**
 * Quechua (Runa Simi — Bolivian Southern Quechua) dictionary.
 *
 * Covers the highest-visibility UI. Keys not present here fall back to Spanish
 * (see the resolver in ../dictionary.ts). Native-speaker review is recommended
 * before production; full coverage is mandatory for all new strings.
 */
export const qu: Partial<Dictionary> = {
  'brand.name': 'BDP Talento',
  'brand.tagline': 'BDP S.A.M.-pi llamk’ay',

  'preloader.title': 'BDP S.A.M.-pi llamk’ay',
  'preloader.subtitle': 'Bolivia llaqtaq wiñayninta kallpachaq atiyniyuq runakuna',

  'action.continue': 'Qatiy',
  'action.back': 'Kutiy',
  'action.close': 'Wisq’ay',
  'action.open': 'Kichay',
  'action.viewAll': 'Llapanta qhaway',
  'action.search': 'Mask’ay',
  'action.apply': 'Mañakuy',
  'action.explore': 'Watukuy',
  'action.learnMore': 'Aswan yachay',
  'action.getStarted': 'Qallariy',
  'action.skip': 'Saqiy',

  'nav.jobs': 'Llamk’aykuna',
  'nav.help': 'Yanapay',
  'nav.accessibility': 'Accesibilidad',
  'nav.login': 'Yaykuy',
  'nav.register': 'Cuentata ruway',
  'nav.home': 'Qallariy',
  'nav.menu': 'Menú',
  'nav.openMenu': 'Menú kichay',
  'nav.closeMenu': 'Menú wisq’ay',
  'nav.primary': 'Umalliq puriy',

  'dock.home': 'Qallariy',
  'dock.jobs': 'Llamk’aykuna',
  'dock.help': 'Yanapay',
  'dock.accessibility': 'Accesibilidad',
  'dock.search': 'Mask’ay (⌘K)',
  'dock.account': 'Ñuqaq kitiy',
  'dock.label': 'Utqay yaykunakuna',
  'dock.position.moveTop': 'Dockta wichaman apay',
  'dock.position.moveBottom': 'Dockta uraman apay',

  'lang.change': 'Simita t’ijray',
  'lang.label': 'Simi',
  'lang.es': 'Kastilla simi',
  'lang.en': 'Inlish simi',
  'lang.qu': 'Runa Simi',
  'lang.ay': 'Aymara',

  'home.hero.badge': 'Banco de Desarrollo Productivo BDP S.A.M.',
  'home.hero.title.a': 'Llamk’ayniykita wiñachiy',
  'home.hero.title.b': 'wiñayta kallpachaspa',
  'home.hero.title.c': 'Boliviaq.',
  'home.hero.subtitle':
    'Llamk’aykunata watukuy, profesional perfilniykita ruway, hinaspa hawalla, chayay atiywan, waqaychasqa ima mañakuy. Chayamuptin qamwan rimasaqku.',
  'home.hero.ctaPrimary': 'Llamk’aykunata qhaway',
  'home.hero.ctaSecondary': 'Cuentata ruway',
  'home.hero.trust.free': 'Mañakuy mana qullqiyuq',
  'home.hero.trust.a11y': 'Llapan runapaq ruwasqa',
  'home.hero.trust.privacy': 'Pakayta ñawpaqta',
  'home.hero.scroll': 'Uraykuy',

  'home.featured.title': 'Sut’i llamk’aykuna',
  'home.featured.subtitle': 'Qampaq akllasqa kicharisqa llamk’aykuna.',

  'home.how.title': 'Imaynatas mañakunki',
  'home.how.subtitle': 'Tawa hawalla thaskiykuna.',
  'home.how.step': 'Thaskiy',

  'home.cta.title': '¿Qatiq thaskiyta ruwayta munankichu?',
  'home.cta.subtitle': 'Cuentaykita ruway, BDP S.A.M. llamk’aykunaman mañakuy.',
  'home.cta.primary': 'Cuentata ruway',
  'home.cta.secondary': 'Llamk’aykunata watukuy',

  'footer.col.talent': 'Atiyniyuq',
  'footer.col.resources': 'Yanapakuq',
  'footer.col.legal': 'Kamachiy',
  'footer.link.jobs': 'Llamk’aykuna',
  'footer.link.register': 'Cuentata ruway',
  'footer.link.login': 'Yaykuy',
  'footer.link.help': 'Yanapay wasi',
  'footer.link.accessibility': 'Accesibilidad',
  'footer.rights': 'La Paz, Bolivia. Llapan derechokuna waqaychasqa.',

  'a11y.title': 'Accesibilidad wasi',
  'a11y.open': 'Accesibilidad wasita kichay',
  'a11y.section.text': 'Qillqaq chhikan',
  'a11y.section.theme': 'Tema',
  'a11y.section.vision': 'Qhaway hinaspa llimphi',
  'a11y.section.reading': 'Ñawiriy',
  'a11y.section.prefs': 'Munaykuna',
  'a11y.contrast': 'Hatun contraste',
  'a11y.motion': 'Kuyuyta pisiyachiy',
  'a11y.reading': 'Sumaq ñawiriy',
  'a11y.reset': 'Ñawpaq kaqman kutichiy',
  'a11y.tts.play': 'Kay p’anqata ñawiriy',
  'a11y.tts.stop': 'Ñawiriyta sayachiy',

  'theme.label': 'Tema',
  'theme.light': 'K’anchay',
  'theme.dark': 'Laqha',
  'theme.system': 'Sistema',

  'cmd.placeholder': 'Llamk’aykunata, kitikun­ata utaq ruwaykunata mask’ay…',
  'cmd.empty': 'Mana tarikunchu.',
  'cmd.open': 'Utqay mask’ayta kichay',

  'tour.next': 'Qatiq',
  'tour.prev': 'Ñawpaq',
  'tour.done': 'Allinmi',
  'tour.skip': 'Yachachiyta saqiy',
  'tour.step': 'manta',

  'util.backToTop': 'Wichaman kutiy',
  'util.newBadge': 'Musuq',
};
