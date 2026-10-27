/**
 * **Los rótulos del plano en vuelo, cada uno en su hueco.**
 *
 * El plano en vuelo escribía cada rótulo a la derecha de su punto, sin mirar
 * qué había: en el nudo de Tenerife el nombre de Tenerife Sur caía debajo de
 * la ruta, el indicativo de Los Rodeos debajo del avión y la frecuencia
 * encima del nombre de al lado; y en el teléfono, peor, porque el lienzo mide
 * cuatrocientos sesenta y se enseña a doscientos: la letra de trece salía de
 * seis píxeles. Es lo mismo que le pasaba a la carta de elegir destino antes
 * de su repaso, y se arregla igual —ver `rotulos.ts`—:
 *
 * - **con las medidas de verdad**: aquí todo va en píxeles de pantalla, los
 *   del plano tal como se ve, y la letra mide lo que dice su cuerpo;
 * - primero lo que no se mueve —los aeródromos, la pista, los puntos de la
 *   ruta, los hitos y la rosa— y después los rótulos por orden de
 *   importancia, cada uno en el primer sitio libre de los suyos, y si no cabe
 *   entero, en una forma más corta;
 * - y lo que solo acompaña —el nombre de un hito, la declinación, los grados
 *   de la retícula—, si no cabe, no se escribe. Acercando la lupa sale.
 *
 * Qué rótulos lleva cada calco lo dice la escalera (`calcosDe`): el indicativo
 * en los cuatro, los nombres desde Tukã, las cifras desde Taguato y la radio
 * en Taguato Ruvicha.
 *
 * No toca el lienzo: recibe lo que hay en el plano y una forma de medir la
 * letra, y devuelve dónde va cada cosa. Lo pinta `Mapa`, en `ui/mapa.ts`, y
 * lo mide de verdad `verificar-carteles.mjs`.
 */

import { calcosDe, type Peldano } from "../../flight/escalera";
import { LETRAS, TINTAS } from "./estilo";
import { colocar, sitiosAlrededor, type Caja, type Raya, type Sitio } from "./rotulos";

/** Un renglón de un rótulo: su texto, su tinta y su letra. */
export interface Renglon {
  readonly texto: string;
  readonly color: string;
  /** Las cifras y los indicativos, en la letra de las cifras. */
  readonly cifras?: boolean;
  /** El cuerpo de la letra, en píxeles de pantalla. */
  readonly cuerpo: number;
}

/**
 * **Los cuerpos de la letra del plano**, en píxeles de pantalla. Los de la
 * carta del hangar, un punto más chicos: el plano se mira volando y mide la
 * mitad. Por debajo de once no se lee en un teléfono, y no se baja.
 */
export const CUERPOS = {
  nombre: 13,
  indicativo: 12,
  radio: LETRAS.radio,
  punto: 12,
  cota: 12,
  hito: 12,
  td: 12,
  var: 11,
  grado: 11,
} as const;

/** La letra de un renglón, como la pide el lienzo. */
export const letraDe = (r: Pick<Renglon, "cifras" | "cuerpo">): string =>
  r.cifras ? `600 ${r.cuerpo}px ${LETRAS.cifras}` : `500 ${r.cuerpo}px ${LETRAS.nombres}`;

/** Lo que ocupa de alto un renglón: su cuerpo y el aire de la línea. */
export const altoDe = (r: Pick<Renglon, "cuerpo">): number => Math.ceil(r.cuerpo * 1.18);

/** Lo que mide de ancho un texto con una letra, en píxeles de pantalla. */
export type Medir = (texto: string, letra: string) => number;

/** Ancho y alto de un rótulo de varios renglones, con su halo de papel. */
export function medidaDe(renglones: readonly Renglon[], medir: Medir): [number, number] {
  let ancho = 0;
  let alto = 0;
  for (const r of renglones) {
    ancho = Math.max(ancho, medir(r.texto, letraDe(r)));
    alto += altoDe(r);
  }
  return [Math.ceil(ancho + LETRAS.halo), alto];
}

/** Un aeródromo del plano, donde cae en la pantalla. */
export interface CampoDelPlano {
  readonly x: number;
  readonly y: number;
  readonly nombre: string;
  readonly oaci: string | null;
  /** La frecuencia de la torre, ya escrita como en el AIP: «TWR 118.300». */
  readonly radio: string | null;
  /** El radio de su símbolo, o de su pista si va a escala, px. */
  readonly simbolo: number;
  /** Casa y el destino van antes que los demás. */
  readonly papel: "casa" | "destino" | "otro";
}

/** Un punto de la ruta que lleva nombre, con el radio de su estrella. */
export interface PuntoDelPlano {
  readonly x: number;
  readonly y: number;
  readonly nombre: string;
  /** El punto al que se va: su nombre va antes que el de los demás. */
  readonly activo: boolean;
  readonly simbolo: number;
}

/** Todo lo que hay en el plano y se rotula, en píxeles de pantalla. */
export interface PlanoPorRotular {
  /** El lado del plano tal como se ve. */
  readonly lado: number;
  readonly peldano: Peldano;
  readonly campos: readonly CampoDelPlano[];
  /** Los puntos de la ruta cuyo nombre toca escribir: desde el calco de las cifras. */
  readonly puntos: readonly PuntoDelPlano[];
  /** El umbral de llegada con su cota: «RW19 · ELEV 108 FT». */
  readonly umbral: { readonly x: number; readonly y: number; readonly nombre: string; readonly cota: string } | null;
  /** Los hitos cuyo nombre ya se ha oído. */
  readonly hitos: readonly { readonly x: number; readonly y: number; readonly nombre: string }[];
  /** La rosa, y la declinación escrita debajo si va. */
  readonly rosa: { readonly x: number; readonly y: number; readonly radio: number; readonly texto: string } | null;
  /** Los grados de la retícula: el paralelo por su altura y el meridiano por su sitio arriba. */
  readonly grados: readonly { readonly texto: string; readonly eje: "lat" | "lon"; readonly en: number }[];
  /** Lo que no se mueve ni se pisa: los símbolos. */
  readonly fijos: readonly Caja[];
  /** Las rayas de la ruta: cruzarlas cuesta. */
  readonly rayas: readonly Raya[];
}

/** Un rótulo ya colocado, para pintarlo. */
export interface RotuloPuesto {
  /** Qué es, para el banco: «Tenerife North», «T/D», «28°N». */
  readonly que: string;
  readonly renglones: readonly Renglon[];
  readonly caja: Caja;
  /** De qué lado de su punto quedó: decide la alineación de la letra. */
  readonly lado: "derecha" | "izquierda" | "centro";
}

/** Lo que se le pasa al colocador, con lo que hace falta para pintarlo después. */
interface PorRotular {
  readonly que: string;
  readonly formas: readonly (readonly Renglon[])[];
  readonly sitios: (medida: readonly [number, number]) => Sitio[];
}

/** Las formas sin repetir: si quitar la radio no quita nada, no es otra forma. */
const sinRepetir = (formas: readonly (readonly Renglon[])[]): (readonly Renglon[])[] => {
  const vistas = new Set<string>();
  return formas.filter((f) => {
    const clave = f.map((r) => r.texto).join("\n");
    if (!f.length || vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
};

/**
 * **Las formas del rótulo de un aeródromo**, de la entera a la más corta: con
 * la radio; sin ella; solo el nombre; y solo el indicativo, cuatro letras,
 * cuando ni el nombre cabe. Las mismas que en la carta del hangar.
 */
export function formasDeCampo(c: CampoDelPlano, peldano: Peldano): (readonly Renglon[])[] {
  const calcos = calcosDe(peldano);
  const nombre: Renglon[] = calcos.nombres ? [{ texto: c.nombre, color: TINTAS.tinta, cuerpo: CUERPOS.nombre }] : [];
  const oaci: Renglon[] = c.oaci ? [{ texto: c.oaci, color: TINTAS.tinta, cifras: true, cuerpo: CUERPOS.indicativo }] : [];
  const radio: Renglon[] =
    calcos.radio && c.radio ? [{ texto: c.radio, color: TINTAS.aero, cifras: true, cuerpo: CUERPOS.radio }] : [];
  return sinRepetir([[...nombre, ...oaci, ...radio], [...nombre, ...oaci], nombre, oaci]);
}

/** Alrededor de un punto, con la medida de la forma que se esté probando. */
const alrededor =
  (x: number, y: number, radio: number) =>
  (m: readonly [number, number]): Sitio[] =>
    sitiosAlrededor(x, y, radio, m);

/**
 * **Coloca los rótulos del plano.** Devuelve los que caben, con su sitio, y
 * los que se quedaron sin escribir, por si alguien quiere saberlo.
 */
export function rotularElPlano(p: PlanoPorRotular, medir: Medir): { puestos: RotuloPuesto[]; sinSitio: string[] } {
  const calcos = calcosDe(p.peldano);
  const dentro = (x: number, y: number): boolean => x >= 0 && y >= 0 && x <= p.lado && y <= p.lado;
  const campo = (c: CampoDelPlano): PorRotular => ({
    que: c.oaci ?? c.nombre,
    formas: formasDeCampo(c, p.peldano),
    sitios: alrededor(c.x, c.y, c.simbolo),
  });
  const punto = (q: PuntoDelPlano): PorRotular => ({
    que: q.nombre,
    formas: [[{ texto: q.nombre, color: TINTAS.aero, cifras: true, cuerpo: CUERPOS.punto }]],
    sitios: alrededor(q.x, q.y, q.simbolo),
  });
  const campos = p.campos.filter((c) => dentro(c.x, c.y));
  // Los nombres de la ruta y la cota del umbral, desde el calco de las cifras.
  const puntos = calcos.cifras ? p.puntos.filter((q) => dentro(q.x, q.y)) : [];
  const umbral = calcos.cifras ? p.umbral : null;
  const lista: PorRotular[] = [
    // Primero casa y el destino: son a donde se vuelve y a donde se va.
    ...campos.filter((c) => c.papel === "casa").map(campo),
    ...campos.filter((c) => c.papel === "destino").map(campo),
    ...puntos.filter((q) => q.activo).map(punto),
  ];
  if (umbral && dentro(umbral.x, umbral.y)) {
    const u = umbral;
    const renglon = (texto: string): Renglon => ({ texto, color: TINTAS.cota, cifras: true, cuerpo: CUERPOS.cota });
    lista.push({
      que: u.nombre,
      formas: [[renglon(`${u.nombre} · ${u.cota}`)], [renglon(u.nombre)]],
      // Junto al aro del destino, que va encima del umbral.
      sitios: alrededor(u.x, u.y, 10),
    });
  }
  lista.push(...campos.filter((c) => c.papel === "otro").map(campo), ...puntos.filter((q) => !q.activo).map(punto));
  // Lo que solo acompaña: si no cabe, no va.
  if (calcos.nombres)
    for (const h of p.hitos)
      if (dentro(h.x, h.y))
        lista.push({
          que: h.nombre,
          formas: [[{ texto: h.nombre, color: TINTAS.tinta, cuerpo: CUERPOS.hito }]],
          sitios: alrededor(h.x, h.y, 7),
        });
  const rosa = p.rosa;
  if (rosa && calcos.radio && rosa.texto)
    lista.push({
      que: rosa.texto,
      formas: [[{ texto: rosa.texto, color: TINTAS.aero, cifras: true, cuerpo: CUERPOS.var }]],
      // Debajo de la rosa, como en la carta; si no, a su lado o encima.
      sitios: ([w, h]) => [
        { caja: { cx: rosa.x, cy: rosa.y + rosa.radio + 3 + h / 2, w, h }, coste: 0, lado: "centro" },
        { caja: { cx: rosa.x + rosa.radio + 4 + w / 2, cy: rosa.y, w, h }, coste: 1, lado: "derecha" },
        { caja: { cx: rosa.x, cy: rosa.y - rosa.radio - 7 - h / 2, w, h }, coste: 2, lado: "centro" },
      ],
    });
  if (calcos.cifras)
    for (const g of p.grados)
      lista.push({
        que: g.texto,
        formas: [[{ texto: g.texto, color: TINTAS.aero, cifras: true, cuerpo: CUERPOS.grado }]],
        // Los grados van donde va su línea, en el borde, o no van.
        sitios: ([w, h]) => [
          {
            caja: g.eje === "lat" ? { cx: 2 + w / 2, cy: g.en - 1 - h / 2, w, h } : { cx: g.en + 3 + w / 2, cy: 2 + h / 2, w, h },
            coste: 0,
            lado: "derecha",
          },
        ],
      });

  const medidas = lista.map((r) => r.formas.map((f) => medidaDe(f, medir)));
  const colocados = colocar(
    p.lado,
    p.lado,
    p.fijos,
    p.rayas,
    lista.map((r, i) => ({ formas: medidas[i]!.map((m) => r.sitios(m)) })),
    2,
    /*
     * Una forma más corta cuesta lo que alejarse un anillo y medio: mejor
     * «Tenerife North · GCXO» pegado a su punto que con la radio a treinta
     * píxeles, donde ya no se sabe de quién es.
     */
    3,
  );
  const puestos: RotuloPuesto[] = [];
  const sinSitio: string[] = [];
  colocados.forEach((c, i) => {
    const r = lista[i]!;
    if (!c) {
      sinSitio.push(r.que);
      return;
    }
    const sitio = r.sitios(medidas[i]![c.forma]!)[c.sitio];
    puestos.push({
      que: r.que,
      renglones: r.formas[c.forma]!,
      caja: c.caja,
      lado: (sitio?.lado as RotuloPuesto["lado"] | undefined) ?? "derecha",
    });
  });
  return { puestos, sinSitio };
}

/**
 * **Un rótulo suelto en el primer hueco libre**, sin mover a los demás: el
 * «T/D» de la ruta, que se corre con la altura y se pinta cada fotograma, se
 * coloca contra lo que ya está puesto. O no se escribe.
 */
export function unoMas(
  lado: number,
  ocupado: readonly Caja[],
  renglones: readonly Renglon[],
  x: number,
  y: number,
  radio: number,
  medir: Medir,
): RotuloPuesto | null {
  const m = medidaDe(renglones, medir);
  const sitios = sitiosAlrededor(x, y, radio, m);
  const [c] = colocar(lado, lado, ocupado, [], [{ formas: [sitios] }]);
  if (!c) return null;
  return {
    que: renglones.map((r) => r.texto).join(" "),
    renglones,
    caja: c.caja,
    lado: (sitios[c.sitio]?.lado as RotuloPuesto["lado"] | undefined) ?? "derecha",
  };
}

/**
 * **Pinta un rótulo puesto**, renglón a renglón y con su halo de papel, en un
 * lienzo que cuenta en píxeles de pantalla. `papel` es el color del halo.
 */
export function pintarRotulo(g: CanvasRenderingContext2D, r: RotuloPuesto, papel: string): void {
  const c = r.caja;
  const alto = r.renglones.reduce((s, x) => s + altoDe(x), 0);
  let y = c.cy - alto / 2;
  const medio = LETRAS.halo / 2;
  const x = r.lado === "izquierda" ? c.cx + c.w / 2 - medio : r.lado === "centro" ? c.cx : c.cx - c.w / 2 + medio;
  g.save();
  g.textBaseline = "middle";
  g.textAlign = r.lado === "izquierda" ? "right" : r.lado === "centro" ? "center" : "left";
  g.lineJoin = "round";
  g.lineWidth = LETRAS.halo;
  g.strokeStyle = papel;
  for (const renglon of r.renglones) {
    const h = altoDe(renglon);
    g.font = letraDe(renglon);
    g.strokeText(renglon.texto, x, y + h / 2);
    g.fillStyle = renglon.color;
    g.fillText(renglon.texto, x, y + h / 2);
    y += h;
  }
  g.restore();
}
