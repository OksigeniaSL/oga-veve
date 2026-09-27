/**
 * El mapa: dónde estoy.
 *
 * Nació de una pregunta muy concreta de quien lo probó: «estoy buscando el río
 * Paraguay, el que pasa por debajo del puente del Chaco, pero estoy
 * desorientado». Y es que en el aire, a quinientos metros y sin instrumentos —
 * en Guyrami no hay ni brújula—, no hay absolutamente nada que diga por dónde
 * se va.
 *
 * **Un mapa es lo más legible que existe para quien no lee.** No hace falta una
 * sola palabra: el asfalto es gris, la ciudad es beis, el monte es verde, la
 * pista es una barra blanca y tú eres una flecha naranja. Un niño de cuatro
 * años sabe leer un mapa mucho antes que una frase.
 *
 * ## Cómo está hecho
 *
 * Dos lienzos. El de abajo lleva el mundo —relieve, agua, ciudad, carreteras y
 * pista— y se pinta **solo cuando el encuadre se ha movido de verdad**; el de
 * arriba lleva la flecha, la ruta y las rayas, y se repinta cada fotograma.
 * Repintar el mundo entero sesenta veces por segundo para mover un triángulo
 * costaba más que el juego. Qué trozo del mundo se enseña y cuándo se repinta
 * lo decide `encuadre-del-mapa.ts`.
 *
 * El norte va arriba y no gira con el avión. Un mapa que gira es más cómodo de
 * seguir y **mucho peor para aprenderse un sitio**, que es de lo que se trata:
 * el río está al oeste siempre, no «a la izquierda ahora mismo».
 */

import { t } from "../i18n";
import { armarPanel, CERRAR } from "./concha";

/** Las dos lupas del plano. Alejar quita el trazo de arriba; acercar lo pone. */
const LUPA_MENOS = `<circle cx="10.5" cy="10.5" r="6.6" />
  <path d="M15.4 15.4 L21 21 M7 10.5 h7" />`;
const LUPA_MAS = `<circle cx="10.5" cy="10.5" r="6.6" />
  <path d="M15.4 15.4 L21 21 M7 10.5 h7 M10.5 7 v7" />`;
import type { Scenario } from "../world/scenarios";
import type { Aerodrome } from "../world/aerodrome";
import type { Ciudad } from "../world/ciudad";
import { puntoDePista } from "../world/rumbo";
import { esAguaDeCasa } from "../world/agua-de-casa";
import type { Hito } from "../world/hitos";
import { Panel } from "./panel";
import {
  encuadreCon,
  escalones,
  hayQueRepintar,
  ladoDelVuelo,
  type Encuadre,
  type Punto,
} from "./encuadre-del-mapa";

/** Lado del lienzo, en píxeles. */
const LADO = 460;

/** Cuántas muestras de relieve se pintan por lado. */
const MUESTRAS = 230;

/*
 * **Las lupas no son un zoom continuo, a propósito.** Un zoom continuo se
 * maneja con dos dedos o con una rueda, y aquí hay que poder cambiarlo **con
 * un dedo y sin puntería**: unos pocos escalones se recorren con dos botones
 * grandes y no hay forma de quedarse en un encuadre raro. La rueda del ratón
 * recorre los mismos escalones. Cuáles son lo dice `escalones`: del vuelo
 * entero a un aeropuerto con sus calles —«¿este mapa no tiene zoom ni
 * nada?»—, de dos en dos y media.
 */

/**
 * Hasta qué lado se dibujan las plataformas y las calles de rodaje, en metros.
 *
 * Más ancho, el aeropuerto entero mide cuatro píxeles y lo único que aportan
 * es suciedad; de cerca son justo lo que se mira, porque son por donde se va.
 */
const LADO_DE_LAS_CALLES = 5000;

/** El color de «de aquí no hay dibujo», y el de sus rayas. */
const SIN_DATOS = [138, 134, 122] as const;
const SIN_DATOS_RAYA = [118, 114, 104] as const;

export class Mapa {
  private caja: HTMLElement | null = null;
  private fondo: HTMLCanvasElement | null = null;
  private encima: HTMLCanvasElement | null = null;
  /** Si está abierto. Lo dice el panel, que es quien enseña y esconde. */
  private get abierto(): boolean {
    return this.panel?.abierto ?? false;
  }

  /**
   * El panel, que es lo que le da el encierro del foco y Escape.
   *
   * Se monta al enganchar la caja porque antes no hay caja que encerrar. Ver
   * `Panel`, y #70 para lo que faltaba aquí.
   */
  private panel: Panel | null = null;
  /**
   * Qué lupa está puesta: cero es el vuelo entero, y de ahí en adelante el
   * avión en medio, cada vez más cerca. Ver `escalones`.
   */
  private lupa = 0;
  private escenario: Scenario | null = null;
  /**
   * La cota del mundo, o `null` donde no se sabe.
   *
   * **`null` y no mar.** Fuera del mundo se pintaba agua, que en Canarias
   * casi siempre acierta y en Paraguay miente: saliendo de Pettirossi hacia
   * Encarnación el plano enseñaba un océano al sur de Asunción. Donde no hay
   * datos se pinta que no hay datos. Ver `Terrain.cotaConocida`.
   */
  private cota: ((x: number, z: number) => number | null) | null = null;
  /**
   * La pista del otro aeropuerto de la ruta, si esta ruta lleva a alguno.
   *
   * En coordenadas de este mundo, ya corrida. Sin ella el plano enseñaba **un
   * solo sitio donde se puede bajar**, y eso es medio mapa: quien sale de El
   * Hierro y ve dos islas en el horizonte no tiene forma de saber cuál de las
   * dos tiene aeropuerto. Contado jugando después de volar noventa kilómetros
   * hasta La Palma: «¿y el aeropuerto de La Palma?, ¿y el mapa?».
   *
   * La Palma no lo tiene porque el destino de El Hierro es **La Gomera**, a
   * setenta kilómetros al 070. Eso el juego lo sabía y no lo decía en ningún
   * sitio donde se pudiera mirar antes de salir. Un mapa es exactamente el
   * sitio.
   */
  private otrasPistas: readonly {
    x: number;
    z: number;
    heading: number;
    length: number;
  }[] = [];

  /** Las pistas de los destinos, en coordenadas de este mundo. */
  ponerOtrasPistas(
    pistas: readonly {
      x: number;
      z: number;
      heading: number;
      length: number;
    }[],
  ): void {
    this.otrasPistas = pistas;
    this.repintar();
  }

  /**
   * Los aeródromos del vuelo con su nombre, para rotularlos.
   *
   * El plano pintaba las pistas y ninguna decía de quién era: desde Gran
   * Canaria había cinco barras blancas sobre cinco islas y ni una palabra. Un
   * mapa de vuelo rotula sus aeródromos, con el indicativo delante porque es
   * lo que va en las cartas; y el nombre detrás, que es lo que se reconoce.
   */
  private campos: readonly {
    x: number;
    z: number;
    oaci: string | null;
    nombre: string;
  }[] = [];

  ponerCampos(
    campos: readonly {
      x: number;
      z: number;
      oaci: string | null;
      nombre: string;
    }[],
  ): void {
    this.campos = campos;
    this.repintar();
  }

  /**
   * Los aeródromos de los otros campos, **ya corridos** a este mundo, y sus
   * ciudades con dónde caen.
   *
   * De los vecinos solo llegaba la barra de la pista, así que en el
   * aeropuerto de llegada, al acercar el plano para ver por dónde se rueda,
   * salía una raya blanca suelta: ni plataforma, ni calles, ni la ciudad de
   * al lado. Justo en el campo que no se conoce.
   */
  private otrosAerodromos: readonly Aerodrome[] = [];
  private otrasCiudades: readonly {
    ciudad: Ciudad;
    x: number;
    z: number;
  }[] = [];

  ponerOtrosAerodromos(aerodromos: readonly Aerodrome[]): void {
    this.otrosAerodromos = aerodromos;
    this.repintar();
  }

  /** Una ciudad de otro campo, con el centro de su mapa en este mundo. */
  ponerOtraCiudad(ciudad: Ciudad, x: number, z: number): void {
    this.otrasCiudades = [...this.otrasCiudades, { ciudad, x, z }];
    this.repintar();
  }

  /**
   * Tira el fondo pintado: lo que se pinta ha cambiado. Si está abierto se
   * pinta ya; si no, al abrirse.
   */
  private repintar(): void {
    this.encuadrePintado = null;
    if (this.abierto) this.pintarFondo();
  }

  /** El alternativo de ahora, para marcarlo. Ver `update`. */
  private alterno: { x: number; z: number } | null = null;

  /** Los hitos del paisaje, y quién sabe cuáles se han nombrado ya. */
  private hitos: readonly Hito[] = [];
  private dichos: () => ReadonlySet<string> = () => new Set();

  /**
   * Los sitios con nombre que hay alrededor, y de cuáles ya se ha hablado.
   *
   * El mapa de este juego presume de no tener una sola palabra, y eso se
   * queda como está: cada hito se dibuja con su símbolo —un triángulo si es
   * cumbre, un círculo si es pueblo—, que es lo que se entiende sin leer.
   *
   * **El nombre solo sale cuando ya se ha oído.** La comandante dice «a la
   * izquierda, el Teide» y a partir de ahí ese triángulo del plano lleva su
   * nombre escrito. El mapa se va llenando a medida que se vuela, que es
   * bastante más bonito que venir lleno, y sigue sin haber nada que haya que
   * leer para saber dónde está uno. Ver `flight/lo-que-se-ve.ts`.
   */
  ponerHitos(hitos: readonly Hito[], dichos: () => ReadonlySet<string>): void {
    this.hitos = hitos;
    this.dichos = dichos;
    this.repintar();
  }

  static markup(): string {
    return `
      <!--
        **Y con nombre.** «Panel» le pone role de diálogo y aria-modal —la
        promesa de que lo de detrás no existe— y un diálogo sin nombre es un
        lector de pantalla diciendo «diálogo» y nada más. El del tiempo sí lo
        tenía; este se quedó sin él el día que dejó de ser una caja suelta y
        pasó a ser un panel.
      -->
      <div class="mapa" data-hud="mapa" hidden>
        ${armarPanel({
          titulo: t("mapa.title"),
          panel: "mapa-boton",
          instrumento: true,
          /*
           * **Y las lupas son acciones**, no un adorno flotando encima.
           *
           * Iban `position: absolute` por encima del plano, y con la concha
           * «encima del plano» pasó a ser «encima del título»: en la captura
           * tapaban la mitad de «Ver el plano». La fila de acciones es donde
           * están las herramientas de todos los paneles, siempre en el mismo
           * sitio y sin taparle nada a nadie.
           */
          acciones: [
            { dice: t("mapa.lejos"), como: "lejos", dibujo: LUPA_MENOS },
            { dice: t("mapa.cerca"), como: "cerca", dibujo: LUPA_MAS },
            CERRAR(),
          ],
          cuerpo: `
        <div class="mapa__lienzos">
          <canvas class="mapa__fondo" data-hud="mapa-fondo" width="${LADO}" height="${LADO}"></canvas>
          <canvas class="mapa__encima" data-hud="mapa-encima" width="${LADO}" height="${LADO}"></canvas>
        </div>
          `,
        })}
      </div>
    `;
  }

  bind(
    raiz: HTMLElement,
    escenario: Scenario,
    cota: (x: number, z: number) => number | null,
  ): void {
    this.escenario = escenario;
    this.cota = cota;
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="mapa"]');
    if (this.caja)
      this.panel = new Panel(
        this.caja,
        () => this.cerrar(),
        true,
        /*
         * **Y no congela el vuelo.** El plano existe para ver por dónde vas, y
         * con el avión parado no vas a ninguna parte: la marca de tu posición
         * se queda quieta y el instrumento deja de decir lo único que tiene
         * que decir. El vuelo se mantiene recto mientras está abierto. Ver
         * `PanelDelVuelo.congela`.
         */
        false,
      );
    this.fondo = raiz.querySelector('[data-hud="mapa-fondo"]');
    this.encima = raiz.querySelector('[data-hud="mapa-encima"]');
    raiz
      .querySelector('[data-hud="mapa-boton"]')
      ?.addEventListener("click", () => this.alternar());
    raiz
      .querySelector('[data-accion="cerca"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.acercar(1);
      });
    raiz
      .querySelector('[data-accion="lejos"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.acercar(-1);
      });
    // Y la rueda del ratón, para quien la tenga. No sustituye a los botones:
    // los acompaña.
    this.caja?.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.acercar(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );
    /*
     * **Y el fondo ya no cierra: el fondo es el mundo, y se vuela.**
     *
     * Tocar alrededor del plano lo cerraba, y con el dedo eso quería decir que
     * el primer toque a la palanca se lo comía el plano: con el mapa abierto no
     * se podía volar. Ahora el plano es un instrumento de verdad —se vuela
     * mirándolo, como una carta— y lo de alrededor deja pasar los toques. Se
     * cierra con su botón, con el del mapa de la barra o con Escape; la acción
     * de cerrar es la misma en los ocho paneles desde que hay concha.
     */
    this.caja
      ?.querySelector('[data-accion="cerrar"]')
      ?.addEventListener("click", () => this.cerrar());
  }

  /**
   * Otro escenario, otro mapa.
   *
   * Lo llama el panel del tiempo: cambiar el viento cambia la cabecera en uso, y
   * la pista del mapa es la que se está usando. Con la barra blanca de la
   * cabecera vieja, el mapa mentiría justo en lo que se mira cuando uno se ha
   * perdido.
   */
  rehacer(escenario: Scenario): void {
    this.escenario = escenario;
    this.repintar();
  }

  /** La raíz del HUD, para marcarla mientras el mapa está abierto. */
  private raiz: HTMLElement | null = null;

  private alAbrir: (() => void) | null = null;

  /** A quién avisar al abrirse, para que se aparte. */
  onAbrir(handler: () => void): void {
    this.alAbrir = handler;
  }

  /**
   * Cambia de lupa y **repinta el fondo**, que es lo caro.
   *
   * Se repinta entero porque el relieve se muestrea a la resolución del
   * encuadre: acercarse no es ampliar la imagen, es volver a preguntarle al
   * terreno con más detalle. Ampliar la de antes daría un mapa borroso, que es
   * justo lo que no sirve para mirar una calle de rodaje.
   */
  private acercar(paso: number): void {
    const antes = this.lupa;
    const cuantas = escalones(ladoDelVuelo(this.losCampos(), this.minimo())).length;
    this.lupa = Math.max(0, Math.min(cuantas - 1, this.lupa + paso));
    if (this.lupa === antes) return;
    this.pintarFondo();
  }

  cerrar(): void {
    if (!this.panel?.abierto) return;
    this.panel.cerrar();
    this.avisarAlHud();
  }

  alternar(): void {
    if (!this.panel) return;
    this.panel.alternar();
    this.avisarAlHud();
    if (!this.panel.abierto) return;
    this.alAbrir?.();
    // Con lo que se haya movido mientras estaba cerrado, el fondo de antes ya
    // no vale: se pinta el de ahora.
    this.pintarFondo();
  }

  /**
   * Le dice al HUD que el mapa está abierto, para que aparte lo que estorbe.
   *
   * Va por una clase en la raíz y no tocando estilos desde aquí porque quién
   * se aparta y cuánto es cosa del CSS: en pantalla estrecha el mapa se pone
   * en medio y no hay que apartar nada.
   */
  private avisarAlHud(): void {
    this.raiz?.classList.toggle("hud--con-mapa", this.abierto);
  }

  get visible(): boolean {
    return this.abierto;
  }

  /** Dónde está el avión, para poder centrar el mapa en él al acercarse. */
  private avionX = 0;
  private avionZ = 0;

  /** A dónde se va ahora mismo, si se va a algún sitio. Ver `update`. */
  private destino: { x: number; z: number } | null = null;

  /**
   * Mueve la flecha. Se llama cada fotograma, así que no pinta el mundo.
   *
   * `destino` es el objetivo de la misión, si hay misión. Es la respuesta a
   * «¿cómo sé que voy bien hacia otro lugar concreto?»: la aguja del HUD dice
   * el rumbo, pero un rumbo es un número y no dice **por dónde**. En el mapa
   * se ve la raya del avión al sitio, y si el sitio no cabe en el encuadre la
   * raya se sale por donde hay que ir.
   */
  update(
    x: number,
    z: number,
    rumboRad: number,
    destino: { x: number; z: number } | null = null,
    alterno: { x: number; z: number } | null = null,
    /**
     * Si `destino` es otro aeropuerto al que se vuela, y no el objetivo de una
     * misión: entonces es una ruta, y se pinta la raya de casa hasta él.
     */
    esRuta = false,
  ): void {
    this.destino = destino;
    this.alterno = alterno;
    this.avionX = x;
    this.avionZ = z;
    if (!this.abierto || !this.encima || !this.escenario) return;
    /*
     * **El fondo se repinta cuando el encuadre se ha ido, y solo entonces.**
     *
     * Con lupa el plano sigue al avión, así que se va quedando atrás; en el
     * vuelo entero el avión entra en la cuenta y el encuadre se corre y crece
     * con él. Las dos cosas las mide `hayQueRepintar`, que es quien sabe
     * cuánto puede moverse sin que el avión se salga del papel.
     */
    if (hayQueRepintar(this.encuadrePintado, this.encuadre())) this.pintarFondo();
    const g = this.encima.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, LADO, LADO);

    /*
     * **Y la flecha va con el encuadre que hay pintado, no con el de ahora.**
     *
     * El fondo se pinta de tanto en tanto —cuesta, y no cambia casi nunca— y
     * la flecha se dibuja cada fotograma. Cogiendo cada uno su encuadre, el
     * dibujo se queda con el de hace un rato y la flecha con el de ahora: el
     * mapa entero se desplaza debajo de ella.
     *
     * Contado jugando, volando sobre el mar al oeste de Tenerife: «el mapa no
     * dice la verdad, voy sobre el mar y me indica que estoy sobrevolando la
     * isla por el oeste». Y era exactamente eso — la isla dibujada con un
     * centro y la flecha puesta con otro.
     *
     * Se guarda el encuadre al pintar y la flecha usa **ése**. Si hace falta
     * moverlo, se repinta el fondo, que es lo que ya decide el trozo de
     * arriba.
     */
    const hecho = this.encuadrePintado ?? this.encuadre();
    const puesto = { cx: hecho.cx, cz: hecho.cz, escala: LADO / hecho.lado };

    /*
     * **La ruta, de casa al destino.** Fina y azul, que es el color de ruta de
     * todo el juego, y debajo de todo lo demás: es el plan, no dónde se está.
     * Con ella se ve de un vistazo si uno va por donde tocaba o se ha
     * desviado, que es media lección de navegar.
     */
    if (esRuta && this.destino && this.escenario) {
      const casa = this.escenario.runway;
      const a = this.enElPapel(casa, puesto);
      const b = this.enElPapel(this.destino, puesto);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 12) {
        g.save();
        g.strokeStyle = "rgba(111, 179, 224, 0.85)";
        g.lineWidth = 3;
        g.setLineDash([2, 6]);
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
        g.restore();
      }
    }

    const escala = puesto.escala;
    const px = LADO / 2 + (x - puesto.cx) * escala;
    const py = LADO / 2 + (z - puesto.cz) * escala;

    /*
     * **Y si estás fuera del recuadro, la flecha se queda en el borde.**
     *
     * Volando sobre el mar camino de Gran Canaria, la flecha se salía del
     * lienzo y el mapa se quedaba en blanco azul sin nada: «estoy fuera de este
     * mapa y el mapa me da esto». Un mapa que no sabe que puedes estar fuera de
     * él no es un mapa, es un cuadro.
     *
     * Se pega al borde, apuntando a donde vas, y se le pone un aro para que se
     * distinga de estar dentro. Es lo que hace cualquier navegador con un punto
     * que se sale, y para quien no lee es lo único que se entiende: **por ahí
     * está lo que buscas**.
     */
    const margen = 14;
    const fuera =
      px < margen || py < margen || px > LADO - margen || py > LADO - margen;
    const cx = Math.max(margen, Math.min(LADO - margen, px));
    const cy = Math.max(margen, Math.min(LADO - margen, py));

    if (fuera) {
      /*
       * Una línea de puntos desde el centro hasta la flecha.
       *
       * La flecha pegada al borde se queda a veces detrás de las lupas, y
       * moverlas solo cambia de sitio el problema: el avión puede salir del
       * mundo por cualquier lado. La línea se lee igual aunque un botón le
       * tape la punta, y además dice lo único que hace falta saber ahí —**por
       * dónde has salido**— sin una palabra.
       */
      g.save();
      g.setLineDash([4, 5]);
      g.strokeStyle = "rgba(232, 118, 44, 0.75)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(LADO / 2, LADO / 2);
      g.lineTo(cx, cy);
      g.stroke();
      g.restore();
    }

    /*
     * La raya al sitio al que se va. Va **debajo** de la flecha, para que la
     * flecha se siga viendo entera: lo que se mira es dónde estoy, y la raya
     * es el extra.
     */
    /*
     * El alternativo, con un aro a rayas y sin raya hasta él: está ahí por
     * si hace falta, no es a donde se va. Si se va a él —la reserva desvía el
     * vuelo—, ya es el destino y lleva su raya.
     */
    if (this.alterno) {
      const ax = LADO / 2 + (this.alterno.x - puesto.cx) * escala;
      const az = LADO / 2 + (this.alterno.z - puesto.cz) * escala;
      if (ax > 0 && ax < LADO && az > 0 && az < LADO) {
        g.save();
        g.strokeStyle = "#8fd3e8";
        g.lineWidth = 2.2;
        g.setLineDash([3, 3]);
        g.beginPath();
        g.arc(ax, az, 9, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    }
    if (this.destino) {
      const dx = LADO / 2 + (this.destino.x - puesto.cx) * escala;
      const dz = LADO / 2 + (this.destino.z - puesto.cz) * escala;
      g.save();
      g.strokeStyle = "#ffd27a";
      g.lineWidth = 2.2;
      g.setLineDash([7, 5]);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(dx, dz);
      g.stroke();
      g.setLineDash([]);
      // Y el sitio, con un aro. Si cae fuera del recuadro no se dibuja: ya lo
      // dice la raya, que sale por ese lado.
      if (dx > 0 && dx < LADO && dz > 0 && dz < LADO) {
        g.beginPath();
        g.arc(dx, dz, 6.5, 0, Math.PI * 2);
        g.lineWidth = 2.6;
        g.stroke();
      }
      g.restore();
    }

    g.save();
    g.translate(cx, cy);
    // El rumbo del avión y el norte del mapa son el mismo cero: arriba.
    g.rotate(rumboRad);
    g.fillStyle = "#e8762c";
    g.strokeStyle = "#2a2622";
    g.lineWidth = 1.6;
    if (fuera) {
      // El aro dice «estás fuera, esto es por dónde».
      g.beginPath();
      g.arc(0, 0, 13, 0, Math.PI * 2);
      g.strokeStyle = "#e8762c";
      g.lineWidth = 2.4;
      g.stroke();
      g.strokeStyle = "#2a2622";
      g.lineWidth = 1.6;
    }
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6.5, 8);
    g.lineTo(0, 4.5);
    g.lineTo(-6.5, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  /**
   * Los campos del vuelo: el de casa y los destinos, que son lo que tiene que
   * caber en el plano ancho.
   *
   * **Y en el encuadre ancho cabe todo lo que importa: los aeropuertos y
   * vos.** Era el escenario y el avión, y con rutas eso se quedó corto:
   * volando de El Hierro a La Gomera —setenta kilómetros— el plano se estiraba
   * hasta donde estuviera el avión y **el destino se quedaba fuera del
   * papel**. Contado jugando, con las dos preguntas juntas: «¿y el aeropuerto
   * de La Palma?, ¿y el mapa?».
   */
  private losCampos(): Punto[] {
    const casa = this.escenario?.runway ?? { x: 0, z: 0 };
    return [{ x: casa.x, z: casa.z }, ...this.otrasPistas];
  }

  /** Lo menos que enseña el plano ancho: el escenario de casa entero. */
  private minimo(): number {
    return this.escenario?.size ?? 1;
  }

  /** El encuadre que toca ahora, con la lupa puesta. Ver `encuadreCon`. */
  private encuadre(): Encuadre {
    return encuadreCon(
      this.lupa,
      this.losCampos(),
      { x: this.avionX, z: this.avionZ },
      this.minimo(),
    );
  }

  /** Dónde cae un punto del mundo en el papel, con un encuadre pintado. */
  private enElPapel(
    p: { readonly x: number; readonly z: number },
    e: { readonly cx: number; readonly cz: number; readonly escala: number },
  ): readonly [number, number] {
    return [LADO / 2 + (p.x - e.cx) * e.escala, LADO / 2 + (p.z - e.cz) * e.escala];
  }

  /**
   * El encuadre con el que está pintado el fondo ahora mismo.
   *
   * Lo necesita la flecha: los dos lienzos tienen que estar de acuerdo o el
   * mapa miente. Ver dónde se dibuja la flecha.
   */
  private encuadrePintado: Encuadre | null = null;

  /**
   * El lienzo pequeño del relieve: una muestra, un píxel.
   *
   * Se pintaba muestra a muestra con `fillRect`, cambiando de color cada vez:
   * cincuenta y tres mil rectángulos, y **veinte milisegundos largos** por
   * repintado, medidos con la tarjeta de verdad. Eso daba igual mientras el
   * plano se pintaba una vez; siguiendo al avión se repinta cada poco, y veinte
   * milisegundos son un fotograma perdido cada vez. Escribiendo los píxeles de
   * una vez y ampliándolos al plano, el relieve baja a unos pocos.
   */
  private relieve: HTMLCanvasElement | null = null;

  private pintarFondo(): void {
    const esc = this.escenario;
    const cota = this.cota;
    if (!this.fondo || !esc || !cota) return;
    const g = this.fondo.getContext("2d");
    if (!g) return;

    const encuadre = this.encuadre();
    const { cx, cz, lado } = encuadre;
    const escala = LADO / lado;
    this.encuadrePintado = encuadre;
    const paso = lado / MUESTRAS;

    // ── El relieve ──────────────────────────────────────────────────────
    //
    // Con la misma paleta que el terreno del juego, que es lo que hace que el
    // mapa y lo que se ve por la ventanilla sean el mismo sitio. Una paleta
    // de mapa distinta obliga a traducir, y traducir es justo lo que no puede
    // hacer quien no lee.
    this.relieve ??= Object.assign(document.createElement("canvas"), {
      width: MUESTRAS,
      height: MUESTRAS,
    });
    const r = this.relieve.getContext("2d");
    if (!r) return;
    const img = r.createImageData(MUESTRAS, MUESTRAS);
    const agua = rgbDe(esc.water);
    for (let fila = 0; fila < MUESTRAS; fila++) {
      for (let col = 0; col < MUESTRAS; col++) {
        const x = cx - lado / 2 + (col + 0.5) * paso;
        const z = cz - lado / 2 + (fila + 0.5) * paso;
        /*
         * **Donde no se sabe, se dice que no se sabe.**
         *
         * Fuera del mundo se pintaba mar, con el argumento de que «más allá
         * no hay nada, y ahí el mar es lo honesto». En una isla casi acierta;
         * tierra adentro miente: volando de Pettirossi a Encarnación, el plano
         * ancho enseñaba un océano al sur de Asunción. Ahora la cota viene del
         * mundo entero del vuelo —el mapa fino, los de los destinos y el del
         * horizonte— y donde ninguno contesta se pinta gris a rayas, que es
         * como marca una carta de verdad la zona sin levantar.
         */
        const h = cota(x, z);
        const c =
          h === null
            ? (col + fila) % 6 < 2
              ? SIN_DATOS_RAYA
              : SIN_DATOS
            : esAguaDeCasa(h, esc.waterLevel)
              ? agua
              : rgbDe(colorDeCota(esc, h));
        const i = (fila * MUESTRAS + col) * 4;
        img.data[i] = c[0];
        img.data[i + 1] = c[1];
        img.data[i + 2] = c[2];
        img.data[i + 3] = 255;
      }
    }
    r.putImageData(img, 0, 0);
    // A cuadros, como estaba: el relieve es una rejilla de muestras, y
    // suavizarlo inventaría cotas entre medias.
    g.imageSmoothingEnabled = false;
    g.drawImage(this.relieve, 0, 0, LADO, LADO);

    // ── La ciudad ───────────────────────────────────────────────────────
    //
    // La de casa en el centro de su mapa, y las de los otros campos donde
    // caen: la rejilla de cada una va en las coordenadas de su escenario.
    const pintarCiudad = (ciudad: Ciudad, ox: number, oz: number): void => {
      const celdas = ciudad.rejilla.lado;
      // La celda mide lo mismo en metros pase lo que pase; lo que cambia es
      // cuántos píxeles ocupa.
      const metrosPorCelda = ciudad.tamanoM / celdas;
      const cp = metrosPorCelda * escala;
      for (let fila = 0; fila < celdas; fila++) {
        for (let col = 0; col < celdas; col++) {
          const c = ciudad.rejilla.clase[fila * celdas + col]!;
          if (!c) continue;
          const d = ciudad.rejilla.densidad[fila * celdas + col]! / 255;
          // Del fichero al mundo: la fila crece al norte y la Z al sur.
          const mx = ox - ciudad.tamanoM / 2 + col * metrosPorCelda;
          const mz = oz + ciudad.tamanoM / 2 - (fila + 1) * metrosPorCelda;
          const qx = LADO / 2 + (mx - cx) * escala;
          const qy = LADO / 2 + (mz - cz) * escala;
          if (qx < -cp || qy < -cp || qx > LADO || qy > LADO) continue;
          g.globalAlpha = 0.3 + d * 0.55;
          g.fillStyle = c === 3 ? "#8e8577" : c === 2 ? "#9aa09a" : "#c3b394";
          g.fillRect(qx, qy, cp + 1, cp + 1);
        }
      }
      g.globalAlpha = 1;

      // ── Las carreteras ────────────────────────────────────────────────
      g.strokeStyle = "#5a5a5e";
      g.lineCap = "round";
      for (const via of ciudad.vias) {
        g.lineWidth = via.nivel <= 1 ? 1.8 : via.nivel === 2 ? 1.3 : 0.8;
        g.beginPath();
        via.puntos.forEach((p, i) => {
          const qx = LADO / 2 + (ox + p[0]! - cx) * escala;
          const qy = LADO / 2 + (oz - p[1]! - cz) * escala;
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }
    };
    if (esc.ciudad) pintarCiudad(esc.ciudad, 0, 0);
    for (const o of this.otrasCiudades) pintarCiudad(o.ciudad, o.x, o.z);

    /*
     * ── El aeropuerto, solo de cerca ────────────────────────────────────
     *
     * Plataformas y calles de rodaje. En el alcance ancho no se dibujan porque
     * a esa escala el aeropuerto entero mide cuatro píxeles y lo único que
     * aportarían es suciedad; de cerca son justo lo que se mira, porque son por
     * donde se va.
     */
    const aeros = [
      ...(esc.aerodrome ? [esc.aerodrome] : []),
      ...this.otrosAerodromos,
    ];
    for (const aero of aeros) {
      if (lado > LADO_DE_LAS_CALLES) break;
      const aMapa = (px: number, py: number): readonly [number, number] => [
        LADO / 2 + (px - cx) * escala,
        // El fichero tiene la Y al norte; el mundo, el norte en la Z negativa.
        LADO / 2 + (-py - cz) * escala,
      ];

      g.fillStyle = "#3f4442";
      for (const plat of aero.aprons ?? []) {
        if (plat.polygon.length < 3) continue;
        g.beginPath();
        plat.polygon.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.closePath();
        g.fill();
      }

      g.strokeStyle = "#3f4442";
      g.lineCap = "round";
      g.lineJoin = "round";
      for (const calle of aero.taxiways ?? []) {
        if (calle.path.length < 2) continue;
        g.lineWidth = Math.max(2, (calle.widthM ?? 23) * escala);
        g.beginPath();
        calle.path.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }

      // El eje amarillo por encima, que es la marca que se sigue rodando.
      g.strokeStyle = "#c99b3a";
      for (const calle of aero.taxiways ?? []) {
        if (calle.path.length < 2) continue;
        g.lineWidth = Math.max(0.8, 1.6 * escala * 10);
        g.beginPath();
        calle.path.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }
    }

    // ── Los hitos del paisaje ───────────────────────────────────────────
    //
    // Antes que la pista y después del aeropuerto: son referencia del
    // terreno, y lo que se busca al abrir el plano sigue siendo la pista.
    this.pintarHitos(g, cx, cz, escala);

    // ── La pista, que es lo que hay que encontrar ───────────────────────
    //
    // Se dibuja la última y en blanco: cuando uno mira este mapa es porque no
    // sabe dónde está, y lo que busca casi siempre es por dónde se vuelve.
    const pintarPista = (pista: {
      x: number;
      z: number;
      heading: number;
      length: number;
    }): void => {
      const media = pista.length / 2;
      const a = puntoDePista(pista, media);
      const b = puntoDePista(pista, -media);
      g.strokeStyle = "#1d1b19";
      g.lineWidth = Math.max(5, 5 * escala * 4);
      g.lineCap = "butt";
      g.beginPath();
      g.moveTo(LADO / 2 + (a[0] - cx) * escala, LADO / 2 + (a[1] - cz) * escala);
      g.lineTo(LADO / 2 + (b[0] - cx) * escala, LADO / 2 + (b[1] - cz) * escala);
      g.stroke();
      g.strokeStyle = "#f4efe6";
      g.lineWidth = Math.max(2.6, 2.6 * escala * 4);
      g.stroke();
    };
    pintarPista(esc.runway);
    /*
     * **Y la del destino, que es la otra mitad del mapa.**
     *
     * Un plano con un solo sitio donde bajar no contesta la pregunta que se
     * hace quien está volando sobre el mar: «¿a cuál de esas dos islas puedo
     * ir?». Se pinta igual que la de casa —barra blanca con reborde oscuro—
     * porque es lo mismo: una pista.
     */
    for (const p of this.otrasPistas) pintarPista(p);

    // Y cada aeródromo con su rótulo, con reborde claro como los de los
    // hitos: sobre relieve un texto oscuro a secas no se lee.
    g.textBaseline = "middle";
    for (const c of this.campos) {
      const px = LADO / 2 + (c.x - cx) * escala;
      const py = LADO / 2 + (c.z - cz) * escala;
      if (px < -40 || px > LADO + 40 || py < -20 || py > LADO + 20) continue;
      const texto = c.oaci ? `${c.oaci} ${c.nombre}` : c.nombre;
      g.font = "700 12px system-ui, sans-serif";
      const ancho = g.measureText(texto).width;
      // Al lado que quepa, igual que los hitos.
      const aLaIzquierda = px + 12 + ancho > LADO - 2;
      g.textAlign = aLaIzquierda ? "right" : "left";
      const tx = aLaIzquierda ? px - 12 : px + 12;
      const ty = Math.max(10, Math.min(LADO - 10, py - 12));
      g.lineWidth = 3.2;
      g.strokeStyle = "#f4efe6";
      g.fillStyle = "#1d1b19";
      g.strokeText(texto, tx, ty);
      g.fillText(texto, tx, ty);
    }
  }

  /** Cumbres y pueblos: el dibujo siempre, el nombre si ya se oyó. */
  private pintarHitos(
    g: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    escala: number,
  ): void {
    if (this.hitos.length === 0) return;
    const dichos = this.dichos();
    /*
     * **Y se ven.** La primera versión dibujaba triángulos de cuatro píxeles
     * de lado y círculos de tres, y en el plano de verdad —que en pantalla
     * mide unos doscientos setenta, no los cuatrocientos sesenta del lienzo—
     * eso son dos píxeles: medido en una captura, no se distinguían del
     * relieve. La raya de la pista se dibuja con cinco de grueso por el mismo
     * motivo.
     */
    g.font = "600 11px system-ui, sans-serif";
    g.textAlign = "left";
    g.textBaseline = "middle";
    for (const hito of this.hitos) {
      // Las islas no llevan símbolo: la isla **es** la forma del relieve, y
      // un punto encima de una isla no dice nada que el mapa no diga ya.
      if (hito.clase === "isla") continue;
      const px = LADO / 2 + (hito.x - cx) * escala;
      const py = LADO / 2 + (hito.z - cz) * escala;
      if (px < -20 || px > LADO + 20 || py < -20 || py > LADO + 20) continue;
      /*
       * Con reborde claro, como los rótulos: un símbolo oscuro sobre monte
       * oscuro es un símbolo que no está.
       */
      g.lineWidth = 2;
      g.strokeStyle = "#f4efe6";
      g.fillStyle = "#1d1b19";
      g.beginPath();
      if (hito.clase === "montana") {
        // El triángulo de cota de las cartas de verdad.
        g.moveTo(px, py - 7);
        g.lineTo(px + 6, py + 4.5);
        g.lineTo(px - 6, py + 4.5);
        g.closePath();
      } else {
        g.arc(px, py, 4.5, 0, Math.PI * 2);
      }
      g.stroke();
      g.fill();
      if (!dichos.has(hito.nombre)) continue;
      /*
       * Y el nombre con su reborde claro, que sobre relieve verde y monte
       * marrón un texto oscuro a secas no se lee. Es lo mismo que hacen los
       * rótulos de una carta aeronáutica y por el mismo motivo.
       */
      g.lineWidth = 3;
      g.strokeStyle = "#f4efe6";
      /*
       * Y al lado que quepa. Medido en una captura: «Santa Cruz de Tenerife»
       * escrito siempre a la derecha se salía del lienzo y se leía «Sa».
       */
      const ancho = g.measureText(hito.nombre).width;
      const aLaIzquierda = px + 9 + ancho > LADO - 2;
      g.textAlign = aLaIzquierda ? "right" : "left";
      const tx = aLaIzquierda ? px - 9 : px + 9;
      g.strokeText(hito.nombre, tx, py);
      g.fillText(hito.nombre, tx, py);
    }
  }
}

/** Un color de los escenarios, `0xRRGGBB`, en sus tres canales. */
const rgbDe = (n: number): readonly [number, number, number] => [
  (n >> 16) & 255,
  (n >> 8) & 255,
  n & 255,
];

/** El color que le toca a una cota, con las mismas bandas que el terreno. */
function colorDeCota(esc: Scenario, h: number): number {
  let color = esc.fill;
  for (const banda of esc.bands) if (h >= banda.from) color = banda.colour;
  return color;
}
