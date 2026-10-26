/**
 * El cartel del cinturón: cuándo se enciende y quién lo manda.
 *
 * ## Lo que estaba mal
 *
 * Se encendía por **altura sobre el terreno**: por debajo de novecientos
 * metros, encendido. Volando cerca de esa cota sobre unas islas de barrancos,
 * el suelo sube y baja con cada pliegue y el cartel iba detrás, con su *ding*
 * cada vez. Contado jugando: «la señal de cinturón se quita y se pone con
 * mucha facilidad».
 *
 * Y había algo peor, que se vio al oír a la comandante: **decía «pueden
 * soltarse el cinturón» con el cartel apagado desde hacía rato**. El anuncio y
 * el cartel contaban cosas distintas del mismo vuelo.
 *
 * ## Lo que hace ahora, que es lo que pasa de verdad
 *
 * El cartel no es un instrumento del terreno: es una **decisión**, y en un
 * avión de verdad la toma el comandante. Así que aquí:
 *
 * - Se enciende al arrancar y **no se apaga hasta que la comandante lo dice**.
 *   Esa es la frase que ya existía —«ya estamos arriba, pueden soltarse el
 *   cinturón»— y ahora el cartel se apaga **con ella**, no por su cuenta. Los
 *   dos cuentan lo mismo porque son lo mismo.
 * - Vuelve a encenderse al empezar el descenso, **con el anuncio de la
 *   comandante**, que es cuando se enciende en cualquier vuelo del mundo. Y
 *   en la final pase lo que pase, para quien baja sin haber oído anuncio.
 * - Y con turbulencia de verdad, venga cuando venga.
 * - **Y lo puede mandar quien vuela.** Pedido tal cual: «es una decisión del
 *   piloto mandar a ponerlo (turbulencia, inicio de aproximación, etc.)». Un
 *   mando puesto a mano manda sobre todo lo demás mientras esté puesto —
 *   porque eso es exactamente lo que hace el interruptor de una cabina.
 *
 * - **Y en el puesto se apaga**, con el avión parado y los motores parados, que
 *   es cuando se apaga en cualquier vuelo: el *ding* que deja levantarse. Lo
 *   apagaba solo la escena de pasaje, que cuenta ese momento (punto 303), y en
 *   los demás vuelos con pasaje el cartel seguía encendido con el avión ya
 *   apagado en su sitio. Ahora vale para todos: ver `APAGA_LA_LUZ`.
 *
 * Nada de esto mira la altura sobre el terreno, así que ningún barranco puede
 * volver a encenderlo.
 */

import type { Fase } from "./vuelo";

/**
 * Cuánto movimiento del aire cuenta como turbulencia de encender el cartel.
 *
 * Es el σ_w de `cuantoSeMueve`, la desviación típica de la ráfaga vertical, en
 * m/s. Nueve décimas: un poco por encima de la turbulencia ligera de
 * MIL-F-8785C —0,8—, o sea la que ya mueve el café. Y con banda muerta para
 * apagarlo —seis décimas— porque si el mismo número enciende y apaga, una
 * racha justo en el umbral lo hace parpadear, que es de donde venía la queja.
 *
 * **Y ya no mezcla dos escalas.** Llegaba el mayor entre la ráfaga, en metros
 * por segundo, y el eco de la tormenta, de cero a uno: dos números de cosas
 * distintas comparados con el mismo umbral. Ahora la tormenta entra en la
 * ráfaga —ver `causasDe` en `turbulencia.ts`— y lo que llega aquí es uno solo.
 *
 * **Y se enciende con lo que se nota, no por encima.** Eran nueve décimas
 * para encender y seis para apagar, y el mar de nubes del alisio sacude con
 * ocho como mucho —ver `EN_LA_NUBE` en `turbulencia.ts`—: cruzarlo no
 * encendía el cartel nunca. Enrique, de El Hierro a La Gomera con el JAZ 60:
 * «cuando hay turbulencias no se enciende la luz del cinturón y no dice
 * nada». Medido con `scripts/verificar-turbulencia.mjs` en ese vuelo: la
 * comandante soltó el cinturón en la base de la capa y el avión la cruzó
 * subiendo con σ entre 0,45 y 0,75 y baches de ±0,24 g, con el cartel
 * apagado de punta a punta. Ahora enciende en seis décimas —la mitad alta de
 * la ligera, la que ya lleva baches que se sienten en el asiento— y apaga por
 * debajo de cuatro, que es donde empieza la ligera en `nivelDe` y donde el
 * meneo deja de notarse (`SE_NOTA_EL_MENEO` en `inicio-pasaje.ts`). Por
 * debajo de eso, ni cartel ni anuncio: es el aire de siempre.
 */
export const SACUDE = 0.6;
export const YA_NO_SACUDE = 0.4;

/**
 * **Lo que tarda la comandante en apagar la luz en el puesto**, s con el avión
 * ya en su sitio y los motores parados: lo que tardan en pararse del todo. Es
 * la misma regla para todos los vuelos con pasaje; la escena de pasaje la usa
 * con su guion, que además espera a que nadie hable para que el *ding* no
 * caiga encima de una frase. Ver el momento `luz` en `inicio-pasaje.ts`.
 */
export const APAGA_LA_LUZ = 3;

/** Lo que el cartel necesita saber del vuelo. */
export interface Momento {
  readonly fase: Fase;
  /** Si este avión lleva pasaje: una avioneta de escuela no tiene a quién avisar. */
  readonly conPasaje: boolean;
  /** Cuánto se mueve el aire: el σ_w, en m/s. Ver `SACUDE`. */
  readonly movimiento: number;
  /**
   * Si la comandante acaba de decir que ya se pueden soltar.
   *
   * Es un **suceso**, no un estado: llega una vez, en el fotograma en que se
   * dice. Ver `megafonia.ts`.
   */
  readonly loDijoLaComandante: boolean;
  /**
   * Y si acaba de anunciar que se empieza a bajar, que es cuando **lo
   * vuelve a encender**. También un suceso de un fotograma.
   *
   * Esperaba a la final, y en una ruta eso es tarde: en cualquier vuelo de
   * línea el cartel se enciende al empezar el descenso, con el anuncio de la
   * comandante, y detrás la tripulación pide cinturones, respaldos y
   * mesitas. Ver `comandante.descenso` en `audio/megafonia.ts`.
   */
  readonly loEncendioLaComandante?: boolean;
  /**
   * **Y si la comandante ya lo apagó en el puesto**, con el avión parado y los
   * motores apagados, que es cuando se apaga en cualquier vuelo: el *ding* que
   * deja levantarse. Es un estado, no un suceso: mientras dure. Solo vale en
   * el puesto: con el motor en marcha otra vez, el cartel vuelve.
   *
   * **Lo dice una escena que cuenta ese momento**, cuando lo dice su guion: la
   * de pasaje (punto 303), con el momento `luz` de `inicio-pasaje.ts`. Sin
   * escena —sin decir nada—, lo decide el cartel con la regla de todos los
   * vuelos: `APAGA_LA_LUZ` segundos después de parar los motores en el puesto.
   */
  readonly apagadoEnElPuesto?: boolean;
  /**
   * **Lo que ha pasado desde el paso anterior**, s: con lo que se cuenta cuánto
   * llevan parados los motores en el puesto. Sin esto, el cartel no se apaga
   * solo en el puesto: solo si lo dice una escena.
   */
  readonly dt?: number;
}

/** Las fases del puesto, con el avión ya parado en su sitio. Ver `Momento.apagadoEnElPuesto`. */
const EN_EL_PUESTO: readonly Fase[] = ["en-puesto", "apagado"];

/** Lo que el piloto ha decidido, si ha decidido algo. */
export type Mando = "auto" | "puesto" | "quitado";

/**
 * Las fases en las que el cartel está encendido pase lo que pase.
 *
 * Todo lo que no es crucero: en tierra, en el despegue, en la subida y en toda
 * la aproximación. Es la regla de un vuelo de verdad dicha en fases.
 */
const SIEMPRE_ENCENDIDO: readonly Fase[] = [
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
  "final",
  "aterrizado",
  "abandonando",
  "a-plataforma",
  "en-puesto",
  "apagado",
];

/** Las fases en las que un cartel apagado a mano se vuelve a encender. */
const VUELVE_A_ENCENDERSE: readonly Fase[] = [
  "alineando",
  "despegando",
  "comprometido",
  "final",
];

export class Cinturon {
  /**
   * Si la comandante ya dijo que se pueden soltar.
   *
   * Es lo que decide el **fondo** del asunto en crucero. La turbulencia y las
   * fases mandan por encima mientras duran, pero al calmarse el aire lo que
   * queda es esto — y no lo último que pasó, que era el fallo: una sola
   * sacudida dejaba el cartel puesto el resto del vuelo.
   */
  private soltado = false;
  private mando: Mando = "auto";
  /** Si el aire ya venía sacudiendo, para la banda muerta. Ver `SACUDE`. */
  private sacudiendo = false;
  /**
   * Si el avión llegó a su puesto con los motores en marcha, y cuánto llevan
   * parados allí, s. Apagar los motores en una calle de rodaje no es llegar:
   * ahí la gente sigue sentada. Ver `APAGA_LA_LUZ`.
   */
  private llegoAlPuesto = false;
  private paradoEnElPuesto = 0;

  /** Vuelo nuevo: como empieza un vuelo, con el cartel puesto. */
  reiniciar(): void {
    this.soltado = false;
    this.mando = "auto";
    this.sacudiendo = false;
    this.llegoAlPuesto = false;
    this.paradoEnElPuesto = 0;
  }

  /** Lo que ha decidido quien vuela. Ver `Mando`. */
  ponerMando(mando: Mando): void {
    this.mando = mando;
  }

  get comoEsta(): Mando {
    return this.mando;
  }

  /**
   * Si el pasaje va suelto: la comandante dijo que se podían soltar y nadie
   * ha vuelto a pedir que se abrochen. Es lo que mira el anuncio de la
   * turbulencia que llega sin avisar: ver `turbulencia-del-vuelo.ts`.
   */
  get pasajeSuelto(): boolean {
    return this.soltado;
  }

  /**
   * **Si el aire se está moviendo**, con la banda muerta del cartel: lo que
   * mira la comandante antes de decir que ya se pueden soltar. Ver
   * `aireQuieto` en `audio/megafonia.ts`.
   */
  get sacudiendoAhora(): boolean {
    return this.sacudiendo;
  }

  /**
   * Un paso. Devuelve si el cartel está encendido **ahora**.
   *
   * Quien llama compara con lo de antes para saber si suena el *ding*: aquí no
   * se guarda nada de eso, porque un cartel no sabe de sonidos.
   */
  paso(m: Momento): boolean {
    if (!m.conPasaje) return false;
    /*
     * **Y apagado a mano, hasta la próxima vez que toca de verdad.** Al
     * alinearse para despegar y al entrar en final la tripulación lo enciende
     * siempre, así que un «quitado» se olvida ahí y vuelve el automático: el
     * interruptor puede apagar el cartel en tierra o en crucero, pero nunca
     * deja aterrizar con él apagado, que es lo que no se puede enseñar.
     */
    if (this.mando === "quitado" && VUELVE_A_ENCENDERSE.includes(m.fase))
      this.mando = "auto";
    // Lo que diga la comandante se apunta siempre, aunque ahora mande otra
    // cosa: el anuncio pasa una vez y no vuelve.
    if (m.loDijoLaComandante) this.soltado = true;
    /*
     * **Y al empezar a bajar se vuelve a poner, y ya no se quita.** Un
     * «quitado» a mano se olvida aquí igual que al alinearse: la tripulación
     * está diciendo por megafonía que el cartel se encendió, y un cartel
     * apagado debajo de esa frase contaría otra cosa.
     */
    if (m.loEncendioLaComandante) {
      this.soltado = false;
      if (this.mando === "quitado") this.mando = "auto";
    }
    /*
     * **El puesto, con los motores parados**: se cuenta siempre, aunque mande
     * el interruptor, que el reloj de los motores no sabe de mandos. La escena
     * que cuenta ese momento lo dice ella; si no hay escena, la regla de todos.
     */
    if (m.fase === "en-puesto") this.llegoAlPuesto = true;
    else if (m.fase !== "apagado") this.llegoAlPuesto = false;
    this.paradoEnElPuesto =
      this.llegoAlPuesto && m.fase === "apagado" ? this.paradoEnElPuesto + (m.dt ?? 0) : 0;
    const apagadoEnElPuesto = m.apagadoEnElPuesto ?? this.paradoEnElPuesto >= APAGA_LA_LUZ;
    /*
     * La turbulencia, con su banda muerta: enciende alto y suelta bajo. Se
     * mira siempre, mande quien mande: es lo que pregunta la comandante antes
     * de soltar el cinturón. Ver `sacudiendoAhora`.
     */
    if (m.movimiento >= SACUDE) this.sacudiendo = true;
    else if (m.movimiento < YA_NO_SACUDE) this.sacudiendo = false;
    if (this.mando === "puesto") return true;
    if (this.mando === "quitado") return false;
    if (apagadoEnElPuesto && EN_EL_PUESTO.includes(m.fase)) return false;

    if (SIEMPRE_ENCENDIDO.includes(m.fase) || this.sacudiendo) return true;

    // Y en crucero manda el anuncio: hasta que se dice, puesto. La turbulencia
    // lo pone por encima mientras dura, y al calmarse **vuelve a esto** — que
    // es lo que faltaba: una sacudida dejaba el cartel puesto el resto del
    // vuelo.
    return !this.soltado;
  }
}
