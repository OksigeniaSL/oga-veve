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

import { getLocale } from "../i18n";
import { seguirLaVoz, vozPermitida } from "./voz";
import { chasquidoDeRadio } from "./radio";
import { BOCA, type Urgencia } from "./boca";

export interface Instructor {
  /**
   * Dice algo. `texto` ya viene traducido y listo para leer.
   *
   * Y `clave`, cuando se sabe, es la del diccionario: `vuelo.rodando`. La voz
   * del navegador no la necesita —lee el texto— pero **la voz grabada busca
   * por clave**, porque los ficheros se llaman por clave y no por texto. Ver
   * `banco-de-voz.ts`.
   *
   * Va opcional a propósito: hay media docena de frases que se componen en
   * caliente y no tienen una clave sola. Esas las dice el navegador, como
   * hasta ahora, en vez de obligar a inventarles un nombre.
   */
  decir(texto: string, clave?: string, urgencia?: Urgencia): void;
  /** Se calla ahora mismo. */
  callar(): void;
  /** ¿Hay alguien que pueda hablar en el idioma de ahora? */
  readonly disponible: boolean;
  /**
   * ¿Está diciendo algo en este instante?
   *
   * Lo pregunta la radio del otro avión antes de abrir la boca: si hablan a
   * la vez, la voz que se pierde es la que enseñaba. Ver `flight/radio.ts`.
   */
  readonly hablando: boolean;
}

/** Un instructor mudo. Es lo que hay en guaraní, y no pasa nada. */
export const MUDO: Instructor = {
  decir: (_texto?: string, _clave?: string, _urgencia?: Urgencia) => {},
  callar: () => {},
  disponible: false,
  hablando: false,
};

/** El idioma que le pedimos al navegador. */
const IDIOMAS: Record<string, string | null> = {
  "es-PY": "es",
  en: "en",
  // No existe voz de guaraní en ningún sistema, y una voz castellana leyendo
  // guaraní escrito sonaría a burla. Aquí manda el pictograma.
  gug: null,
};

/**
 * Qué acento se prefiere para cada idioma, del mejor al peor.
 *
 * No es un capricho: el juego es paraguayo, y una voz de España diciéndole
 * «seguí la raya verde» a un chico de Asunción suena a documental. Cuando el
 * sistema tiene varias castellanas, la americana va primero —«es-419» es el
 * código del castellano de América y es lo que publica espeak— y la de España
 * queda de última red de seguridad.
 */
const ACENTOS: Record<string, string[]> = {
  "es-PY": [
    "es-py",
    "es-419",
    "es-ar",
    "es-uy",
    "es-bo",
    "es-mx",
    "es-us",
    "es",
  ],
  en: ["en-us", "en-gb", "en"],
};

/**
 * La mejor voz de las que haya, o ninguna.
 *
 * Está aparte de la clase, y sin tocar `speechSynthesis`, porque **es la
 * única parte de esto que se puede comprobar**: lo demás es el navegador.
 *
 * ## Por qué no vale con coger la primera que case
 *
 * Firefox en Linux publica **trece mil trescientas voces**: espeak-ng
 * multiplica cada idioma por cada variante —«Spanish (Spain)+Nguyen»,
 * «Spanish (Latin America)+Robosoft2»— y las sirve en un orden cualquiera.
 * Coger la primera castellana es coger una al azar, y las variantes suenan
 * bastante peor que la voz base, que es la que está afinada. Chrome tiene el
 * problema contrario —diecinueve voces y ninguna local— y ahí lo que importa
 * es el acento.
 *
 * Así que se puntúa: primero el acento, y a igualdad de acento, la voz base
 * antes que una variante y la que el sistema marque por defecto antes que el
 * resto.
 */
export function elegirVoz(
  voces: readonly SpeechSynthesisVoice[],
  locale: string,
  /**
   * Las voces que ya están cogidas, si hay alguna.
   *
   * Las usan **la torre y el otro avión de la frecuencia**: cada uno tiene que
   * sonar a otra persona, o la radio es el instructor hablando solo. Se
   * penalizan en vez de descartarse porque en un sistema con una única voz
   * castellana es mejor repetirla que callarse.
   *
   * Era una sola y ahora son una lista, y eso arregla un fallo que se oía: con
   * tres voces y una sola plaza de «cogida», la torre esquivaba al instructor
   * y el otro avión también, así que **la torre y el otro avión acababan
   * siendo la misma voz**. Quien juega lo dijo al revés y con razón: «la única
   * voz es prácticamente toda de la instructora».
   */
  cogidas: readonly (string | null)[] = [],
): SpeechSynthesisVoice | null {
  const quiero = IDIOMAS[locale];
  if (!quiero) return null;
  const orden = ACENTOS[locale] ?? [locale.toLowerCase(), quiero];

  let mejor: SpeechSynthesisVoice | null = null;
  let mejorNota = 0;
  for (const voz of voces) {
    // Hay sistemas que devuelven «es_ES» en vez de «es-ES».
    const lang = voz.lang.toLowerCase().replace(/_/g, "-");
    let nota = 0;
    for (let i = 0; i < orden.length; i++) {
      const quiza = orden[i]!;
      if (lang === quiza || lang.startsWith(`${quiza}-`)) {
        // Diez por escalón de acento: siempre pesa más que lo de abajo, y así
        // una voz base de España nunca le gana el puesto a una americana.
        nota = (orden.length - i) * 10;
        break;
      }
    }
    // Y si el idioma vale pero el acento no estaba en la lista, entra igual:
    // una voz rara del idioma correcto es infinitamente mejor que el silencio.
    if (nota === 0 && !lang.startsWith(quiero)) continue;
    if (nota === 0) nota = 1;

    if (!voz.name.includes("+")) nota += 5;
    if (voz.default) nota += 2;
    /*
     * Y la que ya está cogida baja **un escalón entero de acento y algo más**,
     * que es lo justo para que gane cualquier otra del idioma. Menos que eso
     * no cambiaba nada: el escalón vale diez, así que una penalización de
     * cuatro dejaba ganando a la misma voz otra vez.
     *
     * Y no se descarta del todo a propósito: en un sistema con una sola voz
     * castellana es mejor repetirla que dejar mudo al otro avión.
     *
     * **Y pesa más la primera de la lista que la última.** Cuando hay menos
     * voces que bocas alguien tiene que repetir, y quien no puede repetir es
     * el instructor: es la que se oye todo el rato y la que tiene que ser
     * reconocible —lo dice `docs/voces/LEEME.md`—. Así que el orden en que se
     * pasan las cogidas es el orden de quién manda, y la penalización crece
     * hacia el principio de la lista.
     *
     * Medido en Chrome, que publica dos voces castellanas para tres bocas: sin
     * el peso, la tercera volvía a coger la del instructor; con él, se va con
     * la torre, que habla poco y además lleva chasquido de radio, que ya la
     * separa. Con una sola cogida la cuenta da los mismos doce de siempre.
     */
    for (let i = 0; i < cogidas.length; i++)
      if (cogidas[i] && voz.name === cogidas[i])
        nota -= 12 * (cogidas.length - i);

    if (nota > mejorNota) {
      mejorNota = nota;
      mejor = voz;
    }
  }
  return mejor;
}

/** Cómo suena una voz, y de cuál se tiene que diferenciar. */
export interface Timbre {
  readonly rate: number;
  readonly pitch: number;
  /** Los nombres de las voces que ya están cogidas por otros. Ver `elegirVoz`. */
  readonly cogidas?: () => readonly (string | null)[];
  /**
   * Si esta voz llega **por radio**.
   *
   * Le pone el chasquido del pulsador delante y el de la portadora detrás. No
   * es un adorno: es lo único que puede sonar a radio mientras hable el
   * sintetizador del navegador, que no pasa por Web Audio y no se puede
   * filtrar. Y es lo que un niño reconoce sin que se lo expliquen. Ver
   * `audio/radio.ts`.
   */
  readonly radio?: boolean;
}

/**
 * El instructor: un poco más despacio y un poco más agudo que por defecto. Se
 * entiende mejor y suena menos a contestador.
 */
export const TIMBRE_INSTRUCTOR: Timbre = { rate: 0.95, pitch: 1.05 };

export class VozDelNavegador implements Instructor {
  private voz: SpeechSynthesisVoice | null = null;
  private ultima = "";
  private desdeUltima = 0;
  private readonly timbre: Timbre;

  constructor(timbre: Timbre = TIMBRE_INSTRUCTOR) {
    this.timbre = timbre;
    if (typeof speechSynthesis === "undefined") return;
    this.buscarVoz();
    // Las voces llegan tarde: en Chrome la primera llamada devuelve una lista
    // vacía y se llena luego. Preguntar una sola vez al arrancar es el error
    // clásico de esta API.
    speechSynthesis.addEventListener("voiceschanged", () => this.buscarVoz());
  }

  private buscarVoz(): void {
    this.voz = elegirVoz(
      speechSynthesis.getVoices(),
      getLocale(),
      this.timbre.cogidas?.() ?? [],
    );
  }

  /** Con qué voz habla ahora mismo, si con alguna. */
  get nombreDeVoz(): string | null {
    return this.voz?.name ?? null;
  }

  /** Si está diciendo algo en este instante. Lo mira la radio para callarse. */
  get hablando(): boolean {
    try {
      return globalThis.speechSynthesis?.speaking ?? false;
    } catch {
      return false;
    }
  }

  get disponible(): boolean {
    return this.voz !== null;
  }

  decir(texto: string, clave?: string, urgencia: Urgencia = "normal"): void {
    if (!this.voz || !texto) return;
    /*
     * **Y el mudo del juego también le calla a él.**
     *
     * El botón del altavoz llamaba a `permitirVoz`, que solo afecta a los
     * avisos de cabina de `voz.ts`; el instructor habla por su cuenta y
     * `speechSynthesis` no pasa por el mezclador. Resultado: juego en mudo,
     * altavoz tachado en pantalla, y una voz siguiendo la lección. Que es
     * exactamente lo que promete que no pasa el comentario del botón.
     */
    if (!vozPermitida()) return;
    /*
     * **Y no repetirse lo lleva la boca**, que es quien ve hablar a todos.
     *
     * Aquí había una regla propia —diez segundos, por texto y por hablante— y
     * eso deja dos agujeros: cada voz cuenta los suyos, así que la torre y el
     * instructor podían decir lo mismo seguido; y cambiar de aeronave rehace
     * este objeto y con él la cuenta, que es por lo que sonaba «arrancá el
     * motor» en cada cambio de avión. Ver `NO_REPETIR` en `boca.ts`.
     *
     * Se queda solo el caso sin clave —una frase suelta, que las hay— porque
     * ahí la boca no tiene con qué reconocerla.
     */
    const ahora = performance.now();
    if (!clave && texto === this.ultima && ahora - this.desdeUltima < 10000)
      return;
    this.ultima = texto;
    this.desdeUltima = ahora;

    /*
     * **Y se pide la palabra en vez de quitársela a quien la tenga.**
     *
     * Aquí había un `speechSynthesis.cancel()` a pelo, con el motivo escrito
     * al lado: sin él las frases se encolan y el instructor sigue hablando de
     * la calle de rodaje con el avión ya en el aire. El motivo es bueno y el
     * remedio se pasaba — cortaba **todo**, incluido lo que acababa de decir
     * el canto de cabina, que habla por el mismo sintetizador y hacía lo mismo
     * en sentido contrario.
     *
     * Ahora lo decide `audio/boca.ts`: lo urgente corta, lo demás espera una
     * plaza, y lo que espera demasiado no se dice. Que es exactamente lo que
     * ese comentario quería y no conseguía.
     */
    BOCA.pedir(
      urgencia,
      (listo) => {
        const frase = new SpeechSynthesisUtterance(texto);
        // Y la mezcla se entera: mientras habla, todo lo demás se agacha diez
        // decibelios. Ver `audio/mezcla.ts`.
        seguirLaVoz(frase);
        frase.voice = this.voz;
        frase.lang = this.voz!.lang;
        frase.rate = this.timbre.rate;
        frase.pitch = this.timbre.pitch;
        /*
         * Y si esta voz viene por radio, el pulsador.
         *
         * El de abrir va **antes de pedir la frase**, no al empezar a sonar: el
         * sintetizador tarda un par de décimas en arrancar, y ese hueco entre el
         * «clac» y la voz es exactamente el que hay en una radio de verdad entre
         * apretar y hablar.
         *
         * El de cerrar va en `end` y en `error` con seguro contra el doble
         * disparo, que es el mismo cuidado que hay en `seguirLaVoz` y por el
         * mismo motivo: el navegador dispara los dos cuando se cancela.
         */
        if (this.timbre.radio) {
          chasquidoDeRadio("abre");
          let cerrado = false;
          const cerrar = (): void => {
            if (cerrado) return;
            cerrado = true;
            chasquidoDeRadio("cierra");
          };
          frase.addEventListener("end", cerrar);
          frase.addEventListener("error", cerrar);
        }
        frase.onend = listo;
        frase.onerror = listo;
        speechSynthesis.speak(frase);
      },
      clave,
    );
  }

  callar(): void {
    BOCA.callar();
    this.ultima = "";
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
  if (typeof speechSynthesis === "undefined") return MUDO;
  return new VozDelNavegador();
}

/** El nombre de la voz de quien habla, si habla por el sintetizador. */
function suVoz(quien: Instructor): string | null {
  return quien instanceof VozDelNavegador ? quien.nombreDeVoz : null;
}

/**
 * La voz de la torre.
 *
 * **Hacía falta porque la torre no hablaba.** Era una lámpara verde o roja con
 * una palabra escrita debajo, arriba en una esquina, y quien juega tiene
 * cuatro años y no lee:
 *
 * > «Una lámpara con texto no lo lee un niño… un niño (ni yo) leemos esas
 * > etiquetitas de arriba ni por asomo.»
 *
 * Una orden que solo existe como texto pequeño no existe. Y el color solo
 * tampoco basta: uno de cada doce niños no distingue el rojo del verde, que es
 * por lo que la lámpara ya llevaba una forma dentro. La voz es el tercer canal
 * y es el que funciona sin mirar.
 *
 * Suena **por radio** —chasquido al abrir y al cerrar, ver `audio/radio.ts`— y
 * con otro timbre: más rápida, más plana y un punto más grave. Una torre no
 * acompaña, despacha.
 */
export function elegirTorre(...cogidas: Instructor[]): Instructor {
  if (typeof speechSynthesis === "undefined") return MUDO;
  return new VozDelNavegador({
    rate: 1.14,
    pitch: 0.94,
    radio: true,
    cogidas: () => cogidas.map(suVoz),
  });
}

/**
 * La voz del otro avión de la frecuencia.
 *
 * Más rápida y más grave que la del instructor, **por radio** como la torre, y
 * de otra persona si el sistema tiene con qué: una radio en la que contesta tu
 * propio instructor no es una radio, es un eco. Con las grabaciones esto será
 * la voz «otro» de `docs/voces/`; hasta entonces, la del sistema que menos se
 * parezca a las que ya están cogidas.
 */
export function elegirOtroAvion(...cogidas: Instructor[]): Instructor {
  if (typeof speechSynthesis === "undefined") return MUDO;
  return new VozDelNavegador({
    rate: 1.08,
    pitch: 0.88,
    radio: true,
    cogidas: () => cogidas.map(suVoz),
  });
}
