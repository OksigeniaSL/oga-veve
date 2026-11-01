/**
 * **La pantalla del respaldo de delante**, por dentro: el mapa del vuelo, vivo y
 * sencillo, en un lienzo.
 *
 * Sin una letra —«se juega sin saber leer»—: el mar azul, la tierra verde, el
 * camino en raya y el avión. Lo que ya se ha volado va en línea entera y lo que
 * falta en puntos, que es lo que enseña la lámina aprobada y lo que entiende
 * cualquiera que haya seguido un mapa con el dedo.
 *
 * Es lo que lleva el avión que la lleva (ver `disposicionDelPasaje` en
 * `flight/aircraft.ts`): el JAZ 90 no tiene pantallas en los respaldos, y un
 * regional en un salto de media hora tampoco, y aquí no se le pone ninguna.
 *
 * ## Lo que cuesta
 *
 * El mar y la tierra se pintan una vez, en un lienzo aparte, con sus dos mil
 * setecientos puntos de costa; lo de encima, solo **cuando el avión se ha movido
 * un píxel**. A la velocidad de verdad eso es cada medio minuto, y con el ⏩ a
 * ×16, cada dos segundos. Subir la textura una vez cada tanto no se nota, y
 * subirla en cada fotograma sería pagar por un dibujo que no ha cambiado.
 */

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import {
  avionEnElMapa,
  caminoEnElMapa,
  enElMapa,
  ENCUADRE,
  PROPORCION_DEL_MAPA,
  sitioEnElMapa,
  type AvionEnElMapa,
} from "../flight/mapa-del-vuelo";
import { DE_MADRID_A_ASUNCION, type PerfilDelVuelo } from "../flight/ruta-larga";
import { COSTAS_DE_LA_RUTA } from "../ui/costas-de-la-ruta";

/** Lo que mide el lienzo, px: la pantalla entera llena la vista en el plano `respaldo`. */
const ANCHO = 1024;
const ALTO = Math.round(ANCHO / PROPORCION_DEL_MAPA);

const COLOR = {
  // Los de la lámina de la pantalla: el mar azul de un mapa de escuela y la tierra verde clara.
  marArriba: "#2b86e8",
  marAbajo: "#1a68d0",
  tierra: "#8fd06c",
  costa: "#d6efb4",
  ecuador: "rgba(255,255,255,0.28)",
  camino: "#ffffff",
  avion: "#ffffff",
  sombra: "rgba(8,30,70,0.55)",
} as const;

/** Un punto del mapa, a píxeles del lienzo. */
const aPx = (p: { readonly x: number; readonly y: number }): readonly [number, number] => [p.x * ANCHO, p.y * ALTO];

/** **El avión, visto desde arriba**: morro hacia arriba, sobre su propio centro, en px. */
function dibujarElAvion(c: CanvasRenderingContext2D, x: number, y: number, apunta: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(apunta);
  const trazar = (): void => {
    // El fuselaje, el ala en flecha y la cola: dos motores no caben a este tamaño, y se ve igual.
    c.beginPath();
    c.moveTo(0, -30);
    c.quadraticCurveTo(4.5, -24, 4.5, -14);
    c.lineTo(4.5, -8);
    c.lineTo(30, 8);
    c.lineTo(30, 13);
    c.lineTo(4.5, 5);
    c.lineTo(3.5, 18);
    c.lineTo(12, 25);
    c.lineTo(12, 29);
    c.lineTo(0, 25);
    c.lineTo(-12, 29);
    c.lineTo(-12, 25);
    c.lineTo(-3.5, 18);
    c.lineTo(-4.5, 5);
    c.lineTo(-30, 13);
    c.lineTo(-30, 8);
    c.lineTo(-4.5, -8);
    c.lineTo(-4.5, -14);
    c.quadraticCurveTo(-4.5, -24, 0, -30);
    c.closePath();
  };
  c.fillStyle = COLOR.sombra;
  c.translate(2, 4);
  trazar();
  c.fill();
  c.translate(-2, -4);
  c.fillStyle = COLOR.avion;
  trazar();
  c.fill();
  c.restore();
}

/** Pinta el fondo: el mar, la tierra y la raya del ecuador. Solo una vez. */
function pintarElFondo(c: CanvasRenderingContext2D): void {
  const mar = c.createLinearGradient(0, 0, 0, ALTO);
  mar.addColorStop(0, COLOR.marArriba);
  mar.addColorStop(1, COLOR.marAbajo);
  c.fillStyle = mar;
  c.fillRect(0, 0, ANCHO, ALTO);
  c.fillStyle = COLOR.tierra;
  c.strokeStyle = COLOR.costa;
  c.lineWidth = 1.5;
  c.lineJoin = "round";
  for (const costa of COSTAS_DE_LA_RUTA) {
    c.beginPath();
    costa.forEach(([lon, lat], i) => {
      const [x, y] = aPx(enElMapa(lon, lat));
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.fill();
    c.stroke();
  }
  // El ecuador: es lo que se cruza dormido, y aquí es donde se ve cruzarlo.
  const [, yEcuador] = aPx(enElMapa(ENCUADRE.oeste, 0));
  c.strokeStyle = COLOR.ecuador;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, yEcuador);
  c.lineTo(ANCHO, yEcuador);
  c.stroke();
}

/**
 * **El dibujo entero** en un contexto de dos dimensiones, con el fondo ya
 * pintado en `fondo`. Separado de la textura para poder mirarlo en un lienzo
 * cualquiera.
 */
function pintarElMapa(c: CanvasRenderingContext2D, fondo: CanvasImageSource, avion: AvionEnElMapa, camino: ReturnType<typeof caminoEnElMapa>): void {
  c.drawImage(fondo, 0, 0);
  c.lineCap = "round";
  c.lineJoin = "round";
  const trazo = (desde: number, hasta: number): void => {
    c.beginPath();
    let empezado = false;
    for (const p of camino) {
      if (p.recorrido < desde || p.recorrido > hasta) continue;
      const [x, y] = aPx(p);
      if (empezado) c.lineTo(x, y);
      else c.moveTo(x, y);
      empezado = true;
    }
    return empezado ? c.stroke() : undefined;
  };
  const [xAvion, yAvion] = aPx(avion);
  // Lo que falta, en puntos; lo que ya se voló, entero.
  c.strokeStyle = COLOR.camino;
  c.lineWidth = 4;
  c.setLineDash([10, 11]);
  trazo(avion.recorrido, Infinity);
  c.setLineDash([]);
  c.lineWidth = 5;
  trazo(0, avion.recorrido);
  // Y hasta el avión justo: los puntos del camino van cada cien kilómetros.
  const anterior = [...camino].reverse().find((p) => p.recorrido <= avion.recorrido);
  if (anterior) {
    const [x, y] = aPx(anterior);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(xAvion, yAvion);
    c.stroke();
  }
  // Los dos extremos: de dónde se sale y adónde se va.
  for (const s of [DE_MADRID_A_ASUNCION.desde, DE_MADRID_A_ASUNCION.hasta]) {
    const [x, y] = aPx(sitioEnElMapa(s));
    c.fillStyle = COLOR.camino;
    c.beginPath();
    c.arc(x, y, 8, 0, 2 * Math.PI);
    c.fill();
    c.fillStyle = COLOR.marAbajo;
    c.beginPath();
    c.arc(x, y, 3.5, 0, 2 * Math.PI);
    c.fill();
  }
  dibujarElAvion(c, xAvion, yAvion, avion.apunta);
}

/**
 * **Lo que puede enseñar la pantalla**: el camino entero, el trozo que se está
 * cruzando, la pelota, los relojes de las dos ciudades y los datos del vuelo. La
 * pantalla sabe pintarlos; qué modos se ofrecen a quién lo decide la consola.
 */
export type ModoDeLaPantalla = "mapa" | "cerca" | "pelota" | "relojes" | "datos";

export class PantallaDelRespaldo {
  /** Lo que pinta la pantalla. `null` sin lienzo: en las pruebas. */
  readonly textura: CanvasTexture | null = null;
  /** Lo que está enseñando ahora. */
  modo: ModoDeLaPantalla = "mapa";
  private readonly contexto: CanvasRenderingContext2D | null = null;
  private readonly fondo: HTMLCanvasElement | null = null;
  private readonly camino = caminoEnElMapa();
  /** Dónde se pintó el avión por última vez, px. Ver la cabecera. */
  private pintadoEn: readonly [number, number] | null = null;

  constructor() {
    if (typeof document === "undefined") return;
    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    const fondo = document.createElement("canvas");
    fondo.width = ANCHO;
    fondo.height = ALTO;
    const c = lienzo.getContext("2d");
    const cf = fondo.getContext("2d");
    if (!c || !cf) return;
    pintarElFondo(cf);
    this.contexto = c;
    this.fondo = fondo;
    const t = new CanvasTexture(lienzo);
    // Sin esto, three.js lo toma por lineal y el mar sale lavado. Ver la memoria de los lienzos.
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    t.magFilter = LinearFilter;
    t.minFilter = LinearMipmapLinearFilter;
    this.textura = t;
  }

  /**
   * **Pone el avión donde va**, a `t` segundos del despegue. Solo repinta si se
   * ha movido: ver la cabecera. Devuelve si repintó.
   */
  poner(perfil: PerfilDelVuelo, t: number): boolean {
    const avion = avionEnElMapa(perfil, t);
    const [x, y] = aPx(avion);
    const antes = this.pintadoEn;
    if (antes && Math.hypot(x - antes[0], y - antes[1]) < 1) return false;
    this.pintadoEn = [x, y];
    if (!this.contexto || !this.fondo || !this.textura) return true;
    pintarElMapa(this.contexto, this.fondo, avion, this.camino);
    this.textura.needsUpdate = true;
    return true;
  }

  /** Cambia lo que enseña. Devuelve si cambió: el siguiente `poner` lo repinta. */
  mostrar(modo: ModoDeLaPantalla): boolean {
    if (modo === this.modo) return false;
    this.modo = modo;
    this.pintadoEn = null;
    return true;
  }

  dispose(): void {
    this.textura?.dispose();
  }
}
