/**
 * **La segunda escena del modo inicio: aterrizar con Jazlyn.**
 *
 * La primera —`inicio.ts`— enseña a despegar, virar y enderezar. Esta enseña
 * lo que viene después, que es lo que más cuesta: bajar a la pista, posarse y
 * parar. Los mismos dos —Jazlyn, la comandante, y Ara, que aprende—, el mismo
 * campo del Chaco, la misma avioneta y el mismo tono. Se abre con su ficha en
 * «¿A qué jugás?» o con `?inicio=2`; la primera experiencia sigue siendo la
 * del despegue.
 *
 * ## La secuencia
 *
 * Se empieza **ya en el aire, alineado en una final larga**, la de la lección
 * de aterrizar: a 3,6 km del umbral, sobre la senda de los aros y sin viento.
 * Y de ahí, lo que hace de verdad quien aterriza una avioneta de escuela:
 *
 * 1. el saludo, y por qué es Jazlyn quien lleva el avión mientras habla;
 * 2. **un poquito menos de gas**: se viene algo rápido, y en la final se
 *    vuela a la velocidad de aproximación;
 * 3. **la nariz un poquito abajo**, apuntando a la pista por dentro de los
 *    aros: desde ahí la nariz es de quien juega;
 * 4. la senda, mirando: a mitad, lo que son los aros —para aprender; en un
 *    aeropuerto, el caminito lo marcan unas luces—, y cerca de la pista, lo
 *    que va a pasar;
 * 5. **la recogida**: a la altura de su manual —quince pies en los de hélice,
 *    ver `recogida.ts`—, la nariz un poquito arriba, suave, y el gas fuera,
 *    que lo saca ella;
 * 6. tocar, primero las ruedas de atrás;
 * 7. **frenar**, en el suelo, y parar en la pista;
 * 8. la felicitación y el sello del cuaderno: el del campo donde se aterrizó,
 *    el mismo que da el cuaderno por aterrizar allí.
 *
 * ## En el aire el mundo no se para: lo lleva su mano
 *
 * En tierra la primera escena para el mundo hasta que se hace el gesto. En el
 * aire eso sería un truco —un avión no se queda quieto en el aire, y es lo
 * primero que hay que saber de uno—, así que **mientras espera el gesto, el
 * avión lo lleva la mano de Jazlyn**: sobre la senda, por el eje de la pista
 * y con el gas que lleve. Es lo que hace una instructora con doble mando.
 *
 * - **Solo cede lo que el niño hace bien.** Pedido el gas, la mano lo lleva a
 *   la velocidad de la final y no deja ni que suba ni que baje de ahí. Pedida
 *   la nariz, la nariz es de quien juega, pero dentro de un pasillo alrededor
 *   de la senda que se estrecha al acercarse al suelo: lo que se sale, lo
 *   endereza ella con calma. El alabeo no se pide, y no se cede nunca.
 * - **Y la final manda sobre el gesto.** Si un gesto no llega antes de su
 *   sitio de la final, lo hace ella y lo cuenta —«esta vez lo hago yo,
 *   mirá»—, que es exactamente lo que diría una instructora: sin drama, y la
 *   próxima vez lo hacés vos. Lo mismo en la recogida, que no espera a nadie:
 *   la mano recoge sola, y la nariz de quien juega solo la hace más suave.
 *
 * ## Lo que no hay
 *
 * Ni frustradas, ni vaca, ni percances, ni nadie más hablando: la mano no deja
 * que el avión se salga de la senda ni del eje, la recogida la asegura ella y
 * el juego no manda irse al aire mientras dura la escena —ver `game.ts`—.
 * Renunciar es ganar, pero esta lección es la de posarse.
 *
 * Esto es solo la secuencia y lo que pide la mano; no toca el DOM, ni el
 * modelo de vuelo, ni el audio. Lo engancha `game.ts` y lo dibuja `ui/inicio.ts`.
 */

import { Conversacion, type FraseDicha, type Linea } from "./conversacion";
import { SueloBajoLasRuedas } from "./recogida";
import {
  ENFRIA_EL_ERROR,
  ESPERA_SIN_HACER,
  type Gesto,
  type Intento,
  type Mando,
} from "./inicio";

const GRADO = Math.PI / 180;

export type PasoDeAterrizar =
  | "hola"
  | "gas"
  | "nariz"
  | "senda"
  | "recogida"
  | "frenar"
  | "parado"
  | "fin";

/**
 * **Lo que la escena necesita saber del avión, de la senda y de quien juega.**
 * Todo en SI y respecto de la pista en uso: ver `atenderAlInicio` en `game.ts`.
 */
export interface LecturaDeAterrizar {
  readonly motor: boolean;
  /** El gas que hay, 0 a 1. */
  readonly gas: number;
  readonly intento: Intento;
  /** La velocidad, m/s. */
  readonly velocidad: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  /**
   * **La altitud**, m: con la altura, lo que se mueve el suelo bajo las
   * ruedas. Sin ella —las pruebas que no la dan—, el suelo no se mueve. Ver
   * `SueloBajoLasRuedas` en `recogida.ts`.
   */
  readonly altitud?: number;
  readonly enTierra: boolean;
  /** Rad, positivo con el ala derecha abajo. */
  readonly alabeo: number;
  readonly mando: Mando;
  /** Lo que falta hasta el umbral de aterrizar por el eje, m: negativo, pasado. */
  readonly alUmbral: number;
  /** Lo que se va del eje de la pista, m, positivo a la derecha. */
  readonly lado: number;
  /** Hacia dónde mira el avión respecto de la pista, rad, positivo a la derecha. */
  readonly rumbo: number;
  /** Lo que se va por encima de la senda de los aros, m: negativo, por debajo. */
  readonly sobreLaSenda: number;
  /** Lo que baja la senda a esta velocidad, m/s, negativo bajando. */
  readonly ritmoDeLaSenda: number;
  /** Los metros de pista que quedan por delante, o `Infinity` fuera de ella. */
  readonly pistaQueQueda: number;
  /** El gas que da la velocidad de aproximación de este avión. */
  readonly gasDeLaFinal: number;
  /** A qué altura se levanta la nariz en este avión, m. Ver `recogida.ts`. */
  readonly alturaDeLaRecogida: number;
}

/**
 * **Lo que lleva la mano de Jazlyn en este fotograma**: lo que no es `null`
 * es suyo, y lo que es `null`, de quien juega. En el aire pide un ritmo de
 * subida y una inclinación —el avión de cada peldaño sabe qué palanca da
 * cada una, ver `enLosMandos`—; en el suelo, el volante y el freno.
 */
export interface ManoDeAterrizar {
  /** El gas, 0 a 1. */
  readonly gas: number | null;
  /** El ritmo de subida que pide, m/s, negativo bajando. */
  readonly subida: number | null;
  /** La inclinación que pide, rad. */
  readonly alabeo: number | null;
  /** La rueda de morro rodando, −1 a 1. */
  readonly volante: number | null;
  /** El freno, 0 a 1. */
  readonly freno: number | null;
}

export const SIN_MANO: ManoDeAterrizar = {
  gas: null,
  subida: null,
  alabeo: null,
  volante: null,
  freno: null,
};

export interface SalidaDeAterrizar {
  /** Si el mundo espera: solo en el suelo. */
  readonly congelado: boolean;
  readonly mano: ManoDeAterrizar;
}

// ── Los números ──────────────────────────────────────────────────────────

/** Lo que se pide para dar un intento por hecho: medio mando no es un roce. */
const UMBRAL = 0.3;

/**
 * **Hasta dónde de la final se espera cada gesto**, m del umbral: pasado,
 * lo hace ella. Medido con lo que se tarda en decir cada cosa —ver la
 * cabecera de `inicio-aterrizar.test.ts`—: con la final de la lección, que
 * empieza a 3.600 m, el gas se pide hacia los 3.050 y quedan dos vueltas de
 * «otra vez» antes de los 2.200; la nariz, con el gas hecho por ella, se pide
 * hacia los 1.800 y queda una antes de los 1.200.
 */
export const HASTA_EL_GAS = 2200;
export const HASTA_LA_NARIZ = 1200;

/**
 * **Y desde dónde se cuenta lo que viene**, m del umbral: la pista ya se ve
 * grande, y lo que se dice acaba muy por encima de la recogida.
 */
export const DESDE_LA_SENDA = 900;

/**
 * **Y antes, lo que son los aros**, m del umbral: a mitad de la final, que
 * entre la nariz y la pista quedaba más de un minuto callado. Es la pregunta
 * que se hace cualquiera, y la respuesta es la de verdad: los aros son para
 * aprender, y en un aeropuerto ese caminito lo marcan unas luces —el PAPI—.
 */
export const DESDE_LOS_AROS = 2000;

/**
 * **Cuánto antes de la recogida se pide**, s. «¡Ahora! Levantá la nariz…»
 * dura unos tres segundos, y la recogida no espera: se dice a la altura que
 * deja acabar la frase justo al llegar a la de levantar la nariz.
 */
export const ANTES_DE_LA_RECOGIDA = 3;

/** Lo que corrige la mano por cada metro que se va de la senda, m/s. */
const VUELVE_A_LA_SENDA = 0.15;
/** Y lo más que corrige, m/s: con calma, no a tirones. */
const CORRIGE_COMO_MUCHO = 1.5;

/**
 * **Lo que manda la nariz de quien juega**, m/s de bajar o subir a fondo. Se
 * ve —un toque hace bajar el avión por dentro de los aros— y no saca de la
 * senda: la mano lo devuelve en cuanto se suelta.
 */
export const DA_LA_NARIZ = 1.2;

/**
 * **El pasillo**, m arriba y abajo de la senda: lo que quien juega puede irse
 * con la nariz antes de que la mano deje de ceder. Un cuarto de la altura,
 * de metro y medio a ocho: amplio arriba, y estrecho cerca del suelo, que es
 * donde un metro de más ya es la pista.
 */
export function pasillo(altura: number): number {
  return Math.min(8, Math.max(1.5, 0.25 * altura));
}

/**
 * **La recogida de la mano**: el ritmo que pide por debajo de la altura de la
 * nariz es `−(base + POR_METRO · altura)`, que va de la bajada de la senda a
 * casi nada al tocar. Con la nariz de quien juega, la base es la de tirando:
 * se toca más suave todavía. Medido con el JAZ 20 en Guyrami: sola toca a
 * 0,6 m/s y tirando a 0,3, a unos 350 m del umbral. Ver la prueba.
 */
export const RECOGE_SOLA = 0.55;
export const RECOGE_TIRANDO = 0.25;
const RECOGE_POR_METRO = 0.3;

/** Lo que sube o baja el gas la mano por segundo, de 0 a 1: suave. */
const RITMO_DEL_GAS = 0.2;
/** Y al sacarlo en la recogida, un poco más vivo. */
const SACA_EL_GAS = 0.3;

/** Desde cuántos metros de lado la mano apunta al eje como mucho, y cuánto. */
const VUELVE_AL_EJE = 500;
const CORTE_MAXIMO = 0.25;
/** Inclinación por radián de rumbo que falta, y la más que pide. */
const INCLINA_POR_RUMBO = 2.5;
const INCLINACION_MAXIMA = 12 * GRADO;
/** Y rodando: el volante, por radián que falta, y el más que gira. */
const GIRA_POR_RUMBO = 3;
const VOLANTE_MAXIMO = 0.5;

/** El freno de la mano, pedido el freno. */
export const FRENO_DE_LA_MANO = 0.6;

/** Por debajo de esto el avión está parado, m/s. */
const PARADO = 0.5;

/**
 * **La pista manda sobre la frase**, m: si al rodar quedan menos, se pasa a
 * pedir el freno en el acto —con el mundo esperando—, aunque no se haya
 * acabado de celebrar la toma. Es la misma red que `PISTA_QUE_SE_GUARDA` en
 * la carrera de despegue.
 */
export const PISTA_PARA_FRENAR = 500;

// ── El guion ─────────────────────────────────────────────────────────────

const m = (clave: string): Linea => ({ quien: "mama", clave: `inicio.mama.aterrizar.${clave}` });
const a = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.aterrizar.${clave}` });

interface DefPaso {
  readonly id: PasoDeAterrizar;
  /** Lo que se dice al empezar. */
  readonly entra: readonly Linea[];
  readonly gesto: Gesto | null;
  /** Si el mundo espera: solo en el suelo. */
  readonly congela: boolean;
  /** Las otras palabras, para volver a pedirlo. */
  readonly otraVez: readonly Linea[];
  /** Lo que se dice al conseguirlo. */
  readonly bien: readonly Linea[];
  /** Y lo que dice ella si lo hace su mano. */
  readonly yo: readonly Linea[];
}

/**
 * **El guion entero**, en el orden en que se vuela. Cuatro gestos: menos gas,
 * la nariz abajo, la nariz arriba y el freno.
 */
export const GUION_DE_ATERRIZAR: readonly DefPaso[] = [
  { id: "hola", entra: [a("hola"), m("hola")], gesto: null, congela: false, otraVez: [], bien: [], yo: [] },
  {
    id: "gas",
    entra: [a("gas"), m("gas")],
    gesto: "menosGas",
    congela: false,
    otraVez: [m("gas.otra1"), m("gas.otra2")],
    bien: [m("gas.bien")],
    yo: [m("gas.yo")],
  },
  {
    id: "nariz",
    entra: [a("nariz"), m("nariz")],
    gesto: "bajar",
    congela: false,
    otraVez: [m("nariz.otra1"), m("nariz.otra2")],
    bien: [a("nariz.bien"), m("nariz.bien")],
    yo: [m("nariz.yo")],
  },
  { id: "senda", entra: [a("senda"), m("senda")], gesto: null, congela: false, otraVez: [], bien: [], yo: [] },
  {
    id: "recogida",
    entra: [m("recogida")],
    gesto: "subir",
    congela: false,
    otraVez: [],
    bien: [a("toque"), m("recogida.bien")],
    yo: [a("toque"), m("recogida.yo")],
  },
  {
    id: "frenar",
    entra: [a("frenar"), m("frenar")],
    gesto: "frenar",
    congela: true,
    otraVez: [m("frenar.otra1"), m("frenar.otra2")],
    bien: [m("frenar.bien")],
    yo: [],
  },
  { id: "parado", entra: [], gesto: null, congela: false, otraVez: [], bien: [], yo: [] },
  { id: "fin", entra: [a("fin")], gesto: null, congela: true, otraVez: [], bien: [], yo: [] },
];

/** El final, según sea o no el primer sello del cuaderno. */
const FIN_PRIMERO = m("fin");
const FIN_OTRO = m("finOtra");

/** Lo que son los aros, a mitad de la senda. Ver `DESDE_LOS_AROS`. */
export const LOS_AROS: readonly Linea[] = [a("aros"), m("aros")];

/** **Todas las frases de la escena**, una vez cada una: para la lista de grabar y las pruebas. */
export const LINEAS_DE_ATERRIZAR: readonly Linea[] = (() => {
  const todas: Linea[] = [];
  const poner = (l: Linea): void => {
    if (!todas.some((x) => x.clave === l.clave)) todas.push(l);
  };
  for (const p of GUION_DE_ATERRIZAR) {
    if (p.id === "senda") LOS_AROS.forEach(poner);
    p.entra.forEach(poner);
    p.otraVez.forEach(poner);
    p.bien.forEach(poner);
    p.yo.forEach(poner);
  }
  poner(FIN_PRIMERO);
  poner(FIN_OTRO);
  return todas;
})();

const indiceDe = (id: PasoDeAterrizar): number => GUION_DE_ATERRIZAR.findIndex((p) => p.id === id);
const RECOGIDA = indiceDe("recogida");
const FRENAR = indiceDe("frenar");

// ── La secuencia ─────────────────────────────────────────────────────────

type Fase = "entra" | "espera" | "hace" | "bien" | "mira";

/** Lo que la escena deja ver: para el dibujo, el banco y las pruebas. */
export interface EstadoDeAterrizar {
  readonly paso: PasoDeAterrizar;
  readonly fase: Fase;
  readonly congelado: boolean;
  readonly gesto: Gesto | null;
  /** La última frase pedida: el subtítulo. */
  readonly linea: Linea | null;
  /** Cuántas veces se ha vuelto a pedir algo con otras palabras. */
  readonly otraVez: number;
  readonly puedeSeguir: boolean;
  readonly terminado: boolean;
  /** Segundos de escena. */
  readonly segundos: number;
  /** Si hay una frase sonando o esperando turno. */
  readonly hablando: boolean;
  /** Los pasos que hizo su mano porque la final no esperaba. */
  readonly porLaMano: readonly PasoDeAterrizar[];
  /** Si quien juega levantó la nariz en la recogida. */
  readonly tiro: boolean;
  /** Si ya se tocó la pista. */
  readonly tocado: boolean;
}

export class InicioDeAterrizar {
  private indice = 0;
  private fase: Fase = "entra";
  private enFase = 0;
  private sinHacer = 0;
  private reloj = 0;
  private ultimoError = -Infinity;
  private reintentos = 0;
  private cualOtra = 0;
  private acabado = false;
  private seguirPedido = false;
  private readonly charla: Conversacion;

  /** El gas que lleva la mano: el que había al empezar, hasta que se pide menos. */
  private gasDeLaMano: number | null = null;
  /** Si ya se pidió menos gas, o lo pidió ella. */
  private gasPedido = false;
  /** Si la nariz ya es de quien juega. */
  private narizCedida = false;
  /** Si quien juega levantó la nariz en la recogida. */
  private tiro = false;
  /** Si la mano ya está recogiendo: una vez empezada, hasta tocar. */
  private recogiendo = false;
  /** Lo que se mueve el suelo bajo las ruedas. Ver `SueloBajoLasRuedas`. */
  private readonly suelo = new SueloBajoLasRuedas();
  private vioElAire = false;
  private tocado = false;
  private frenando = false;
  private sendaDicha = false;
  private arosDichos = false;
  private readonly hechoPorLaMano: PasoDeAterrizar[] = [];

  constructor(
    voz: ConstructorParameters<typeof Conversacion>[0],
    private readonly opciones: {
      /** Si este será el primer sello del cuaderno: cambia lo que dice al final. */
      readonly primerSello: boolean;
      /** Por dónde se empieza: el saludo, o el gas al repetir. */
      readonly desde?: PasoDeAterrizar;
      /**
       * El reloj de la voz, s: el de pared mientras se juega. Ver
       * `TOPE_DE_UNA_FRASE` en `conversacion.ts`. Sin decir, el de la escena.
       */
      readonly pared?: () => number;
    },
  ) {
    this.charla = new Conversacion(voz, () => this.reloj, () => this.opciones.pared?.() ?? this.reloj);
    const desde = opciones.desde ?? "hola";
    /*
     * Empezando más allá de la recogida, lo de antes ya pasó: es para las
     * pruebas y para el banco, que miran el final sin volar entera la final.
     */
    if (indiceDe(desde) > RECOGIDA) {
      this.gasPedido = true;
      this.narizCedida = true;
      this.tocado = true;
      this.vioElAire = true;
    }
    this.entrar(Math.max(0, indiceDe(desde)));
  }

  private get def(): DefPaso {
    return GUION_DE_ATERRIZAR[this.indice]!;
  }

  get estado(): EstadoDeAterrizar {
    const def = this.def;
    return {
      paso: def.id,
      fase: this.fase,
      congelado: this.congelado,
      gesto: this.acabado || (def.id === "recogida" && this.tocado) ? null : def.gesto,
      linea: this.charla.ultima,
      otraVez: this.reintentos,
      puedeSeguir: def.id === "fin" && this.fase === "espera",
      terminado: this.acabado,
      segundos: this.reloj,
      hablando: !this.charla.callada,
      porLaMano: [...this.hechoPorLaMano],
      tiro: this.tiro,
      tocado: this.tocado,
    };
  }

  /** El mundo espera mientras se pide algo en el suelo que no se ha hecho. */
  private get congelado(): boolean {
    if (this.acabado) return false;
    return this.def.congela && (this.fase === "entra" || this.fase === "espera");
  }

  /** Quien juega toca «seguir volando» en el final. */
  seguir(): void {
    if (this.def.id === "fin") this.seguirPedido = true;
  }

  get registro(): readonly Readonly<FraseDicha>[] {
    return this.charla.registro;
  }

  /** La boca se vació por su cuenta: ver `Conversacion.retomar`. */
  retomarLaVoz(): void {
    this.charla.retomar();
  }

  /** Un paso de la secuencia. */
  paso(dt: number, l: LecturaDeAterrizar): SalidaDeAterrizar {
    this.reloj += dt;
    this.enFase += dt;
    if (this.acabado) return { congelado: false, mano: SIN_MANO };
    if (!l.enTierra) this.vioElAire = true;
    this.charla.atender();
    this.mirar(dt, l);
    this.charla.atender();
    // Acabada en este mismo paso, la mano ya se soltó.
    if (this.acabado) return { congelado: false, mano: SIN_MANO };
    return { congelado: this.congelado, mano: this.mano(dt, l) };
  }

  // ── Los pasos ──────────────────────────────────────────────────────────

  private entrar(indice: number, cortar = false): void {
    this.indice = Math.min(indice, GUION_DE_ATERRIZAR.length - 1);
    const def = this.def;
    this.fase = "entra";
    this.enFase = 0;
    this.sinHacer = 0;
    this.cualOtra = 0;
    if (def.id === "senda") {
      // Se cuenta cerca de la pista: ver `DESDE_LA_SENDA`.
      if (cortar) this.charla.callar();
      this.fase = "mira";
      return;
    }
    if (def.id === "parado") {
      if (cortar) this.charla.callar();
      this.fase = "mira";
      return;
    }
    const entra =
      def.id === "fin"
        ? [...def.entra, this.opciones.primerSello ? FIN_PRIMERO : FIN_OTRO]
        : def.entra;
    this.charla.decir(entra, cortar);
  }

  private siguiente(cortar = false): void {
    this.entrar(this.indice + 1, cortar);
  }

  /** Volver a pedirlo con otras palabras: las suyas, y después lo que pidió. */
  private otraVez(lineas: readonly Linea[]): void {
    const ronda = lineas.length ? [...lineas, ...this.def.entra.filter((x) => x.quien === "mama")] : [];
    if (!ronda.length) return;
    const linea = ronda[this.cualOtra % ronda.length]!;
    this.cualOtra++;
    this.reintentos++;
    this.charla.decir([linea]);
    this.sinHacer = 0;
  }

  private conseguido(): void {
    this.fase = "bien";
    this.enFase = 0;
    this.charla.decir(this.def.bien, true);
  }

  /** **La final no esperaba: lo hace su mano**, y lo cuenta. */
  private loHaceElla(): void {
    const def = this.def;
    this.hechoPorLaMano.push(def.id);
    if (def.id === "gas") this.gasPedido = true;
    if (def.id === "nariz") this.narizCedida = true;
    this.fase = "bien";
    this.enFase = 0;
    this.charla.decir(def.yo, true);
  }

  private mirar(dt: number, l: LecturaDeAterrizar): void {
    /*
     * **La toma.** En cuanto las ruedas tocan viniendo del aire, lo que se
     * dice es eso, y lo que quedaba —el «suave, suave»— ya no es verdad. Si
     * quien juega levantó la nariz, el aterrizaje es suyo; si no, lo cuenta
     * ella. Pase lo que pase antes, tocar lleva a esto.
     */
    if (l.enTierra && this.vioElAire && !this.tocado) {
      this.tocado = true;
      this.indice = RECOGIDA;
      if (!this.tiro) this.hechoPorLaMano.push("recogida");
      this.fase = "bien";
      this.enFase = 0;
      this.charla.decir(this.tiro ? this.def.bien : this.def.yo, true);
      return;
    }
    /*
     * **Y la recogida no espera a nadie**: a su altura se pide, cortando lo
     * que se estuviera diciendo. No debería cortar nada —lo de antes se dice
     * muy por encima—, y si lo corta, manda el suelo.
     */
    if (!l.enTierra && this.indice < RECOGIDA && l.altura <= alturaDelAhora(l)) {
      this.indice = RECOGIDA - 1;
      this.siguiente(!this.charla.callada);
      return;
    }
    /*
     * **La pista manda sobre la frase**: rodando, con poca pista por delante,
     * se pide el freno ya, con el mundo esperando. Ver `PISTA_PARA_FRENAR`.
     */
    if (l.enTierra && this.tocado && this.indice < FRENAR && l.pistaQueQueda <= PISTA_PARA_FRENAR) {
      this.indice = FRENAR - 1;
      this.siguiente(!this.charla.callada);
      return;
    }

    const def = this.def;
    switch (this.fase) {
      case "entra":
      case "espera": {
        if (!def.gesto) {
          if (def.id === "hola" && this.charla.callada) return this.siguiente();
          if (def.id === "fin") {
            if (this.fase === "entra" && this.charla.callada) {
              this.fase = "espera";
              this.enFase = 0;
            }
            if (this.fase === "espera" && this.seguirPedido) {
              this.acabado = true;
              this.charla.callar();
            }
          }
          return;
        }
        // La final no espera: pasado su sitio, lo hace ella.
        if (
          (def.id === "gas" && l.alUmbral <= HASTA_EL_GAS) ||
          (def.id === "nariz" && l.alUmbral <= HASTA_LA_NARIZ)
        )
          return this.loHaceElla();
        if (this.empieza(l)) {
          if (def.id === "gas") {
            // Lo que quedaba por pedir ya no hace falta: se está haciendo.
            if (this.fase === "entra") this.charla.callar();
            this.gasPedido = true;
            this.fase = "hace";
            this.enFase = 0;
            return;
          }
          if (def.id === "nariz") {
            this.narizCedida = true;
            return this.conseguido();
          }
          if (def.id === "recogida") {
            // Sin cortarla: el «suave, suave» sigue siendo verdad.
            this.tiro = true;
            this.fase = "hace";
            this.enFase = 0;
            return;
          }
          if (def.id === "frenar") {
            this.frenando = true;
            return this.conseguido();
          }
        }
        if (this.fase === "entra" && this.charla.callada) {
          this.fase = "espera";
          this.enFase = 0;
          this.sinHacer = 0;
        }
        if (this.fase !== "espera" || !this.charla.callada) return;
        this.sinHacer += dt;
        if (this.seEquivoca(l) && this.reloj - this.ultimoError >= ENFRIA_EL_ERROR) {
          this.ultimoError = this.reloj;
          return this.otraVez(def.otraVez);
        }
        if (this.sinHacer >= ESPERA_SIN_HACER) this.otraVez(def.otraVez);
        return;
      }

      case "hace":
        // El gas: hecho cuando la mano lo ha llevado a la velocidad de la final.
        if (def.id === "gas" && this.gasDeLaMano !== null && Math.abs(this.gasDeLaMano - l.gasDeLaFinal) < 0.01)
          return this.conseguido();
        return;

      case "bien":
        if (this.charla.callada) this.siguiente();
        return;

      case "mira":
        if (def.id === "senda" && !this.arosDichos && l.alUmbral <= DESDE_LOS_AROS) {
          this.arosDichos = true;
          this.charla.decir(LOS_AROS);
        }
        if (def.id === "senda" && !this.sendaDicha && l.alUmbral <= DESDE_LA_SENDA) {
          this.sendaDicha = true;
          this.charla.decir(def.entra);
        }
        if (def.id === "parado" && l.velocidad < PARADO && this.charla.callada) this.siguiente();
        return;
    }
  }

  /** Si quien juega está haciendo lo que se pide. */
  private empieza(l: LecturaDeAterrizar): boolean {
    const i = l.intento;
    switch (this.def.id) {
      case "gas":
        return i.gas < 0;
      case "nariz":
        return i.cabeceo < -UMBRAL;
      case "recogida":
        return i.cabeceo > UMBRAL;
      case "frenar":
        return i.frenar;
      default:
        return false;
    }
  }

  /** Si está apretando otra cosa. Ver `ENFRIA_EL_ERROR`. */
  private seEquivoca(l: LecturaDeAterrizar): boolean {
    const i = l.intento;
    const cabeceo = Math.abs(i.cabeceo) > UMBRAL;
    const alabeo = Math.abs(i.alabeo) > UMBRAL;
    switch (this.def.id) {
      case "gas":
        return i.gas > 0 || cabeceo || alabeo || i.frenar;
      case "nariz":
        return i.cabeceo > UMBRAL || alabeo || i.gas !== 0 || i.frenar;
      case "frenar":
        return i.gas > 0 || cabeceo || alabeo;
      default:
        return false;
    }
  }

  // ── La mano de Jazlyn ──────────────────────────────────────────────────

  private mano(dt: number, l: LecturaDeAterrizar): ManoDeAterrizar {
    if (this.gasDeLaMano === null) this.gasDeLaMano = l.gas;
    if (l.enTierra) {
      /*
       * **En el suelo, el gas fuera, el avión por el eje y el freno, pedido
       * el freno.** La mano no frena antes: frenar es el gesto, y la pista
       * que queda la guarda `PISTA_PARA_FRENAR`.
       */
      this.gasDeLaMano = 0;
      const quiero = Math.max(-0.15, Math.min(0.15, -l.lado / 60));
      const volante = acotar(GIRA_POR_RUMBO * (quiero - l.rumbo), VOLANTE_MAXIMO);
      return { gas: 0, subida: null, alabeo: null, volante, freno: this.frenando ? FRENO_DE_LA_MANO : null };
    }

    /*
     * **La recogida**, a la altura de su manual: una vez empezada, hasta
     * tocar. El gas, fuera, y la bajada, de la de la senda a casi nada.
     */
    if (this.indice >= RECOGIDA && l.altura <= l.alturaDeLaRecogida) this.recogiendo = true;
    /*
     * El gas, en la recogida, **sale con la altura**: al ralentí al tocar, no
     * de golpe arriba. Es lo que dice el manual —«power normally is reduced to
     * idle during the round out»— y es lo que deja al avión la velocidad que
     * se gasta en posarse: sacado de golpe, el JAZ 20 se quedaba sin ella a
     * medio metro y tocaba a casi un metro por segundo.
     */
    const enLaRecogida = l.gasDeLaFinal * Math.min(1, Math.max(0, l.altura / l.alturaDeLaRecogida));
    const objetivo = this.recogiendo
      ? Math.min(this.gasDeLaMano, enLaRecogida)
      : this.gasPedido
        ? l.gasDeLaFinal
        : this.gasDeLaMano;
    const ritmo = this.recogiendo ? SACA_EL_GAS : RITMO_DEL_GAS;
    this.gasDeLaMano += acotar(objetivo - this.gasDeLaMano, ritmo * dt);

    /*
     * **Sobre la senda**, con calma: la de la senda y lo que falta para volver
     * a ella. Y la nariz de quien juega, si ya es suya, dentro del pasillo: lo
     * que se sale no se cede.
     */
    let subida = l.ritmoDeLaSenda - acotar(VUELVE_A_LA_SENDA * l.sobreLaSenda, CORRIGE_COMO_MUCHO);
    const pedidaLaRecogida = this.indice >= RECOGIDA;
    if (this.narizCedida && !pedidaLaRecogida) {
      let nariz = l.intento.cabeceo * DA_LA_NARIZ;
      const p = pasillo(l.altura);
      if (l.sobreLaSenda >= p && nariz > 0) nariz = 0;
      if (l.sobreLaSenda <= -p && nariz < 0) nariz = 0;
      subida += nariz;
    }
    /*
     * **Y pedida la recogida, la de su mano**: en cuanto deja de bajar menos
     * que la senda, manda ella, de lo que baja la senda a casi nada al tocar.
     * La nariz de quien juega no se suma a nada: la hace empezar un metro más
     * arriba y acabar más suave, que es lo que hace levantarla a tiempo. Y
     * empujar ahí abajo no se cede.
     */
    /*
     * **Contra la pista**, como la de la tripulación del vuelo de pasaje: a lo
     * que se pide se le suma lo que se mueve el suelo bajo las ruedas, que en
     * una pista con pendiente no es cero. Ver `SueloBajoLasRuedas`.
     */
    const suelo = l.altitud === undefined ? 0 : this.suelo.paso(dt, l.altitud - l.altura);
    if (pedidaLaRecogida) {
      const base = this.tiro ? RECOGE_TIRANDO : RECOGE_SOLA;
      subida = Math.max(subida, -(base + RECOGE_POR_METRO * Math.max(0, l.altura)) + suelo);
    }

    // Y por el eje: el alabeo no se pide, y no se cede.
    const quiero = acotar(-l.lado / VUELVE_AL_EJE, CORTE_MAXIMO);
    const alabeo = acotar(INCLINA_POR_RUMBO * (quiero - l.rumbo), INCLINACION_MAXIMA);
    return { gas: this.gasDeLaMano, subida, alabeo, volante: null, freno: null };
  }
}

/** **A qué altura se pide la recogida**: la suya, más lo que se tarda en pedirla. */
export function alturaDelAhora(l: Pick<LecturaDeAterrizar, "alturaDeLaRecogida" | "ritmoDeLaSenda">): number {
  return l.alturaDeLaRecogida + ANTES_DE_LA_RECOGIDA * Math.max(0, -l.ritmoDeLaSenda);
}

function acotar(v: number, tope: number): number {
  return Math.max(-tope, Math.min(tope, v));
}

/** Lo que el modelo de vuelo sabe contestar: qué palanca da qué. Ver `arcade.ts`. */
export interface ModeloQueContesta {
  mandoParaSubir?(ritmo: number): number;
  mandoParaInclinar?(alabeo: number): number;
}

/**
 * **La mano de Jazlyn en los mandos**: lo que pide, puesto en palancas. El
 * ritmo de subida y la inclinación los traduce el modelo de vuelo —en el
 * sencillo la palanca **es** cuánto se sube, ver `mandoParaSubir`—; el gas,
 * el volante y el freno van tal cual. Lo usan `game.ts` y la prueba, para que
 * la mano que se prueba sea la que vuela.
 */
export function enLosMandos(
  mano: ManoDeAterrizar,
  modelo: ModeloQueContesta,
): {
  readonly throttle: number | null;
  readonly elevator: number | null;
  readonly aileron: number | null;
  readonly brakes: number | null;
} {
  const elevator =
    mano.subida !== null && modelo.mandoParaSubir ? acotar(modelo.mandoParaSubir(mano.subida), 1) : null;
  let aileron: number | null = null;
  if (mano.volante !== null) aileron = acotar(mano.volante, 1);
  else if (mano.alabeo !== null && modelo.mandoParaInclinar) {
    const pide = modelo.mandoParaInclinar(mano.alabeo);
    aileron = Number.isFinite(pide) ? acotar(pide, 1) : 0;
  }
  return { throttle: mano.gas, elevator, aileron, brakes: mano.freno };
}
