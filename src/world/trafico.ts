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
  LOD,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import type { Silueta } from "../flight/flota";
import { fabricarAeronave } from "./fabrica-de-aeronaves";
import {
  fabricarTurbohelice,
  LIBREAS_DE_LAS_ISLAS,
} from "./aviones-de-las-islas";
import {
  PISTA_POR_DELANTE,
  type EnElPlano,
  type OcupadosEnElMundo,
  type SueloDelTrafico,
} from "./suelo-del-trafico";
import {
  cuerpoDelTrafico,
  LIBREAS as LIBREAS_DEL_TRAFICO,
  MODELO_DEL_TIPO,
  vestirCuerpo,
  type CuerpoHorneado,
  type LibreaDelTrafico,
} from "./cuerpos-del-trafico";
import {
  escalaDeCircuito,
  verticesDelCircuito,
  type Mano,
  type Pista,
} from "./circuito";
import { desplazadoDe } from "./umbral-desplazado";
import {
  ESPERA_ENTRE_VUELOS,
  ESPERA_MAXIMA,
  RESPUESTA_MAXIMA,
} from "../flight/radio";
import { ALTURA_DE_DECISION } from "../flight/minimos";
import {
  desfaseDe,
  LucesDeUnAvion,
  lucesDelTrafico,
  materialDeLuces,
  sitiosDeGeometria,
  sitiosDeLuz,
  sitiosPorMedidas,
  type FaseDeLuces,
  type SitiosDeLuz,
} from "./luces-del-trafico";

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

/**
 * Hasta dónde se dibuja el tráfico con el modelo de la flota, m. Más lejos,
 * con el de la fábrica. Ver `conDistancia` en `crearTrafico`.
 */
const DE_CERCA = 600;

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
   * Metros de los dos caminos hasta **la esquina de la base**: el final del
   * viento en cola, que es donde quien llega o gira o espera turno. Ver
   * `SEPARACION_ENTRE_LLEGADAS`.
   */
  readonly base: number;
  /**
   * Y hacia dónde queda **fuera del circuito** desde esa esquina, en el
   * plano: el lado contrario a la pista, que es hacia donde se da el tres
   * sesenta de esperar turno sin meterse en la base de nadie.
   */
  readonly haciaFuera: { readonly x: number; readonly z: number };
  /**
   * Metros de los dos caminos hasta la **entrada en final**: el vértice en el
   * que la base se vuelve final, que es donde gira quien vuela el circuito que
   * enseña el juego. Ver `BASE_A_FINAL` en `circuito.ts`.
   */
  readonly entra: number;
  /** Metros de `llegada` hasta tocar la pista. */
  readonly toca: number;
  /**
   * Metros de `llegada` hasta dejar la pista libre. Sin calles es el final
   * del camino, en el costado; con calles, el punto de la calle de salida en
   * que el avión ya está fuera del asfalto de la pista, y el camino sigue
   * rodando hasta su puesto. Ver `suelo-del-trafico.ts`.
   */
  readonly fuera: number;
  /** El que sale: del puesto a la espera, al eje, y arriba. */
  readonly salida: Sitio[];
  /** Metros de `salida` hasta la doble raya, donde espera a entrar. */
  readonly espera: number;
  /**
   * Con calles, los tramos de velocidad de verdad: dónde deja de frenar el
   * que aterriza —la boca de la salida— y dónde se va al aire el que sale.
   * Sin calles, `null`, y se hace lo de antes.
   */
  readonly enTierra: {
    readonly boca: number;
    readonly eje: number;
    readonly despega: number;
    readonly tipo: TipoDeTrafico;
  } | null;
}

/**
 * **Qué avión es el tráfico**, con los números de su tipo.
 *
 * «Y la avioneta ya podría ir por la pista. Por otro lado, uno más grande
 * también molaría.» En Pettirossi o en Gando lo que se cruza uno de verdad
 * son reactores de pasaje y turbohélices regionales, además de avionetas; en
 * un campo de hierba, solo avionetas. Y cada uno **aterriza como su tipo**:
 * la velocidad de final da el tamaño de su circuito —la misma cuenta que el
 * tuyo, ver `escalaDeCircuito`—, y lo que corre en la pista sale de sus
 * distancias de verdad, redondeadas.
 */
export interface TipoDeTrafico {
  readonly id: "avioneta" | "bimotor" | "turbohelice" | "reactor";
  readonly silueta: Silueta;
  readonly envergadura: number;
  /** Velocidad de aproximación, m/s. */
  readonly aproximacion: number;
  /** Dónde toca, contado desde el umbral de aterrizar, m. */
  readonly toca: number;
  /** Lo que tarda en frenar hasta velocidad de rodaje, m. */
  readonly frena: number;
  /** Carrera de despegue, m. */
  readonly carrera: number;
  /** La pista más corta en la que opera, m. */
  readonly pistaMinima: number;
}

/*
 * Los números, de fichas públicas de tipos de verdad y redondeados, que es lo
 * que distingue uno de otro a la vista:
 *
 * - avioneta de ala alta (la clase del Cessna 172): 65 kt en final, toca a
 *   ciento cincuenta metros y frena en otros doscientos; despega en trescientos.
 * - bimotor ligero (la clase del Baron): 90 kt, ochocientos metros de pista.
 * - turbohélice regional de ala alta (la clase del ATR 72, el que une las
 *   islas): 110 kt, toca a trescientos y frena en seiscientos; despega en mil
 *   cien y opera en pistas de mil doscientos, como El Hierro y La Gomera.
 * - reactor de pasaje (la clase del A320): 135 kt, toca a cuatrocientos y
 *   frena en mil; despega en mil ochocientos.
 */
export const TIPOS: Readonly<Record<TipoDeTrafico["id"], TipoDeTrafico>> = {
  avioneta: {
    id: "avioneta",
    silueta: "ala-alta",
    envergadura: 11,
    aproximacion: 33,
    toca: 150,
    frena: 200,
    carrera: 300,
    pistaMinima: 0,
  },
  bimotor: {
    id: "bimotor",
    silueta: "bimotor-ala-baja",
    envergadura: 11.5,
    aproximacion: 46,
    toca: 250,
    frena: 350,
    carrera: 550,
    pistaMinima: 800,
  },
  turbohelice: {
    id: "turbohelice",
    silueta: "cola-en-t",
    envergadura: 27,
    aproximacion: 57,
    toca: 300,
    frena: 600,
    carrera: 1100,
    pistaMinima: 1200,
  },
  reactor: {
    id: "reactor",
    silueta: "reactor",
    envergadura: 34,
    aproximacion: 69,
    toca: 400,
    frena: 1000,
    carrera: 1800,
    pistaMinima: 1800,
  },
};

/**
 * **Qué tráfico opera en este campo**, por su código OACI, y en qué
 * proporción. Lo que no está en la lista va por lo que da su pista.
 *
 * Mirado campo a campo: en Asunción salen reactores de pasaje a diario y hay
 * aeroclub; en Ciudad del Este, reactores y aviación general; en Encarnación,
 * Mariscal Estigarribia y Pedro Juan Caballero casi solo aviación general; en
 * Concepción, el turbohélice del transporte aéreo militar y avionetas; en
 * Pilar, avionetas y algún bimotor de negocios; en Ayolas, nadie a la vez que
 * vos. En
 * Canarias el regional de ala alta une todas las islas, y en las pistas
 * largas entran además los reactores; El Hierro y La Gomera, con mil
 * doscientos y mil quinientos metros, son solo del turbohélice. Cuatro
 * Vientos es un aeródromo de escuelas.
 */
const OPERAN: Readonly<Record<string, readonly TipoDeTrafico["id"][]>> = {
  SGAS: ["reactor", "reactor", "avioneta", "bimotor"],
  SGES: ["reactor", "avioneta", "bimotor"],
  SGEN: ["avioneta", "bimotor"],
  SGME: ["avioneta"],
  SGPJ: ["avioneta"],
  // El CASA 212 del transporte militar, que es la línea que llega, y el
  // aeroclub de la ciudad.
  SGCO: ["turbohelice", "avioneta", "avioneta"],
  /*
   * Pilar: avionetas, y el bimotor de negocios de los vuelos a requerimiento
   * —un King Air, el de marzo de 2026—. Sin la lista le tocaba también el
   * turbohélice regional, porque la pista mide justo lo que pide; pero ese
   * avión tiene veintisiete metros de envergadura y la pista, dieciocho de
   * ancho.
   *
   * Y Ayolas no está, a propósito: no tiene torre, y ver `tiposDelCampo`.
   */
  SGPI: ["avioneta", "avioneta", "bimotor"],
  GCLP: ["reactor", "turbohelice", "turbohelice", "avioneta"],
  GCXO: ["turbohelice", "turbohelice", "reactor", "avioneta"],
  GCTS: ["reactor", "reactor", "turbohelice"],
  GCRR: ["reactor", "turbohelice", "turbohelice"],
  GCFV: ["reactor", "turbohelice", "turbohelice"],
  GCLA: ["turbohelice", "turbohelice", "reactor"],
  GCHI: ["turbohelice"],
  GCGM: ["turbohelice"],
  LECU: ["avioneta", "avioneta", "bimotor"],
};

/**
 * Los tipos que operan en un campo, ya filtrados por lo que da su pista.
 *
 * **Y en una pista particular, ninguno**, salvo que el campo diga otra cosa
 * en `OPERAN`. Aquí ponía que la hierba lleva avionetas, que es verdad de un
 * aeroclub y mentira de la pista de una granja: ahí vuela el avión de la
 * casa, y el de la casa es el tuyo. «Una cosa es soñar y otra creer que en
 * casa vamos a tener varios aviones como el que tiene varios coches.»
 *
 * **Y en una sin torre, tampoco.** El tráfico de este juego es un circuito
 * con la torre repartiendo turnos, y donde no hay torre no hay quien los
 * reparta. En Ayolas, además, es lo que pasa: cada vuelo pide permiso por
 * escrito a Yacyretá con cuarenta y ocho horas, de día y sin quedarse a
 * dormir, así que quien aterriza allí tiene la pista para él. Ver
 * `Aerodrome.sinTorre`.
 */
export function tiposDelCampo(
  oaci: string | null | undefined,
  largoDePista: number,
  sinTorre = false,
): readonly TipoDeTrafico[] {
  if (sinTorre && !(oaci && OPERAN[oaci])) return [];
  const lista = (oaci && OPERAN[oaci]) || [
    "reactor",
    "turbohelice",
    "avioneta",
  ];
  const caben = lista
    .map((id) => TIPOS[id])
    .filter((t) => t.pistaMinima <= largoDePista);
  return caben.length ? caben : [TIPOS.avioneta];
}

/**
 * **Por dónde rueda un tipo en este aeródromo**, si tiene calles. Ver
 * `suelo-del-trafico.ts`.
 */
export interface TierraDelTrafico {
  readonly suelo: SueloDelTrafico;
  /** La altura del suelo en un punto del mundo, m. */
  readonly alto: (x: number, z: number) => number;
  /**
   * Los sitios de quien juega —dónde está y a qué doble raya va—, para no
   * aparcarle encima ni esperar en su misma raya.
   */
  readonly evitar?: readonly EnElPlano[];
  /**
   * Y la raya verde entera de quien juega, para no esperar encima de ella.
   * Ver `PASA_A_TU_LADO` en `suelo-del-trafico.ts`.
   */
  readonly porDondeVas?: readonly EnElPlano[];
  /**
   * **Y por dónde no salir de la pista**: tu avión en el suelo y la raya por
   * la que vas, con la separación de ala. Ver `OCUPADA_CUESTA` en
   * `suelo-del-trafico.ts`.
   */
  readonly ocupados?: OcupadosEnElMundo;
  readonly tipo: TipoDeTrafico;
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
  /**
   * Las calles del aeródromo y el tipo que las rueda. Sin ellas —un campo
   * inventado—, el que aterriza sale por el costado y el que despega espera
   * a un lado de la cabecera, que es lo único que se puede hacer sin calles.
   */
  tierra?: TierraDelTrafico | null,
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
  let llegada = [lejos, esquina, entrada, aterriza, toma, salida];
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
  /*
   * **Y acaba donde empieza la vuelta siguiente**, en `lejos`, que es el
   * primer punto de `llegada`: ahí se engancha otra vuelta al circuito, con
   * permiso o sin él. Acababa en la esquina de la base y se retiraba en el
   * aire; al cantar otra vez viento en cola reaparecía en su marca, y para
   * quien volaba ese mismo viento en cola eso era un avión viniendo de
   * frente por su línea. Ver `otraVuelta`.
   */
  const sinPermiso = [lejos, esquina, entrada, decision, arriba, lejos];
  const decide = largoDelCamino([lejos, esquina, entrada, decision]);
  /** **El que sale**: del aparcamiento a la espera, al eje, y arriba. */
  let salidaDelCampo = [lejosDelCampo, espera, enElEje, arriba];
  /**
   * **Y el que se va al aire**: pasa sobre la pista y vuelve al circuito. Acaba
   * en `lejos`, donde empieza la vuelta siguiente: ver `otraVuelta`.
   */
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
  let enLaToma = largoDelCamino([lejos, esquina, entrada, aterriza]);
  let fuera = largoDelCamino(llegada);
  let hastaLaEspera = largoDelCamino([lejosDelCampo, espera]);
  let hastaElEje = largoDelCamino([lejosDelCampo, espera, enElEje]);
  let enTierra: Caminos["enTierra"] = null;

  /*
   * **Y con calles, por las calles.** Ver `suelo-del-trafico.ts`: el que
   * aterriza toca donde toca su tipo, frena por el eje hasta la primera
   * salida que le queda por delante y rueda por ella hasta un puesto; el que
   * sale rueda de un puesto a una doble raya pintada, se alinea y corre lo que
   * corre su tipo antes de irse al aire.
   */
  if (tierra) {
    const t = tierra.tipo;
    const sobre = (p: EnElPlano): Sitio => ({
      x: p.x,
      y: tierra.alto(p.x, p.z) + EN_TIERRA,
      z: p.z,
    });
    const llega = tierra.suelo.llegada(t.toca + t.frena, tierra.evitar, tierra.ocupados);
    if (llega && llega.camino.length > 1) {
      const tomaDeVerdad = sobre(en(desplazado + t.toca, 0, 0));
      const rodando = llega.camino.map(sobre);
      /*
       * Si la única salida queda **por detrás** de donde ya rueda despacio
       * —una pista con la calle en la cabecera de aterrizar—, se hace lo que
       * se hace de verdad: seguir hasta cerca del final, dar la vuelta y
       * volver por la pista hasta la calle.
       */
      const hastaFrenar = desplazado + t.toca + t.frena;
      const vuelta =
        llega.boca + desplazado < hastaFrenar
          ? [sobre(en(Math.min(runway.length - 60, hastaFrenar), 0, 0))]
          : [];
      const hastaLaBoca = [
        lejos,
        esquina,
        entrada,
        aterriza,
        tomaDeVerdad,
        ...vuelta,
      ];
      llegada = [...hastaLaBoca, ...rodando];
      enLaToma = largoDelCamino([lejos, esquina, entrada, aterriza, tomaDeVerdad]);
      const boca = largoDelCamino([...hastaLaBoca, rodando[0]!]);
      fuera = boca + llega.pista;
      enTierra = { boca, eje: 0, despega: 0, tipo: t };
    }
    const sale = tierra.suelo.salida(
      tierra.evitar,
      tierra.porDondeVas,
      t.carrera * PISTA_POR_DELANTE,
    );
    if (sale && sale.camino.length > 1) {
      const rodando = sale.camino.map(sobre);
      const alineado = sale.camino[sale.camino.length - 1]!;
      const adelante = unitario(umbral, arriba);
      const despegue = sobre({
        x: alineado.x + adelante.x * t.carrera,
        z: alineado.z + adelante.z * t.carrera,
      });
      /*
       * Y se va: no se queda colgado en la esquina del circuito esperando a
       * que alguien lo vuelva a nombrar. Sigue subiendo en el rumbo de la
       * pista hasta perderse, y ahí se retira.
       */
      const lejisimos: Sitio = {
        x: arriba.x + adelante.x * 6000,
        y: arriba.y + 500,
        z: arriba.z + adelante.z * 6000,
      };
      const pasaArriba =
        (arriba.x - despegue.x) * adelante.x +
          (arriba.z - despegue.z) * adelante.z >
        300;
      salidaDelCampo = [
        ...rodando,
        despegue,
        ...(pasaArriba ? [arriba] : []),
        lejisimos,
      ];
      hastaLaEspera = sale.espera;
      hastaElEje = sale.eje;
      enTierra = {
        boca: enTierra?.boca ?? 0,
        eje: sale.eje,
        despega: sale.eje + t.carrera,
        tipo: t,
      };
    }
  }
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
      metros: fuera,
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
    base: largoDelCamino([lejos, esquina]),
    haciaFuera: unitario(entrada, esquina),
    entra: enFinal,
    toca: enLaToma,
    fuera,
    salida: salidaDelCampo,
    espera: hastaLaEspera,
    enTierra,
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

/**
 * **Lo que aguanta quieto sobre la pista un avión que viene a aterrizar**, s.
 *
 * Es la red de «la roja eterna». La frase de «pista libre» espera a que el
 * avión dibujado haya salido de la pista —ver `todaviaNo`—, así que si ese
 * avión dejara de avanzar por lo que fuera, la pista quedaría ocupada para
 * siempre y quien espera en la roja no saldría nunca: «me tiene esperando por
 * ese avión un buen rato, ¿me dejará salir?». Una torre de verdad no deja a
 * nadie esperando indefinidamente: si el que ocupa la pista deja de moverse,
 * lo saca de ahí. Aquí se retira el dibujo, y con él la espera.
 *
 * Quince segundos: más que cualquier parada legítima —ninguna, en la carrera
 * y la salida— y mucho menos de lo que tarda un niño en pensar que el juego se
 * ha colgado.
 */
const QUIETO = 15;

/**
 * **Hasta dónde mira por delante el tráfico que rueda**, m, para no echarse
 * encima de quien juega: lo que tarda en pararse a su paso de calle y un
 * margen. Ver `cedeA`.
 */
const MIRA_POR_DELANTE = 24;

/** Cada cuánto se mira su camino por delante, m. */
const PASO_DE_LA_MIRADA = 2;

/**
 * Con qué frena el tráfico al ceder, m/s²: una frenada de calle, sin clavarse.
 * A siete metros por segundo se para en dieciséis.
 */
const FRENA_AL_CEDER = 1.5;

/**
 * **Lo que espera el tráfico parado por ti antes de quitarse de en medio**, s.
 *
 * Detrás de ti en la doble raya espera lo que haga falta: es la fila, y tú
 * también esperas tu turno. Pero frente a frente en una calle, o con tu avión
 * aparcado en mitad de su camino, esperar es para siempre: los dos parados,
 * ninguno puede pasar. Una torre no deja eso así —al dibujado lo manda por
 * otro sitio— y aquí, como con `QUIETO`, se retira el dibujo y con él el
 * tapón. Medio minuto: mucho más que lo que tarda en pasar quien juega por
 * delante de un cruce, y menos que la paciencia de tu propia cola, que es
 * `PACIENCIA_EN_LA_COLA` en `plan-de-vuelo.ts`: cede primero el dibujo.
 */
const PACIENCIA_CON_QUIEN_JUEGA = 30;

/**
 * Cómo se olvida a quien espera parado en una marca con tope —en el punto de
 * espera o alineado—: mucho más despacio que a los demás, porque está
 * esperando una orden que llegará. Pero se olvida: sin esto, uno cuyo vuelo se
 * acabara en la frecuencia sin la orden se quedaría en la calle para siempre.
 */
const OLVIDO_ESPERANDO = 0.25;

/**
 * **Lo que pasa, como poco, entre dos llegadas**, s: de que una cruza el
 * umbral a que cruza la siguiente.
 *
 * Dos minutos. Se veía en la carta: dos o tres aviones entrando a la vez en
 * la pista, uno encima del otro en la misma final, cuando lo que se ve en un
 * aeropuerto de verdad es una fila con hueco entre aterrizaje y aterrizaje.
 * En la aproximación radar el mínimo son tres millas y en la práctica se
 * dejan de cuatro a seis, que a lo que se vuela una final son un par de
 * minutos. Medido antes del arreglo, en Tenerife Sur con reactores y
 * turbohélices: dos llegadas en la misma final a menos de tres millas en 69
 * de cada 100 horas de frecuencia, y a trescientos metros la una de la otra
 * la peor.
 *
 * Y es lo que hace que la pista sea de uno por vez sin que nadie se vaya al
 * aire: cualquiera de los tipos del tráfico la deja libre mucho antes.
 */
export const SEPARACION_ENTRE_LLEGADAS = 120;

/** Tres millas náuticas, m: el mínimo de separación radar en aproximación. */
export const TRES_MILLAS = 3 * 1852;

/**
 * **La separación que le toca a quien viene detrás**, s: los dos minutos, y
 * nunca menos que lo que tarda en volar tres millas.
 *
 * La avioneta del circuito vuela a cuarenta metros por segundo, y en dos
 * minutos se hace dos millas y media: a esa velocidad, lo que manda son las
 * tres millas.
 */
export function separacionPara(velocidad: number): number {
  return Math.max(SEPARACION_ENTRE_LLEGADAS, TRES_MILLAS / Math.max(1, velocidad));
}

/**
 * **Lo que se deja de más al decidir en la esquina**, s.
 *
 * Quien juega no vuela a velocidad fija como el tráfico: si en la esquina el
 * hueco salía justo, un poco más despacio en su final lo dejaba por debajo y
 * el de detrás tenía que irse al aire. Con quince segundos de colchón eso no
 * pasa por ir un poco lento.
 */
const COLCHON = 15;

/**
 * **El régimen de viraje del tres sesenta**, rad/s: el estándar, tres grados
 * por segundo, que es el que se usa para esperar turno. La vuelta entera son
 * dos minutos, lo mismo que la separación: una vuelta, un hueco.
 */
const VIRAJE_ESTANDAR = (3 * Math.PI) / 180;

/**
 * **Lo que se deja por encima del relieve dando la vuelta**, m. La esquina
 * del circuito ya va a su altura, pero el tres sesenta se abre hacia fuera y
 * ahí puede subir la ladera: se sube lo que haga falta, en medio de la
 * vuelta, y se baja otra vez a la esquina.
 */
const SOBRE_EL_RELIEVE = 250;

/**
 * **Lo que tarda el que sale en dejar la pista**, s, además de su carrera: lo
 * que rueda desde la doble raya hasta alinearse. Ver `enLaPistaDesde`.
 */
const ENTRAR_Y_ALINEARSE = 20;

/**
 * **Quién juega, visto desde el tráfico**: si viene a aterrizar en esta pista
 * y cuándo llega, y si está encima de ella. Lo pone el juego; sin él, el
 * tráfico se turna solo entre los suyos. Ver `quienJuega` en
 * `OpcionesDelTrafico`.
 */
export interface QuienJuega {
  /** Segundos que le faltan para el umbral de aterrizar, si vuela la final. */
  readonly alUmbral: number | null;
  /** Si está en la pista: alineado, corriendo, o sin haberla dejado. */
  readonly enLaPista: boolean;
  /** A cuánto se acerca, m/s. Es lo que decide su separación. */
  readonly velocidad?: number;
  /**
   * **Y dónde está en el suelo**, si está en él: el tráfico que rueda le ve
   * como a un avión más de las calles. Ver `cedeA`.
   */
  readonly enTierra?: EnTierra | null;
}

/** Quien juega, rodando o parado en el suelo, visto desde el tráfico. */
export interface EnTierra {
  readonly x: number;
  readonly z: number;
  /**
   * Lo que tienen que separarse los ejes de los dos aviones, m: su semiala, la
   * del mayor del tráfico y el margen de ala. La misma que usa su raya para
   * rodear a un parado: ver `separacionEnTierra` en `plan-de-vuelo.ts`.
   */
  readonly separacion: number;
  /**
   * Por dónde va a pasar en los próximos segundos: su raya por delante, o
   * hacia donde apunta el morro si va fuera de ella. Es lo que hace que el
   * tráfico ceda en un cruce **antes** de que llegues, y no al verte encima.
   */
  readonly porDondeVa: readonly EnElPlano[];
  /**
   * Si espera en su doble raya, con la roja, a que le den la pista: ahí no se
   * puede mover, y detrás de quien espera turno se espera lo que haga falta.
   * Con la verde ya se mueve, y quien le tapa el paso tiene que quitarse. Ver
   * `PACIENCIA_CON_QUIEN_JUEGA`.
   */
  readonly esperandoLaPista: boolean;
}

interface Volando {
  readonly grupo: Group;
  /** Qué avión es, y los caminos de su tipo en este aeródromo. */
  readonly tipo: TipoDeTrafico;
  /**
   * Los caminos de su tipo, o los suyos: al tomar tierra se le vuelve a
   * trazar la salida de la pista con tu avión donde está entonces. Ver
   * `rehacerLaLlegada`.
   */
  caminos: Caminos | null;
  marca: Marca;
  recorrido: number;
  /** Cuánto lleva sin que nadie lo nombre. */
  olvidado: number;
  /**
   * Si la torre le ha dicho «cleared to land». Lo sabe la frecuencia, que es
   * quien se lo dice: ver `puedeAterrizar` en `flight/radio.ts`.
   */
  conPermiso: boolean;
  /** Segundos que lleva sin avanzar mientras ocupa la pista. Ver `QUIETO`. */
  quieto: number;
  /** Si en el último paso avanzó: parado en la doble raya, no. Ver `faseDeLuces`. */
  avanza: boolean;
  /** Sus luces, colgadas de su grupo. Ver `luces-del-trafico.ts`. */
  luces: LucesDeUnAvion;
  /**
   * **El tres sesenta que da en la esquina de la base, esperando turno**, si
   * lo está dando. Mientras tanto su camino no avanza: está en la esquina,
   * esperando, y lo que se ve es la vuelta. Ver `SEPARACION_ENTRE_LLEGADAS`.
   */
  tresSesenta: TresSesenta | null;
  /** Cuándo cruzó el umbral de aterrizar, s del reloj del tráfico. */
  cruzo: number | null;
  /**
   * Segundos que lleva parado **cediéndote el paso**: detrás de ti, o antes
   * de un cruce por el que vas a pasar. Ver `cedeA`.
   */
  cedido: number;
}

/** Un tres sesenta de espera. Ver `tresSesentaDesde`. */
interface TresSesenta {
  readonly cx: number;
  readonly cz: number;
  readonly radio: number;
  /** El ángulo de la esquina visto desde el centro, rad. */
  readonly desde: number;
  /** Hacia dónde gira: 1 o −1, según el lado de fuera. */
  readonly sentido: 1 | -1;
  /** La altura de la esquina, y lo que sube en medio para librar el relieve. */
  readonly y: number;
  readonly sube: number;
  /** Metros que lleva dados de esta vuelta. */
  hecho: number;
}

/** Lo que mide una vuelta entera, m. */
function largoDelTresSesenta(v: TresSesenta): number {
  return 2 * Math.PI * v.radio;
}

/** Dónde está y hacia dónde mira quien lleva `v.hecho` metros de su vuelta. */
function enElTresSesenta(v: TresSesenta): { sitio: Sitio; rumbo: number } {
  const giro = v.hecho / v.radio;
  const a = v.desde + v.sentido * giro;
  const x = v.cx + v.radio * Math.cos(a);
  const z = v.cz + v.radio * Math.sin(a);
  // La tangente, en el sentido de giro: es hacia donde apunta el morro.
  const tx = -Math.sin(a) * v.sentido;
  const tz = Math.cos(a) * v.sentido;
  return {
    sitio: { x, y: v.y + v.sube * Math.sin(Math.min(Math.PI, giro / 2)), z },
    rumbo: Math.atan2(tx, -tz),
  };
}

/**
 * Los sitios de las luces sacados de cada cuerpo bueno, una vez por página:
 * son de la geometría, que es la misma en todos los campos. Ver `sitiosDeLuz`.
 */
const sitiosDelCuerpo = new WeakMap<CuerpoHorneado, SitiosDeLuz | null>();

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
  /**
   * **Quién está ahora encima de la pista**, de los dibujados: posado sin
   * haberla dejado, alineado, o corriendo su despegue. Es lo que se mira
   * antes de darle la pista a nadie —ni a ti—: la pista es de uno por vez,
   * y «cleared to land» o «pista libre» con otro encima no lo dice nadie.
   * Ver `paso` en `flight/turno-de-pista.ts`.
   */
  ocupanLaPista(): string[];
  /**
   * **La fila de llegadas**: cuándo cruzará el umbral cada uno de los que ya
   * han girado a la base —o esperan turno dando la vuelta—, en segundos desde
   * ahora, y los que lo cruzaron hace poco, con la cifra en negativo. Para el
   * banco y las pruebas. Ver `SEPARACION_ENTRE_LLEGADAS`.
   */
  secuencia(): {
    matricula: string;
    alUmbral: number;
    velocidad: number;
    esperandoTurno: boolean;
    /** Si vuela ya la final —girado de la base—, con permiso o sin él. */
    enFinal: boolean;
  }[];
  /**
   * **Dónde hay o va a haber un avión parado en las calles**: la doble raya
   * en la que espera cada tipo que ya ha salido a rodar, y dónde está cada
   * uno que rueda ahora. Es lo que rodea la raya verde de quien juega: ver
   * `Ocupados` en `rodaje.ts`. Solo con calles; sin ellas el tráfico se
   * aparta por el costado y no estorba a nadie.
   *
   * `sale` es si va a despegar —rodando hacia la pista o esperando en su
   * doble raya—, que para quien también va a despegar es **su cola** y no un
   * estorbo: ver `enCola` en `plan-de-vuelo.ts`. Y `hay`, si hay un avión
   * ahí ahora: la doble raya de cada tipo se da siempre, esté o no esperando
   * en ella, y detrás de un sitio vacío no se para nadie.
   */
  dondeParan(): { x: number; z: number; sale: boolean; hay: boolean }[];
  /**
   * **Los que van a despegar y están parados esperándote**: detrás de ti en
   * la calle o en la doble raya. Para la torre, el que espera detrás de ti no
   * va primero aunque llegara antes a la calle. Ver `pistaDeOtros` en
   * `flight/turno-de-pista.ts`.
   */
  esperanPorTi(): string[];
  /** Cuántos se ven, y dónde. Para el banco y para la carta. */
  quienes(): {
    matricula: string;
    x: number;
    y: number;
    z: number;
    /** Si viene a aterrizar con permiso. */
    conPermiso: boolean;
    /** Si va por el camino de llegada, con permiso o sin él. */
    llegando: boolean;
    /** Qué tipo de avión es. Ver `TIPOS`. */
    tipo: TipoDeTrafico["id"];
    /** Si está encima de la pista. Ver `ocupanLaPista`. */
    enLaPista: boolean;
    /** Si está dando la vuelta de espera en la esquina de la base. */
    esperandoTurno: boolean;
  }[];
  /**
   * **Todos fuera.** Lo pide volver a empezar: la frecuencia empieza de cero
   * con otras matrículas, y un dibujo de la partida anterior —la avioneta
   * parada en la hierba junto al punto de espera, con la roja encendida— no
   * puede sobrevivirla.
   */
  vaciar(): void;
  dispose(): void;
}

/** Lo que el juego le da al tráfico de este aeródromo, aparte de la pista. */
export interface OpcionesDelTrafico {
  /**
   * Los tipos que operan aquí —ver `tiposDelCampo`—. Sin ellos, todos son la
   * avioneta de `silueta` y vuelan el circuito de la escala que se diga, que
   * es lo que hacía esto antes y lo que siguen usando las pruebas.
   */
  readonly tipos?: readonly TipoDeTrafico[];
  /**
   * Las calles del aeródromo, pedidas **al necesitarlas**: el primero de cada
   * tipo que habla, que es cuando el juego ya sabe dónde está quien juega.
   */
  readonly tierra?: () => Omit<TierraDelTrafico, "tipo"> | null;
  /** La mano y la altura del circuito de una escala. Ver `formaDelCircuito`. */
  readonly forma?: (escala: number) => { mano: Mano; altura?: number };
  /**
   * Si se dibujan con los modelos de la flota —ver `cuerpos-del-trafico.ts`—
   * o con la fábrica. El juego dice que sí; las pruebas, que corren sin red,
   * se quedan con la fábrica.
   */
  readonly cuerposDeVerdad?: boolean;
  /**
   * **Quién juega**, para que su aproximación entre en la fila y su pista
   * cuente como ocupada. Ver `QuienJuega`.
   */
  readonly quienJuega?: () => QuienJuega | null;
}

/**
 * El tráfico de este aeródromo.
 *
 * `silueta` decide qué pinta tiene la avioneta, y **no es la del avión que se
 * vuela**: eso sería un espejo. Es otro de la flota, para que se note que es
 * otro.
 */
export function crearTrafico(
  runway: Pista,
  cota: number,
  silueta: Silueta,
  mano: Mano = "izquierda",
  escala = 1,
  altura?: number,
  opciones: OpcionesDelTrafico = {},
): Trafico {
  const grupo = new Group();
  grupo.name = "trafico";
  const aviones = new Map<string, Volando>();
  const geometrias = new Map<string, BufferGeometry>();
  const conTipos = !!opciones.tipos?.length;
  const tipos: readonly TipoDeTrafico[] = conTipos
    ? opciones.tipos!
    : [{ ...TIPOS.avioneta, silueta }];
  const caminosPorTipo = new Map<string, Caminos | null>();

  /**
   * Los caminos de un tipo, hechos la primera vez que hacen falta. Cada tipo
   * vuela **su** circuito —el de un reactor es el doble que el de una
   * avioneta, como el tuyo—, por el mismo lado y con la misma regla de
   * altura que el que se te dibuja a ti.
   */
  const caminosDe = (tipo: TipoDeTrafico): Caminos | null => {
    if (caminosPorTipo.has(tipo.id)) return caminosPorTipo.get(tipo.id)!;
    const c = trazarAhora(tipo);
    caminosPorTipo.set(tipo.id, c);
    return c;
  };

  /** Los caminos de un tipo con quien juega donde está ahora, sin guardar. */
  const trazarAhora = (tipo: TipoDeTrafico): Caminos | null => {
    const esc = conTipos ? escalaDeCircuito(tipo.aproximacion) : escala;
    const forma = opciones.forma?.(esc) ?? { mano, altura };
    const suelo = opciones.tierra?.() ?? null;
    return trazar(
      runway,
      cota,
      forma.mano,
      esc,
      forma.altura,
      suelo ? { ...suelo, tipo } : null,
    );
  };

  /**
   * **Al tomar tierra, la salida de la pista se vuelve a elegir**, con tu
   * avión donde está ahora.
   *
   * Los caminos de cada tipo se trazan una vez, cuando habla el primero, y
   * para entonces quien juega podía estar todavía en su puesto. Minutos
   * después esperaba en la doble raya de una calle, y el que aterrizaba salía
   * justo por ella: se quedaba plantado entre tu doble raya y la pista, sin
   * poder pasar ni dejarte pasar. Al tocar se sabe dónde estás, y se sale por
   * otra si la hay — «siga hasta la próxima», como lo diría una torre.
   *
   * El camino hasta la toma es el mismo —sale de la pista y del tipo, no de
   * ti—, así que lo recorrido sigue valiendo y el avión no se mueve.
   */
  const rehacerLaLlegada = (quien: Volando): void => {
    const viejo = quien.caminos;
    if (!viejo?.enTierra || !opciones.quienJuega?.()?.enTierra) return;
    /*
     * Y solo si la que lleva pasa por encima de ti: trazar otra vez cuesta una
     * búsqueda de caminos, y casi nunca hace falta.
     */
    const ocupados = opciones.tierra?.()?.ocupados;
    if (!ocupados?.puntos.length) return;
    let pasaPorTi = false;
    const largo = largoDe(viejo.llegada);
    for (let m = viejo.toca; m <= largo && !pasaPorTi; m += 10) {
      const p = porElCamino(viejo.llegada, m)?.sitio;
      if (!p) break;
      pasaPorTi = ocupados.puntos.some(
        (q) => Math.hypot(q.x - p.x, q.z - p.z) < ocupados.radio,
      );
    }
    if (!pasaPorTi) return;
    const nuevo = trazarAhora(quien.tipo);
    if (!nuevo?.enTierra || Math.abs(nuevo.toca - viejo.toca) > 0.5) return;
    quien.caminos = nuevo;
    quien.marca = { ...quien.marca, camino: nuevo.llegada };
  };

  /** Qué tipo es cada matrícula: siempre el mismo para la misma. */
  const tipoDe = (matricula: string): TipoDeTrafico => {
    let h = 0;
    for (let i = 0; i < matricula.length; i++)
      h = (h * 31 + matricula.charCodeAt(i)) >>> 0;
    return tipos[h % tipos.length]!;
  };

  /**
   * **Los cuerpos buenos, por tipo, cuando llegan.** Mientras tanto vuela el
   * de la fábrica, y al llegar se le cambia el cuerpo a cada uno de ese tipo
   * que ya se esté viendo. Ver `cuerpos-del-trafico.ts`.
   */
  const cuerposListos = new Map<string, CuerpoHorneado>();
  const cuerposPedidos = new Set<string>();
  let desmontado = false;
  /*
   * **Y el turbohélice, con los colores de las islas** de cerca y de lejos:
   * de lejos va el de `aviones-de-las-islas.ts`, con su librea, y cambiarle la
   * cola de color al acercarse sería enseñar que son dos aviones.
   */
  const libreaDe = (matricula: string, tipo?: TipoDeTrafico): LibreaDelTrafico => {
    const cual = matricula.charCodeAt(matricula.length - 1);
    if (tipo?.id === "turbohelice")
      return {
        casco: LIBREAS_DEL_TRAFICO[0]!.casco,
        color: LIBREAS_DE_LAS_ISLAS[cual % LIBREAS_DE_LAS_ISLAS.length]!.cola,
      };
    return LIBREAS_DEL_TRAFICO[cual % LIBREAS_DEL_TRAFICO.length]!;
  };
  const pedirCuerpo = (tipo: TipoDeTrafico, modelo: string): void => {
    if (cuerposPedidos.has(tipo.id)) return;
    cuerposPedidos.add(tipo.id);
    void cuerpoDelTrafico(modelo, tipo.envergadura, EN_TIERRA).then((hecho) => {
      if (!hecho || desmontado) return;
      cuerposListos.set(tipo.id, hecho);
      /*
       * **Y las luces, a las puntas del cuerpo bueno.** Las de la fábrica
       * tienen la envergadura de su tipo pero no su ala: el ala alta de la
       * avioneta o la flecha del reactor dejaban la luz flotando un palmo
       * fuera de la punta, que de cerca es lo que se ve.
       */
      if (!sitiosDelCuerpo.has(hecho))
        sitiosDelCuerpo.set(
          hecho,
          sitiosDeLuz(vestirCuerpo(hecho, libreaDe(tipo.id))),
        );
      const sitios = sitiosDelCuerpo.get(hecho);
      if (sitios) sitiosPorTipo.set(tipo.id, sitios);
      for (const [matricula, quien] of aviones) {
        if (quien.tipo.id !== tipo.id) continue;
        quien.grupo.clear();
        quien.grupo.add(
          conDistancia(
            vestirCuerpo(hecho, libreaDe(matricula, tipo)),
            deFabrica(tipo, matricula),
          ),
        );
        quien.luces.dispose();
        quien.luces = lucesDe(tipo, matricula);
        quien.grupo.add(quien.luces.puntos);
        alumbrar(quien);
      }
    });
  };

  /**
   * El avión de la fábrica: el de antes, que ahora es el de lejos y el de
   * mientras llega el bueno. Una geometría por tipo y por librea, no una por
   * avión: fabricar un avión entero por cada llamada sería pagar un tirón de
   * fotogramas por algo que está a dos kilómetros.
   */
  const deFabrica = (tipo: TipoDeTrafico, matricula: string): Mesh => {
    const cual = matricula.charCodeAt(matricula.length - 1);
    const librea =
      tipo.id === "turbohelice"
        ? cual % LIBREAS_DE_LAS_ISLAS.length
        : cual % LIBREAS_DEL_TRAFICO.length;
    const clave = `${tipo.id}:${librea}`;
    let g = geometrias.get(clave);
    if (!g) {
      // Con los colores de su librea, que de lejos es lo que se distingue.
      const suya = LIBREAS_DEL_TRAFICO[librea % LIBREAS_DEL_TRAFICO.length]!;
      g =
        tipo.id === "turbohelice"
          ? fabricarTurbohelice(LIBREAS_DE_LAS_ISLAS[librea]!)
          : fabricarAeronave(
              tipo.silueta,
              {
                envergadura: tipo.envergadura,
                cuerda: tipo.envergadura > 20 ? 3.2 : 1.5,
                tren: tipo.envergadura > 20 ? 1.6 : 0.9,
              },
              { body: suya.casco, accent: suya.color, trim: suya.color },
            ).geometria.translate(0, -EN_TIERRA, 0);
      /*
       * **Y con las ruedas en el suelo.** La fábrica pone las ruedas en el
       * origen y el tráfico pone el origen `EN_TIERRA` por encima del suelo,
       * así que rodaba flotando metro y medio. El turbohélice de las islas
       * ya trae las ruedas ahí abajo.
       */
      geometrias.set(clave, g);
    }
    return new Mesh(g, materialDeFabrica);
  };
  const materialDeFabrica = new MeshLambertMaterial({ vertexColors: true });

  /** Un material para las luces de todo el tráfico de este campo. */
  const materialDeLasLuces = materialDeLuces();
  /** Dónde van las luces de cada tipo: de la fábrica, y del bueno al llegar. */
  const sitiosPorTipo = new Map<string, SitiosDeLuz>();
  /** El reloj de los destellos, s. */
  let reloj = 0;
  const lucesDe = (tipo: TipoDeTrafico, matricula: string): LucesDeUnAvion => {
    let sitios = sitiosPorTipo.get(tipo.id);
    if (!sitios) {
      sitios =
        sitiosDeGeometria(deFabrica(tipo, matricula).geometry) ??
        sitiosPorMedidas(tipo.envergadura);
      sitiosPorTipo.set(tipo.id, sitios);
    }
    return new LucesDeUnAvion(sitios, materialDeLasLuces, desfaseDe(matricula));
  };

  /**
   * **El bueno de cerca y el de la fábrica de lejos.** El modelo de la flota
   * son de quince a treinta mil triángulos y el de la fábrica unos cientos;
   * a partir de `DE_CERCA` un reactor ocupa cincuenta píxeles y no se
   * distinguen, y el tráfico pasa casi todo el rato en el circuito, lejos.
   */
  const conDistancia = (bueno: Object3D, lejos: Object3D): LOD => {
    const lod = new LOD();
    lod.name = "trafico-distancia";
    lod.addLevel(bueno, 0);
    lod.addLevel(lejos, DE_CERCA);
    return lod;
  };

  const cuerpo = (tipo: TipoDeTrafico, matricula: string): Object3D => {
    const modelo = opciones.cuerposDeVerdad
      ? MODELO_DEL_TIPO[tipo.id]
      : undefined;
    if (modelo) {
      const hecho = cuerposListos.get(tipo.id);
      if (hecho)
        return conDistancia(
          vestirCuerpo(hecho, libreaDe(matricula, tipo)),
          deFabrica(tipo, matricula),
        );
      pedirCuerpo(tipo, modelo);
    }
    return deFabrica(tipo, matricula);
  };

  /** Lo largo de cada camino, una vez: se pregunta en cada fotograma. */
  const largos = new WeakMap<Sitio[], number>();
  const largoDe = (camino: Sitio[]): number => {
    let l = largos.get(camino);
    if (l === undefined) {
      l = largoDelCamino(camino);
      largos.set(camino, l);
    }
    return l;
  };

  /** Si va por el camino de quien aterriza y todavía no ha salido de la pista. */
  const aterrizando = (quien: Volando): boolean =>
    !!quien.caminos &&
    quien.marca.camino === quien.caminos.llegada &&
    quien.recorrido < quien.caminos.fuera - 0.5;

  /** Si viene a aterrizar, con permiso o sin él. */
  const llegando = (quien: Volando): boolean =>
    !!quien.caminos &&
    (quien.marca.camino === quien.caminos.llegada ||
      quien.marca.camino === quien.caminos.sinPermiso);

  /** Si viene a aterrizar y todavía no ha girado a final. */
  const enLaBase = (quien: Volando): boolean =>
    !!quien.caminos && llegando(quien) && quien.recorrido < quien.caminos.entra;

  /**
   * Si ya vuela la final —girado de la base y antes de la decisión o la
   * toma—, o está en la pista. Por el camino de la llegada, con permiso o sin
   * él; pasada la decisión sin permiso ya se está yendo al aire.
   */
  const yaEnFinal = (quien: Volando): boolean => {
    const c = quien.caminos;
    return (
      !!c &&
      llegando(quien) &&
      quien.recorrido >= c.entra &&
      (quien.marca.camino === c.llegada || quien.recorrido < c.decide)
    );
  };

  /*
   * **Sin permiso, por el camino que no toca la pista.** Hasta la altura de
   * decisión los dos caminos son el mismo, así que cambiar de uno a otro antes
   * de llegar a ella no mueve el avión: el permiso puede llegar en cualquier
   * momento del circuito, y llega sin tirones.
   */
  const porSuCamino = (
    c: Caminos | null,
    marca: Marca,
    conPermiso: boolean,
  ): Marca => {
    if (!c || marca.metros >= c.decide) return marca;
    if (!conPermiso && marca.camino === c.llegada)
      return { ...marca, camino: c.sinPermiso };
    if (conPermiso && marca.camino === c.sinPermiso)
      return { ...marca, camino: c.llegada };
    return marca;
  };

  /**
   * **A cuánto va ahora**, según por dónde vaya.
   *
   * Con calles, lo que hace un avión de verdad: el que aterriza toca a su
   * velocidad de final y frena por el eje hasta rodar a paso de calle en la
   * boca de la salida; el que sale rueda hasta la pista, se alinea y acelera
   * en su carrera hasta irse al aire. Sin calles, lo de antes: la carrera a la
   * mitad de lo que se volaba. Ver `FRENANDO`.
   */
  const velocidadDe = (quien: Volando): number => {
    const c = quien.caminos;
    const m = quien.marca;
    const r = quien.recorrido;
    const t = c?.enTierra;
    if (c && m.camino === c.llegada && r >= c.toca) {
      if (!t || t.boca <= 0) return m.velocidad * FRENANDO;
      // Pasada la boca, lo que quede de pista se rueda a paso vivo: es
      // pista ocupada, y el que la ocupa la deja cuanto antes.
      if (r >= t.boca) return r < c.fuera ? RUEDA_A * 2 : RUEDA_A;
      const f = (r - c.toca) / Math.max(1, t.boca - c.toca);
      const alTocar = t.tipo.aproximacion * 0.85;
      return alTocar + (RUEDA_A * 1.5 - alTocar) * f;
    }
    if (c && t && t.despega > 0 && m.camino === c.salida) {
      if (r < t.eje) return RUEDA_A;
      if (r < t.despega) {
        const f = (r - t.eje) / Math.max(1, t.despega - t.eje);
        return 4 + (t.tipo.aproximacion * 1.1 - 4) * f;
      }
    }
    return m.velocidad;
  };

  /** Si en este punto de su camino va por el suelo. */
  const porTierra = (quien: Volando): boolean => {
    const c = quien.caminos;
    const t = c?.enTierra;
    if (!c || !t) return false;
    if (quien.marca.camino === c.llegada) return quien.recorrido >= c.toca;
    if (quien.marca.camino === c.salida)
      return t.despega > 0 && quien.recorrido < t.despega;
    return false;
  };

  /**
   * **Si rueda por las calles**, que es donde cede el paso: el que sale, del
   * puesto hasta alinearse en la pista; el que llega, desde la boca de su
   * salida hasta su puesto. Las dos carreras —la de despegar y la de frenar—
   * no: ahí la pista es suya, y que no haya nadie más en ella lo guarda la
   * torre. Ver `cedeA`.
   */
  const porLasCalles = (quien: Volando): boolean => {
    const c = quien.caminos;
    const t = c?.enTierra;
    if (!c || !t) return false;
    const r = quien.recorrido;
    if (quien.marca.camino === c.salida) return t.despega > 0 && r < t.eje;
    if (quien.marca.camino === c.llegada) return t.boca > 0 && r >= t.boca;
    return false;
  };

  /**
   * **Lo que puede avanzar sin echársete encima**, m, de los `quiere` que le
   * tocan en este paso.
   *
   * El tráfico rodaba por su camino sin mirar a nadie, y quien juega es un
   * avión más en las calles. En Guaraní, con el JAZ 120: «aparece un avión
   * que sale del hangar, gira hacia mí y me atraviesa». Y esperando en la
   * doble raya: «viene un avión por detrás y me topa». Dos aviones que se
   * tocan en una calle son un accidente, aquí y en cualquier aeropuerto.
   *
   * Así que mira su camino por delante y, si algún punto le deja a menos de
   * la separación de ala de donde estás —o de por donde vas a pasar en los
   * próximos segundos—, frena para pararse antes. Es lo que hace un piloto de
   * verdad: se para detrás del de delante, y en un cruce cede al que va a
   * pasar. Y **solo si avanzar le acerca a ti**: si ya te tiene detrás, o te
   * acabas de arrimar tú, seguir le aleja y sigue; parándose ahí sería él
   * quien no te deja pasar.
   */
  const cedeA = (
    quien: Volando,
    tu: EnTierra,
    quiere: number,
    velocidad: number,
    dt: number,
  ): number => {
    const camino = quien.marca.camino;
    const r = quien.recorrido;
    const aqui = porElCamino(camino, r)?.sitio;
    if (!aqui) return quiere;
    const tuyos: readonly EnElPlano[] = [{ x: tu.x, z: tu.z }, ...tu.porDondeVa];
    const ahora = tuyos.map((q) => Math.hypot(q.x - aqui.x, q.z - aqui.z));
    const largo = largoDe(camino);
    const mira = Math.max(
      MIRA_POR_DELANTE,
      quiere + (velocidad * velocidad) / (2 * FRENA_AL_CEDER) + PASO_DE_LA_MIRADA,
    );
    for (let s = PASO_DE_LA_MIRADA; s <= mira && r + s <= largo; s += PASO_DE_LA_MIRADA) {
      const p = porElCamino(camino, r + s)!.sitio;
      for (let k = 0; k < tuyos.length; k++) {
        const q = tuyos[k]!;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d >= tu.separacion || d >= ahora[k]! - 0.01) continue;
        const libre = Math.max(0, s - PASO_DE_LA_MIRADA);
        return Math.min(quiere, libre, Math.sqrt(2 * FRENA_AL_CEDER * libre) * dt);
      }
    }
    return quiere;
  };

  /**
   * Si el sitio de una marca cae **encima de quien juega**: un avión que
   * todavía no se ve no puede aparecer ahí. Ver `noCabeTodavia`.
   */
  const encimaDeTi = (donde: Sitio | undefined): boolean => {
    const tu = opciones.quienJuega?.()?.enTierra;
    if (!tu || !donde) return false;
    return Math.hypot(donde.x - tu.x, donde.z - tu.z) < tu.separacion;
  };

  /**
   * **En qué anda, para sus luces.** Sale del camino que recorre y de por
   * dónde va en él, que es lo mismo que decide su velocidad: con calles, el
   * que llega toca, corre y rueda a su puesto; el que sale rueda, espera en
   * la doble raya, entra, se alinea y corre. Ver `lucesDelTrafico`.
   */
  const faseDeLuces = (quien: Volando): FaseDeLuces => {
    const c = quien.caminos;
    if (!c) return "volando";
    const r = quien.recorrido;
    const camino = quien.marca.camino;
    if (camino === c.llegada) {
      if (r < c.toca) return "volando";
      if (r < c.fuera) return "carrera";
      return r >= largoDe(camino) - 0.5 ? "aparcado" : "rodando";
    }
    if (camino === c.salida) {
      // Sin calles no hay eje apuntado en los tramos de tierra: es el tope de
      // «line up and wait», y de ahí el camino ya sube.
      const eje =
        c.enTierra?.eje || c.marcas["torre.lineUpWait"]?.tope || c.espera;
      const despega = c.enTierra?.despega || eje;
      if (r < c.espera - 0.5) return "rodando";
      if (r < eje - 0.5) return quien.avanza ? "entrando" : "esperando";
      // En el eje y parado, esperando el permiso: ahí manda el tope.
      if (!quien.avanza && r < eje + 0.5) return "alineado";
      if (r < despega) return "carrera";
    }
    return "volando";
  };

  /** Enciende lo que toca en este instante. */
  const alumbrar = (quien: Volando): void =>
    quien.luces.paso(
      reloj,
      lucesDelTrafico(faseDeLuces(quien), quien.grupo.position.y),
    );

  /**
   * Si va **dando la vuelta**: subiendo de una frustrada —la orden de la torre
   * o la decisión sin permiso— camino de `lejos`, donde empieza la vuelta
   * siguiente. Ver `otraVuelta`.
   */
  const dandoLaVuelta = (quien: Volando): boolean => {
    const c = quien.caminos;
    if (!c) return false;
    const camino = quien.marca.camino;
    if (camino === c.sinPermiso) return quien.recorrido >= c.decide;
    return camino !== c.llegada && camino !== c.salida;
  };

  /**
   * **Y al acabar la frustrada, otra vuelta al circuito**, desde `lejos`, que
   * es donde acaban los caminos de irse al aire y donde empieza `llegada`: no
   * se mueve ni un metro.
   *
   * Se le retiraba ahí, en el aire, y la frecuencia —que en el guion de la
   * frustrada le hace cantar viento en cola otra vez— lo volvía a poner en su
   * marca, un kilómetro o dos más atrás por el mismo viento en cola. Quien
   * volaba ese tramo lo veía desaparecer y aparecer de frente: era una de las
   * dos veces que el banco del vuelo entero daba «un tráfico viene de frente».
   * Un avión que se va al aire vuelve al circuito y aterriza, que es lo que
   * cuenta la radio.
   */
  const otraVuelta = (quien: Volando): void => {
    const c = quien.caminos!;
    quien.marca = {
      camino: quien.conPermiso ? c.llegada : c.sinPermiso,
      metros: 0,
      velocidad: c.marcas["otro.enCola"]?.velocidad ?? quien.marca.velocidad,
    };
    quien.recorrido = 0;
    // Hace lo que le mandaron: no es uno al que se ha dejado de nombrar.
    quien.olvidado = 0;
  };

  /**
   * **Lo que dice quien ya se ve, dicho sin moverle de sitio**, o `null` si
   * su marca está en otro camino y no hay más remedio.
   *
   * Cada llamada ponía al avión en su marca, y eso a quien no se veía le
   * viene bien —está donde dice— pero a quien ya se ve le hace dar un salto:
   * cien metros del punto de espera al eje con «cleared for take-off», y hasta
   * dos kilómetros hacia atrás por el viento en cola al cantarlo después de
   * una frustrada. Un avión no salta. Si ya va por el camino de la llamada,
   * sigue donde está; si viene dando la vuelta, termina de darla y la llamada
   * espera —ver `todaviaNo`—; y en la vuelta, antes de la decisión, el camino
   * con permiso y el de sin él son el mismo.
   */
  const sinSaltar = (quien: Volando, marca: Marca): Marca | null => {
    const c = quien.caminos;
    if (dandoLaVuelta(quien)) return { ...quien.marca, metros: quien.recorrido };
    if (marca.camino === quien.marca.camino)
      return { ...marca, metros: quien.recorrido };
    const enVuelta = (camino: Sitio[]): boolean =>
      !!c && (camino === c.llegada || camino === c.sinPermiso);
    if (
      c &&
      enVuelta(marca.camino) &&
      enVuelta(quien.marca.camino) &&
      quien.recorrido < c.decide
    )
      return porSuCamino(c, { ...marca, metros: quien.recorrido }, quien.conPermiso);
    return null;
  };

  const quitar = (matricula: string, quien: Volando): void => {
    grupo.remove(quien.grupo);
    quien.luces.dispose();
    aviones.delete(matricula);
  };

  /*
   * ── **Uno detrás de otro, y uno en la pista** ─────────────────────────────
   *
   * Cada llamada ponía a cada avión en su marca y cada tipo volaba su propio
   * circuito, así que dos llegadas podían coincidir en la misma final: el
   * turbohélice entraba en la suya a trescientos metros del reactor que
   * bajaba por la suya, y en la carta se veían dos o tres aviones entrando a
   * la vez en la pista. Nadie los ponía en fila.
   *
   * Lo que hace un control de verdad es eso: separar las llegadas —un par de
   * minutos, tres millas como poco— y no dejar que el siguiente cruce el
   * umbral hasta que el anterior ha dejado la pista. Aquí se hace en la
   * esquina de la base, que es donde quien llega decide si gira: si girando
   * ya no quedaría su hueco, da un tres sesenta hacia fuera y vuelve a mirar.
   * Y en la decisión, si la pista sigue ocupada, al aire.
   */

  /**
   * **Si está encima de la pista**: posado sin haberla dejado, o saliendo
   * desde que pasa su doble raya hasta que tiene las ruedas en el aire.
   */
  const encimaDeLaPista = (quien: Volando): boolean => {
    const c = quien.caminos;
    if (!c) return false;
    const r = quien.recorrido;
    const camino = quien.marca.camino;
    if (camino === c.llegada) return r >= c.toca - 0.5 && r < c.fuera - 0.5;
    if (camino === c.salida) {
      if (r <= c.espera + 0.5) return false;
      const despega = c.enTierra?.despega ?? 0;
      if (despega > 0) return r < despega;
      return quien.grupo.position.y - cota < 10;
    }
    return false;
  };

  /**
   * Si hay alguien encima de la pista **que no sea `matricula`**: otro
   * dibujado, o quien juega.
   */
  const pistaOcupadaPorOtro = (matricula: string | null): boolean => {
    for (const [m, b] of aviones) if (m !== matricula && encimaDeLaPista(b)) return true;
    return !!opciones.quienJuega?.()?.enLaPista;
  };

  /**
   * Metros que le quedan hasta el punto de toma, si viene a aterrizar y no ha
   * llegado —ni se está yendo al aire—. Con la vuelta de espera, lo que le
   * falta de ella además.
   */
  const metrosAlUmbral = (quien: Volando): number | null => {
    const c = quien.caminos;
    if (!c || !llegando(quien)) return null;
    const r = quien.recorrido;
    if (quien.marca.camino === c.sinPermiso && r >= c.decide) return null;
    if (r >= c.toca) return null;
    const vuelta = quien.tresSesenta
      ? largoDelTresSesenta(quien.tresSesenta) - quien.tresSesenta.hecho
      : 0;
    return c.toca - r + vuelta;
  };

  /**
   * Cuándo cruza el umbral, s del reloj del tráfico, **si ya está en la
   * fila**: pasada la esquina de la base o esperando en ella. O cuándo lo
   * cruzó, si fue hace poco: el siguiente cuenta su hueco desde ahí.
   */
  const horaDeUmbral = (quien: Volando): number | null => {
    const c = quien.caminos;
    const metros = metrosAlUmbral(quien);
    if (c && metros !== null && (quien.tresSesenta || quien.recorrido >= c.base - 0.5))
      return reloj + metros / quien.marca.velocidad;
    if (quien.cruzo !== null && reloj - quien.cruzo < 2 * SEPARACION_ENTRE_LLEGADAS)
      return quien.cruzo;
    return null;
  };

  /**
   * La hora de umbral que se le vio por última vez a quien juega, mientras
   * volaba la final. Posado en la pista, es cuando la cruzó. Ver `laFila`.
   */
  let tuHora: number | null = null;

  /**
   * **Lo que se le da a quien juega para despegar**, s: si está encima de la
   * pista sin haber llegado volando, es que sale, y el que viene no cruza el
   * umbral hasta este rato después.
   */
  const QUIEN_SALE = 60;

  /**
   * **La fila de llegadas**, sin `sin`: la hora de umbral de cada uno de los
   * que ya están en ella y a cuánto vienen, y quien juega si viene en final
   * o está encima de la pista. `sale` es quien la ocupa despegando, que no
   * es una llegada y pide otra cuenta.
   */
  const laFila = (
    sin: Volando | null,
  ): { hora: number; velocidad: number; sale: boolean }[] => {
    const fila: { hora: number; velocidad: number; sale: boolean }[] = [];
    for (const b of aviones.values()) {
      if (b === sin) continue;
      const hora = horaDeUmbral(b);
      if (hora !== null)
        fila.push({ hora, velocidad: b.marca.velocidad, sale: false });
    }
    const tu = opciones.quienJuega?.();
    const velocidad = tu?.velocidad ?? VUELA_A;
    if (tu?.alUmbral != null)
      fila.push({ hora: reloj + tu.alUmbral, velocidad, sale: false });
    else if (tu?.enLaPista)
      fila.push(
        tuHora !== null
          ? { hora: tuHora, velocidad, sale: false }
          : { hora: reloj, velocidad, sale: true },
      );
    return fila.sort((a, b) => a.hora - b.hora);
  };

  /**
   * **Cuánto tiene que esperar** quien cruzaría el umbral a la hora
   * `natural` viniendo a `velocidad`, para que le quede su hueco con todos
   * los de la fila: detrás del que va delante, y delante del que viene detrás
   * solo si le cabe. En orden de llegada: al que ya estaba no se le cuela
   * nadie. `colchon` es lo que se deja de más al decidirlo. Ver `COLCHON`.
   */
  const retrasoPara = (
    sin: Volando | null,
    natural: number,
    velocidad: number,
    colchon = COLCHON,
  ): number => {
    let hora = natural;
    for (const b of laFila(sin)) {
      const detras = b.sale ? QUIEN_SALE : separacionPara(velocidad) + colchon;
      const delante = b.sale ? 0 : separacionPara(b.velocidad) + colchon;
      if (hora < b.hora + detras && hora > b.hora - delante) hora = b.hora + detras;
    }
    return hora - natural;
  };

  /** El retraso con que giraría a la base ahora, desde la esquina. */
  const retrasoEnLaEsquina = (quien: Volando, c: Caminos): number =>
    retrasoPara(
      quien,
      reloj + (c.toca - c.base) / quien.marca.velocidad,
      quien.marca.velocidad,
    );

  /**
   * **Si alguien va delante demasiado cerca** de quien vuela la final sin
   * permiso: quien juega, que ha entrado en final por delante después de que
   * éste girara, o que va más despacio de lo que se contaba. Sin colchón: el
   * colchón es para decidir, y esto es ya no caber.
   */
  const demasiadoCerca = (quien: Volando): boolean => {
    const mia = horaDeUmbral(quien);
    if (mia === null) return false;
    const detras = separacionPara(quien.marca.velocidad);
    for (const b of laFila(quien)) {
      if (b.hora > mia) continue;
      if (mia - b.hora < (b.sale ? QUIEN_SALE : detras)) return true;
    }
    return false;
  };

  /** Lo que tarda un tipo en correr su despegue, s. Ver `velocidadDe`. */
  const tiempoDeCarrera = (tipo: TipoDeTrafico): number => {
    const alVolar = tipo.aproximacion * 1.1;
    return (tipo.carrera / Math.max(1, alVolar - 4)) * Math.log(alVolar / 4);
  };

  /**
   * **Si viene alguien antes de que quien sale haya dejado la pista.** Lo
   * que tarda en entrar, alinearse y correr su despegue; y si va a esperar
   * alineado, lo que puede tardar la torre en darle la salida.
   */
  const llegaAntesDeQueSalga = (tipo: TipoDeTrafico, clave: string): boolean => {
    const hueco =
      ENTRAR_Y_ALINEARSE +
      tiempoDeCarrera(tipo) +
      (clave === "torre.lineUpWait" ? ESPERA_MAXIMA : 0);
    return laFila(null).some(
      (b) => !b.sale && b.hora >= reloj && b.hora - reloj < hueco,
    );
  };

  /** Lo que se aparta un avión que aparece de los que ya se ven, m. */
  const APARTE = 1500;

  /**
   * **Si uno que todavía no se ve no cabe donde dice su llamada**: encima de
   * otro que ya vuela ahí, o sin su hueco en la fila. Espera fuera, que es lo
   * que hace el control con quien todavía no ha entrado, y llama cuando
   * quepa. Ver `todaviaNo`.
   */
  const noCabeTodavia = (matricula: string, clave: string): boolean => {
    const c = caminosDe(tipoDe(matricula));
    const marca = c?.marcas[clave];
    /*
     * **Ni encima de ti.** El que aparece en su puesto, en su doble raya o al
     * dejar la pista aparece donde dice; si ahí estás tú, espera a que te
     * vayas. Ver `encimaDeTi`.
     */
    if (marca && encimaDeTi(porElCamino(marca.camino, marca.metros)?.sitio))
      return true;
    if (clave !== "otro.enCola" && clave !== "otro.final") return false;
    if (!c || !marca) return false;
    const donde = porElCamino(marca.camino, marca.metros)?.sitio;
    if (donde)
      for (const b of aviones.values()) {
        const p = b.grupo.position;
        if (p.y - cota > 30 && Math.hypot(p.x - donde.x, p.z - donde.z) < APARTE)
          return true;
      }
    const natural = reloj + (c.toca - marca.metros) / marca.velocidad;
    return retrasoPara(null, natural, marca.velocidad) > 0;
  };

  /**
   * **El tres sesenta de espera**, desde la esquina de la base y hacia
   * fuera. A régimen estándar, así que la vuelta dura dos minutos sea quien
   * sea; y si hacia fuera sube el relieve, se sube en medio de la vuelta y se
   * baja otra vez a la esquina. Ver `SOBRE_EL_RELIEVE`.
   */
  const tresSesentaDesde = (quien: Volando, c: Caminos): TresSesenta => {
    const esquina = porElCamino(quien.marca.camino, c.base)!.sitio;
    const antes = porElCamino(quien.marca.camino, Math.max(0, c.base - 50))!.sitio;
    const radio = quien.marca.velocidad / VIRAJE_ESTANDAR;
    const cx = esquina.x + c.haciaFuera.x * radio;
    const cz = esquina.z + c.haciaFuera.z * radio;
    const desde = Math.atan2(esquina.z - cz, esquina.x - cx);
    // El sentido que sigue el viento en cola: la vuelta no empieza con un tirón.
    const sigue =
      -Math.sin(desde) * (esquina.x - antes.x) + Math.cos(desde) * (esquina.z - antes.z);
    const sentido: 1 | -1 = sigue >= 0 ? 1 : -1;
    let sube = 0;
    const alto = opciones.tierra?.()?.alto;
    if (alto)
      for (let k = 1; k < 12; k++) {
        const giro = (k * Math.PI) / 6;
        const a = desde + sentido * giro;
        const suelo = alto(cx + radio * Math.cos(a), cz + radio * Math.sin(a));
        const falta = suelo + SOBRE_EL_RELIEVE - esquina.y;
        if (falta > 0) sube = Math.max(sube, falta / Math.sin(giro / 2));
      }
    return {
      cx,
      cz,
      radio,
      desde,
      sentido,
      y: esquina.y,
      sube: Math.min(sube, 2000),
      hecho: 0,
    };
  };

  /**
   * **Al aire desde donde está**, sin esperar a la decisión: el que va en
   * final sin sitio, o el que llega a ella con la pista ocupada. Sube por el
   * mismo camino que la orden de la torre y da otra vuelta. Ver `alAireDesde`
   * y `otraVuelta`.
   */
  const alAireYa = (quien: Volando, c: Caminos): void => {
    const aqui = porElCamino(quien.marca.camino, quien.recorrido)?.sitio;
    const orden = c.marcas["torre.goAround"];
    if (!aqui || !orden) return;
    quien.marca = alAireDesde(orden, aqui);
    quien.recorrido = 0;
    quien.conPermiso = false;
  };

  return {
    grupo,
    anuncia(matricula, clave, puedeAterrizar = false) {
      let quien = aviones.get(matricula);
      const tipo = quien?.tipo ?? tipoDe(matricula);
      const c = quien ? quien.caminos : caminosDe(tipo);
      const marca = c?.marcas[clave];
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
          if (quien.recorrido < (quien.caminos?.decide ?? 0))
            quien.marca = porSuCamino(quien.caminos, quien.marca, quien.conPermiso);
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
        if (quien.recorrido < (quien.caminos?.decide ?? 0))
          quien.marca = porSuCamino(quien.caminos, quien.marca, quien.conPermiso);
        return;
      }
      /*
       * **Y a quien ya se ve, ni la orden de irse al aire le mueve si ya se
       * está yendo**, ni lo demás le hace saltar. Ver `sinSaltar`.
       */
      if (quien && (clave !== "torre.goAround" || dandoLaVuelta(quien))) {
        const suyo = sinSaltar(quien, marca);
        if (suyo) {
          quien.marca = suyo;
          quien.recorrido = suyo.metros;
          quien.olvidado = 0;
          quien.quieto = 0;
          colocar(quien);
          return;
        }
      }
      if (!quien) {
        const g = new Group();
        g.name = "trafico-avion";
        g.add(cuerpo(tipo, matricula));
        const luces = lucesDe(tipo, matricula);
        g.add(luces.puntos);
        grupo.add(g);
        quien = {
          grupo: g,
          tipo,
          caminos: c,
          marca,
          recorrido: marca.metros,
          olvidado: 0,
          conPermiso: puedeAterrizar,
          quieto: 0,
          avanza: true,
          luces,
          tresSesenta: null,
          cruzo: null,
          cedido: 0,
        };
        aviones.set(matricula, quien);
      }
      const p = quien.grupo.position;
      const esta =
        clave === "torre.goAround" && yaSeVeia
          ? alAireDesde(marca, { x: p.x, y: p.y, z: p.z })
          : porSuCamino(quien.caminos, marca, quien.conPermiso);
      quien.marca = esta;
      quien.recorrido = esta.metros;
      // Puesto en otro sitio, ya no está dando la vuelta de espera.
      quien.tresSesenta = null;
      quien.olvidado = 0;
      quien.quieto = 0;
      // Puesto en otra marca, se mueve: si le toca esperar, lo dirá el paso.
      quien.avanza = true;
      colocar(quien);
      alumbrar(quien);
    },
    paso(dt) {
      let seFueron: string[] | null = null;
      reloj += dt;
      /*
       * Y quien juega, visto por última vez en su final: posado, es cuando
       * cruzó el umbral; ni en final ni en la pista, es que se fue al aire o
       * ya la dejó, y no cuenta. Ver `laFila`.
       */
      const tu = opciones.quienJuega?.() ?? null;
      if (tu?.alUmbral != null) tuHora = reloj + tu.alUmbral;
      else if (!tu?.enLaPista) tuHora = null;
      const tuEnTierra = tu?.enTierra ?? null;
      for (const [matricula, quien] of aviones) {
        const c = quien.caminos;
        const antes = quien.recorrido;
        const tope = quien.marca.tope ?? Infinity;
        if (quien.tresSesenta) {
          /*
           * **Dando la vuelta de espera, su camino no avanza**: está en la
           * esquina, esperando. Al cerrar la vuelta mira otra vez si ya le
           * cabe girar; si no, otra.
           */
          const vuelta = quien.tresSesenta;
          vuelta.hecho += quien.marca.velocidad * dt;
          const entera = largoDelTresSesenta(vuelta);
          if (vuelta.hecho >= entera) {
            if (c && retrasoEnLaEsquina(quien, c) > 0) vuelta.hecho -= entera;
            else {
              quien.recorrido = Math.min(antes + (vuelta.hecho - entera), tope);
              quien.tresSesenta = null;
            }
          }
          quien.cedido = 0;
        } else {
          /*
           * **Y por las calles, cediéndote el paso.** Ver `cedeA`.
           */
          const velocidad = velocidadDe(quien);
          const quiere = velocidad * dt;
          const puede =
            tuEnTierra && porLasCalles(quien)
              ? cedeA(quien, tuEnTierra, quiere, velocidad, dt)
              : quiere;
          quien.cedido = puede < quiere - 1e-6 ? quien.cedido + dt : 0;
          quien.recorrido = Math.min(antes + puede, tope);
          /*
           * **Y en la esquina de la base, si girando no le queda su hueco,
           * espera turno.** Ver `SEPARACION_ENTRE_LLEGADAS`.
           */
          if (
            c &&
            llegando(quien) &&
            antes < c.base &&
            quien.recorrido >= c.base &&
            retrasoEnLaEsquina(quien, c) > 0
          ) {
            quien.recorrido = c.base;
            quien.tresSesenta = tresSesentaDesde(quien, c);
          }
        }
        const largo = largoDe(quien.marca.camino);
        const alFinal = quien.recorrido >= largo - 0.5;
        const esperando = quien.recorrido >= tope - 0.5;
        /*
         * **Y el que está aterrizando o rodando a su sitio no se olvida.**
         * Entre su «en final» y su «pista libre» pasa lo que tarda en posarse
         * y salir de la pista, que es más que el plazo de olvido: se esfumaba
         * rodando por el asfalto. Y después de decir «pista libre» sigue
         * rodando hasta su puesto: se olvida allí, aparcado, no a media calle.
         */
        if (aterrizando(quien) || (porTierra(quien) && !alFinal))
          quien.olvidado = 0;
        /*
         * Y el que viene volando a aterrizar, o dando la vuelta tras una
         * frustrada, se olvida despacio, como el que espera una orden: su
         * vuelo sigue abierto en la frecuencia, y lo que le toca decir espera
         * a que esté donde lo dice —ver `todaviaNo`— y a que la frecuencia
         * pueda hablar, que contigo en final no puede. Con el olvido de
         * siempre se esfumaba en el aire y reaparecía en su marca, un par de
         * kilómetros más atrás: visto desde su mismo viento en cola, un avión
         * de frente.
         */
        else if (
          (esperando && !alFinal) ||
          dandoLaVuelta(quien) ||
          (llegando(quien) && !!c && quien.recorrido < c.toca)
        )
          quien.olvidado += dt * OLVIDO_ESPERANDO;
        else quien.olvidado += dt;
        /*
         * **Y el que acabó su camino en el aire, se retira ya** —el que salió,
         * al perderse de vista—. Un avión colgado en el cielo en la esquina del
         * circuito esperando a que lo nombren no es un avión: es un adorno
         * roto. Menos el que se fue al aire, que da otra vuelta: ver
         * `otraVuelta`.
         */
        const enElAire = !!c && quien.grupo.position.y > cota + 60;
        if (alFinal && enElAire && !porTierra(quien)) {
          if (dandoLaVuelta(quien)) otraVuelta(quien);
          else quien.olvidado = Infinity;
        }
        /*
         * **La red de la roja eterna**: uno que ocupa la pista y ha dejado de
         * avanzar se retira, y con él lo que bloqueaba. Ver `QUIETO`.
         */
        // Dando la vuelta de espera no está quieto: está esperando turno.
        if (
          aterrizando(quien) &&
          !quien.tresSesenta &&
          dt > 0 &&
          quien.recorrido - antes < 1e-4
        )
          quien.quieto += dt;
        else quien.quieto = 0;
        if (dt > 0) quien.avanza = !!quien.tresSesenta || quien.recorrido - antes > 1e-4;
        /*
         * **Y la red del que se queda parado por ti**: frente a frente en una
         * calle, o con tu avión en mitad de su camino, se retira. Detrás de ti
         * en la fila de la doble raya no: ahí se espera tu turno. Ver
         * `PACIENCIA_CON_QUIEN_JUEGA`.
         */
        const harto =
          quien.cedido > PACIENCIA_CON_QUIEN_JUEGA && !tuEnTierra?.esperandoLaPista;
        if (quien.olvidado > SE_VA_A_LOS || quien.quieto > QUIETO || harto) {
          quitar(matricula, quien);
          continue;
        }
        if (
          c &&
          quien.marca.camino === c.llegada &&
          antes < c.toca &&
          quien.recorrido >= c.toca
        ) {
          quien.cruzo = reloj;
          rehacerLaLlegada(quien);
        }
        if (
          c &&
          quien.marca.camino === c.sinPermiso &&
          antes < c.decide &&
          quien.recorrido >= c.decide
        )
          (seFueron ??= []).push(matricula);
        else if (
          /*
           * **Con permiso, y la pista ocupada en la decisión: al aire.** No
           * se le da permiso con nadie encima —ver `todaviaNo`—, pero la pista
           * se puede ocupar después: quien juega entrando sin luz verde, uno
           * que tarda en dejarla. El que tiene que cruzar el umbral no lo
           * cruza hasta que la pista esté libre, y si no da tiempo, frustra.
           */
          c &&
          quien.marca.camino === c.llegada &&
          antes < c.decide &&
          quien.recorrido >= c.decide &&
          pistaOcupadaPorOtro(matricula)
        ) {
          alAireYa(quien, c);
          (seFueron ??= []).push(matricula);
        } else if (
          /*
           * **Y sin permiso, en final y sin su hueco: al aire ya**, sin bajar
           * hasta la decisión detrás de quien va delante. Solo pasa si quien
           * juega se mete en final por delante después de que éste girara.
           */
          c &&
          quien.marca.camino === c.sinPermiso &&
          !quien.tresSesenta &&
          quien.recorrido >= c.entra &&
          quien.recorrido < c.decide &&
          demasiadoCerca(quien)
        ) {
          alAireYa(quien, c);
          (seFueron ??= []).push(matricula);
        }
        colocar(quien);
        alumbrar(quien);
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
      /*
       * **Y la pista no se da con nadie encima**, ni para salir con alguien
       * a punto de llegar: el que la pida espera su turno sin perderlo. La
       * pista es de uno por vez, y el que despega la sigue pisando hasta que
       * tiene las ruedas en el aire. Ver `encimaDeLaPista` y
       * `llegaAntesDeQueSalga`.
       */
      if (
        clave === "torre.clearedLand" ||
        clave === "torre.lineUpWait" ||
        clave === "torre.clearedTakeoff"
      ) {
        /*
         * **Y la salida se da en el punto de espera**, no rodando hacia él.
         * Se daba a su hora de radio, con el avión todavía a un kilómetro por
         * las calles: minutos después llegaba a la pista y entraba sin que
         * nadie le mirara, con otro aterrizando —medido en Pettirossi, un
         * bimotor entrando en la pista con un reactor en su carrera—. Se
         * espera a que esté en su doble raya, que es donde se pide.
         */
        const c = quien?.caminos;
        if (
          c &&
          clave !== "torre.clearedLand" &&
          quien!.marca.camino === c.salida &&
          quien!.recorrido < c.espera - 1
        )
          return true;
        if (pistaOcupadaPorOtro(matricula)) return true;
        if (
          clave !== "torre.clearedLand" &&
          llegaAntesDeQueSalga(quien?.tipo ?? tipoDe(matricula), clave)
        )
          return true;
      }
      if (!quien) return noCabeTodavia(matricula, clave);
      // Viento en cola y final, cuando haya vuelto al circuito. Ver `sinSaltar`.
      if ((clave === "otro.enCola" || clave === "otro.final") && dandoLaVuelta(quien))
        return true;
      /*
       * **Y el viento en cola, a la altura de la cabecera**, que es donde se
       * canta. Al que vuelve a dar la vuelta tras una frustrada se le oía
       * nada más empezar el viento en cola, dos kilómetros antes: con eso la
       * final le llegaba tarde y se esfumaba esperándola. Ver `sinSaltar`.
       */
      const c = quien.caminos;
      const marca = c?.marcas["otro.enCola"];
      if (
        clave === "otro.enCola" &&
        c &&
        marca &&
        (quien.marca.camino === c.llegada || quien.marca.camino === c.sinPermiso) &&
        quien.recorrido < marca.metros
      )
        return true;
      if (clave === "otro.pistaLibre") return aterrizando(quien);
      if (clave === "otro.final") return enLaBase(quien);
      return false;
    },
    enFinal(matricula) {
      const quien = aviones.get(matricula);
      const c = quien?.caminos;
      if (!quien || !c || !aterrizando(quien)) return null;
      if (quien.recorrido < c.entra) return null;
      return Math.max(0, c.toca - quien.recorrido);
    },
    dondeParan() {
      const puntos: { x: number; z: number; sale: boolean; hay: boolean }[] = [];
      for (const c of caminosPorTipo.values()) {
        if (!c?.enTierra) continue;
        const raya = porElCamino(c.salida, c.espera);
        if (raya) puntos.push({ x: raya.sitio.x, z: raya.sitio.z, sale: true, hay: false });
      }
      for (const quien of aviones.values()) {
        const c = quien.caminos;
        if (!c?.enTierra) continue;
        const sale =
          quien.marca.camino === c.salida && quien.recorrido < c.enTierra.despega;
        const llega =
          quien.marca.camino === c.llegada && quien.recorrido >= c.toca;
        if (sale || llega)
          puntos.push({
            x: quien.grupo.position.x,
            z: quien.grupo.position.z,
            sale,
            hay: true,
          });
      }
      return puntos;
    },
    esperanPorTi() {
      const quienes: string[] = [];
      for (const [matricula, quien] of aviones)
        if (quien.cedido > 0 && quien.marca.camino === quien.caminos?.salida)
          quienes.push(matricula);
      return quienes;
    },
    quienes() {
      return [...aviones].map(([matricula, quien]) => ({
        matricula,
        x: quien.grupo.position.x,
        y: quien.grupo.position.y,
        z: quien.grupo.position.z,
        conPermiso: quien.conPermiso,
        llegando: llegando(quien),
        tipo: quien.tipo.id,
        enLaPista: encimaDeLaPista(quien),
        esperandoTurno: !!quien.tresSesenta,
      }));
    },
    ocupanLaPista() {
      return [...aviones]
        .filter(([, quien]) => encimaDeLaPista(quien))
        .map(([matricula]) => matricula);
    },
    secuencia() {
      const fila: ReturnType<Trafico["secuencia"]> = [];
      for (const [matricula, quien] of aviones) {
        const hora = horaDeUmbral(quien);
        if (hora === null) continue;
        fila.push({
          matricula,
          alUmbral: hora - reloj,
          velocidad: quien.marca.velocidad,
          esperandoTurno: !!quien.tresSesenta,
          enFinal:
            !quien.tresSesenta &&
            !!quien.caminos &&
            hora > reloj &&
            quien.recorrido >= quien.caminos.entra,
        });
      }
      return fila.sort((a, b) => a.alUmbral - b.alUmbral);
    },
    vaciar() {
      for (const [matricula, quien] of aviones) quitar(matricula, quien);
    },
    dispose() {
      desmontado = true;
      for (const quien of aviones.values()) {
        grupo.remove(quien.grupo);
        quien.luces.dispose();
      }
      aviones.clear();
      materialDeLasLuces.dispose();
      // Los cuerpos buenos no: son de la página, y el tráfico del campo
      // siguiente los vuelve a usar. Ver `horneados`.
      for (const g of geometrias.values()) g.dispose();
      geometrias.clear();
      materialDeFabrica.dispose();
    },
  };
}

function colocar(quien: Volando): void {
  const donde = quien.tresSesenta
    ? enElTresSesenta(quien.tresSesenta)
    : porElCamino(quien.marca.camino, quien.recorrido);
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
