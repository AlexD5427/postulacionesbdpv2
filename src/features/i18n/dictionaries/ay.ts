import type { Dictionary } from './es';

/**
 * Aymara (Aymar Aru) dictionary.
 *
 * Covers the highest-visibility UI. Keys not present here fall back to Spanish
 * (see the resolver in ../dictionary.ts). Native-speaker review is recommended
 * before production; full coverage is mandatory for all new strings.
 */
export const ay: Partial<Dictionary> = {
  'brand.name': 'BDP Talento',
  'brand.tagline': 'BDP S.A.M.-na irnaqam',

  'preloader.title': 'BDP S.A.M.-na irnaqam',
  'preloader.subtitle': 'Bolivia markan nayrar sarayir ch’amani jaqinaka',

  'action.continue': 'Sarantam',
  'action.back': 'Kutt’am',
  'action.close': 'Jist’antam',
  'action.open': 'Jist’aram',
  'action.viewAll': 'Taqpach uñjam',
  'action.search': 'Thaqham',
  'action.apply': 'Mayim',
  'action.explore': 'Uñakipam',
  'action.learnMore': 'Juk’amp yatiqam',
  'action.getStarted': 'Qalltam',
  'action.skip': 'Jaytam',

  'nav.jobs': 'Irnaqäwinaka',
  'nav.help': 'Yanapt’a',
  'nav.accessibility': 'Accesibilidad',
  'nav.login': 'Mantam',
  'nav.register': 'Cuenta lurañ',
  'nav.home': 'Qalltäwi',
  'nav.menu': 'Menú',
  'nav.openMenu': 'Menú jist’aram',
  'nav.closeMenu': 'Menú jist’antam',
  'nav.primary': 'Jach’a sarawi',

  'dock.home': 'Qalltäwi',
  'dock.jobs': 'Irnaqäwinaka',
  'dock.help': 'Yanapt’a',
  'dock.accessibility': 'Accesibilidad',
  'dock.search': 'Thaqham (⌘K)',
  'dock.account': 'Nayan cheqäwi',
  'dock.label': 'Jank’aki mantañanaka',
  'dock.position.moveTop': 'Dock patxaru apañ',
  'dock.position.moveBottom': 'Dock aynachar apañ',

  'lang.change': 'Aru turkañ',
  'lang.label': 'Aru',
  'lang.es': 'Kastilla aru',
  'lang.en': 'Inlish aru',
  'lang.qu': 'Qhichwa',
  'lang.ay': 'Aymar Aru',

  'home.hero.badge': 'Banco de Desarrollo Productivo BDP S.A.M.',
  'home.hero.title.a': 'Irnaqäwim uñstayam',
  'home.hero.title.b': 'nayrar sarayasa',
  'home.hero.title.c': 'Bolivian.',
  'home.hero.subtitle':
    'Irnaqäwinaka uñakipam, profesional perfilma lurañ, ukat jasaki, taqiniru mantañampi, imantatampi mayim. Kunapachati wakisini ukhax jumampi arstʼasiñäni.',
  'home.hero.ctaPrimary': 'Irnaqäwinaka uñjam',
  'home.hero.ctaSecondary': 'Cuenta lurañ',
  'home.hero.trust.free': 'Mayiñataki jani qullqini',
  'home.hero.trust.a11y': 'Taqi jaqitaki lurata',
  'home.hero.trust.privacy': 'Imantawi nayraqata',
  'home.hero.scroll': 'Aynachar saram',

  'home.featured.title': 'Uñstir irnaqäwinaka',
  'home.featured.subtitle': 'Jumataki ajllita jist’arat irnaqäwinaka.',

  'home.how.title': 'Kunjams mayiyta',
  'home.how.subtitle': 'Pusi jasa thakhinaka.',
  'home.how.step': 'Thakhi',

  'home.cta.title': '¿Qhipa thakhi lurañ muntati?',
  'home.cta.subtitle': 'Cuentama lurañ, BDP S.A.M. irnaqäwinakar mayim.',
  'home.cta.primary': 'Cuenta lurañ',
  'home.cta.secondary': 'Irnaqäwinaka uñakipam',

  'footer.col.talent': 'Ch’amani',
  'footer.col.resources': 'Yanapt’irinaka',
  'footer.col.legal': 'Kamachi',
  'footer.link.jobs': 'Irnaqäwinaka',
  'footer.link.register': 'Cuenta lurañ',
  'footer.link.login': 'Mantam',
  'footer.link.help': 'Yanapt’a uta',
  'footer.link.accessibility': 'Accesibilidad',
  'footer.rights': 'La Paz, Bolivia. Taqi derechonaka imantata.',

  'a11y.title': 'Accesibilidad uta',
  'a11y.open': 'Accesibilidad uta jist’aram',
  'a11y.section.text': 'Qillqan jach’äpa',
  'a11y.section.theme': 'Tema',
  'a11y.section.vision': 'Uñjañ ukat sami',
  'a11y.section.reading': 'Ullaña',
  'a11y.section.prefs': 'Ajlliñanaka',
  'a11y.contrast': 'Jach’a contraste',
  'a11y.motion': 'Unxtaña pisiyañ',
  'a11y.reading': 'Suma ullaña',
  'a11y.reset': 'Nayrïr chiqar kutiyañ',
  'a11y.tts.play': 'Aka laphi ullam',
  'a11y.tts.stop': 'Ullaña sayt’ayañ',

  'theme.label': 'Tema',
  'theme.light': 'Qhana',
  'theme.dark': 'Ch’amaka',
  'theme.system': 'Sistema',

  'cmd.placeholder': 'Irnaqäwinaka, cheqanaka jan ukax luräwinaka thaqham…',
  'cmd.empty': 'Janiw jikxatasiti.',
  'cmd.open': 'Jank’aki thaqhañ jist’aram',

  'tour.next': 'Qhipa',
  'tour.prev': 'Nayra',
  'tour.done': 'Waliki',
  'tour.skip': 'Yatichaw jaytam',
  'tour.step': 'uka',

  'util.backToTop': 'Amstar kutt’am',
  'util.newBadge': 'Machaqa',
};
