/**
 * Los avisos de altura de la toma: *one hundred… fifty, thirty, twenty, ten*.
 *
 * Es lo mejor que tiene la aviación para este juego. **Dicen la altura sin
 * mirar ningún instrumento y sin saber leer**, y enseñan solos el ritmo de la
 * recogida: la cuenta se acelera según te acercas, y cuando los números se
 * pegan unos a otros es que hay que tirar. Un niño de cuatro años los repite a
 * la tercera vez.
 *
 * ## En metros, y eso es una decisión
 *
 * Los de verdad van en pies, porque el radioaltímetro va en pies. Aquí van en
 * **metros**, porque toda la cabina de este juego va en metros —ALT en metros,
 * IAS en km/h— y mezclar unidades es peor que apartarse de la costumbre: quien
 * oye «fifty» y ve 50 en el altímetro está aprendiendo dos cosas a la vez;
 * quien oye «fifty» y ve 15 no está aprendiendo ninguna.
 *
 * Las palabras sí son las de verdad, en inglés aeronáutico, igual que IAS y
 * HDG. No se traducen jamás: reconocerlas es parte de lo que se aprende aquí.
 *
 * ## Solo bajando
 *
 * Un aviso se da al **cruzar hacia abajo**, nunca al subir. Sin esto, quien
 * rebota en la toma o quien hace una pasada baja se lleva la cuenta atrás dos
 * veces y del revés, que es exactamente lo contrario de lo que enseña.
 */

/**
 * Los escalones, de más alto a más bajo.
 *
 * Son los de la cadencia real: espaciados arriba y apretados abajo. Esa
 * aceleración **es** la lección — no es una lista de números, es un ritmo que
 * dice «ya, ya, ya».
 */
/*
 * **Y falta cuarenta, que sí es de la cuenta de verdad.**
 *
 * Entre cincuenta y treinta hay un escalón en cualquier radioaltímetro, y es
 * justo donde la cuenta se aprieta y dice «ya». Estaba en la lista de pies y
 * no en ésta.
 *
 * ## Y los tres cientos de en medio, que ya están
 *
 * Se pidió jugando: «se echa de menos un indicador de voz indicando la
 * aproximación y la distancia a tierra: five hundred, four hundred… fifty,
 * forty». Faltaban cuatrocientos, trescientos y doscientos, y esta lista no
 * podía pedirlos porque no estaban grabados — una cuenta en la que tres
 * números los dice otra voz suena peor que una cuenta corta.
 *
 * Ya están tomados, así que entran aquí y en `audio/cabina.ts`, que es donde
 * una prueba comprueba que la tabla no apunta a grabaciones que no hay.
 */
export const ESCALONES: readonly Escalon[] = [
  { metros: 400, dice: "four hundred", encasa: "cuatrocientos" },
  { metros: 300, dice: "three hundred", encasa: "trescientos" },
  { metros: 200, dice: "two hundred", encasa: "doscientos" },
  { metros: 100, dice: "one hundred", encasa: "cien" },
  { metros: 50, dice: "fifty", encasa: "cincuenta" },
  { metros: 40, dice: "forty", encasa: "cuarenta" },
  { metros: 30, dice: "thirty", encasa: "treinta" },
  { metros: 20, dice: "twenty", encasa: "veinte" },
  { metros: 10, dice: "ten", encasa: "diez" },
  { metros: 5, dice: "five", encasa: "cinco" },
];

/**
 * Y los mismos, en pies, para el peldaño que vuela en pies.
 *
 * Porque la regla de arriba tiene una segunda mitad: el número que se canta
 * **es el que marca el instrumento**. En los tres peldaños métricos eso son
 * metros; en Taguato Ruvicha, que lleva la cabina en unidades aeronáuticas,
 * son pies — y ahí «fifty» vuelve a querer decir lo que quiere decir en
 * cualquier avión del mundo: cincuenta pies, quince metros.
 *
 * Son los escalones de verdad de un radioaltímetro, y por eso no son los
 * mismos números: cien pies son treinta metros, así que la cuenta empieza
 * mucho más abajo y se aprieta mucho más deprisa.
 */
export const ESCALONES_EN_PIES: readonly Escalon[] = [
  { metros: 152, dice: "five hundred", encasa: "quinientos" },
  // Y los tres de en medio, que un radioaltímetro sí canta. Ver `ESCALONES`.
  { metros: 122, dice: "four hundred", encasa: "cuatrocientos" },
  { metros: 91.4, dice: "three hundred", encasa: "trescientos" },
  { metros: 61, dice: "two hundred", encasa: "doscientos" },
  { metros: 30.5, dice: "one hundred", encasa: "cien" },
  { metros: 15.2, dice: "fifty", encasa: "cincuenta" },
  { metros: 12.2, dice: "forty", encasa: "cuarenta" },
  { metros: 9.1, dice: "thirty", encasa: "treinta" },
  { metros: 6.1, dice: "twenty", encasa: "veinte" },
  { metros: 3, dice: "ten", encasa: "diez" },
];

/*
 * **Ya no hay rearme por altura, y ese era el fallo.**
 *
 * Había uno: subir ocho metros por encima de un escalón lo volvía a armar. La
 * holgura evitaba que rozarlo lo disparara cada fotograma, pero no evitaba lo
 * que de verdad pasa volando sobre relieve: la altura **sobre el suelo** salta
 * con cada pliegue del terreno, y cada salto rearma y vuelve a cantar. Medido
 * en el barrido, en La Palma —una isla de barrancos con la pista sobre el
 * mar—: «cien» **seiscientas siete veces** en un solo vuelo. Acotarlo a la
 * toma lo dejó en trescientas diecinueve, porque dentro del propio embudo el
 * terreno cae al mar.
 *
 * La regla buena no necesita holgura ninguna: **en una toma la cuenta baja y
 * no vuelve a subir.** Rearmar es cosa de empezar **otra** aproximación, y eso
 * ya lo cubre salir de la toma —ver `aterrizando`—, que es lo que pasa al
 * irse al aire, al tocar o al alejarse de la pista.
 *
 * Y de paso desaparece el número mágico.
 */

/**
 * Cuántos fotogramas seguidos fuera de la toma cuentan como haberse ido.
 *
 * Unos tres segundos a sesenta por segundo. Rozar el borde del embudo dura un
 * puñado de fotogramas; irse al aire dura mucho más. Ver `paso`.
 */
const SE_FUE_DE_VERDAD = 180;

export interface Escalon {
  readonly metros: number;
  /** Lo que dice una cabina de verdad. */
  readonly dice: string;
  /** Y la misma cifra en casa, para el peldaño que todavía no habla inglés. */
  readonly encasa: string;
}

export type Aviso = Escalon;

/**
 * La cuenta atrás de la toma.
 *
 * Se le da la altura sobre el suelo en cada fotograma y devuelve el aviso que
 * toca, o `null`. No sabe hablar ni dibujar: eso es de quien lo use.
 */
export class AvisosDeAltura {
  /** Escalones ya dados en esta toma. Ver `paso`. */
  private dados = new Set<number>();

  /**
   * Cuántos fotogramas seguidos lleva sin venir a posarse.
   *
   * Se cuenta en fotogramas y no en segundos porque esto no recibe el reloj, y
   * lo que hace falta es distinguir «rozó el borde del embudo» de «se fue al
   * aire»: cualquier umbral de unos segundos separa las dos cosas.
   */
  private fuera = 0;

  /**
   * Si se ha estado por encima del escalón más alto desde el último contacto
   * con el suelo.
   *
   * **Es lo que separa una recogida de una carrera de despegue**, y ninguna de
   * las otras guardas lo conseguía. En la carrera el avión rebota: las ruedas
   * tocan y dejan de tocar, está «en el aire» a dos metros, está sobre la
   * pista, y entre bote y bote **baja** — así que «en el aire», «es una toma»
   * y «va bajando» daban verdad las tres, y la cuenta entera se soltaba desde
   * arriba una y otra vez.
   *
   * Pero para cantar un escalón hay que haber estado por encima de **ese**
   * escalón. Un despegue empieza en el suelo; una recogida viene de arriba.
   * Eso no lo puede falsear ni un rebote ni un barranco.
   *
   * **Y se guarda la altura, no un sí o un no.** Era una bandera que se
   * encendía al pasar del escalón más alto de la lista, y eso ataba la cuenta
   * entera al primer número: el día que la lista empezó en trescientos metros
   * en vez de en cien, un circuito a doscientos cincuenta se quedó **sin
   * cantar nada**. Con la altura máxima alcanzada, cada escalón se arma solo
   * cuando se ha estado por encima de él, que es lo que la regla decía desde
   * el principio.
   */
  private masAltoVisto = 0;

  /**
   * Los escalones de hoy: los métricos o los de pies.
   *
   * Los elige el juego según las unidades del peldaño, porque el número que se
   * canta tiene que ser el que marca el instrumento. Ver `ESCALONES_EN_PIES`.
   */
  private readonly escalones: readonly Escalon[];

  constructor(escalones: readonly Escalon[] = ESCALONES) {
    this.escalones = escalones;
  }

  /**
   * Un fotograma.
   *
   * `sobreElSuelo` en metros; `enElAire` para no cantar mientras se rueda —al
   * rodar se está a un metro del suelo todo el rato y no hay toma que anunciar.
   */
  paso(
    sobreElSuelo: number,
    enElAire: boolean,
    /**
     * Si esto es una toma: viniendo en final o ya sobre la pista.
     *
     * **Sin esto la cuenta atrás es del terreno, no de la recogida.** El
     * rearme mira la altura sobre el suelo, y sobrevolando un sitio de
     * barrancos esa altura salta de treinta a doscientos metros y vuelve con
     * cada pliegue: cada oscilación rearma un escalón y lo vuelve a cantar.
     * Medido en el barrido, en La Palma: **«cien» seiscientas siete veces** en
     * un solo vuelo, «cincuenta» cuatrocientas veintisiete.
     *
     * Y estos avisos no son del terreno. Lo dice la cabecera de este fichero:
     * «enseñan solos el ritmo de la recogida». Fuera de una toma no enseñan
     * nada — son ruido, y del que se aprende a no oír.
     */
    aterrizando: boolean,
    /**
     * Y si va **bajando**. La cuenta atrás es de la recogida: subiendo no se
     * recoge nada.
     *
     * **Aquí estaba el fallo de verdad**, y no en el terreno. En la carrera de
     * despegue el avión va rebotando por la pista: las ruedas tocan y dejan de
     * tocar, y cada contacto borra la cuenta —«en tierra se olvida todo»—. Al
     * fotograma siguiente está «en el aire» a dos metros y **sobre la pista**,
     * o sea que hasta la guarda de «esto es una toma» daba verdad, y la cuenta
     * entera se soltaba desde arriba. Y otra vez. Y otra.
     *
     * Medido en La Palma con el registro de cantos, que lo encontró a la
     * primera cuando cuatro arreglos a ojo no lo habían conseguido:
     *
     *     one hundred [42 kt · 2 m] · fifty [42 kt · 2 m] · thirty [42 kt · 2 m]
     *     one hundred [42 kt · 2 m] · fifty [42 kt · 2 m] · …
     *
     * Cuarenta y dos nudos y dos metros de altura son una carrera de despegue,
     * no una toma. Y la cabecera de este fichero ya lo decía desde el primer
     * día —«solo bajando: un aviso se da al cruzar hacia abajo, nunca al
     * subir»—; lo que no había era quien lo comprobara.
     */
    bajando: boolean,
  ): Aviso | null {
    /*
     * **Y lo que olvida la cuenta no puede depender del terreno.**
     *
     * Costó tres intentos y los tres movieron el número sin llevarlo a cero.
     * Medido en La Palma —isla de barrancos, con la pista sobre el mar— y en
     * este orden:
     *
     *   - de salida, 607 repeticiones de «cien» en un vuelo;
     *   - acotando los avisos a la toma, 319;
     *   - quitando además el rearme por altura, 509;
     *   - borrando la cuenta por encima de doscientos metros, **654**.
     *
     * Y el patrón estaba a la vista desde el principio: para cantar «cien»
     * seiscientas veces hay que **olvidar la cuenta seiscientas veces**. Cada
     * arreglo cambiaba de camino de olvido sin quitar ninguno, y todos los
     * caminos colgaban de lo mismo: `sobreElSuelo`, que sobre relieve sube y
     * baja con cada pliegue aunque el avión vaya clavado.
     *
     * Así que la cuenta se olvida por **sucesos**, y ninguno lo puede fabricar
     * el terreno:
     *
     *   - **tocar tierra** — la toma se acabó, la próxima empieza entera;
     *   - **dejar de venir a posarse durante un rato seguido** — irse al aire
     *     de verdad. Un rato, y no un fotograma: el embudo de final es una
     *     figura geométrica y un avión que la roza entra y sale de ella
     *     muchas veces sin dejar de aproximar.
     *
     * Y la altura solo decide **qué** se canta, que es para lo que sirve.
     */
    if (!enElAire) {
      this.dados.clear();
      this.fuera = 0;
      // Tocar el suelo cierra la cuenta: para volver a contar hay que volver a
      // subir. Ver `masAltoVisto`.
      this.masAltoVisto = 0;
      return null;
    }
    this.masAltoVisto = Math.max(this.masAltoVisto, sobreElSuelo);
    if (!aterrizando) {
      this.fuera++;
      if (this.fuera > SE_FUE_DE_VERDAD) this.dados.clear();
      return null;
    }
    this.fuera = 0;
    // Y subiendo no se canta, aunque no se olvide lo dicho. Ver `bajando`.
    if (!bajando) return null;

    // Y el aviso: el más alto de los que se acaban de cruzar hacia abajo. Se
    // da uno solo por fotograma —caer diez metros de golpe no puede soltar
    // cuatro palabras a la vez— y se dan por dados los de debajo, que ya no
    // toca cantarlos.
    for (const e of this.escalones) {
      if (this.dados.has(e.metros) || sobreElSuelo > e.metros) continue;
      // Y sin haber estado por encima de él: eso es una carrera de despegue
      // rebotando, no una recogida. Ver `masAltoVisto`.
      if (this.masAltoVisto <= e.metros) continue;
      this.dados.add(e.metros);
      return e;
    }
    return null;
  }

  /** Vuelta a empezar. La llama el juego al reiniciar el vuelo. */
  reiniciar(): void {
    this.dados.clear();
    this.fuera = 0;
    this.masAltoVisto = 0;
  }
}
