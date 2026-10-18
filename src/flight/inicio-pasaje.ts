/**
 * **La tercera escena del modo inicio: el primer vuelo de pasajero de Ara.**
 *
 * Las dos primeras enseñan a despegar y a aterrizar con Jazlyn al lado. Esta
 * es la otra primera vez, la que casi todo el mundo tiene antes que la de
 * pilotar: **subirse a un avión de línea**. Ara va sentada junto a la
 * ventanilla —sin género: ni sentado ni sentada, la escena no lo dice— y
 * Jazlyn es la comandante, en la cabina de mando, hablando por la megafonía.
 * No se toca ningún mando: es mirar y escuchar. Lo lleva la tripulación, como
 * en un vuelo de verdad; ver `vuelo-de-linea.ts`.
 *
 * Se abre con su ficha en «¿A qué jugás?» o con `?inicio=3`. No es la
 * primera experiencia: esa sigue siendo el despegue.
 *
 * ## El vuelo
 *
 * **De Los Rodeos a La Palma**, en el JAZ 90, que es un reactor regional de su
 * clase —en Canarias los saltos entre islas los hacen turbohélices y reactores
 * regionales—, con el día de siempre del norte de Tenerife: el alisio del
 * nordeste y su mar de nubes a unos mil quinientos metros, que se atraviesa al
 * subir. Es el tramo donde más hay que contar por la ventanilla: el valle de
 * La Orotava, el Teide asomando por encima de las nubes y La Gomera, las tres
 * por el mismo lado —el izquierdo, que es donde va Ara—, y las tres con su
 * historia. Ver `lo-que-se-ve-en-ruta.test.ts`.
 *
 * ## Lo que pasa, en el orden de un vuelo de verdad
 *
 * 1. **El asiento**: Ara descubre la ventanilla, el ala y el motor.
 * 2. **El cinturón**: la tripulación da la bienvenida y pide abrocharlo, bajo y
 *    ajustado, y Ara se lo abrocha.
 * 3. **Las puertas**: la comandante manda armar los toboganes —eso se dice con
 *    las puertas cerradas— y Ara se da cuenta de que ya se van. Con eso, la
 *    tripulación de mando arranca.
 * 4. **Los motores**, que se oyen arrancar.
 * 5. **El rodaje**, y la bienvenida de la comandante con cuánto dura el vuelo
 *    y a qué altura se va.
 * 6. **La espera** antes de la pista: Ara pregunta por qué se paran y la
 *    comandante cuenta que siempre se espera el permiso de la torre.
 * 7. **El despegue**: «tripulación, sentados para el despegue», y solo
 *    entonces se entra en la pista. El empuje del asiento, y volar.
 * 8. **Las nubes**: Ara pregunta de qué están hechas, y la comandante lo cuenta
 *    por la megafonía ya pasados los diez mil pies, que por debajo la cabina
 *    de mando no habla de nada que no sea volar.
 * 9. **Arriba**: se apaga el cartel del cinturón, pasa el servicio, y la
 *    comandante señala lo que se ve por la ventanilla, con su historia; y
 *    también bajando, hasta que se prepara la cabina para aterrizar.
 * 10. **La bajada**: la comandante y la tripulación; a Ara se le tapan los
 *     oídos, y la tripulación cuenta por qué y qué se hace. Y la isla de
 *     llegada, que Ara ve aparecer.
 * 11. **La aproximación**: el ala estirando los flaps.
 * 12. **La toma**: las ruedas, y el ruido de los motores frenando.
 * 13. **La llegada**: la bienvenida a La Palma, y la comandante cuenta a
 *     quienes volaron por primera vez para qué era ese ruido.
 * 14. **En el puesto**, con los motores parados, Ara celebra, y el sello del
 *     campo de llegada se queda en el cuaderno —el de visitas, que no es
 *     de pilotaje: Ara no ha pilotado—.
 *
 * ## Quién contesta, y cómo
 *
 * **La comandante no le contesta a un pasajero por la megafonía**, y aquí no
 * lo hace. Ara habla bajito con quien va a su lado —quien juega, o quien le
 * acompañe—; lo que contesta sus preguntas es lo que de verdad se dice en un
 * avión: anuncios **para todo el pasaje**, de los que dan las comandantes
 * «para quienes vuelan hoy por primera vez» y de los que da la tripulación
 * en la bajada. Ara pregunta primero, y el anuncio llega después y en su
 * momento, nunca encima.
 *
 * ## Lo que ya había y se usa tal cual
 *
 * Los anuncios de la megafonía —los toboganes, la bienvenida con el plan, los
 * cinturones, el servicio, el descenso, la aproximación y las dos llegadas—
 * los monta el juego como en cualquier vuelo con pasaje; la escena solo decide
 * **cuándo**, que es lo que tiene que decidir quien lleva una conversación.
 * Lo que se ve por la ventanilla, igual: el juego elige qué y por qué lado
 * —`LoQueSeVe`— y la escena lo dice cuando no hay nadie hablando.
 *
 * ## Un suceso, una voz
 *
 * Las mismas reglas que las otras dos escenas, con la misma cola de frases:
 * ver `conversacion.ts`. Nada se dice encima de nada, lo que ya no viene a
 * cuento se salta —una exclamación de la carrera no se dice volando—, y lo que
 * no tiene voz grabada espera el rato de leerlo.
 *
 * Esto es solo la secuencia: no toca el DOM, ni el modelo de vuelo, ni el
 * audio. Lo engancha `game.ts` y lo dibuja `ui/inicio.ts`.
 */

import { seLePasoElMomento } from "../audio/megafonia";
import { Conversacion, type FraseDicha, type Linea, type VozDelInicio } from "./conversacion";
import type { Fase } from "./vuelo";
import type { PermisosDeLaEscena, TramoDeLinea } from "./vuelo-de-linea";

/** Diez mil pies, m: por debajo, la cabina de mando no habla de nada que no sea volar. */
export const DIEZ_MIL_PIES = 10000 * 0.3048;

/** Dónde se vuela la escena, en qué avión y adónde. Ver la cabecera. */
export const SITIO_DEL_PASAJE = "tenerife-norte";
export const DESTINO_DEL_PASAJE = "la-palma";
export const AVION_DEL_PASAJE = "jaz-90";
/** Y el lado de la ventanilla de Ara: el de lo que se cuenta. */
export const LADO_DE_ARA = "izquierda" as const;

/** Qué hay que mirar: el dibujo de la tarjeta. Ver `ui/inicio.ts`. */
export type QueMirar = "ventanilla" | "ala" | "motor" | "nubes" | "cinturon";

export type MomentoDelPasaje =
  | "ventanilla"
  | "cinturon"
  | "puertas"
  | "motores"
  | "bienvenida"
  | "espera"
  | "despegue"
  | "carrera"
  | "volando"
  | "nubes"
  | "nubesRespuesta"
  | "arriba"
  | "servicio"
  | "bajada"
  | "oidos"
  | "isla"
  | "aproximacion"
  | "flaps"
  | "toma"
  | "llegada"
  | "puesto"
  | "fin";

/** Lo que la escena necesita saber del vuelo. Todo en SI. */
export interface LecturaDelPasaje {
  /** Lo que va haciendo la tripulación, y desde cuándo. Ver `vuelo-de-linea.ts`. */
  readonly tramo: TramoDeLinea;
  readonly enTramo: number;
  readonly motor: boolean;
  readonly enTierra: boolean;
  readonly porElSuelo: number;
  /** De las ruedas al suelo, m. */
  readonly altura: number;
  readonly altitud: number;
  readonly vertical: number;
  /** Si la torre ya dio el permiso para entrar en la pista. */
  readonly autorizado: boolean;
  /** Dónde están los flaps, 0 a 1. */
  readonly flaps: number;
  /** La capa de nubes de hoy, altitudes en m, o `null` sin capa. */
  readonly nubes: { readonly base: number; readonly techo: number } | null;
  /**
   * **Cuánto dentro de una nube va el avión**, 0 a 1: lo mismo que blanquea
   * la ventanilla. Ver `cuantoDentro` en `world/capa-de-nubes.ts`.
   */
  readonly enNube: number;
  /** Lo que sube o baja la cabina presurizada, m/s: lo que notan los oídos. */
  readonly cabina: number;
  /** Lo que falta por la ruta hasta tocar, m. */
  readonly faltaParaTocar: number;
  /** Si la tripulación ya está alineada en la pista, esperando para dar gas. */
  readonly alineado?: boolean;
  /**
   * **La fase del vuelo, la del juego**: la que decide si un anuncio de tierra
   * todavía vale o ya se le pasó el momento. Ver `seLePasoElMomento`.
   */
  readonly fase?: Fase;
}

/**
 * **Lo que se acaba de señalar por la ventanilla**, ya montado por el juego:
 * la frase de la comandante con su lado, y su historia detrás si la tiene.
 * Ver `loQueSeDice` y `laHistoria` en `audio/ventanilla.ts`.
 */
export interface Senalado {
  /** La clave del sitio: `teide`, `garajonay`… */
  readonly que: string;
  readonly lado: "izquierda" | "derecha";
  readonly dicho: { readonly texto: string; readonly clave: string; readonly relleno: Readonly<Record<string, string>> };
  readonly historia: {
    readonly texto: string;
    readonly clave: string;
    readonly relleno: Readonly<Record<string, string>>;
  } | null;
}

// ── Los números ──────────────────────────────────────────────────────────

/** Lo que se espera sentado antes de hablar, s: el rato de mirar alrededor. */
const AL_SENTARSE = 1.5;
/** Entre el cinturón y las puertas, s: se termina de embarcar. */
const HASTA_LAS_PUERTAS = 2.5;
/** Con los motores ya en marcha, s, antes de decir que se oyen. */
const MOTORES_EN_MARCHA = 3;
/** Parado en la doble raya, s, antes de preguntar por qué. */
const PARADO_EN_LA_ESPERA = 1.5;
/**
 * **Cuánto arriba, nivelado, antes de apagar el cartel**, s. Poco: en un salto
 * entre islas el crucero dura unos minutos, y el servicio va detrás.
 */
const ARRIBA_Y_NIVELADO = 2;
/** Y del cartel al servicio, s. */
const HASTA_EL_SERVICIO = 3;
/** Y de la toma a decir que se tocó, s: las ruedas, y la reversa ya rugiendo. */
const DESPUES_DE_TOCAR = 1.2;
/**
 * **A cuánto del umbral se prepara la cabina para aterrizar**, m: por encima
 * de la final, como en `EN_APROXIMACION` de la megafonía.
 */
const PREPARAR_LA_CABINA = 28000;
/** **Desde dónde se ve la isla de llegada**, m por la ruta: unos cuarenta y cinco kilómetros. */
/**
 * **Cuánto dentro de una nube para decir que se está dentro**: un tercio,
 * que es cuando la ventanilla ya se ve blanca. Ver `cuantoDentro`.
 */
const DENTRO_DE_LA_NUBE = 0.35;
/** Y cuánto por encima de la capa para decir que ya quedó abajo, m. */
const POR_ENCIMA = 60;
const VE_LA_ISLA = 45000;
/**
 * **Lo que baja la cabina para que se noten los oídos**, m/s: unos ciento
 * veinte pies por minuto, la mitad de lo que baja como mucho. Ver
 * `BAJA_LA_CABINA` en `cabina-presurizada.ts`.
 */
const SE_NOTAN_LOS_OIDOS = -0.6;
/**
 * **Y la red de la espera**, s de reloj de pared: si «sentados para el
 * despegue» no se ha oído en este rato —una boca que se quedó colgada—, se
 * entra igual. Lo primero es no dejar a nadie parado en la doble raya para
 * siempre. De pared y no de vuelo, porque lo que se espera es una voz: medida
 * con el reloj del vuelo, con el del juego acelerado doce veces se cumplía a
 * los seis segundos, y la tripulación entraba en la pista antes de que sonara
 * el anuncio. Medido en el banco con las tomas grabadas.
 */
export const RED_DE_LA_ESPERA = 75;

/**
 * **Y la de un anuncio que espera su fase**, s de pared: si la fase del juego
 * no llega a la de un anuncio en este rato, se pide igual —y la boca lo
 * tirará—. La escena no se queda parada esperando una fase que no viene.
 */
export const RED_DEL_ANUNCIO = 15;

/**
 * **Y la de la cabecera**, s de pared: alineados, lo que espera la tripulación
 * a que Ara acabe lo que está diciendo antes de dar gas, como mucho. Ver
 * `PermisosDeLaEscena.despegar`.
 */
export const RED_DE_LA_CABECERA = 20;

// ── El guion ─────────────────────────────────────────────────────────────

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
/** La comandante, por la megafonía, con una frase nueva de esta escena. */
const comandante = (clave: string): Linea => ({
  quien: "mama",
  clave: `inicio.mama.pasaje.${clave}`,
  megafonia: true,
});
const tripulacion = (clave: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.${clave}`,
  megafonia: true,
});
/**
 * **Un anuncio de la megafonía de siempre**: lo monta el juego con el campo,
 * el plan y el tiempo de hoy. Ver `ANUNCIOS` en `audio/megafonia.ts`.
 */
const anuncio = (clave: string): Linea => ({
  quien: clave.startsWith("tripulacion.") ? "tripulacion" : "mama",
  clave,
  megafonia: true,
});

/** Si una clave es de un anuncio de la megafonía de siempre. */
export function esAnuncioDeSiempre(clave: string): boolean {
  return clave.startsWith("comandante.") || clave.startsWith("tripulacion.");
}

interface DefMomento {
  readonly id: MomentoDelPasaje;
  /** Cuándo toca: lo que pasa en el avión, y lo que ya se dijo. */
  readonly cuando: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  /** Y cuándo ya no viene a cuento: se salta sin decirlo. */
  readonly caduca?: (l: LecturaDelPasaje, e: VueloDePasaje) => boolean;
  readonly lineas: readonly Linea[];
  /** Y si lo que se dice depende de lo que pasa: las nubes, por dentro o desde arriba. */
  readonly segun?: (l: LecturaDelPasaje) => readonly Linea[];
  /** Qué se dibuja para mirar mientras se dice. */
  readonly mira?: QueMirar;
}

const enElSuelo = (t: TramoDeLinea): boolean =>
  t === "puerta" ||
  t === "arrancando" ||
  t === "rodando" ||
  t === "esperando" ||
  t === "entrando" ||
  t === "carrera";
const bajando = (t: TramoDeLinea): boolean =>
  t === "bajada" || t === "final" || t === "recogida" || t === "frenando" || t === "al-puesto" || t === "aparcado" || t === "apagado";

/**
 * **El guion entero**, en el orden en que pasa un vuelo. Cada momento espera
 * a que no hable nadie y a que el avión esté donde toca; el que se pasa de su
 * momento se salta.
 */
export const GUION_DEL_PASAJE: readonly DefMomento[] = [
  {
    id: "ventanilla",
    cuando: (_l, e) => e.segundos >= AL_SENTARSE,
    lineas: [ara("ventanilla")],
    mira: "ala",
  },
  {
    id: "cinturon",
    cuando: () => true,
    lineas: [tripulacion("cinturon"), ara("cinturon")],
    mira: "cinturon",
  },
  {
    id: "puertas",
    cuando: (_l, e) => e.callaDesde >= HASTA_LAS_PUERTAS,
    lineas: [anuncio("comandante.crosscheck"), ara("puertas")],
  },
  {
    id: "motores",
    cuando: (l) => l.motor && l.tramo === "arrancando" && l.enTramo >= MOTORES_EN_MARCHA,
    lineas: [ara("motores")],
    mira: "motor",
  },
  {
    id: "bienvenida",
    cuando: (l) => l.tramo === "rodando" && l.porElSuelo > 2,
    caduca: (l) => !enElSuelo(l.tramo),
    lineas: [anuncio("comandante.bienvenida"), ara("comandante")],
  },
  {
    id: "espera",
    cuando: (l) => l.tramo === "esperando" && l.enTramo >= PARADO_EN_LA_ESPERA,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando",
    lineas: [ara("espera"), comandante("espera")],
    mira: "ventanilla",
  },
  {
    id: "despegue",
    cuando: (l) => l.tramo === "esperando" && l.autorizado,
    caduca: (l) => l.tramo !== "rodando" && l.tramo !== "esperando" && l.tramo !== "entrando",
    lineas: [anuncio("comandante.despegue"), ara("despegue")],
    mira: "ventanilla",
  },
  {
    /*
     * **El empuje, en cuanto se nota**: al dar gas, que es cuando aprieta
     * contra el asiento. Se decía a mitad de carrera, con ocho segundos hasta
     * irse del suelo, y la toma dura cinco: con cualquier cosa que tardara un
     * poco ya no cabía. Y vale un poco después de despegar, que se sigue
     * empujando.
     */
    id: "carrera",
    cuando: (l) => l.tramo === "carrera" && l.porElSuelo > 8,
    caduca: (l) => !l.enTierra && l.altura > 150,
    lineas: [ara("carrera")],
  },
  {
    id: "volando",
    cuando: (l) => !l.enTierra && l.altura > 80,
    caduca: (l) => l.altura > 1200,
    lineas: [ara("volando")],
    mira: "ventanilla",
  },
  {
    /*
     * **Las nubes, por dentro o desde arriba**: si la subida atraviesa una, la
     * ventanilla se pone blanca y Ara pregunta ahí; si pasa entre ellas, al
     * dejarlas abajo. Lo que se dice tiene que ser lo que se ve.
     */
    id: "nubes",
    cuando: (l) =>
      !!l.nubes &&
      !l.enTierra &&
      l.vertical > 0.5 &&
      (l.enNube >= DENTRO_DE_LA_NUBE || l.altitud > l.nubes.techo + POR_ENCIMA),
    caduca: (l) => !l.nubes || l.altitud > l.nubes.techo + 700 || bajando(l.tramo),
    lineas: [ara("nubes")],
    segun: (l) => [ara(l.enNube >= DENTRO_DE_LA_NUBE ? "nubes" : "nubesAbajo")],
    mira: "nubes",
  },
  {
    /*
     * La respuesta, **pasados los diez mil pies**: por debajo, la cabina de
     * mando no habla de nada que no sea volar —la cabina estéril—. Y solo si
     * se preguntó: sin pregunta, la explicación sobraría.
     */
    id: "nubesRespuesta",
    cuando: (l) => !l.enTierra && (l.altitud >= DIEZ_MIL_PIES || l.tramo === "crucero"),
    caduca: (l, e) => !e.dicho("nubes") || bajando(l.tramo),
    lineas: [comandante("nubes"), ara("niebla")],
  },
  {
    id: "arriba",
    cuando: (l) => l.tramo === "crucero" && l.enTramo >= ARRIBA_Y_NIVELADO,
    caduca: (l) => bajando(l.tramo),
    lineas: [anuncio("comandante.crucero")],
  },
  {
    id: "servicio",
    cuando: (_l, e) => e.desdeQueSeDijo("arriba") >= HASTA_EL_SERVICIO,
    caduca: (l, e) => !e.dicho("arriba") || bajando(l.tramo),
    lineas: [anuncio("tripulacion.servicio"), ara("servicio")],
  },
  {
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [anuncio("comandante.descenso"), anuncio("tripulacion.cinturones")],
  },
  {
    id: "oidos",
    cuando: (l) => l.cabina <= SE_NOTAN_LOS_OIDOS && !l.enTierra,
    caduca: (l) => l.tramo === "final" || l.tramo === "recogida" || l.enTierra || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("oidos"), tripulacion("oidos"), ara("bostezo")],
  },
  {
    /*
     * **La isla de llegada, a la vista**: La Palma sube a casi dos mil
     * quinientos metros, y desde cuarenta y tantos kilómetros ya se ve entera
     * por encima del mar de nubes. Es Ara quien la descubre: la cabina de mando
     * ya está con la llegada.
     */
    id: "isla",
    cuando: (l) => l.faltaParaTocar < VE_LA_ISLA && !l.enTierra,
    caduca: (l) => l.enTierra || l.tramo === "final" || l.faltaParaTocar < PREPARAR_LA_CABINA - 4000,
    lineas: [ara("isla")],
    mira: "ventanilla",
  },
  {
    id: "aproximacion",
    cuando: (l) => l.faltaParaTocar < PREPARAR_LA_CABINA && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [anuncio("comandante.aproximacion")],
  },
  {
    id: "flaps",
    cuando: (l) => l.flaps > 0.2 && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("flaps")],
    mira: "ala",
  },
  {
    id: "toma",
    cuando: (l) => l.tramo === "frenando" && l.enTramo >= DESPUES_DE_TOCAR,
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
  },
  {
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), comandante("reversa"), anuncio("tripulacion.llegada")],
  },
  {
    id: "puesto",
    cuando: (l) => l.tramo === "apagado" && l.enTramo >= 1.5,
    lineas: [ara("fin")],
  },
  { id: "fin", cuando: () => true, lineas: [] },
];

/**
 * **Lo que dice Ara de lo que se le señala**, si va por su lado: lo que se
 * dice viendo algo así por primera vez. Lo que no tiene frase suya se queda
 * en la de siempre.
 */
const LO_QUE_DICE_ARA: Readonly<Record<string, string>> = {
  teide: "teide",
  garajonay: "garajonay",
  orotava: "orotava",
};
const LO_VEO = ara("loVeo");

/**
 * **Todas las frases nuevas de la escena**, una vez cada una: para la lista de
 * grabar y las pruebas. Los anuncios de siempre y lo de la ventanilla no
 * están: ya tienen su voz.
 */
export const LINEAS_DEL_PASAJE: readonly Linea[] = (() => {
  const todas: Linea[] = [];
  const poner = (l: Linea): void => {
    if (!esAnuncioDeSiempre(l.clave) && !todas.some((x) => x.clave === l.clave)) todas.push(l);
  };
  for (const m of GUION_DEL_PASAJE) m.lineas.forEach(poner);
  for (const k of Object.values(LO_QUE_DICE_ARA)) poner(ara(k));
  poner(LO_VEO);
  poner(ara("nubesAbajo"));
  return todas;
})();

// ── La secuencia ─────────────────────────────────────────────────────────

/** Lo que la escena deja ver: para el dibujo, el banco y las pruebas. */
export interface EstadoDelPasaje {
  readonly momento: MomentoDelPasaje;
  /** Qué se dibuja para mirar, o `null`. */
  readonly mira: QueMirar | null;
  /** La última frase pedida: el subtítulo. */
  readonly linea: Linea | null;
  readonly hablando: boolean;
  readonly puedeSeguir: boolean;
  readonly terminado: boolean;
  /** Segundos de escena. */
  readonly segundos: number;
  /** Los momentos dichos, en orden, y los que se saltaron por pasarse. */
  readonly dichos: readonly MomentoDelPasaje[];
  readonly saltados: readonly MomentoDelPasaje[];
  /** Lo señalado por la ventanilla, por su clave. */
  readonly senalados: readonly string[];
}

/** Cuánto se queda el dibujo de mirar después de decirlo, s. */
const SE_QUEDA_EL_DIBUJO = 14;

export class VueloDePasaje {
  private indice = 0;
  private reloj = 0;
  private acabado = false;
  private seguirPedido = false;
  private readonly charla: Conversacion;
  private readonly dichos: MomentoDelPasaje[] = [];
  private readonly saltados: MomentoDelPasaje[] = [];
  private readonly cuandoSeDijo = new Map<MomentoDelPasaje, number>();
  private mira: QueMirar | null = null;
  private miraDesde = 0;
  private callada = 0;
  /** Cuándo se paró en la doble raya y cuándo se alineó, en el reloj de pared. */
  private enLaEsperaDesde: number | null = null;
  private alineadoDesde: number | null = null;
  private readonly porSenalar: Senalado[] = [];
  private readonly senalados: string[] = [];

  constructor(
    voz: VozDelInicio,
    private readonly opciones: {
      /** El lado de la ventanilla de Ara. */
      readonly lado?: "izquierda" | "derecha";
      /**
       * **El reloj de las voces**, s: el de pared mientras se juega. Lo que
       * espera a que algo suene se mide con él, que una grabación dura lo que
       * dura aunque el reloj del juego vaya acelerado. Sin decir, el de la
       * escena. Ver `TOPE_DE_UNA_FRASE`.
       */
      readonly pared?: () => number;
    } = {},
  ) {
    this.charla = new Conversacion(voz, () => this.reloj, () => this.pared());
  }

  private pared(): number {
    return this.opciones.pared?.() ?? this.reloj;
  }

  private get def(): DefMomento {
    return GUION_DEL_PASAJE[Math.min(this.indice, GUION_DEL_PASAJE.length - 1)]!;
  }

  get segundos(): number {
    return this.reloj;
  }

  /** Cuánto lleva la escena sin que hable nadie, s. */
  get callaDesde(): number {
    return this.callada;
  }

  /** Si ese momento ya se dijo. */
  dicho(id: MomentoDelPasaje): boolean {
    return this.cuandoSeDijo.has(id);
  }

  /** Cuánto hace que se dijo ese momento, s, o −∞ si no se dijo. */
  desdeQueSeDijo(id: MomentoDelPasaje): number {
    const t = this.cuandoSeDijo.get(id);
    return t === undefined ? -Infinity : this.reloj - t;
  }

  get estado(): EstadoDelPasaje {
    const fin = this.def.id === "fin";
    return {
      momento: this.def.id,
      mira: this.mira,
      linea: this.charla.ultima,
      hablando: !this.charla.callada,
      puedeSeguir: fin && this.charla.callada,
      terminado: this.acabado,
      segundos: this.reloj,
      dichos: [...this.dichos],
      saltados: [...this.saltados],
      senalados: [...this.senalados],
    };
  }

  get registro(): readonly Readonly<FraseDicha>[] {
    return this.charla.registro;
  }

  /** La boca se vació por su cuenta: ver `Conversacion.retomar`. */
  retomarLaVoz(): void {
    this.charla.retomar();
  }

  /** Quien juega toca el botón del final. */
  seguir(): void {
    if (this.def.id === "fin") this.seguirPedido = true;
  }

  /**
   * **Si ahora se puede señalar algo por la ventanilla**: arriba —del cartel
   * apagado, o pasados los diez mil pies, hasta la bajada—, sin nadie
   * hablando y sin otro sitio esperando turno. Es lo que el juego le pasa a
   * `LoQueSeVe` como «alguien habla», para que elija el momento. Ver
   * `mirarPorLaVentanilla` en `game.ts`.
   */
  get puedeSenalar(): boolean {
    return (
      (this.dicho("arriba") || this.dicho("nubesRespuesta")) &&
      !this.dicho("aproximacion") &&
      this.charla.callada &&
      this.porSenalar.length === 0 &&
      !this.acabado
    );
  }

  /** **Lo que el juego acaba de ver por la ventanilla**: se dice en cuanto se pueda. */
  senalar(s: Senalado): void {
    if (this.acabado) return;
    this.porSenalar.push(s);
  }

  /** Un paso de la escena. Devuelve lo que la escena deja hacer a la tripulación. */
  paso(dt: number, l: LecturaDelPasaje): PermisosDeLaEscena {
    this.reloj += dt;
    this.callada = this.charla.callada ? this.callada + dt : 0;
    if (!this.acabado) {
      this.charla.atender();
      this.avanzar(l);
      this.charla.atender();
    }
    if (this.mira && this.reloj - this.miraDesde > SE_QUEDA_EL_DIBUJO && this.charla.callada) this.mira = null;
    return this.permisos(l);
  }

  private avanzar(l: LecturaDelPasaje): void {
    // Lo que se pasa de su momento se salta, aunque haya alguien hablando.
    while (this.def.id !== "fin" && this.def.caduca?.(l, this)) {
      this.saltados.push(this.def.id);
      this.indice++;
    }
    const def = this.def;
    if (def.id === "fin") {
      if (this.seguirPedido && this.charla.callada) {
        this.acabado = true;
        this.charla.callar();
      }
      return;
    }
    /*
     * Preparando la cabina para aterrizar ya no se señala nada: lo que
     * esperaba turno, se olvida. Hasta ahí, también bajando, que es cuando
     * mejor se ve: la cabina estéril de abajo la guarda `LoQueSeVe`.
     */
    if (this.dicho("aproximacion") || l.tramo === "final" || l.enTierra) this.porSenalar.length = 0;
    if (!this.charla.callada) return;
    if (!def.cuando(l, this) || this.esperaSuFase(def, l)) {
      /*
       * Lo señalado por la ventanilla, en los huecos de lo que no ha llegado.
       * Menos en el del servicio, que va pegado al cartel apagado: un crucero
       * entre islas dura un minuto, y una historia en medio se lo comía.
       */
      const s = def.id === "servicio" ? undefined : this.porSenalar.shift();
      if (s) this.decirLoSenalado(s);
      return;
    }
    this.charla.decir(def.segun?.(l) ?? def.lineas);
    this.dichos.push(def.id);
    this.cuandoSeDijo.set(def.id, this.reloj);
    if (def.mira) {
      this.mira = def.mira;
      this.miraDesde = this.reloj;
    }
    this.indice++;
  }

  /**
   * **Lo señalado**: la comandante por la megafonía, su historia detrás, y Ara
   * si va por su lado. Lo que va por el otro lado lo cuenta la comandante
   * igual —le habla a todo el pasaje— y Ara no lo ve, así que no dice nada.
   */
  private decirLoSenalado(s: Senalado): void {
    const lineas: Linea[] = [
      { quien: "mama", clave: s.dicho.clave, megafonia: true, texto: s.dicho.texto, relleno: s.dicho.relleno },
    ];
    if (s.historia)
      lineas.push({
        quien: "mama",
        clave: s.historia.clave,
        megafonia: true,
        texto: s.historia.texto,
        relleno: s.historia.relleno,
      });
    const suLado = s.lado === (this.opciones.lado ?? LADO_DE_ARA);
    if (suLado) {
      const suya = LO_QUE_DICE_ARA[s.que];
      lineas.push(suya ? ara(suya) : LO_VEO);
      this.mira = "ventanilla";
      this.miraDesde = this.reloj;
    }
    this.senalados.push(s.que);
    this.charla.decir(lineas);
  }

  /**
   * **Lo que se deja hacer a la tripulación**: arrancar con los toboganes
   * armados, rodar con los motores ya oídos, y entrar en pista con la
   * tripulación de cabina sentada. Ver `PermisosDeLaEscena`.
   */
  private permisos(l: LecturaDelPasaje): PermisosDeLaEscena {
    const ahora = this.pared();
    if (l.tramo === "esperando") this.enLaEsperaDesde ??= ahora;
    if (l.tramo === "entrando" && l.alineado) this.alineadoDesde ??= ahora;
    const enLaEspera = this.enLaEsperaDesde === null ? 0 : ahora - this.enLaEsperaDesde;
    const alineado = this.alineadoDesde === null ? 0 : ahora - this.alineadoDesde;
    /*
     * Una vez dados, se quedan: lo que ya se hizo no se deshace. Y **lo que
     * espera a una frase espera a que se haya oído**, no a que se haya pedido
     * ni a que la escena la diera por perdida: ver `Conversacion.oida`.
     */
    this.dados = {
      arrancar: this.dados.arrancar || this.charla.oida("comandante.crosscheck") || this.saltado("puertas"),
      rodar: this.dados.rodar || (this.dicho("motores") && this.charla.callada),
      entrar: this.dados.entrar || this.charla.oida("comandante.despegue") || enLaEspera >= RED_DE_LA_ESPERA,
      /*
       * **Y no se da gas con Ara a media frase**: alineados, la tripulación
       * espera a que acabe lo que se está diciendo —«¡ahora sí que vamos a
       * despegar!»—, que es lo que hace que «¡cómo empuja!» llegue con el
       * empuje. Como un «alineado y espere» de la torre: unos segundos.
       */
      despegar:
        this.dados.despegar ||
        (this.dicho("despegue") && this.charla.callada) ||
        this.saltado("despegue") ||
        alineado >= RED_DE_LA_CABECERA,
    };
    return this.dados;
  }

  /**
   * **Y un anuncio de tierra se pide cuando el juego dice que vale**, que es
   * quien lo tira si no. La bienvenida se pedía en cuanto la tripulación
   * echaba a rodar, y para el juego eso todavía era «arrancando» —la fase
   * cambia con medio segundo de histéresis y con el avión pasando de dos
   * metros por segundo—: la boca la tiraba en el acto, «ya no es verdad», y
   * no sonaba. Medido en el banco con las tomas grabadas. Así que se espera a
   * la fase del juego, con su red: ver `RED_DEL_ANUNCIO`.
   */
  private esperaSuFase(def: DefMomento, l: LecturaDelPasaje): boolean {
    const fase = l.fase;
    const aDestiempo =
      fase !== undefined &&
      (def.segun?.(l) ?? def.lineas).some((x) => x.megafonia && seLePasoElMomento(x.clave, fase));
    if (!aDestiempo) {
      this.aDestiempoDesde = null;
      return false;
    }
    this.aDestiempoDesde ??= this.pared();
    return this.pared() - this.aDestiempoDesde < RED_DEL_ANUNCIO;
  }

  private aDestiempoDesde: number | null = null;

  private dados: PermisosDeLaEscena = { arrancar: false, rodar: false, entrar: false, despegar: false };

  private saltado(id: MomentoDelPasaje): boolean {
    return this.saltados.includes(id);
  }
}
