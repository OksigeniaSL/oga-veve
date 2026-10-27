/**
 * **El turbohélice por dentro**: el PT6 del JAZ 60, cortado a lo largo del
 * eje, con el frente a la derecha y la palanca de potencia para tocar.
 *
 * **El aire entra por detrás y va hacia delante, y no es un dibujo al
 * revés**: es un motor de turbina libre y de flujo invertido. Entra por un
 * anillo cerca de la parte de atrás, pasa los tres escalones axiales y el
 * centrífugo del compresor, da la vuelta en la cámara de combustión, vuelve a
 * darla y va hacia delante por la turbina del compresor y por la turbina
 * libre, que mueve la hélice por la caja reductora, y sale por los dos
 * escapes de delante. El orden por el camino del aire es el de siempre; las
 * puntas de flecha fijas dicen el sentido aunque nada se mueva.
 *
 * Con más potencia, el generador de gas gira más rápido y **la hélice no**:
 * el regulador la mantiene a sus vueltas y sus palas muerden más aire.
 *
 * ## De dónde sale
 *
 * - El motor de la clase del 1900D, un Pratt & Whitney Canada PT6A-67D:
 *   informe de aceptación de tipo del Beech 1900C y 1900D de la autoridad de
 *   Nueva Zelanda, sobre el certificado de tipo A24CE de la FAA.
 * - FAA, *Airplane Flying Handbook* (FAA-H-8083-3C), capítulo 15,
 *   «Split-Shaft/Free Turbine Engine» y figura 15-5: dos turbinas que giran
 *   al revés, una para el compresor y otra para la hélice por la caja
 *   reductora; tres escalones axiales y uno centrífugo; «Inlet air enters the
 *   engine via a circular plenum near the rear of the engine and flows
 *   forward», las dos vueltas y los dos escapes de delante; y «propeller speed
 *   within the governing range remains constant».
 * - FAA, *Pilot's Handbook of Aeronautical Knowledge* (FAA-H-8083-25C),
 *   capítulo 7, «Turboprop», figura 7-24.
 *
 * Sin cifras: ni vueltas, ni temperaturas, ni grados de paso. Un disco por
 * turbina, como la figura del manual.
 */

import { DATOS, DIBUJO } from "./turbohelice-dibujo";
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
import "./turbohelice.css";

export type PalabrasDelTurbohelice = Readonly<
  Record<
    | "n1" | "n2" | "n3" | "n4" | "n5" | "n6" | "aire" | "caja" | "combustion" | "compresor" | "escape"
    | "barraNg" | "helice" | "barraNp" | "mas" | "menos" | "barraPar" | "turbinas" | "aria",
    string
  >
>;

const CY = DATOS.CY;
const DISCOS = DATOS.DISCS as Readonly<Record<string, Disco>>;
const FLUJO = DATOS.FLOW as unknown as Camino;
const ZONAS = DATOS.ZONES;
const HELICE = DATOS.PROP;
const PALANCA = DATOS.LEVER as unknown as Palanca;

/** La hélice de cuatro palas, de lado, con su paso `b`: más paso, más pala a la vista. */
function heliceDe(a: number, b: number): [string, string] {
  let lejos = "";
  let cerca = "";
  for (let i = 0; i < 4; i++) {
    const t = a + (i * Math.PI) / 2;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const en = (r: number, k: number): string => {
      const w = HELICE.chord * (1 - (0.45 * (r - HELICE.root)) / (HELICE.tip - HELICE.root)) * k;
      return `${(HELICE.x + 0.12 * r * s + w * Math.sin(b)).toFixed(1)} ${(CY - r * c + w * Math.cos(b) * s).toFixed(1)}`;
    };
    const d = `M${en(HELICE.root, -0.5)}L${en(HELICE.tip, -0.5)}L${en(HELICE.tip, 0.5)}L${en(HELICE.root, 0.5)}Z`;
    if (s >= 0) cerca += d;
    else lejos += d;
  }
  return [lejos, cerca];
}

export function montarTurbohelice(
  el: HTMLElement,
  o: OpcionesDelMotor<PalabrasDelTurbohelice>,
): FiguraDelMotor {
  const T = o.textos;
  el.classList.add("fig-turbohelice");
  el.dataset.edad = o.edad;
  el.innerHTML = rellenar(DIBUJO, T.dibujo);
  const svg = el.querySelector("svg");
  if (!svg) throw new Error("El turbohélice no tiene dibujo");
  const $ = (n: string): SVGElement => pieza(svg, n);
  const palas: Record<string, [SVGElement, SVGElement]> = {};
  for (const id in DISCOS) palas[id] = [$(`${id}-far`), $(`${id}-near`)];
  const puntitos: Record<string, SVGElement> = {};
  for (const z of ZONAS) puntitos[z] = $(`dots-${z}`);
  const heliceLejos = $("prop-far");
  const heliceCerca = $("prop-near");
  const estela = $("slip");
  const llamas = $("flames");
  const palanca = $("lever");
  const tecla = $("k-power");
  const frase = $("word");
  const barras = { ng: $("bar-ng"), np: $("bar-np"), tq: $("bar-tq") };
  const anchoDeBarra = Number(barras.ng.previousElementSibling?.getAttribute("width") ?? 0);
  let elegida = Math.max(0, Math.min(1, o.potencia ?? 0));
  let p = elegida;
  let generador = 0;
  let libre = 0;
  let recorrido = 0;
  let viento = 0;

  function pintar(): void {
    /*
     * El generador de gas —el compresor y su turbina— gira con la potencia;
     * la turbina libre, la caja y la hélice van a sus vueltas, las que guarda
     * el regulador, y al revés.
     */
    for (const id in DISCOS) {
      const D = DISCOS[id];
      const par = palas[id];
      if (!D || !par) continue;
      const d = palasDe(D, D.spool === "gen" ? generador : -libre);
      par[0].setAttribute("d", d[0]);
      par[1].setAttribute("d", d[1]);
    }
    const paso = ((12 + 30 * p) * Math.PI) / 180;
    const h = heliceDe(libre * 0.35, paso);
    heliceLejos.setAttribute("d", h[0]);
    heliceCerca.setAttribute("d", h[1]);
    const pd = puntitosDe(FLUJO, recorrido, 13, CY, ZONAS);
    for (const z of ZONAS) puntitos[z]?.setAttribute("d", pd[z] ?? "");
    // El aire que la hélice echa atrás, por fuera: con más potencia, trazos más largos.
    let s = "";
    const largo = 14 + 34 * p;
    for (let x = ((viento + 124 * 3) % 90) - 90; x < HELICE.x - 20; x += 90)
      s += `M${(HELICE.x - 20 - x).toFixed(1)} ${CY - 124}h${(-largo).toFixed(1)}M${(HELICE.x - 20 - x).toFixed(1)} ${CY + 124}h${(-largo).toFixed(1)}`;
    estela.setAttribute("d", s);
    const crecen = 0.6 + 0.6 * p;
    llamas.setAttribute("transform", `translate(${(292 * (1 - crecen)).toFixed(1)} 0) scale(${crecen.toFixed(3)} 1)`);
    palanca.setAttribute(
      "transform",
      `rotate(${(PALANCA.a0 + (PALANCA.a1 - PALANCA.a0) * elegida).toFixed(1)} ${PALANCA.pivot[0]} ${PALANCA.pivot[1]})`,
    );
    barras.ng.setAttribute("width", (anchoDeBarra * (0.45 + 0.55 * p)).toFixed(1));
    barras.np.setAttribute("width", (anchoDeBarra * 0.82).toFixed(1));
    barras.tq.setAttribute("width", (anchoDeBarra * (0.08 + 0.92 * p)).toFixed(1));
    frase.textContent = elegida < 0.2 ? T.poco : elegida < 0.7 ? T.medio : T.todo;
    tecla.setAttribute("aria-valuenow", String(Math.round(elegida * 100)));
    tecla.setAttribute("aria-valuetext", T.valor(elegida));
  }

  // Una turbina tarda un momento en acelerar y en frenar.
  const bucle = new Bucle(el, (dt) => {
    const sinMovimiento = quieto();
    p = sinMovimiento ? elegida : p + (elegida - p) * (1 - Math.exp(-dt * 1.4));
    if (!sinMovimiento) {
      generador += (2.2 + 3.2 * p) * dt;
      libre += 2.6 * dt;
      recorrido += (40 + 70 * p) * dt;
      viento += (60 + 140 * p) * dt;
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
      el.classList.remove("fig-turbohelice");
      delete el.dataset.edad;
    },
  };
}
