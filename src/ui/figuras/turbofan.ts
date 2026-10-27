/**
 * **El turbofán por dentro**: el de los reactores, el JAZ 90 y el JAZ 120,
 * cortado a lo largo del eje, con el frente a la derecha y la palanca de
 * gases para tocar.
 *
 * El aire entra por delante y el ventilador grande lo empuja hacia atrás.
 * **La mayor parte rodea el núcleo** por el conducto de derivación y sale fría
 * por detrás: es la que más empuja. El resto entra en el núcleo —compresor de
 * baja y de alta, cámara de combustión, turbinas y tobera— y sale caliente.
 * La turbina de alta mueve el compresor de alta por su eje, el azul y hueco;
 * las de baja mueven el ventilador y el compresor de baja por el verde, que va
 * por dentro. Con más gases, el ventilador (N1) y el núcleo (N2) giran más
 * rápido; el grande tarda más en responder.
 *
 * ## De dónde sale
 *
 * - FAA, *Pilot's Handbook of Aeronautical Knowledge* (FAA-H-8083-25C),
 *   capítulo 7, «Turbofan», figura 7-25: el aire se parte en dos corrientes,
 *   una por el núcleo y otra alrededor.
 * - FAA, *Airplane Flying Handbook* (FAA-H-8083-3C), capítulo 16, «Jet
 *   Engine Basics», figura 16-2.
 * - FAA, *Aviation Maintenance Technician Handbook – Powerplant*
 *   (FAA-H-8083-32, vol. 1), capítulo 1: el ventilador «produces about 80
 *   percent of the thrust»; el eje de baja lleva el ventilador y sus turbinas,
 *   y el de alta, el compresor de alta y su turbina: el núcleo.
 *
 * Es uno de dos ejes, de gran derivación y con toberas separadas, como los
 * que describen los manuales, no el de un avión concreto; los escalones están
 * para que se vea el orden. Sin cifras.
 */

import { DATOS, DIBUJO } from "./turbofan-dibujo";
import { Bucle, pieza, quieto, rellenar } from "./figura";
import {
  engancharLaPalanca,
  palasDe,
  puntitosDe,
  type Camino,
  type Disco,
  type FiguraDelMotor,
  type OpcionesDelMotor,
  type Palanca,
} from "./motor-comun";
import "./turbofan.css";

export type PalabrasDelTurbofan = Readonly<
  Record<
    | "n1" | "n2" | "n3" | "n4" | "n5" | "daLaVuelta" | "rodea" | "combustion" | "masEmpuja" | "barraEmpuje"
    | "calientes" | "mas" | "menos" | "barraN2" | "nucleo" | "barraN1" | "ventilador" | "aria",
    string
  >
>;

const CY = DATOS.CY;
const DISCOS = DATOS.DISCS as Readonly<Record<string, Disco>>;
const DERIVACION = DATOS.BYPASS as unknown as Camino;
const NUCLEO = DATOS.CORE as unknown as Camino;
const PALANCA = DATOS.LEVER as unknown as Palanca;

export function montarTurbofan(el: HTMLElement, o: OpcionesDelMotor<PalabrasDelTurbofan>): FiguraDelMotor {
  const T = o.textos;
  el.classList.add("fig-turbofan");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El turbofán no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const palas: Record<string, [SVGElement, SVGElement]> = {};
  for (const id in DISCOS) palas[id] = [$(`${id}-far`), $(`${id}-near`)];
  const puntitos = { fan: $("dots-fan"), frio: $("dots-frio"), fuego: $("dots-fuego"), gas: $("dots-gas") };
  const llamas = $("flames");
  const palanca = $("lever");
  const tecla = $("k-power");
  const frase = $("word");
  const barras = { n1: $("bar-n1"), n2: $("bar-n2"), th: $("bar-th") };
  const anchoDeBarra = Number(barras.n1.previousElementSibling?.getAttribute("width") ?? 0);
  let elegida = Math.max(0, Math.min(1, o.potencia ?? 0));
  let p = elegida;
  let baja = 0;
  let alta = 0;
  let porFuera = 0;
  let porDentro = 0;

  function pintar(): void {
    // El eje de baja —ventilador, compresor y turbina de baja— y el de alta —el núcleo— giran cada uno a lo suyo.
    for (const id in DISCOS) {
      const D = DISCOS[id];
      const par = palas[id];
      if (!D || !par) continue;
      const d = palasDe(D, D.spool === "baja" ? baja : alta);
      par[0].setAttribute("d", d[0]);
      par[1].setAttribute("d", d[1]);
    }
    const b = puntitosDe(DERIVACION, porFuera, 12, CY, ["fan"]);
    const c = puntitosDe(NUCLEO, porDentro, 12, CY, ["fan", "frio", "fuego", "gas"]);
    puntitos.fan.setAttribute("d", (b.fan ?? "") + (c.fan ?? ""));
    puntitos.frio.setAttribute("d", c.frio ?? "");
    puntitos.fuego.setAttribute("d", c.fuego ?? "");
    puntitos.gas.setAttribute("d", c.gas ?? "");
    const crecen = 0.6 + 0.6 * p;
    llamas.setAttribute("transform", `translate(${(338 * (1 - crecen)).toFixed(1)} 0) scale(${crecen.toFixed(3)} 1)`);
    palanca.setAttribute(
      "transform",
      `rotate(${(PALANCA.a0 + (PALANCA.a1 - PALANCA.a0) * elegida).toFixed(1)} ${PALANCA.pivot[0]} ${PALANCA.pivot[1]})`,
    );
    barras.n1.setAttribute("width", (anchoDeBarra * (0.25 + 0.75 * p)).toFixed(1));
    barras.n2.setAttribute("width", (anchoDeBarra * (0.6 + 0.4 * p)).toFixed(1));
    barras.th.setAttribute("width", (anchoDeBarra * (0.06 + 0.94 * p)).toFixed(1));
    frase.textContent = elegida < 0.2 ? T.poco : elegida < 0.7 ? T.medio : T.todo;
    tecla.setAttribute("aria-valuenow", String(Math.round(elegida * 100)));
    tecla.setAttribute("aria-valuetext", T.valor(elegida));
  }

  // Un motor grande tarda unos segundos en contestar a la palanca.
  const bucle = new Bucle(el, (dt) => {
    const sinMovimiento = quieto();
    p = sinMovimiento ? elegida : p + (elegida - p) * (1 - Math.exp(-dt * 0.9));
    if (!sinMovimiento) {
      baja += (1 + 4 * p) * dt;
      alta += (3 + 3 * p) * dt;
      porFuera += (30 + 110 * p) * dt;
      porDentro += (40 + 90 * p) * dt;
    }
    pintar();
  });
  const poner = (v: number): void => {
    elegida = Math.max(0, Math.min(1, v));
    if (quieto()) p = elegida;
    pintar();
  };
  engancharLaPalanca(svg, tecla, PALANCA, T.palanca, () => elegida, poner);
  pintar();
  return {
    ponEdad(e) {
      el.dataset.edad = e;
    },
    ponPotencia: poner,
    desmontar() {
      bucle.parar();
      el.innerHTML = "";
      el.classList.remove("fig-turbofan");
      delete el.dataset.edad;
    },
  };
}
