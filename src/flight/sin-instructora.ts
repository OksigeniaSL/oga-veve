/**
 * **Volar sin instructora**: lo que sigue sonando, y quién puede elegirlo.
 *
 * Lo pidió Enrique volando el JAZ 90: «estar escuchando a la instructora
 * diciendo "bajá el motor" es un medio coñazo a veces. El juego podría tener
 * "modo instructor" y "modo autónomo", pero que ya tengas que tener algunos
 * galones para desactivarlo o activarlo, y que pregunte si está desactivado al
 * principio».
 *
 * La primera mitad de ese mensaje —que lo que cambia se vea y se oiga en su
 * sitio del cuadro— vive en `lo-que-cambia.ts`. Esta es la segunda.
 *
 * ## Callar no es quitar la seguridad
 *
 * Sin instructora, ella **deja de corregir y de aconsejar**: ni «un poquito
 * menos de gas», ni «los primeros flaps», ni «seguí la raya verde», ni los
 * elogios ni las curiosidades. Pero no se va del avión: lo que no se puede
 * dejar de oír lo sigue diciendo. Es la regla de las tres eses de AGENTS.md
 * llevada a una lista: **Seguridad, Seguridad, Seguridad**, y a partir de ahí
 * todo lo demás es aprendizaje — y el aprendizaje es lo que se calla.
 *
 * La máquina del avión (la cuenta del radioaltímetro, *terrain*, *stall*,
 * *traffic*) y la torre **no pasan por aquí**: hablan por su propia vía y
 * siguen exactamente igual. Ver `audio/maquina.ts` y `Game.torre`.
 *
 * ## Una lista, y no un filtro que adivine
 *
 * Lo que sigue sonando está escrito clave a clave en `SEGURIDAD` y en
 * `CANTOS_QUE_SIGUEN`. Todo lo que no esté ahí se calla. Al revés —una lista de
 * lo que se calla— cada frase nueva de consejo sonaría sin querer en el modo
 * que existe precisamente para no oírlas; así, una frase nueva de seguridad
 * que no se apunte aquí se calla, y eso lo caza `sin-instructora.test.ts`
 * antes que nadie.
 *
 * Y no se deduce del texto, del prefijo ni de la urgencia: «Pista ocupada.
 * Subí y volvé por el circuito» y «Subí suave» empiezan igual y no son lo
 * mismo. La única regla mecánica es la de las variantes de una misma frase —
 * `~2`, `+cayendo`—, que son la misma frase grabada de otra manera. Ver
 * `claveBase`.
 *
 * ## Y se gana: el grado de comandante
 *
 * «Los galones no son mando, son responsabilidad» (AGENTS.md). En este
 * cuaderno, comandante es el grado que **responde por el avión y por todos los
 * que van a bordo**, y es también el primero que pide una frustrada: la regla
 * número uno de la casa, la más difícil de aceptar y la que salva vidas. Quien
 * ha renunciado a un aterrizaje que iba mal ya sabe cuidarse, y eso —no saber
 * mandar— es lo que hace falta para volar sin nadie al lado diciendo qué toca.
 *
 * Piloto no basta: tres aterrizajes y ninguna frustrada es haber aprendido a
 * bajar, no a decidir no bajar. Y esperar a instructora sería pedir veinticinco
 * aterrizajes para algo que no es enseñar a otros. Ver `REQUISITOS` en
 * `cuaderno.ts`.
 *
 * Este módulo no habla ni dibuja: dice qué suena y quién puede elegir.
 */

import { leerAjuste, ponerAjuste } from "../datos/guardado";
import {
  GRADOS,
  grado,
  REQUISITOS,
  type Cuaderno,
  type Grado,
  type Requisito,
} from "./cuaderno";

/** El grado que abre el interruptor. Ver la cabecera. */
export const GRADO_PARA_VOLAR_SIN_INSTRUCTORA: Grado = "comandante";

/**
 * **Lo que la instructora sigue diciendo sin instructora**, por familias.
 *
 * Cada familia es una de las que pide el encargo —terreno, pérdida, tráfico,
 * una orden de la torre que no se está cumpliendo, la frustrada que hace
 * falta— más las emergencias, que son las mismas cosas en grande.
 */
const EL_SUELO = [
  // El suelo se acerca, con caja o sin ella: detrás de *terrain* o en su lugar.
  "vuelo.terrenoBajo",
  "vuelo.terrenoSube",
  // Un edificio delante: por ahí no se pasa.
  "vuelo.bulto",
] as const;

const LA_ENERGIA = [
  // Pérdida: la nariz abajo. Lo que cuenta lo que acaba de decir *stall*.
  "vuelo.perdida",
  // Lento y bajo, detrás de *airspeed low*: el camino a la pérdida.
  "vuelo.lentoYBajo",
  // Hundiéndose de golpe cerca del suelo, detrás de *sink rate*.
  "vuelo.bajasRapido",
  // Demasiado inclinado, detrás de *bank angle*.
  "vuelo.muyInclinado",
  // El automático que se suelta solo: desde ese instante vuela la mano.
  "vuelo.pilotoSuelto",
] as const;

const EL_TRAFICO = [
  // Detrás del *traffic, traffic*: dónde mirar.
  "vuelo.trafico.delante",
  "vuelo.trafico.izquierda",
  "vuelo.trafico.derecha",
  "vuelo.trafico.detras",
  // La información de tráfico donde no la da la torre: dónde está el otro.
  "vuelo.otroAvion.delante.arriba",
  "vuelo.otroAvion.delante.nivel",
  "vuelo.otroAvion.delante.abajo",
  "vuelo.otroAvion.derecha.arriba",
  "vuelo.otroAvion.derecha.nivel",
  "vuelo.otroAvion.derecha.abajo",
  "vuelo.otroAvion.izquierda.arriba",
  "vuelo.otroAvion.izquierda.nivel",
  "vuelo.otroAvion.izquierda.abajo",
  "vuelo.otroAvion.detras.arriba",
  "vuelo.otroAvion.detras.nivel",
  "vuelo.otroAvion.detras.abajo",
  // Por qué no se entra: hay otro en la pista o llegando a ella.
  "vuelo.esperaQueAterrice",
  "vuelo.esperaQueDespegue",
  // Salir de la pista **porque viene otro**. Sin otro detrás, es consejo.
  "vuelo.abandonando",
  // Pájaros en la final: si se ve uno de frente, subir.
  "vuelo.aves.porQueSubir",
] as const;

const LA_TORRE = [
  // La torre manda irse y no se está cumpliendo, o se bajó contra su orden.
  "vuelo.mandanFrustrar",
  "vuelo.sinPermisoEnLosMinimos",
  "vuelo.aterrizasteContraLaOrden",
  // Se entró en la pista con la roja.
  "vuelo.sinPermiso",
  /*
   * **Y donde no hay torre, lo que diría la torre.** «La torre sigue igual»,
   * y en un campo sin torre o con AFIS la que cuenta si la pista está libre
   * es ella: sin estas frases, allí el modo sin instructora dejaría mudo lo
   * único que hace de torre.
   */
  "vuelo.esperandoMirando",
  "vuelo.esperandoAfis",
  "vuelo.autorizadoSinTorre",
  "vuelo.autorizadoAfis",
  "vuelo.puedeAterrizarSinTorre",
  "vuelo.puedeAterrizarAfis",
  "vuelo.puedeVolverSinTorre",
] as const;

const LA_FRUSTRADA = [
  // A los mínimos: ¿se ve la pista? Si no, al aire.
  "vuelo.minimos",
  // La aproximación que no viene bien: irse y volver a intentarlo.
  "vuelo.noEstabilizada",
  "vuelo.proponeIrse",
  "vuelo.proponeIrseSinPista",
  "vuelo.tomaLarga",
  "vuelo.tomaLargaSinPista",
  // Por la cabecera que no es, o con viento de cola.
  "vuelo.laOtraPunta",
  "vuelo.alAireOtraPunta",
  "vuelo.alAireVientoDeCola",
  // Sin tren a punto de tocar: el percance que más fácil se evita.
  "vuelo.sacaElTren",
  /*
   * **Y el «¡bien hecho!» de después.** Es un elogio, y los elogios se callan;
   * este no. Renunciar es ganar (AGENTS.md), y si el modo sin instructora
   * dejara mudo justo el aplauso a la frustrada enseñaría lo contrario de lo
   * que este juego quiere enseñar: que irse al aire es lo que se hace sin que
   * nadie lo celebre.
   */
  "vuelo.frustrada",
] as const;

const LAS_EMERGENCIAS = [
  "vuelo.sinMotor",
  "vuelo.planeoLento",
  "vuelo.planeoRapido",
  "vuelo.sinCombustible",
  "vuelo.reserva",
  "vuelo.cabinaSinPresion",
  "vuelo.cabinaSinPresionConTren",
  "vuelo.primeroLaTuya.segundos",
  "vuelo.primeroLaTuya.minuto",
  "vuelo.primeroLaTuya.minutos",
  // El final de la bajada de emergencia: aquí se nivela.
  "vuelo.yaSeRespira",
  "vuelo.tormenta",
] as const;

export const SEGURIDAD: ReadonlySet<string> = new Set<string>([
  ...EL_SUELO,
  ...LA_ENERGIA,
  ...EL_TRAFICO,
  ...LA_TORRE,
  ...LA_FRUSTRADA,
  ...LAS_EMERGENCIAS,
]);

/**
 * **Y los cantos de cabina que pasan por su boca**, en el peldaño de cabina.
 *
 * Allí lo de la tripulación —*V one*, *rotate*, *gear up*— se canta en inglés
 * por la boca de la instructora, porque lo dice quien va sentado al lado. No
 * son consejo: son los cantos del avión, y el encargo dice que siguen igual.
 *
 * Los que **no** están son los que en el peldaño de cabina hacen de consejo,
 * en inglés: *too fast*, *slow down*, *airspeed*, *too high, come down* —el
 * «bajá el motor» que motivó todo esto, dicho en otro idioma— y los que
 * narran un percance, *off the runway* y *we have a problem*. La cuenta del
 * radioaltímetro tampoco: no pasa nunca por aquí, la canta la máquina.
 */
export const CANTOS_QUE_SIGUEN: ReadonlySet<string> = new Set<string>([
  "cabina.v1",
  "cabina.vr",
  "cabina.positiveRate",
  "cabina.gearUp",
  "cabina.gearDown",
  "cabina.minimums",
  "cabina.goAroundOrder",
  "cabina.goAround",
  "cabina.terrainPullUp",
  "cabina.tooLow",
  "cabina.tooLowClimb",
  "cabina.obstacleAhead",
  "cabina.sinkRate",
  "cabina.bankAngle",
  "cabina.stall",
  "cabina.airspeedLow",
  "cabina.traffic",
  "cabina.autopilotDisconnect",
  "cabina.cabin",
]);

/**
 * **La frase de la que es variante una clave.**
 *
 * `vuelo.noEstabilizada~2+cayendo` es la segunda manera de decir
 * «vuelo.noEstabilizada» con el motivo «cayendo» detrás: la misma frase,
 * grabada de otra forma para no repetirse. Se decide por la de base. Ver
 * `variantes.ts` y `motivos.ts` en `audio/`.
 */
export function claveBase(clave: string): string {
  return clave.split("+")[0]!.split("~")[0]!;
}

/**
 * **Si esta frase suena con la instructora quitada.**
 *
 * Sin clave, no: una frase compuesta en caliente no está en ninguna lista y
 * no se puede saber qué es. Hoy ninguna de seguridad va sin clave —las de
 * tráfico, terreno y torre llevan todas la suya—, y si un día alguna la
 * pierde, se nota aquí y no en un vuelo.
 */
export function suenaSinInstructora(clave: string | undefined): boolean {
  if (!clave) return false;
  const base = claveBase(clave);
  return SEGURIDAD.has(base) || CANTOS_QUE_SIGUEN.has(base);
}

/** El requisito del grado que abre el interruptor. */
const REQUISITO: Requisito = REQUISITOS.find(
  (r) => r.grado === GRADO_PARA_VOLAR_SIN_INSTRUCTORA,
)!;

/** Si este cuaderno ya llega al grado que abre el interruptor. */
export function puedeVolarSinInstructora(c: Cuaderno): boolean {
  return (
    GRADOS.indexOf(grado(c)) >= GRADOS.indexOf(GRADO_PARA_VOLAR_SIN_INSTRUCTORA)
  );
}

/**
 * **Lo que falta para abrir el candado**, o `null` si ya está abierto.
 *
 * En cosas que se pueden hacer esta tarde —«te faltan dos aterrizajes»— y no
 * en un porcentaje, igual que `loQueFalta` en `cuaderno.ts`. No se usa esa
 * porque mira el grado siguiente, y a quien es aprendiz le faltan dos: lo que
 * le interesa a quien mira el candado es lo que falta para **este**.
 */
export function loQueFaltaParaVolarSinInstructora(
  c: Cuaderno,
): Omit<Requisito, "grado"> | null {
  if (puedeVolarSinInstructora(c)) return null;
  return {
    aterrizajes: Math.max(0, REQUISITO.aterrizajes - c.aterrizajes),
    aerodromos: Math.max(0, REQUISITO.aerodromos - c.aerodromos.length),
    frustradas: Math.max(0, REQUISITO.frustradas - c.frustradas),
  };
}

/** Dónde vive, entre los ajustes del perfil. Nada sale del aparato. */
const AJUSTE = "sinInstructora";

/**
 * **Si se vuela sin instructora**: lo pedido y lo ganado, las dos cosas.
 *
 * El ajuste solo vale si el grado está: un guardado traído de otro perfil, o
 * escrito a mano, no puede dejar a nadie sin instructora antes de tiempo. Es
 * el mismo cuidado que `leerGafas` con unas gafas puestas y no ganadas.
 */
export function leerSinInstructora(c: Cuaderno): boolean {
  try {
    return puedeVolarSinInstructora(c) && leerAjuste(AJUSTE) === true;
  } catch {
    return false;
  }
}

/** Y lo guarda en el perfil, como el resto de los ajustes. */
export function guardarSinInstructora(sin: boolean): void {
  ponerAjuste(AJUSTE, sin);
}
