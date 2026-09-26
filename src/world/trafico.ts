import { giroDelModelo } from "./rumbo";
/**
 * El otro avión, **dibujado**.
 *
 * La radio lleva tiempo contando que hay alguien más ahí fuera: uno que rueda
 * a la cabecera, otro en viento en cola, la torre autorizándoles a los dos. Y
 * no había nadie. Quien juega oye «Echo Charlie Oscar, en final», mira, y la
 * pista está vacía — que es la manera más rápida de aprender que la radio es
 * un adorno.
 *
 * Esto pone al otro avión donde acaba de decir que está.
 *
 * ## Un camino, y unas marcas encima
 *
 * El avión **no vuela por su cuenta**: recorre el circuito a velocidad de
 * avión, y cada llamada de la radio lo coloca en la marca que le corresponde.
 * Así no puede desmentirse a sí mismo, que es el fallo del que no se vuelve —
 * un tráfico que canta final estando en tierra no es realismo, es una avería a
 * la vista de todos.
 *
 * Lo bonito es **dónde caen las marcas**, porque no se eligieron: se midieron.
 * Entre dos llamadas pasan de treinta y cinco a setenta y cinco segundos, y
 * una avioneta en circuito vuela a cuarenta metros por segundo; o sea que las
 * marcas van a unos dos kilómetros una de otra. Contando hacia atrás desde la
 * toma, eso deja «en final» justo en la entrada en final y «en viento en cola»
 * a tres cuartos del tramo largo — que es **exactamente donde se anuncian de
 * verdad**: nadie canta viento en cola al entrar en el viento en cola, lo
 * canta a la altura de la cabecera. No hubo que ajustar nada.
 *
 * ## Y vuela por donde el juego enseña a volar
 *
 * El camino sale de `verticesDelCircuito`, los mismos cinco puntos que el hilo
 * ocre le dibuja a quien juega. Ni una trigonometría nueva: un tráfico con
 * ruta propia enseñaría, callado, que el circuito dibujado es uno de tantos.
 *
 * ## Y no se le puede chocar
 *
 * Es ambiente, no un obstáculo: no tiene estela, no ocupa la pista y no cuenta
 * como percance. Un juego donde a los cuatro años te mata algo que no
 * controlás no es este juego. Lo que enseña es **que hay más gente**, y eso se
 * enseña viéndolo.
 */

import {
  BufferGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import type { Silueta } from "../flight/flota";
import { fabricarAeronave } from "./fabrica-de-aeronaves";
import { verticesDelCircuito, type Mano, type Pista } from "./circuito";
import { desplazadoDe } from "./umbral-desplazado";
import {
  ESPERA_ENTRE_VUELOS,
  ESPERA_MAXIMA,
  RESPUESTA_MAXIMA,
} from "../flight/radio";
import { ALTURA_DE_DECISION } from "../flight/minimos";

/** Un sitio del mundo, con su altura. */
export interface Sitio {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Dónde deja una llamada al que la hace. */
export interface Marca {
  /** El camino que va recorriendo. */
  readonly camino: Sitio[];
  /** Cuánto lleva recorrido de él al decirlo, m. */
  readonly metros: number;
  /** A cuánto lo sigue recorriendo, m/s. */
  readonly velocidad: number;
  /**
   * Dónde se planta y espera, m. Sin tope, sigue hasta el final del camino.
   *
   * Lo pide **«line up and wait»**, que es la única orden de la torre que dice
   * «no hagas nada»: sin tope, el avión al que le mandan esperar en el eje
   * seguía tirando por el camino y despegaba solo. Se quedaba sin turno el que
   * estaba autorizado, o sea el guion entero al revés — y es justo la lección
   * que ese guion existe para dar: la pista es de todos y hay turnos.
   */
  readonly tope?: number;
}

/** A cuánto vuela el tráfico del circuito, m/s. Una avioneta en circuito. */
export const VUELA_A = 40;

/** Y a cuánto rueda por el suelo, m/s. Unos veinticinco por hora. */
export const RUEDA_A = 7;

/** A cuánto del suelo va un avión con las ruedas en el asfalto, m. */
const EN_TIERRA = 1.5;

/** Cuánto se aparta del eje quien espera o quien acaba de dejar la pista, m. */
const FUERA_DEL_ASFALTO = 45;

/** Cuánto antes del umbral está el punto de espera, m. */
const ANTES_DEL_UMBRAL = 90;

/** Lo largo que es un camino, m. */
export function largoDelCamino(puntos: readonly Sitio[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}

/**
 * Dónde se está y hacia dónde se mira con `metros` recorridos del camino.
 *
 * Pasado el final se queda en el final, que es lo que hace un avión al que
 * nadie vuelve a nombrar: se ha ido, y el módulo lo retira solo.
 */
export function porElCamino(
  puntos: readonly Sitio[],
  metros: number,
): { sitio: Sitio; rumbo: number } | null {
  if (puntos.length === 0) return null;
  if (puntos.length === 1) return { sitio: puntos[0]!, rumbo: 0 };
  let queda = Math.max(0, metros);
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (queda <= d || i === puntos.length - 1) {
      const t = d > 0 ? Math.max(0, Math.min(1, queda / d)) : 1;
      return {
        sitio: {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
        },
        rumbo: Math.atan2(b.x - a.x, -(b.z - a.z)),
      };
    }
    queda -= d;
  }
  return { sitio: puntos[puntos.length - 1]!, rumbo: 0 };
}

/**
 * Los caminos de este aeródromo y las marcas de cada llamada.
 *
 * Dos caminos y no uno: el que llega y el que sale. Se cruzan en el umbral,
 * como en un aeródromo de verdad.
 */
export function caminosDe(
  runway: Pista,
  cota: number,
  mano: Mano = "izquierda",
  escala = 1,
  altura?: number,
): Record<string, Marca> {
  return trazar(runway, cota, mano, escala, altura)?.marcas ?? {};
}

/**
 * Todo lo que el tráfico necesita saber de este aeródromo: las marcas, y los
 * dos finales posibles de una llegada.
 */
export interface Caminos {
  readonly marcas: Record<string, Marca>;
  /** El que llega con permiso: se posa, frena y sale por el costado. */
  readonly llegada: Sitio[];
  /**
   * **Y el que llega sin él**: el mismo camino hasta la altura de decisión, y
   * de ahí al aire y otra vez al circuito. Sin permiso no se toca la pista.
   */
  readonly sinPermiso: Sitio[];
  /** Metros de los dos caminos hasta la altura de decisión, que comparten. */
  readonly decide: number;
  /**
   * Metros de los dos caminos hasta la **entrada en final**: el vértice en el
   * que la base se vuelve final, que es donde gira quien vuela el circuito que
   * enseña el juego. Ver `BASE_A_FINAL` en `circuito.ts`.
   */
  readonly entra: number;
  /** Metros de `llegada` hasta tocar la pista. */
  readonly toca: number;
  /** Lo largo de `llegada`: al acabarlo, ya está fuera de la pista. */
  readonly fuera: number;
}

/** Lo que devuelve `paso` cuando nadie se ha ido al aire, que es casi siempre. */
const NADIE: string[] = [];

/**
 * A cuánto rueda por la pista el que acaba de tocar, sobre lo que volaba.
 *
 * La mitad, que es lo que llevaba la marca de «pista libre» cuando lo ponía en
 * la toma: la carrera se ve igual que antes. Lo que cambia es que ya no se le
 * devuelve a la toma a media carrera, porque la frase espera a que salga.
 */
const FRENANDO = 0.5;

/** Los caminos de este aeródromo, con los dos finales de una llegada. */
export function trazar(
  runway: Pista,
  cota: number,
  mano: Mano = "izquierda",
  escala = 1,
  /**
   * La altura del circuito, la que pide el terreno. Sin ella, la de
   * costumbre: ver `formaDelCircuito`. Los de la radio vuelan el mismo
   * circuito que se dibuja, también cuando sube por una ladera.
   */
  altura?: number,
): Caminos | null {
  const v = verticesDelCircuito(runway, cota, mano, escala, altura);
  const [umbral, arriba, lejos, esquina, entrada] = v;
  if (!umbral || !arriba || !lejos || !esquina || !entrada) return null;

  // Los dos ejes de la pista, sacados de los propios vértices. Con las cuentas
  // escritas otra vez aquí, el día que el circuito cambie de mano el tráfico
  // se quedaría volando por el lado de ayer.
  const haciaDelante = unitario(umbral, arriba);
  const haciaElLado = unitario(arriba, lejos);
  const en = (a: number, l: number, alto: number): Sitio => ({
    x: umbral.x + haciaDelante.x * a + haciaElLado.x * l,
    y: cota + alto,
    z: umbral.z + haciaDelante.z * a + haciaElLado.z * l,
  });

  const lejosDelCampo = en(-ANTES_DEL_UMBRAL, FUERA_DEL_ASFALTO * 8, EN_TIERRA);
  const espera = en(-ANTES_DEL_UMBRAL, FUERA_DEL_ASFALTO, EN_TIERRA);
  const enElEje = en(0, 0, EN_TIERRA);
  /*
   * **Y quien llega se posa pasado el umbral de aterrizaje**, no en la punta.
   * Con el umbral desplazado, el asfalto de antes es para rodar y despegar:
   * el que sale se alinea en la punta y usa la pista entera, y el que llega
   * cruza las flechas por el aire. Sin desplazado es la punta, como siempre.
   * Ver `umbral-desplazado.ts`.
   */
  const desplazado = desplazadoDe(runway);
  const aterriza = en(desplazado, 0, 0);
  const paraTocar = runway.length - desplazado;
  const toma = en(desplazado + paraTocar * 0.25, 0, EN_TIERRA);
  const salida = en(
    desplazado + paraTocar * 0.6,
    FUERA_DEL_ASFALTO,
    EN_TIERRA,
  );

  /*
   * **El que llega**: el tramo largo, la base, el final, la toma y la salida.
   * Es el circuito del juego con la carrera de frenado pegada al final.
   */
  const llegada = [lejos, esquina, entrada, aterriza, toma, salida];
  /*
   * **Y la altura de decisión, en su senda.** Es la de verdad, la de los
   * mínimos —ver `ALTURA_DE_DECISION`—, y cae en el tramo recto de la entrada
   * en final al umbral de aterrizar, así que los dos caminos son el mismo
   * hasta ahí y pasar de uno a otro antes no mueve el avión ni un metro.
   */
  const alEntrar = entrada.y - cota;
  const hastaDecidir =
    alEntrar > ALTURA_DE_DECISION ? 1 - ALTURA_DE_DECISION / alEntrar : 0;
  const decision: Sitio = {
    x: entrada.x + (aterriza.x - entrada.x) * hastaDecidir,
    y: entrada.y + (aterriza.y - entrada.y) * hastaDecidir,
    z: entrada.z + (aterriza.z - entrada.z) * hastaDecidir,
  };
  const sinPermiso = [lejos, esquina, entrada, decision, arriba, lejos, esquina];
  const decide = largoDelCamino([lejos, esquina, entrada, decision]);
  /** **El que sale**: del aparcamiento a la espera, al eje, y arriba. */
  const salidaDelCampo = [lejosDelCampo, espera, enElEje, arriba];
  /** **Y el que se va al aire**: pasa sobre la pista y vuelve al circuito. */
  const alAire = [umbral, arriba, lejos];

  /*
   * **La velocidad crece con el circuito, no con el tramo.** El circuito de un
   * reactor es cuatro veces más grande porque el reactor vuela cuatro veces
   * más deprisa —ver `escalaDeCircuito`—, así que su tráfico también; y las
   * marcas se separan con él, que es lo que las mantiene a una llamada de
   * distancia en cualquier avión.
   */
  const vuela = VUELA_A * escala;
  // La toma, de donde se cuenta hacia atrás: es el único punto del circuito
  // que está donde está y no admite discusión.
  const enLaToma = largoDelCamino([lejos, esquina, entrada, aterriza]);
  /*
   * **Y la entrada en final, que es donde se canta «en final».**
   *
   * La marca se contaba un hueco de radio —cincuenta segundos de vuelo—
   * hacia atrás desde la toma, y eso son dos mil metros por escala donde la
   * final del circuito mide mil ochocientos: el que decía «en final» estaba
   * todavía en la base, doscientos metros antes de girar — justo donde gira
   * a final quien vuela el circuito del juego. La radio lo daba por delante
   * de ti en final con el avión dibujado a tu lado o detrás. Ahora «en
   * final» se dice en final.
   */
  const enFinal = largoDelCamino([lejos, esquina, entrada]);
  /*
   * **Y el viento en cola, lo bastante antes para que «en final» no llegue
   * tarde nunca.** La frase de final espera a que el avión haya girado —ver
   * `todaviaNo`—, así que adelantarse no puede; lo que puede es llegar tarde,
   * con el avión ya por media senda, y si llega pasada la altura de decisión
   * no llega: el que va sin permiso se va al aire sin haberla dicho. Con el
   * viento en cola a lo más que tarda la radio en la llamada siguiente —la
   * espera más larga, y la respuesta de la torre si le autoriza entre
   * medias—, la frase siempre espera al avión y suena al girar.
   *
   * Y cae donde la dice un piloto de verdad: a la altura de la cabecera.
   */
  const deColaAFinal = vuela * (ESPERA_MAXIMA + RESPUESTA_MAXIMA);
  const volando = (metros: number): Marca => ({
    camino: llegada,
    metros: Math.max(0, metros),
    velocidad: vuela,
  });
  const rodando = (camino: Sitio[], metros: number, tope?: number): Marca => ({
    camino,
    metros,
    velocidad: RUEDA_A,
    tope,
  });
  const hastaLaEspera = largoDelCamino([lejosDelCampo, espera]);
  const hastaElEje = largoDelCamino([lejosDelCampo, espera, enElEje]);

  const marcas: Record<string, Marca> = {
    // Rodando a la cabecera: llega al punto de espera justo al hablar.
    "otro.buenosDias": rodando(salidaDelCampo, 0, hastaLaEspera),
    "otro.rodando": rodando(salidaDelCampo, 0, hastaLaEspera),
    // «Line up and wait»: se mete en la pista y ahí se queda.
    "torre.lineUpWait": rodando(salidaDelCampo, hastaLaEspera, hastaElEje),
    // Autorizado a despegar: desde el eje, y ya a velocidad de vuelo.
    "torre.clearedTakeoff": {
      camino: salidaDelCampo,
      metros: hastaElEje,
      velocidad: vuela,
    },
    // Las de quien llega: «en final» al entrar en ella, y el viento en cola
    // con tiempo para que esa frase no llegue tarde. Ver `deColaAFinal`.
    "otro.enCola": volando(enFinal - deColaAFinal),
    "otro.final": volando(enFinal),
    /*
     * Y «pista libre» se dice **fuera de la pista**, que es lo que quiere
     * decir. Se ponía en la toma y desde ahí rodaba minuto y medio por el
     * asfalto que acababa de dejar libre, y con la torre esperando a esa
     * frase para darle la pista a otro, se la daba con este encima. Ahora la
     * frase espera a que el avión dibujado haya salido —ver `sigueEnLaPista`—,
     * así que al que ya se ve no se le mueve; y al que no se veía se le pone
     * donde se dice: fuera, en el costado.
     *
     * La carrera de frenado **no es rodar**: se toca a velocidad de vuelo y
     * se sale por el costado mil metros después, a la mitad de lo que se
     * volaba. Ver `FRENANDO`.
     */
    "otro.pistaLibre": {
      camino: llegada,
      metros: largoDelCamino(llegada),
      velocidad: RUEDA_A,
    },
    /*
     * Y al aire otra vez. **Aquí el guion va por delante de la geometría**: la
     * frustrada canta viento en cola una sola llamada después, y en cuarenta
     * segundos nadie da media vuelta a un circuito. El avión sube, y a la
     * llamada siguiente reaparece en el viento en cola. Es el único sitio
     * donde se ve un tirón, y se prefiere a que la radio mienta.
     *
     * Este camino es el de quien **no estaba dibujado**. Al que ya se ve se
     * le manda al aire desde donde esté: ver `alAireDesde`.
     */
    "torre.goAround": { camino: alAire, metros: 0, velocidad: vuela },
  };
  return {
    marcas,
    llegada,
    sinPermiso,
    decide,
    entra: enFinal,
    toca: enLaToma,
    fuera: largoDelCamino(llegada),
  };
}

/**
 * La orden de irse al aire, **desde donde está quien la recibe**.
 *
 * El camino de `torre.goAround` sale del umbral, y con el guion de la
 * frustrada eso era un tirón aceptado: la orden llega pocos segundos después
 * de cantar final, así que el avión ya estaba cerca. Desde que la torre manda
 * al aire al que tenía la pista en cuanto pasa a ser tuya —ver
 * `despejarLaPista` en `flight/radio.ts`—, la orden le puede llegar en
 * cualquier punto del circuito, y salía del umbral de tu pista, delante de ti,
 * un avión que un instante antes estaba en el viento en cola. Ahora sube de
 * donde está y sigue por el mismo camino hacia arriba.
 */
export function alAireDesde(marca: Marca, sitio: Sitio): Marca {
  return {
    camino: [sitio, ...marca.camino.slice(1)],
    metros: 0,
    velocidad: marca.velocidad,
  };
}

/** El unitario que va de un punto a otro, en el plano. */
function unitario(a: Sitio, b: Sitio): { x: number; z: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: dx / d, z: dz / d };
}

/**
 * Lo que tarda en irse un avión al que nadie nombra, s.
 *
 * **No es un número a ojo: cae entre dos de la frecuencia y por eso funciona.**
 * Estaba en doscientos y el banco contó cuatro aviones dibujados con dos en la
 * frecuencia. La cuenta es esta: cuando alguien termina su vuelo se va y pasan
 * `ESPERA_ENTRE_VUELOS` hasta que llega otro con otra matrícula, así que con un
 * plazo más largo que esa espera el que se fue **sigue dibujado cuando aparece
 * su relevo**, y se acumulan. Y con uno más corto que `ESPERA_MAXIMA` —el hueco
 * más largo que puede haber entre dos llamadas suyas— desaparecería a mitad de
 * su propio vuelo, que es peor.
 *
 * O sea que el plazo tiene que caer entre las dos, y aquí se pone en medio. Se
 * importan las dos y no se copian: son de la radio, y este módulo existe
 * justamente para no contradecirla. Ver `flight/radio.ts`.
 */
export const SE_VA_A_LOS = (ESPERA_MAXIMA + ESPERA_ENTRE_VUELOS) / 2;

interface Volando {
  readonly grupo: Group;
  marca: Marca;
  recorrido: number;
  /** Cuánto lleva sin que nadie lo nombre. */
  olvidado: number;
  /**
   * Si la torre le ha dicho «cleared to land». Lo sabe la frecuencia, que es
   * quien se lo dice: ver `puedeAterrizar` en `flight/radio.ts`.
   */
  conPermiso: boolean;
}

export interface Trafico {
  readonly grupo: Group;
  /**
   * Alguien acaba de decir algo: se le pone donde dice estar.
   *
   * `puedeAterrizar` es si, dicho esto, tiene permiso para aterrizar: sin él,
   * el que llega vuela su circuito igual pero se va al aire en la altura de
   * decisión. Ver `Caminos.sinPermiso`.
   */
  anuncia(matricula: string, clave: string, puedeAterrizar?: boolean): void;
  /**
   * Pasa el tiempo. Devuelve las matrículas de los que acaban de llegar a la
   * altura de decisión **sin permiso** y se han ido al aire, para que la
   * frecuencia lo sepa. Ver `seFueAlAire` en `flight/radio.ts`.
   */
  paso(dt: number): string[];
  /**
   * Si el de esa matrícula viene a aterrizar y todavía no ha salido de la
   * pista. Hasta entonces no puede decir «pista libre».
   */
  sigueEnLaPista(matricula: string): boolean;
  /**
   * Si el avión dibujado de esa matrícula **todavía no está donde esa llamada
   * dice que está**: «en final» sin haber girado a final, «pista libre» sin
   * haber salido de la pista. Quien no se ve, está donde diga.
   *
   * Es lo que espera la frecuencia antes de dejarle hablar —ver `todaviaNo`
   * en `flight/radio.ts`—: lo dicho y lo dibujado son el mismo vuelo, y la
   * frase no se adelanta al avión.
   */
  todaviaNo(matricula: string, clave: string): boolean;
  /**
   * **Cuánto le queda para el umbral de aterrizar** al de esa matrícula, m, si
   * se le ve volando la final —ya girado de la base— o posado en la pista sin
   * haberla dejado todavía, que es cero. `null` si no se le ve ahí.
   *
   * Es lo que decide si va **delante de ti** en final: ver `numeroDos` en
   * `flight/turno-de-pista.ts`.
   */
  enFinal(matricula: string): number | null;
  /** Cuántos se ven, y dónde. Para el banco. */
  quienes(): {
    matricula: string;
    x: number;
    y: number;
    z: number;
    /** Si viene a aterrizar con permiso. */
    conPermiso: boolean;
    /** Si va por el camino de llegada, con permiso o sin él. */
    llegando: boolean;
  }[];
  dispose(): void;
}

/**
 * El tráfico de este aeródromo.
 *
 * `silueta` decide qué pinta tienen, y **no es la del avión que se vuela**:
 * eso sería un espejo. Es otro de la flota, para que se note que es otro.
 */
export function crearTrafico(
  runway: Pista,
  cota: number,
  silueta: Silueta,
  mano: Mano = "izquierda",
  escala = 1,
  altura?: number,
): Trafico {
  const grupo = new Group();
  grupo.name = "trafico";
  const caminos = trazar(runway, cota, mano, escala, altura);
  const marcas = caminos?.marcas ?? {};
  const aviones = new Map<string, Volando>();
  let geometria: BufferGeometry | null = null;

  const cuerpo = (): Object3D => {
    /*
     * Una geometría para todos: son dos como mucho —ver `CUANTOS`— y aun así
     * fabricar un avión entero por cada llamada sería pagar un tirón de
     * fotogramas por algo que está a dos kilómetros.
     */
    geometria ??= fabricarAeronave(
      silueta,
      { envergadura: 11, cuerda: 1.5, tren: 0.9 },
      { body: 0xe7e3d8, accent: 0x8f99a2, trim: 0x39403a },
    ).geometria;
    return new Mesh(geometria, new MeshLambertMaterial({ vertexColors: true }));
  };

  /** Si va por el camino de quien aterriza y todavía no ha salido de la pista. */
  const aterrizando = (quien: Volando): boolean =>
    !!caminos &&
    quien.marca.camino === caminos.llegada &&
    quien.recorrido < caminos.fuera - 0.5;

  /** Si viene a aterrizar, con permiso o sin él. */
  const llegando = (quien: Volando): boolean =>
    !!caminos &&
    (quien.marca.camino === caminos.llegada ||
      quien.marca.camino === caminos.sinPermiso);

  /** Si viene a aterrizar y todavía no ha girado a final. */
  const enLaBase = (quien: Volando): boolean =>
    !!caminos && llegando(quien) && quien.recorrido < caminos.entra;

  /**
   * Si ya vuela la final —girado de la base y antes de la decisión o la
   * toma—, o está en la pista. Por el camino de la llegada, con permiso o sin
   * él; pasada la decisión sin permiso ya se está yendo al aire.
   */
  const yaEnFinal = (quien: Volando): boolean =>
    !!caminos &&
    llegando(quien) &&
    quien.recorrido >= caminos.entra &&
    (quien.marca.camino === caminos.llegada || quien.recorrido < caminos.decide);

  /*
   * **Sin permiso, por el camino que no toca la pista.** Hasta la altura de
   * decisión los dos caminos son el mismo, así que cambiar de uno a otro antes
   * de llegar a ella no mueve el avión: el permiso puede llegar en cualquier
   * momento del circuito, y llega sin tirones.
   */
  const porSuCamino = (marca: Marca, conPermiso: boolean): Marca => {
    if (!caminos || marca.metros >= caminos.decide) return marca;
    if (!conPermiso && marca.camino === caminos.llegada)
      return { ...marca, camino: caminos.sinPermiso };
    if (conPermiso && marca.camino === caminos.sinPermiso)
      return { ...marca, camino: caminos.llegada };
    return marca;
  };

  return {
    grupo,
    anuncia(matricula, clave, puedeAterrizar = false) {
      const marca = marcas[clave];
      let quien = aviones.get(matricula);
      if (quien) quien.conPermiso = puedeAterrizar;
      if (!marca) {
        /*
         * Que no lo mueva no quiere decir que no lo nombre. A quien le dicen
         * «hold short» sigue estando ahí, y estaba a punto de esfumarse.
         *
         * Y el «cleared to land» tampoco lo mueve, pero lo cambia de camino:
         * con permiso, el que venía a irse al aire en la decisión aterriza.
         */
        if (quien) {
          quien.olvidado = 0;
          if (quien.recorrido < (caminos?.decide ?? 0))
            quien.marca = porSuCamino(quien.marca, quien.conPermiso);
        }
        return;
      }
      const yaSeVeia = !!quien;
      /*
       * «Pista libre» a quien ya se ve: lo dice al salir —ver
       * `sigueEnLaPista`—, así que ya está donde tiene que estar. Ponerlo en
       * la marca lo devolvería al asfalto.
       */
      if (quien && clave === "otro.pistaLibre") {
        quien.olvidado = 0;
        return;
      }
      /*
       * **Y «en final» a quien ya se ve en final, tampoco.** La frase espera a
       * que haya girado —ver `todaviaNo`—, pero la frecuencia puede tenerla
       * callada más rato, contigo en final, y para entonces el avión va por
       * media senda: ponerlo en la marca lo devolvía a la entrada en final, a
       * veces por detrás de ti. Se le cambia de camino si cambió su permiso,
       * que antes de la decisión no lo mueve, y se queda donde está.
       */
      if (quien && clave === "otro.final" && yaEnFinal(quien)) {
        quien.olvidado = 0;
        if (quien.recorrido < (caminos?.decide ?? 0))
          quien.marca = porSuCamino(quien.marca, quien.conPermiso);
        return;
      }
      if (!quien) {
        const g = new Group();
        g.name = "trafico-avion";
        g.add(cuerpo());
        grupo.add(g);
        quien = {
          grupo: g,
          marca,
          recorrido: marca.metros,
          olvidado: 0,
          conPermiso: puedeAterrizar,
        };
        aviones.set(matricula, quien);
      }
      const p = quien.grupo.position;
      const esta =
        clave === "torre.goAround" && yaSeVeia
          ? alAireDesde(marca, { x: p.x, y: p.y, z: p.z })
          : porSuCamino(marca, quien.conPermiso);
      quien.marca = esta;
      quien.recorrido = esta.metros;
      quien.olvidado = 0;
      colocar(quien);
    },
    paso(dt) {
      let seFueron: string[] | null = null;
      for (const [matricula, quien] of aviones) {
        /*
         * **Y el que está aterrizando no se olvida.** Entre su «en final» y
         * su «pista libre» pasa lo que tarda en posarse y salir de la pista,
         * que es más que el plazo de olvido: se esfumaba rodando por el
         * asfalto y reaparecía en el costado al decir que la dejaba libre.
         */
        quien.olvidado = aterrizando(quien) ? 0 : quien.olvidado + dt;
        if (quien.olvidado > SE_VA_A_LOS) {
          grupo.remove(quien.grupo);
          aviones.delete(matricula);
          continue;
        }
        // Posado, frena: la carrera se hace a la mitad de lo que volaba.
        const frena =
          !!caminos &&
          quien.marca.camino === caminos.llegada &&
          quien.recorrido >= caminos.toca;
        const antes = quien.recorrido;
        quien.recorrido = Math.min(
          antes + quien.marca.velocidad * (frena ? FRENANDO : 1) * dt,
          quien.marca.tope ?? Infinity,
        );
        if (
          caminos &&
          quien.marca.camino === caminos.sinPermiso &&
          antes < caminos.decide &&
          quien.recorrido >= caminos.decide
        )
          (seFueron ??= []).push(matricula);
        colocar(quien);
      }
      // Casi siempre nadie: sin lista nueva en cada fotograma.
      return seFueron ?? NADIE;
    },
    sigueEnLaPista(matricula) {
      const quien = aviones.get(matricula);
      return !!quien && aterrizando(quien);
    },
    todaviaNo(matricula, clave) {
      const quien = aviones.get(matricula);
      if (!quien) return false;
      if (clave === "otro.pistaLibre") return aterrizando(quien);
      if (clave === "otro.final") return enLaBase(quien);
      return false;
    },
    enFinal(matricula) {
      const quien = aviones.get(matricula);
      if (!quien || !caminos || !aterrizando(quien)) return null;
      if (quien.recorrido < caminos.entra) return null;
      return Math.max(0, caminos.toca - quien.recorrido);
    },
    quienes() {
      return [...aviones].map(([matricula, quien]) => ({
        matricula,
        x: quien.grupo.position.x,
        y: quien.grupo.position.y,
        z: quien.grupo.position.z,
        conPermiso: quien.conPermiso,
        llegando: llegando(quien),
      }));
    },
    dispose() {
      for (const quien of aviones.values()) grupo.remove(quien.grupo);
      aviones.clear();
      geometria?.dispose();
      geometria = null;
    },
  };
}

function colocar(quien: Volando): void {
  const donde = porElCamino(quien.marca.camino, quien.recorrido);
  if (!donde) return;
  quien.grupo.position.set(donde.sitio.x, donde.sitio.y, donde.sitio.z);
  /*
   * **Y el giro del modelo es el rumbo negado, no el rumbo.**
   *
   * `porElCamino` devuelve un **rumbo de brújula** —la misma cuenta que
   * `rumboHacia`, `atan2(dx, -dz)`— y eso no es lo que pide `rotation.y`. Con
   * el morro del modelo mirando a −Z, girar un objeto para que apunte a un
   * rumbo pide el ángulo contrario; es la misma cuenta que ya hace la sombra
   * del avión del jugador: `blobShadow.rotation.y = -state.heading`.
   *
   * Con el signo cambiado el avión no queda al revés, queda **espejado en el
   * eje norte-sur**: acierta yendo al norte y al sur y falla en todo lo demás,
   * que en pantalla se ve como un avión rodando de medio lado. Dicho jugando:
   * «esa avioneta que se ve rodando de medio lado ya me dirás lo que
   * significa».
   *
   * Que acierte en dos de los cuatro rumbos cardinales es lo que lo hizo
   * durar: mirando una captura cualquiera hay una de cada dos de que parezca
   * bien. La conversión vive en `giroDelModelo`, con nombre y con prueba,
   * porque el fallo fue confundir dos números que se parecen.
   */
  quien.grupo.rotation.y = giroDelModelo(donde.rumbo);
}
