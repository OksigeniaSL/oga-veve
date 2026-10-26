/**
 * **La carta del plano en vuelo**: lo mismo que la del hangar, pintado en un
 * lienzo y con el norte arriba.
 *
 * El plano (`ui/mapa.ts`) se repinta solo cuando el encuadre se mueve, y eso
 * no se pierde: aquí no hay nada que se haga cada fotograma salvo el avión. Lo
 * caro —el fondo horneado de la región— es una imagen que se pone a trozos, y
 * lo fino —el relieve del mundo cargado— se pinta encima solo cuando el
 * encuadre es tan pequeño que la imagen ya no da más detalle.
 */

import { dondeCae, type Sitio } from "../../world/entre-aerodromos";
import { REGIONES, SIMBOLOS, TINTAS, PAPEL, LETRAS, type IdRegion } from "./estilo";
import { imagenDe, regionDe } from "./region";
import { AVION_EN_PLANTA } from "./simbolos";

/** Radio terrestre medio, m: el de `entre-aerodromos.ts`. */
const R = 6371008;

/** Un encuadre pintado: su centro y cuántos píxeles mide un metro. */
export interface Puesto {
  readonly cx: number;
  readonly cz: number;
  readonly escala: number;
}

/**
 * **El fondo horneado de la región de un sitio**, que se baja la primera vez y
 * se queda. `alLlegar` se llama una vez cuando la imagen está, para repintar.
 */
export class FondoHorneado {
  private imagen: HTMLImageElement | null = null;
  private lista = false;
  readonly region: IdRegion | null;

  constructor(
    private readonly origen: Sitio,
    pequenos: boolean,
    alLlegar: () => void,
  ) {
    this.region = regionDe(origen);
    const url = this.region ? imagenDe(this.region, pequenos) : null;
    if (!url || typeof Image === "undefined") return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      this.lista = true;
      alLlegar();
    };
    img.src = url;
    this.imagen = img;
  }

  /** Cuántos metros mide un píxel de la imagen. */
  get metrosPorPixel(): number {
    if (!this.region) return Infinity;
    return (R * Math.PI) / 180 / REGIONES[this.region].porGrado;
  }

  get hay(): boolean {
    return this.lista;
  }

  /**
   * La pone en el lienzo, **a tiras de latitud**. El mundo del juego coloca
   * cada sitio con el coseno de la latitud media entre él y el origen —ver
   * `dondeCae`—, así que una longitud cae un poco más a un lado o al otro
   * según la latitud. Una sola imagen estirada no casaría con la costa trazada
   * encima; a tiras, cada una con su coseno, sí. Y solo las que se ven.
   */
  pintar(g: CanvasRenderingContext2D, lado: number, e: Puesto): boolean {
    const img = this.imagen;
    if (!img || !this.lista || !this.region) return false;
    const r = REGIONES[this.region];
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const enY = (lat: number) => lado / 2 + (dondeCae(this.origen, { lat, lon: this.origen.lon }).z - e.cz) * e.escala;
    const tiras = 48;
    const filas = H / tiras;
    g.save();
    g.imageSmoothingEnabled = true;
    for (let i = 0; i < tiras; i++) {
      const latArriba = r.norte - ((i * filas) / H) * (r.norte - r.sur);
      const latAbajo = r.norte - (((i + 1) * filas) / H) * (r.norte - r.sur);
      const y0 = enY(latArriba);
      const y1 = enY(latAbajo);
      if (y1 < 0 || y0 > lado) continue;
      const latMedia = (latArriba + latAbajo) / 2;
      const x0 = lado / 2 + (dondeCae(this.origen, { lat: latMedia, lon: r.oeste }).x - e.cx) * e.escala;
      const x1 = lado / 2 + (dondeCae(this.origen, { lat: latMedia, lon: r.este }).x - e.cx) * e.escala;
      if (x1 < 0 || x0 > lado) continue;
      // Medio píxel de más por arriba y por abajo, para que no se vean juntas.
      g.drawImage(img, 0, i * filas, W, filas, x0, y0 - 0.5, x1 - x0, y1 - y0 + 1);
    }
    g.restore();
    return true;
  }
}

/**
 * **El aeródromo de la hoja**, dibujado en el lienzo con las medidas de sus
 * SVG: el civil, disco oscuro con cuatro pestañas y la pista blanca; el
 * pequeño, aro con la pista en contorno. La pista va girada a su rumbo
 * verdadero. `tamano` en píxeles, como `--carta-aerodromo`.
 */
export function dibujarAerodromo(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  civil: boolean,
  rumboRad: number,
  tamano: number,
): void {
  g.save();
  g.translate(x, y);
  // El símbolo civil mide 32 de lado y el pequeño 24.
  const s = tamano / (civil ? 32 : 24);
  g.scale(s, s);
  // Un halo de papel, que sobre el pardo de la montaña el negro se pierde.
  g.shadowColor = PAPEL.fondo;
  g.shadowBlur = 3;
  if (civil) {
    g.fillStyle = TINTAS.aerodromo;
    for (let k = 0; k < 4; k++) {
      g.save();
      g.rotate((k * Math.PI) / 2);
      g.beginPath();
      g.roundRect(-2.6, -15, 5.2, 5, 1);
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, 10.5, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    g.rotate(rumboRad);
    g.beginPath();
    g.roundRect(-2, -12.2, 4, 24.4, 1);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(-1.25, -11.2, 2.5, 22.4);
  } else {
    g.beginPath();
    g.arc(0, 0, 9.5, 0, Math.PI * 2);
    g.fillStyle = PAPEL.fondo;
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 2.4;
    g.strokeStyle = TINTAS.aerodromo;
    g.stroke();
    g.rotate(rumboRad);
    g.beginPath();
    g.roundRect(-2.3, -6.6, 4.6, 13.2, 0.8);
    g.fill();
    g.lineWidth = 1.5;
    g.stroke();
  }
  g.restore();
}

/** El avión en planta de la hoja, de su mismo trazado, con el morro a su rumbo. */
const CUERPO = AVION_EN_PLANTA.cuerpo && typeof Path2D !== "undefined" ? new Path2D(AVION_EN_PLANTA.cuerpo.d) : null;

export function dibujarAvion(g: CanvasRenderingContext2D, x: number, y: number, rumboRad: number, tamano: number): void {
  if (!CUERPO) return;
  const [, , ancho] = AVION_EN_PLANTA.caja;
  const s = tamano / (ancho ?? 34);
  g.save();
  g.translate(x, y);
  g.rotate(rumboRad);
  g.scale(s, s);
  g.lineJoin = "round";
  g.strokeStyle = AVION_EN_PLANTA.halo?.color ?? PAPEL.fondo;
  g.lineWidth = AVION_EN_PLANTA.halo?.grosor ?? 4;
  g.stroke(CUERPO);
  g.fillStyle = AVION_EN_PLANTA.cuerpo?.color ?? TINTAS.tinta;
  g.fill(CUERPO);
  g.restore();
}

/**
 * **Un rótulo de la carta**, renglón a renglón y con su halo de papel: así se
 * lee sobre cualquier tinte, que es lo que hacen las cartas de verdad.
 */
export function rotular(
  g: CanvasRenderingContext2D,
  renglones: readonly { readonly texto: string; readonly color: string; readonly cifras?: boolean; readonly cuerpo?: number }[],
  x: number,
  y: number,
  lado: number,
  margen = 12,
): void {
  const medidas = renglones.map((r) => {
    g.font = letra(r);
    return g.measureText(r.texto).width;
  });
  const ancho = Math.max(0, ...medidas);
  const izquierda = x + margen + ancho > lado - 2;
  const alto = renglones.length * 14;
  let ty = Math.max(8, Math.min(lado - alto, y - alto / 2 + 7));
  g.save();
  g.textBaseline = "middle";
  g.textAlign = izquierda ? "right" : "left";
  g.lineJoin = "round";
  for (const r of renglones) {
    g.font = letra(r);
    const tx = izquierda ? x - margen : x + margen;
    g.lineWidth = LETRAS.halo;
    g.strokeStyle = PAPEL.fondo;
    g.strokeText(r.texto, tx, ty);
    g.fillStyle = r.color;
    g.fillText(r.texto, tx, ty);
    ty += 14;
  }
  g.restore();
}

const letra = (r: { readonly cifras?: boolean; readonly cuerpo?: number }): string =>
  r.cifras ? `600 ${r.cuerpo ?? LETRAS.cifra}px ${LETRAS.cifras}` : `500 ${r.cuerpo ?? 13}px ${LETRAS.nombres}`;

/**
 * **La rosa**, pequeña y en una esquina: el norte verdadero arriba siempre;
 * con la radio, el norte magnético girado a la declinación de hoy y su cifra.
 */
export function dibujarRosa(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  radio: number,
  declinacion: number | null,
  texto: string | null,
): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = TINTAS.aero;
  g.fillStyle = TINTAS.aero;
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(0, 0, radio, 0, Math.PI * 2);
  g.stroke();
  for (let d = 0; d < 360; d += 10) {
    const a = (d * Math.PI) / 180;
    const largo = d % 30 === 0 ? radio * 0.2 : radio * 0.1;
    g.beginPath();
    g.moveTo(Math.sin(a) * radio, -Math.cos(a) * radio);
    g.lineTo(Math.sin(a) * (radio - largo), -Math.cos(a) * (radio - largo));
    g.stroke();
  }
  // El norte verdadero: el triángulo de fuera.
  g.beginPath();
  g.moveTo(0, -radio - 5);
  g.lineTo(3, -radio + 2);
  g.lineTo(-3, -radio + 2);
  g.closePath();
  g.fill();
  if (declinacion !== null) {
    g.save();
    g.rotate((declinacion * Math.PI) / 180);
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(0, -radio * 0.75);
    g.lineTo(0, -radio * 0.25);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -radio * 0.82);
    g.lineTo(2.4, -radio * 0.62);
    g.lineTo(-2.4, -radio * 0.62);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.beginPath();
  g.arc(0, 0, 1.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (texto) rotular(g, [{ texto, color: TINTAS.aero, cifras: true, cuerpo: 11 }], x - radio, y + radio + 9, Infinity, 0);
}

/** Los tamaños de la hoja que pinta el plano. */
export const TAMANOS = SIMBOLOS;
