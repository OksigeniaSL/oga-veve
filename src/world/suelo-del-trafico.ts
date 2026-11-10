/**
 * **Por dónde rueda el tráfico dibujado**: por las calles del aeródromo, no
 * por la hierba.
 *
 * El otro avión se posaba, frenaba y «salía por el costado»: un punto a
 * cuarenta y cinco metros del eje, en diagonal y campo a través. Y el que iba a
 * despegar esperaba en otro punto inventado, en la hierba junto a la cabecera.
 * Se vio jugando en Silvio Pettirossi, dos veces: «vino esta avioneta por el
 * jardín», y después de volver a empezar, la misma avioneta **parada en la
 * hierba** a la izquierda del punto de espera, con la mano roja encendida.
 *
 * Un aeródromo se señaliza como uno de verdad y se usa como uno de verdad: el
 * que aterriza sale de la pista por una calle de salida y rueda por las calles
 * hasta la plataforma, y el que sale rueda desde la plataforma hasta un punto
 * de espera **pintado en una calle**. El grafo de calles es el mismo que usa
 * la raya verde de quien juega —ver `rodaje.ts`—, así que por construcción es
 * asfalto.
 *
 * Esto no sabe de three.js ni de la radio: devuelve caminos en coordenadas del
 * mundo y ya está. Quien los recorre es `trafico.ts`.
 */

import { enElPavimento, type Aerodrome, type Punto } from "./aerodrome";
import {
  esPuestoDeContacto,
  largoPorLaBatalla,
  rumboEnElPuesto,
  trayectoriaDelEmpuje,
  vector,
  type Empuje,
} from "./remolque";
import { construirGrafo, rodajeEntre, rodajesDesde, type Tramo } from "./rodaje";
import { delante, enEjesDePista } from "./rumbo";
import { desplazadoDe } from "./umbral-desplazado";
import { umbralPublicado } from "./umbrales-publicados";
import {
  cabeceraPorRumbo,
  calleDeLaBoca,
  desdeLaInterseccion,
} from "./salidas-por-interseccion";

/** Un punto del mundo en el plano. */
export interface EnElPlano {
  readonly x: number;
  readonly z: number;
}

/** La pista en uso, en coordenadas del mundo y con su cabecera. */
export interface PistaEnUso {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly length: number;
  readonly desplazado?: number;
}

/**
 * Unos sitios del mundo por los que no se quiere pasar, y a cuánto de ellos.
 * Es `Ocupados` de `rodaje.ts` en los ejes del mundo.
 */
export interface OcupadosEnElMundo {
  readonly puntos: readonly EnElPlano[];
  readonly radio: number;
}

/** Lo que el tráfico necesita del suelo de este aeródromo. */
export interface SueloDelTrafico {
  /**
   * Para el que aterriza: la calle por la que sale y el camino hasta su
   * puesto, empezando **sobre el eje** en la boca de la salida. `pista` son
   * los metros de ese camino hasta pasar la doble raya de la salida: a partir
   * de ahí ya la ha dejado libre. Ver `DOBLE_RAYA`.
   *
   * `desdeElUmbral` es dónde puede ya salir, contado desde el umbral de
   * aterrizar: lo que tarda su tipo en frenar hasta velocidad de rodaje.
   */
  llegada(
    desdeElUmbral: number,
    evitar?: readonly EnElPlano[],
    /**
     * Por dónde no pasar si hay otra: tu avión y la raya por la que vas. Ver
     * `OCUPADA_CUESTA`.
     */
    ocupados?: OcupadosEnElMundo,
    /**
     * **Si embarca por pasarela**, la batalla del avión: entonces va a un puesto
     * de contacto, si el campo tiene alguno para su largo, y entra en él por su
     * raya, con el morro al edificio. Ver `alPuestoPorSuRaya`.
     */
    pasarela?: { readonly batalla: number },
    /** Los puestos que ya tienen otros aviones del tráfico. Ver `PuestosDeOtros`. */
    deOtros?: PuestosDeOtros,
  ): {
    /** Metros desde el umbral de aterrizar hasta la boca de la salida. */
    readonly boca: number;
    readonly camino: readonly EnElPlano[];
    readonly pista: number;
  } | null;
  /**
   * Para el que sale: del puesto a la doble raya de una calle que entra en la
   * pista, y de ahí al eje. `espera` son los metros hasta la doble raya y
   * `eje`, hasta el punto del eje donde se alinea.
   */
  salida(
    evitar?: readonly EnElPlano[],
    /**
     * Por dónde va a rodar quien juega: la doble raya del que sale no puede
     * caer encima. Ver `PASA_A_TU_LADO`.
     */
    porDondeVas?: readonly EnElPlano[],
    /**
     * La pista que tiene que quedarle por delante para despegar, m: la de su
     * tipo con el margen de su clase. Sin ella, cualquiera de las bocas de
     * `BOCAS_DE_SALIDA`. Ver `pistaQuePideConSuMargen` en `trafico.ts`.
     */
    pistaQueNecesita?: number,
    /**
     * **Si embarca por pasarela**, la batalla del avión: entonces sale de un
     * puesto de contacto, si el campo tiene alguno para su largo, y de ahí sale
     * empujado por un tractor, de espaldas, hasta la calle. Ver `empujado`.
     */
    pasarela?: { readonly batalla: number },
    /** Los puestos que ya tienen otros aviones del tráfico. Ver `PuestosDeOtros`. */
    deOtros?: PuestosDeOtros,
  ): SalidaDelPuesto | null;
  /**
   * **Si entre la plataforma y la pista no hay más que una calle**: todo lo
   * que va de un puesto a la pista pasa por la doble raya del que sale, y no
   * hay por dónde rodearle.
   *
   * Es Encarnación, La Gomera y Pedro Juan Caballero, y no se pone a mano: se
   * mide con el mismo buscador que traza la raya verde. Se pone al que sale
   * esperando en su doble raya y se busca ruta de cada salida de pista a cada
   * puesto rodeándole; si ninguna puede, la calle es una. Ahí la raya verde
   * no puede rodear a nadie, y lo que hace la torre es no mover dos aviones a
   * la vez por ella. Ver `Momento.calleOcupada` en `flight/radio.ts`.
   */
  unaSolaCalle(): boolean;
}

/**
 * **Los puestos que ya son de otro**, y la semiala de quien busca uno. En un
 * aeropuerto cada puesto es de un avión: el que sale lo tiene hasta que lo deja
 * y el que llega, desde que se le asigna. Y uno al lado vale si las alas no se
 * tocan, con el margen de un puesto (`MARGEN_EN_EL_PUESTO`). Ver
 * `puestosDelTrafico` en `trafico.ts`.
 */
export interface PuestosDeOtros {
  readonly semiala: number;
  /** Ya mirando: para la vuelta sin ellos si con ellos no queda ninguno. */
  readonly conTodos?: boolean;
  readonly ocupados: readonly { readonly x: number; readonly z: number; readonly semiala: number }[];
}

/**
 * **Lo que se deja entre las puntas de las alas de dos aviones en puestos de al
 * lado**, m: el de la clave C en un puesto (OACI, Anexo 14, 3.13.6), que es la
 * del mayor del tráfico.
 */
export const MARGEN_EN_EL_PUESTO = 4.5;

/** Si un puesto queda libre de los de otros, con sus alas y su margen. */
export function puestoLibre(x: number, z: number, deOtros: PuestosDeOtros | undefined): boolean {
  if (!deOtros) return true;
  return deOtros.ocupados.every(
    (o) => Math.hypot(o.x - x, o.z - z) >= deOtros.semiala + o.semiala + MARGEN_EN_EL_PUESTO,
  );
}

/** **La salida de un puesto**, del puesto a la doble raya, al eje y alineado. */
export interface SalidaDelPuesto {
  readonly camino: readonly EnElPlano[];
  readonly espera: number;
  readonly eje: number;
  /**
   * **Los metros de pista que remonta** antes de dar la media vuelta y
   * alinearse: cero si entra y despega desde ahí. Ver `remontando`.
   */
  readonly remonta: number;
  /**
   * **Y dónde, en metros de `camino`**, si remonta: `entra`, donde pisa el
   * eje de la pista, y `vira`, donde se acaba la recta y empieza la media
   * vuelta. Es lo que hace falta para rodar la recta a su paso y la vuelta
   * al suyo. Ver `alRemontar` en `trafico.ts`.
   */
  readonly remonte?: { readonly entra: number; readonly vira: number };
  /**
   * **Si sale empujado**: el empuje del tractor, y hasta qué metro de `camino`
   * llega. Los primeros metros del camino son el empuje, de espaldas; desde
   * ahí rueda hacia delante. Ver `empujado`.
   */
  readonly empuje?: { readonly trayectoria: Empuje; readonly hasta: number };
}

/**
 * Lo que se aparta del eje la doble raya de un punto de espera, m.
 *
 * Cuarenta más media pista, como `FUERA_DE_LA_PISTA` en el plan de tierra: es
 * la distancia de un punto de espera de clave C (OACI, Anexo 14, tabla 3-2,
 * noventa metros para una pista de aproximación de precisión; setenta y cinco
 * para visual), recortada a lo que dibujan nuestras calles cortas.
 */
const DOBLE_RAYA = 40;

/**
 * **Los metros en el eje del puesto con los que se entra en él**, por su raya:
 * lo que un avión de línea rueda recto siguiendo la línea de entrada antes de
 * pararse con el morro a la pasarela.
 */
const EN_SU_RAYA = 25;

/** Cada cuánto se apunta un punto del empuje en el camino, m. */
const PASO_DEL_EMPUJE = 4;

/**
 * **Lo que rueda recto al soltarse el tractor**, m, antes de torcer hacia la
 * raya, si la raya le queda de lado: no se tuerce en el sitio.
 */
const RECTO_AL_SOLTARSE = 12;

/** Cuánto hace falta apartarse del eje para estar fuera de la pista, m. */
const FUERA_DEL_EJE = 8;

/**
 * Lo más que puede girar una salida contra el sentido de la carrera, grados.
 * Igual que en el plan de tierra: una salida se toma hacia donde se va.
 */
const GIRO_DE_SALIDA = 100;

/** Metros de calle que se miran para saber hacia dónde sale. */
const PRIMER_TRAMO = 40;

/** Cada cuánto se mira que el camino vaya por asfalto, m. */
const MUESTRA = 5;

/**
 * Lo que se le perdona al camino fuera del asfalto dibujado, m: los ejes de
 * OpenStreetMap se unen en los cruces con un par de metros de juego.
 */
const HOLGURA_DEL_PAVIMENTO = 6;

/**
 * Lo que cuesta, en metros de pista, cada metro que se rueda **por la pista
 * después de la boca** o hacia atrás: el doble, porque es pista ocupada a paso
 * de calle en vez de a velocidad de carrera.
 */
const VOLVER_CUESTA = 2;

/**
 * **Lo que cuesta una salida que pasa por encima de ti**, m: más que cualquier
 * otra que no lo haga. Aterrizando, el tráfico salía por la calle en la que
 * esperabas tú y se quedaba plantado entre tu doble raya y la pista, sin poder
 * pasar ni dejarte pasar: lo que dice una torre es «siga hasta la próxima».
 * Si no hay otra, por ésa, y espera a que pases. Ver `cedeA` en `trafico.ts`.
 */
const OCUPADA_CUESTA = 1e5;

/** Y lo que cuesta una salida que obliga a torcer más de noventa grados, m. */
const TORCER_CUESTA = 150;

/** De cuántas bocas, desde la cabecera, se prueba a salir. */
const BOCAS_DE_SALIDA = 6;

/**
 * Lo más que puede rodar por la propia pista para llegar a su boca de
 * salida, m: más que eso es que ha entrado por otra.
 */
const RODANDO_HASTA_LA_BOCA = 80;

/**
 * Lo que se aparta el tráfico de quien juega al elegir puesto: ni aparca en el
 * suyo ni sale de uno pegado a él, m. Una envergadura larga de las de la flota
 * y su margen. En su doble raya sí espera, en la fila: ver `salida`.
 */
const APARTE_DE_TI = 80;

/**
 * Lo que se aparta la doble raya del tráfico de la raya verde de quien juega,
 * m: las dos semialas —la del reactor del tráfico y la del JAZ 120— y el
 * margen de ala de la clave C. Menos que eso, al pasar por su lado las alas
 * se tocan; es lo que se vio en Los Rodeos, con la raya verde llevando al
 * avión de quien juega contra uno que esperaba en su doble raya.
 */
export const PASA_A_TU_LADO = 17 + 18 + 7.5;

/**
 * **Lo que mide la fila de salida**, m, contado hacia atrás desde tu doble
 * raya: lo que ocupan en la calle el que espera en ella y el de detrás. Ahí el
 * tráfico no se aparta de tu raya: se pone en la cola. Ver `salida`.
 */
const FILA_DE_SALIDA = 120;

/**
 * **Hasta dónde una entrada sigue siendo la de la cabecera**, m desde el
 * principio de la pista: la misma que `EN_LA_CABECERA` en el plan de tierra.
 * Entrando ahí se tiene la pista entera, o casi, y no es una intersección:
 * la regla del AIP de las intersecciones no la mira.
 */
const EN_LA_CABECERA = 150;

/**
 * **Lo más detrás del umbral que puede estar la boca de la cabecera**, m.
 *
 * En Los Rodeos la E-1 llega al asfalto treinta y siete metros antes del
 * umbral de la 12, y la E-5 noventa y cuatro pasado el de la 30, sobre la
 * prolongación pavimentada de la pista. Las bocas se buscaban solo entre los
 * dos umbrales, así que **las dos cabeceras se quedaban sin entrada** y el
 * reactor del tráfico salía por la E3, a media pista. Detrás del umbral de
 * salida y sobre el asfalto de la pista, una calle es la entrada de la
 * cabecera: se entra y se rueda hasta el umbral.
 */
const DETRAS_DEL_UMBRAL = 200;

/** Los puestos que no caen encima de quien juega; si no queda ninguno, todos. */
function lejosDe(
  puestos: readonly Punto[],
  evitar: readonly EnElPlano[] | undefined,
): readonly Punto[] {
  if (!evitar?.length) return puestos;
  const libres = puestos.filter((p) =>
    evitar.every((e) => Math.hypot(p[0] - e.x, -p[1] - e.z) > APARTE_DE_TI),
  );
  return libres.length ? libres : puestos;
}

/** Del plano del fichero (la y al norte) al del mundo (la z al sur). */
const alMundo = (p: Punto): EnElPlano => ({ x: p[0], z: -p[1] });

/**
 * El suelo del tráfico de este aeródromo, o `null` si no tiene calles con las
 * que rodar —un campo inventado o uno de hierba sin calles—: entonces el
 * tráfico hace lo de antes.
 *
 * `semiala` es la media envergadura del tráfico: con ella el grafo encarece
 * los callejones por los que no cabe, igual que para quien juega.
 */
export function sueloDelTrafico(
  aero: Aerodrome,
  pista: PistaEnUso,
  ancho: number,
  semiala = 6,
): SueloDelTrafico | null {
  if (!aero.taxiways?.length) return null;
  const grafo = construirGrafo(aero, semiala);
  if (!grafo.nudos.length) return null;

  const mitad = pista.length / 2;
  const [fx, fz] = delante(pista.heading);
  const ejes = (p: EnElPlano) =>
    enEjesDePista(p.x, p.z, pista.x, pista.z, pista.heading);
  /** El umbral de aterrizar, contado desde el centro hacia atrás. */
  const umbral = -mitad + desplazadoDe(pista);
  const enElEje = (along: number): EnElPlano => ({
    x: pista.x + fx * along,
    z: pista.z + fz * along,
  });

  /** Nudos sobre el asfalto de la pista con alguna calle colgando. */
  const bocas: { nudo: number; along: number; calles: Tramo[] }[] = [];
  grafo.nudos.forEach((n, i) => {
    const { along, across } = ejes(alMundo(n));
    if (Math.abs(across) > ancho / 2) return;
    if (Math.abs(along) > mitad + 5) return;
    const calles = (grafo.desde[i] ?? [])
      .map((t) => grafo.tramos[t]!)
      .filter((t) => !t.pista);
    if (calles.length) bocas.push({ nudo: i, along, calles });
  });
  if (!bocas.length) return null;

  /*
   * **Y las del que sale**, que son las mismas más las de detrás del umbral
   * de salida que caen sobre el asfalto de la pista. Ver `DETRAS_DEL_UMBRAL`.
   */
  const bocasDeSalida = [...bocas];
  grafo.nudos.forEach((n, i) => {
    const { along, across } = ejes(alMundo(n));
    if (Math.abs(across) > ancho / 2) return;
    if (along >= -mitad - 5 || along < -mitad - DETRAS_DEL_UMBRAL) return;
    const tramos = (grafo.desde[i] ?? []).map((t) => grafo.tramos[t]!);
    const calles = tramos.filter((t) => !t.pista);
    if (calles.length && tramos.some((t) => t.pista)) bocasDeSalida.push({ nudo: i, along, calles });
  });

  /*
   * **La cabecera por la que se sale, y lo que dice su AIP.** La TORA es la
   * publicada si la hay —en Fuerteventura por la 19 se pierden los mil metros
   * del final— y, si no, la pista entera.
   */
  const cabecera = cabeceraPorRumbo(aero, pista.heading);
  const toraDeLaCabecera = umbralPublicado(aero.id, cabecera)?.tora ?? pista.length;
  /**
   * **La pista que se tiene por delante entrando por esa boca**, m, y si se
   * puede despegar desde ella: la de la cabecera entrando por la cabecera, y
   * desde una intersección solo si el AIP la deja y con la TORA que publica
   * desde ahí. Cero si el AIP no la deja: desde ahí se entra a remontar,
   * no a despegar. Ver `desdeLaInterseccion`.
   */
  const pistaDesde = (boca: { nudo: number; along: number }): number => {
    if (boca.along + mitad <= EN_LA_CABECERA) return toraDeLaCabecera;
    const aip = desdeLaInterseccion(aero, cabecera, calleDeLaBoca(grafo, boca.nudo));
    if (!aip.permitida) return 0;
    return Math.min(aip.tora ?? mitad - boca.along, toraDeLaCabecera);
  };
  /** Un punto de la pista, a `along` del centro y `lado` metros a la derecha del eje. */
  const enLaPista = (along: number, lado: number): EnElPlano => ({
    x: pista.x + fx * along - fz * lado,
    z: pista.z + fz * along + fx * lado,
  });
  /**
   * **La media vuelta del que remonta**, al principio de la pista: de lo que
   * queda de eje de espaldas al despegue a alineado sobre él, mirando hacia
   * donde se despega.
   *
   * Se rueda por el eje hasta cerca del final, se abre a un lado y se da la
   * vuelta en el ancho de la pista, y se vuelve al eje: es lo que hace un
   * avión de verdad donde no hay apartadero, y lo que manda el AIP de La
   * Palma —«must accomplish back-track at the end of the runway»—. El radio
   * es lo que cabe con las ruedas dentro, sin pasar de veinte metros, que es
   * lo que gira un reactor regional con la rueda de morro.
   */
  const mediaVuelta = (): { puntos: EnElPlano[]; alineado: number } => {
    const r = Math.max(8, Math.min(20, ancho / 2 - 3));
    const centro = -mitad + r + 2;
    const puntos: EnElPlano[] = [enLaPista(centro + 2 * r, 0)];
    for (let k = 0; k <= 8; k++) {
      const a = (k * Math.PI) / 8;
      puntos.push(enLaPista(centro - r * Math.sin(a), -r * Math.cos(a)));
    }
    puntos.push(enLaPista(centro + 2 * r, 0));
    return { puntos, alineado: centro + 2 * r + 10 };
  };

  const puestos = (aero.parkingPositions ?? []).map((p) => p.xy);
  const edificios = aero.buildings ?? [];
  /**
   * **Los puestos de contacto para un avión de esta batalla**, o todos si el
   * campo no tiene ninguno: un avión que embarca por pasarela va a la terminal,
   * como en el plan de quien juega (`PlanDeVuelo.deContacto`). Se miran una vez
   * por batalla.
   */
  const deContacto = new Map<number, readonly Punto[]>();
  const puestosPara = (pasarela: { readonly batalla: number } | undefined): readonly Punto[] => {
    if (!pasarela) return puestos;
    const hecho = deContacto.get(pasarela.batalla);
    if (hecho) return hecho;
    const largoDelAvion = largoPorLaBatalla(pasarela.batalla);
    const suyos = puestos.filter((xy) => esPuestoDeContacto(xy[0], -xy[1], edificios, largoDelAvion));
    const lista = suyos.length ? suyos : puestos;
    deContacto.set(pasarela.batalla, lista);
    return lista;
  };
  /**
   * **Entre qué puestos elige**: los suyos —los de contacto si embarca por
   * pasarela— que no son de otro avión del tráfico; si todos lo son, cualquiera
   * libre; si ni así, uno que al menos no sea el mismo que el de otro. Dos aviones
   * en el mismo puesto se metían el uno dentro del otro.
   */
  const candidatosPara = (
    pasarela: { readonly batalla: number } | undefined,
    deOtros: PuestosDeOtros | undefined,
  ): { readonly lista: readonly Punto[]; readonly deContacto: boolean } => {
    const suyos = puestosPara(pasarela);
    const deContactoDeVerdad = suyos !== puestos;
    if (!deOtros?.ocupados.length) return { lista: suyos, deContacto: deContactoDeVerdad };
    const libres = suyos.filter((xy) => puestoLibre(xy[0], -xy[1], deOtros));
    if (libres.length) return { lista: libres, deContacto: deContactoDeVerdad };
    const otros = puestos.filter((xy) => puestoLibre(xy[0], -xy[1], deOtros));
    if (otros.length) return { lista: otros, deContacto: false };
    const distintos = puestos.filter((xy) => deOtros.ocupados.every((o) => Math.hypot(o.x - xy[0], o.z + xy[1]) > 5));
    return { lista: distintos.length ? distintos : puestos, deContacto: false };
  };

  /** Si el camino empieza o acaba en un puesto de contacto para ese avión. */
  const enUnPuestoDeContacto = (p: EnElPlano, pasarela: { readonly batalla: number }): boolean =>
    puestos.some((xy) => Math.hypot(xy[0] - p.x, -xy[1] - p.z) < 1) &&
    esPuestoDeContacto(p.x, p.z, edificios, largoPorLaBatalla(pasarela.batalla));

  /**
   * **Y entra en él por su raya**, con el morro al edificio: los últimos metros,
   * en el eje del puesto, que es como entra uno de verdad siguiendo la línea de
   * entrada y al señalero. El buscador remataba en recta desde el último nudo, y
   * el avión se quedaba mirando hacia donde viniera. Ver `rumboEnElPuesto`.
   */
  const alPuestoPorSuRaya = (camino: EnElPlano[], pasarela: { readonly batalla: number }): EnElPlano[] => {
    const fin = camino[camino.length - 1];
    if (!fin || camino.length < 3 || !enUnPuestoDeContacto(fin, pasarela)) return camino;
    const rumbo = rumboEnElPuesto(fin.x, fin.z, edificios, [...camino].reverse());
    if (rumbo === null) return camino;
    const v = vector(rumbo);
    const entra = { x: fin.x - v.x * EN_SU_RAYA, z: fin.z - v.z * EN_SU_RAYA };
    // Lo que caía en esos últimos metros se lo salta: se entra por la raya.
    const antes = camino.slice(0, -1).filter((p, i) => i === 0 || dist(p, fin) > EN_SU_RAYA + 2);
    return [...antes, entra, fin];
  };

  /**
   * **Y de un puesto de contacto se sale empujado.** El avión está con el morro
   * al edificio; el tractor lo saca de espaldas por la raya del puesto hasta la
   * calle, girándolo —`trayectoriaDelEmpuje`, la misma que para quien juega—, y
   * desde ahí rueda hacia delante y vuelve a la raya por delante del cruce. Los
   * metros del empuje van al principio del camino, así que todo lo que reserva
   * el camino por delante —los tramos, ceder el paso— ve también por dónde va
   * a pasar empujado. Si no hay por dónde, sale como antes.
   */
  const empujado = (s: SalidaDelPuesto, pasarela: { readonly batalla: number }): SalidaDelPuesto => {
    const camino = s.camino;
    const p0 = camino[0];
    if (!p0 || !enUnPuestoDeContacto(p0, pasarela)) return s;
    const acum: number[] = [0];
    for (let i = 1; i < camino.length; i++) acum.push(acum[i - 1]! + dist(camino[i - 1]!, camino[i]!));
    let k = 1;
    while (k < camino.length - 1 && acum[k]! < s.espera) k++;
    const raya = camino.slice(0, k + 1);
    const rumbo = rumboEnElPuesto(p0.x, p0.z, edificios, raya);
    if (rumbo === null) return s;
    const trayectoria = trayectoriaDelEmpuje({ x: p0.x, z: p0.z, rumbo }, raya, pasarela.batalla);
    if (!trayectoria) return s;
    const fin = trayectoria.poses[trayectoria.poses.length - 1]!;
    const adelante = vector(fin.rumbo);
    // Dónde cae el cruce en el camino, m: lo más cerca de él.
    let enElCruce = 0;
    let cerca = Infinity;
    for (let i = 0; i < camino.length; i++) {
      const d = dist(camino[i]!, trayectoria.cruce);
      if (d < cerca) {
        cerca = d;
        enElCruce = acum[i]!;
      }
    }
    /*
     * Vuelve a la raya por el primer punto pasado el cruce que le queda por
     * delante del morro; si la raya sigue de lado —un puesto que da de frente a
     * una calle—, por el primero pasado el cruce, rodando antes unos metros
     * rectos para no torcer en el sitio.
     */
    const delante = (p: EnElPlano) => (p.x - fin.x) * adelante.x + (p.z - fin.z) * adelante.z;
    let j = -1;
    for (let i = 1; i < camino.length && acum[i]! <= s.espera; i++)
      if (acum[i]! > enElCruce + 1 && delante(camino[i]!) > 12) {
        j = i;
        break;
      }
    if (j < 0)
      for (let i = 1; i < camino.length && acum[i]! <= s.espera; i++)
        if (acum[i]! > enElCruce + 1) {
          j = i;
          break;
        }
    if (j < 0) return s;
    const empuje: EnElPlano[] = [];
    let ultimo: EnElPlano | null = null;
    for (const p of trayectoria.poses)
      if (!ultimo || dist(ultimo, p) >= PASO_DEL_EMPUJE) {
        ultimo = { x: p.x, z: p.z };
        empuje.push(ultimo);
      }
    if (dist(ultimo!, fin) > 0.01) empuje.push({ x: fin.x, z: fin.z });
    const hasta = largo(empuje);
    const hacia = camino[j]!;
    const tuerce = Math.acos(
      Math.max(-1, Math.min(1, delante(hacia) / Math.max(1e-6, dist(fin, hacia)))),
    );
    const recto =
      tuerce > Math.PI / 6 ? [{ x: fin.x + adelante.x * RECTO_AL_SOLTARSE, z: fin.z + adelante.z * RECTO_AL_SOLTARSE }] : [];
    const nuevo = [...empuje, ...recto, ...camino.slice(j)];
    const delta = hasta + largo([fin, ...recto, hacia]) - acum[j]!;
    return {
      camino: nuevo,
      espera: s.espera + delta,
      eje: s.eje + delta,
      remonta: s.remonta,
      ...(s.remonte ? { remonte: { entra: s.remonte.entra + delta, vira: s.remonte.vira + delta } } : {}),
      empuje: { trayectoria, hasta },
    };
  };

  /** Si todo el camino va por asfalto: calle, pista o plataforma. */
  const porElAsfalto = (puntos: readonly Punto[]): boolean => {
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1]!;
      const b = puntos[i]!;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s <= d; s += MUESTRA) {
        const t = d > 0 ? s / d : 0;
        const q: Punto = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (!enElPavimento(aero, q, HOLGURA_DEL_PAVIMENTO)) return false;
      }
    }
    return true;
  };

  /**
   * Una ruta entre un puesto y un punto del grafo, **por asfalto**, de los
   * puestos más cercanos: la más corta que no cruce hierba. El buscador
   * remata en línea recta del último nudo al puesto, y los puestos están en
   * la plataforma, no en las calles: ese remate vale si cae en la plataforma
   * y no vale si cruza el campo.
   */
  const rutaConPuesto = (
    punto: Punto,
    hacia: "puesto" | "punto",
    evitar: readonly EnElPlano[] | undefined,
    ocupados?: OcupadosEnElMundo,
    candidatos: { readonly lista: readonly Punto[]; readonly deContacto: boolean } = { lista: puestos, deContacto: false },
    deOtros?: PuestosDeOtros,
  ): { puntos: Punto[]; ocupada: boolean } | null => {
    const porDondeNo = ocupados?.puntos.length
      ? {
          puntos: ocupados.puntos.map((e): Punto => [e.x, -e.z]),
          radio: ocupados.radio,
        }
      : undefined;
    const cerca = [...lejosDe(candidatos.lista, evitar)]
      .sort(
        (a, b) =>
          Math.hypot(a[0] - punto[0], a[1] - punto[1]) -
          Math.hypot(b[0] - punto[0], b[1] - punto[1]),
      )
      .slice(0, 8);
    let mejor: { puntos: Punto[]; largo: number; ocupada: boolean } | null = null;
    /*
     * Hacia los puestos, de una vez: el buscador corre una vez por origen y
     * cada destino es solo su último trozo. Uno por puesto eran ocho búsquedas
     * por boca, y en Gando volver a elegir la salida al tomar tierra costaba
     * noventa milisegundos —cinco fotogramas— con tu raya que rodear.
     */
    const rutas =
      hacia === "puesto"
        ? rodajesDesde(grafo, punto, cerca, 400, porDondeNo)
        : cerca.map((xy) => rodajeEntre(grafo, xy, punto, 400, porDondeNo));
    for (let k = 0; k < cerca.length; k++) {
      const r = rutas[k];
      if (!r) continue;
      const ocupada = !!r.ocupada;
      // La que no pasa por encima de nadie, y de ésas la más corta.
      if (mejor && (ocupada && !mejor.ocupada)) continue;
      if (mejor && ocupada === mejor.ocupada && r.largo >= mejor.largo) continue;
      /*
       * Y si el remate hasta el puesto cruza campo —hay aeródromos con los
       * puestos dibujados lejos de toda calle y fuera de la plataforma
       * dibujada—, se acaba donde acaba el asfalto: en la última calle de la
       * plataforma, que es donde se le ve aparcar de lejos.
       */
      /*
       * Menos el remate a un puesto de contacto: está pegado a la terminal, en la
       * plataforma, aunque los datos no dibujen el asfalto hasta la fachada —en
       * Barajas no llega—. Si lo demás va por asfalto, el puesto se queda: de ahí
       * se sale empujado y ahí se llega con el morro a la pasarela.
       */
      const sinRemate = hacia === "puesto" ? r.puntos.slice(0, -1) : r.puntos.slice(1);
      const puntos =
        candidatos.deContacto && sinRemate.length >= 2 && porElAsfalto(sinRemate)
          ? [...r.puntos]
          : recortarAlAsfalto([...r.puntos], hacia, porElAsfalto);
      if (!puntos) continue;
      /*
       * Y donde acaba de verdad, libre de los demás: recortado al asfalto, el camino
       * acaba en el último nudo de la plataforma, y ahí dos puestos distintos se
       * quedaban en el mismo sitio.
       */
      const extremo = hacia === "puesto" ? puntos[puntos.length - 1]! : puntos[0]!;
      if (!puestoLibre(extremo[0], -extremo[1], deOtros)) continue;
      mejor = { puntos, largo: r.largo, ocupada };
    }
    return mejor ? { puntos: mejor.puntos, ocupada: mejor.ocupada } : null;
  };

  let unaSola: boolean | undefined;
  const suelo: SueloDelTrafico = {
    llegada(desdeElUmbral, evitar, ocupados, pasarela, deOtros) {
      /*
       * Con los puestos de los demás, si queda alguno libre; si no, como antes, que
       * un avión sin camino no puede aterrizar. Ver `PuestosDeOtros`.
       */
      if (deOtros?.ocupados.length && !deOtros.conTodos)
        return (
          suelo.llegada(desdeElUmbral, evitar, ocupados, pasarela, { ...deOtros, conTodos: true }) ??
          suelo.llegada(desdeElUmbral, evitar, ocupados, pasarela)
        );

      /*
       * **La salida que antes deja la pista libre**, no la primera que hay.
       *
       * Se cogía la primera boca por delante de donde ya rueda despacio, y hay
       * bocas que no llevan a ninguna parte útil: en Guaraní la primera sale
       * a una calle que vuelve a la pista, y el avión rodaba setecientos
       * metros más por el asfalto antes de dejarlo —minuto y medio de roja
       * para quien esperaba—. Se mira cuánto le queda de pista a cada una,
       * contando lo que rueda hasta la boca y lo que sigue pisándola después,
       * y gana la que menos. Hacia delante mejor que hacia atrás, que dar la
       * vuelta en la pista es lo último que se hace; pero se hace —en El
       * Hierro la única calle está en medio—.
       */
      const puede = umbral + desdeElUmbral;
      let mejor: { coste: number; boca: number; camino: EnElPlano[]; pista: number } | null =
        null;
      const hastaLa = (along: number): number =>
        along >= puede ? along - puede : (puede - along) * VOLVER_CUESTA;
      /*
       * De la que menos cuesta llegar a la que más: lo que cuesta llegar a una
       * boca es lo menos que puede costar salir por ella, así que en cuanto
       * una sale bien las de detrás ya no se miran. Es lo que deja volver a
       * elegir al tomar tierra sin que se note: ver `rehacerLaLlegada` en
       * `trafico.ts`.
       */
      const enOrden = [...bocas].sort((a, b) => hastaLa(a.along) - hastaLa(b.along));
      for (const boca of enOrden) {
        const hastaLaBoca = hastaLa(boca.along);
        if (mejor && hastaLaBoca >= mejor.coste) continue;
        const desde = grafo.nudos[boca.nudo]!;
        const hecha = rutaConPuesto(desde, "puesto", evitar, ocupados, candidatosPara(pasarela, deOtros), deOtros);
        if (!hecha) continue;
        const ruta = hecha.puntos;
        const derecho = [enElEje(boca.along), ...ruta.map(alMundo)];
        const camino = pasarela ? alPuestoPorSuRaya(derecho, pasarela) : derecho;
        const enLaPista = hastaSalir(camino, ejes, ancho);
        // Y la deja de verdad: un camino que se queda en la pista, o que
        // vuelve a ella para acabar encima, no vale.
        const fin = ejes(camino[camino.length - 1]!);
        const acabaFuera =
          Math.abs(fin.across) > ancho / 2 + FUERA_DEL_EJE ||
          Math.abs(fin.along) > mitad;
        if (enLaPista >= largo(camino) - 1 || !acabaFuera) continue;
        /*
         * Ni la cruza después de haberla dejado: ya ha dicho «pista libre», y
         * volver a pisarla camino del puesto es meterse en una pista que la
         * torre le está dando a otro —quizá a ti—.
         */
        if (pisaLaPista(camino, enLaPista + 1, Infinity, ejes, ancho, mitad))
          continue;
        const haciaDelante = boca.calles.some((t) =>
          saleHacia(t, grafo.nudos[boca.nudo]!, pista.heading),
        );
        const coste =
          hastaLaBoca +
          enLaPista * VOLVER_CUESTA +
          (haciaDelante ? 0 : TORCER_CUESTA) +
          (hecha.ocupada ? OCUPADA_CUESTA : 0);
        /*
         * **Y la pista queda libre al pasar la doble raya de la salida**, no
         * al asomar las ruedas fuera del asfalto. Se daba por libre a ocho
         * metros del borde, y a esa distancia un turbohélice de veintisiete
         * metros de envergadura todavía tiene media ala sobre la pista: en La
         * Gomera se oía «pista libre» con el otro rodando a mil noventa metros
         * del umbral, a veintitantos del eje. «Pista libre» es haber pasado el
         * punto de espera de la calle, el mismo que respeta quien va a entrar;
         * si el camino no llega tan lejos, cuando acaba. Ver `DOBLE_RAYA`.
         */
        const libre = Math.max(
          enLaPista,
          hastaSalir(camino, ejes, ancho, DOBLE_RAYA),
        );
        if (!mejor || coste < mejor.coste)
          mejor = { coste, boca: boca.along - umbral, camino, pista: libre };
      }
      return mejor
        ? { boca: mejor.boca, camino: mejor.camino, pista: mejor.pista }
        : null;
    },

    salida(evitar, porDondeVas, pistaQueNecesita = 0, pasarela, deOtros) {
      if (deOtros?.ocupados.length && !deOtros.conTodos)
        return (
          suelo.salida(evitar, porDondeVas, pistaQueNecesita, pasarela, { ...deOtros, conTodos: true }) ??
          suelo.salida(evitar, porDondeVas, pistaQueNecesita, pasarela)
        );
      /*
       * Por la boca más cerca de la cabecera de salida —la que deja más pista
       * por delante—: del puesto a la boca por las calles, y en el camino, la
       * doble raya donde la calle ya está a la distancia de un punto de
       * espera. Es la cuenta que usa el plan de tierra para quien juega.
       *
       * **Y en tu misma doble raya, si es la suya: detrás de ti, en la cola.**
       * Aquí se apartaba de tu doble raya a la boca siguiente, y la siguiente
       * queda más lejos de la cabecera: en Guaraní, con la paralela, el
       * reactor salía del puesto hacia la otra punta de la pista mientras tú
       * ibas a la cabecera. «Si los aviones deben ir hacia la cabecera X, ¿por
       * qué este rueda a la cabecera contraria?» Un aeropuerto de verdad no
       * reparte a los que salen por puntos de espera distintos para que no se
       * junten: los pone en fila en el mismo, y el que llega detrás espera.
       * Ahora el tráfico ve a quien juega —ver `cedeA` en `trafico.ts`— y la
       * fila se hace sola, también contigo delante.
       *
       * **Y nunca con menos pista de la que necesita su tipo**, ni desde una
       * intersección que su AIP no deja. Una boca a mitad de pista es una
       * salida por intersección: en Los Rodeos solo desde la E-2 por la 12 y
       * la E-4 por la 30, y un reactor no sale con mil quinientos metros por
       * delante cuando pide dos mil. Ver `pistaDesde`.
       *
       * Lo único que se sigue evitando es esperar **encima de la calle por la
       * que vas a pasar** camino de otra doble raya: eso no es una fila, es un
       * tapón. El final de tu raya —tu doble raya y lo que hay justo antes—
       * es la fila, y ahí sí se espera.
       */
      void evitar;
      const deCabecera = [...bocasDeSalida].sort((a, b) => a.along - b.along);
      const fin = porDondeVas?.[porDondeVas.length - 1];
      const deTuCalle = (porDondeVas ?? []).filter(
        (e) => !fin || dist(e, fin) > PASA_A_TU_LADO + FILA_DE_SALIDA,
      );
      /*
       * Por orden de pista por delante: la primera que se puede rodar y le da
       * su pista. **Y si ninguna se la da, remonta**: entra por la que más
       * cerca queda de la cabecera de las que se pueden rodar, rueda por la
       * pista hasta su principio y da la vuelta allí. Era lo que el tráfico no
       * sabía hacer, y salía desde donde entrara con la pista que quedase: el
       * turbohélice de La Gomera con cuatrocientos metros por la 09, cuando
       * pide mil doscientos; el reactor de La Palma desde media pista, donde
       * el AIP no deja salir por intersección a nadie. Ningún avión despega
       * con menos pista de la que necesita.
       */
      let deReserva: ReturnType<SueloDelTrafico["salida"]> = null;
      let remonte: ReturnType<SueloDelTrafico["salida"]> = null;
      let remonteEncima: ReturnType<SueloDelTrafico["salida"]> = null;
      for (const boca of deCabecera.slice(0, BOCAS_DE_SALIDA)) {
        const daSuPista = pistaDesde(boca) >= pistaQueNecesita;
        if (!daSuPista && remonte) continue;
        const nudo = grafo.nudos[boca.nudo]!;
        const ruta = rutaConPuesto(nudo, "punto", evitar, undefined, candidatosPara(pasarela, deOtros), deOtros)?.puntos;
        if (!ruta) continue;
        const hecha = cortarEnLaRaya(ruta.map(alMundo), ejes, ancho, mitad);
        if (!hecha) continue;
        // Y hasta la raya no pisa la pista: sin permiso no se entra.
        if (pisaLaPista(hecha.hastaLaRaya, 0, Infinity, ejes, ancho, mitad))
          continue;
        const entrada = enElEje(boca.along);
        // De la raya a la pista, por lo que queda de calle, no en diagonal.
        const hastaElEje = [...hecha.resto, entrada];
        const espera = largo(hecha.hastaLaRaya);
        const raya = hecha.hastaLaRaya[hecha.hastaLaRaya.length - 1]!;
        const encimaDeTuCalle = deTuCalle.some((e) => dist(raya, e) <= PASA_A_TU_LADO);
        if (daSuPista) {
          // Y ya en el eje, unos metros hacia donde se despega: alineado; y
          // entrando por detrás del umbral, en el umbral.
          const alineado = enElEje(Math.max(boca.along + 30, -mitad + 5));
          const camino = [...hecha.hastaLaRaya, ...hastaElEje.slice(1), alineado];
          const salida = {
            camino,
            espera,
            eje: espera + largo(hastaElEje) + dist(entrada, alineado),
            remonta: 0,
          };
          if (!encimaDeTuCalle) return pasarela ? empujado(salida, pasarela) : salida;
          deReserva ??= salida;
          continue;
        }
        const vuelta = mediaVuelta();
        const alineado = enElEje(vuelta.alineado);
        const porLaPista = [entrada, ...vuelta.puntos, alineado];
        const entra = espera + largo(hastaElEje);
        const salida = {
          camino: [...hecha.hastaLaRaya, ...hastaElEje.slice(1), ...vuelta.puntos, alineado],
          espera,
          eje: entra + largo(porLaPista),
          remonta: Math.max(0, boca.along - (vuelta.alineado - 10)),
          remonte: { entra, vira: entra + dist(entrada, vuelta.puntos[0]!) },
        };
        if (!encimaDeTuCalle) remonte = salida;
        else remonteEncima ??= salida;
      }
      const hecha = deReserva ?? remonte ?? remonteEncima;
      return hecha && pasarela ? empujado(hecha, pasarela) : hecha;
    },

    unaSolaCalle() {
      if (unaSola !== undefined) return unaSola;
      unaSola = false;
      const sale = suelo.salida();
      if (!sale) return unaSola;
      const raya = aLosMetros(sale.camino, sale.espera);
      const parado: Punto = [raya.x, -raya.z];
      const ocupados = { puntos: [parado], radio: PASA_A_TU_LADO };
      let alguna = false;
      for (const boca of bocas)
        for (const xy of puestos) {
          // Un puesto al lado de la doble raya no dice nada de la calle.
          if (Math.hypot(xy[0] - parado[0], xy[1] - parado[1]) < PASA_A_TU_LADO)
            continue;
          const ruta = rodajeEntre(grafo, grafo.nudos[boca.nudo]!, xy, 400, ocupados);
          if (!ruta) continue;
          alguna = true;
          if (!ruta.ocupada) return unaSola;
        }
      unaSola = alguna;
      return unaSola;
    },
  };
  return suelo;
}

/** El punto de un camino a tantos metros de su principio. */
function aLosMetros(camino: readonly EnElPlano[], metros: number): EnElPlano {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    if (recorrido + d >= metros) {
      const t = d > 0 ? (metros - recorrido) / d : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    recorrido += d;
  }
  return camino[camino.length - 1]!;
}

/**
 * Quita del lado del puesto los puntos que cruzan campo, hasta dos: el remate
 * recto al puesto y, como mucho, el del nudo de antes. Si ni así va por
 * asfalto, `null`.
 */
function recortarAlAsfalto(
  puntos: Punto[],
  hacia: "puesto" | "punto",
  porElAsfalto: (p: readonly Punto[]) => boolean,
): Punto[] | null {
  for (let quitados = 0; quitados <= 2 && puntos.length >= 2; quitados++) {
    if (porElAsfalto(puntos)) return puntos;
    if (hacia === "puesto") puntos.pop();
    else puntos.shift();
  }
  return null;
}

/**
 * El camino hasta la doble raya: se recorre la ruta desde la pista hacia
 * atrás hasta el primer punto a la distancia de un punto de espera, y ahí se
 * corta. `null` si la ruta llega a la pista por encima de ella —desde otra
 * boca, rodando por el asfalto— y no por su calle.
 */
function cortarEnLaRaya(
  ruta: readonly EnElPlano[],
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  mitad: number,
): { hastaLaRaya: EnElPlano[]; resto: EnElPlano[] } | null {
  /*
   * **Por el eje**, que es por donde va la pista en el grafo, y no «cerca de
   * la pista»: una salida rápida se aparta del eje en un ángulo tan cerrado
   * que su raya pasa cien metros dentro de la franja. En Los Rodeos la E-2,
   * la que el AIP deja para salir por la 12, se daba por «rodar por la pista
   * desde otra boca» y no valía nunca.
   */
  const sobreLaPista = (p: EnElPlano): boolean => {
    const e = ejes(p);
    return Math.abs(e.across) < FUERA_DEL_EJE && Math.abs(e.along) <= mitad;
  };
  const aparte = ancho / 2 + DOBLE_RAYA;
  let porLaPista = 0;
  for (let i = ruta.length - 1; i > 0; i--) {
    const b = ruta[i]!;
    const a = ruta[i - 1]!;
    const da = Math.abs(ejes(a).across);
    const db = Math.abs(ejes(b).across);
    if (da >= aparte) {
      const t = da > db ? Math.max(0, Math.min(1, (da - aparte) / (da - db))) : 0;
      const raya = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      return {
        hastaLaRaya: [...ruta.slice(0, i), raya],
        resto: [raya, ...ruta.slice(i)],
      };
    }
    // Rodando por la pista desde otra boca no se llega a la raya de ésta.
    if (sobreLaPista(a) && sobreLaPista(b)) porLaPista += dist(a, b);
    if (porLaPista > RODANDO_HASTA_LA_BOCA) return null;
  }
  return null;
}

/** Si una calle sale de ese nudo hacia donde va la carrera, o casi. */
function saleHacia(tramo: Tramo, nudo: Punto, rumbo: number): boolean {
  const pts = tramo.puntos;
  if (pts.length < 2) return false;
  const desdeElPrincipio =
    Math.hypot(pts[0]![0] - nudo[0], pts[0]![1] - nudo[1]) <
    Math.hypot(
      pts[pts.length - 1]![0] - nudo[0],
      pts[pts.length - 1]![1] - nudo[1],
    );
  const orden = desdeElPrincipio ? pts : [...pts].reverse();
  let lejos = orden[orden.length - 1]!;
  for (const q of orden) {
    if (Math.hypot(q[0] - nudo[0], q[1] - nudo[1]) >= PRIMER_TRAMO) {
      lejos = q;
      break;
    }
  }
  const dx = lejos[0] - nudo[0];
  const dy = lejos[1] - nudo[1];
  const l = Math.hypot(dx, dy);
  if (l < 1) return false;
  const h = (rumbo * Math.PI) / 180;
  // Hacia delante en el fichero es (sen h, cos h): la y apunta al norte.
  const coseno = (dx * Math.sin(h) + dy * Math.cos(h)) / l;
  return coseno >= Math.cos((GIRO_DE_SALIDA * Math.PI) / 180);
}

/** Si entre esos metros del camino algún punto cae sobre la pista. */
function pisaLaPista(
  camino: readonly EnElPlano[],
  desde: number,
  hasta: number,
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  mitad: number,
): boolean {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    for (let s = 0; s <= d; s += MUESTRA) {
      const m = recorrido + s;
      if (m < desde || m > hasta) continue;
      const t = d > 0 ? s / d : 0;
      const e = ejes({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      if (Math.abs(e.across) < ancho / 2 && Math.abs(e.along) < mitad) return true;
    }
    recorrido += d;
  }
  return false;
}

/** Metros de camino hasta el primer punto que queda fuera de la pista. */
function hastaSalir(
  camino: readonly EnElPlano[],
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  /** Cuánto más allá del borde, m: fuera del asfalto, o pasada la doble raya. */
  pasado = FUERA_DEL_EJE,
): number {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    const da = Math.abs(ejes(a).across);
    const db = Math.abs(ejes(b).across);
    const limite = ancho / 2 + pasado;
    if (db >= limite) {
      const t = db > da ? Math.max(0, Math.min(1, (limite - da) / (db - da))) : 1;
      return recorrido + d * t;
    }
    recorrido += d;
  }
  return recorrido;
}

function dist(a: EnElPlano, b: EnElPlano): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function largo(camino: readonly EnElPlano[]): number {
  let total = 0;
  for (let i = 1; i < camino.length; i++)
    total += dist(camino[i - 1]!, camino[i]!);
  return total;
}
