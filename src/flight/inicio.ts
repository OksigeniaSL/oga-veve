/**
 * **El modo inicio**: el primer vuelo, paso a paso y esperando.
 *
 * Es el punto 232 de la lista, con las palabras de Enrique: «que haga algo
 * indicando al niño "ahora para despegar pulsa la flecha de subir", y el juego
 * para y se mueve cuando lo hace. Como un modo de vuelo súper guiado que le
 * enseñe a mover el avión y a que pruebe las teclas, mejor que un teclado con
 * instrucciones».
 *
 * ## Qué hace
 *
 * Una escena: Jazlyn, la comandante, le enseña a volar a su hijo pequeño. Él
 * pregunta y ella le enseña. Cada paso pide **una** cosa —arrancar, dar gas,
 * despegar con la flecha de subir, virar a un lado y al otro, enderezar— y el
 * mundo **se queda quieto** hasta que la hace. En cuanto la hace, se mueve.
 *
 * Esto es solo la secuencia: qué paso toca, qué se dice, si el mundo espera y
 * qué sostiene la mano de la mamá. No toca el DOM, ni el modelo de vuelo, ni
 * el audio, y por eso se puede probar sin navegador. Lo que se dibuja vive en
 * `ui/inicio.ts`; lo que lo engancha al vuelo, en `game.ts`.
 *
 * ## Las reglas que lo gobiernan
 *
 * - **Cada paso sale a la primera con un dedo torpe.** Lo que se pide es el
 *   gesto, no la puntería: un toque de la flecha de subir en la Vr basta, y la
 *   mano de la mamá sostiene el morro hasta que el avión se va del suelo. Lo
 *   mismo con el gas, que ella lleva hasta arriba en cuanto se empuja. Es lo
 *   que hace una instructora con doble mando el primer día, y es lo que hace
 *   ya la de la final de Guyrami con el gas.
 * - **Equivocarse no pasa nada.** Si se aprieta otra cosa, o no se aprieta
 *   nada en un rato, se le vuelve a pedir **con otras palabras**: las normas
 *   se muestran, no se imponen (AGENTS.md). Nunca un error, nunca un rojo.
 * - **Un suceso, una voz**, y la escena en orden: una frase detrás de otra,
 *   nunca dos a la vez. La de la frase anterior se espera; si quien juega ya
 *   hizo lo que se le pedía, lo que quedaba por decir se calla, que ya no es
 *   verdad.
 * - **Lo que se enseña es real.** Se despega corriendo y levantando la nariz,
 *   se vira inclinando las alas, se endereza con el mando del otro lado. Y el
 *   sello del final es el del campo de donde se despegó, el mismo que da el
 *   cuaderno por despegar de allí.
 */

const GRADO = Math.PI / 180;

import type { Mando } from "./mandos-fisicos";

/** Con qué se juega: lo que se dibuja para pedir cada gesto. Ver `mandos-fisicos.ts`. */
export type { Mando };

/** Quién habla en la escena. */
export type Quien = "mama" | "hijo";

/** Lo que se pide hacer, y por tanto lo que se dibuja. */
export type Gesto = "motor" | "gas" | "subir" | "izquierda" | "derecha" | "nivelar";

export type PasoId =
  | "hola"
  | "motor"
  | "gas"
  | "carrera"
  | "despegar"
  | "subida"
  | "izquierda"
  | "derecha"
  | "nivelar"
  | "fin";

/** Una frase de la escena: quién la dice y su clave del diccionario. */
export interface Linea {
  readonly quien: Quien;
  readonly clave: string;
}

/**
 * **Lo que quien juega está pidiendo en este fotograma**, venga de donde
 * venga: la tecla, el dedo o el mando. Es la intención y no lo que hace el
 * avión, porque con el mundo quieto el avión no hace nada.
 */
export interface Intento {
  /** −1 a 1, positivo morro arriba. */
  readonly cabeceo: number;
  /** −1 a 1, positivo a la derecha. */
  readonly alabeo: number;
  /** −1, 0 o 1: menos gas, nada o más gas. */
  readonly gas: number;
  /** Dos golpecitos en la palanca del dedo: al centro. */
  readonly centrar: boolean;
}

export const SIN_INTENTO: Intento = { cabeceo: 0, alabeo: 0, gas: 0, centrar: false };

/** Lo que la secuencia necesita saber del avión y de quien juega. */
export interface Lectura {
  readonly motor: boolean;
  /** El gas que hay, 0 a 1. */
  readonly gas: number;
  readonly intento: Intento;
  /** La velocidad, m/s. */
  readonly velocidad: number;
  /** La de rotación de este avión, m/s. */
  readonly vr: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  readonly enTierra: boolean;
  /** Rad, positivo con el ala derecha abajo. */
  readonly alabeo: number;
  readonly mando: Mando;
}

/** Lo que sostiene la mano de la mamá. Ver la cabecera. */
export interface Ayuda {
  /** El gas por debajo del cual no se deja bajar, o `null`. */
  readonly gas: number | null;
  /** La profundidad mínima, morro arriba, o `null`. */
  readonly cabeceo: number | null;
  /** Llevar la palanca al centro: alas niveladas y vuelo nivelado. */
  readonly centrar: boolean;
}

const SIN_AYUDA: Ayuda = { gas: null, cabeceo: null, centrar: false };

/**
 * Por dónde habla la secuencia. `alAcabar` recibe cuántos segundos más hay
 * que esperar antes de la frase siguiente: cero si sonó, y el rato de leerla
 * si no sonó —sin voz, el subtítulo es lo que queda—.
 */
export interface VozDelInicio {
  decir(linea: Linea, alAcabar: (esperaMas: number) => void): void;
  callar(): void;
}

/** Lo que sale de cada paso: lo que el juego tiene que hacer y dibujar. */
export interface SalidaDelInicio {
  /** Si el mundo espera. */
  readonly congelado: boolean;
  readonly ayuda: Ayuda;
}

// ── Dónde y con qué ──────────────────────────────────────────────────────

/**
 * **El Chaco, y no la granja.** Es el escenario «fácil: no hay contra qué
 * chocar», el que dice su ficha que sirve «para el primer vuelo de alguien que
 * no ha volado nunca» —ver `CHACO` en `world/scenarios.ts`—: llano hasta el
 * horizonte, una pista de mil cuatrocientos metros y nadie en la radio. Virar
 * a sesenta metros del suelo ahí no tiene nada delante.
 *
 * La granja era la otra candidata, y por cariño la primera. Pero allí, al
 * volver, **Jazlyn sale a buscarte en bici**, y en esta escena Jazlyn va en el
 * asiento de al lado: la misma persona en dos sitios a la vez no es algo que
 * un niño deje pasar.
 */
export const SITIO_DEL_INICIO = "chaco";

/** La avioneta de escuela, que es con la que se aprende de verdad. */
export const AVION_DEL_INICIO = "jaz-20";

// ── Los números ──────────────────────────────────────────────────────────

/**
 * Cuánto se espera sin que pase nada antes de volver a pedirlo, s. Contado
 * desde que se terminó de decir: nadie puede hacer algo antes de oír qué.
 */
export const ESPERA_SIN_HACER = 9;

/** Lo que se calla entre una frase y la siguiente, s: dos frases no son una. */
export const ENTRE_FRASES = 0.35;

/**
 * **Y lo más que se espera a que una frase avise de que acabó**, s. Una frase
 * espera su grabación hasta veinticinco segundos —ver `ESPERA_A_SU_VOZ`— y se
 * lee en seis como mucho; si pasado esto no ha avisado, es que la boca la tiró
 * sin decirlo —un reinicio la vacía— y la escena no se puede quedar colgada
 * esperándola.
 */
export const TOPE_DE_UNA_FRASE = 35;

/**
 * Y lo que tiene que pasar entre dos «esa no», s. Un niño que aporrea el
 * teclado no puede tener a su madre repitiéndole lo mismo cada medio segundo.
 */
export const ENFRIA_EL_ERROR = 3.5;

/** A qué altura se empieza a virar, m sobre el suelo. */
export const ALTURA_PARA_VIRAR = 60;

/**
 * Lo que se inclina el ala para dar el viraje por hecho, rad. Diez grados se
 * ven, y quedan muy por debajo de los treinta y tres de la inclinación
 * protegida de Guyrami.
 */
export const VIRAJE_HECHO = 10 * GRADO;

/** Y lo derechas que tienen que quedar las alas para darlas por niveladas. */
export const ALAS_DERECHAS = 3 * GRADO;

/** Y durante cuánto, s: pasar por el cero no es haber enderezado. */
const DERECHAS_UN_RATO = 0.4;

/** Lo que tarda la mano de la mamá en llevar el gas arriba, s. */
const RAMPA_DEL_GAS = 1.2;

/** Gas que da el paso por hecho. */
const GAS_HECHO = 0.85;

/** Altura a la que se da el despegue por hecho, m. */
const YA_VUELA = 8;

/** La profundidad con que la mano sostiene la rotación. */
const MORRO_DEL_DESPEGUE = 0.6;

/**
 * Y por debajo de cuánto, ya en el aire, la mano levanta el morro, m. Es la
 * red: una vuelta de prueba no puede acabar en el suelo.
 */
const RED_DE_ALTURA = 20;
const MORRO_DE_LA_RED = 0.45;

/** Lo que se pide para dar un intento por hecho: medio mando no es un roce. */
const UMBRAL = 0.3;

/** Cuánto se da para acabar el gesto una vez empezado, s, antes de insistir. */
const PLAZO: Partial<Record<PasoId, number>> = {
  gas: 6,
  despegar: 7,
  izquierda: 4,
  derecha: 4,
  nivelar: 6,
};

/** La subida, si no llega a la altura de virar: a los veinte segundos, si ya hay algo. */
const SUBIDA_LARGA = 20;
const ALTURA_MINIMA_PARA_VIRAR = 25;

// ── El guion ─────────────────────────────────────────────────────────────

const m = (clave: string): Linea => ({ quien: "mama", clave: `inicio.mama.${clave}` });
const h = (clave: string): Linea => ({ quien: "hijo", clave: `inicio.hijo.${clave}` });

interface DefPaso {
  readonly id: PasoId;
  /** Lo que se dice al empezar: la pregunta del hijo y lo que pide ella. */
  readonly entra: readonly Linea[];
  /** Lo que se pide hacer; `null` es mirar. */
  readonly gesto: Gesto | null;
  /** Si el mundo espera a que se haga. */
  readonly congela: boolean;
  /** Las otras palabras, para volver a pedirlo. */
  readonly otraVez: readonly Linea[];
  /** Y lo que se dice al conseguirlo. */
  readonly bien: readonly Linea[];
}

/**
 * **El guion entero**, en el orden en que se vuela.
 *
 * Corto a propósito: son nueve pasos y siete gestos, que es lo que aguanta
 * alguien de cuatro años antes de querer volar solo. Se empieza **alineado en
 * la cabecera y con el motor parado**: rodar por las calles es otra lección, y
 * arrancar es el primer gesto de todos.
 */
export const GUION_DEL_INICIO: readonly DefPaso[] = [
  {
    id: "hola",
    entra: [h("hola"), m("hola")],
    gesto: null,
    congela: true,
    otraVez: [],
    bien: [],
  },
  {
    id: "motor",
    entra: [h("motor"), m("motor")],
    gesto: "motor",
    congela: true,
    otraVez: [m("motor.otra1"), m("motor.otra2")],
    bien: [h("motor.bien"), m("motor.bien")],
  },
  {
    id: "gas",
    entra: [h("gas"), m("gas")],
    gesto: "gas",
    congela: true,
    otraVez: [m("gas.otra1"), m("gas.otra2")],
    bien: [m("gas.bien")],
  },
  {
    id: "carrera",
    entra: [h("carrera"), m("carrera")],
    gesto: null,
    congela: false,
    otraVez: [],
    bien: [],
  },
  {
    id: "despegar",
    entra: [m("despegar")],
    gesto: "subir",
    congela: true,
    otraVez: [m("despegar.otra1"), m("despegar.otra2")],
    bien: [h("despegar.bien"), m("despegar.bien")],
  },
  {
    id: "subida",
    entra: [],
    gesto: null,
    congela: false,
    otraVez: [],
    bien: [],
  },
  {
    id: "izquierda",
    entra: [h("izquierda"), m("izquierda")],
    gesto: "izquierda",
    congela: true,
    otraVez: [m("izquierda.otra1"), m("izquierda.otra2")],
    bien: [m("izquierda.bien")],
  },
  {
    id: "derecha",
    entra: [h("derecha"), m("derecha")],
    gesto: "derecha",
    congela: true,
    otraVez: [m("derecha.otra1"), m("derecha.otra2")],
    bien: [m("derecha.bien")],
  },
  {
    id: "nivelar",
    entra: [h("nivelar"), m("nivelar")],
    gesto: "nivelar",
    congela: true,
    otraVez: [m("nivelar.otra1"), m("nivelar.otra2")],
    bien: [m("nivelar.bien")],
  },
  {
    id: "fin",
    entra: [h("fin")],
    gesto: null,
    congela: true,
    otraVez: [],
    bien: [],
  },
];

/** «Un poquito más»: el gesto va bien encaminado y falta mantenerlo. */
const MAS_RATO: readonly Linea[] = [m("masRato1"), m("masRato2")];

/** El final, según sea o no el primer sello del cuaderno. */
const FIN_PRIMERO = m("fin");
const FIN_OTRO = m("finOtra");

/**
 * **Todas las frases de la escena**, una vez cada una. Lo leen la lista de
 * grabar y la pregunta de si el modo ya tiene voz: ver `inicioGrabado`.
 */
export const LINEAS_DEL_INICIO: readonly Linea[] = (() => {
  const todas: Linea[] = [];
  const poner = (l: Linea): void => {
    if (!todas.some((x) => x.clave === l.clave)) todas.push(l);
  };
  for (const p of GUION_DEL_INICIO) {
    p.entra.forEach(poner);
    p.otraVez.forEach(poner);
    p.bien.forEach(poner);
  }
  MAS_RATO.forEach(poner);
  poner(FIN_PRIMERO);
  poner(FIN_OTRO);
  return todas;
})();

/** La voz de cada uno en el pack: ella es la comandante; él, una voz nueva. */
export const VOZ_DE: Readonly<Record<Quien, string>> = {
  mama: "comandante",
  hijo: "hijo",
};

/**
 * **Si el modo ya tiene voz**: cada frase de la escena tiene su receta en el
 * pack de quien la dice. Es lo que decide si es la primera experiencia o un
 * modo más del hangar —ver `main.ts`—: un modo guiado sin voz, para quien no
 * lee y en un navegador sin voces del sistema, no guía.
 *
 * Recibe una función que dice si una clave tiene receta en el pack de una
 * voz, para no depender aquí de cómo se lee un manifiesto.
 */
export function inicioGrabado(tieneReceta: (voz: string, clave: string) => boolean): boolean {
  return LINEAS_DEL_INICIO.every((l) => tieneReceta(VOZ_DE[l.quien], l.clave));
}

// ── La secuencia ─────────────────────────────────────────────────────────

type Fase = "entra" | "espera" | "hace" | "bien" | "mira";

/** Lo que la secuencia deja ver: para el dibujo, el banco y las pruebas. */
export interface EstadoDelInicio {
  readonly paso: PasoId;
  readonly fase: Fase;
  readonly congelado: boolean;
  readonly gesto: Gesto | null;
  /** La última frase pedida: el subtítulo. */
  readonly linea: Linea | null;
  /** Cuántas veces se ha vuelto a pedir algo con otras palabras. */
  readonly otraVez: number;
  /** Si la mamá ya terminó de hablar en el final y se puede seguir. */
  readonly puedeSeguir: boolean;
  readonly terminado: boolean;
  /** Segundos de escena: con el mundo quieto también cuentan. */
  readonly segundos: number;
  /** Si hay una frase sonando o esperando turno. */
  readonly hablando: boolean;
}

export class Inicio {
  private indice = 0;
  private fase: Fase = "entra";
  /** Segundos en la fase de ahora. */
  private enFase = 0;
  /** Segundos desde que se terminó de hablar, esperando. */
  private sinHacer = 0;
  private reloj = 0;
  private ultimoError = -Infinity;
  private reintentos = 0;
  /** Cuál de las otras palabras toca la próxima vez. */
  private cualOtra = 0;
  /** Segundos seguidos con las alas derechas. Ver `DERECHAS_UN_RATO`. */
  private derechas = 0;
  private gasDeLaMano: number | null = null;
  /** Si ya se apretó la flecha de subir en la Vr: desde ahí, la mano ayuda. */
  private rotando = false;
  private centrarPedido = false;
  private alabeoAntes = 0;
  private acabado = false;
  private seguirPedido = false;

  /** Las frases que esperan, la que suena y cuándo puede sonar la siguiente. */
  private cola: Linea[] = [];
  private sonando: number | null = null;
  private sonandoDesde = 0;
  private puedeHablarEn = 0;
  private cuantas = 0;
  private ultima: Linea | null = null;

  constructor(
    private readonly voz: VozDelInicio,
    private readonly opciones: {
      /** Si este será el primer sello del cuaderno: cambia lo que dice al final. */
      readonly primerSello: boolean;
      /** Por dónde se empieza: el saludo, o directamente el motor al repetir. */
      readonly desde?: PasoId;
    },
  ) {
    const desde = opciones.desde ?? "hola";
    this.entrar(Math.max(0, GUION_DEL_INICIO.findIndex((p) => p.id === desde)));
  }

  private get def(): DefPaso {
    return GUION_DEL_INICIO[this.indice]!;
  }

  get estado(): EstadoDelInicio {
    const def = this.def;
    return {
      paso: def.id,
      fase: this.fase,
      congelado: this.congelado,
      gesto: this.acabado ? null : def.gesto,
      linea: this.ultima,
      otraVez: this.reintentos,
      puedeSeguir: def.id === "fin" && this.fase === "espera",
      terminado: this.acabado,
      segundos: this.reloj,
      hablando: !this.callada,
    };
  }

  /** El mundo espera mientras se pide algo que no se ha hecho todavía. */
  private get congelado(): boolean {
    if (this.acabado) return false;
    const def = this.def;
    return def.congela && (this.fase === "entra" || this.fase === "espera");
  }

  /** Quien juega toca «seguir volando» en el final. */
  seguir(): void {
    if (this.def.id === "fin") this.seguirPedido = true;
  }

  /** Un paso de la secuencia. */
  paso(dt: number, l: Lectura): SalidaDelInicio {
    this.reloj += dt;
    this.enFase += dt;
    if (this.acabado) return { congelado: false, ayuda: SIN_AYUDA };
    this.atenderLaVoz();
    this.mirar(dt, l);
    this.atenderLaVoz();
    return { congelado: this.congelado, ayuda: this.ayuda(dt, l) };
  }

  // ── La voz ─────────────────────────────────────────────────────────────

  private decir(lineas: readonly Linea[], cortar = false): void {
    if (cortar) this.callar();
    this.cola.push(...lineas);
  }

  /** Lo que quedaba por decir ya no es verdad: fuera. */
  private callar(): void {
    this.cola = [];
    if (this.sonando !== null) {
      this.sonando = null;
      this.voz.callar();
    }
    this.puedeHablarEn = this.reloj + ENTRE_FRASES;
  }

  private atenderLaVoz(): void {
    if (this.sonando !== null && this.reloj - this.sonandoDesde > TOPE_DE_UNA_FRASE) {
      this.sonando = null;
      this.puedeHablarEn = this.reloj;
    }
    if (this.sonando !== null || this.reloj < this.puedeHablarEn) return;
    const linea = this.cola.shift();
    if (!linea) return;
    const id = ++this.cuantas;
    this.sonando = id;
    this.sonandoDesde = this.reloj;
    this.ultima = linea;
    this.voz.decir(linea, (esperaMas) => {
      if (this.sonando !== id) return;
      this.sonando = null;
      this.puedeHablarEn = this.reloj + ENTRE_FRASES + Math.max(0, esperaMas);
    });
  }

  /**
   * **La boca se vació por su cuenta** —un reinicio la deja de cero— y lo que
   * estaba esperando turno ya no va a avisar: se vuelve a pedir, y lo demás
   * detrás, como estaba.
   */
  retomarLaVoz(): void {
    if (this.sonando !== null && this.ultima) this.cola.unshift(this.ultima);
    this.sonando = null;
    this.puedeHablarEn = this.reloj;
  }

  /** Nadie habla ni espera turno: lo dicho, dicho está. */
  private get callada(): boolean {
    return this.sonando === null && this.cola.length === 0 && this.reloj >= this.puedeHablarEn;
  }

  // ── Los pasos ──────────────────────────────────────────────────────────

  private entrar(indice: number, cortar = false): void {
    this.indice = Math.min(indice, GUION_DEL_INICIO.length - 1);
    const def = this.def;
    this.fase = "entra";
    this.enFase = 0;
    this.sinHacer = 0;
    this.cualOtra = 0;
    this.derechas = 0;
    this.centrarPedido = false;
    const entra =
      def.id === "fin"
        ? [...def.entra, this.opciones.primerSello ? FIN_PRIMERO : FIN_OTRO]
        : def.entra;
    this.decir(entra, cortar);
  }

  private siguiente(cortar = false): void {
    this.entrar(this.indice + 1, cortar);
  }

  /** Volver a pedirlo con otras palabras: las suyas, y después lo que pidió. */
  private otraVez(lineas: readonly Linea[]): void {
    const def = this.def;
    const ronda = lineas.length ? [...lineas, ...def.entra.filter((x) => x.quien === "mama")] : [];
    if (!ronda.length) return;
    const linea = ronda[this.cualOtra % ronda.length]!;
    this.cualOtra++;
    this.reintentos++;
    this.decir([linea]);
    this.sinHacer = 0;
  }

  private conseguido(): void {
    this.fase = "bien";
    this.enFase = 0;
    this.decir(this.def.bien, true);
  }

  private mirar(dt: number, l: Lectura): void {
    const def = this.def;

    /*
     * **Y si el motor se para en tierra, se vuelve a la llave.** Puede pasar:
     * la misma tecla lo apaga, y quien está aprendiendo la aprieta dos veces.
     * No es un error; es volver al paso que toca.
     */
    if (
      l.enTierra &&
      !l.motor &&
      (def.id === "gas" || def.id === "carrera" || def.id === "despegar")
    ) {
      this.indice = GUION_DEL_INICIO.findIndex((p) => p.id === "motor");
      this.fase = "espera";
      this.enFase = 0;
      this.sinHacer = 0;
      this.gasDeLaMano = null;
      this.rotando = false;
      this.decir([GUION_DEL_INICIO[this.indice]!.otraVez[0]!], true);
      return;
    }

    /*
     * **La Vr no espera a que se acabe de hablar.** Rodando con todo el gas,
     * el avión llega a su velocidad cuando llega: lo que quedaba de la
     * carrera se calla y el mundo se para ahí mismo, que es donde toca tirar.
     */
    if (
      (def.id === "carrera" || (def.id === "gas" && this.fase === "bien")) &&
      l.velocidad >= l.vr
    ) {
      this.indice = GUION_DEL_INICIO.findIndex((p) => p.id === "despegar") - 1;
      this.siguiente(true);
      return;
    }

    switch (this.fase) {
      case "entra":
      case "espera":
        if (!def.gesto) {
          if (this.callada && this.fase === "entra") {
            // El saludo se acaba al acabar de hablar; lo demás, mirando.
            if (def.id === "hola") return this.siguiente();
            this.fase = def.id === "fin" ? "espera" : "mira";
            this.enFase = 0;
          }
          if (def.id === "fin" && this.fase === "espera" && this.seguirPedido) {
            this.acabado = true;
            this.callar();
          }
          return;
        }
        if (this.hecho(l)) return this.conseguido();
        if (this.empieza(l)) {
          // Lo que quedaba por pedir ya no hace falta: se está haciendo.
          if (this.fase === "entra") this.callar();
          this.fase = "hace";
          this.enFase = 0;
          if (def.id === "despegar") this.rotando = true;
          if (def.id === "gas") this.gasDeLaMano = Math.max(l.gas, this.gasDeLaMano ?? 0);
          if (def.id === "nivelar") this.centrarPedido = true;
          return;
        }
        if (this.fase === "entra" && this.callada) {
          this.fase = "espera";
          this.enFase = 0;
          this.sinHacer = 0;
        }
        if (this.fase !== "espera" || !this.callada) return;
        this.sinHacer += dt;
        if (this.seEquivoca(l) && this.reloj - this.ultimoError >= ENFRIA_EL_ERROR) {
          this.ultimoError = this.reloj;
          this.otraVez(def.otraVez);
          return;
        }
        if (this.sinHacer >= ESPERA_SIN_HACER) this.otraVez(def.otraVez);
        return;

      case "hace": {
        this.derechas = Math.abs(l.alabeo) < ALAS_DERECHAS ? this.derechas + dt : 0;
        if (this.hecho(l)) return this.conseguido();
        // Al soltar la tecla enderezando, la mano termina de enderezar.
        if (def.id === "nivelar") {
          const suelta = Math.abs(l.intento.alabeo) < 0.05 && Math.abs(this.alabeoAntes) >= 0.05;
          if (suelta || l.intento.centrar) this.centrarPedido = true;
          this.alabeoAntes = l.intento.alabeo;
        }
        const plazo = PLAZO[def.id] ?? 6;
        if (this.enFase >= plazo && this.callada) {
          this.enFase = 0;
          const virando = def.id === "izquierda" || def.id === "derecha";
          // Encaminado al lado bueno, falta mantenerlo; si no, se pide otra vez.
          const encaminado =
            virando && Math.sign(l.alabeo) === (def.id === "izquierda" ? -1 : 1);
          this.otraVez(encaminado ? MAS_RATO : def.otraVez);
        }
        return;
      }

      case "bien":
        if (this.callada) this.siguiente();
        return;

      case "mira":
        if (def.id === "subida") {
          const arriba =
            l.altura >= ALTURA_PARA_VIRAR ||
            (this.enFase >= SUBIDA_LARGA && l.altura >= ALTURA_MINIMA_PARA_VIRAR);
          if (arriba && this.callada) this.siguiente();
        }
        return;
    }
  }

  /** Si ya se hizo lo que se pide. */
  private hecho(l: Lectura): boolean {
    switch (this.def.id) {
      case "motor":
        return l.motor;
      case "gas":
        return l.motor && l.gas >= GAS_HECHO;
      case "despegar":
        return !l.enTierra && l.altura >= YA_VUELA;
      case "izquierda":
        return this.fase === "hace" && !l.enTierra && l.alabeo <= -VIRAJE_HECHO;
      case "derecha":
        return this.fase === "hace" && !l.enTierra && l.alabeo >= VIRAJE_HECHO;
      case "nivelar":
        return this.fase === "hace" && this.derechas >= DERECHAS_UN_RATO;
      default:
        return false;
    }
  }

  /** Si quien juega está haciendo lo que se pide, aunque el mundo esté quieto. */
  private empieza(l: Lectura): boolean {
    const i = l.intento;
    switch (this.def.id) {
      case "gas":
        return l.motor && i.gas > 0;
      case "despegar":
        return i.cabeceo > UMBRAL;
      case "izquierda":
        return i.alabeo < -UMBRAL;
      case "derecha":
        return i.alabeo > UMBRAL;
      case "nivelar": {
        if (i.centrar) return true;
        const hacia = -Math.sign(l.alabeo);
        if (hacia !== 0 && Math.sign(i.alabeo) === hacia && Math.abs(i.alabeo) > UMBRAL)
          return true;
        /*
         * Con un mando de juego o un joystick, enderezar es **soltar**: la
         * palanca tiene muelle y el ala va donde va ella. Ahí, la palanca en
         * el centro ya es el gesto.
         */
        const conMuelle = l.mando === "consola" || l.mando === "joystick";
        return conMuelle && Math.abs(i.alabeo) < 0.05;
      }
      default:
        return false;
    }
  }

  /** Si está apretando otra cosa. Ver `ENFRIA_EL_ERROR`. */
  private seEquivoca(l: Lectura): boolean {
    const i = l.intento;
    const tocaCabeceo = Math.abs(i.cabeceo) > UMBRAL;
    const tocaAlabeo = Math.abs(i.alabeo) > UMBRAL;
    switch (this.def.id) {
      case "motor":
        return tocaCabeceo || tocaAlabeo || i.gas !== 0;
      case "gas":
        return i.gas < 0 || tocaCabeceo || tocaAlabeo;
      case "despegar":
        return i.cabeceo < -UMBRAL || (tocaAlabeo && !tocaCabeceo);
      case "izquierda":
        return i.alabeo > UMBRAL || (tocaCabeceo && !tocaAlabeo);
      case "derecha":
        return i.alabeo < -UMBRAL || (tocaCabeceo && !tocaAlabeo);
      case "nivelar":
        return (
          (tocaAlabeo && Math.sign(i.alabeo) === Math.sign(l.alabeo)) ||
          (tocaCabeceo && !tocaAlabeo)
        );
      default:
        return false;
    }
  }

  // ── La mano de la mamá ─────────────────────────────────────────────────

  private ayuda(dt: number, l: Lectura): Ayuda {
    const def = this.def;
    const despues = this.indice >= GUION_DEL_INICIO.findIndex((p) => p.id === "gas");
    /*
     * **El gas, en cuanto se empuja, hasta arriba**, y ahí se queda hasta el
     * final de la escena: con el mando de consola el gas es el gatillo, y
     * soltarlo para virar dejaría el avión sin motor en la primera vuelta.
     */
    let gas: number | null = null;
    if (despues && this.gasDeLaMano !== null && l.motor && def.id !== "fin") {
      this.gasDeLaMano = Math.min(1, this.gasDeLaMano + dt / RAMPA_DEL_GAS);
      gas = this.gasDeLaMano;
    }
    let cabeceo: number | null = null;
    if (this.rotando && (l.enTierra || l.altura < YA_VUELA * 2)) cabeceo = MORRO_DEL_DESPEGUE;
    else if (this.rotando) this.rotando = false;
    const enElAire = this.indice > GUION_DEL_INICIO.findIndex((p) => p.id === "despegar");
    if (enElAire && !l.enTierra && l.altura < RED_DE_ALTURA && def.id !== "fin")
      cabeceo = Math.max(cabeceo ?? 0, MORRO_DE_LA_RED);
    const centrar = this.centrarPedido;
    this.centrarPedido = false;
    return { gas, cabeceo, centrar };
  }
}
