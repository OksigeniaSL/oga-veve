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

import { ES_PY } from './es-PY';
import { GUG } from './gug';

export type TranslationKey = keyof typeof ES_PY;
export type Dictionary = Partial<Record<TranslationKey, string>>;

export const LOCALES = ['es-PY', 'gug'] as const;
export type Locale = (typeof LOCALES)[number];

const DICTIONARIES: Record<Locale, Dictionary> = {
  'es-PY': ES_PY,
  gug: GUG,
};

export const LOCALE_NAMES: Record<Locale, string> = {
  'es-PY': 'Castellano',
  gug: 'Guaraní',
};

let current: Locale = 'es-PY';

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale === 'gug' ? 'gn' : 'es-PY';
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

/** Elige idioma según el navegador, con castellano como red de seguridad. */
export function detectLocale(): Locale {
  const preferred = navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('gn') || lower.startsWith('gug')) return 'gug';
  }
  return 'es-PY';
}
