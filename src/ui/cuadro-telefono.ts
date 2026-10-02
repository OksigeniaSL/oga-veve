/**
 * **El cuadro del teléfono**: cuatro losas grandes en lugar del cuadro entero
 * encogido.
 *
 * Mirado en el teléfono de Enrique: «el cuadro de mandos ocupa un montón, pero
 * ni aún así se ve: no leo la altitud a la que debo llegar ni más detalles, es
 * muy pequeño para un teléfono». Era el cuadro del portátil —mil doscientos
 * ochenta de ancho y cuatro cientos de instrumentos— dibujado a la cuarta
 * parte: ocupaba media pantalla y dejaba cifras de siete píxeles. Lo que se
 * pidió en su lugar es esto, con menos cosas y más grandes:
 *
 * - **la velocidad con su marca**: la cifra y, debajo, la banda de colores del
 *   anemómetro con la aguja y la muesca magenta de la velocidad que toca;
 * - **la altitud con la ventanilla ALT**: la cifra, la altura pedida en
 *   magenta y sus dos teclas, de tamaño de dedo;
 * - **el rumbo**: la cifra con la rosa que gira;
 * - **el tren y los flaps**: las luces de las patas y los grados.
 *
 * Una fila baja encima de los pedales, para que por encima quede el avión y el
 * horizonte. Y **tocar una losa pone grande la pantalla de la que sale** —la
 * de actitud, la de navegación, la de motores—, que es la otra mitad de lo
 * pedido: «o que tocar una pantalla la ponga grande». Ver `Hud.ponerGrande`.
 *
 * Las mismas reglas que el cuadro plano, porque es el mismo cuadro dicho de
 * otra forma: las cifras desde el primer peldaño, los rótulos en inglés
 * aeronáutico desde el tercero, la ventanilla ALT con su aparato desde el
 * segundo, y **nunca un número solo**: donde todavía no va el rótulo va un
 * dibujo —la banda, la montaña con el avión, la rosa, las luces, el ala—.
 * Los colores son los de la cabina: magenta lo que quiero, verde lo normal,
 * ámbar cerca del límite.
 */

import type { AircraftConfig } from "../flight/aircraft";
import { luzDeTren } from "../flight/tren";
import { enLaMuesca } from "../flight/flaps";
import { t } from "../i18n";
import {
  bandasDeVelocidad,
  COLOR_DE_ARCO,
  cuadroDe,
  enLaEscala,
  type Cuadro,
} from "./cuadro";
import {
  CON_SU_APARATO_DESDE,
  familiaDe,
  LETRAS_DESDE,
  patasDe,
  type Familia,
} from "./familia";
import { DIBUJOS } from "./senal";
import { decima, escribir, poner } from "./si-cambia";
import type { DatosDelTablero } from "./tablero";

/** Qué pantalla del cuadro se pone grande al tocar cada losa. */
export type Grande = "actitud" | "rumbo" | "motor";

const GRADOS = 180 / Math.PI;

/** La montaña con el avión encima: «a qué altura». */
const ALTURA = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M1.5 22 L8 13 L12 17 L16 11 L22.5 22 Z" />
  <path d="M12 3.2 l0.9 2.6 3.6 1.3 v0.9 l-3.6 -0.5 v1.9 l1.2 0.9 v0.7
           L12 10.4 l-2.1 0.6 v-0.7 l1.2 -0.9 v-1.9 l-3.6 0.5 v-0.9
           l3.6 -1.3 Z" />
</svg>`;

/** La rosa: un aro con el norte marcado, que gira con el rumbo. */
const ROSA = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <g data-tel="rosa">
    <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M12 2.2 L14.6 8 H9.4 Z" class="tel__norte" />
    <path d="M12 21.8 v-2.6 M2.2 12 h2.6 M21.8 12 h-2.6" stroke="currentColor"
          stroke-width="1.6" stroke-linecap="round" />
  </g>
  <path d="M12 9.2 v6.4 M9.4 12.4 h5.2" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" class="tel__avioncito" />
</svg>`;

/** La flecha de cada tecla de la ventanilla ALT. */
const FLECHA = (sube: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="${sube ? "M12 6 L20 18 H4 Z" : "M12 18 L20 6 H4 Z"}" />
</svg>`;

export class CuadroDelTelefono {
  private raiz: HTMLElement | null = null;
  private cuadro: Cuadro | null = null;
  private familia: Familia = "esferas";
  private readonly piezas = new Map<string, Element | null>();
  private luces: readonly Element[] = [];

  /** Si este avión lleva la ventanilla ALT en la visera. */
  static llevaVentanilla(a: AircraftConfig): boolean {
    return familiaDe(a) !== "esferas";
  }

  markup(a: AircraftConfig, peldano: number): string {
    const c = cuadroDe(a);
    const patas = patasDe(a);
    const conFlaps = c.flaps.length > 1;
    const ventanilla = CuadroDelTelefono.llevaVentanilla(a);
    const escalon = Math.max(1, Math.min(4, peldano));
    const banda = bandasDeVelocidad(c)
      .map((arco) => {
        const desde = Math.max(0, Math.min(1, arco.desde)) * 100;
        const hasta = Math.max(0, Math.min(1, arco.hasta)) * 100;
        // El blanco, el de los flaps, por debajo y más fino: así se lee en
        // un anemómetro de verdad, por dentro del verde.
        const blanco = arco.color === "blanco";
        return hasta > desde
          ? `<rect x="${desde}" y="${blanco ? 6 : 1}" width="${hasta - desde}"
                   height="${blanco ? 3 : 5}" fill="${COLOR_DE_ARCO[arco.color]}" />`
          : "";
      })
      .join("");
    const luces = Array.from(
      { length: patas },
      () => `<span class="tel__luz" data-tel-luz></span>`,
    ).join("");
    const rotulo = (texto: string) =>
      `<span class="tel__rotulo" data-desde="${LETRAS_DESDE}">${texto}</span>`;
    return `
      <div class="tel" data-hud="cuadro-tel" data-peldano="${escalon}">
        <!--
          La velocidad: la cifra y la banda del anemómetro, con la aguja
          blanca y la muesca magenta de la que toca. La banda es el dibujo que
          va con la cifra mientras IAS no se lee.
        -->
        <button type="button" class="tel__losa tel__losa--ias" data-tel-grande="actitud"
                aria-label="${t("hud.telGrande")}">
          ${rotulo("IAS")}
          <span class="tel__cifra" data-tel="ias">0</span>
          <svg class="tel__banda" viewBox="0 0 100 10" preserveAspectRatio="none"
               aria-hidden="true">
            <rect width="100" height="10" rx="2" class="tel__fondo-banda" />
            ${banda}
            <rect data-tel="spd" x="-2" y="0" width="4" height="10" class="tel__marca" visibility="hidden" />
            <rect data-tel="aguja" x="-1" y="-1" width="2" height="12" class="tel__aguja" />
          </svg>
        </button>
        <!--
          La altitud, con la ventanilla ALT y sus teclas. Las teclas son de
          dedo —cuarenta y cuatro píxeles de pantalla—: dentro del cuadro
          encogido medían treinta y cuatro por veinticinco. Y van por el mismo
          camino que las del cuadro plano, \`data-mcp-rueda\`: un toque, un
          millar; arrastrando, una rueda. Ver el constructor del HUD.
        -->
        <div class="tel__grupo">
          <button type="button" class="tel__losa tel__losa--alt" data-tel-grande="actitud"
                  aria-label="${t("hud.telGrande")}">
            ${rotulo("ALT")}
            <span class="tel__dibujo" data-hasta="${LETRAS_DESDE - 1}">${ALTURA}</span>
            <span class="tel__cifra" data-tel="alt">0</span>
            ${
              ventanilla
                ? `<span class="tel__sel" data-tel="alt-sel" data-mcp-alt=""
                         data-desde="${CON_SU_APARATO_DESDE}">-----</span>`
                : ""
            }
          </button>
          ${
            ventanilla
              ? `<button type="button" class="tel__tecla" data-mcp-rueda="-1"
                         data-desde="${CON_SU_APARATO_DESDE}"
                         aria-label="${t("hud.altBajar")}">${FLECHA(false)}</button>
                 <button type="button" class="tel__tecla" data-mcp-rueda="1"
                         data-desde="${CON_SU_APARATO_DESDE}"
                         aria-label="${t("hud.altSubir")}">${FLECHA(true)}</button>`
              : ""
          }
        </div>
        <button type="button" class="tel__losa tel__losa--hdg" data-tel-grande="rumbo"
                aria-label="${t("hud.telGrande")}">
          ${rotulo("HDG")}
          <span class="tel__dibujo tel__dibujo--rosa">${ROSA}</span>
          <span class="tel__cifra" data-tel="hdg">000</span>
        </button>
        ${
          patas || conFlaps
            ? `<button type="button" class="tel__losa tel__losa--mandos"
                       data-tel-grande="motor" aria-label="${t("hud.telGrande")}">
                 ${patas ? `<span class="tel__luces" data-tel="tren">${luces}</span>` : ""}
                 ${
                   conFlaps
                     ? `<span class="tel__flaps">
                          <span class="tel__dibujo">${DIBUJOS.flaps}</span>
                          <span class="tel__cifra tel__cifra--menuda" data-tel="flaps">0</span>
                        </span>`
                     : ""
                 }
               </button>`
            : ""
        }
      </div>`;
  }

  bind(raiz: HTMLElement, a: AircraftConfig): void {
    this.raiz = raiz.querySelector<HTMLElement>('[data-hud="cuadro-tel"]');
    this.cuadro = cuadroDe(a);
    this.familia = familiaDe(a);
    this.piezas.clear();
    this.luces = this.raiz ? [...this.raiz.querySelectorAll("[data-tel-luz]")] : [];
  }

  get presente(): boolean {
    return this.raiz !== null;
  }

  /**
   * La caja del cuadro plano que se pone grande al tocar una losa, en sus
   * unidades: la pantalla de actitud, la de navegación o la de motores, según
   * la familia. Ver `RETICULA` en `familia.ts`.
   */
  queSePoneGrande(cual: Grande): string {
    const f = this.familia;
    if (f === "esferas") return cual === "motor" ? "motor" : "seispack";
    if (f === "cristal") return cual === "actitud" ? "pfd" : "mfd";
    return cual === "actitud" ? "pfd" : cual === "rumbo" ? "nd" : "eicas";
  }

  private pieza(que: string): Element | null {
    let el = this.piezas.get(que);
    if (el === undefined || (el !== null && !el.isConnected)) {
      el = this.raiz?.querySelector(`[data-tel="${que}"]`) ?? null;
      this.piezas.set(que, el);
    }
    return el;
  }

  update(d: DatosDelTablero): void {
    const c = this.cuadro;
    if (!this.raiz || !c) return;
    escribir(this.pieza("ias"), String(Math.max(0, Math.round(d.nudos))));
    poner(
      this.pieza("aguja"),
      "x",
      decima(enLaEscala(c.anemometro, d.nudos) * 100 - 1),
    );
    const spd = d.spd ?? null;
    const marca = this.pieza("spd");
    poner(marca, "visibility", spd ? "visible" : "hidden");
    if (spd) poner(marca, "x", decima(enLaEscala(c.anemometro, spd.kt) * 100 - 2));

    // La altitud, de veinte en veinte pies como el tambor: un cuatro que
    // baila entre 2403 y 2408 no deja leer la cifra.
    escribir(this.pieza("alt"), String(Math.round(d.pies / 20) * 20));
    const v = d.ventanilla ?? null;
    const sel = this.pieza("alt-sel");
    if (sel) {
      escribir(sel, v ? String(v.pies) : "-----");
      sel.classList.toggle("tel__sel--cerca", v?.alerta === "cerca");
      sel.classList.toggle("tel__sel--fuera", v?.alerta === "fuera");
    }

    const rumbo =
      (((d.estado.heading * GRADOS + (d.declinacion ?? 0)) % 360) + 360) % 360;
    const redondo = Math.round(rumbo) % 360;
    escribir(this.pieza("hdg"), String(redondo === 0 ? 360 : redondo).padStart(3, "0"));
    poner(this.pieza("rosa"), "transform", `rotate(${decima(-rumbo)} 12 12)`);

    const luz = luzDeTren(d.tren);
    for (const l of this.luces) poner(l, "data-luz", luz);
    escribir(this.pieza("flaps"), String(Math.round(enLaMuesca(c.flaps, d.flaps))));
  }
}
