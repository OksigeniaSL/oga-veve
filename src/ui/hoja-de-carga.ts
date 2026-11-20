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
  cargaDeSuTipo,
  pesar,
  pistaDeHoy,
  type AireDelCampo,
  type Hoja,
  type Pesada,
} from "../flight/hoja-de-carga";
import { loQueCabe } from "../flight/combustible";
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
  const gente = tipo ? n * tipo.porPersona : 0;
  const bien = sale(r);
  const hierba = v.aire.superficie === "hierba";

  const que = arregloDe(v, r);
  // La palabra, en el segundo peldaño; la frase con sus cifras, desde el tercero.
  let texto = "";
  if (canales.texto) {
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
          : "";

  return `
    ${tipo ? `<div class="hoja__cabina">${asientos(tipo.plazas, n)}${
      canales.cifra ? `<span class="hoja__cuenta">${n}/${tipo.plazas}</span>` : ""
    }</div>` : ""}
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
