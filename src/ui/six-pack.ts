/**
 * Los seis instrumentos clásicos, para el último peldaño.
 *
 * La disposición es la real, la que lleva cualquier avión ligero del mundo
 * desde los años cincuenta, y eso es la mitad del valor: lo que se aprende
 * aquí **es** una cabina de verdad.
 *
 *   anemómetro    horizonte artificial   altímetro
 *   bastón-bola   direccional            variómetro
 *
 * En SVG dentro del DOM, no en tres dimensiones dentro de una cabina. En una
 * tablet de seiscientos píxeles de alto, seis esferas metidas en una cabina
 * quedan a cuarenta píxeles: preciosas e ilegibles. Y en el DOM se conserva
 * la accesibilidad, que es lo que esta casa vende.
 *
 * Por qué agujas y no cifras, ya que las cifras son más precisas: **una
 * aguja enseña tendencia**. De un vistazo se ve no solo cuánto sino hacia
 * dónde va, y eso es exactamente por lo que un avión de verdad las lleva
 * después de setenta años de poder poner números.
 *
 * ## Y por qué esto ya no es el cuadro entero
 *
 * Las seis esferas son **la familia de pistón**, no la cabina de los seis
 * aviones. Un turbohélice de línea y un reactor no llevan relojes, y ponérselos
 * era enseñar una cabina que no existe: «que cada aeronave parezca lo que es,
 * que un 747 no parezca un juguete». Ver `familia.ts` para el reparto y
 * `tablero.ts` para quien coloca esto dentro del cuadro.
 *
 * Lo que **no** cambia entre familias es dónde está cada cosa: en una avioneta
 * son seis esferas y en un Boeing son seis regiones de una pantalla, en las
 * mismas posiciones relativas. Ese parecido es el hallazgo que se lleva quien
 * aprende aquí, y la retícula entera está hecha para protegerlo.
 *
 * ## Y lo que lleva cada esfera no se decide aquí
 *
 * Marcas, cifras, arcos de color y barrido salen de la escala del avión —ver
 * `cuadro.ts`—, la misma que pinta la cabina en tres dimensiones. Aquí se
 * decidían por su cuenta, y con eso el mismo avión llevaba dos anemómetros:
 * «los paneles de los aviones no coinciden en diferentes vistas».
 */

import type { FlightState } from "../flight/model";
import {
  CABECEO_POR_GRADO,
  RAYAS_DE_CABECEO,
  bolaDelViraje,
  cuadroDe,
  enLaEscala,
  MEDIDAS,
  VENTANA_DE_PRESION,
  type Cuadro,
} from "./cuadro";
import {
  CARA,
  agujaSvg,
  escalaSvg,
  esferaSvg,
  giroDe,
  unidadSvg,
  yDelRotulo,
} from "./esfera-svg";
import { BANDA, cajaDe } from "./familia";
import { PYKASU } from "../flight/aircraft";
import { bienPuesta } from "../flight/altimetro";
import { decima as n1, escribir, poner } from "./si-cambia";

/** Lo que se dejan entre sí dos esferas vecinas, en píxeles del cuadro. */
const SEPARA = 16;

export class SixPack {
  private root: HTMLElement | null = null;
  private readonly needles = new Map<string, SVGElement>();
  /**
   * Las piezas del horizonte, el viraje y la ventanilla, buscadas al montar y
   * no en cada imagen. Ver `piezas` en `tablero.ts`.
   */
  private disco: SVGElement | null = null;
  private avioncito: SVGElement | null = null;
  private bola: SVGElement | null = null;
  private qnh: SVGTextElement | null = null;
  /**
   * Las escalas del avión que se vuela.
   *
   * **No son las mismas para todos**, y creerlo era un fallo con consecuencia:
   * con el fondo de escala de la avioneta, el anemómetro del avión de fuselaje
   * ancho se clavaba en el tope nada más despegar. Ver `cuadro.ts`.
   *
   * Empieza con las del entrenador porque el juego empieza con él, y el HUD la
   * cambia en cuanto se cambia de aeronave.
   */
  private cuadro: Cuadro = cuadroDe(PYKASU);

  /**
   * El grupo de las seis esferas, ya colocado dentro del cuadro.
   *
   * Devuelve un `<g>` de SVG y no una fila de cajas HTML: **el cuadro entero
   * es un solo dibujo que se escala de una pieza**, y por eso ya no hay forma
   * de que se descentre. Cuando eran cajas, cada avión colocaba las suyas como
   * podía y el resultado era el «esto no está centrado ni aunque venga Cristo
   * y me lo diga».
   *
   * Dónde cae cada esfera **sale del reparto**, no de seis números escritos
   * aquí. Es la misma cuenta que comprueba `familia.test.ts`, y hacerla dos
   * veces es la forma segura de que un día digan cosas distintas: la columna
   * del medio tiene que caer clavada en el centro de la pantalla, porque el
   * horizonte es el ancla de todo el cuadro.
   */
  static grupo(c: Cuadro): string {
    const caja = cajaDe("esferas", "seispack");
    // Tres columnas de esferas con su separación: el diámetro sale de ahí.
    const diametro = (caja.ancho - SEPARA * 2) / 3;
    const radio = diametro / 2;
    const columnas = [0, 1, 2].map(
      (k) => caja.x + radio + k * (diametro + SEPARA),
    );
    const filas = [0, 1].map((k) => BANDA.y + radio + k * (diametro + SEPARA));
    const sitio = (i: number) => ({
      x: columnas[i % 3]!,
      y: filas[Math.floor(i / 3)]!,
      radio,
    });
    const esferas: Array<[string, string, string, string, number]> = [
      [
        "asi",
        c.anemometro.rotulo,
        escalaSvg(c.anemometro) + unidadSvg(c.anemometro),
        '<g data-needle="asi">' + agujaSvg(MEDIDAS.aguja) + "</g>",
        yDelRotulo(c.anemometro),
      ],
      ["ai", "ATT", aiFace(), "", yDelRotulo(null)],
      [
        "alt",
        c.altimetro.rotulo,
        altFace(c),
        '<g data-needle="alt-thousands">' +
          agujaSvg(MEDIDAS.agujaCorta) +
          '</g><g data-needle="alt-hundreds">' +
          agujaSvg(MEDIDAS.aguja) +
          "</g>",
        yDelRotulo(c.altimetro),
      ],
      ["tc", "T/C", tcFace(), "", yDelRotulo(null)],
      [
        "dg",
        c.rosa.rotulo,
        '<g data-needle="dg-card">' +
          `<circle cx="50" cy="50" r="${CARA}" class="dg__rosa" />` +
          escalaSvg(c.rosa, { radial: true }) +
          "</g>",
        dgAircraft(),
        yDelRotulo(c.rosa),
      ],
      [
        "vsi",
        c.variometro.rotulo,
        escalaSvg(c.variometro) + unidadSvg(c.variometro),
        '<g data-needle="vsi">' + agujaSvg(MEDIDAS.aguja) + "</g>",
        yDelRotulo(c.variometro),
      ],
    ];
    return `<g data-hud="sixpack">${esferas
      .map(([id, rotulo, face, overlay, yRotulo], i) =>
        esferaSvg(id, rotulo, face, overlay, sitio(i), yRotulo),
      )
      .join("")}</g>`;
  }

  /** Con qué avión se vuela ahora. Se llama antes de `bind`. */
  ponerCuadro(c: Cuadro): void {
    this.cuadro = c;
  }

  bind(root: HTMLElement): void {
    this.root = root.querySelector('[data-hud="sixpack"]');
    this.needles.clear();
    this.disco = this.root?.querySelector<SVGElement>("[data-ai-disc]") ?? null;
    this.avioncito =
      this.root?.querySelector<SVGElement>("[data-tc-plane]") ?? null;
    this.bola = this.root?.querySelector<SVGElement>("[data-tc-ball]") ?? null;
    this.qnh = this.root?.querySelector<SVGTextElement>("[data-qnh]") ?? null;
    if (!this.root) return;
    for (const element of this.root.querySelectorAll<SVGElement>(
      "[data-needle]",
    )) {
      this.needles.set(element.dataset.needle!, element);
    }
  }

  get present(): boolean {
    return this.root !== null;
  }

  /**
   * @param knots velocidad indicada
   * @param feet altitud
   * @param fpm velocidad vertical en pies por minuto
   * @param declinacion lo que se suma al rumbo verdadero para leerlo en la
   *   brújula, en grados. La rosa marca el **magnético**, que es el que va
   *   pintado en la cabecera: sin esto, el direccional de aquí y el de la
   *   cabina discrepaban lo que valga la declinación del sitio.
   */
  update(
    state: FlightState,
    knots: number,
    feet: number,
    fpm: number,
    bank: number,
    pitch: number,
    /** Lo puesto en la rueda y lo que hay de verdad. Ver `altimetro.ts`. */
    presion: { readonly puesta: number; readonly delSitio: number } | null,
    declinacion = 0,
  ): void {
    if (!this.root) return;
    const c = this.cuadro;

    this.rotate("asi", giroDe(c.anemometro, enLaEscala(c.anemometro, knots)));

    // Altímetro de dos agujas, como el de verdad: la larga da una vuelta
    // cada mil pies y la corta marca los miles.
    const pies = Math.max(0, feet);
    this.rotate("alt-hundreds", ((pies % 1000) / 1000) * 360);
    this.rotate("alt-thousands", ((pies % 10000) / 10000) * 360);
    this.ventanaDePresion(presion);

    // Variómetro: cero a las nueve en punto, subida arriba, bajada abajo. El
    // barrido lo dice la escala: aquí la aguja apuntaba a las doce con el
    // avión nivelado, al lado de un cero pintado a las nueve.
    this.rotate("vsi", giroDe(c.variometro, enLaEscala(c.variometro, fpm)));

    // Direccional: la rosa gira al revés que el avión, porque lo que se
    // mueve es el mundo.
    this.rotate("dg-card", -((state.heading * 180) / Math.PI + declinacion));

    // Horizonte artificial: el disco gira contra el alabeo y sube o baja con
    // el cabeceo, así que representa el mundo y no la máquina.
    poner(
      this.disco,
      "transform",
      `rotate(${n1((-bank * 180) / Math.PI)} 50 50) translate(0 ${n1(((pitch * 180) / Math.PI) * CABECEO_POR_GRADO * CARA)})`,
    );

    // Bastón y bola: el avioncito se inclina y la bola se va al exterior del
    // viraje si no está coordinado. Centrar la bola es «dar pie».
    poner(
      this.avioncito,
      "transform",
      `rotate(${n1((bank * 180) / Math.PI)} 50 44)`,
    );
    poner(this.bola, "cx", n1(50 + bolaDelViraje(state.beta) * 11));
  }

  /**
   * La ventanilla de presión de la esfera del altímetro.
   *
   * Ámbar cuando no es la del sitio, y nada más: sin aviso, sin sonido y sin
   * pantalla roja. Un altímetro mal puesto no se queja — sigue funcionando y
   * mintiendo, y eso es exactamente lo que hay que aprender a mirar.
   */
  private ventanaDePresion(
    presion: { readonly puesta: number; readonly delSitio: number } | null,
  ): void {
    const t = this.qnh;
    if (!t) return;
    if (!presion) {
      escribir(t, "");
      return;
    }
    escribir(t, String(Math.round(presion.puesta)));
    t.classList.toggle(
      "esfera__qnh--mal",
      !bienPuesta(presion.puesta, presion.delSitio),
    );
  }

  private rotate(name: string, degrees: number): void {
    poner(this.needles.get(name), "transform", `rotate(${n1(degrees)} 50 50)`);
  }
}

// ── Piezas del dibujo ──────────────────────────────────────────────────

function altFace(c: Cuadro): string {
  /*
   * **Y la ventanilla de Kollsman, a las tres en punto.**
   *
   * Es donde está en todo altímetro de aguja del mundo, desde los años
   * treinta: una ventanita a la derecha de la esfera con la presión que se le
   * ha puesto. El instrumento no mide altura, mide presión, y esa ventanilla
   * dice **suponiendo qué día**. Sin ella la esfera está incompleta, y lo
   * estaba: el juego leía la presión del METAR y no la enseñaba en ninguna
   * parte.
   *
   * Ver `flight/altimetro.ts` para la cuenta y el porqué.
   */
  const v = VENTANA_DE_PRESION;
  return (
    escalaSvg(c.altimetro) +
    unidadSvg(c.altimetro) +
    `<rect x="${50 + v.x * CARA}" y="${50 + v.y * CARA}" width="${v.ancho * CARA}" height="${v.alto * CARA}" rx="1.5" class="esfera__ventana" />` +
    `<text data-qnh x="${50 + (v.x + v.ancho / 2) * CARA}" y="${50 + (v.y + v.alto / 2) * CARA + 2.8}" class="esfera__qnh" text-anchor="middle"></text>`
  );
}

function aiFace(): string {
  /*
   * Las rayas de cabeceo: las de diez y veinte largas, las de cinco y quince
   * cortas. Van en el disco, así que suben y bajan con él, y a la misma
   * escala que en la cabina — ver `CABECEO_POR_GRADO`. Aquí no había ninguna
   * y en la cabina sí, así que el mismo morro arriba se leía en una vista y
   * en la otra no.
   */
  const rayas = RAYAS_DE_CABECEO.map((g) => {
    const y = 50 - g * CABECEO_POR_GRADO * CARA;
    const medio = (g % 10 === 0 ? 0.3 : 0.15) * CARA;
    return `<line x1="${50 - medio}" y1="${y}" x2="${50 + medio}" y2="${y}" class="ai__raya" />`;
  }).join("");
  return `
    <clipPath id="ai-recorte"><circle cx="50" cy="50" r="${CARA}" /></clipPath>
    <g clip-path="url(#ai-recorte)">
      <g data-ai-disc>
        <rect x="-60" y="-60" width="220" height="110" class="ai__cielo" />
        <rect x="-60" y="50" width="220" height="160" class="ai__tierra" />
        <line x1="-60" y1="50" x2="160" y2="50" class="ai__horizonte" />
        ${rayas}
      </g>
    </g>
    <path class="ai__avion" d="M28 50 L42 50 M58 50 L72 50 M50 50 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
    <!--
      La pérdida: un aro rojo alrededor del horizonte, que es donde mira quien
      ya está en apuros. Lo lleva igual el avión de línea y esta avioneta, con
      el mismo color y en el mismo sitio, porque **rojo quiere decir «actuá
      ya»** y no significa ninguna otra cosa en todo el juego.
    -->
    <circle data-cristal="perdida" cx="50" cy="50" r="41" class="cr__alerta cr__alerta--esfera"
            visibility="hidden" />
  `;
}

/**
 * El coordinador de viraje, con **las dos marcas del viraje normalizado**
 * —el de dos minutos la vuelta—, que la cabina llevaba y el cuadro no.
 */
function tcFace(): string {
  const marca = (lado: number) =>
    `<line x1="${50 + lado * 0.62 * CARA}" y1="${44 - 0.2 * CARA}" x2="${50 + lado * 0.62 * CARA}" y2="${44 + 0.02 * CARA}" class="esfera__marca esfera__marca--larga" />`;
  return `
    <g data-tc-plane>
      <line x1="24" y1="44" x2="76" y2="44" class="tc__ala" />
      <line x1="50" y1="38" x2="50" y2="44" class="tc__deriva" />
    </g>
    ${marca(-1)}${marca(1)}
    <rect x="34" y="66" width="32" height="13" rx="6.5" class="tc__tubo" />
    <circle data-tc-ball cx="50" cy="72.5" r="4.4" class="tc__bola" />
  `;
}

/** Silueta fija del avión: en el direccional el que se mueve es el mundo. */
function dgAircraft(): string {
  return `<path class="dg__avion" d="M50 34 L50 62 M40 50 L60 50 M45 60 L55 60" />`;
}
