/**
 * Textos del juego.
 *
 * Dos idiomas, como en el resto de productos de Granja Óga: español
 * paraguayo por defecto y guaraní. El guaraní no es un adorno de marketing:
 * es cooficial y es la lengua de casa de buena parte del público al que va
 * dirigido esto.
 *
 * El diccionario de guaraní es parcial a propósito. Lo que no está
 * traducido y revisado cae al castellano en vez de mostrar una traducción
 * inventada, que sería peor que no traducir. Ver `gug.ts`.
 */

import { EN } from './en';
import { ES_PY } from './es-PY';
import { GUG } from './gug';

export type TranslationKey = keyof typeof ES_PY;
export type Dictionary = Partial<Record<TranslationKey, string>>;

export const LOCALES = ['es-PY', 'gug', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const DICTIONARIES: Record<Locale, Dictionary> = {
  'es-PY': ES_PY,
  gug: GUG,
  en: EN,
};

export const LOCALE_NAMES: Record<Locale, string> = {
  'es-PY': 'Castellano',
  gug: 'Guaraní',
  en: 'English',
};

/** Etiqueta `lang` del documento, para lectores de pantalla y tipografía. */
const HTML_LANG: Record<Locale, string> = {
  'es-PY': 'es-PY',
  gug: 'gn',
  en: 'en',
};

const STORAGE_KEY = 'oga-veve:idioma';

let current: Locale = 'es-PY';

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = HTML_LANG[locale];
  // Una preferencia de idioma no es un dato personal y no sale del
  // navegador. Es la única cosa que este juego recuerda de quien juega.
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Navegación privada o almacenamiento bloqueado: se juega igual.
  }
}

/** Pasa al siguiente idioma y devuelve el que ha quedado activo. */
export function cycleLocale(): Locale {
  const next = LOCALES[(LOCALES.indexOf(current) + 1) % LOCALES.length] ?? 'es-PY';
  setLocale(next);
  return next;
}

export function getLocale(): Locale {
  return current;
}

/**
 * Traduce una clave. Si falta en el idioma activo cae al castellano, y si
 * falta también ahí devuelve la clave: en desarrollo eso canta a la primera
 * y no deja pasar un texto olvidado.
 */
export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  const raw = DICTIONARIES[current][key] ?? ES_PY[key] ?? key;
  if (!values) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

/**
 * Elige idioma: primero lo que se eligió la última vez, después lo que dice
 * el navegador, y castellano como red de seguridad.
 */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  } catch {
    // Sin almacenamiento se sigue adelante con la detección normal.
  }

  const preferred = navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('gn') || lower.startsWith('gug')) return 'gug';
    if (lower.startsWith('en')) return 'en';
    if (lower.startsWith('es')) return 'es-PY';
  }
  return 'es-PY';
}
