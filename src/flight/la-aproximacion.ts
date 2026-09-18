/**
 * La aproximación: todo lo que el juego decide mientras venís a aterrizar.
 *
 * El circuito de tráfico, la altura de decisión, el PAPI, la orden de irse al
 * aire y su levantamiento. Eran seis métodos sueltos por `game.ts` que se
 * pasaban datos entre ellos con variables que veía todo el fichero, y que
 * además **narraban a mano**: cada vez que decidían algo llamaban a la
 * pantalla, al sonido, al cuaderno y al instructor.
 *
 * Lo segundo se quitó primero —ver `src/hechos.ts`— y por eso esta mudanza es
 * barata: lo que hay aquí dentro solo mira el vuelo, el terreno y el
 * escenario, y lo único que hace cuando decide algo es **contarlo**.
 *
 * ## Lo que no está aquí
 *
 * **El montaje**: los aros, el PAPI y el circuito dibujados se construyen al
 * empezar el vuelo y eso es mundo, no decisión; se queda en `game.ts` con el
 * resto del armado de escena. Y **el veredicto de la toma**, que es del
 * aterrizaje: si viviera aquí, esta pieza tendría que saber de galones y de
 * cuaderno, y entonces ya no sería «la aproximación» sino «el aterrizaje
 * entero».
 *
 * ## Cómo se usa
 *
 * Se construye una vez con las cosas que no cambian en todo el vuelo y se le
 * da un paso por fotograma con las que sí. El estado que lleva de un paso al
 * siguiente es suyo y se ve desde fuera porque lo miran el HUD, el reinicio y
 * la ventana de pruebas — pero solo se escribe aquí.
 */

import type { AircraftConfig } from "./aircraft";
import type { FlightState } from "./model";
import { Minimos, porQueNoSeSigue, seLevantaLaOrden } from "./minimos";
import type { Reparto } from "../hechos";
import type { Scenario } from "../world/scenarios";
import type { Terrain } from "../world/terrain";
import type { Circuito, TramoDeCircuito } from "../world/circuito";
import { blancasDePapi } from "../world/aproximacion";
import { enElEmbudoDeFinal } from "../world/runway-guide";
import { enEjesDePista } from "../world/rumbo";
import type { Vaca } from "../world/vaca";

/**
 * Entre qué alturas sobre la pista te pueden mandar al aire, m.
 *
 * De sesenta a ciento sesenta. Más arriba no hay aproximación que
 * interrumpir; más abajo ya no es una decisión, es un susto — y en un avión de
 * verdad tampoco se manda frustrar a quince metros salvo que se venga algo
 * encima.
 */
const ALTO_MINIMO_PARA_MANDAR = 60;
const ALTO_MAXIMO_PARA_MANDAR = 160;

/** Y a cuánto del umbral, como mucho, m. Más lejos no es final todavía. */
const MANDAN_DESDE = 3000;

/** Cada cuántas aproximaciones se manda, de media. */
const UNA_DE_CADA = 0.25;

/** Cuánto hay que subir desde donde te lo dijeron para que cuente, m. */
const SUBIR_PARA_IRSE = 60;

/** Desde qué altura sobre la pista empieza a contar el circuito, m. */
const ALTO_PARA_EL_CIRCUITO = 60;

/** Lo que no cambia en todo un vuelo. */
export interface MundoDeLaAproximacion {
  readonly aircraft: AircraftConfig;
  readonly scenario: Scenario;
  readonly terrain: Terrain;
  readonly hechos: Reparto;
  readonly vaca: Vaca;
  /** Un punto del eje de la pista, a tantos metros de su centro. */
  readonly enLaPista: (metros: number) => readonly [number, number];
  /** Cuánto queda hasta el umbral en uso, m. */
  readonly distanceToRunway: () => number;
  /**
   * A cuánto del umbral están las luces del PAPI, pista adentro.
   *
   * Es **desde donde se cuenta la senda**, y por eso hace falta aquí: la
   * tarjeta del PAPI medía el ángulo desde el umbral y decía «dos y dos, vas
   * bien» justo cuando las cuatro luces del mundo estaban rojas. Ver
   * `SENDA_DESDE` en `world/runway-guide.ts`.
   */
  readonly sendaDesde: () => number;
}

/** Y lo que cambia en cada fotograma. */
export interface AhoraMismo {
  readonly estado: FlightState;
  /** Si la distancia al umbral está bajando. */
  readonly acercandose: boolean;
  /** El circuito de tráfico dibujado, si lo hay. */
  readonly circuito: Circuito | null;
  /** La fase del plan de vuelo, tal y como se anuncia. */
  readonly faseDeAhora: string;
  /** El techo de nubes de hoy, m, o `null` si no hay. */
  readonly techoDeNubes: number | null;
  /** Si hay un aviso de terreno puesto, que manda sobre todo lo demás. */
  readonly terrenoDicho: "bajo" | "sube" | null;
  /** Si el vuelo ya se dio por terminado. */
  readonly vueloTerminado: boolean;
}

export class LaAproximacion {
  /** En qué tramo del circuito se dijo por última vez que estaba. */
  tramoDelCircuito: TramoDeCircuito | null = null;

  /**
   * La altura de decisión: el momento en que hay que mirar y decidir.
   *
   * «Lo importante es la decisión, no la maniobra.» Ver `flight/minimos.ts`.
   */
  readonly minimos = new Minimos();

  /**
   * La última lectura del PAPI que se enseñó, o `null` si todavía ninguna.
   *
   * Se guarda para no repetir la tarjeta sesenta veces por segundo: el PAPI
   * habla cuando **cambia** lo que dice, que es exactamente cuando hay algo
   * nuevo que hacer. Ver `explicarElPapi`.
   */
  papiEnPantalla: number | null = null;

  /** Si la pista de hoy tiene PAPI. Un campo de hierba no tiene. */
  hayPapi = false;

  /** Si la torre —o la vaca— ha mandado irse al aire y todavía manda. */
  mandanFrustrar = false;
  /**
   * **Y por qué la mandaron**, que no es un detalle: decide qué pasa si no se
   * obedece.
   *
   * Las dos órdenes encendían la misma bandera y el juego solo miraba esa, así
   * que aterrizar con cualquiera de las dos puestas rompía el avión «por
   * llevarse por delante lo que hubiera en la pista». Con la de la torre es
   * verdad —hay una vaca—. Con la de aproximación no estabilizada **no hay
   * nada en la pista**: el avión se rompía contra un obstáculo que no existe.
   *
   * Se vio jugando con el 747: «al aterrizar me ordena una frustrada… cuando
   * estoy llegando "así no entra" con 3400 m de pista y la velocidad al
   * mínimo, tomo tierra y se rompió, volvemos a empezar».
   *
   * Una aproximación no estabilizada que se continúa no explota: sale larga,
   * dura o descolocada, y para eso ya están los veredictos de siempre —golpe,
   * fuera de pista—. El aviso enseña; la consecuencia la pone la física.
   */
  porqueMandaron: "pistaOcupada" | "noEstabilizada" | null = null;

  /**
   * Cómo se sortean las órdenes de irse al aire.
   *
   * `auto` es lo que se juega: una de cada cuatro aproximaciones. Las otras
   * dos son para el banco de pruebas, que hace decenas de aproximaciones
   * seguidas y necesita decidir él cuándo pasa — un sorteo suelto en mitad de
   * una comprobación de otra cosa la rompe, y lo hizo.
   */
  ordenes: "auto" | "siempre" | "nunca" = "auto";

  /** Y si ya lo mandaron en este vuelo, que se manda una vez. */
  yaLoMandaron = false;
  /**
   * Si a **esta** aproximación le toca frustrada, sorteado una sola vez.
   *
   * `null` es «todavía no se ha sorteado». Se decide al entrar en el embudo de
   * final y se olvida al reiniciar, que es cuando empieza otra aproximación.
   */
  private leToca: boolean | null = null;

  /** A qué altura sobre la pista se dio la orden. Ver `levantarLaOrden`. */
  altoAlMandar = 0;

  /** El último motivo por el que se mandó frustrar, con sus números. */
  porQueSeMando: Record<string, unknown> | null = null;

  /** Lo que pasa ahora mismo. Se pone al empezar cada paso. */
  private ahora!: AhoraMismo;

  constructor(private readonly mundo: MundoDeLaAproximacion) {}

  /**
   * Un paso, en el orden en el que se decidía antes.
   *
   * El orden importa y por eso está escrito aquí y no repartido: el PAPI mira
   * la senda, los mínimos deciden si se sigue, la torre decide si te manda al
   * aire y el circuito dice por dónde vas. Cambiarlo cambia qué tarjeta gana
   * cuando dos quieren la pantalla en el mismo fotograma.
   */
  paso(ahora: AhoraMismo): void {
    this.ahora = ahora;
    this.explicarElPapi(ahora.acercandose);
    this.mirarLosMinimos(ahora.acercandose);
    this.mirarSiMandanFrustrar(ahora.acercandose);
    this.seguirElCircuito(ahora.acercandose);
  }

  /**
   * Si la aproximación está estabilizada **ahora mismo**.
   *
   * Es la misma cuenta que decide dar la orden, sacada aparte para poder
   * preguntarla también al revés: para levantarla. Dos cuentas para «¿está
   * bien esta aproximación?» acabarían discrepando, y entonces el juego
   * mandaría abandonar y a la vez daría por buena la misma aproximación.
   */
  private yaEstabilizada(): boolean {
    const s = this.ahora.estado;
    const { across } = enEjesDePista(
      s.position.x,
      s.position.z,
      this.mundo.scenario.runway.x,
      this.mundo.scenario.runway.z,
      this.mundo.scenario.runway.heading,
    );
    let torcido =
      ((s.heading * 180) / Math.PI - this.mundo.scenario.runway.heading + 540) %
      360;
    torcido -= 180;
    return (
      porQueNoSeSigue(
        {
          velocidad: s.airspeed,
          referencia: this.mundo.aircraft.approachSpeed,
          vertical: s.verticalSpeed,
          delEje: across,
          torcido,
        },
        this.ahora.techoDeNubes,
      ) === null
    );
  }

  /** Se empieza de nuevo: ni orden puesta, ni PAPI dicho, ni tramo. */
  reiniciar(): void {
    this.mandanFrustrar = false;
    this.porqueMandaron = null;
    this.yaLoMandaron = false;
    this.leToca = null;
    this.altoAlMandar = 0;
    this.porQueSeMando = null;
    this.papiEnPantalla = null;
    this.tramoDelCircuito = null;
    this.minimos.reiniciar();
  }

  /**
   * Que te manden irse al aire, y por qué.
   *
   * **La frustrada es la regla número uno de este proyecto y hasta hoy solo la
   * hacía quien quería.** Se detectaba, se celebraba y valía un galón, pero
   * nadie te la pedía nunca — y en la vida real la mitad de las frustradas no
   * se deciden, se obedecen: la pista está ocupada, la torre te manda al aire,
   * y se pregunta después.
   *
   * ## Y se ve por qué
   *
   * En un campo de hierba, **se cruza una vaca**. Es la razón número uno por
   * la que se frustra en un aeródromo pequeño de verdad, y aquí además es la
   * vecina. Se ve, se entiende sin una palabra y da risa, que es exactamente
   * el registro que hace falta a los cuatro años.
   *
   * En un aeropuerto con torre no hay vaca: hay una lámpara roja y una orden,
   * porque eso es lo que hay allí — otro avión que no ha salido todavía, y vos
   * no lo ves. Obedecer sin ver el motivo también es de verdad.
   *
   * ## Una vez por vuelo, y con sitio para hacerla
   *
   * Entre los sesenta y los ciento sesenta metros sobre la pista: más arriba
   * no hay aproximación que interrumpir y más abajo ya no es una decisión, es
   * un susto. Y una sola vez, porque lo que enseña es la maniobra, no la
   * sorpresa repetida.
   */
  mirarSiMandanFrustrar(acercandose: boolean): void {
    /*
     * **Puesta la orden, lo primero es saber cuándo se levanta.**
     *
     * Estaba atada a que el detector de frustradas cantara la maniobra, y ese
     * detector es exigente a propósito —hace falta venir bajando y luego subir
     * cuarenta metros—: quien se apartaba sin cumplir sus condiciones se
     * quedaba con la orden puesta en la pantalla para siempre. «Voy a meterme
     * en Anaga y todavía eso ahí diciendo que frustre el aterrizaje.»
     *
     * Ahora se levanta con lo que cualquiera reconoce como haberse ido: haber
     * subido de verdad desde donde te lo dijeron, o estar alejándote del
     * umbral. Y **se dice que se ha levantado**, que era la otra mitad de la
     * queja: «¿cómo sé que la torre ya me deja volver a intentarlo?».
     */
    if (this.mandanFrustrar) {
      const s = this.ahora.estado;
      /*
       * **Y tocar tierra también la levanta.**
       *
       * Esto salía de aquí en cuanto el avión estaba en el suelo, así que
       * quien no obedecía y aterrizaba se quedaba con la orden puesta: la
       * tarjeta no caduca —es una orden, espera respuesta— y seguía en
       * pantalla durante la toma, la carrera y el rodaje. Un minuto entero de
       * «irse al aire» con el avión ya parado en la pista, medido en vídeo.
       *
       * No se discute si estuvo bien o mal: se aterrizó, la orden ya no
       * describe nada y se retira.
       */
      if (s.onGround) {
        this.levantarLaOrden();
        return;
      }
      /*
       * **Y arreglar la aproximación también la levanta.**
       *
       * Esto solo salía por tres puertas —tocar tierra, subir, alejarse— y
       * ninguna es la que usa quien hace caso a medias: corregir. Así que
       * quien enderezaba la aproximación seguía con la orden puesta hasta el
       * final, aterrizaba bien y el juego le daba el aterrizaje por bueno sin
       * retirar nunca el «abandoná». Contado jugando: «me lo validó, pero me
       * dijo que abandonara, no le hice caso porque ya me dirás tú».
       *
       * Y tenía razón en lo de «ya me dirás tú»: un juego que manda abandonar
       * y después felicita por no abandonar no está enseñando una regla, está
       * enseñando que sus reglas dan igual. Que es lo contrario de lo que
       * busca la regla de las tres eses.
       *
       * **Solo la de no estabilizada.** La de pista ocupada no se levanta
       * corrigiendo nada: la vaca sigue ahí y eso no depende de cómo vueles.
       * Esa se levanta cuando la pista queda libre, que es lo de arriba.
       *
       * Al levantarla se enciende la luz verde y se dice, igual que cuando la
       * retira la torre: quien obedece a medias tiene derecho a saber que ya
       * puede seguir. Ver `levantarLaOrden`.
       */
      if (seLevantaLaOrden(this.porqueMandaron, this.yaEstabilizada())) {
        this.levantarLaOrden();
        return;
      }
      const alto = s.position.y - this.mundo.terrain.runwayElevation;
      const subio = alto > this.altoAlMandar + SUBIR_PARA_IRSE;
      const alejandose =
        !acercandose && this.mundo.distanceToRunway() > MANDAN_DESDE;
      if (subio || alejandose) this.levantarLaOrden();
      return;
    }
    if (this.yaLoMandaron || this.ahora.vueloTerminado || !acercandose) return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    const alto = s.position.y - this.mundo.terrain.runwayElevation;
    if (alto < ALTO_MINIMO_PARA_MANDAR || alto > ALTO_MAXIMO_PARA_MANDAR)
      return;
    if (this.mundo.distanceToRunway() > MANDAN_DESDE) return;
    /*
     * **Y viniendo de verdad en final, no solo cerca.**
     *
     * Esto pedía «acercándose al umbral, entre sesenta y ciento sesenta metros
     * y a menos de tres kilómetros», y eso lo cumple cualquiera que dé una
     * vuelta por el valle: se pasa cerca de la pista sin la menor intención de
     * aterrizar y la torre te manda al aire con la pista fuera de la pantalla.
     * «¿Qué carajo si no hay ni campo a la vista?»
     *
     * El embudo ya existía y ya lo usaban los mínimos, por esta misma razón
     * escrita en `mirarLosMinimos`: «cerca del umbral y acercándose» no
     * distingue una aproximación de un tramo del circuito. Faltaba aquí.
     */
    if (
      enElEmbudoDeFinal(
        this.mundo.scenario.runway,
        s.position.x,
        s.position.z,
      ) === null
    )
      return;
    /*
     * **Una de cada cuatro, y sorteada UNA VEZ POR APROXIMACIÓN.**
     *
     * Ni siempre —una aproximación que siempre acaba en frustrada deja de ser
     * una aproximación— ni tan raro que no llegue a pasar en una tarde.
     *
     * Y aquí estaba el fallo, que es de los que se leen como correctos: el
     * sorteo se tiraba **en cada fotograma**. Cruzar la banda de los sesenta a
     * los ciento sesenta metros lleva unos quince segundos, o sea novecientos
     * fotogramas a sesenta por segundo: la probabilidad de librarse era
     * `0,75^900`, que es cero. Dicho jugando: «no puede ser que todas las
     * veces me haga hacer una frustrada, lo hace un montón de veces».
     *
     * El comentario decía «una de cada cuatro» y la cuenta decía «una de cada
     * cuatro»; lo que no decía ninguno de los dos es **cada cuánto se
     * pregunta**. Ahora se sortea al entrar en el embudo y la respuesta dura
     * toda la aproximación.
     */
    if (this.ordenes === "nunca") return;
    if (this.ordenes === "auto") {
      this.leToca ??= Math.random() <= UNA_DE_CADA;
      if (!this.leToca) return;
    }
    // Forzada, se gasta: el banco pide una y quiere una, no todas.
    if (this.ordenes === "siempre") this.ordenes = "auto";
    this.yaLoMandaron = true;
    this.mandanFrustrar = true;
    this.porqueMandaron = "pistaOcupada";
    this.altoAlMandar = alto;

    this.mundo.hechos.emit("mandaronIrseAlAire", { porque: "pistaOcupada" });
  }

  /**
   * Se acabó la orden: la vaca se va, la torre da verde y se dice.
   *
   * **Y se dice**, que es lo que faltaba. Sin esto, quien obedecía se quedaba
   * dando vueltas sin saber si podía volver: «¿cómo sé que la torre ya me deja
   * volver a intentar la aproximación?». La luz verde es la misma que da paso
   * para despegar, y quiere decir lo mismo: adelante.
   */
  levantarLaOrden(): void {
    this.mandanFrustrar = false;
    this.porqueMandaron = null;
    this.mundo.vaca.quitar();
    this.mundo.hechos.emit("pistaLibreOtraVez", {});
  }

  /**
   * Los mínimos: se baja hasta una altura, se mira, y se decide una vez.
   *
   * Es la mitad de la lección de la frustrada que faltaba. La otra —saber
   * irse al aire— ya se reconocía y se premiaba con su galón; lo que no
   * existía era **el momento de decidir**, y sin él una frustrada es una
   * ocurrencia y no una maniobra.
   *
   * Sesenta metros sobre la pista son doscientos pies, que es la altura de
   * decisión de una aproximación de precisión de verdad y el número que
   * aparece en todas las cartas.
   *
   * Y ahí pasa una de dos, que es exactamente lo que enseña:
   *
   * - **La aproximación está estabilizada**: se canta «minimums», se mira la
   *   pista y se sigue. La palabra marca el momento y ya está.
   * - **No lo está**: entonces no se corrige, **se va uno**. La regla de
   *   verdad es del tipo «si a esta altura no estás como debes, no sigas», y
   *   eso es lo que la hace una regla y no un consejo. Se usa la misma señal
   *   y la misma orden que cuando lo manda la torre, porque para quien juega
   *   es lo mismo: hay que irse.
   */
  mirarLosMinimos(acercandose: boolean): void {
    if (this.mandanFrustrar || this.ahora.vueloTerminado) return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    /*
     * **Y solo viniendo por el embudo de final.**
     *
     * La altura de decisión es un punto de la aproximación, no una altura
     * cualquiera: cruzar los sesenta metros dando el giro a la base, con la
     * pista a un kilómetro por el costado, no es llegar a mínimos. Y ahí el
     * avión está **por definición** torcido respecto a la pista, así que la
     * regla saltaba con «no estás alineado» y mandaba frustrar. En todos los
     * vuelos: «me sale el mensaje de frustrada en todos los intentos de
     * aterrizaje». Medido en el vídeo de un circuito en Mariscal Estigarribia:
     * la orden salía en el segundo 393, con el avión en pleno viraje.
     *
     * Ver `enElEmbudoDeFinal`.
     */
    if (
      enElEmbudoDeFinal(
        this.mundo.scenario.runway,
        s.position.x,
        s.position.z,
      ) === null
    )
      return;
    const alto = s.position.y - this.mundo.terrain.runwayElevation;
    if (!this.minimos.paso(alto, acercandose)) return;

    const { across, along } = enEjesDePista(
      s.position.x,
      s.position.z,
      this.mundo.scenario.runway.x,
      this.mundo.scenario.runway.z,
      this.mundo.scenario.runway.heading,
    );
    void along;
    let torcido =
      ((s.heading * 180) / Math.PI - this.mundo.scenario.runway.heading + 540) %
      360;
    torcido -= 180;
    const motivo = porQueNoSeSigue(
      {
        velocidad: s.airspeed,
        referencia: this.mundo.aircraft.approachSpeed,
        vertical: s.verticalSpeed,
        delEje: across,
        torcido,
      },
      this.ahora.techoDeNubes,
    );

    if (!motivo) {
      this.mundo.hechos.emit("minimos", {});
      return;
    }

    /*
     * No estabilizada: la misma orden de irse al aire que da la torre.
     *
     * Se reutiliza entera —la señal que se queda puesta, el circuito
     * dibujado, la luz verde al levantarla— porque para quien juega es lo
     * mismo: hay que irse. Lo que cambia es el porqué, y el porqué se dice.
     */
    this.yaLoMandaron = true;
    this.mandanFrustrar = true;
    this.porqueMandaron = "noEstabilizada";
    this.altoAlMandar = alto;
    /*
     * Y **por qué**, con sus números. Para el banco.
     *
     * «Sale la frustrada en todas las aproximaciones» no se arregla sin saber
     * cuál de los cinco motivos salta, y el motivo solo vivía dentro del texto
     * de la tarjeta. Medirlo desde fuera era leer una frase traducida.
     */
    this.porQueSeMando = {
      motivo,
      velocidad: +s.airspeed.toFixed(1),
      referencia: this.mundo.aircraft.approachSpeed,
      vertical: +s.verticalSpeed.toFixed(1),
      delEje: +across.toFixed(1),
      torcido: +torcido.toFixed(1),
      alto: Math.round(alto),
    };
    this.mundo.hechos.emit("mandaronIrseAlAire", {
      porque: "noEstabilizada",
      motivo,
    });
  }

  /**
   * El PAPI, explicado mientras se usa.
   *
   * En el mundo lleva desde el principio: cuatro luces al costado del umbral
   * que se ven blancas si venís alto y rojas si venís bajo. Es el instrumento
   * más bonito que tiene la aviación —no hay número, no hay texto, no hay que
   * saber nada— y estaba ahí **sin que nadie dijera qué era**: cuatro bolitas
   * que cambiaban de color.
   *
   * Ahora, en final, la pantalla enseña las luces que estás viendo y una
   * flecha con lo que hay que hacer. Y habla cuando cambia lo que dicen, que
   * es cuando hay algo nuevo que hacer; con dos y dos sale una vez, con su
   * visto, porque acertar también se cuenta.
   *
   * Solo donde hay PAPI de verdad. Un campo de hierba no tiene, y ponerle uno
   * en la pantalla sería enseñar un instrumento que no está.
   */

  explicarElPapi(acercandose: boolean): void {
    if (!this.hayPapi || !acercandose) return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    const alto = s.position.y - this.mundo.terrain.runwayElevation;
    // De quince metros para abajo ya no se corrige nada: se toca. Y por encima
    // de trescientos todavía no se está en final, se está llegando.
    if (alto < 15 || alto > 300) return;
    /*
     * **Se mide desde las luces, no desde el umbral.**
     *
     * Un PAPI dice si vas alto o bajo **respecto a su propia senda**, y su
     * senda arranca donde están sus luces: unos trescientos metros pista
     * adentro. Esto medía el ángulo desde el umbral, así que la tarjeta decía
     * «dos y dos, vas bien» justo cuando las cuatro luces del mundo estaban
     * rojas. Dos instrumentos contando cosas distintas sobre lo mismo, y uno
     * de los dos era el que el juego pinta en el suelo.
     */
    const [ux, uz] = this.mundo.enLaPista(
      this.mundo.scenario.runway.length * 0.5 - this.mundo.sendaDesde(),
    );
    const suelo = Math.hypot(s.position.x - ux, s.position.z - uz);
    // Muy cerca del umbral el ángulo se dispara y el PAPI de verdad tampoco
    // sirve: se mira hasta la valla y a partir de ahí se mira la pista.
    if (suelo < 150 || suelo > 6000) return;
    const blancas = blancasDePapi((Math.atan2(alto, suelo) * 180) / Math.PI);
    if (blancas === this.papiEnPantalla) return;
    // La primera lectura no se anuncia si ya venís bien: la tarjeta es para
    // enseñar a corregir, no para felicitar a quien todavía no ha hecho nada.
    const primera = this.papiEnPantalla === null;
    this.papiEnPantalla = blancas;
    if (primera && blancas === 2) return;
    this.mundo.hechos.emit("papi", { blancas });
  }

  /**
   * El circuito, mientras se vuela: se ve cuando sirve y dice en qué tramo vas.
   *
   * **Se ve desde que estás alineado**, y no desde que despegás: la gracia de
   * un circuito es verlo entero **antes** de meterse en él, igual que el coche
   * del sígame está delante antes de arrancar. Y se apaga en cuanto se toma
   * tierra, porque en el suelo manda la raya verde.
   *
   * Los tramos se cantan al entrar en cada uno, con su dibujo y su nombre de
   * verdad. Solo hacia delante y solo una vez cada uno: quien se sale y vuelve
   * a entrar en el mismo tramo no necesita que se lo repitan.
   */
  seguirElCircuito(acercandose: boolean): void {
    const c = this.ahora.circuito;
    if (!c) return;
    const s = this.ahora.estado;
    const fase = this.ahora.faseDeAhora;
    const enElAire = !s.onGround;
    const preparando =
      s.onGround && (fase === "alineando" || fase === "despegando");
    const alto = s.position.y - this.mundo.terrain.runwayElevation;
    /*
     * **Y en final el circuito no se dibuja.**
     *
     * «No entiendo esa ruta de puntitos amarillos fuera de la línea de
     * aterrizaje, como si me invitara a dar un rodeo.» Y era exactamente eso:
     * en la aproximación se veían **dos caminos a la vez** —los aros y el hilo
     * de la senda diciendo «recto a la pista», y el circuito diciendo «por
     * aquí se da la vuelta»—, y dos caminos son ninguno.
     *
     * El circuito lleva a final y ahí se acaba su trabajo. Se dibuja cuando es
     * lo que hay que seguir: alineado en la pista para verlo entero antes de
     * meterse en él, y volando por encima de la altura a la que ya no se está
     * ni despegando ni aterrizando.
     */
    /*
     * **Y «estar en final» no es solo la fase.** A dos kilómetros del umbral,
     * bajando y alineado, la máquina de fases todavía dice «en vuelo» y quien
     * juega ya está aterrizando: tiene los aros delante y el hilo de la senda
     * puesto. Así que lo que apaga el circuito es lo que de verdad describe
     * ese momento — venir acercándose al umbral y estar ya dentro de donde
     * empieza la senda—, y no una etiqueta.
     */
    /*
     * **Y el corredor entero, no los últimos dos kilómetros.**
     *
     * Se apagaba dentro de los dos mil doscientos metros del umbral, y la
     * senda empieza a los tres mil seiscientos: entre esos dos números quedaba
     * un trecho con los aros delante **y** el circuito dibujado al costado.
     * «Aterrizar en La Palma también tiene la guía de puntitos para dar el
     * rodeo, pero estoy en modo aterrizaje.» Es la misma queja de Yvytu Rape y
     * la misma causa: dos caminos a la vez.
     *
     * Así que el circuito se calla en cuanto se está dentro de donde manda la
     * senda. Lo que se pierde es la ayuda del último tramo de la base; lo que
     * se gana es que nunca haya dos caminos.
     */
    /*
     * **Y con orden de irse al aire, el circuito se enciende.**
     *
     * «Me aparto, pero ¿a dónde voy en una frustrada? ¿Qué hago?» A eso
     * contesta el circuito, que es exactamente el camino de vuelta: se sube,
     * se gira a la izquierda y se vuelve por donde se vino. Sin él, la orden
     * es una flecha que aparece y nada más.
     */
    /*
     * **Y «venir a aterrizar» es venir por el embudo, no estar cerca.**
     *
     * Esto miraba la distancia al umbral y si bajaba. En el viento en cola se
     * vuela hacia el umbral con la pista a mil metros por el costado, así que
     * las dos cosas se cumplen **con dos giros por delante**: medido en
     * Mariscal Estigarribia, el circuito se apagaba durante 3458 de los 6516
     * metros del tramo y volvía a aparecer al pasar por el través. «La línea
     * de puntos desaparece cuando ya voy paralelo a la pista en busca del
     * giro, reaparece cuando estoy en el penúltimo giro.» Exacto, y por esto.
     *
     * Ver `enElEmbudoDeFinal`.
     */
    const enLlegada =
      !this.mandanFrustrar &&
      (fase === "final" ||
        fase === "aterrizado" ||
        (acercandose &&
          enElEmbudoDeFinal(
            this.mundo.scenario.runway,
            s.position.x,
            s.position.z,
          ) !== null));
    c.grupo.visible =
      preparando || (enElAire && alto >= ALTO_PARA_EL_CIRCUITO && !enLlegada);
    if (!enElAire) {
      // En tierra se olvida lo dicho, que la vuelta siguiente empieza de cero.
      if (fase !== "despegando") this.tramoDelCircuito = null;
      return;
    }
    /*
     * **Y no se canta ningún tramo pegado al suelo.**
     *
     * El circuito pasa por encima de la pista —su primer tramo **es** la
     * subida por el eje—, así que cruzando el umbral a diez metros para
     * aterrizar, la máquina veía «estás en la subida» y sacaba su tarjeta
     * encima de la que de verdad tocaba: «ya podés tocar». Lo cazó el banco a
     * la primera. Por debajo de sesenta metros sobre la pista no hay circuito
     * que valga: o estás despegando o estás aterrizando, y las dos cosas
     * tienen su propia lección.
     */
    if (alto < ALTO_PARA_EL_CIRCUITO) return;
    const tramo = c.tramoEn(s.position.x, s.position.z);
    if (!tramo || tramo === this.tramoDelCircuito) return;
    /*
     * **Y no se canta el tramo si ya estás en final.** La lección de ahí en
     * adelante son los aros y el hilo de la senda, y una tarjeta diciendo
     * «girá a la izquierda» encima de eso sería mandar dos cosas a la vez.
     */
    if (fase === "final" || fase === "aterrizado") return;
    /*
     * **Ni con el aviso de terreno puesto.**
     *
     * Los dos salen con la misma prioridad, así que se turnaban: «terrain,
     * pull up» y, un segundo después, «vas por el tramo de subida» — dos
     * cosas contrarias en el mismo sitio de la pantalla. Medido en vídeo, en
     * una aproximación baja, alternando durante ocho segundos.
     *
     * El aviso de terreno manda sobre todo lo demás mientras dura, que es
     * exactamente lo que dice su propio comentario. Un tramo de circuito
     * espera; es una indicación, no una alarma.
     */
    if (this.ahora.terrenoDicho) return;
    this.tramoDelCircuito = tramo;
    this.mundo.hechos.emit("tramoDeCircuito", { tramo });
  }
}
