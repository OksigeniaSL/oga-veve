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
 * barata: lo que hay aquí dentro solo mira el vuelo y el campo al que se
 * viene, y lo único que hace cuando decide algo es **contarlo**.
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
import {
  Minimos,
  porQueNoEstaEstabilizada,
  PUERTA_ESTABILIZADA,
  seVeLaPista,
  type PorQueMandaron,
} from "./minimos";
import type { MotivoDeIrse, Reparto } from "../hechos";
import type { Circuito, TramoDeCircuito } from "../world/circuito";
import { ALTURA_DE_CIRCUITO } from "../world/circuito";
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

/**
 * Y hasta cuál, que es la que faltaba.
 *
 * Había suelo y no había techo, así que pasando por encima del aeropuerto a
 * mil ochocientos metros y a trescientos nudos —o sea yéndose a otra isla—
 * la máquina seguía viendo tramos de circuito y la instructora seguía
 * mandando: «girá otra vez y empezá a bajar, ya vamos a aterrizar». Contado
 * jugando: «si despego y me voy a otro sitio, la instructora que se deje de
 * insistir en dar las instrucciones de lo que ya está claro que NO voy a
 * hacer».
 *
 * El doble de la altura del circuito. No es un número redondo puesto a ojo:
 * un circuito se vuela **a su altura**, y estar al doble de ella no es ir
 * alto en el circuito, es no estar en el circuito. Es la misma idea que el
 * suelo —por debajo de sesenta metros o despegás o aterrizás— dicha por el
 * otro lado.
 */
const TECHO_DEL_CIRCUITO = ALTURA_DE_CIRCUITO * 2;

/**
 * El campo al que se viene, tal y como lo necesita la aproximación.
 *
 * **Se pregunta en cada paso y no se guarda**, que era el fallo. Esta pieza
 * se construía con el escenario y el terreno de casa y los copiaba: el embudo
 * de final, la altura sobre la pista, el eje, el umbral y el PAPI eran los de
 * Gando aunque se estuviera llegando a Los Rodeos. A ciento trece kilómetros
 * de la pista de casa ninguna de las cuentas llegaba a hacerse, así que en el
 * campo de llegada no había mínimos, ni orden de irse al aire, ni PAPI, ni
 * circuito: **el momento de decidir desaparecía justo en el campo que no se
 * conoce**. Ver `world/campo-del-vuelo.ts`.
 */
export interface CampoDeLaAproximacion {
  /** Su pista en coordenadas de este mundo, con la cabecera en uso. */
  readonly pista: {
    readonly x: number;
    readonly z: number;
    readonly heading: number;
    readonly length: number;
    readonly width: number;
  };
  /** La cota de su asfalto debajo del avión, m. */
  readonly cota: number;
  /** Cuánto queda hasta su umbral en uso, m. */
  readonly alUmbral: number;
  /**
   * Dónde arranca la senda de su PAPI, en coordenadas del mundo, o `null` si
   * ese campo no tiene PAPI.
   *
   * Es **desde donde se cuenta la senda**: la tarjeta del PAPI medía el
   * ángulo desde el umbral y decía «dos y dos, vas bien» justo cuando las
   * cuatro luces del mundo estaban rojas. Ver `SENDA_DESDE` en
   * `world/runway-guide.ts`. Y `null` en un campo de hierba, que no tiene: ahí
   * enseñar un PAPI sería enseñar un instrumento que no está.
   */
  readonly senda: readonly [number, number] | null;
  /**
   * **El ángulo de su senda**, grados: al que va reglado su PAPI. Tres en
   * casi todas; 3,7 en la 21 de Lanzarote. Ver `world/sendas-publicadas.ts`.
   */
  readonly angulo?: number;
  /**
   * **Si no tiene torre**: una pista particular o sin servicio. Ahí lo que
   * puede cruzarse es la vaca, y se ve. Ver `mirarSiMandanFrustrar`.
   */
  readonly sinTorre?: boolean;
}

/** Lo que no cambia en todo un vuelo. */
export interface MundoDeLaAproximacion {
  /** El avión que se vuela, que se puede cambiar en pleno vuelo. */
  readonly avion: () => AircraftConfig;
  readonly hechos: Reparto;
  readonly vaca: Vaca;
  /** El campo que se tiene debajo. Ver `CampoDeLaAproximacion`. */
  readonly campoDeAhora: () => CampoDeLaAproximacion;
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
  /**
   * El techo de nubes **sobre el campo de ahora**, m, o `null` si no hay o si
   * la capa queda por debajo de su pista.
   */
  readonly techoDeNubes: number | null;
  /** Si hay un aviso de terreno puesto, que manda sobre todo lo demás. */
  readonly terrenoDicho: "bajo" | "sube" | "monte" | null;
  /** Si el vuelo ya se dio por terminado. */
  readonly vueloTerminado: boolean;
  /**
   * Si el vuelo va a otro campo y el de ahora es del que se sale.
   *
   * Entonces el circuito de aquí no se dibuja ni se canta: sirve para volver
   * a aterrizar en él, y quien va a otra isla no vuelve. «¿Para qué me dice
   * la instructora que gire a la derecha para dar la vuelta y volver a
   * aterrizar si voy a otra parte?» Al llegar al destino, el campo de ahora
   * pasa a ser ése y su circuito vuelve, que ahí sí sirve para entrar.
   */
  readonly haciaOtroCampo?: boolean;
  /**
   * **Si se vuela sin motor.** Entonces no hay frustrada: ni el sorteo, ni
   * los mínimos que mandan irse, ni la pista ocupada. Un avión que no puede
   * subir no recibe la orden de subir; recibe prioridad. Ver
   * `flight/sin-motor.ts`.
   */
  readonly sinMotor?: boolean;
  /**
   * **Si se tiene prioridad**: con un MAYDAY o un «minimum fuel» puesto. A
   * ése no se le inventa una frustrada —la de una de cada cuatro, la que
   * sale del sorteo—; solo se le manda al aire si la pista está ocupada de
   * verdad, o si su propia aproximación no está para seguir. Gando lo hizo
   * con el JAZ 120 en reserva: «motor y al aire». «¿Los controladores de
   * Gando son unos psicópatas?».
   */
  readonly conPrioridad?: boolean;
  /**
   * **Si se está en la final de la torre**: viniendo a la pista por su lado
   * de aproximación, a millas. Ver `flight/final-de-la-torre.ts` y
   * `seguirElCircuito`.
   */
  readonly enLaFinalDeLaTorre?: boolean;
  /**
   * **Lo que se mira en la puerta de los quinientos pies** y no sale del
   * estado del avión: la indicada en nudos, el desvío de la senda en puntos
   * —el del rombo— y si va configurado para aterrizar. Sin esto no se mira
   * la puerta. Ver `mirarLaPuerta`.
   */
  readonly enLaPuerta?: {
    readonly kt: number;
    readonly puntos: number | null;
    readonly configurado: boolean;
    /**
     * El ritmo de bajada **sostenido**, m/s: de media en los últimos cinco
     * segundos. La regla habla de no bajar a más de mil pies por minuto de
     * forma sostenida, y el variómetro de un instante es un bache.
     */
    readonly vertical: number;
  };
}

export class LaAproximacion {
  /** En qué tramo del circuito se dijo por última vez que estaba. */
  tramoDelCircuito: TramoDeCircuito | null = null;

  /**
   * **Si ahora mismo se está volando el circuito**: en el aire, a su altura,
   * cerca de uno de sus tramos y sin estar ya en la llegada.
   *
   * No es `tramoDelCircuito !== null`, que es el último tramo **dicho** y se
   * queda puesto aunque uno se vaya a dar una vuelta por el valle. Es lo que
   * decide si hay una velocidad de circuito que pedir: fuera de él, la
   * velocidad no tiene un valor bueno. Ver `bandaDeCircuito`.
   */
  enElCircuito = false;

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
  porqueMandaron: PorQueMandaron = null;

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

  /**
   * Si la orden la dio un avión que ocupa la pista, cómo saber si sigue en
   * ella. Ver `mandarIrsePorLaPistaOcupada`.
   */
  private laPistaSigueOcupada: (() => boolean) | null = null;

  /** El último motivo por el que se mandó frustrar, con sus números. */
  porQueSeMando: Record<string, unknown> | null = null;

  /**
   * **Y el último por el que la instructora propuso irse**, con sus números.
   * Para el banco. Ver `mirarLaPuerta`.
   */
  porQueSePropuso: Record<string, unknown> | null = null;

  /** Si en esta aproximación ya se miró la puerta de los quinientos pies. */
  private puertaMirada = false;

  /** Lo que pasa ahora mismo. Se pone al empezar cada paso. */
  private ahora!: AhoraMismo;

  /**
   * Y el campo al que se viene, preguntado una vez por paso: las cuatro
   * decisiones de un paso tienen que mirar la misma pista.
   */
  private campo!: CampoDeLaAproximacion;

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
    this.campo = this.mundo.campoDeAhora();
    this.explicarElPapi(ahora.acercandose);
    this.mirarLaPuerta(ahora.acercandose);
    this.mirarLosMinimos(ahora.acercandose);
    this.mirarSiMandanFrustrar(ahora.acercandose);
    this.seguirElCircuito(ahora.acercandose);
  }

  /** Se empieza de nuevo: ni orden puesta, ni PAPI dicho, ni tramo. */
  reiniciar(): void {
    this.laPistaSigueOcupada = null;
    this.mandanFrustrar = false;
    this.porqueMandaron = null;
    this.yaLoMandaron = false;
    this.leToca = null;
    this.altoAlMandar = 0;
    this.porQueSeMando = null;
    this.papiEnPantalla = null;
    this.tramoDelCircuito = null;
    this.enElCircuito = false;
    this.minimos.reiniciar();
    this.puertaMirada = false;
    this.porQueSePropuso = null;
  }

  /**
   * Se ha cambiado de campo: lo dicho del PAPI y del circuito era de la otra
   * pista. La orden y los mínimos se quedan como estén, que son del vuelo.
   */
  otroCampo(): void {
    this.papiEnPantalla = null;
    this.tramoDelCircuito = null;
    this.enElCircuito = false;
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
     * **Sin motor, ninguna orden, y la que hubiera se retira.** Ver
     * `AhoraMismo.sinMotor`.
     */
    if (this.ahora.sinMotor) {
      if (this.mandanFrustrar) this.levantarLaOrden();
      return;
    }
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
       * **Y si la mandó un avión de verdad, hasta que la deje.** Subir o
       * alejarse levanta una orden sin motivo a la vista; con el de delante
       * todavía en la pista, levantarla era decirte «cleared to land» con él
       * encima. Se levanta cuando se va, igual que la vaca.
       */
      if (this.laPistaSigueOcupada?.()) return;
      const alto = s.position.y - this.campo.cota;
      const subio = alto > this.altoAlMandar + SUBIR_PARA_IRSE;
      const alejandose = !acercandose && this.campo.alUmbral > MANDAN_DESDE;
      if (subio || alejandose) this.levantarLaOrden();
      return;
    }
    if (this.yaLoMandaron || this.ahora.vueloTerminado || !acercandose) return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    const alto = s.position.y - this.campo.cota;
    if (alto < ALTO_MINIMO_PARA_MANDAR || alto > ALTO_MAXIMO_PARA_MANDAR)
      return;
    if (this.campo.alUmbral > MANDAN_DESDE) return;
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
    if (enElEmbudoDeFinal(this.campo.pista, s.position.x, s.position.z) === null)
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
    // Con prioridad no se inventa nada. Ver `AhoraMismo.conPrioridad`.
    if (this.ordenes === "auto" && this.ahora.conPrioridad) return;
    /*
     * **Y con torre, nada que no esté.** El sorteo se escribió cuando el
     * juego no tenía más tráfico que el de la radio, y daba la orden con su
     * «pista ocupada» y la lámpara roja **sin nadie en la pista**: una de
     * cada cuatro finales, entre los doscientos y los quinientos pies, en
     * cualquier aeropuerto. Hoy el tráfico se ve, y la torre ya manda al aire
     * cuando hay alguien en tu pista de verdad —ver `paso` en
     * `flight/turno-de-pista.ts`—. Inventarlo enseña que la torre manda
     * irse por nada, y Enrique, con el JAZ 120 llegando a Tenerife Sur: «tener
     * que hacer frustradas todos los vuelos es una basura». Queda la vaca,
     * donde no hay torre, que se ve cruzar.
     */
    if (this.ordenes === "auto" && !this.campo.sinTorre) return;
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
   * **La torre te manda al aire porque la pista está ocupada de verdad**: el
   * que iba delante en final no la ha dejado libre y llegaste a la altura de
   * decisión sin tu «cleared to land». Ver `autorizarCuandoToque` en
   * `game.ts`.
   *
   * Es la misma orden que la del sorteo —la lámpara, «go around, runway
   * occupied», el circuito para volver— y por eso se da por la misma puerta.
   * Lo que no mira es el sorteo ni `ordenes`: aquello decide si **se inventa**
   * un motivo, y aquí el motivo está en la pista, se ve y se oyó.
   */
  mandarIrsePorLaPistaOcupada(alto: number, sigueOcupada: () => boolean): void {
    // Sin motor la pista es de quien no puede irse: se aparta el otro.
    if (this.mandanFrustrar || this.ahora?.sinMotor) return;
    this.laPistaSigueOcupada = sigueOcupada;
    this.yaLoMandaron = true;
    this.mandanFrustrar = true;
    this.porqueMandaron = "pistaOcupada";
    this.altoAlMandar = alto;
    this.mundo.hechos.emit("mandaronIrseAlAire", { porque: "pistaOcupada" });
  }

  /**
   * **Te mandan al aire porque venís por la otra cabecera**, la que no está
   * en uso. Lo decide `LaOtraCabecera` —cuándo y por qué—; aquí se da por la
   * misma puerta que las demás órdenes, para que se levante igual —subiendo o
   * alejándose— y para que irse se celebre igual. Ver
   * `flight/la-otra-cabecera.ts`.
   *
   * Y como la de no estabilizada, aterrizar con ella puesta no rompe nada: la
   * pista está vacía. Lo que se lleva quien sigue es lo de verdad, la carrera
   * larga del viento de cola.
   */
  mandarIrsePorLaOtraCabecera(
    alto: number,
    motivo: "otraPunta" | "vientoDeCola",
  ): void {
    if (this.mandanFrustrar || this.ahora?.sinMotor) return;
    this.yaLoMandaron = true;
    this.mandanFrustrar = true;
    this.porqueMandaron = "otraCabecera";
    this.altoAlMandar = alto;
    this.mundo.hechos.emit("mandaronIrseAlAire", {
      porque: "otraCabecera",
      motivo,
    });
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
    const porque = this.porqueMandaron;
    this.laPistaSigueOcupada = null;
    this.mandanFrustrar = false;
    this.porqueMandaron = null;
    this.mundo.vaca.quitar();
    this.mundo.hechos.emit("pistaLibreOtraVez", { porque });
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
   * aparece en todas las cartas. Ahí se canta «minimums» y se mira la pista.
   *
   * **Y quien decide es quien vuela.** Esto mandaba irse al aire, con la
   * misma orden y la misma lámpara roja que la torre, si a esa altura se iba
   * rápido, lento, torcido o fuera del eje: para quien juega era la torre
   * mandándole al aire por ir un poco alto. Enrique, con el JAZ 120 en
   * Guyrami, lo oía casi en cada final: «Venís mal para bajar: gas y al
   * aire». Lo real es que la torre manda al aire por la pista, el tráfico o
   * la separación, y que irse por no venir estabilizado lo decide la
   * tripulación, a los quinientos pies —ver `mirarLaPuerta`—. Aquí queda lo
   * que de verdad pasa a los mínimos: se canta, y si no se ve la pista, la
   * instructora propone irse, que es lo que manda la regla de los mínimos;
   * pero el avión no se va solo: se va quien vuela.
   */
  mirarLosMinimos(acercandose: boolean): void {
    // Sin motor no hay decisión que tomar a sesenta metros: se aterriza.
    if (this.mandanFrustrar || this.ahora.vueloTerminado || this.ahora.sinMotor)
      return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    /*
     * **Y solo viniendo por el embudo de final.**
     *
     * La altura de decisión es un punto de la aproximación, no una altura
     * cualquiera: cruzar los sesenta metros dando el giro a la base, con la
     * pista a un kilómetro por el costado, no es llegar a mínimos. Medido en
     * el vídeo de un circuito en Mariscal Estigarribia: la orden salía en el
     * segundo 393, con el avión en pleno viraje. Ver `enElEmbudoDeFinal`.
     */
    if (enElEmbudoDeFinal(this.campo.pista, s.position.x, s.position.z) === null)
      return;
    const alto = s.position.y - this.campo.cota;
    if (!this.minimos.paso(alto, acercandose)) return;
    this.mundo.hechos.emit("minimos", {});
    // Dentro de la nube a los mínimos no hay pista que mirar. Ver `seVeLaPista`.
    if (!seVeLaPista(this.ahora.techoDeNubes)) this.proponerIrse("sinPista", alto);
  }

  /**
   * **La puerta de los quinientos pies**: si la aproximación no está
   * estabilizada al cruzarla, la instructora propone irse al aire, con calma
   * y una vez por aproximación. Ver `PUERTA_ESTABILIZADA` y
   * `porQueNoEstaEstabilizada` en `flight/minimos.ts`.
   *
   * **Propone, no manda.** Ni orden, ni lámpara, ni la senda que se apaga:
   * quien vuela decide, y si se va, se felicita como siempre —renunciar es
   * ganar—. Y quien sigue y aterriza un poco largo, aterriza: la física pone
   * lo que tenga que poner. Lo que se aprende es que a esa altura se mira y
   * se decide, que es lo que se hace en una cabina de verdad.
   *
   * Se vuelve a mirar en otra aproximación: tras subir de nuevo por encima de
   * la puerta con margen, o al reiniciar.
   */
  mirarLaPuerta(acercandose: boolean): void {
    const puerta = this.ahora.enLaPuerta;
    const s = this.ahora.estado;
    if (!puerta || s.onGround) return;
    const alto = s.position.y - this.campo.cota;
    // Otra aproximación: por encima de la puerta con cien metros de margen.
    if (alto > PUERTA_ESTABILIZADA + 100) this.puertaMirada = false;
    if (
      this.puertaMirada ||
      !acercandose ||
      this.mandanFrustrar ||
      this.ahora.vueloTerminado ||
      this.ahora.sinMotor ||
      alto > PUERTA_ESTABILIZADA
    )
      return;
    // Solo viniendo por el embudo, como los mínimos.
    if (enElEmbudoDeFinal(this.campo.pista, s.position.x, s.position.z) === null)
      return;
    this.puertaMirada = true;
    const pista = this.campo.pista;
    const { across } = enEjesDePista(
      s.position.x,
      s.position.z,
      pista.x,
      pista.z,
      pista.heading,
    );
    let torcido = ((s.heading * 180) / Math.PI - pista.heading + 540) % 360;
    torcido -= 180;
    const motivo = porQueNoEstaEstabilizada({
      kt: puerta.kt,
      referenciaKt: this.mundo.avion().approachSpeed * 1.943844,
      vertical: puerta.vertical,
      delEje: across,
      torcido,
      puntos: puerta.puntos,
      configurado: puerta.configurado,
    });
    if (motivo)
      this.proponerIrse(motivo, alto, {
        kt: Math.round(puerta.kt),
        puntos: puerta.puntos,
        delEje: Math.round(across),
        torcido: Math.round(torcido),
      });
  }

  /** La propuesta de irse, contada. Ver `mirarLaPuerta`. */
  private proponerIrse(
    motivo: MotivoDeIrse,
    alto: number,
    numeros: Record<string, unknown> = {},
  ): void {
    const s = this.ahora.estado;
    this.porQueSePropuso = {
      motivo,
      alto: Math.round(alto),
      vertical: +s.verticalSpeed.toFixed(1),
      ...numeros,
    };
    this.mundo.hechos.emit("proponenIrseAlAire", { motivo });
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
    const senda = this.campo.senda;
    if (!senda || !acercandose) return;
    const s = this.ahora.estado;
    if (s.onGround) return;
    const alto = s.position.y - this.campo.cota;
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
    const [ux, uz] = senda;
    const suelo = Math.hypot(s.position.x - ux, s.position.z - uz);
    // Muy cerca del umbral el ángulo se dispara y el PAPI de verdad tampoco
    // sirve: se mira hasta la valla y a partir de ahí se mira la pista.
    if (suelo < 150 || suelo > 6000) return;
    const blancas = blancasDePapi((Math.atan2(alto, suelo) * 180) / Math.PI, this.campo.angulo);
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
    // Se vuelve a mirar cada fotograma, y por defecto no: ver `enElCircuito`.
    this.enElCircuito = false;
    const c = this.ahora.circuito;
    if (!c) return;
    if (this.ahora.haciaOtroCampo && !this.mandanFrustrar) {
      c.grupo.visible = false;
      this.tramoDelCircuito = null;
      return;
    }
    const s = this.ahora.estado;
    const fase = this.ahora.faseDeAhora;
    const enElAire = !s.onGround;
    const preparando =
      s.onGround && (fase === "alineando" || fase === "despegando");
    const alto = s.position.y - this.campo.cota;
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
    /*
     * **Y la final de la torre también es venir a aterrizar**, a millas y
     * antes que el embudo: llegando a Tenerife Sur por una final recta de
     * diez kilómetros, se cantaba «base» del circuito justo después del
     * permiso de aterrizar, con el avión alineado. Dos caminos a la vez.
     */
    const enLlegada =
      !this.mandanFrustrar &&
      (fase === "final" ||
        fase === "aterrizado" ||
        !!this.ahora.enLaFinalDeLaTorre ||
        (acercandose &&
          enElEmbudoDeFinal(this.campo.pista, s.position.x, s.position.z) !==
            null));
    c.grupo.visible =
      preparando ||
      (enElAire &&
        alto >= ALTO_PARA_EL_CIRCUITO &&
        alto <= TECHO_DEL_CIRCUITO &&
        !enLlegada);
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
    // Ni por encima del techo: eso ya no es volar el circuito, es irse. Ver
    // `TECHO_DEL_CIRCUITO`.
    if (alto > TECHO_DEL_CIRCUITO) return;
    const tramo = c.tramoEn(s.position.x, s.position.z);
    // Volando el circuito es exactamente esto: a su altura, cerca de un tramo
    // y sin estar ya en la llegada. Ver `enElCircuito`.
    this.enElCircuito = tramo !== null && !enLlegada;
    if (!tramo || tramo === this.tramoDelCircuito) return;
    /*
     * **Y no se canta el tramo si ya estás en final.** La lección de ahí en
     * adelante son los aros y el hilo de la senda, y una tarjeta diciendo
     * «girá a la izquierda» encima de eso sería mandar dos cosas a la vez.
     *
     * **Con la misma cuenta que apaga el dibujo**, y no solo con la fase. Aquí
     * se miraba la fase a secas, y el dibujo ya había aprendido que «venir a
     * aterrizar» es también venir por el embudo: con el circuito apagado, se
     * cantaba su tramo. En una final recta a Los Rodeos salió «girá otra vez y
     * empezá a bajar» con el avión alineado. Si el dibujo no está, su tramo no
     * se canta; y si la torre manda irse al aire, se canta, que es cuando el
     * circuito enseña el camino de vuelta.
     */
    if (enLlegada) return;
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
