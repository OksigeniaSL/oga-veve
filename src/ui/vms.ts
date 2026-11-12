/**
 * **La VMS del helicóptero**: la pantalla de los motores y del rotor, en el
 * sitio del EICAS de los reactores. Es la firma del tipo, lo que a un 747 sus
 * cuatro columnas: el niño ve en un dial cuánta fuerza le queda y en el otro
 * que el rotor no se para.
 *
 * - **El FLI**, a la izquierda: una aguja por motor, con un disco que lleva el
 *   1 o el 2. Dice cuánta fuerza queda antes del primer límite del motor.
 *   Arco verde hasta la potencia máxima continua, ámbar la de despegue y una
 *   raya roja en el límite. Ver `flight/vms.ts`, que hace las cuentas.
 * - **El reloj del rotor**, a la derecha: la aguja ancha y blanca de las
 *   vueltas del rotor, NR, y encima las dos finas de las turbinas libres, NF,
 *   en cian, casadas al cien por cien mientras mueven el rotor.
 * - Bajo cada dial, su lectura; y abajo, el depósito, que la pantalla de
 *   motores de un helicóptero de cristal también lleva.
 *
 * **Crece con la escalera** como el resto del cuadro: las agujas sobre el arco
 * de color, con el 1 y el 2 en sus discos y las cifras desde el primer
 * peldaño (`CIFRAS_DESDE`); los rótulos FLI, NR y NF desde el de las letras;
 * y en el de cabina, el NG y la temperatura de turbina bajo cada aguja del
 * FLI. La posición es la etiqueta: el reloj de la izquierda es la fuerza y el
 * de la derecha el rotor, y eso se ve antes de saber leer.
 */

import type { AircraftConfig } from "../flight/aircraft";
import { FLI, NR_MAXIMO, bandasDelRotor } from "../flight/vms";
import { reglaDeCombustible } from "./cristal";
import { MARCA_CIFRA, MARCA_ROTULO } from "./familia";
import { PALETA } from "./paleta";

/** El barrido de los dos diales, en grados desde arriba: de −120 a +120. */
const INICIO = -120;
const RECORRIDO = 240;

/** El radio de los dos diales: ciento cincuenta de diámetro, como los del Arai. */
export const RADIO_DE_LA_VMS = 72;

/** Los centros de los dos diales, en unidades de la pantalla de 400. */
export const DIALES_DE_LA_VMS = {
  fli: { cx: 100, cy: 116 },
  rotor: { cx: 300, cy: 116 },
} as const;

/**
 * **A dónde apuntan los discos del 1 y del 2**, en fracción del radio.
 *
 * A dos alturas distintas de la aguja, porque las dos agujas van casi siempre
 * juntas —los dos motores dan lo mismo— y con los discos a la misma altura el
 * 2 tapaba al 1. Así se leen los dos aunque las agujas se monten.
 */
export const DISCO_DEL_MOTOR = [0.25, 0.5] as const;

/** El ángulo de un valor en un dial de `0` a `maximo`, en grados. */
export function anguloDelDial(valor: number, maximo: number): number {
  const f = Math.max(0, Math.min(1, (Number.isFinite(valor) ? valor : 0) / maximo));
  return INICIO + f * RECORRIDO;
}

/** Un punto del dial a un ángulo y un radio. */
function punto(cx: number, cy: number, grados: number, rr: number): [number, number] {
  const a = (grados * Math.PI) / 180;
  return [cx + Math.sin(a) * rr, cy - Math.cos(a) * rr];
}

function arco(cx: number, cy: number, r: number, desde: number, hasta: number, max: number, clase: string): string {
  const a0 = anguloDelDial(desde, max);
  const a1 = anguloDelDial(hasta, max);
  const [x0, y0] = punto(cx, cy, a0, r);
  const [x1, y1] = punto(cx, cy, a1, r);
  return `<path class="${clase}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" />`;
}

function raya(cx: number, cy: number, r: number, valor: number, max: number, dentro: number, fuera: number, clase: string): string {
  const g = anguloDelDial(valor, max);
  const [x0, y0] = punto(cx, cy, g, r - dentro);
  const [x1, y1] = punto(cx, cy, g, r + fuera);
  return `<line class="${clase}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" />`;
}

/** Las marcas y las cifras de un dial. */
function escala(cx: number, cy: number, r: number, max: number, paso: number, cadaCifra: number): string {
  let s = "";
  for (let v = 0; v <= max + 1e-6; v += paso) {
    const larga = Math.abs(v / cadaCifra - Math.round(v / cadaCifra)) < 1e-6;
    s += raya(cx, cy, r, v, max, larga ? 10 : 6, 0, "cr__marca");
    if (larga) {
      const [x, y] = punto(cx, cy, anguloDelDial(v, max), r - 18);
      s += `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" ${MARCA_CIFRA} class="cr__cifra vms__cifra" text-anchor="middle">${Math.round(v)}</text>`;
    }
  }
  return s;
}

/**
 * **El sitio del dedo de cada dial**: su mitad de la pantalla, del borde de
 * arriba a la última de sus lecturas. Cada dial se explica a sí mismo —el
 * FLI y el reloj del rotor—, y un toque entre los dos o junto a una lectura
 * tiene que caer en uno: con la caja del dial sola, el hueco del medio no era
 * de nadie. No se pinta.
 */
const ANCHO_DE_LA_VMS = 400;
const ALTO_DEL_TOQUE = DIALES_DE_LA_VMS.fli.cy + RADIO_DE_LA_VMS + 98;
function toque(mitad: 0 | 1): string {
  const ancho = ANCHO_DE_LA_VMS / 2;
  return `<rect x="${mitad * ancho}" y="0" width="${ancho}" height="${ALTO_DEL_TOQUE}" class="vms__toque" />`;
}

/** Una aguja que sale del buje: el triángulo afilado de las de motor. */
function aguja(r: number, ancho: number, largo: number): string {
  return `M0 ${(r * 0.12).toFixed(1)} L${-ancho} ${(-r * largo * 0.86).toFixed(1)} L0 ${(-r * largo).toFixed(1)} L${ancho} ${(-r * largo * 0.86).toFixed(1)} Z`;
}

/**
 * El FLI: el arco, la raya roja, las dos agujas con sus discos y, debajo, las
 * dos lecturas y —en el peldaño de cabina— el NG y la T4 de cada motor.
 */
function dialDelFli(motores: number): string {
  const { cx, cy } = DIALES_DE_LA_VMS.fli;
  const r = RADIO_DE_LA_VMS;
  let agujas = "";
  let discos = "";
  let lecturas = "";
  let cabina = "";
  const anchoCaja = 64;
  for (let i = 0; i < motores; i++) {
    agujas += `<g data-vms-fli="${i}" transform="rotate(${INICIO})"><path class="cr__aguja vms__aguja-fli" d="${aguja(r, 2.6, 0.84)}" /></g>`;
    discos += `
      <g data-vms-disco="${i}" data-radio="${(r * (DISCO_DEL_MOTOR[i] ?? 0.6)).toFixed(1)}">
        <circle r="8.5" class="vms__disco" />
        <text y="4" ${MARCA_CIFRA} class="vms__disco-cifra" text-anchor="middle">${i + 1}</text>
      </g>`;
    const x = cx + (i - (motores - 1) / 2) * (anchoCaja + 10);
    const y = cy + r + 16;
    lecturas += `
      <g data-vms-lectura="fli-${i}">
        <rect x="${x - anchoCaja / 2}" y="${y}" width="${anchoCaja}" height="30" rx="2" class="vms__caja" />
        <text x="${x - anchoCaja / 2 + 7}" y="${y + 20}" ${MARCA_CIFRA} class="cr__rotulo vms__numero"
              text-anchor="start">${i + 1}</text>
        <text data-vms-fli-cifra="${i}" x="${x + anchoCaja / 2 - 6}" y="${y + 23}" ${MARCA_CIFRA}
              class="cr__valor vms__valor" text-anchor="end"></text>
      </g>`;
    /*
     * **El NG y la T4, debajo de su aguja**, en el peldaño de cabina. Con su
     * rótulo y no antes: dos números sueltos bajo el FLI no dirían de qué son.
     * Supuestos, como dice `flight/vms.ts`: se mueven con la potencia como los
     * de verdad, pero sus números no salen de una ficha.
     */
    cabina += `
      <text data-vms-ng="${i}" x="${x + anchoCaja / 2 - 6}" y="${y + 52}" data-desde="4"
            class="cr__aux vms__aux" text-anchor="end"></text>
      <text data-vms-t4="${i}" x="${x + anchoCaja / 2 - 6}" y="${y + 72}" data-desde="4"
            class="cr__aux vms__aux" text-anchor="end"></text>`;
  }
  const yCabina = cy + r + 16;
  return `
    <g data-vms="fli" data-explica="fli" data-explica-fondo>
      ${toque(0)}
      <circle cx="${cx}" cy="${cy}" r="${r}" class="cr__dial" />
      ${arco(cx, cy, r - 3, 0, FLI.continua, FLI.maximo, "cr__arco cr__arco--verde")}
      ${arco(cx, cy, r - 3, FLI.continua, FLI.despegue, FLI.maximo, "cr__arco cr__arco--ambar vms__arco")}
      ${escala(cx, cy, r, FLI.maximo, 1, 2)}
      ${raya(cx, cy, r, FLI.transitoria, FLI.maximo, 12, 3, "cr__limite")}
      <text x="${cx}" y="${cy + 34}" ${MARCA_ROTULO} class="cr__rotulo" text-anchor="middle">FLI</text>
      <g transform="translate(${cx} ${cy})">${agujas}${discos}</g>
      <circle cx="${cx}" cy="${cy}" r="4" class="cr__buje" />
      ${lecturas}
      <text x="${cx - 2 * 37 - 4}" y="${yCabina + 52}" data-desde="4" class="cr__rotulo" text-anchor="start">NG</text>
      <text x="${cx - 2 * 37 - 4}" y="${yCabina + 72}" data-desde="4" class="cr__rotulo" text-anchor="start">T4</text>
      ${cabina}
    </g>`;
}

/**
 * El reloj del rotor: las bandas de la ficha, la aguja ancha del NR y las
 * dos finas de las NF encima; debajo, la lectura del NR.
 */
function dialDelRotor(a: AircraftConfig, motores: number): string {
  const { cx, cy } = DIALES_DE_LA_VMS.rotor;
  const r = RADIO_DE_LA_VMS;
  const f = a.helicoptero;
  const b = f ? bandasDelRotor(f) : { sinMotor: [90, 110] as const, conMotor: [95, 105] as const };
  let nf = "";
  for (let i = 0; i < motores; i++)
    nf += `<g data-vms-nf="${i}" transform="rotate(${INICIO})"><path class="vms__aguja-nf" d="M0 ${(-r * 0.2).toFixed(1)} L0 ${(-r * 0.92).toFixed(1)}" /></g>`;
  const y = cy + r + 16;
  return `
    <g data-vms="rotor" data-explica="rotor" data-explica-fondo>
      ${toque(1)}
      <circle cx="${cx}" cy="${cy}" r="${r}" class="cr__dial" />
      ${arco(cx, cy, r - 3, b.sinMotor[0], b.conMotor[0], NR_MAXIMO, "cr__arco cr__arco--ambar vms__arco")}
      ${arco(cx, cy, r - 3, b.conMotor[0], b.conMotor[1], NR_MAXIMO, "cr__arco cr__arco--verde")}
      ${arco(cx, cy, r - 3, b.conMotor[1], b.sinMotor[1], NR_MAXIMO, "cr__arco cr__arco--ambar vms__arco")}
      ${escala(cx, cy, r, NR_MAXIMO, 10, 40)}
      ${raya(cx, cy, r, b.sinMotor[0], NR_MAXIMO, 12, 3, "cr__limite")}
      ${raya(cx, cy, r, b.sinMotor[1], NR_MAXIMO, 12, 3, "cr__limite")}
      <text x="${cx}" y="${cy + 34}" ${MARCA_ROTULO} class="cr__rotulo vms__rotulo-nr" text-anchor="middle">NR</text>
      <text x="${cx}" y="${cy + 48}" ${MARCA_ROTULO} class="cr__rotulo vms__rotulo-nf" text-anchor="middle">NF</text>
      <g transform="translate(${cx} ${cy})">
        <g data-vms-nr="" transform="rotate(${INICIO})"><path class="cr__aguja" d="${aguja(r, 6, 0.8)}" /></g>
        ${nf}
      </g>
      <circle cx="${cx}" cy="${cy}" r="5" class="cr__buje" />
      <g data-vms-lectura="nr">
        <rect x="${cx - 44}" y="${y}" width="88" height="30" rx="2" class="vms__caja" />
        <text data-vms-nr-cifra="" x="${cx + 18}" y="${y + 23}" ${MARCA_CIFRA}
              class="cr__valor vms__valor" text-anchor="end"></text>
        <text x="${cx + 22}" y="${y + 22}" ${MARCA_CIFRA} class="cr__cifra" text-anchor="start">%</text>
      </g>
    </g>`;
}

/** La VMS entera, para una pantalla de `ancho` por `alto`. */
export function pantallaVms(ancho: number, alto: number, a: AircraftConfig): string {
  const motores = a.helicoptero?.motores.cuantos ?? a.motores;
  return `
    <!--
      Sin data-explica en el fondo: la explicación es la de cada dial, y la
      de «motor» habla de RPM y de N1, que esta pantalla no enseña.
    -->
    <rect data-fondo="vms" width="${ancho}" height="${alto}" rx="6" fill="${PALETA.pantalla}" />
    <line x1="${ancho / 2}" y1="26" x2="${ancho / 2}" y2="${DIALES_DE_LA_VMS.fli.cy + RADIO_DE_LA_VMS + 100}" class="vms__raya" />
    ${dialDelFli(motores)}
    ${dialDelRotor(a, motores)}
    ${reglaDeCombustible(56, alto - 58, ancho - 96, 16)}
  `;
}
