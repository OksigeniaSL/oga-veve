/**
 * **La hoja de carga, dibujada**: la gente que sube, el depósito, la báscula
 * con su raya del peso máximo y la pista con la barra de lo que pide hoy.
 *
 * Se juega sin saber leer, así que lo que decide se ve sin una letra: los
 * asientos se encienden al subir gente, la báscula pasa o no pasa de su raya y
 * la barra de la pista se sale o no del final del asfalto. Lo demás se suma con
 * el peldaño, como manda `flight/escalera.ts`: una palabra en el segundo, los
 * kilos y los metros en el tercero y los rótulos de un despacho de verdad
 * —TOW, MTOW, TORA, que no se traducen— en el cuarto.
 *
 * Ámbar y no rojo cuando no cabe: no es una emergencia, es una decisión que se
 * toma en tierra con tiempo, y se arregla con un dedo.
 *
 * Este módulo solo pinta: las cuentas son de `flight/hoja-de-carga.ts`.
 */

import type { AircraftConfig } from "../flight/aircraft";
import { canalesDe, type Peldano } from "../flight/escalera";
import {
  ADULTO,
  cargaDeSuTipo,
  MALETA,
  pesar,
  pistaDeHoy,
  type AireDelCampo,
  type Hoja,
  type Pesada,
} from "../flight/hoja-de-carga";
import { loQueCabe } from "../flight/combustible";
import {
  centradoDeSuTipo,
  centroDeGravedad,
  conAmarre,
  conBodega,
  dondeCae,
  enLaCuerda,
  limitesDelCentrado,
  pasarDeFila,
  pasajerosDelReparto,
  repartoConGente,
  repartoQueVale,
  todoAmarrado,
  type CentradoDeSuTipo,
  type CentroDeGravedad,
  type Reparto,
} from "../flight/centrado";
import { getLocale, t } from "../i18n";

/** El idioma de las cifras: el guaraní escribe los números como el castellano de allí. */
const idioma = (): string => (getLocale() === "gug" ? "es-PY" : getLocale());

/** Lo que la hoja necesita saber del vuelo para pintarse. */
export interface VueloDeLaHoja {
  readonly avion: AircraftConfig;
  readonly hoja: Hoja;
  /** El combustible del plan del destino elegido, sin el tope del peso, kg. */
  readonly delPlan: number;
  /** La TORA del campo de salida, m. */
  readonly tora: number;
  readonly aire: AireDelCampo;
  readonly peldano: Peldano;
}

/** Lo que sale de la hoja: la báscula y la pista. */
export interface Veredicto {
  readonly pesada: Pesada;
  /** La pista que pide hoy con ese peso, m. */
  readonly pide: number;
  readonly hay: number;
  readonly cabePista: boolean;
}

export function veredicto(v: VueloDeLaHoja): Veredicto {
  const pesada = pesar(v.avion, v.hoja, v.delPlan);
  const pide = pistaDeHoy(v.avion, pesada.despegue, v.aire);
  return { pesada, pide, hay: v.tora, cabePista: pide <= v.tora };
}

const kg = (n: number): string => `${Math.round(n).toLocaleString(idioma())} kg`;
const m = (n: number): string => `${Math.round(n).toLocaleString(idioma())} m`;

/** La silueta de una persona, para el renglón de la gente y el botón de quitar. */
export const PERSONA = `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="7" r="3.5" />
    <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
  </svg>`;

/** Una maleta: el paso de la hoja en el inicio del hangar. */
export const PASO_CARGA = `
  <svg class="paso__icono" viewBox="0 0 24 24" aria-hidden="true" fill="none"
       stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3.5" y="7" width="17" height="13" rx="2.5" />
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
    <path d="M8 7v13M16 7v13" />
  </svg>`;

const SURTIDOR = `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
       stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M4 21h12M8 8h4" />
    <path d="M15 11h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V9l-3-3" />
  </svg>`;

/** Un depósito dibujado a medias o lleno: las dos maneras de cargar. */
const tanque = (lleno: boolean): string => `
  <svg class="hoja__tanque" viewBox="0 0 40 20" aria-hidden="true">
    <rect x="1" y="2" width="34" height="16" rx="4" class="hoja__tanque-caja" />
    <rect x="3" y="4" width="${lleno ? 30 : 15}" height="12" rx="2.5" class="hoja__tanque-nivel" />
    <rect x="35.5" y="7" width="3.5" height="6" rx="1.2" class="hoja__tanque-caja" />
  </svg>`;

/**
 * Los asientos de pasaje, encendidos los que van ocupados. Hasta veinte en una
 * fila; más, en cuatro, como se ve una cabina desde arriba; y en un avión de
 * dos pasillos, en ocho, que con cuatro los asientos del 747 salían de un
 * píxel.
 */
function asientos(plazas: number, ocupados: number): string {
  const filas = plazas > 200 ? 8 : plazas > 20 ? 4 : 1;
  const columnas = Math.ceil(plazas / filas);
  const w = columnas * 10;
  const h = filas * 12;
  let s = "";
  for (let i = 0; i < plazas; i++) {
    // Se llenan de delante atrás: columna a columna, como embarca un avión.
    const c = Math.floor(i / filas);
    const f = i % filas;
    s += `<rect x="${c * 10 + 1.5}" y="${f * 12 + 1.5}" width="7" height="9" rx="2.2"
                class="hoja__asiento${i < ocupados ? " hoja__asiento--ocupado" : ""}" />`;
  }
  return `<svg class="hoja__asientos" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMid meet" aria-hidden="true">${s}</svg>`;
}

/**
 * **La báscula**: el avión vacío, la gente y el combustible, uno detrás de
 * otro, contra la raya del peso máximo. Lo que pasa de la raya, rayado en
 * ámbar.
 */
function bascula(p: Pesada, cifras: boolean, cabina: boolean, gente: number): string {
  const max = p.maximo ?? p.despegue;
  const tope = Math.max(max * 1.12, p.despegue * 1.03);
  const pct = (x: number): string => `${((x / tope) * 100).toFixed(2)}%`;
  const vacio = p.sinCombustible - gente;
  return `
    <div class="hoja__bascula${p.cabe ? "" : " hoja__bascula--pasa"}">
      <div class="hoja__balanza" aria-hidden="true">
        <div class="hoja__barra">
          <i class="hoja__vacio" style="width: ${pct(vacio)}"></i>
          <i class="hoja__gente" style="width: ${pct(gente)}"></i>
          <i class="hoja__combustible" style="width: ${pct(p.combustible)}"></i>
          ${p.deMas > 0 ? `<i class="hoja__demas" style="left: ${pct(max)}; width: ${pct(p.deMas)}"></i>` : ""}
        </div>
        ${p.maximo !== null ? `<b class="hoja__raya" style="left: ${pct(max)}"></b>` : ""}
      </div>
      ${
        cifras
          ? `<div class="hoja__cifras">
              <span>${cabina ? "TOW " : ""}<b>${kg(p.despegue)}</b></span>
              ${p.maximo !== null ? `<span>${cabina ? "MTOW " : ""}${kg(p.maximo)}</span>` : ""}
            </div>`
          : ""
      }
    </div>`;
}

/**
 * **La pista**: el asfalto de la TORA, de izquierda a derecha, y debajo la
 * barra de lo que pide hoy con su avión al final. Si la barra se sale del
 * asfalto, se sale de verdad: por encima de la hierba, en ámbar.
 */
function pista(v: Veredicto, hierba: boolean, cifras: boolean, cabina: boolean): string {
  // De HTML y no de SVG estirado: el avión del final de la barra no se deforma
  // por ancha que sea la pantalla.
  const tope = Math.max(v.hay, v.pide) * 1.08;
  const pct = (x: number): string => `${((x / tope) * 100).toFixed(2)}%`;
  return `
    <div class="hoja__pista${v.cabePista ? "" : " hoja__pista--corta"}">
      <div class="hoja__campo" aria-hidden="true">
        <i class="hoja__asfalto${hierba ? " hoja__asfalto--hierba" : ""}" style="width: ${pct(v.hay)}"></i>
        <b class="hoja__fin" style="left: ${pct(v.hay)}"></b>
      </div>
      <div class="hoja__carrera" aria-hidden="true">
        <i class="hoja__pide" style="width: ${pct(v.pide)}"></i>
        <span class="hoja__avioncito" style="left: ${pct(v.pide)}">
          <svg viewBox="0 0 24 24"><g transform="rotate(-12 12 13)"><path d="M2 12h3.2l1.6-4h2.1l-.6 4h8.9c2.3 0 4.3.8 4.3 1.6s-2 1.6-4.3 1.6H2.8z" /><path d="M9.5 14.6h3.2l-2.6 4.6H8.2z" /></g></svg>
        </span>
      </div>
      ${
        cifras
          ? `<div class="hoja__cifras">
              <span><b>${m(v.pide)}</b></span>
              <span>${cabina ? "TORA " : ""}${m(v.hay)}</span>
            </div>`
          : ""
      }
    </div>`;
}

/*
 * ── El centrado: no es cuánto pesa, es dónde está ──
 *
 * Desde Taguató, y en el avión que tiene su hoja de peso y centrado leída en
 * el manual (`flight/centrado.ts`), la hoja enseña dónde va cada uno: el
 * avión visto desde arriba con sus filas y sus bodegas, que se tocan con el
 * dedo, y al lado la envolvente de su manual con el punto del centro de
 * gravedad. El punto se mueve al pasar a alguien atrás, y si se sale de la
 * zona se ve en ámbar y se dice con calma, como la barra de la pista: no es
 * una emergencia, es una decisión de tierra que se arregla con un dedo.
 *
 * Y se puede salir igual. El avión vuela lo que dice el modelo, que con la
 * cola pesada es justo lo que el #91 quiere que se note (ADR 0033): las
 * normas se muestran, no se imponen. Es la misma regla que la hoja aplica al
 * peso máximo, que tampoco frena el despegue.
 */

/**
 * **Si la hoja enseña dónde va cada uno**: desde el peldaño de las cifras, que
 * es el de la hoja con su zona buena en el #91, y solo en el avión con hoja de
 * centrado en su manual y con renglón de gente.
 */
export function llevaCentrado(avion: AircraftConfig, peldano: Peldano): boolean {
  return canalesDe(peldano).cifra && centradoDeSuTipo(avion) !== null && cargaDeSuTipo(avion) !== null;
}

/**
 * **La hoja que vale en este peldaño**: sin el reparto donde la hoja no lo
 * enseña. Lo que no se ve no se elige: quien baja a Tukã con alguien sentado
 * atrás vuela con la gente sentada como siempre, que es lo que su hoja dice.
 */
export function hojaDelPeldano(avion: AircraftConfig, hoja: Hoja, peldano: Peldano): Hoja {
  if (!hoja.reparto || llevaCentrado(avion, peldano)) return hoja;
  const { reparto: _quitado, ...sinReparto } = hoja;
  return sinReparto;
}

/** Las maletas que caben en el dibujo de cada bodega: más no se ven, y pasar de ahí no enseña nada nuevo. */
export const MALETAS_POR_BODEGA = 6;

/** La hoja con su reparto puesto, que es con lo que trabajan los toques. */
function conReparto(hoja: Hoja, r: Reparto): Hoja {
  return { ...hoja, pasajeros: pasajerosDelReparto(r), reparto: r };
}

/**
 * **Tocar un asiento de pasaje**: si hay alguien, pasa a la fila de al lado
 * que tenga sitio; si está libre, viene alguien de otra fila. Es pasar a una
 * persona de delante a atrás con un dedo. Si no hay nadie que traer, sube uno
 * y se sienta ahí, que es lo que espera quien toca un asiento vacío.
 */
export function tocarAsiento(avion: AircraftConfig, hoja: Hoja, fila: number, asiento: number): Hoja {
  const t = centradoDeSuTipo(avion);
  if (!t || !t.filas[fila]) return hoja;
  const r = repartoQueVale(t, hoja.pasajeros, hoja.reparto);
  const aqui = r.filas[fila] ?? 0;
  // Las otras filas, de la más cercana a la más lejana; a igual distancia, la de atrás.
  const otras = t.filas
    .map((_, i) => i)
    .filter((i) => i !== fila)
    .sort((a, b) => Math.abs(a - fila) - Math.abs(b - fila) || b - a);
  if (asiento < aqui) {
    const hasta = otras.find((i) => (r.filas[i] ?? 0) < t.filas[i]!.asientos);
    return hasta === undefined ? hoja : conReparto(hoja, pasarDeFila(t, r, fila, hasta));
  }
  const desde = otras.find((i) => (r.filas[i] ?? 0) > 0);
  if (desde !== undefined) return conReparto(hoja, pasarDeFila(t, r, desde, fila));
  const filas = r.filas.slice();
  filas[fila] = aqui + 1;
  return conReparto(hoja, { ...r, filas, bodegas: r.bodegas ?? [] });
}

/** **Poner o sacar una maleta de una bodega**, de las de bodega de la hoja de carga, 11 kg. */
export function tocarBodega(avion: AircraftConfig, hoja: Hoja, bodega: number, maletas: number): Hoja {
  const t = centradoDeSuTipo(avion);
  if (!t) return hoja;
  const r = repartoQueVale(t, hoja.pasajeros, hoja.reparto);
  const hay = Math.round((r.bodegas?.[bodega] ?? 0) / MALETA);
  const quedan = Math.max(0, Math.min(MALETAS_POR_BODEGA, hay + maletas));
  return conReparto(hoja, conBodega(t, r, bodega, quedan * MALETA));
}

/**
 * **Amarrar o soltar las maletas**, con las anillas del suelo y la red de la
 * bodega. No mueve el centro: lo que cambia es que en el ejercicio de la
 * carga suelta, lo amarrado no se corre. Ver `flight/carga-suelta.ts`.
 */
export function amarrarEnLaHoja(avion: AircraftConfig, hoja: Hoja, amarrada: boolean): Hoja {
  const t = centradoDeSuTipo(avion);
  if (!t) return hoja;
  return conReparto(hoja, conAmarre(t, repartoQueVale(t, hoja.pasajeros, hoja.reparto), amarrada));
}

/** **Pasar a uno de una fila a otra**, que es el arreglo de un centro que se fue. */
export function pasarEnLaHoja(avion: AircraftConfig, hoja: Hoja, desde: number, hasta: number): Hoja {
  const t = centradoDeSuTipo(avion);
  if (!t) return hoja;
  return conReparto(hoja, pasarDeFila(t, repartoQueVale(t, hoja.pasajeros, hoja.reparto), desde, hasta));
}

/**
 * **La hoja con otra cuenta de gente**, sin deshacer el reparto: el
 * deslizador y el arreglo de bajar gente cambian cuántos van, y lo que se
 * movió a mano se queda. Ver `repartoConGente`.
 */
export function conGente(avion: AircraftConfig, hoja: Hoja, pasajeros: number): Hoja {
  const t = centradoDeSuTipo(avion);
  if (!t || !hoja.reparto) return { ...hoja, pasajeros };
  return conReparto(hoja, repartoConGente(t, hoja.reparto, pasajeros));
}

/** Lo que la hoja sabe del centrado de hoy. */
export interface Centro {
  readonly tipo: CentradoDeSuTipo;
  readonly reparto: Reparto;
  readonly cg: CentroDeGravedad;
  readonly donde: "dentro" | "delante" | "detras";
  /**
   * **La bodega que pasa de su rótulo**, o las dos juntas, o `null`. El
   * modelo no lee rótulos (`repartoQueVale`), y por eso lo dice la hoja: el
   * piso de una bodega está hecho para lo que pone su rótulo.
   */
  readonly bodegaDeMas: {
    readonly bodega: number;
    readonly juntas: boolean;
    readonly admite: number;
    readonly lleva: number;
  } | null;
}

/** El centro de gravedad al soltar frenos, con el combustible que se carga; `null` donde la hoja no lo enseña. */
export function centroDeLaHoja(v: VueloDeLaHoja, pesada: Pesada): Centro | null {
  if (!llevaCentrado(v.avion, v.peldano)) return null;
  const tipo = centradoDeSuTipo(v.avion)!;
  const plazas = cargaDeSuTipo(v.avion)!.plazas;
  const reparto = repartoQueVale(tipo, Math.max(0, Math.min(plazas, v.hoja.pasajeros)), v.hoja.reparto);
  const cg = centroDeGravedad(tipo, reparto, pesada.combustible);
  let bodegaDeMas: Centro["bodegaDeMas"] = null;
  let juntas = 0;
  let ultima = -1;
  tipo.bodegas.forEach((b, i) => {
    const kg = reparto.bodegas?.[i] ?? 0;
    juntas += kg;
    if (kg > 0) ultima = i;
    if (!bodegaDeMas && kg > b.maximo + 0.5)
      bodegaDeMas = { bodega: i, juntas: false, admite: b.maximo, lleva: kg };
  });
  if (!bodegaDeMas && juntas > tipo.bodegaMaxima + 0.5)
    bodegaDeMas = { bodega: ultima, juntas: true, admite: tipo.bodegaMaxima, lleva: juntas };
  return { tipo, reparto, cg, donde: dondeCae(tipo, cg), bodegaDeMas };
}

/**
 * **El arreglo de un centro que se fue**, a un toque, como el de la gente: con
 * la cola pesada, pasar adelante al de más atrás si delante hay sitio, y si
 * no, sacar una maleta de la bodega de más atrás; con el morro pesado, pasar a
 * uno atrás. Un paso cada toque: si con uno no basta, el botón sigue ahí.
 */
function arregloDelCentro(c: Centro): string {
  const { tipo, reparto } = c;
  const sacar = (b: number): string =>
    `<button class="hoja__arreglo" type="button" data-hoja-maleta="${b},-1"
             aria-label="${t("hoja.maleta.sacar", { n: b + 1 })}">
       <span class="hoja__menos">−</span>${MALETA_SVG}
     </button>`;
  // Con el centro en su zona, lo que queda es la bodega que pasa de su rótulo.
  if (c.donde === "dentro") return c.bodegaDeMas ? sacar(c.bodegaDeMas.bodega) : "";
  const filas = reparto.filas;
  let pasar: [number, number] | null = null;
  if (c.donde === "detras") {
    for (let de = filas.length - 1; de > 0 && !pasar; de--) {
      if ((filas[de] ?? 0) === 0) continue;
      for (let a = 0; a < de; a++)
        if ((filas[a] ?? 0) < tipo.filas[a]!.asientos) {
          pasar = [de, a];
          break;
        }
    }
  } else if (c.donde === "delante") {
    for (let de = 0; de < filas.length - 1 && !pasar; de++) {
      if ((filas[de] ?? 0) === 0) continue;
      for (let a = filas.length - 1; a > de; a--)
        if ((filas[a] ?? 0) < tipo.filas[a]!.asientos) {
          pasar = [de, a];
          break;
        }
    }
  }
  if (pasar)
    return `<button class="hoja__arreglo" type="button" data-hoja-pasar="${pasar[0]},${pasar[1]}"
                    aria-label="${t(c.donde === "detras" ? "hoja.centro.adelante" : "hoja.centro.atras")}">
              <span class="hoja__menos">${c.donde === "detras" ? "←" : "→"}</span>${PERSONA}
            </button>`;
  if (c.donde !== "detras") return "";
  const bodegas = reparto.bodegas ?? [];
  for (let b = bodegas.length - 1; b >= 0; b--) if ((bodegas[b] ?? 0) > 0) return sacar(b);
  return "";
}

/** Una maleta de bodega, con su asa. */
const MALETA_SVG = `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
       stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="8" width="16" height="12" rx="2.5" />
    <path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2" />
  </svg>`;

/** El asiento visto desde arriba: el respaldo y la persona, si va alguien. */
const asientoVisto = (ocupado: boolean, piloto = false): string => `
  <svg class="hoja__plaza${ocupado ? " hoja__plaza--ocupada" : ""}${piloto ? " hoja__plaza--piloto" : ""}"
       viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="3" width="17" height="18" rx="4" class="hoja__plaza-asiento" />
    <rect x="17" y="3" width="4" height="18" rx="2" class="hoja__plaza-respaldo" />
    ${ocupado ? `<circle cx="12" cy="12" r="4.6" class="hoja__plaza-cabeza" /><path d="M7 5.5 L13 8 M7 18.5 L13 16" class="hoja__plaza-brazos" />` : ""}
  </svg>`;

/**
 * **Dónde cae cada brazo en el dibujo**, en % del ancho. El dibujo no va a
 * escala: con la cabina del 172 a escala, los asientos de atrás y la bodega 1
 * caían a un dedo uno de otro. Así que cada columna —los asientos de delante,
 * los de atrás y cada bodega— va a la misma distancia, y entre una y otra el
 * brazo se reparte en recta. El orden y el lado de cada cosa son los de
 * verdad; el centro de gravedad cae entre las columnas que le tocan.
 */
function escalaDelDibujo(tipo: CentradoDeSuTipo): (brazo: number) => number {
  const brazos = [tipo.tripulacion.brazo, ...tipo.filas.map((f) => f.brazo), ...tipo.bodegas.map((b) => b.brazo)]
    .sort((a, b) => a - b)
    .filter((b, i, todos) => i === 0 || b - todos[i - 1]! > 0.05);
  // De la primera a la última columna, casi todo el ancho: en un teléfono tumbado el avión mide 260 px y cada botón 46.
  const DESDE = 22;
  const HASTA = 84;
  const paso = brazos.length > 1 ? (HASTA - DESDE) / (brazos.length - 1) : 0;
  const puntos = brazos.map((b, i) => [b, DESDE + i * paso] as const);
  return (brazo) => {
    if (puntos.length < 2) return DESDE;
    let i = 1;
    while (i < puntos.length - 1 && brazo > puntos[i]![0]) i++;
    const [b0, x0] = puntos[i - 1]!;
    const [b1, x1] = puntos[i]!;
    return Math.max(2, Math.min(98, x0 + ((x1 - x0) * (brazo - b0)) / (b1 - b0)));
  };
}

/**
 * **El último centro pintado**, para que el punto se vea ir de donde estaba a
 * donde está: la vista se repinta entera con cada toque, y sin esto el punto
 * saltaría sin que se viera moverse.
 */
let centroPintado: { readonly avion: string; readonly brazo: number; readonly masa: number } | null = null;

/**
 * **El avión visto desde arriba**, con sus filas y sus bodegas: los asientos
 * de pasaje y las bodegas son botones del tamaño del dedo; el de quien pilota
 * se ve y no se toca. Encima, la zona buena con la masa de hoy y el símbolo
 * del centro de gravedad, el de los manuales, que se corre al pasar a alguien
 * atrás.
 */
function planta(c: Centro, x: (brazo: number) => number, desde: number | null): string {
  const { tipo, reparto, cg } = c;
  const fuera = c.donde !== "dentro";
  const limites = limitesDelCentrado(tipo, cg.masa);
  /*
   * Dos asientos por columna, uno encima de otro. Con el morro a la
   * izquierda, el lado izquierdo del avión queda abajo: ahí va quien pilota,
   * en el asiento de la izquierda, y ahí se sienta el primero de cada fila.
   */
  const ARRIBA = "calc(50% - 46px)";
  const ABAJO = "50%";
  const boton = (izq: number, top: string, html: string): string =>
    `<span class="hoja__hueco" style="left: ${izq.toFixed(2)}%; top: ${top}">${html}</span>`;
  let piezas = "";
  // Quien pilota, en su asiento, y el pasaje que va en su misma fila, al lado.
  const piloto = x(tipo.tripulacion.brazo);
  for (let i = 0; i < tipo.tripulacion.personas; i++)
    piezas += boton(piloto, i % 2 ? ARRIBA : ABAJO, `<span class="hoja__piloto">${asientoVisto(true, true)}</span>`);
  tipo.filas.forEach((f, fila) => {
    const conPiloto =
      Math.abs(f.brazo - tipo.tripulacion.brazo) < 0.05 ? tipo.tripulacion.personas : 0;
    const ocupados = reparto.filas[fila] ?? 0;
    for (let i = 0; i < f.asientos; i++) {
      const lugar = conPiloto + i;
      const ocupado = i < ocupados;
      piezas += boton(
        x(f.brazo),
        lugar % 2 ? ARRIBA : ABAJO,
        `<button class="hoja__toque hoja__toque--asiento" type="button"
                 data-hoja-asiento="${fila},${i}" aria-pressed="${ocupado}"
                 aria-label="${t(ocupado ? "hoja.asiento.ocupado" : "hoja.asiento.libre")}">
           ${asientoVisto(ocupado)}
         </button>`,
      );
    }
  });
  // Las bodegas: arriba se pone una maleta y abajo se saca. Las que pasan del rótulo, en ámbar.
  let enBodega = 0;
  tipo.bodegas.forEach((b, i) => {
    const kg = reparto.bodegas?.[i] ?? 0;
    const n = Math.round(kg / MALETA);
    let maletas = "";
    for (let k = 0; k < Math.min(n, MALETAS_POR_BODEGA); k++) {
      const hasta = (k + 1) * MALETA;
      const demas = hasta > b.maximo + 0.5 || enBodega + hasta > tipo.bodegaMaxima + 0.5;
      maletas += `<i class="hoja__maleta${demas ? " hoja__maleta--demas" : ""}"></i>`;
    }
    enBodega += n * MALETA;
    // Las amarradas, con la cinta de la red por encima.
    const amarrada = n > 0 && reparto.amarradas?.[i] === true;
    piezas += boton(
      x(b.brazo),
      ARRIBA,
      `<button class="hoja__toque hoja__toque--bodega" type="button" data-hoja-maleta="${i},1"
               aria-label="${t("hoja.maleta.poner", { n: i + 1 })}">
         <span class="hoja__maletas${amarrada ? " hoja__maletas--amarradas" : ""}">${maletas}</span><span class="hoja__mas">+</span>
       </button>`,
    );
    piezas += boton(
      x(b.brazo),
      ABAJO,
      `<button class="hoja__toque hoja__toque--sacar" type="button" data-hoja-maleta="${i},-1"
               aria-label="${t("hoja.maleta.sacar", { n: i + 1 })}"${n > 0 ? "" : " disabled"}>
         <span class="hoja__menos">−</span>${MALETA_SVG}
       </button>`,
    );
  });
  const ala = { de: x(tipo.cuerda.borde), a: x(tipo.cuerda.borde + tipo.cuerda.media) };
  const aqui = x(cg.brazo);
  const mueve = desde !== null && Math.abs(desde - aqui) > 0.01;
  return `
    <div class="hoja__planta${fuera ? " hoja__planta--fuera" : ""}">
      <svg class="hoja__silueta" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="hoja__ala" vector-effect="non-scaling-stroke"
              d="M${ala.de.toFixed(1)},4 Q${ala.de.toFixed(1)},1 ${(ala.de + 1.5).toFixed(1)},1 L${(ala.a - 1.5).toFixed(1)},1 Q${ala.a.toFixed(1)},1 ${ala.a.toFixed(1)},4 L${ala.a.toFixed(1)},96 Q${ala.a.toFixed(1)},99 ${(ala.a - 1.5).toFixed(1)},99 L${(ala.de + 1.5).toFixed(1)},99 Q${ala.de.toFixed(1)},99 ${ala.de.toFixed(1)},96 Z" />
        <path class="hoja__fuselaje" vector-effect="non-scaling-stroke"
              d="M4,38 Q2.5,50 4,62 L13,74 L19,77 L84,75 L97,57 L97,43 L84,25 L19,23 L13,26 Z" />
        <path class="hoja__cola" vector-effect="non-scaling-stroke"
              d="M88,30 L93,22 L97,22 L97,78 L93,78 L88,70 Z" />
        <path class="hoja__helice" vector-effect="non-scaling-stroke" d="M2,26 L2,74" />
      </svg>
      <i class="hoja__zona" style="left: ${x(limites.delante).toFixed(2)}%; width: ${(x(limites.detras) - x(limites.delante)).toFixed(2)}%"></i>
      ${piezas}
      <i class="hoja__cg${fuera ? " hoja__cg--fuera" : ""}${mueve ? " hoja__cg--mueve" : ""}"
         style="left: ${aqui.toFixed(2)}%${mueve ? `; --desde: ${desde!.toFixed(2)}%` : ""}"></i>
    </div>`;
}

/**
 * **La envolvente de su manual**, dibujada de verdad: el peso hacia arriba y
 * el brazo a lo ancho, el límite delantero que se inclina con el peso, el
 * trasero, recto, y arriba el peso máximo. Abajo no tiene borde, porque el
 * manual no pone límite por abajo: es solo donde acaba el dibujo. Y el punto
 * del centro de gravedad de hoy, verde dentro y ámbar fuera.
 */
function envolvente(
  c: Centro,
  antes: { readonly brazo: number; readonly masa: number } | null,
): string {
  const { tipo, cg } = c;
  const delante = tipo.envolvente.delante;
  const detras = tipo.envolvente.detras;
  const arriba = Math.max(delante[delante.length - 1]![0], detras[detras.length - 1]![0]);
  const vacio = tipo.vacio.masa + tipo.tripulacion.personas * ADULTO;
  const masaDe = Math.min(vacio, cg.masa) - 40;
  const masaA = Math.max(arriba, cg.masa) + 40;
  const enMasa = (m: number) => limitesDelCentrado(tipo, m);
  const brazoDe = Math.min(enMasa(masaDe).delante, cg.brazo) - 0.04;
  const brazoA = Math.max(enMasa(arriba).detras, cg.brazo) + 0.05;
  const W = 160;
  const H = 100;
  const X = (b: number): number => 6 + ((b - brazoDe) / (brazoA - brazoDe)) * (W - 12);
  const Y = (m: number): number => H - 6 - ((m - masaDe) / (masaA - masaDe)) * (H - 12);
  const p = (b: number, m: number): string => `${X(b).toFixed(1)},${Y(m).toFixed(1)}`;
  const borde = [
    p(enMasa(masaDe).delante, masaDe),
    ...delante.filter(([m]) => m > masaDe).map(([m, b]) => p(b, m)),
    ...[...detras].reverse().filter(([m]) => m > masaDe).map(([m, b]) => p(b, m)),
    p(enMasa(masaDe).detras, masaDe),
  ];
  const fuera = c.donde !== "dentro" || cg.masa > arriba + 0.5;
  const dx = antes ? X(antes.brazo) - X(cg.brazo) : 0;
  const dy = antes ? Y(antes.masa) - Y(cg.masa) : 0;
  const mueve = Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;
  return `
    <svg class="hoja__envolvente${fuera ? " hoja__envolvente--fuera" : ""}" viewBox="0 0 ${W} ${H}"
         role="img" aria-label="${t("hoja.zona")}">
      <line class="hoja__eje" x1="2" y1="${H - 2}" x2="${W - 2}" y2="${H - 2}" />
      <line class="hoja__eje" x1="2" y1="2" x2="2" y2="${H - 2}" />
      <line class="hoja__techo" x1="2" y1="${Y(arriba).toFixed(1)}" x2="${W - 2}" y2="${Y(arriba).toFixed(1)}" />
      <polygon class="hoja__buena" points="${borde.join(" ")}" />
      <polyline class="hoja__borde" points="${borde.join(" ")}" />
      <circle class="hoja__punto${fuera ? " hoja__punto--fuera" : ""}${mueve ? " hoja__punto--mueve" : ""}" cx="${X(cg.brazo).toFixed(1)}"
              cy="${Y(cg.masa).toFixed(1)}" r="6"${mueve ? ` style="--dx: ${dx.toFixed(1)}; --dy: ${dy.toFixed(1)}"` : ""} />
    </svg>`;
}

/**
 * **El bloque entero del centrado**: el avión, la envolvente y, con las
 * cifras, dónde está el centro y la zona buena con este peso. En el peldaño
 * de cabina, como en un despacho de verdad: CG y % MAC, que no se traducen.
 */
function vistaDelCentrado(v: VueloDeLaHoja, c: Centro): string {
  const canales = canalesDe(v.peldano);
  const x = escalaDelDibujo(c.tipo);
  const antes = centroPintado?.avion === v.avion.id ? centroPintado : null;
  centroPintado = { avion: v.avion.id, brazo: c.cg.brazo, masa: c.cg.masa };
  const l = limitesDelCentrado(c.tipo, c.cg.masa);
  const cm = (b: number): string => `${Math.round(b * 100).toLocaleString(idioma())} cm`;
  const mac = (b: number): string =>
    `${(enLaCuerda(c.tipo, b) * 100).toLocaleString(idioma(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
  return `
    <div class="hoja__centrado" role="group" aria-label="${t("hoja.centro")}">
      ${planta(c, x, antes ? x(antes.brazo) : null)}
      <div class="hoja__grafica">
        ${envolvente(c, antes)}
        ${
          canales.cifra
            ? `<div class="hoja__cifras">
                <span>${canales.cabina ? "CG " : ""}<b>${cm(c.cg.brazo)}</b>${canales.cabina ? ` · ${mac(c.cg.brazo)} MAC` : ""}</span>
                <span>${Math.round(l.delante * 100).toLocaleString(idioma())}–${cm(l.detras)}</span>
              </div>`
            : ""
        }
        ${amarre(c)}
      </div>
    </div>`;
}

/**
 * **El amarre de las maletas**, si las hay: un toque las amarra con la red y
 * otro las suelta. Se ve en el dibujo —la cinta por encima de las maletas,
 * aquí y en las bodegas del avión— y la palabra acompaña. Amarrar no mueve el
 * centro: es lo que decide si en vuelo se corren. Ver `flight/carga-suelta.ts`.
 */
function amarre(c: Centro): string {
  const hay = (c.reparto.bodegas ?? []).some((kg) => kg > 0);
  if (!hay) return "";
  const todas = todoAmarrado(c.tipo, c.reparto);
  return `
    <button class="hoja__amarre" type="button" data-hoja-amarre="${todas ? "0" : "1"}"
            aria-pressed="${todas}" aria-label="${t("hoja.amarrar")}">
      <span class="hoja__maletas${todas ? " hoja__maletas--amarradas" : ""}" aria-hidden="true"><i class="hoja__maleta"></i><i class="hoja__maleta"></i></span>
      <span>${t(todas ? "hoja.amarradas" : "hoja.sueltas")}</span>
    </button>`;
}

/** Qué arregla la hoja, si no cabe: la gente, el depósito o el destino. */
type Arreglo =
  | { readonly como: "nada" }
  | { readonly como: "gente"; readonly cuantos: number }
  | { readonly como: "plan" }
  | { readonly como: "destino" };

/** Si con esta hoja se sale: cabe en el peso, en la pista y llega con la reserva. */
const sale = (r: Veredicto): boolean => r.pesada.cabe && r.cabePista && r.pesada.llega;

/**
 * **El arreglo más pequeño que hace que quepa**, en este orden: si el plan no
 * cabe en los depósitos, un destino más cerca, que es lo único que lo arregla;
 * si se llenaron los depósitos y con lo del vuelo cabe, cargar lo del vuelo; si
 * no, bajar a los pasajeros justos para que quepan el peso y la pista; si ni
 * sin nadie, un destino más cerca, que pide menos combustible.
 */
function arregloDe(v: VueloDeLaHoja, r: Veredicto): Arreglo {
  if (sale(r)) return { como: "nada" };
  if (!r.pesada.llega) return { como: "destino" };
  const cabe = (h: Hoja): boolean => sale(veredicto({ ...v, hoja: h }));
  if (v.hoja.llenos && cabe({ ...v.hoja, llenos: false })) return { como: "plan" };
  const n = Math.round(v.hoja.pasajeros);
  for (let quitar = 1; quitar <= n; quitar++)
    if (cabe({ ...v.hoja, pasajeros: n - quitar })) return { como: "gente", cuantos: quitar };
  return { como: "destino" };
}

/**
 * **Lo que se ve debajo de los mandos**, y se repinta con cada toque: los
 * asientos, la báscula, la pista y el veredicto con su arreglo.
 */
export function vistaDeLaHoja(v: VueloDeLaHoja): string {
  const canales = canalesDe(v.peldano);
  const r = veredicto(v);
  const tipo = cargaDeSuTipo(v.avion);
  const n = tipo ? Math.max(0, Math.min(tipo.plazas, Math.round(v.hoja.pasajeros))) : 0;
  const centro = centroDeLaHoja(v, r.pesada);
  // Las maletas de las bodegas van con la gente: es la carga que se elige.
  const maletas = (centro?.reparto.bodegas ?? []).reduce((s, x) => s + x, 0);
  const gente = tipo ? n * tipo.porPersona + maletas : 0;
  /*
   * **El centro, lo último**: si no llega, pesa de más o le falta pista, eso
   * se dice antes, que es lo que deja el avión en tierra; el centro se mira
   * con lo demás en orden. Una cosa cada vez.
   */
  const centroBien = !centro || (centro.donde === "dentro" && !centro.bodegaDeMas);
  const bien = sale(r) && centroBien;
  const hierba = v.aire.superficie === "hierba";

  const que = arregloDe(v, r);
  // La palabra, en el segundo peldaño; la frase con sus cifras, desde el tercero.
  let texto = "";
  if (canales.texto) {
    // El centrado no llega al peldaño de la palabra (`llevaCentrado`): ahí la hoja es la de siempre.
    if (canales.corto)
      texto = t(
        bien
          ? "hoja.cabe"
          : !r.pesada.llega
            ? "hoja.nollega"
            : !r.pesada.cabe
              ? "hoja.pesado"
              : "hoja.corta",
      );
    else if (bien) texto = t("hoja.cabe.largo");
    /*
     * **Así no sale bien**, y con calma: lo que le pasa al avión y lo que se
     * hace, sin un no ni un rojo. Se puede salir igual, y el avión hará lo
     * que dice la frase.
     */
    else if (sale(r) && centro && centro.donde !== "dentro")
      texto = t(centro.donde === "delante" ? "hoja.centro.delante.largo" : "hoja.centro.detras.largo");
    // Y la bodega que pasa de su rótulo: se ve en las maletas rayadas, y se dice.
    else if (sale(r) && centro?.bodegaDeMas)
      texto = t(centro.bodegaDeMas.juntas ? "hoja.bodegas.largo" : "hoja.bodega.largo", {
        n: centro.bodegaDeMas.bodega + 1,
        admite: kg(centro.bodegaDeMas.admite),
        lleva: kg(centro.bodegaDeMas.lleva),
      });
    /*
     * **No llega con la reserva**: lo primero, porque es lo que no se arregla
     * con la gente ni con los tanques. Lo que pide el plan contra lo que cabe.
     */
    else if (!r.pesada.llega)
      texto = t("hoja.nollega.largo", { pide: kg(r.pesada.pide), cabe: kg(loQueCabe(v.avion)) });
    else if (!r.pesada.cabe)
      texto =
        que.como === "plan"
          ? t("hoja.pesado.llenos", { kg: kg(r.pesada.deMas) })
          : que.como === "gente"
            ? que.cuantos === 1
              ? t("hoja.pesado.uno", { kg: kg(r.pesada.deMas) })
              : t("hoja.pesado.largo", { kg: kg(r.pesada.deMas), n: que.cuantos })
            : t("hoja.pesado.combustible", { kg: kg(r.pesada.deMas) });
    else texto = t("hoja.corta.largo", { pide: m(r.pide), hay: m(r.hay) });
  }

  /*
   * **El arreglo, a un toque**, con su dibujo, que es lo que se entiende sin
   * leer: bajar a los que sobran, cargar solo lo del vuelo en vez de llenar, o
   * ir a elegir un destino más cerca.
   */
  const arreglo =
    que.como === "gente"
      ? `<button class="hoja__arreglo" type="button" data-hoja-quitar="${que.cuantos}"
                 aria-label="${t("hoja.quitar")}">
           <span class="hoja__menos">−</span>${PERSONA}
           ${canales.cifra ? `<span>${que.cuantos}</span>` : ""}
         </button>`
      : que.como === "plan"
        ? `<button class="hoja__arreglo" type="button" data-hoja-llenos="0"
                   aria-label="${t("hoja.plan")}">
             <span class="hoja__menos">−</span>${tanque(false)}
           </button>`
        : que.como === "destino"
          ? `<button class="hoja__arreglo" type="button" data-pantalla="adonde"
                     aria-label="${t("hoja.mascerca")}">
               <span class="hoja__menos">−</span>${SURTIDOR}
             </button>`
          : centro && sale(r) && !centroBien
            ? arregloDelCentro(centro)
            : "";

  /*
   * Con el centrado, el avión visto desde arriba hace de fila de asientos: la
   * misma gente, cada uno en su sitio. Sin él, la fila de siempre.
   */
  return `
    ${
      centro
        ? vistaDelCentrado(v, centro)
        : tipo
          ? `<div class="hoja__cabina">${asientos(tipo.plazas, n)}${
              canales.cifra ? `<span class="hoja__cuenta">${n}/${tipo.plazas}</span>` : ""
            }</div>`
          : ""
    }
    ${bascula(r.pesada, canales.cifra, canales.cabina, gente)}
    ${pista(r, hierba, canales.cifra, canales.cabina)}
    <div class="hoja__veredicto hoja__veredicto--${bien ? "bien" : "no"}" role="status">
      <span class="hoja__sello" aria-hidden="true">${bien ? "✓" : "!"}</span>
      ${texto ? `<span class="hoja__texto">${texto}</span>` : ""}
      ${arreglo}
    </div>`;
}

/**
 * **Los mandos**, que no se repintan mientras se arrastra el dedo: la gente
 * —menos, la barra y más— y las dos maneras de cargar el depósito.
 */
export function mandosDeLaHoja(avion: AircraftConfig, hoja: Hoja, peldano: Peldano): string {
  const canales = canalesDe(peldano);
  const tipo = cargaDeSuTipo(avion);
  const gente = tipo
    ? `
      <div class="hoja__fila">
        <span class="hoja__icono">${PERSONA}</span>
        ${canales.texto && !canales.corto ? `<span class="hoja__rotulo">${t("hoja.gente")}</span>` : ""}
        <button class="hoja__boton" type="button" data-hoja-paso="-1" aria-label="−">−</button>
        <input class="hoja__deslizador" type="range" min="0" max="${tipo.plazas}" step="1"
               value="${Math.round(hoja.pasajeros)}" data-hoja-gente
               aria-label="${t("hoja.gente")}" />
        <button class="hoja__boton" type="button" data-hoja-paso="1" aria-label="+">+</button>
      </div>`
    : canales.texto
      ? `<p class="hoja__nota">${t("hoja.ficha")}</p>`
      : "";
  const opcion = (llenos: boolean): string => `
      <button class="hoja__opcion" type="button" role="radio" aria-checked="${hoja.llenos === llenos}"
              data-hoja-llenos="${llenos ? 1 : 0}"
              aria-label="${t(llenos ? "hoja.llenos" : "hoja.plan")}">
        ${tanque(llenos)}
        ${canales.texto && !canales.corto ? `<span>${t(llenos ? "hoja.llenos" : "hoja.plan")}</span>` : ""}
      </button>`;
  return `
    ${gente}
    <div class="hoja__fila" role="radiogroup" aria-label="${t("hangar.combustible")}">
      <span class="hoja__icono">${SURTIDOR}</span>
      ${opcion(false)}${opcion(true)}
    </div>`;
}
