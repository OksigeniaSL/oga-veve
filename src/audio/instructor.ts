/**
 * El instructor: la voz que dice qué toca hacer ahora.
 *
 * El tramo Guyrami empieza a los cuatro años y **no sabe leer**, así que todo
 * el texto del vuelo se le quitó. Lo que tiene que ocupar ese hueco es una voz
 * —«seguí la raya verde», «pará en la doble raya»—, y la buena es una persona
 * grabada por trozos, como los GPS. Eso está pendiente y necesita un locutor y
 * el repaso del jopara por una hablante nativa.
 *
 * Mientras tanto, esto.
 *
 * ── Por qué una interfaz y no una chapuza ────────────────────────────────
 *
 * Lo importante de este fichero no es la voz que trae, que es la del
 * navegador y suena a robot. Lo importante es que **el resto del juego pide
 * `decir('vuelo.rodando')` y no sabe quién contesta**. El día que existan las
 * grabaciones se escribe otra implementación de `Instructor`, se cambia una
 * línea, y nada más del juego se entera.
 *
 * Sin esta separación, la voz del navegador se habría quedado incrustada por
 * media docena de sitios y sacarla habría costado más que ponerla.
 *
 * ── La voz del navegador ─────────────────────────────────────────────────
 *
 * `speechSynthesis` está en todos los navegadores desde hace años y no
 * descarga nada: las voces las pone el sistema. La de castellano existe
 * prácticamente en todas partes; la de guaraní **no existe en ninguna**, así
 * que en guaraní esto se calla y queda el pictograma, que es lo honesto —una
 * voz castellana leyendo guaraní escrito sonaría a burla—.
 *
 * Tres cuidados que hacen falta con esta API y no son opcionales:
 *
 * - **Las voces tardan en aparecer.** El primer `getVoices()` devuelve una
 *   lista vacía en Chrome y se llena después, con un evento. Preguntarlas una
 *   sola vez al arrancar es el error clásico.
 * - **Hay que cancelar lo anterior.** Si no, las frases se encolan y el
 *   instructor sigue hablando de la calle de rodaje cuando el avión ya está
 *   en el aire.
 * - **No hablar por hablar.** Repetir la misma frase porque la fase parpadeó
 *   es peor que callarse.
 */

import { getLocale } from '../i18n';

export interface Instructor {
  /** Dice algo. `texto` ya viene traducido y listo para leer. */
  decir(texto: string): void;
  /** Se calla ahora mismo. */
  callar(): void;
  /** ¿Hay alguien que pueda hablar en el idioma de ahora? */
  readonly disponible: boolean;
}

/** Un instructor mudo. Es lo que hay en guaraní, y no pasa nada. */
export const MUDO: Instructor = {
  decir: () => {},
  callar: () => {},
  disponible: false,
};

/** El idioma que le pedimos al navegador. */
const IDIOMAS: Record<string, string | null> = {
  'es-PY': 'es',
  en: 'en',
  // No existe voz de guaraní en ningún sistema, y una voz castellana leyendo
  // guaraní escrito sonaría a burla. Aquí manda el pictograma.
  gug: null,
};

export class VozDelNavegador implements Instructor {
  private voz: SpeechSynthesisVoice | null = null;
  private ultima = '';
  private desdeUltima = 0;

  constructor() {
    if (typeof speechSynthesis === 'undefined') return;
    this.buscarVoz();
    // Las voces llegan tarde: en Chrome la primera llamada devuelve una lista
    // vacía y se llena luego. Preguntar una sola vez al arrancar es el error
    // clásico de esta API.
    speechSynthesis.addEventListener('voiceschanged', () => this.buscarVoz());
  }

  private buscarVoz(): void {
    const quiero = IDIOMAS[getLocale()];
    if (!quiero) {
      this.voz = null;
      return;
    }
    const voces = speechSynthesis.getVoices();
    // La del país primero —es-PY, es-AR, es-MX— y si no, cualquier castellana.
    this.voz =
      voces.find((v) => v.lang.toLowerCase().startsWith(getLocale().toLowerCase())) ??
      voces.find((v) => v.lang.toLowerCase().startsWith(`${quiero}-`)) ??
      voces.find((v) => v.lang.toLowerCase().startsWith(quiero)) ??
      null;
  }

  get disponible(): boolean {
    return this.voz !== null;
  }

  decir(texto: string): void {
    if (!this.voz || !texto) return;
    // No repetir lo mismo dos veces seguidas en menos de diez segundos: la
    // fase puede parpadear y un instructor que se repite se ignora.
    const ahora = performance.now();
    if (texto === this.ultima && ahora - this.desdeUltima < 10000) return;
    this.ultima = texto;
    this.desdeUltima = ahora;

    // Cancelar lo anterior. Sin esto las frases se encolan y el instructor
    // sigue hablando de la calle de rodaje con el avión ya en el aire.
    speechSynthesis.cancel();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.voice = this.voz;
    frase.lang = this.voz.lang;
    // Un poco más despacio y un poco más agudo que por defecto: se entiende
    // mejor y suena menos a contestador.
    frase.rate = 0.95;
    frase.pitch = 1.05;
    speechSynthesis.speak(frase);
  }

  callar(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.ultima = '';
  }
}

/**
 * El instructor que toque.
 *
 * Hoy solo hay uno. Mañana, cuando existan las grabaciones, aquí se elegirá
 * entre la voz grabada y la del navegador —y la del navegador seguirá siendo
 * la red de seguridad para los idiomas o las frases que falten por grabar—.
 */
export function elegirInstructor(): Instructor {
  if (typeof speechSynthesis === 'undefined') return MUDO;
  return new VozDelNavegador();
}
