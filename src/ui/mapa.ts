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
import type { Clase } from "../flight/tcas";
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
import { fondoPara, type FondoDelMapa } from "./fondo-del-mapa";
import { dondeCae } from "../world/entre-aerodromos";
import type { Hito } from "../world/hitos";
import { Panel } from "./panel";
import { cotaEscrita } from "./carta";
import { calcosDe, type Peldano } from "../flight/escalera";
import { MAR, PAPEL, RAMPA, REGIONES, SIMBOLOS, SOMBRA, TINTAS, CUBIERTA, LINEAS } from "./carta/estilo";
import { dibujarAerodromo, dibujarAvion, dibujarRosa, FondoHorneado } from "./carta/carta-en-vuelo";
import type { Caja, Raya } from "./carta/rotulos";
import {
  CUERPOS,
  pintarRotulo,
  rotularElPlano,
  unoMas,
  type CampoDelPlano,
  type Medir,
  type PuntoDelPlano,
  type RotuloPuesto,
} from "./carta/rotulos-del-plano";
import { anoDecimal, declinacion, varEscrita } from "./carta/declinacion";
import { frecuenciasDeLaCarta } from "../world/frecuencias-publicadas";
import {
  encuadreCon,
  escalones,
  hayQueRepintar,
  ladoDelVuelo,
  type Encuadre,
  type Punto,
} from "./encuadre-del-mapa";

/** Lado del lienzo, en píxeles. */
export const LADO = 460;

/** Un tráfico del TCAS, como lo pinta el plano. Ver `pintarElTrafico`. */
export interface TraficoEnElMapa {
  readonly x: number;
  readonly z: number;
  readonly clase: Clase;
}

/** Qué se pinta encima cuando dos caen juntos: lo que avisa, y la maniobra. */
const IMPORTA: Record<Clase, number> = { otro: 0, cerca: 1, aviso: 2, resolucion: 3 };

/**
 * **Dónde cae un punto del mundo en el plano**, con el norte arriba: el este
 * a la derecha y el norte —que en el mundo del juego es −Z— hacia arriba del
 * papel. `e` es el encuadre pintado: su centro y cuántos píxeles mide un
 * metro. Es la misma cuenta para la flecha, la ruta y los demás aviones.
 */
export function enElPapelDelMapa(
  p: { readonly x: number; readonly z: number },
  e: { readonly cx: number; readonly cz: number; readonly escala: number },
): readonly [number, number] {
  return [LADO / 2 + (p.x - e.cx) * e.escala, LADO / 2 + (p.z - e.cz) * e.escala];
}

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

/**
 * El color de «de aquí no hay dibujo», y el de sus rayas: el papel sin
 * levantar de una carta, un punto más oscuro que el papel.
 */
const SIN_DATOS = [226, 220, 204] as const;
const SIN_DATOS_RAYA = [206, 198, 180] as const;

/** Un color de la hoja, `#rrggbb`, en sus tres canales. */
const rgbHex = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const RAMPA_RGB = RAMPA.map((f) => ({ desde: f.desde, color: rgbHex(f.color) }));
const MAR_RGB = rgbHex(MAR[0]!.color);
const SOMBRA_RGB = rgbHex(SOMBRA.color);

export class Mapa {
  private caja: HTMLElement | null = null;
  private fondo: HTMLCanvasElement | null = null;
  private encima: HTMLCanvasElement | null = null;
  /**
   * **El lienzo de los rótulos**, entre el mundo y la flecha.
   *
   * Los rótulos iban pintados en el fondo, cada uno a la derecha de su punto,
   * y los nombres de la ruta en el de encima, cada fotograma: unos no sabían
   * de los otros y se pisaban. Ahora se colocan todos juntos, cada uno en su
   * hueco —ver `carta/rotulos-del-plano.ts`—, y van en su propio lienzo para
   * que el punto de la ruta al que se va pueda cambiar sin repintar el mundo:
   * el fondo sigue repintándose solo cuando se mueve el encuadre.
   *
   * Y a la resolución de la pantalla, no a la del lienzo de abajo: la letra
   * es lo que más se nota cuando sale borrosa.
   */
  private rotulos: HTMLCanvasElement | null = null;
  private observador: ResizeObserver | null = null;
  /**
   * **Lo que mide el plano en la pantalla**, en píxeles.
   *
   * El lienzo cuenta cuatrocientos sesenta de lado, pero se enseña a lo que
   * quepa: cuatrocientos cuarenta en una tablet y doscientos en un teléfono
   * tumbado. Lo que se dibujaba en las unidades del lienzo —la letra, los
   * símbolos de la hoja— salía allí a menos de la mitad: letra de seis
   * píxeles. Ahora la letra va con su medida, que es de pantalla —ver
   * `LETRAS` en `carta/estilo.ts`—; los símbolos, como dice `trazo`; y el
   * mapa se encoge debajo.
   */
  private enPantalla = LADO;
  /** Cuántas unidades del lienzo mide un píxel de la pantalla. */
  private get u(): number {
    return LADO / this.enPantalla;
  }

  /**
   * **Y los símbolos, a medio camino.** La letra va a su medida de pantalla
   * porque por debajo no se lee; un símbolo se reconoce más chico, y a su
   * medida entera tapaba lo que señala: en el teléfono tumbado el plano mide
   * ciento setenta píxeles, y el aeródromo de La Palma con sus dos montes
   * tapaba la isla entera. Así que crecen con la raíz de lo que encoge el
   * plano: en la tablet, lo mismo que la hoja; en el teléfono, la mitad de
   * lo que les faltaba, que es el doble de lo que medían.
   */
  private get trazo(): number {
    return Math.sqrt(this.u);
  }

  /**
   * Mide el plano en la pantalla. Dice si cambió.
   *
   * **Con su ancho de maqueta y el `zoom` del HUD**, no con su caja en la
   * pantalla: el panel entra creciendo —`concha-entra`—, y medido al abrirse
   * salía un par de píxeles chico; y en las pantallas bajas el HUD va con
   * `zoom`, que el ancho de maqueta no cuenta: en un teléfono de 360 de alto
   * el plano maqueta 265 y se ve a 159.
   */
  private medirse(): boolean {
    const f = this.fondo;
    if (!f) return false;
    let zoom = (f as HTMLElement & { currentCSSZoom?: number }).currentCSSZoom;
    if (zoom === undefined) {
      zoom = 1;
      for (let e: Element | null = f; e; e = e.parentElement) zoom *= Number(getComputedStyle(e).zoom) || 1;
    }
    const ancho = f.offsetWidth * zoom;
    if (ancho < 40) return false;
    const antes = this.enPantalla;
    this.enPantalla = ancho;
    return Math.abs(antes - ancho) > 0.5;
  }

  /** Los símbolos del fondo, en píxeles de pantalla: lo que un rótulo no pisa. */
  private fijosDelFondo: Caja[] = [];
  /** Los aeródromos pintados, con el radio de su símbolo en la pantalla. */
  private pistasPintadas: { x: number; z: number; radio: number }[] = [];
  /** Los grados de la retícula que se pueden escribir. Ver `pintarLaReticula`. */
  private gradosDelFondo: { texto: string; eje: "lat" | "lon"; en: number }[] = [];
  /** La rosa, en píxeles de pantalla, y su declinación escrita. */
  private rosaPuesta: { x: number; y: number; radio: number; texto: string } | null = null;
  /** Los rótulos puestos, en píxeles de pantalla. */
  private puestos: RotuloPuesto[] = [];
  /** Y los símbolos que no pisaron, para el banco. */
  private fijosPuestos: Caja[] = [];
  /** Con qué se rotuló: si cambia el punto activo o un hito nuevo, se rotula otra vez. */
  private rotuladoCon = "";
  /** El «T/D» de la ruta, que va aparte: se corre con la altura. Ver `update`. */
  private td: { donde: string; puesto: RotuloPuesto | null } = { donde: "", puesto: null };

  /**
   * **Lo que hay escrito en el plano**, en píxeles de pantalla: cada rótulo
   * con su caja y su letra, y los símbolos que no deben pisar. Para el banco,
   * que lo mide desde fuera. Ver `verificar-carteles.mjs`.
   */
  get rotulosPuestos(): {
    readonly lado: number;
    readonly rotulos: readonly { que: string; caja: Caja; cuerpo: number }[];
    readonly fijos: readonly Caja[];
  } {
    const todos = this.td.puesto ? [...this.puestos, this.td.puesto] : this.puestos;
    return {
      lado: this.enPantalla,
      rotulos: todos.map((r) => ({
        que: r.que,
        caja: r.caja,
        cuerpo: Math.min(...r.renglones.map((x) => x.cuerpo)),
      })),
      fijos: this.fijosPuestos,
    };
  }

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

  /** El plan de vuelo de ahora, si se va a otro campo. Ver `ponerRuta`. */
  private ruta: RutaEnElMapa | null = null;

  /**
   * **El peldaño, que decide los calcos de la carta**: el dibujo en todos, los
   * nombres desde Tukã, las cifras desde Taguato y la radio en Ruvicha. Ver
   * `calcosDe` en `flight/escalera.ts`.
   */
  private peldano: Peldano = "dibujo";

  ponerPeldano(peldano: Peldano): void {
    if (peldano === this.peldano) return;
    const antes = this.peldano === "dibujo";
    this.peldano = peldano;
    // El de los pequeños lleva otra imagen, con la sombra más fuerte.
    if (antes !== (peldano === "dibujo")) this.horneado = null;
    this.repintar();
  }

  /** El fondo horneado de la región, si el sitio cae en una. Ver `FondoHorneado`. */
  private horneado: FondoHorneado | null = null;

  private fondoHorneado(esc: Scenario): FondoHorneado | null {
    if (!esc.aerodrome) return null;
    this.horneado ??= new FondoHorneado(esc.aerodrome.origin, this.peldano === "dibujo", () => this.repintar());
    return this.horneado;
  }

  /**
   * El plan de vuelo, para pintarlo por sus puntos. Se llama cada fotograma
   * —cambia el punto activo— y no pinta el fondo: la ruta va en el lienzo de
   * encima, con la flecha.
   */
  ponerRuta(ruta: RutaEnElMapa | null): void {
    const otra = ruta?.fijos !== this.ruta?.fijos;
    this.ruta = ruta;
    // Un plan nuevo puede asomar por fuera del encuadre ancho. Ver `losCampos`.
    if (otra) this.repintar();
  }

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
          <canvas class="mapa__rotulos" data-hud="mapa-rotulos" width="${LADO}" height="${LADO}"></canvas>
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
    this.rotulos = raiz.querySelector('[data-hud="mapa-rotulos"]');
    this.encima = raiz.querySelector('[data-hud="mapa-encima"]');
    /*
     * **Y si el plano cambia de tamaño, se vuelve a medir y a rotular**:
     * girar la tablet, o la barra del navegador que entra y sale. La letra
     * mide lo que mide en la pantalla, así que en otro tamaño caben otras
     * cosas. Ver `medirse`.
     */
    this.observador?.disconnect();
    if (this.fondo && typeof ResizeObserver !== "undefined") {
      this.observador = new ResizeObserver(() => {
        if (this.abierto && this.medirse()) this.pintarFondo();
      });
      this.observador.observe(this.fondo);
    }
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
    if (escenario.aerodrome?.origin !== this.escenario?.aerodrome?.origin) this.horneado = null;
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
    // Ya en la página: lo que mide de verdad, que la letra va en esa medida.
    this.medirse();
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
    /** Los otros aviones que pinta el TCAS. Ver `pintarElTrafico`. */
    trafico: readonly TraficoEnElMapa[] = [],
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
    /*
     * **Y los rótulos, cuando cambia lo que se rotula sin moverse el
     * encuadre**: el punto de la ruta al que se va, o un hito que la
     * comandante acaba de nombrar. Solo los rótulos: el mundo no ha cambiado.
     */
    else if (this.encuadrePintado && this.claveDeLosRotulos() !== this.rotuladoCon) this.colocarRotulos();
    const g = this.encima.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, LADO, LADO);
    // Los símbolos de la hoja, en su medida: ver `trazo`.
    const u = this.trazo;

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
     * **La ruta, de casa al destino.** Azul, que es el color de ruta de todo
     * el juego, y debajo de todo lo demás: es el plan, no dónde se está. Con
     * ella se ve de un vistazo si uno va por donde tocaba o se ha desviado,
     * que es media lección de navegar.
     *
     * **Y por sus puntos, con sus giros**, que es lo que se pidió: «el mapa
     * pone una línea recta, pero para tomar la pista recto y estable tengo
     * que abrirme, para eso existen los planes de vuelo». Ver `flight/ruta.ts`.
     * Sin plan —un campo sin procedimientos— queda la recta de antes.
     */
    if (esRuta && this.ruta) this.pintarLaRuta(g, this.ruta, puesto);
    else if (esRuta && this.destino && this.escenario) {
      const casa = this.escenario.runway;
      const a = this.enElPapel(casa, puesto);
      const b = this.enElPapel(this.destino, puesto);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 12 * u) {
        g.save();
        g.lineCap = "round";
        g.setLineDash([2 * u, 6 * u]);
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        // El magenta de la carta, sobre su orla de papel.
        g.strokeStyle = PAPEL.fondo;
        g.lineWidth = (LINEAS.ruta + 2 * LINEAS.rutaOrla) * u;
        g.stroke();
        g.strokeStyle = TINTAS.ruta;
        g.lineWidth = LINEAS.ruta * u;
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
    const margen = 14 * u;
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
      g.setLineDash([4 * u, 5 * u]);
      g.strokeStyle = TINTAS.tinta;
      g.lineWidth = 2 * u;
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
        g.strokeStyle = TINTAS.aero;
        g.lineWidth = 2.2 * u;
        g.setLineDash([3 * u, 3 * u]);
        g.beginPath();
        g.arc(ax, az, 9 * u, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    }
    if (this.destino) {
      const dx = LADO / 2 + (this.destino.x - puesto.cx) * escala;
      const dz = LADO / 2 + (this.destino.z - puesto.cz) * escala;
      /*
       * Con plan, la raya va **al punto siguiente**, que es a donde señala la
       * flecha del cuadro: dos rayas que dicen dos cosas distintas enseñan a
       * no creerse ninguna.
       */
      const siguiente = esRuta ? this.ruta?.fijos[this.ruta.activo] : undefined;
      const [rx, rz] = siguiente
        ? this.enElPapel(siguiente, puesto)
        : [dx, dz];
      g.save();
      g.strokeStyle = TINTAS.rutaTexto;
      g.lineWidth = 2.2 * u;
      g.setLineDash([7 * u, 5 * u]);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(rx, rz);
      g.stroke();
      g.setLineDash([]);
      // Y el sitio, con un aro. Si cae fuera del recuadro no se dibuja: ya lo
      // dice la raya, que sale por ese lado.
      if (dx > 0 && dx < LADO && dz > 0 && dz < LADO) {
        g.beginPath();
        g.arc(dx, dz, 6.5 * u, 0, Math.PI * 2);
        g.lineWidth = 2.6 * u;
        g.stroke();
      }
      g.restore();
    }

    // Los demás, debajo de la flecha: lo primero que se mira es dónde estoy.
    if (trafico.length) this.pintarElTrafico(g, trafico, puesto);

    if (fuera) {
      // El aro dice «estás fuera, esto es por dónde».
      g.save();
      g.beginPath();
      g.arc(cx, cy, 15 * u, 0, Math.PI * 2);
      g.strokeStyle = TINTAS.tinta;
      g.lineWidth = 2.4 * u;
      g.stroke();
      g.restore();
    }
    /*
     * **El avión en planta de la hoja**, con su halo de papel: el morro a su
     * rumbo, que con el norte arriba es el mismo cero que el del plano.
     */
    dibujarAvion(g, cx, cy, rumboRad, SIMBOLOS.avion * u);
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
    /*
     * **Y los puntos del plan**: el inicio de una aproximación puede caer a
     * veinticinco millas del aeropuerto, por el otro lado, y un plano que lo
     * deja fuera enseña una ruta que se sale del papel justo donde gira.
     */
    const plan = (this.ruta?.fijos ?? []).map((f) => ({ x: f.x, z: f.z }));
    return [{ x: casa.x, z: casa.z }, ...this.otrasPistas, ...plan];
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
    return enElPapelDelMapa(p, e);
  }

  /**
   * **Los otros aviones, los mismos que pinta la carta**, con sus mismos
   * símbolos: rombo hueco, rombo lleno el cercano, círculo ámbar el que
   * avisa y cuadrado rojo el de la maniobra. Ver `flight/tcas.ts`.
   *
   * La lista es la del TCAS y no la del mundo, por lo mismo que en la carta:
   * lo que se enseña de los demás es lo que el avión sabe de ellos, y un
   * avión sin TCAS no los sabe. Así el plano, la pantalla de navegación y la
   * ventanilla enseñan **los mismos aviones** —«es como si cada cosa fuera
   * por su lado», se dijo jugando—. Con el norte arriba, como todo el plano:
   * el que en la carta va a las dos, aquí va donde está.
   */
  private pintarElTrafico(
    g: CanvasRenderingContext2D,
    trafico: readonly TraficoEnElMapa[],
    e: { readonly cx: number; readonly cz: number; readonly escala: number },
  ): void {
    // Del que menos importa al que más, para que el que avisa quede encima.
    const orden = [...trafico].sort(
      (a, b) => IMPORTA[a.clase] - IMPORTA[b.clase],
    );
    const u = this.trazo;
    g.save();
    for (const o of orden) {
      const [x, y] = enElPapelDelMapa(o, e);
      if (x < 0 || x > LADO || y < 0 || y > LADO) continue;
      g.lineWidth = 3.4 * u;
      g.strokeStyle = "rgba(20, 28, 34, 0.85)";
      // El de la maniobra, el cuadrado rojo de la carta. Ver `flight/tcas.ts`.
      if (o.clase === "resolucion") {
        g.beginPath();
        g.rect(x - 5.5 * u, y - 5.5 * u, 11 * u, 11 * u);
        g.stroke();
        g.fillStyle = "#ff3b30";
        g.fill();
        continue;
      }
      if (o.clase === "aviso") {
        g.beginPath();
        g.arc(x, y, 6 * u, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "#f2a33a";
        g.fill();
        continue;
      }
      const lado = 6.5 * u;
      g.beginPath();
      g.moveTo(x, y - lado);
      g.lineTo(x + lado, y);
      g.lineTo(x, y + lado);
      g.lineTo(x - lado, y);
      g.closePath();
      g.stroke();
      if (o.clase === "cerca") {
        g.fillStyle = "#5fd3f0";
        g.fill();
      }
      g.lineWidth = 1.8 * u;
      g.strokeStyle = "#5fd3f0";
      g.stroke();
    }
    g.restore();
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
    // Lo que se apunta mientras se pinta, para rotular después.
    this.fijosDelFondo = [];
    this.pistasPintadas = [];
    this.gradosDelFondo = [];
    this.rosaPuesta = null;

    /*
     * ── La carta ────────────────────────────────────────────────────────
     *
     * **El papel y, encima, la carta horneada de la región**: el relieve con
     * sus tintas, la cubierta del suelo y el mar con sus veriles, lo mismo
     * que en el hangar. Era la paleta del terreno del juego, para que el plano
     * y la ventanilla fueran el mismo sitio; ahora es la de la carta, que es
     * la que se va a encontrar quien vuele de verdad, y el mismo sitio lo
     * siguen diciendo la costa, el relieve y los aeródromos.
     */
    g.fillStyle = PAPEL.fondo;
    g.fillRect(0, 0, LADO, LADO);
    const puesto = { cx, cz, escala };
    const horneado = this.fondoHorneado(esc);
    const conImagen = horneado?.pintar(g, LADO, puesto) ?? false;
    /*
     * **Y debajo o encima, la costa y los ríos**, para que el plano no se
     * acabe donde se acaba el relieve cargado. Ver `fondo-del-mapa.ts`. Sin
     * imagen todavía —se está bajando—, la costa rellena hace de carta.
     */
    const fondo = esc.aerodrome ? fondoPara(esc.pais, esc.aerodrome.origin) : null;
    if (fondo && !conImagen) this.pintarLaCosta(g, fondo, cx, cz, escala, true);

    /*
     * ── El relieve fino ─────────────────────────────────────────────────
     *
     * Cuando el encuadre es tan pequeño que un píxel de la carta horneada ya
     * mide más que una muestra del terreno cargado, se le vuelve a preguntar
     * al terreno: acercarse no es ampliar la imagen, es mirar con más detalle.
     * Con la rampa de la carta en peldaños y el sombreado del noroeste, y un
     * poco transparente para que la cubierta del suelo siga asomando.
     */
    const fino = !conImagen || paso < (horneado?.metrosPorPixel ?? Infinity);
    if (fino) {
      this.relieve ??= Object.assign(document.createElement("canvas"), {
        width: MUESTRAS,
        height: MUESTRAS,
      });
      const r = this.relieve.getContext("2d");
      if (!r) return;
      const img = r.createImageData(MUESTRAS, MUESTRAS);
      const cotas = new Float32Array(MUESTRAS * MUESTRAS);
      const sabe = new Uint8Array(MUESTRAS * MUESTRAS);
      for (let fila = 0; fila < MUESTRAS; fila++) {
        for (let col = 0; col < MUESTRAS; col++) {
          const x = cx - lado / 2 + (col + 0.5) * paso;
          const z = cz - lado / 2 + (fila + 0.5) * paso;
          /*
           * **Donde no se sabe, se dice que no se sabe.** Fuera del mundo se
           * pintaba mar, y tierra adentro eso miente: volando de Pettirossi a
           * Encarnación, el plano ancho enseñaba un océano al sur de
           * Asunción. Donde no contesta ningún mapa queda la carta horneada
           * o, sin ella, el papel a rayas de la zona sin levantar.
           */
          const h = cota(x, z);
          const i = fila * MUESTRAS + col;
          if (h !== null) {
            cotas[i] = h;
            sabe[i] = 1;
          }
        }
      }
      const region = horneado?.region ? REGIONES[horneado.region] : null;
      const exageracion = region?.exageracion ?? 1.5;
      const fuerza = this.peldano === "dibujo" ? SOMBRA.fuerzaPequenos : SOMBRA.fuerza;
      const zen = ((90 - SOMBRA.altura) * Math.PI) / 180;
      const az = (SOMBRA.azimut * Math.PI) / 180;
      const en = (c: number, f: number): number => {
        const k = Math.max(0, Math.min(MUESTRAS - 1, f)) * MUESTRAS + Math.max(0, Math.min(MUESTRAS - 1, c));
        return sabe[k] ? cotas[k]! : NaN;
      };
      for (let fila = 0; fila < MUESTRAS; fila++) {
        for (let col = 0; col < MUESTRAS; col++) {
          const i = fila * MUESTRAS + col;
          const o = i * 4;
          if (!sabe[i]) {
            const c = (col + fila) % 6 < 2 ? SIN_DATOS_RAYA : SIN_DATOS;
            img.data[o] = c[0];
            img.data[o + 1] = c[1];
            img.data[o + 2] = c[2];
            img.data[o + 3] = fondo || conImagen ? 0 : 255;
            continue;
          }
          const h = cotas[i]!;
          if (esAguaDeCasa(h, esc.waterLevel)) {
            img.data[o] = MAR_RGB[0];
            img.data[o + 1] = MAR_RGB[1];
            img.data[o + 2] = MAR_RGB[2];
            img.data[o + 3] = 255;
            continue;
          }
          let banda = RAMPA_RGB[0]!.color;
          for (const b of RAMPA_RGB) if (h >= b.desde) banda = b.color;
          // El sombreado de la hoja: solo oscurece la ladera de sombra.
          const este = en(col + 1, fila) - en(col - 1, fila);
          const sur = en(col, fila + 1) - en(col, fila - 1);
          let oscuro = 0;
          if (Number.isFinite(este) && Number.isFinite(sur)) {
            const sx = (este / (2 * paso)) * exageracion;
            const sy = (sur / (2 * paso)) * exageracion;
            const pendiente = Math.atan(Math.hypot(sx, sy));
            const aspecto = Math.atan2(sy, -sx);
            const luz =
              Math.cos(zen) * Math.cos(pendiente) +
              Math.sin(zen) * Math.sin(pendiente) * Math.cos(Math.PI * 2.5 - az - aspecto);
            oscuro = Math.max(0, Math.min(1, 1 - luz / Math.cos(zen))) * fuerza;
          }
          img.data[o] = banda[0] * (1 - oscuro) + SOMBRA_RGB[0] * oscuro * 0.35;
          img.data[o + 1] = banda[1] * (1 - oscuro) + SOMBRA_RGB[1] * oscuro * 0.35;
          img.data[o + 2] = banda[2] * (1 - oscuro) + SOMBRA_RGB[2] * oscuro * 0.35;
          img.data[o + 3] = 255;
        }
      }
      r.putImageData(img, 0, 0);
      // A cuadros, como estaba: el relieve es una rejilla de muestras, y
      // suavizarlo inventaría cotas entre medias.
      g.save();
      g.imageSmoothingEnabled = false;
      g.globalAlpha = conImagen ? 0.82 : 1;
      g.drawImage(this.relieve, 0, 0, LADO, LADO);
      g.restore();
    }
    // La costa trazada, los ríos y la frontera, encima de todo el relieve.
    if (fondo) this.pintarLaCosta(g, fondo, cx, cz, escala, false);
    this.pintarLaReticula(g, esc, puesto);

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
          // El amarillo de las ciudades de la carta, más denso donde más hay.
          g.globalAlpha = 0.25 + d * 0.5;
          g.fillStyle = c === 3 ? "#d9b13a" : c === 2 ? "#e3c45a" : CUBIERTA.ciudad.color;
          g.fillRect(qx, qy, cp + 1, cp + 1);
        }
      }
      g.globalAlpha = 1;

      // ── Las carreteras ────────────────────────────────────────────────
      g.strokeStyle = "#8a6d4a";
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

      g.fillStyle = "#8f8a80";
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

      g.strokeStyle = "#8f8a80";
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
    const calcos = calcosDe(this.peldano);
    // Los símbolos en su medida —ver `trazo`—, y lo que miden en la pantalla.
    const u = this.trazo;
    const k = 1 / this.u;
    const tamano = (this.peldano === "dibujo" ? SIMBOLOS.aerodromoPequenos : SIMBOLOS.aerodromo) * u;
    const tamanoCss = tamano * k;
    /*
     * **De lejos, el aeródromo de la hoja; de cerca, la pista a escala**, que
     * es lo que hay que encontrar al volver. El símbolo, civil si el AIP le
     * publica torre y pequeño si no, con la pista girada a su rumbo.
     */
    const pintarPista = (pista: {
      x: number;
      z: number;
      heading: number;
      length: number;
    }, oaci: string | null): void => {
      const media = pista.length / 2;
      const a = puntoDePista(pista, media);
      const b = puntoDePista(pista, -media);
      const largo = pista.length * escala;
      const px = LADO / 2 + (pista.x - cx) * escala;
      const py = LADO / 2 + (pista.z - cz) * escala;
      if (largo < tamano * 1.6) {
        const civil = frecuenciasDeLaCarta(oaci)?.torre?.servicio === "TWR";
        dibujarAerodromo(g, px, py, civil, (pista.heading * Math.PI) / 180, tamano);
        this.fijosDelFondo.push({ cx: px * k, cy: py * k, w: tamanoCss + 2, h: tamanoCss + 2 });
        this.pistasPintadas.push({ x: pista.x, z: pista.z, radio: tamanoCss / 2 + 1 });
        return;
      }
      const ax = LADO / 2 + (a[0] - cx) * escala;
      const ay = LADO / 2 + (a[1] - cz) * escala;
      const bx = LADO / 2 + (b[0] - cx) * escala;
      const by = LADO / 2 + (b[1] - cz) * escala;
      const ancho = Math.max(7, 5 * escala * 4) + 3;
      g.save();
      g.lineCap = "butt";
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.strokeStyle = PAPEL.fondo;
      g.lineWidth = ancho;
      g.stroke();
      g.strokeStyle = TINTAS.aerodromo;
      g.lineWidth = ancho - 3;
      g.stroke();
      // El eje blanco a trazos, como en la carta de aeródromo.
      g.strokeStyle = "#fff";
      g.lineWidth = Math.max(1.2, escala * 1.5);
      g.setLineDash([6, 5]);
      g.stroke();
      g.restore();
      // La pista entera, girada a su rumbo: un rótulo no tapa lo que se busca.
      this.fijosDelFondo.push({
        cx: px * k,
        cy: py * k,
        w: largo * k,
        h: ancho * k,
        giro: Math.atan2(by - ay, bx - ax),
      });
      this.pistasPintadas.push({ x: pista.x, z: pista.z, radio: 8 });
    };
    /** El indicativo del campo más cerca de una pista, para su símbolo. */
    const oaciDe = (p: { x: number; z: number }): string | null => {
      let mejor: string | null = null;
      let cerca = 6000;
      for (const c of this.campos) {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < cerca) {
          cerca = d;
          mejor = c.oaci;
        }
      }
      return mejor;
    };
    pintarPista(esc.runway, esc.aerodrome?.id ?? null);
    /*
     * **Y la del destino, que es la otra mitad del mapa.**
     *
     * Un plano con un solo sitio donde bajar no contesta la pregunta que se
     * hace quien está volando sobre el mar: «¿a cuál de esas dos islas puedo
     * ir?». Se pinta igual que la de casa porque es lo mismo: una pista.
     */
    for (const p of this.otrasPistas) pintarPista(p, oaciDe(p));

    /*
     * ── La rosa, en su esquina ──────────────────────────────────────────
     *
     * Abajo a la izquierda, que es donde menos estorba a la flecha. Con la
     * radio, el norte magnético girado a la declinación de hoy en el sitio, y
     * su cifra debajo, que se rotula con los demás.
     */
    if (esc.aerodrome) {
      const ano = anoDecimal(new Date());
      const d = declinacion(esc.aerodrome.origin.lat, esc.aerodrome.origin.lon, ano);
      const radio = 15 * u * k;
      const x = radio + 8;
      const y = this.enPantalla - radio - (calcos.radio ? 22 : 10);
      dibujarRosa(g, x / k, y / k, radio / k, calcos.radio ? d : null);
      this.fijosDelFondo.push({ cx: x, cy: y - 2, w: 2 * radio + 4, h: 2 * radio + 10 });
      this.rosaPuesta = { x, y, radio, texto: calcos.radio ? varEscrita(d) : "" };
    }

    // Y ahora, con todo lo que no se mueve apuntado, los rótulos.
    this.colocarRotulos();
  }

  /**
   * **Coloca y pinta los rótulos del plano**, en su lienzo: los aeródromos,
   * los puntos de la ruta, la cota del umbral, los hitos ya nombrados, la
   * declinación y los grados de la retícula, cada uno en su hueco. Se llama al
   * repintar el fondo y cuando cambia lo que se rotula sin moverse el
   * encuadre: el punto de la ruta al que se va, o un hito que se acaba de
   * nombrar. Ver `carta/rotulos-del-plano.ts`.
   */
  private colocarRotulos(): void {
    const lienzo = this.rotulos;
    const hecho = this.encuadrePintado;
    if (!lienzo || !hecho) return;
    const g = lienzo.getContext("2d");
    if (!g) return;
    const S = this.enPantalla;
    /*
     * A la resolución de la pantalla, y no más del doble: un teléfono de tres
     * píxeles por punto pagaría nueve veces el lienzo por una letra que a
     * dos ya se ve nítida.
     */
    const resolucion = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    const lado = Math.round(S * resolucion);
    if (lienzo.width !== lado) {
      lienzo.width = lado;
      lienzo.height = lado;
    }
    g.setTransform(lado / S, 0, 0, lado / S, 0, 0);
    g.clearRect(0, 0, S, S);
    const medir: Medir = (texto, letra) => {
      g.font = letra;
      return g.measureText(texto).width;
    };
    const escala = LADO / hecho.lado;
    const k = 1 / this.u;
    const enPantalla = (p: { readonly x: number; readonly z: number }): [number, number] => [
      (LADO / 2 + (p.x - hecho.cx) * escala) * k,
      (LADO / 2 + (p.z - hecho.cz) * escala) * k,
    ];

    // ── Los aeródromos, con el radio de su símbolo y su papel en el vuelo
    const casa = this.escenario?.runway ?? null;
    const llegada = this.ruta?.fijos.find((f) => f.papel === "umbral") ?? this.destino;
    const masCerca = (p: { x: number; z: number } | null | undefined) => {
      if (!p) return null;
      let mejor: (typeof this.campos)[number] | null = null;
      let cerca = 6000;
      for (const c of this.campos) {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < cerca) {
          cerca = d;
          mejor = c;
        }
      }
      return mejor;
    };
    const deCasa = masCerca(casa);
    const delDestino = masCerca(llegada);
    const campos: CampoDelPlano[] = this.campos.map((c) => {
      const [x, y] = enPantalla(c);
      let simbolo = 9;
      let cerca = 6000;
      for (const p of this.pistasPintadas) {
        const d = Math.hypot(p.x - c.x, p.z - c.z);
        if (d < cerca) {
          cerca = d;
          simbolo = p.radio;
        }
      }
      const torre = frecuenciasDeLaCarta(c.oaci)?.torre;
      return {
        x,
        y,
        nombre: c.nombre,
        oaci: c.oaci,
        radio: torre ? `${torre.servicio} ${torre.f.cifra}${torre.f.canal833 ? " C" : ""}` : null,
        simbolo,
        papel: c === deCasa ? "casa" : c === delDestino ? "destino" : "otro",
      };
    });

    // ── La ruta: sus puntos, sus rayas y la cota del umbral
    const ruta = this.ruta;
    const fijos: Caja[] = [...this.fijosDelFondo];
    const rayas: Raya[] = [];
    const puntos: PuntoDelPlano[] = [];
    let umbral: { x: number; y: number; nombre: string; cota: string } | null = null;
    if (ruta) {
      const pts = ruta.fijos.map(enPantalla);
      for (let i = 1; i < pts.length; i++) rayas.push({ a: pts[i - 1]!, b: pts[i]! });
      /*
       * **Y el nombre, cuando cabe.** En el plano ancho —cientos de
       * kilómetros— los cinco puntos de una aproximación caen en un palmo:
       * solo va el del punto al que se va. Acercando la lupa salen todos.
       */
      const millaEnPantalla = 1852 * escala * k;
      ruta.fijos.forEach((f, i) => {
        if (f.papel === "despegue" || f.papel === "umbral" || f.papel === "aqui") return;
        const [x, y] = pts[i]!;
        const activo = i === ruta.activo;
        const r = (activo ? ESTRELLA_ACTIVA : ESTRELLA) * this.trazo * k;
        fijos.push({ cx: x, cy: y, w: 2 * r + 2, h: 2 * r + 2 });
        if (ruta.conNombres && (activo || millaEnPantalla >= 4))
          puntos.push({ x, y, nombre: f.nombre, activo, simbolo: r });
      });
      const i = ruta.fijos.findIndex((f) => f.papel === "umbral");
      if (ruta.conNombres && i >= 0 && ruta.cotaDelUmbral != null) {
        const [x, y] = pts[i]!;
        umbral = { x, y, nombre: ruta.fijos[i]!.nombre, cota: cotaEscrita(ruta.cotaDelUmbral) };
      }
    }

    // ── Los hitos: el dibujo siempre, el nombre si ya se oyó
    const dichos = this.dichos();
    const hitos = this.hitos
      .filter((h) => h.clase !== "isla" && dichos.has(h.nombre))
      .map((h) => {
        const [x, y] = enPantalla(h);
        return { x, y, nombre: h.nombre };
      });

    /*
     * **Y el avión, donde está al rotular**: en tierra está encima de casa, y
     * el nombre de casa se escribía debajo de la flecha. Luego se mueve, y
     * para eso va la flecha encima de todo.
     */
    const [ax, ay] = enPantalla({ x: this.avionX, z: this.avionZ });
    const avion = SIMBOLOS.avion * this.trazo * k;
    fijos.push({ cx: ax, cy: ay, w: avion, h: avion });
    // Y los aros del destino y del alternativo, que van encima cada fotograma.
    for (const p of [this.destino, this.alterno]) {
      if (!p) continue;
      const [x, y] = enPantalla(p);
      const r = 9 * this.trazo * k + 1;
      fijos.push({ cx: x, cy: y, w: 2 * r, h: 2 * r });
    }

    const { puestos } = rotularElPlano(
      {
        lado: S,
        peldano: this.peldano,
        campos,
        puntos,
        umbral,
        hitos,
        rosa: this.rosaPuesta,
        grados: this.gradosDelFondo,
        fijos,
        rayas,
      },
      medir,
    );
    for (const r of puestos) pintarRotulo(g, r, PAPEL.fondo);
    this.puestos = puestos;
    this.fijosPuestos = fijos;
    this.rotuladoCon = this.claveDeLosRotulos();
    this.td = { donde: "", puesto: null };
  }

  /** Lo que, si cambia sin moverse el encuadre, pide rotular otra vez. */
  private claveDeLosRotulos(): string {
    return `${this.ruta?.activo ?? -1}|${this.ruta?.conNombres ?? ""}|${this.dichos().size}`;
  }

  /**
   * **La retícula de la carta**, cada treinta minutos de arco, en sus
   * meridianos y paralelos de verdad; y con sus grados desde el calco de las
   * cifras. Con la proyección del mundo, así que cae donde caen las cosas.
   */
  private pintarLaReticula(
    g: CanvasRenderingContext2D,
    esc: Scenario,
    e: { readonly cx: number; readonly cz: number; readonly escala: number },
  ): void {
    const o = esc.aerodrome?.origin;
    if (!o) return;
    const lado = LADO / e.escala;
    // Lo que se ve, en grados, con margen.
    const dLat = ((lado / 6371008) * 180) / Math.PI;
    const dLon = dLat / Math.cos((o.lat * Math.PI) / 180);
    const z0 = e.cz;
    const x0 = e.cx;
    const latCentro = o.lat - (((z0 / 6371008) * 180) / Math.PI);
    const lonCentro = o.lon + (((x0 / 6371008) * 180) / Math.PI) / Math.cos((o.lat * Math.PI) / 180);
    if (dLat > 12) return;
    const conCifras = calcosDe(this.peldano).cifras;
    const enPapel = (lat: number, lon: number): readonly [number, number] => {
      const p = dondeCaeEnElMundo(o, lat, lon);
      return [LADO / 2 + (p.x - e.cx) * e.escala, LADO / 2 + (p.z - e.cz) * e.escala];
    };
    // Los grados se apuntan y se escriben con los rótulos, si caben.
    const k = 1 / this.u;
    g.save();
    g.strokeStyle = PAPEL.reticula;
    g.lineWidth = LINEAS.reticula;
    for (let lat = Math.floor((latCentro - dLat) * 2) / 2; lat <= latCentro + dLat; lat += 0.5) {
      const [a0, a1] = enPapel(lat, lonCentro - dLon);
      const [b0, b1] = enPapel(lat, lonCentro + dLon);
      g.beginPath();
      g.moveTo(a0, a1);
      g.lineTo(b0, b1);
      g.stroke();
      if (conCifras && a1 > 0 && a1 < LADO) {
        const g0 = Math.floor(Math.abs(lat));
        const m = Math.round((Math.abs(lat) - g0) * 60);
        this.gradosDelFondo.push({ texto: `${g0}°${m ? `${m}′` : ""}${lat >= 0 ? "N" : "S"}`, eje: "lat", en: a1 * k });
      }
    }
    for (let lon = Math.floor((lonCentro - dLon) * 2) / 2; lon <= lonCentro + dLon; lon += 0.5) {
      const [a0, a1] = enPapel(latCentro + dLat, lon);
      const [b0, b1] = enPapel(latCentro - dLat, lon);
      g.beginPath();
      g.moveTo(a0, a1);
      g.lineTo(b0, b1);
      g.stroke();
      if (conCifras) {
        const xTop = a0 + ((b0 - a0) * (0 - a1)) / (b1 - a1 || 1);
        if (xTop > 0 && xTop < LADO) {
          const g0 = Math.floor(Math.abs(lon));
          const m = Math.round((Math.abs(lon) - g0) * 60);
          this.gradosDelFondo.push({ texto: `${g0}°${m ? `${m}′` : ""}${lon >= 0 ? "E" : "W"}`, eje: "lon", en: xTop * k });
        }
      }
    }
    g.restore();
  }

  /**
   * El plan, tramo a tramo: lo volado, tenue; lo que queda, entero; cada
   * punto con su estrella de cuatro puntas —el símbolo de punto de paso de
   * las cartas— y su nombre en los peldaños que leen; y el punto de descenso,
   * el círculo con «T/D» de cualquier pantalla de navegación.
   */
  private pintarLaRuta(
    g: CanvasRenderingContext2D,
    ruta: RutaEnElMapa,
    puesto: { readonly cx: number; readonly cz: number; readonly escala: number },
  ): void {
    const pts = ruta.fijos.map((f) => this.enElPapel(f, puesto));
    if (pts.length < 2) return;
    // Los símbolos de la hoja en su medida —ver `trazo`—; la letra, en la de la pantalla.
    const u = this.trazo;
    g.save();
    g.lineCap = "round";
    g.lineJoin = "round";
    // Lo volado: fino y a trazos, hasta el punto de donde se viene.
    const desde = Math.max(0, ruta.activo - 1);
    g.strokeStyle = TINTAS.ruta;
    g.globalAlpha = 0.55;
    g.lineWidth = 2 * u;
    g.setLineDash([2 * u, 6 * u]);
    g.beginPath();
    for (let i = 0; i <= desde && i < pts.length; i++) {
      const [x, y] = pts[i]!;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
    // Lo que queda, con el tramo que se está volando: entero. Empieza en el
    // punto de donde se viene, como en la carta, para que se vea si uno va
    // por el tramo o se ha ido a un lado. Magenta sobre su orla de papel.
    g.setLineDash([]);
    g.strokeStyle = PAPEL.fondo;
    g.lineWidth = (LINEAS.ruta + 2 * LINEAS.rutaOrla) * u;
    g.beginPath();
    for (let i = desde; i < pts.length; i++) {
      const [x, y] = pts[i]!;
      if (i === desde) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = TINTAS.ruta;
    g.lineWidth = LINEAS.ruta * u;
    g.stroke();
    /*
     * Los puntos, del primero al último. La cabecera de salida y el umbral
     * ya los dibuja la pista. Sus nombres y la cota del umbral van en el
     * lienzo de los rótulos, colocados con los demás: ver `colocarRotulos`.
     */
    ruta.fijos.forEach((f, i) => {
      if (f.papel === "despegue" || f.papel === "umbral" || f.papel === "aqui") return;
      const [x, y] = pts[i]!;
      if (x < -20 || x > LADO + 20 || y < -20 || y > LADO + 20) return;
      const activo = i === ruta.activo;
      estrella(g, x, y, (activo ? ESTRELLA_ACTIVA : ESTRELLA) * u);
      g.fillStyle = activo ? TINTAS.ruta : i < ruta.activo ? "#b9c3cc" : PAPEL.fondo;
      g.strokeStyle = TINTAS.aero;
      g.lineWidth = 1.4 * u;
      g.fill();
      g.stroke();
    });
    let conTd = false;
    if (ruta.descenso) {
      const [x, y] = this.enElPapel(ruta.descenso, puesto);
      if (x > 0 && x < LADO && y > 0 && y < LADO) {
        /*
         * Un círculo sobre la ruta con una rampa que baja: dónde se empieza a
         * bajar se entiende sin leer, y «T/D» —*top of descent*— es como lo
         * rotula cualquier pantalla de navegación, sin traducir.
         */
        g.fillStyle = PAPEL.fondo;
        g.strokeStyle = TINTAS.rutaTexto;
        g.lineWidth = 2.4 * u;
        g.beginPath();
        g.arc(x, y, 6.5 * u, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(x - 3.5 * u, y - 2.5 * u);
        g.lineTo(x - 0.5 * u, y - 2.5 * u);
        g.lineTo(x + 3.5 * u, y + 2.5 * u);
        g.stroke();
        /*
         * **Y su rótulo, en el primer hueco que dejen los demás.** El punto
         * se corre con la altura, así que no entra en la colocación de los
         * rótulos —habría que rehacerla cada fotograma—: se busca su sitio
         * contra lo ya puesto, y solo cuando se ha movido un píxel.
         */
        // Con las cifras, como los nombres de la ruta: ver `rotularElPlano`.
        if (ruta.conNombres && calcosDe(this.peldano).cifras) {
          conTd = true;
          const k = 1 / this.u;
          const donde = `${Math.round(x * k)},${Math.round(y * k)}`;
          if (donde !== this.td.donde) {
            const ocupado = [
              ...this.fijosPuestos,
              ...this.puestos.map((r) => r.caja),
              { cx: x * k, cy: y * k, w: 13 * u * k + 3, h: 13 * u * k + 3 },
            ];
            this.td = {
              donde,
              puesto: unoMas(
                this.enPantalla,
                ocupado,
                [{ texto: "T/D", color: TINTAS.rutaTexto, cifras: true, cuerpo: CUERPOS.td }],
                x * k,
                y * k,
                6.5 * u * k + 2,
                (texto, letra) => {
                  g.font = letra;
                  return g.measureText(texto).width;
                },
              ),
            };
          }
          if (this.td.puesto) {
            // El lienzo de encima cuenta en sus unidades: se pinta a escala.
            g.save();
            g.scale(this.u, this.u);
            pintarRotulo(g, this.td.puesto, PAPEL.fondo);
            g.restore();
          }
        }
      }
    }
    // Sin «T/D» en el plano, no se queda uno viejo apuntado.
    if (!conTd) this.td = { donde: "", puesto: null };
    g.restore();
  }

  /**
   * El dibujo plano de fuera del relieve: el mar o la tierra de alrededor, las
   * islas o el país, su frontera y sus ríos. Ver `fondo-del-mapa.ts`.
   *
   * La tierra de fuera del relieve va con el color de las tierras bajas, que
   * es el primero de la paleta del terreno: no se sabe su cota, y pintarla de
   * monte sería inventársela. Y la de los países de al lado, un poco más
   * apagada, que es como las cartas distinguen lo de dentro de lo de fuera.
   */
  private pintarLaCosta(
    g: CanvasRenderingContext2D,
    fondo: FondoDelMapa,
    cx: number,
    cz: number,
    escala: number,
    rellenar: boolean,
  ): void {
    const enPapel = (p: { x: number; z: number }): readonly [number, number] => [
      LADO / 2 + (p.x - cx) * escala,
      LADO / 2 + (p.z - cz) * escala,
    ];
    g.save();
    g.beginPath();
    for (const anillo of fondo.tierras) {
      anillo.forEach((p, i) => {
        const [x, y] = enPapel(p);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.closePath();
    }
    if (rellenar) {
      /*
       * Sin la carta horneada —se está bajando—, el dibujo plano: el mar en
       * su primer azul y la tierra en el primer peldaño de la rampa, que no
       * se sabe su cota y pintarla de monte sería inventársela.
       */
      g.fillStyle = fondo.fuera === "mar" ? MAR[0]!.color : PAPEL.fondo;
      g.fillRect(0, 0, LADO, LADO);
      g.fillStyle = RAMPA[0]!.color;
      g.fill();
    }
    g.lineJoin = "round";
    g.lineCap = "round";
    if (fondo.frontera) {
      g.strokeStyle = TINTAS.tinta;
      g.globalAlpha = 0.6;
      g.lineWidth = 1.4;
      g.setLineDash([7, 3, 2, 3]);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
    } else {
      g.strokeStyle = TINTAS.agua;
      g.lineWidth = LINEAS.costa;
      g.stroke();
    }
    g.strokeStyle = TINTAS.agua;
    g.lineWidth = LINEAS.rio;
    for (const rio of fondo.rios) {
      g.beginPath();
      rio.forEach((p, i) => {
        const [x, y] = enPapel(p);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      g.stroke();
    }
    g.restore();
  }

  /**
   * Cumbres y pueblos: el dibujo siempre; el nombre, si ya se oyó, lo rotula
   * `colocarRotulos` con los demás.
   */
  private pintarHitos(
    g: CanvasRenderingContext2D,
    cx: number,
    cz: number,
    escala: number,
  ): void {
    if (this.hitos.length === 0) return;
    /*
     * **Y se ven.** La primera versión dibujaba triángulos de cuatro píxeles
     * de lado y círculos de tres, y en el plano de verdad —que en pantalla
     * mide unos doscientos setenta, no los cuatrocientos sesenta del lienzo—
     * eso son dos píxeles: medido en una captura, no se distinguían del
     * relieve. Ahora van en píxeles de pantalla, como la hoja: ver
     * `enPantalla`.
     */
    const u = this.trazo;
    const k = 1 / this.u;
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
      g.lineWidth = 2 * u;
      g.strokeStyle = PAPEL.fondo;
      g.fillStyle = hito.clase === "montana" ? TINTAS.cota : TINTAS.tinta;
      g.beginPath();
      if (hito.clase === "montana") {
        // El triángulo de cota de las cartas de verdad.
        g.moveTo(px, py - 7 * u);
        g.lineTo(px + 6 * u, py + 4.5 * u);
        g.lineTo(px - 6 * u, py + 4.5 * u);
        g.closePath();
      } else {
        g.arc(px, py, 4.5 * u, 0, Math.PI * 2);
      }
      g.stroke();
      g.fill();
      this.fijosDelFondo.push({ cx: px * k, cy: py * k, w: 14 * u * k, h: 14 * u * k });
    }
  }
}

/** El radio de la estrella de un punto de la ruta, px de pantalla; y la del punto al que se va. */
const ESTRELLA = 5.5;
const ESTRELLA_ACTIVA = 7;

/**
 * Dónde cae una latitud y longitud en el mundo de un origen: la misma cuenta
 * que `dondeCae`, para la retícula.
 */
function dondeCaeEnElMundo(o: { lat: number; lon: number }, lat: number, lon: number): { x: number; z: number } {
  return dondeCae(o, { lat, lon });
}

/**
 * La estrella de cuatro puntas del punto de paso, con su trazo abierto para
 * rellenar y perfilar: el símbolo de las cartas y de las pantallas de
 * navegación, que se aprende aquí y se reconoce allí.
 */
function estrella(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const e = r * 0.32;
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + e, y - e);
  g.lineTo(x + r, y);
  g.lineTo(x + e, y + e);
  g.lineTo(x, y + r);
  g.lineTo(x - e, y + e);
  g.lineTo(x - r, y);
  g.lineTo(x - e, y - e);
  g.closePath();
}

/** El plan de vuelo como lo necesita el plano. Ver `Mapa.ponerRuta`. */
export interface RutaEnElMapa {
  readonly fijos: readonly {
    readonly x: number;
    readonly z: number;
    readonly nombre: string;
    readonly papel: string;
  }[];
  /** El índice del punto al que se va. */
  readonly activo: number;
  /** Dónde se empieza a bajar, si cae por delante. */
  readonly descenso: { readonly x: number; readonly z: number } | null;
  /** Si se rotulan los puntos: desde el peldaño que lee. */
  readonly conNombres: boolean;
  /**
   * La cota del umbral de llegada, m, para escribirla junto a su pista. Ver
   * `RutaDeLaCarta.cotaDelUmbral` en `ui/carta.ts`.
   */
  readonly cotaDelUmbral?: number | null;
}
