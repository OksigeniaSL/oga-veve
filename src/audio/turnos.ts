/**
 * **Quién habla primero**: la regla de turnos de todas las voces del juego,
 * escrita en un sitio.
 *
 * Había dos turnos y ninguna regla común. La radio —torre, otro avión e
 * instructora— se turnaba en `BOCA`; la megafonía —la comandante y la
 * tripulación— iba por su cuenta en otra boca, con este argumento: en un
 * avión de verdad la megafonía y los auriculares son dos vías y se solapan.
 * El argumento es verdad en un avión y en el juego sonaba así, contado por
 * Enrique:
 *
 * > «Todo el vuelo en silencio y cuando hablan lo hacen todos juntos.»
 *
 * Jazlyn contando el Teide y, encima, la instructora con la lección del frío;
 * el azafato anunciando la bajada y la instructora con los oídos y la botella;
 * la azafata con el agua y el maní de la granja, y la radio encima. Y lo dijo
 * él mismo: «en un avión de verdad la radio de cabina y la megafonía sí
 * coinciden a veces, pero en el juego, para lo poco que hablan, que la
 * megafonía no la pise nadie». Así que ahora hay **un solo turno** para todas
 * las personas del juego, y su orden es éste, de más a menos:
 *
 * 1. **La máquina**, que no pide turno: la cuenta del radioaltímetro y los
 *    avisos de las cajas —*terrain*, *minimums*, *traffic*— suenan en el
 *    instante en que pasa lo que avisan, por su propia vía. Es la única voz que
 *    puede sonar encima de otra, porque eso es lo que hace en un avión. Ver
 *    `audio/maquina.ts` y AGENTS.md.
 * 2. **Lo urgente**: el terreno, la pista ocupada, la frustrada. Es lo único
 *    que **corta** a quien esté hablando, megafonía incluida —un anuncio a
 *    medias se corta antes que callar un «subí» con el monte delante—.
 * 3. **Lo que es para ti** (`mando`): la lámpara, tus autorizaciones, la ruta,
 *    las aves de tu final y **el tráfico que tienes cerca**. No corta a nadie,
 *    pero **pasa delante** de todo lo que espera; y lo que describe algo que
 *    sigue ahí —las aves, el tráfico— espera lo que haga falta y lo retira
 *    quien sabe que dejó de ser verdad.
 * 4. **La instructora** (`normal`): lo que enseña ahora mismo.
 *    - **Y lo que explica un mando la primera vez que se usa** —los pedales,
 *      la palanca que se queda—, que es suyo y puede esperar a otro rato:
 *      cede ante lo que pasa ahora, y de lo suyo es lo primero que se cae de
 *      una cola llena. Ver `explicaUnMando`.
 * 5. **La megafonía**: la comandante y la tripulación. Habla cuando no habla
 *    nadie —ver `audio/megafonia.ts`— y una vez que habla **no la pisa nadie**:
 *    la radio del tráfico y la instructora esperan a que acabe. Y si tiene que
 *    esperar, espera más que un aviso —ver `CADUCA_LA_MEGAFONIA`—, porque un
 *    anuncio no describe un instante.
 * 6. **La frecuencia de los demás** (`baja`): lo que se dicen los otros aviones
 *    y la torre a ellos, y los elogios. Espera a que la frecuencia esté libre.
 * 7. **Lo que espera su hueco**: las lecciones del aire —`lecciones-del-aire.ts`—
 *    y lo que se ve por la ventanilla —`lo-que-se-ve.ts`—. No entran en la cola
 *    hasta que hay un rato de calma, y **se reparten**: lejos de un anuncio y
 *    lejos entre ellas. Ver `Huecos`.
 *
 * Los pesos de la cola salen de aquí —`pesoDe`— y la boca los usa sin saber
 * de quién es cada frase. Ver `audio/boca.ts`.
 *
 * **Y lo que cierra el vuelo no se cae de la cola**, pese lo que pese: ver
 * `cierraElVuelo`.
 */

import type { Urgencia } from "./boca";

/**
 * **Si esta frase es de la megafonía**: la comandante, la tripulación y lo que
 * la comandante señala por la ventanilla. Se reconoce por la clave, que es lo
 * único que ve la boca: `ventanilla` a secas es la de la comandante y
 * `ventanilla.vos` la de la instructora en una avioneta. Y lo mismo con la
 * historia que va detrás: `ventanilla.historia` sale por la megafonía y
 * `ventanilla.vos.historia`, no. Ver `audio/ventanilla.ts`.
 */
export function esDeLaMegafonia(clave: string | undefined): boolean {
  return !!clave && DE_LA_MEGAFONIA.test(clave);
}

const DE_LA_MEGAFONIA = /^(?:(?:comandante|tripulacion)\.|ventanilla(?:\.historia)?(?:@|$))/;

/**
 * El peso con que espera turno una frase: manda el más alto, y entre iguales
 * la que llegó antes. Ver el orden de la cabecera.
 *
 * La megafonía va con la urgencia de un comentario —`baja`, que es como la
 * piden sus bocas— y aquí se le da su sitio: por encima de la frecuencia de
 * los demás y por debajo de la instructora. Lo que la megafonía pide con más
 * peso —el descenso de emergencia va en `mando`— se queda con ese peso.
 */
export function pesoDe(clave: string | undefined, urgencia: Urgencia): number {
  if (urgencia === "baja") return esDeLaMegafonia(clave) ? PESO_DE_LA_MEGAFONIA : PESO.baja;
  if (urgencia === "normal" && explicaUnMando(clave)) return PESO_DE_EXPLICAR_UN_MANDO;
  return PESO[urgencia];
}

const PESO: Record<Urgencia, number> = {
  baja: 0,
  normal: 3,
  mando: 4,
  urgente: 5,
};

/** La megafonía: por encima de la frecuencia de los demás. Ver la cabecera. */
const PESO_DE_LA_MEGAFONIA = 1;

/** Y lo que explica un mando: por debajo de lo que pasa ahora. Ver `explicaUnMando`. */
const PESO_DE_EXPLICAR_UN_MANDO = 2;

/**
 * **La instructora explicando un mando la primera vez que se usa en el
 * vuelo**: los pedales del timón, la palanca que se queda donde se deja, el
 * doble toque que la centra, el tope de la inclinación, el mando de juego que
 * aparece. Ver `explicarLosMandos` en `game.ts`.
 *
 * Es de la instructora, pero no es lo que pasa ahora: es una lección que
 * vale lo mismo dentro de un rato. Pesaba lo que cualquier frase suya, y
 * entre iguales la cola es una cola: pedida antes, hablaba antes que lo que
 * cuenta lo que pasa —la seña del señalero, la orden de la torre, la fase— y,
 * con la cola llena, lo que se caía era lo que llegaba detrás. Así que cede:
 * habla después de lo que pasa, y antes que la megafonía, que es como habla
 * ella. Y en una cola llena es lo primero suyo que se cae.
 *
 * «tutor.pedales» no se pide al llegar: lo que se oía detrás del señalero en
 * el banco del vuelo entero era el rodaje del tramo de vuelta, que el banco
 * arranca en cuanto se apaga —el vuelo nuevo explica los pedales otra vez—.
 */
export function explicaUnMando(clave: string | undefined): boolean {
  return !!clave && EXPLICA_UN_MANDO.test(clave);
}

const EXPLICA_UN_MANDO =
  /^tutor\.(?:pedales|palancaSeQueda|dobleToque|inclinacionTope|mandoConectado|joystickConectado)(?:[@~]|$)/;

/**
 * **Lo que cierra el vuelo**, que no se cae de una cola llena.
 *
 * La llegada al puesto —el señalero y lo que sus señas quieren decir, apagar
 * el motor, «¡vuelo terminado!»—, la lista de después del aterrizaje con los
 * flaps que se quedaron fuera, y la felicitación al acabar un ejercicio. Son
 * el final de lo que se ha volado, y pasan pegados: al llegar al puesto, el
 * alto, los frenos, los calzos y el corte son cuatro señas en diez segundos,
 * y cada una pide su frase. Con la cola llena se caía la que llegaba, que es
 * siempre la última. Medido llegando a Gando con el JAZ 90 y la tripulación
 * dando la bienvenida: en la cola, «pará acá», lo que quiere decir el alto,
 * lo de los frenos y los flaps fuera; y «senalero.calzos»,
 * «vuelo.cortaMotores» y «vuelo.apagado: no cabía en la cola». El vuelo
 * acababa sin que nadie dijera que había acabado.
 *
 * **Y las gafas de sol**, que se ganan con el primer aterrizaje que cuenta y
 * se dicen una vez en la vida: se pedían al tocar, detrás de «frená» y de los
 * frenos de tierra, que son seis segundos de cabina, y con los cuatro de un
 * aviso «gafas.ganadas: caducó esperando» en los dos vuelos medidos a Gando.
 *
 * Así que no se echa, como no se echa una autorización: si no cabe, la cola
 * crece una plaza. Y lo que se queda viejo antes de sonar no lo tira un
 * reloj sino quien sabe que ya no vale —la seña siguiente, el motor
 * apagado—. Ver `retirarLoDelPuesto` en `game.ts`.
 */
export function cierraElVuelo(clave: string | undefined): boolean {
  return !!clave && CIERRA_EL_VUELO.test(clave);
}

const CIERRA_EL_VUELO =
  /^(?:vuelo\.(?:apagado|enPuesto|cortaMotores|alto|flapsArribaAlSalir|alPuestoConFlaps|despuesDelAterrizaje|despues\.(?:aerofrenos|luces|transpondedor))|senalero\.(?:alto|frenos|calzos)|ejercicio\.(?:bien|bienParado|bienDespresurizacion|paradoTrasV1|seguidoAntesDeV1|bomberos|bomberosUno|bomberosFrenos)|gafas\.ganadas)(?:[@~]|$)/;

/**
 * **Lo que cuenta una seña del señalero**: la voz de las de parar y lo que
 * quiere decir cada una. Vale mientras se vea esa seña; con la siguiente, lo
 * que todavía esperaba turno se retira. Ver `retirarLoDelPuesto` en `game.ts`.
 */
export function cuentaLaSena(clave: string | undefined): boolean {
  return !!clave && CUENTA_LA_SENA.test(clave);
}

const CUENTA_LA_SENA = /^(?:senalero\.\w+|vuelo\.(?:alto|despacio))$/;

/**
 * **Y lo que deja de valer al apagar el motor en el puesto**: las señas, la de
 * cortar con ellas, y la lista de después del aterrizaje. Apagado, lo que
 * queda por decir es que el vuelo terminó.
 */
export function caducaAlApagar(clave: string | undefined): boolean {
  return (
    cuentaLaSena(clave) ||
    (!!clave &&
      /^vuelo\.(?:cortaMotores|flapsArribaAlSalir|despuesDelAterrizaje|despues\.\w+)$/.test(clave))
  );
}

/**
 * **Cuánto aguanta en la cola un anuncio de la megafonía**, ms.
 *
 * Treinta segundos. Con los cuatro de un aviso, un anuncio que tenía que
 * esperar a que acabara la torre se caía sin sonar; y un anuncio no describe
 * un instante: «vamos a pasar por una zona de movimiento» o el servicio a
 * bordo siguen siendo verdad medio minuto después. Más que eso ya no viene a
 * cuento, y quien decide cuándo toca cada uno —`audio/megafonia.ts`— tampoco
 * lo pediría.
 */
export const CADUCA_LA_MEGAFONIA = 30000;

/**
 * **Cuánto se espera a que una voz esté lista para sonar**, ms: su grabación
 * bajada y el audio desbloqueado.
 *
 * Veinticinco segundos. Lo que se pide antes —el crosscheck de Jazlyn en el
 * puesto, nada más arrancar— no se le pasa a la voz del navegador, que en
 * Brave para Linux es muda: espera. Y con tope, que una espera sin salida es
 * un juego colgado: si en ese rato no llega, se dice como se pueda. Ver
 * `estaLista` en `audio/instructor-grabado.ts`.
 */
export const ESPERA_A_SU_VOZ = 25000;

/**
 * Cuánto silencio hace falta para contar algo que puede esperar, s.
 *
 * Cuatro segundos sin que hable nadie, la máquina incluida: lo que se dice en
 * el primer segundo de silencio suena a que se estaba esperando para hablar,
 * y pisa lo que la otra persona todavía no ha terminado de decir.
 */
export const CALMA = 4;

/**
 * Cuánto se deja después de un anuncio de la megafonía, s.
 *
 * Quince. Es lo que faltaba entre el azafato anunciando la bajada y la
 * instructora contando lo de los oídos: los dos tenían su momento, y era el
 * mismo. Un rato después del anuncio la lección se oye como lo que es —otra
 * cosa—, y no como la continuación de lo que dijo él.
 */
export const TRAS_LA_MEGAFONIA = 15;

/**
 * Y cuánto entre dos cosas que esperaban su hueco, s.
 *
 * Veinticinco: la lección del frío y el Teide pueden caer en el mismo minuto
 * de la subida, y una detrás de otra son una visita guiada.
 */
export const ENTRE_DOS = 25;

/** Lo que hace falta saber en cada paso para repartir los huecos. */
export interface Silencio {
  /** Si suena alguna voz: cualquiera de las bocas o la máquina. */
  readonly alguienHabla: boolean;
  /** Si suena la megafonía en concreto. */
  readonly megafoniaHabla: boolean;
}

/**
 * **El reparto de lo que puede esperar**: cuándo hay hueco para una lección
 * del aire o para lo que se ve por la ventanilla.
 *
 * No es una cola: quien tiene algo que contar pregunta `hayHueco`, y si lo
 * hay lo cuenta y avisa con `usar`. Lo que espera sigue siendo de quien lo
 * espera, que es quien sabe si todavía es verdad.
 */
export class Huecos {
  private callado = 0;
  private desdeLaMegafonia = Infinity;
  private desdeElUltimo = Infinity;

  /** Un paso de reloj, s. */
  paso(dt: number, s: Silencio): void {
    this.callado = s.alguienHabla ? 0 : this.callado + dt;
    this.desdeLaMegafonia = s.megafoniaHabla ? 0 : this.desdeLaMegafonia + dt;
    this.desdeElUltimo += dt;
  }

  /** Si ahora se puede contar algo que esperaba su hueco. */
  get hayHueco(): boolean {
    return (
      this.callado >= CALMA &&
      this.desdeLaMegafonia >= TRAS_LA_MEGAFONIA &&
      this.desdeElUltimo >= ENTRE_DOS
    );
  }

  /** Se ha usado el hueco: lo siguiente que espere, espera otro rato. */
  usar(): void {
    this.desdeElUltimo = 0;
    this.callado = 0;
  }

  /** Vuelo nuevo. */
  reiniciar(): void {
    this.callado = 0;
    this.desdeLaMegafonia = Infinity;
    this.desdeElUltimo = Infinity;
  }
}
