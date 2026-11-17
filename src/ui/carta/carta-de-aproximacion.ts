/**
 * **La carta de aproximación** (#72): la hoja que se abre desde la ficha de un
 * campo en el calco de la radio, Taguató Ruvichá, y solo ahí. Es la del
 * procedimiento que vuela el juego a la pista en servicio, y la de la otra
 * cabecera si la tiene, con los datos de `world/aproximaciones-publicadas.ts`
 * (ADR 0021, enmiendas H24a y H24b).
 *
 * Lleva lo que lleva una carta IAC, en su sitio:
 *
 * - **la planta**, con el norte arriba: la pista, la derrota de la final y sus
 *   puntos donde dicen sus coordenadas;
 * - **el perfil**, debajo: cada punto con su rótulo (IF, FAP o FAF, MAPt,
 *   THR), su altitud y sus millas; la senda con su ángulo y el RDH; la cota
 *   del umbral; la frustrada subiendo al final; y la tabla de la senda;
 * - **la MSA**, el círculo de la esquina, con su radio, su centro y su
 *   altitud; o la TAA de las RNP de la DINAC, con su nota;
 * - **los mínimos**, «OCA (OCH)» por categoría, con la del avión que va
 *   resaltada, y «N.A» donde la carta lo pone;
 * - **la frustrada**, en inglés y tal cual, con su altitud;
 * - **y al pie**, la carta, su fuente y el descargo.
 *
 * **Lo que la carta no trae no se dibuja.** No hay DA/H, solo OCA/H; las TAA
 * no tienen los límites de sus zonas en grados, así que van como un círculo
 * con su nota; y las de circuito no tienen senda, ni RDH, ni tabla: su perfil
 * acaba en el punto de frustrada, como en su carta. Una altitud que la carta
 * no imprime no lleva cifra, y la línea del perfil no pasa por ella.
 *
 * Todo en inglés aeronáutico, como la carta (regla 3): es para quien ya lee,
 * y es lo que va a encontrarse el día que abra una de verdad.
 */

import type { Scenario } from "../../world/scenarios";
import type { CategoriaDeAproximacion } from "../../flight/aircraft";
import { cabeceraEnUso } from "../../world/cabecera-en-uso";
import { dondeCae } from "../../world/entre-aerodromos";
import {
  APROXIMACIONES,
  gradosDeLaCarta,
  type CartaDeAproximacion,
  type Categoria,
  type Msa,
  type PuntoDelPerfil,
} from "../../world/aproximaciones-publicadas";
import { t } from "../../i18n";

const MILLA = 1852;
const CATEGORIAS: readonly Categoria[] = ["A", "B", "C", "D"];

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Las cabeceras con carta de un campo: la que está en servicio primero. */
export function cabecerasConCarta(e: Scenario): string[] {
  const oaci = e.aerodrome?.id;
  const todas = oaci ? Object.keys(APROXIMACIONES[oaci] ?? {}) : [];
  const enUso = cabeceraEnUso(e);
  return enUso && todas.includes(enUso) ? [enUso, ...todas.filter((c) => c !== enUso)] : todas;
}

/** Cómo se escribe el rótulo de un punto en el perfil: el punto de frustrada es «MAPt», como en la carta. */
const rotuloEscrito = (p: PuntoDelPerfil): string => (p.rotulo === "MAPT" ? "MAPt" : (p.rotulo ?? ""));

/** El nombre del procedimiento, sin la página: «RNP Z RWY 12 (LPV ONLY)». */
function nombreDelProcedimiento(c: CartaDeAproximacion): string {
  const partes = c.carta.split(" · ");
  return partes.slice(1).join(" · ") || c.carta;
}

/**
 * El suplemento que deja fuera de servicio los mínimos LPV de la carta, si lo
 * hay: «SUP 159/26». Sale de su nota, que lo copia del índice del AIP.
 */
export function supDeLaLpv(c: CartaDeAproximacion): string | null {
  for (const n of c.notas ?? []) {
    const m = /^(SUP \d+\/\d+)\b.*LPV minima unserviceable/.exec(n);
    if (m) return m[1] ?? null;
  }
  return null;
}

// ── El perfil ──────────────────────────────────────────────────────────

/** El lienzo del perfil, en unidades del dibujo. */
const PERFIL = { ancho: 360, alto: 172, izq: 10, der: 300, arriba: 46, suelo: 136 } as const;

/**
 * **El perfil vertical**: las millas a lo largo, con el umbral —o el punto de
 * frustrada en una de circuito— a la derecha; las altitudes de alto, de la
 * cota del umbral a la más alta que imprime la carta, la frustrada incluida.
 * No va a escala de alto, como el de la carta.
 */
export function perfilEnSvg(c: CartaDeAproximacion): string {
  const { puntos, cotaPies, rdhPies, sendaGrados, pendiente } = c.perfil;
  const directa = c.final !== "circuito";
  const lejos = Math.max(...puntos.map((p) => p.millas), 1);
  const conCota = puntos.filter((p): p is PuntoDelPerfil & { pies: number } => p.pies !== null);
  const alto = Math.max(c.frustrada.pies, ...conCota.map((p) => p.pies), cotaPies + 500);
  // El más lejano, con sitio a su izquierda para su nombre.
  const x = (millas: number): number => PERFIL.izq + 24 + ((lejos - millas) / lejos) * (PERFIL.der - PERFIL.izq - 24);
  const y = (pies: number): number => PERFIL.suelo - ((pies - cotaPies) / (alto - cotaPies)) * (PERFIL.suelo - PERFIL.arriba);
  const partes: string[] = [];

  // El suelo, a la cota, y la pista a la derecha del umbral en una directa.
  partes.push(`<line class="iac-perfil__suelo" x1="${PERFIL.izq}" y1="${PERFIL.suelo}" x2="${PERFIL.ancho - 4}" y2="${PERFIL.suelo}" />`);
  if (directa) partes.push(`<rect class="iac-perfil__pista" x="${PERFIL.der}" y="${PERFIL.suelo - 3}" width="34" height="6" />`);

  /*
   * La línea del perfil: por los puntos que tienen altitud y, en una directa,
   * del punto de final al umbral a la altura de cruce (el RDH). Un punto sin
   * altitud en la carta no la dobla.
   */
  const camino: [number, number][] = conCota
    .filter((p) => p.millas > 0 || !directa)
    .map((p) => [p.millas, p.pies]);
  if (directa && rdhPies !== null) camino.push([0, cotaPies + rdhPies]);
  camino.sort((a, b) => b[0] - a[0]);
  if (camino.length >= 2)
    partes.push(
      `<polyline class="iac-perfil__senda" points="${camino.map(([m, p]) => `${r1(x(m))},${r1(y(p))}`).join(" ")}" />`,
    );

  // Cada punto: su raya al suelo, su rótulo y nombre encima, y su altitud y sus millas.
  /** Lo que mide de ancho la cifra de una altitud con su altura, en unidades del dibujo. */
  const ANCHO_DE_ALTITUD = 62;
  let anterior = -Infinity;
  for (const p of puntos) {
    const px = x(p.millas);
    const enLaLinea = p.pies ?? (p.millas === 0 && directa && rdhPies !== null ? cotaPies + rdhPies : null);
    const arriba = enLaLinea !== null ? y(enLaLinea) : PERFIL.arriba;
    partes.push(`<line class="iac-perfil__raya" x1="${r1(px)}" y1="${r1(arriba)}" x2="${r1(px)}" y2="${PERFIL.suelo}" />`);
    const rotulo = rotuloEscrito(p);
    /*
     * El nombre, solo el de un punto de la lista, con coordenadas: el de la
     * comprobación de altitud —«4.0 RW12»— repite sus millas, y el umbral ya
     * lo dice «THR» con la pista.
     */
    const nombre = p.lat !== undefined && !(p.millas === 0 && directa) ? p.nombre : "";
    // Los rótulos y los nombres, en su franja de arriba, como en la carta.
    if (rotulo) partes.push(`<text class="iac-perfil__rotulo" x="${r1(px)}" y="13">${rotulo}</text>`);
    if (nombre) partes.push(`<text class="iac-perfil__nombre" x="${r1(px)}" y="27">${nombre}</text>`);
    if (p.pies !== null) {
      /*
       * La altitud, encima de la línea y a la derecha de su raya; si no cabe
       * ahí —la cifra del de antes llega hasta ella, o se sale por la
       * derecha—, debajo y a la izquierda, que en una línea que baja está libre.
       */
      const debajo = px - anterior < ANCHO_DE_ALTITUD || px + ANCHO_DE_ALTITUD > PERFIL.ancho;
      partes.push(
        `<text class="iac-perfil__alt" x="${r1(debajo ? px - 3 : px + 3)}" y="${r1(debajo ? arriba + 14 : arriba - 3)}"${debajo ? ` text-anchor="end"` : ""}>${p.pies}${p.alturaPies !== undefined ? ` <tspan class="iac-perfil__hgt">(${p.alturaPies})</tspan>` : ""}</text>`,
      );
      anterior = debajo ? -Infinity : px;
    }
    // Las millas al umbral; en el umbral, no: ahí va el RDH.
    if (!(p.millas === 0 && directa))
      partes.push(`<text class="iac-perfil__millas" x="${r1(px)}" y="${PERFIL.suelo + 13}">${r1(p.millas)}</text>`);
  }

  /*
   * La senda: su ángulo y su pendiente, en la franja de abajo y debajo de su
   * tramo, del punto de final al umbral; a lo largo de la línea pisaba las
   * altitudes de los puntos de la final. Y el RDH, debajo de la pista.
   */
  const cota = `${directa ? "THR" : "AD"} ELEV ${cotaPies}`;
  if (directa && sendaGrados !== null && rdhPies !== null) {
    const faf = puntos.find((p) => p.rotulo === "FAP" || p.rotulo === "FAF");
    if (faf) {
      const texto = `${Number.isInteger(sendaGrados) ? sendaGrados.toFixed(1) : sendaGrados}°${pendiente ? ` (${pendiente})` : ""}`;
      // Sin llegar a la cota, que va a la derecha en la misma franja: a ojo, siete unidades por letra.
      const centro = Math.min((x(faf.millas) + x(0)) / 2, PERFIL.ancho - 4 - cota.length * 7 - 10 - texto.length * 3.5);
      partes.push(`<text class="iac-perfil__angulo" x="${r1(centro)}" y="${PERFIL.suelo + 28}">${texto}</text>`);
    }
    partes.push(`<text class="iac-perfil__rdh" x="${PERFIL.der + 17}" y="${PERFIL.suelo + 13}">RDH ${rdhPies}</text>`);
  }

  /*
   * La frustrada: la flecha a trazos que sube desde el final del perfil hasta
   * su altitud, como en la carta; y la altitud escrita en su punta.
   */
  const topeX = PERFIL.ancho - 22;
  const topeY = y(c.frustrada.pies);
  const alFinal = directa && rdhPies !== null ? cotaPies + rdhPies : (conCota.find((p) => p.millas === 0)?.pies ?? null);
  // Sin altitud al final del perfil, la flecha sube sola por el borde: no se inventa de dónde sale.
  const desde =
    alFinal !== null
      ? `M${r1(x(0))} ${r1(y(alFinal))} Q${r1(topeX)} ${r1(y(alFinal))} ${r1(topeX)} ${r1(topeY + 6)}`
      : `M${r1(topeX)} ${r1(Math.max(topeY + 30, PERFIL.suelo - 24))} L${r1(topeX)} ${r1(topeY + 6)}`;
  partes.push(
    `<path class="iac-perfil__frustrada" d="${desde}" />`,
    `<path class="iac-perfil__punta" d="M${r1(topeX - 4)} ${r1(topeY + 8)} L${r1(topeX)} ${r1(topeY)} L${r1(topeX + 4)} ${r1(topeY + 8)}" />`,
    `<text class="iac-perfil__alt iac-perfil__alt--frustrada" x="${r1(topeX)}" y="${r1(topeY - 4)}">${c.frustrada.pies}</text>`,
  );

  // La cota de referencia de las alturas, como al pie del perfil de la carta.
  partes.push(
    `<text class="iac-perfil__cota" x="${PERFIL.ancho - 4}" y="${PERFIL.suelo + 28}">${cota}</text>`,
    `<text class="iac-perfil__nm" x="${PERFIL.izq}" y="${PERFIL.suelo + 28}">NM ${directa ? "THR" : "MAPt"}</text>`,
  );

  return `<svg class="iac-perfil" viewBox="0 0 ${PERFIL.ancho} ${PERFIL.alto}" aria-hidden="true" focusable="false">${partes.join("")}</svg>`;
}

/** La tabla de la senda: a cuántas millas, a qué altitud y a qué altura. */
function tablaDeLaSenda(c: CartaDeAproximacion): string {
  const filas = c.perfil.tabla;
  if (!filas.length) return "";
  const celdas = (f: (x: (typeof filas)[number]) => string) => filas.map((x) => `<td>${f(x)}</td>`).join("");
  return `<table class="iac__senda">
      <tr><th>NM</th>${celdas((x) => r1(x.millas))}</tr>
      <tr><th>ALT</th>${celdas((x) => String(x.pies))}</tr>
      <tr><th>HGT</th>${celdas((x) => `(${x.alturaPies})`)}</tr>
    </table>`;
}

// ── La planta ──────────────────────────────────────────────────────────

/** La planta: de ancho fijo y de alto el que pida la derrota, entre `bajo` y `alto`. */
const PLANTA = { ancho: 360, alto: 150, bajo: 84, margen: 18 } as const;
/** Lo que se deja a cada lado de la derrota para los nombres de sus puntos. */
const PARA_NOMBRES = 70;

/** Un punto de paso RNAV, la estrella de cuatro puntas del Anexo 4, centrada en `(x, y)`. */
const estrella = (x: number, y: number, k = 5): string =>
  `<path class="iac-planta__fijo" d="M${r1(x)} ${r1(y - k)} L${r1(x + k * 0.28)} ${r1(y - k * 0.28)} L${r1(x + k)} ${r1(y)} L${r1(x + k * 0.28)} ${r1(y + k * 0.28)} L${r1(x)} ${r1(y + k)} L${r1(x - k * 0.28)} ${r1(y + k * 0.28)} L${r1(x - k)} ${r1(y)} L${r1(x - k * 0.28)} ${r1(y - k * 0.28)}Z" />`;

/**
 * **La planta**, con el norte arriba y a escala: la pista de la cabecera, la
 * derrota de la final del punto intermedio al umbral —o al punto de
 * frustrada— y cada punto donde lo ponen sus coordenadas. Los que la carta
 * no da en la lista —la comprobación de altitud, un escalón— van sobre la
 * derrota a sus millas.
 */
export function plantaEnSvg(e: Scenario, cabecera: string, c: CartaDeAproximacion): string {
  const o = e.aerodrome?.origin;
  const pista = e.aerodrome?.runways.find((p) => p.thresholds[cabecera]?.xy);
  if (!o || !pista) return "";
  const aXy = (lat: string, lon: string): [number, number] => {
    const { x, z } = dondeCae(o, { lat: gradosDeLaCarta(lat), lon: gradosDeLaCarta(lon) });
    return [x, -z];
  };
  const hasta = aXy(c.perfil.hasta.lat, c.perfil.hasta.lon);
  const conSitio = c.perfil.puntos.map((p) => ({
    p,
    xy: p.lat && p.lon ? aXy(p.lat, p.lon) : null,
  }));
  // Los sin coordenadas, sobre la derrota del último con ellas al final, a sus millas.
  const ultimo = [...conSitio].reverse().find((q) => q.xy && q.p.millas > 0);
  for (const q of conSitio) {
    if (q.xy) continue;
    if (q.p.millas === 0) q.xy = hasta;
    else if (ultimo?.xy) {
      const f = q.p.millas / ultimo.p.millas;
      q.xy = [hasta[0] + (ultimo.xy[0] - hasta[0]) * f, hasta[1] + (ultimo.xy[1] - hasta[1]) * f];
    }
  }
  const umbrales = Object.values(pista.thresholds).flatMap((u) => (u?.xy ? [u.xy] : []));
  const todos = [...conSitio.flatMap((q) => (q.xy ? [q.xy] : [])), ...umbrales, hasta];
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const m = PLANTA.margen;
  const k = Math.min((PLANTA.ancho - 2 * m - 2 * PARA_NOMBRES) / Math.max(x1 - x0, 1), (PLANTA.alto - 2 * m) / Math.max(y1 - y0, 1));
  // Una final tumbada no necesita una planta alta: el papel que sobra, fuera.
  const alto = Math.max(PLANTA.bajo, Math.min(PLANTA.alto, (y1 - y0) * k + 2 * m + 10));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const enDibujo = ([x, y]: readonly [number, number]): [number, number] => [
    PLANTA.ancho / 2 + (x - cx) * k,
    alto / 2 - (y - cy) * k,
  ];
  const partes: string[] = [];
  const [a, b] = umbrales.map(enDibujo) as [[number, number], [number, number]];
  if (a && b)
    partes.push(`<line class="iac-planta__pista" x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" />`);
  const derrota = [...conSitio.flatMap((q) => (q.xy ? [enDibujo(q.xy)] : [])), ...(conSitio.some((q) => q.p.millas === 0) ? [] : [enDibujo(hasta)])];
  partes.push(`<polyline class="iac-planta__derrota" points="${derrota.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ")}" />`);
  // Los rótulos van al lado contrario de la pista, para no pisarla.
  const [hx] = enDibujo(hasta);
  for (const q of conSitio) {
    if (!q.xy || (q.p.millas === 0 && c.final !== "circuito")) continue;
    const [x, y] = enDibujo(q.xy);
    const conNombre = q.p.lat !== undefined;
    partes.push(conNombre ? estrella(x, y) : `<circle class="iac-planta__marca" cx="${r1(x)}" cy="${r1(y)}" r="2" />`);
    if (!conNombre) continue;
    const derecha = x >= hx - 1;
    const rotulo = rotuloEscrito(q.p);
    partes.push(
      `<text class="iac-planta__nombre" x="${r1(x + (derecha ? 8 : -8))}" y="${r1(y + 4)}" text-anchor="${derecha ? "start" : "end"}">${q.p.nombre}${rotulo ? ` <tspan class="iac-planta__rotulo">(${rotulo})</tspan>` : ""}</text>`,
    );
  }
  // El norte y la escala de cinco millas, como en la esquina de la planta.
  const cinco = 5 * MILLA * k;
  partes.push(
    `<path class="iac-planta__norte" d="M10 22 L14 8 L18 22 L14 19Z" />`,
    `<line class="iac-planta__escala" x1="10" y1="${r1(alto - 8)}" x2="${r1(10 + cinco)}" y2="${r1(alto - 8)}" />`,
    `<text class="iac-planta__nm" x="${r1(14 + cinco)}" y="${r1(alto - 4)}">5 NM</text>`,
  );
  return `<svg class="iac-planta" viewBox="0 0 ${PLANTA.ancho} ${r1(alto)}" aria-hidden="true" focusable="false">${partes.join("")}</svg>`;
}

// ── La MSA ─────────────────────────────────────────────────────────────

/**
 * **El círculo de la MSA**, como en la esquina de una carta: su altitud
 * dentro y, si tiene sectores, sus rayas en sus rumbos; encima «MSA» o «TAA»,
 * y debajo el radio y el centro. Las TAA de la DINAC, a una sola altitud en
 * todas sus zonas, van como un círculo entero: la carta no da los límites de
 * las zonas en grados, y dibujarlos sería inventarlos.
 */
export function msaEnSvg(msa: Msa): string {
  const [cx, cy, r] = [50, 50, 30];
  const partes: string[] = [`<circle class="iac-msa__circulo" cx="${cx}" cy="${cy}" r="${r}" />`];
  if (msa.sectores.length > 1) {
    for (const s of msa.sectores) {
      // Los rumbos son hacia el centro: la raya va del lado de donde se viene.
      const a = (((s.desde + 180) % 360) * Math.PI) / 180;
      partes.push(
        `<line class="iac-msa__raya" x1="${cx}" y1="${cy}" x2="${r1(cx + Math.sin(a) * r)}" y2="${r1(cy - Math.cos(a) * r)}" />`,
      );
      const mitad = (((s.desde + ((s.hasta - s.desde + 360) % 360 || 360) / 2 + 180) % 360) * Math.PI) / 180;
      partes.push(
        `<text class="iac-msa__pies" x="${r1(cx + Math.sin(mitad) * r * 0.55)}" y="${r1(cy - Math.cos(mitad) * r * 0.55 + 4)}">${s.pies}</text>`,
      );
    }
  } else {
    partes.push(`<text class="iac-msa__pies iac-msa__pies--una" x="${cx}" y="${cy + 5}">${msa.sectores[0]?.pies ?? ""}</text>`);
  }
  partes.push(
    `<text class="iac-msa__tipo" x="${cx}" y="13">${msa.tipo}</text>`,
    `<text class="iac-msa__radio" x="${cx}" y="95">${msa.radioMillas} NM ${msa.centro}</text>`,
  );
  return `<svg class="iac-msa" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${partes.join("")}</svg>`;
}

// ── Los mínimos ────────────────────────────────────────────────────────

/**
 * **La tabla de mínimos**: «OCA (OCH)» por categoría, una línea por tipo de
 * aproximación, con la OCA encima y la OCH entre paréntesis debajo. La columna
 * de la categoría del avión que va, resaltada. Donde la carta tiene la
 * casilla y no la cifra, «N.A», que es lo que imprime; donde ni tiene la
 * columna, no hay columna. Y la línea LPV que un suplemento deja fuera de
 * servicio, con su suplemento.
 */
export function tablaDeMinimos(c: CartaDeAproximacion, suya: CategoriaDeAproximacion | null): string {
  const columnas = c.categorias ?? CATEGORIAS;
  const sup = supDeLaLpv(c);
  const clase = (k: Categoria): string => (k === suya ? ` class="iac__suya"` : "");
  const cabeza = `<tr><th>OCA (OCH)</th>${columnas.map((k) => `<th${clase(k)}>${k}</th>`).join("")}</tr>`;
  const filas = c.minimos
    .map((m) => {
      const fuera = sup && m.tipo === "LPV" ? `<small>U/S ${sup}</small>` : "";
      const celdas = columnas
        .map((k) => {
          const o = m.porCategoria[k];
          return `<td${clase(k)}>${o ? `${o.oca}<small>(${o.och})</small>` : "N.A"}</td>`;
        })
        .join("");
      return `<tr${fuera ? ` class="iac__fuera"` : ""}><th>${m.tipo}${fuera}</th>${celdas}</tr>`;
    })
    .join("");
  const tuya = suya ? `<p class="iac__tuya">${t("carta.iac.categoria", { cat: suya })}</p>` : "";
  return `<table class="iac__minimos">${cabeza}${filas}</table>${tuya}`;
}

// ── La hoja entera ─────────────────────────────────────────────────────

/** Una página de la carta: la de una cabecera. */
function pagina(e: Scenario, cabecera: string, c: CartaDeAproximacion, i: number, todas: readonly string[], suya: CategoriaDeAproximacion | null, llave: string): string {
  const oaci = e.aerodrome?.id ?? "";
  const pestanas = todas
    .map(
      (cab, j) =>
        `<label class="iac__pestana${j === i ? " iac__pestana--esta" : ""}" for="${llave}-${j}">RWY ${cab}</label>`,
    )
    .join("");
  const frustrada = `<div class="iac__frustrada"><b><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 15 Q2 5 13 5 M9 1.5 L13 5 L9 8.5" /></svg>${c.frustrada.pies}${c.frustrada.maximaPies ? ` · MAX ${c.frustrada.maximaPies}` : ""}</b><p>${c.frustrada.texto}</p></div>`;
  const msa = `<div class="iac__msa">${msaEnSvg(c.msa)}${c.msa.nota ? `<p>${c.msa.nota}</p>` : ""}</div>`;
  return `
    <div class="iac iac--${i}" data-cabecera="${cabecera}">
      <div class="iac__cabeza">
        <label class="iac__volver" for="${llave}-no">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5 L8 12 L15 19" /></svg>
        </label>
        <b class="iac__titulo">${oaci} · ${nombreDelProcedimiento(c)}</b>
        <span class="iac__pestanas">${pestanas}</span>
      </div>
      <div class="iac__cuerpo">
        <div class="iac__dibujos">
          <div class="iac__planta">${plantaEnSvg(e, cabecera, c)}</div>
          <div class="iac__perfil">${perfilEnSvg(c)}${tablaDeLaSenda(c)}</div>
        </div>
        <div class="iac__cajas">
          <div class="iac__mins">${tablaDeMinimos(c, suya)}</div>
          ${msa}
          ${frustrada}
        </div>
        <div class="iac__pie">
          <small>${c.altitudDeTransicion !== null ? `TA ${c.altitudDeTransicion} · ` : ""}${c.carta} · ${c.fuente}</small>
          <small class="iac__descargo">${t("carta.descargo")}</small>
        </div>
      </div>
    </div>`;
}

/**
 * **Lo que la ficha necesita para la carta de aproximación de un campo**: el
 * botón que la abre y sus páginas, o nada si el campo no tiene ninguna
 * transcrita.
 *
 * Se abre y se cambia de cabecera sin código: unos botones de radio
 * escondidos al principio de la ficha y unas etiquetas que los marcan, y la
 * hoja de estilos enseña la página de la marcada (`.iac__llave`). Así no hay
 * que repintar el hangar, y la ficha vuelve a su sitio al cerrarla.
 */
export function cartaDeAproximacionDeLaFicha(
  e: Scenario,
  suya: CategoriaDeAproximacion | null,
): { llaves: string; boton: string; paginas: string } | null {
  const oaci = e.aerodrome?.id;
  if (!oaci) return null;
  const cabeceras = cabecerasConCarta(e);
  if (!cabeceras.length) return null;
  const llave = `iac-${e.id}`;
  const llaves =
    `<input class="iac__llave iac__llave--no" type="radio" name="${llave}" id="${llave}-no" tabindex="-1" checked hidden />` +
    cabeceras
      .map((_, j) => `<input class="iac__llave iac__llave--${j}" type="radio" name="${llave}" id="${llave}-${j}" tabindex="-1" hidden />`)
      .join("");
  const boton = `<label class="ficha-carta__iac" for="${llave}-0">
      <svg viewBox="0 0 40 24" aria-hidden="true" focusable="false"><path d="M2 6 H14 L30 18 H38" /><path d="M2 21 H38" /></svg>
      <span><b>IAC RWY ${cabeceras[0]}</b><small>${t("carta.iac")}</small></span>
    </label>`;
  const paginas = cabeceras
    .map((cab, j) => {
      const c = APROXIMACIONES[oaci]?.[cab];
      return c ? pagina(e, cab, c, j, cabeceras, suya, llave) : "";
    })
    .join("");
  return { llaves, boton, paginas };
}
