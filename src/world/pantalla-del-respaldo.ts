/**
 * **La pantalla del respaldo de delante**, por dentro: el mapa del vuelo, vivo y
 * sencillo, en un lienzo, y lo que da de verdad un mapa de a bordo.
 *
 * - **mapa**: el mar azul, la tierra verde, el camino en raya y el avión, con la raya
 *   del día y la noche y la noche sombreada. Lo que ya se ha volado va en línea
 *   entera y lo que falta en puntos, que es lo que enseña la lámina aprobada y lo que
 *   entiende cualquiera que haya seguido un mapa con el dedo.
 * - **cerca**: el avión grande sobre el trozo de mapa que está cruzando, y el sitio que se
 *   esté contando, si se cuenta alguno: ver `marcar`.
 * - **pelota**: la Tierra como pelota, donde el camino sale recto. Ver
 *   `flight/mapa-del-vuelo.ts`.
 * - **relojes**: Madrid y Asunción con sus agujas, y un sol o una luna. Cada reloj
 *   cuelga de su ciudad en el mismo mapa: se sabe cuál es cuál sin leer.
 * - **datos**: ALT, GS, ETA y compañía, con cifras, para los peldaños que las leen.
 *
 * Los tres primeros, sin una letra: «se juega sin saber leer». Los relojes llevan el
 * nombre de la ciudad, que acompaña y no hace falta.
 *
 * Es lo que lleva el avión que la lleva (ver `disposicionDelPasaje` en
 * `flight/aircraft.ts`): el JAZ 90 no tiene pantallas en los respaldos, y un
 * regional en un salto de media hora tampoco, y aquí no se le pone ninguna.
 *
 * ## Lo que cuesta
 *
 * El mar y la tierra del mapa se pintan una vez, en un lienzo aparte, con sus dos mil
 * setecientos puntos de costa, y los de la pelota igual, la primera vez que se pide;
 * lo de encima, solo **cuando cambia algo que se ve**: el avión se ha movido un
 * píxel o el sol ha movido la raya. A la velocidad de verdad eso es cada medio minuto,
 * y con el ⏩ a ×16, cada dos segundos. Subir la textura una vez cada tanto no se nota,
 * y subirla en cada fotograma sería pagar por un dibujo que no ha cambiado.
 *
 * El trozo de cerca no tiene lienzo aparte, porque el mapa entero a esa escala son
 * veintinueve megapíxeles: se pinta lo que cae en el encuadre, y se tira el resto por
 * su caja. Medido el 01-11-2026 en este portátil (`scripts/ver-pantalla-respaldo.mjs`),
 * un repintado le quita al hilo del juego menos de medio milisegundo con el lienzo
 * acelerado, y unos cinco sin acelerar, y entre un modo y otro va poco: casi todo es
 * subir la textura con sus mipmaps, que no hay caché que lo quite. Lo que se ahorra
 * con el lienzo aparte ya está ahorrado.
 */

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import {
  avionEnElMapa,
  avionEnLaPelota,
  caminoEnElMapa,
  caminoEnLaPelota,
  datosDelVuelo,
  enElMapa,
  enLaPelota,
  ENCUADRE,
  nocheEnLaPelota,
  PROPORCION_DEL_MAPA,
  rayaDelDia,
  relojesEn,
  sitioEnElMapa,
  type AvionEnElMapa,
  type DatosDelVuelo,
  type EnElMapa,
  type LoQueMarcaElAvion,
  type Reloj,
} from "../flight/mapa-del-vuelo";
import { MILLA } from "../flight/ruta";
import { DE_MADRID_A_ASUNCION, dondeVa, type PerfilDelVuelo } from "../flight/ruta-larga";
import { t as texto } from "../i18n";
import { COSTAS_DE_LA_PELOTA } from "../ui/costas-de-la-pelota";
import { PAPEL, TINTAS } from "../ui/carta/estilo";
import { COSTAS_DE_LA_RUTA } from "../ui/costas-de-la-ruta";
import { NUDOS, PIES } from "../ui/cuadro";
import { GRADO } from "./cielo-de-noche";
import type { Sitio } from "./entre-aerodromos";
import { rectanguloRedondeado } from "../navegador-viejo";

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
  // El de la marca: el ámbar de los avisos que no asustan, que no se confunde con el mar ni con la tierra.
  marca: "#ffc22e",
  // La noche deja ver lo de debajo: quien la mira tiene que seguir reconociendo la costa.
  noche: "rgba(6,14,52,0.58)",
  raya: "rgba(255,216,130,0.9)",
  // Las esferas de los relojes, una de día y otra de noche: el color acompaña al dibujo del sol o la luna.
  esferaDia: "#fff9e8",
  esferaNoche: "#14234f",
  agujaDia: "#1d2b4f",
  agujaNoche: "#f4f1e4",
  soles: "#ffc22e",
  luna: "#f4eec4",
  // Los del panel de datos: el fondo oscuro de un mapa de a bordo, con el rótulo en el ocre que escribe de DESIGN.md.
  panel: "#0c1834",
  ficha: "#14244a",
  rotulo: "#f2b05c",
  valor: "#ffffff",
  glosa: "#a9b8d6",
} as const;

/** La letra de cabina, para los rótulos y las cifras, y la del HUD para lo demás. Las dos, las de DESIGN.md. */
const FUENTE = '"Roboto Condensed", "Liberation Sans Narrow", "Arial Narrow", "DejaVu Sans Condensed", ui-sans-serif, sans-serif';
const FUENTE_HUD = '"Oga Redonda", "Varela Round", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** **Dónde y de qué tamaño va la pelota en el lienzo**, px: lo que cabe dejando sitio a su halo. */
export const LA_PELOTA = { x: ANCHO / 2, y: ALTO / 2, radio: 296 } as const;

/** Un punto de la pelota, a píxeles del lienzo. */
export const aPxDeLaPelota = (p: { readonly x: number; readonly y: number }): readonly [number, number] => [
  LA_PELOTA.x + p.x * LA_PELOTA.radio,
  LA_PELOTA.y + p.y * LA_PELOTA.radio,
];

/**
 * **Lo que abarca el modo cerca**, px por grado de latitud: 20 son unos 3.500 km de
 * alto por 5.700 de ancho. Los mapas de a bordo se acercan más, pero las costas son
 * las de 1:50m simplificadas a nueve kilómetros y redondeadas a una décima de grado:
 * más cerca, las Canarias son triángulos y la costa se ve a tramos rectos. Con este
 * encuadre aguantan, y en medio del Atlántico sigue cabiendo tierra a los dos lados.
 */
export const PX_POR_GRADO_DE_CERCA = 20;

/**
 * **La marca del sitio que se cuenta**: lo que se ve durante la frase en que el sitio queda
 * debajo del avión del modo cerca. Con el avión encima, una isla de cinco píxeles no se ve,
 * y es justo cuando se dice que estamos encima. Sin una letra, como el resto de este modo.
 *
 * `latido` es lo que dura uno y `cada` cada cuánto se repinta, ms: un aro no pide más, y
 * subir la textura en cada fotograma sería pagar por él. `avion` es lo opaco que se queda el
 * avión mientras tanto: sigue viéndose, y se ve lo que tiene debajo.
 */
const MARCA = { aro: 28, crece: 16, onda: 62, latido: 1600, cada: 100, avion: 0.55 } as const;

/** Un punto del mapa, a píxeles del lienzo. */
const aPx = (p: { readonly x: number; readonly y: number }): readonly [number, number] => [p.x * ANCHO, p.y * ALTO];

/** **El avión, visto desde arriba**: morro hacia arriba, sobre su propio centro, en px. */
function dibujarElAvion(c: CanvasRenderingContext2D, x: number, y: number, apunta: number, escala = 1, perfil: string | null = null): void {
  c.save();
  c.translate(x, y);
  c.rotate(apunta);
  c.scale(escala, escala);
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
  if (perfil) {
    // Sobre papel, la sombra azul se ensucia: va con perfil de tinta.
    c.strokeStyle = perfil;
    c.lineWidth = 4;
    c.lineJoin = "round";
    trazar();
    c.stroke();
  } else {
    c.fillStyle = COLOR.sombra;
    c.translate(2, 4);
    trazar();
    c.fill();
    c.translate(-2, -4);
  }
  c.fillStyle = COLOR.avion;
  trazar();
  c.fill();
  c.restore();
}

/**
 * **La marca sobre su sitio**: la isla misma, por encima del avión y del color del aro; un aro
 * que late, y una onda que sale de él. Con contorno oscuro, para que se lea sobre el mar, sobre
 * la tierra y sobre el avión. `fase` va de 0 a 1 en cada latido.
 */
function pintarLaMarca(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  fase: number,
  costa: readonly (readonly [number, number])[],
  proyectar: (lon: number, lat: number) => readonly [number, number],
): void {
  const aro = MARCA.aro + MARCA.crece * (0.5 - 0.5 * Math.cos(2 * Math.PI * fase));
  const onda = MARCA.aro + MARCA.onda * fase;
  c.save();
  c.setLineDash([]);
  c.fillStyle = COLOR.marca;
  c.strokeStyle = COLOR.sombra;
  c.lineWidth = 1.5;
  c.beginPath();
  costa.forEach(([lon, lat], i) => {
    const [px, py] = proyectar(lon, lat);
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  });
  c.closePath();
  c.fill();
  c.stroke();
  c.globalAlpha = 0.85 * (1 - fase);
  c.strokeStyle = COLOR.marca;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(x, y, onda, 0, 2 * Math.PI);
  c.stroke();
  c.globalAlpha = 1;
  c.strokeStyle = COLOR.sombra;
  c.lineWidth = 11;
  c.beginPath();
  c.arc(x, y, aro, 0, 2 * Math.PI);
  c.stroke();
  c.strokeStyle = COLOR.marca;
  c.lineWidth = 6;
  c.stroke();
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

/** Lo que el dibujo del camino necesita de un punto: dónde cae y por dónde va. */
type PuntoDelCamino = { readonly recorrido: number };

/**
 * **El camino**: lo que falta en puntos y lo ya volado entero, hasta el avión justo,
 * con la proyección que traiga cada modo. `grueso` escala las rayas.
 */
function pintarElCamino<P extends PuntoDelCamino>(
  c: CanvasRenderingContext2D,
  camino: readonly P[],
  proyectar: (p: P) => readonly [number, number],
  recorrido: number,
  xAvion: number,
  yAvion: number,
  grueso = 1,
): void {
  c.lineCap = "round";
  c.lineJoin = "round";
  const trazo = (desde: number, hasta: number): void => {
    c.beginPath();
    let empezado = false;
    for (const p of camino) {
      if (p.recorrido < desde || p.recorrido > hasta) continue;
      const [x, y] = proyectar(p);
      if (empezado) c.lineTo(x, y);
      else c.moveTo(x, y);
      empezado = true;
    }
    return empezado ? c.stroke() : undefined;
  };
  // Lo que falta, en puntos; lo que ya se voló, entero.
  c.strokeStyle = COLOR.camino;
  c.lineWidth = 4 * grueso;
  c.setLineDash([10 * grueso, 11 * grueso]);
  trazo(recorrido, Infinity);
  c.setLineDash([]);
  c.lineWidth = 5 * grueso;
  trazo(0, recorrido);
  // Y hasta el avión justo: los puntos del camino van cada cien kilómetros.
  const anterior = [...camino].reverse().find((p) => p.recorrido <= recorrido);
  if (anterior) {
    const [x, y] = proyectar(anterior);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(xAvion, yAvion);
    c.stroke();
  }
}

/** Una ciudad de las dos del viaje, en px: de dónde se sale y adónde se va. */
function pintarLaCiudad(c: CanvasRenderingContext2D, x: number, y: number, escala = 1): void {
  c.fillStyle = COLOR.camino;
  c.beginPath();
  c.arc(x, y, 8 * escala, 0, 2 * Math.PI);
  c.fill();
  c.fillStyle = COLOR.marAbajo;
  c.beginPath();
  c.arc(x, y, 3.5 * escala, 0, 2 * Math.PI);
  c.fill();
}

/**
 * **La noche sobre un mapa de longitud y latitud**, sea cual sea: la sombra hasta
 * el polo de su lado y la raya encima. Los polos caen fuera de cualquier encuadre de
 * los que hay, y por eso el polígono se cierra por ellos sin que se vea.
 */
function pintarLaNoche(
  c: CanvasRenderingContext2D,
  instante: Date,
  proyectar: (lon: number, lat: number) => readonly [number, number],
  oeste: number,
  este: number,
  paso: number,
): void {
  const { puntos, nocheAlSur } = rayaDelDia(instante, oeste, este, paso);
  const trazar = (): void => {
    c.beginPath();
    puntos.forEach((p, i) => {
      const [x, y] = proyectar(p.lon, p.lat);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
  };
  const polo = nocheAlSur ? -90 : 90;
  trazar();
  c.lineTo(...proyectar(este, polo));
  c.lineTo(...proyectar(oeste, polo));
  c.closePath();
  c.fillStyle = COLOR.noche;
  c.fill();
  trazar();
  c.strokeStyle = COLOR.raya;
  c.lineWidth = 2.5;
  c.lineJoin = "round";
  c.stroke();
}

/** La noche del mapa entero. Un grado de paso son siete píxeles: la raya no se quiebra. */
function pintarLaNocheDelMapa(c: CanvasRenderingContext2D, instante: Date): void {
  pintarLaNoche(c, instante, (lon, lat) => aPx(enElMapa(lon, lat)), ENCUADRE.oeste, ENCUADRE.este, 1);
}

/**
 * **El mapa entero**, en un contexto de dos dimensiones, con el fondo ya pintado en
 * `fondo`. Separado de la textura para poder mirarlo en un lienzo cualquiera.
 */
function pintarElMapa(c: CanvasRenderingContext2D, fondo: CanvasImageSource, avion: AvionEnElMapa, camino: ReturnType<typeof caminoEnElMapa>, instante: Date): void {
  c.drawImage(fondo, 0, 0);
  // Debajo del camino: lo que se vuela de noche tiene que seguir viéndose igual de blanco.
  pintarLaNocheDelMapa(c, instante);
  const [xAvion, yAvion] = aPx(avion);
  pintarElCamino(c, camino, aPx, avion.recorrido, xAvion, yAvion);
  for (const s of [DE_MADRID_A_ASUNCION.desde, DE_MADRID_A_ASUNCION.hasta]) {
    const [x, y] = aPx(sitioEnElMapa(s));
    pintarLaCiudad(c, x, y);
  }
  dibujarElAvion(c, xAvion, yAvion, avion.apunta);
}

// ── Cerca ───────────────────────────────────────────────────────────────

/** La caja de cada costa, en grados: para tirar sin proyectar lo que cae fuera del encuadre. */
const CAJAS_DE_LAS_COSTAS = COSTAS_DE_LA_RUTA.map((costa) => {
  let [oeste, este, sur, norte] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [lon, lat] of costa) {
    if (lon < oeste) oeste = lon;
    if (lon > este) este = lon;
    if (lat < sur) sur = lat;
    if (lat > norte) norte = lat;
  }
  return { oeste, este, sur, norte };
});

/**
 * **La costa de un sitio**: la de caja más pequeña que lo contiene. Por la caja y no mirando si
 * cae dentro: a esta escala las islas son triángulos, y el sitio puede quedarse a un lado.
 */
function costaDe(sitio: Sitio): readonly (readonly [number, number])[] {
  let mejor: readonly (readonly [number, number])[] = [];
  let menor = Infinity;
  COSTAS_DE_LA_RUTA.forEach((costa, i) => {
    const caja = CAJAS_DE_LAS_COSTAS[i]!;
    if (sitio.lon < caja.oeste || sitio.lon > caja.este || sitio.lat < caja.sur || sitio.lat > caja.norte) return;
    const area = (caja.este - caja.oeste) * (caja.norte - caja.sur);
    if (area < menor) {
      menor = area;
      mejor = costa;
    }
  });
  return mejor;
}

/**
 * **El trozo de mapa que se está cruzando**, con el avión en el centro y grande.
 *
 * Con el norte arriba, como el mapa de al lado, y a escala **de ese sitio**: el grado
 * de longitud se encoge con el coseno de la latitud a la que va el avión. El mapa
 * entero no lo hace, y por eso allí la península sale ancha; aquí, a este tamaño, se
 * notaría, y con esto España tiene la forma que tiene y el avión apunta a su rumbo.
 */
function pintarDeCerca(
  c: CanvasRenderingContext2D,
  perfil: PerfilDelVuelo,
  t: number,
  instante: Date,
  camino: ReturnType<typeof caminoEnElMapa>,
  marca: { readonly sitio: Sitio; readonly fase: number } | null = null,
): void {
  const donde = dondeVa(perfil, t);
  const [lat0, lon0] = [donde.sitio.lat, donde.sitio.lon];
  const porLat = PX_POR_GRADO_DE_CERCA;
  const porLon = porLat * Math.cos(lat0 * GRADO);
  const proyectar = (lon: number, lat: number): readonly [number, number] => [ANCHO / 2 + (lon - lon0) * porLon, ALTO / 2 + (lat0 - lat) * porLat];
  const medioAncho = ANCHO / 2 / porLon + 1;
  const medioAlto = ALTO / 2 / porLat + 1;
  const [oeste, este, sur, norte] = [lon0 - medioAncho, lon0 + medioAncho, lat0 - medioAlto, lat0 + medioAlto];

  const mar = c.createLinearGradient(0, 0, 0, ALTO);
  mar.addColorStop(0, COLOR.marArriba);
  mar.addColorStop(1, COLOR.marAbajo);
  c.fillStyle = mar;
  c.fillRect(0, 0, ANCHO, ALTO);

  // Los paralelos y meridianos de cada diez grados: en medio del mar, son lo único que dice que se avanza.
  c.strokeStyle = "rgba(255,255,255,0.12)";
  c.lineWidth = 1.5;
  c.beginPath();
  for (let lon = Math.ceil(oeste / 10) * 10; lon <= este; lon += 10) {
    const [x] = proyectar(lon, lat0);
    c.moveTo(x, 0);
    c.lineTo(x, ALTO);
  }
  for (let lat = Math.ceil(sur / 10) * 10; lat <= norte; lat += 10) {
    const [, y] = proyectar(lon0, lat);
    c.moveTo(0, y);
    c.lineTo(ANCHO, y);
  }
  c.stroke();

  c.fillStyle = COLOR.tierra;
  c.strokeStyle = COLOR.costa;
  c.lineWidth = 2.5;
  c.lineJoin = "round";
  COSTAS_DE_LA_RUTA.forEach((costa, i) => {
    const caja = CAJAS_DE_LAS_COSTAS[i]!;
    if (caja.este < oeste || caja.oeste > este || caja.norte < sur || caja.sur > norte) return;
    c.beginPath();
    costa.forEach(([lon, lat], j) => {
      const [x, y] = proyectar(lon, lat);
      if (j === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.fill();
    c.stroke();
  });

  // El ecuador, más visible que en el mapa: aquí es donde se le ve cruzar.
  if (sur <= 0 && norte >= 0) {
    const [, y] = proyectar(lon0, 0);
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(ANCHO, y);
    c.stroke();
  }

  pintarLaNoche(c, instante, proyectar, oeste, este, (este - oeste) / 64);

  // El camino del mapa va en fracciones; aquí vuelve a grados por la cuenta inversa de la proyección.
  const anchoEnGrados = ENCUADRE.este - ENCUADRE.oeste;
  const altoEnGrados = ENCUADRE.norte - ENCUADRE.sur;
  const delCamino = (p: EnElMapa): readonly [number, number] => proyectar(ENCUADRE.oeste + p.x * anchoEnGrados, ENCUADRE.norte - p.y * altoEnGrados);
  pintarElCamino(c, camino, delCamino, donde.recorrido, ANCHO / 2, ALTO / 2, 1.5);
  for (const s of [DE_MADRID_A_ASUNCION.desde, DE_MADRID_A_ASUNCION.hasta]) {
    const [x, y] = proyectar(s.lon, s.lat);
    pintarLaCiudad(c, x, y, 1.5);
  }
  c.globalAlpha = marca ? MARCA.avion : 1;
  dibujarElAvion(c, ANCHO / 2, ALTO / 2, donde.rumbo, 2.4);
  c.globalAlpha = 1;
  // Con la misma cuenta que la costa: la marca cae donde cae la isla, esté donde esté el avión.
  if (marca) pintarLaMarca(c, ...proyectar(marca.sitio.lon, marca.sitio.lat), marca.fase, costaDe(marca.sitio), proyectar);
}

// ── La pelota ───────────────────────────────────────────────────────────

/**
 * **La Tierra como una bola puesta sobre una hoja de carta**, no en el espacio: es el
 * papel de la carta del juego, con sus tintas. La receta es de la dirección de arte
 * (`globo-carta/receta.md`). Mar y tierra van un punto más fuertes que en la hoja de
 * verdad: con los de la hoja no se distinguen de lejos, y a los cuatro años se tiene
 * que entender de un vistazo que es la Tierra.
 */
const DE_LA_PELOTA = {
  marDentro: "#a5cfe6",
  marFuera: "#8fbedb",
  tierra: "#c7d98f",
  orilla: "rgba(37, 95, 134, .10)",
  curvaDentro: "rgba(70, 55, 35, 0)",
  curvaFuera: "rgba(70, 55, 35, .24)",
  sombra: "rgba(90, 70, 40, .18)",
  brilloDelPliegue: "rgba(255, 255, 255, .22)",
  noche: "rgba(16, 32, 72, .52)",
} as const;

/** El marco de una carta: dos filetes y, entre ellos, la escala de tramos alternos. */
function pintarElMarcoDeLaCarta(c: CanvasRenderingContext2D): void {
  const [fuera, dentro] = [8, 15];
  const tramo = 40;
  c.fillStyle = TINTAS.tinta;
  for (let x = fuera, i = 0; x < ANCHO - fuera; x += tramo, i++) {
    if (i % 2) continue;
    const ancho = Math.min(tramo, ANCHO - fuera - x);
    c.fillRect(x, fuera, ancho, dentro - fuera);
    c.fillRect(x, ALTO - dentro, ancho, dentro - fuera);
  }
  for (let y = fuera, i = 0; y < ALTO - fuera; y += tramo, i++) {
    if (i % 2) continue;
    const alto = Math.min(tramo, ALTO - fuera - y);
    c.fillRect(fuera, y, dentro - fuera, alto);
    c.fillRect(ANCHO - dentro, y, dentro - fuera, alto);
  }
  c.strokeStyle = TINTAS.tinta;
  c.lineWidth = 1.5;
  c.strokeRect(fuera, fuera, ANCHO - 2 * fuera, ALTO - 2 * fuera);
  c.strokeRect(dentro, dentro, ANCHO - 2 * dentro, ALTO - 2 * dentro);
}

/** Una línea de la pelota, solo por su cara de delante. */
function trazarEnLaPelota(c: CanvasRenderingContext2D, puntos: readonly { readonly lon: number; readonly lat: number }[]): void {
  let empezado = false;
  for (const punto of puntos) {
    const p = enLaPelota(punto);
    if (p.z < 0) {
      empezado = false;
      continue;
    }
    const [x, y] = aPxDeLaPelota(p);
    if (empezado) c.lineTo(x, y);
    else c.moveTo(x, y);
    empezado = true;
  }
}

/** **El fondo de la pelota**: lo que no cambia en todo el vuelo. Solo una vez, y solo si se pide. */
function pintarElFondoDeLaPelota(c: CanvasRenderingContext2D): void {
  const { x: cx, y: cy, radio: r } = LA_PELOTA;
  c.fillStyle = PAPEL.fondo;
  c.fillRect(0, 0, ANCHO, ALTO);
  pintarElMarcoDeLaCarta(c);
  // La sombra de la bola sobre la hoja: sin ella, parece un círculo impreso.
  c.fillStyle = DE_LA_PELOTA.sombra;
  c.beginPath();
  c.arc(cx + 5, cy + 7, r + 2, 0, 2 * Math.PI);
  c.fill();
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, 2 * Math.PI);
  c.clip();
  const mar = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
  mar.addColorStop(0, DE_LA_PELOTA.marDentro);
  mar.addColorStop(1, DE_LA_PELOTA.marFuera);
  c.fillStyle = mar;
  c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // Una sola figura con todas las costas: con «evenodd», el Caspio queda como lo que es, un agujero en Eurasia.
  const costas = new Path2D();
  for (const costa of COSTAS_DE_LA_PELOTA) {
    costa.forEach(([lon, lat], i) => {
      const [x, y] = aPxDeLaPelota(enLaPelota({ lon, lat }));
      if (i === 0) costas.moveTo(x, y);
      else costas.lineTo(x, y);
    });
    costas.closePath();
  }
  // La orilla en el agua, como en las cartas: tres trazos de la costa antes de rellenar la tierra.
  c.lineJoin = "round";
  c.strokeStyle = DE_LA_PELOTA.orilla;
  for (const ancho of [15, 9, 4]) {
    c.lineWidth = ancho;
    c.stroke(costas);
  }
  c.fillStyle = DE_LA_PELOTA.tierra;
  c.fill(costas, "evenodd");
  // La retícula, cada treinta grados, también sobre la tierra. El ecuador, más grueso: es lo que se cruza.
  c.strokeStyle = PAPEL.reticula;
  c.lineWidth = 1;
  c.beginPath();
  for (let lon = -180; lon < 180; lon += 30) {
    const puntos = [];
    for (let lat = -90; lat <= 90; lat += 3) puntos.push({ lon, lat });
    trazarEnLaPelota(c, puntos);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue;
    const puntos = [];
    for (let lon = -180; lon <= 180; lon += 3) puntos.push({ lon, lat });
    trazarEnLaPelota(c, puntos);
  }
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  const ecuador = [];
  for (let lon = -180; lon <= 180; lon += 3) ecuador.push({ lon, lat: 0 });
  trazarEnLaPelota(c, ecuador);
  c.stroke();
  c.strokeStyle = TINTAS.agua;
  c.lineWidth = 1.3;
  c.lineJoin = "round";
  c.stroke(costas);
  // Hacia el borde la pelota se oscurece un poco, y es lo que hace que parezca redonda.
  const curva = c.createRadialGradient(cx, cy, r * 0.62, cx, cy, r);
  curva.addColorStop(0, DE_LA_PELOTA.curvaDentro);
  curva.addColorStop(1, DE_LA_PELOTA.curvaFuera);
  c.fillStyle = curva;
  c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  c.restore();
  c.strokeStyle = TINTAS.tinta;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, r, 0, 2 * Math.PI);
  c.stroke();
  // Los dos pliegues de una carta doblada en cuatro, por encima de la bola.
  const pliegue = (x0: number, y0: number, x1: number, y1: number): void => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  };
  c.lineWidth = 1.5;
  c.strokeStyle = PAPEL.pliegue;
  pliegue(cx, 0, cx, ALTO);
  pliegue(0, cy, ANCHO, cy);
  c.strokeStyle = DE_LA_PELOTA.brilloDelPliegue;
  pliegue(cx + 1.5, 0, cx + 1.5, ALTO);
  pliegue(0, cy + 1.5, ANCHO, cy + 1.5);
}

/** **El camino, como la ruta de la carta**: en su magenta, con una orla de papel que lo despega de lo de abajo. */
function pintarElCaminoDeLaCarta(
  c: CanvasRenderingContext2D,
  camino: ReturnType<typeof caminoEnLaPelota>,
  recorrido: number,
  xAvion: number,
  yAvion: number,
): void {
  const trazo = (desde: number, hasta: number, conElAvion: boolean): void => {
    c.beginPath();
    let empezado = false;
    for (const p of camino) {
      if (p.recorrido < desde || p.recorrido > hasta) continue;
      const [x, y] = aPxDeLaPelota(p);
      if (empezado) c.lineTo(x, y);
      else c.moveTo(x, y);
      empezado = true;
    }
    // Hasta el avión justo: los puntos del camino van cada cien kilómetros.
    if (conElAvion && empezado) c.lineTo(xAvion, yAvion);
    if (empezado) c.stroke();
  };
  c.lineCap = "round";
  c.lineJoin = "round";
  c.setLineDash([]);
  c.strokeStyle = PAPEL.fondo;
  c.lineWidth = 8;
  trazo(0, Infinity, false);
  c.strokeStyle = TINTAS.ruta;
  c.lineWidth = 4;
  c.setLineDash([9, 10]);
  trazo(recorrido, Infinity, false);
  c.setLineDash([]);
  c.lineWidth = 5;
  trazo(0, recorrido, true);
}

/** Una de las dos ciudades del viaje, como un punto de la carta: orla de papel, aro de la ruta y punto de tinta. */
function pintarLaCiudadDeLaCarta(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.fillStyle = PAPEL.fondo;
  c.beginPath();
  c.arc(x, y, 9, 0, 2 * Math.PI);
  c.fill();
  c.strokeStyle = TINTAS.ruta;
  c.lineWidth = 3.5;
  c.beginPath();
  c.arc(x, y, 7, 0, 2 * Math.PI);
  c.stroke();
  c.fillStyle = TINTAS.tinta;
  c.beginPath();
  c.arc(x, y, 2.6, 0, 2 * Math.PI);
  c.fill();
}

/** La pelota entera, con el fondo ya pintado. */
function pintarLaPelota(c: CanvasRenderingContext2D, fondo: CanvasImageSource, perfil: PerfilDelVuelo, t: number, instante: Date, camino: ReturnType<typeof caminoEnLaPelota>): void {
  c.drawImage(fondo, 0, 0);
  const { raya, borde } = nocheEnLaPelota(instante);
  c.beginPath();
  raya.forEach((p, i) => {
    const [x, y] = aPxDeLaPelota({ x: p[0], y: p[1] });
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  for (const p of borde) {
    const [x, y] = aPxDeLaPelota({ x: p[0], y: p[1] });
    c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = DE_LA_PELOTA.noche;
  c.fill();
  c.beginPath();
  raya.forEach((p, i) => {
    const [x, y] = aPxDeLaPelota({ x: p[0], y: p[1] });
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.strokeStyle = TINTAS.elegido;
  c.lineWidth = 2.5;
  c.lineJoin = "round";
  c.stroke();
  const avion = avionEnLaPelota(perfil, t);
  const [xAvion, yAvion] = aPxDeLaPelota(avion);
  pintarElCaminoDeLaCarta(c, camino, avion.recorrido, xAvion, yAvion);
  for (const s of [DE_MADRID_A_ASUNCION.desde, DE_MADRID_A_ASUNCION.hasta]) {
    const [x, y] = aPxDeLaPelota(enLaPelota(s));
    pintarLaCiudadDeLaCarta(c, x, y);
  }
  dibujarElAvion(c, xAvion, yAvion, avion.apunta, 0.9, TINTAS.tinta);
}

// ── Los relojes ─────────────────────────────────────────────────────────

/** El sol: un círculo y sus rayos. */
function dibujarElSol(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.fillStyle = COLOR.soles;
  c.strokeStyle = COLOR.soles;
  c.lineWidth = r * 0.2;
  c.lineCap = "round";
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    c.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.5, 0, 2 * Math.PI);
  c.fill();
}

/** La luna: un gajo, con el hueco hacia la derecha. */
function dibujarLaLuna(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.fillStyle = COLOR.luna;
  c.beginPath();
  c.arc(x, y, r * 0.78, 0.35 * Math.PI, 1.65 * Math.PI);
  c.arc(x + r * 0.42, y, r * 0.62, 1.42 * Math.PI, 0.58 * Math.PI, true);
  c.closePath();
  c.fill();
}

/** Una bandera pequeña: lo que distingue las dos ciudades también sin el mapa. */
function dibujarLaBandera(c: CanvasRenderingContext2D, x: number, y: number, de: "es" | "py"): void {
  const [w, h] = [54, 34];
  const franjas = de === "es" ? ([["#c60b1e", 0.25], ["#ffc400", 0.5], ["#c60b1e", 0.25]] as const) : ([["#d52b1e", 1 / 3], ["#ffffff", 1 / 3], ["#0038a8", 1 / 3]] as const);
  let y0 = y;
  for (const [color, parte] of franjas) {
    c.fillStyle = color;
    c.fillRect(x, y0, w, h * parte);
    y0 += h * parte;
  }
  c.strokeStyle = "rgba(255,255,255,0.9)";
  c.lineWidth = 2;
  c.strokeRect(x, y, w, h);
}

/** **Un reloj colgado de su ciudad**: la línea, la esfera sin números, las agujas, el sol o la luna y el nombre. */
function pintarUnReloj(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  ciudad: readonly [number, number],
  reloj: Reloj,
  nombre: string,
  bandera: "es" | "py",
): void {
  const r = 132;
  const dia = reloj.deDia;
  const tinta = dia ? COLOR.agujaDia : COLOR.agujaNoche;
  // La línea hasta la ciudad, por debajo de la esfera: es lo que dice de quién es este reloj.
  c.strokeStyle = COLOR.camino;
  c.lineWidth = 4;
  c.lineCap = "round";
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ciudad[0], ciudad[1]);
  c.stroke();
  // La esfera.
  c.fillStyle = "rgba(8,20,50,0.45)";
  c.beginPath();
  c.arc(x + 3, y + 6, r + 7, 0, 2 * Math.PI);
  c.fill();
  c.fillStyle = dia ? COLOR.esferaDia : COLOR.esferaNoche;
  c.beginPath();
  c.arc(x, y, r, 0, 2 * Math.PI);
  c.fill();
  c.strokeStyle = COLOR.camino;
  c.lineWidth = 7;
  c.stroke();
  // Las marcas: doce y sin un número, que es como las enseña la lección del reloj.
  c.strokeStyle = tinta;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const largo = i % 3 === 0 ? 24 : 12;
    c.lineWidth = i % 3 === 0 ? 7 : 3.5;
    c.beginPath();
    c.moveTo(x + Math.sin(a) * (r - 14), y - Math.cos(a) * (r - 14));
    c.lineTo(x + Math.sin(a) * (r - 14 - largo), y - Math.cos(a) * (r - 14 - largo));
    c.stroke();
  }
  // Las agujas: la corta y gorda, la de las horas; la larga y fina, la de los minutos.
  const aguja = (a: number, largo: number, grueso: number): void => {
    c.lineWidth = grueso;
    c.beginPath();
    c.moveTo(x - Math.sin(a) * 16, y + Math.cos(a) * 16);
    c.lineTo(x + Math.sin(a) * largo, y - Math.cos(a) * largo);
    c.stroke();
  };
  aguja(reloj.aguja.hora, r * 0.52, 13);
  aguja(reloj.aguja.minuto, r * 0.8, 7);
  c.fillStyle = tinta;
  c.beginPath();
  c.arc(x, y, 11, 0, 2 * Math.PI);
  c.fill();
  // El sol o la luna, fuera de la esfera y arriba: así ninguna aguja lo tapa nunca.
  const [xi, yi] = [x + r * 0.78, y - r * 0.78];
  c.fillStyle = dia ? "#2b86e8" : "#0a1436";
  c.beginPath();
  c.arc(xi, yi, 40, 0, 2 * Math.PI);
  c.fill();
  c.strokeStyle = COLOR.camino;
  c.lineWidth = 4;
  c.stroke();
  if (dia) dibujarElSol(c, xi, yi, 31);
  else dibujarLaLuna(c, xi, yi, 31);
  // El nombre, debajo y con la bandera: acompaña; lo que se entiende sin leer son la línea y la bandera.
  c.font = `700 32px ${FUENTE_HUD}`;
  const ancho = c.measureText(nombre).width;
  const xNombre = x - (ancho + 54 + 12) / 2;
  const yNombre = y + r + 34;
  c.fillStyle = "rgba(8,20,50,0.62)";
  c.fillRect(xNombre - 12, yNombre - 26, ancho + 54 + 12 + 24, 52);
  dibujarLaBandera(c, xNombre, yNombre - 17, bandera);
  c.fillStyle = COLOR.camino;
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillText(nombre, xNombre + 54 + 12, yNombre + 1);
}

/**
 * **Los dos relojes sobre el mapa**: el de cada ciudad, a su lado del camino y con una
 * línea hasta ella. Debajo sigue el mapa con su noche, que es la explicación de
 * todo: se ve de qué lado de la raya cae cada ciudad, y por qué lleva sol o luna.
 */
function pintarLosRelojes(c: CanvasRenderingContext2D, fondo: CanvasImageSource, avion: AvionEnElMapa, camino: ReturnType<typeof caminoEnElMapa>, instante: Date): void {
  pintarElMapa(c, fondo, avion, camino, instante);
  c.fillStyle = "rgba(6,18,48,0.25)";
  c.fillRect(0, 0, ANCHO, ALTO);
  const { madrid, asuncion } = relojesEn(instante);
  pintarUnReloj(c, 806, 292, aPx(sitioEnElMapa(DE_MADRID_A_ASUNCION.desde)), madrid, "Madrid", "es");
  pintarUnReloj(c, 214, 272, aPx(sitioEnElMapa(DE_MADRID_A_ASUNCION.hasta)), asuncion, "Asunción", "py");
}

// ── Los datos ───────────────────────────────────────────────────────────

/** Una ficha del panel de datos, ya escrita. */
export interface FichaDeDatos {
  /** El rótulo aeronáutico: no se traduce. */
  readonly rotulo: string;
  readonly valor: string;
  readonly unidad: string;
  /** La glosa de debajo: esta sí. */
  readonly glosa: string;
}

/** Un número con sus miles separados: un espacio estrecho, que no dice ni coma ni punto en ningún idioma. */
const conMiles = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const dosCifras = (n: number): string => String(n).padStart(2, "0");

/**
 * **Lo que dicen las fichas**, en las unidades de la cabina: nudos y pies, como manda
 * la regla de los rótulos, y con las conversiones del cuadro de mandos (`ui/cuadro.ts`).
 * La altitud de cien en cien pies, que es lo que un mapa de a bordo enseña: si no, el
 * número baila con cada racha y la textura se sube sin que nadie lea nada nuevo.
 */
export function fichasDeDatos(d: DatosDelVuelo): readonly FichaDeDatos[] {
  const grados = Math.round(d.temperatura);
  const minutos = Math.round(d.faltaDeTiempo / 60);
  const llegada = Math.floor(d.llegada / 60);
  return [
    { rotulo: "ALT", valor: conMiles(Math.round((d.altitud * PIES) / 100) * 100), unidad: "FT", glosa: texto("pantalla.datos.alt") },
    { rotulo: "GS", valor: String(Math.round(d.velocidad * NUDOS)), unidad: "KT", glosa: texto("pantalla.datos.gs") },
    { rotulo: "OAT", valor: `${grados > 0 ? "+" : grados < 0 ? "−" : ""}${Math.abs(grados)}`, unidad: "°C", glosa: texto("pantalla.datos.oat") },
    { rotulo: "ETA", valor: `${dosCifras(Math.floor(llegada / 60) % 24)}:${dosCifras(llegada % 60)}`, unidad: "", glosa: texto("pantalla.datos.eta") },
    { rotulo: "DTG", valor: conMiles(Math.round(d.faltaDeCamino / MILLA)), unidad: "NM", glosa: texto("pantalla.datos.dtg") },
    { rotulo: "ETE", valor: `${Math.floor(minutos / 60)}:${dosCifras(minutos % 60)}`, unidad: "H", glosa: texto("pantalla.datos.ete") },
  ];
}

/** **El panel de datos**: seis fichas y la barra de lo hecho del camino, de ciudad a ciudad. */
function pintarLosDatos(c: CanvasRenderingContext2D, fichas: readonly FichaDeDatos[], hecho: number): void {
  c.fillStyle = COLOR.panel;
  c.fillRect(0, 0, ANCHO, ALTO);
  const margen = 28;
  const hueco = 18;
  const barra = 90;
  const ancho = (ANCHO - 2 * margen - 2 * hueco) / 3;
  const alto = (ALTO - 2 * margen - barra - 2 * hueco) / 2;
  fichas.forEach((f, i) => {
    const x = margen + (i % 3) * (ancho + hueco);
    const y = margen + Math.floor(i / 3) * (alto + hueco);
    c.fillStyle = COLOR.ficha;
    c.beginPath();
    rectanguloRedondeado(c, x, y, ancho, alto, 14);
    c.fill();
    c.textBaseline = "alphabetic";
    c.textAlign = "left";
    c.fillStyle = COLOR.rotulo;
    c.font = `700 36px ${FUENTE}`;
    c.fillText(f.rotulo, x + 20, y + 48);
    c.textAlign = "right";
    c.fillStyle = COLOR.glosa;
    c.font = `500 28px ${FUENTE}`;
    c.fillText(f.unidad, x + ancho - 20, y + 46);
    c.textAlign = "center";
    c.fillStyle = COLOR.valor;
    c.font = `700 82px ${FUENTE}`;
    c.fillText(f.valor, x + ancho / 2, y + alto * 0.68);
    c.fillStyle = COLOR.glosa;
    c.font = `400 22px ${FUENTE_HUD}`;
    c.fillText(f.glosa, x + ancho / 2, y + alto - 18, ancho - 24);
  });
  // La barra: lo mismo que DTG, para quien todavía no piensa en millas.
  const yBarra = ALTO - margen - barra / 2 + 8;
  const [x0, x1] = [margen + 118, ANCHO - margen - 136];
  c.lineCap = "round";
  c.lineWidth = 8;
  c.strokeStyle = "rgba(255,255,255,0.22)";
  c.beginPath();
  c.moveTo(x0, yBarra);
  c.lineTo(x1, yBarra);
  c.stroke();
  const xAvion = x0 + (x1 - x0) * hecho;
  c.strokeStyle = COLOR.camino;
  c.beginPath();
  c.moveTo(x0, yBarra);
  c.lineTo(xAvion, yBarra);
  c.stroke();
  c.fillStyle = COLOR.valor;
  c.font = `600 26px ${FUENTE_HUD}`;
  c.textBaseline = "middle";
  c.textAlign = "right";
  c.fillText("Madrid", x0 - 22, yBarra + 1);
  c.textAlign = "left";
  c.fillText("Asunción", x1 + 22, yBarra + 1);
  // De izquierda a derecha, con el morro hacia donde va: aquí el rumbo no pinta nada.
  dibujarElAvion(c, xAvion, yBarra, Math.PI / 2, 0.8);
}

// ── La pantalla ─────────────────────────────────────────────────────────

/**
 * **Lo que puede enseñar la pantalla**: el camino entero, el trozo que se está
 * cruzando, la pelota, los relojes de las dos ciudades y los datos del vuelo. La
 * pantalla sabe pintarlos; qué modos se ofrecen a quién lo decide la consola.
 */
export type ModoDeLaPantalla = "mapa" | "cerca" | "pelota" | "relojes" | "datos";

/**
 * **Cada cuánto mueve el sol lo que se pinta**, s: la raya baja un píxel de mapa cada
 * treinta y cuatro segundos, y un minuto de reloj no se ve en menos de eso.
 */
const CADA_CUANTO_EL_SOL = 30;

/**
 * **Lo que tiene que moverse el avión para repintar**, en píxeles del mapa entero.
 * En cerca el mapa va a más escala, y un píxel de allí llega muchas más veces: con
 * dos píxeles de cerca basta, y con el ⏩ a ×16 no se sube la textura sin parar.
 */
const SE_REPINTA_CON: Readonly<Record<Exclude<ModoDeLaPantalla, "datos">, number>> = {
  mapa: 1,
  cerca: (2 * ANCHO) / (PX_POR_GRADO_DE_CERCA * (ENCUADRE.este - ENCUADRE.oeste)),
  pelota: 1,
  relojes: 1,
};

/**
 * **Las cifras no suben la textura más de dos veces por segundo**, ms: lo que marca
 * el avión de verdad va cambiando a cada racha, y nadie lee más deprisa.
 */
const DATOS_CADA = 500;

/** **Si se ha pedido quitar el movimiento**: la clase la pone el juego, en el documento. */
const haySinMovimiento = (): boolean => typeof document !== "undefined" && document.querySelector(".sin-movimiento") !== null;

export class PantallaDelRespaldo {
  /** Lo que pinta la pantalla. `null` sin lienzo: en las pruebas. */
  readonly textura: CanvasTexture | null = null;
  /** Lo que está enseñando ahora. */
  modo: ModoDeLaPantalla = "mapa";
  private readonly contexto: CanvasRenderingContext2D | null = null;
  private readonly fondo: HTMLCanvasElement | null = null;
  /** Se pinta la primera vez que se enseña la pelota: en un vuelo en que no se pide, no cuesta. */
  private fondoDeLaPelota: HTMLCanvasElement | null = null;
  private readonly camino = caminoEnElMapa();
  private readonly caminoDeLaPelota = caminoEnLaPelota();
  /** Dónde se pintó el avión por última vez, px. Ver la cabecera. */
  private pintadoEn: readonly [number, number] | null = null;
  /** En qué tramo de `CADA_CUANTO_EL_SOL` iba el reloj al pintar. */
  private solPintado: number | null = null;
  /** Lo último que dijeron las cifras y cuándo. */
  private datosPintados: string | null = null;
  private datosPintadosA = -Infinity;
  /** El sitio que se marca, si se marca alguno, y cuándo se pintó. Ver `marcar`. */
  private marca: Sitio | null = null;
  private marcaPintadaA = -Infinity;
  /** Lo que se puso en el lienzo por última vez, para el banco. */
  private loPintado: { readonly hora: number; readonly conMarca: boolean; readonly veces: number } = { hora: -1, conMarca: false, veces: 0 };

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

  private elFondoDeLaPelota(): HTMLCanvasElement | null {
    if (this.fondoDeLaPelota || typeof document === "undefined") return this.fondoDeLaPelota;
    const l = document.createElement("canvas");
    l.width = ANCHO;
    l.height = ALTO;
    const c = l.getContext("2d");
    if (!c) return null;
    pintarElFondoDeLaPelota(c);
    this.fondoDeLaPelota = l;
    return l;
  }

  /**
   * **Pone el avión donde va**, a `t` segundos del despegue. `avion` es lo que marca
   * el avión de verdad, para los datos; sin él, lo del perfil. Solo repinta si cambia
   * algo que se ve: ver la cabecera. Devuelve si repintó.
   */
  poner(perfil: PerfilDelVuelo, t: number, avion?: LoQueMarcaElAvion): boolean {
    const modo = this.modo;
    if (modo === "datos") {
      const datos = datosDelVuelo(perfil, t, avion);
      const fichas = fichasDeDatos(datos);
      const huella = fichas.map((f) => f.valor).join("|");
      if (huella === this.datosPintados) return false;
      const ahora = performance.now();
      if (this.datosPintados !== null && ahora - this.datosPintadosA < DATOS_CADA) return false;
      this.datosPintados = huella;
      this.datosPintadosA = ahora;
      if (!this.contexto || !this.textura) return true;
      pintarLosDatos(this.contexto, fichas, datos.hecho);
      this.textura.needsUpdate = true;
      return true;
    }
    const enElMapaAhora = avionEnElMapa(perfil, t);
    const [x, y] = aPx(enElMapaAhora);
    const antes = this.pintadoEn;
    const instante = new Date(perfil.horario.despegue.getTime() + t * 1000);
    const sol = Math.floor(instante.getTime() / 1000 / CADA_CUANTO_EL_SOL);
    const marca = modo === "cerca" ? this.marca : null;
    // La marca late; con el movimiento reducido se queda quieta y se repinta lo de siempre.
    const late = marca !== null && !haySinMovimiento();
    const ahora = performance.now();
    if (late) {
      if (ahora - this.marcaPintadaA < MARCA.cada) return false;
    } else if (antes && sol === this.solPintado && Math.hypot(x - antes[0], y - antes[1]) < SE_REPINTA_CON[modo]) return false;
    this.marcaPintadaA = ahora;
    this.pintadoEn = [x, y];
    this.solPintado = sol;
    this.loPintado = { hora: t, conMarca: marca !== null, veces: this.loPintado.veces + 1 };
    if (!this.contexto || !this.fondo || !this.textura) return true;
    const c = this.contexto;
    if (modo === "mapa") pintarElMapa(c, this.fondo, enElMapaAhora, this.camino, instante);
    else if (modo === "cerca")
      pintarDeCerca(c, perfil, t, instante, this.camino, marca && { sitio: marca, fase: late ? (ahora % MARCA.latido) / MARCA.latido : 0.5 });
    else if (modo === "relojes") pintarLosRelojes(c, this.fondo, enElMapaAhora, this.camino, instante);
    else {
      const fondo = this.elFondoDeLaPelota();
      if (!fondo) return true;
      pintarLaPelota(c, fondo, perfil, t, instante, this.caminoDeLaPelota);
    }
    this.textura.needsUpdate = true;
    return true;
  }

  /**
   * **Marca un sitio en el modo cerca**, o deja de marcarlo con `null`, mientras se cuenta. El
   * siguiente `poner` lo repinta: al irse no se queda el último aro puesto en el lienzo.
   */
  marcar(sitio: Sitio | null): void {
    if (sitio === this.marca) return;
    this.marca = sitio;
    this.pintadoEn = null;
    this.solPintado = null;
    this.marcaPintadaA = -Infinity;
  }

  /** **El lienzo**, para enseñarlo tal cual a toda pantalla: `null` sin él, en las pruebas. */
  get lienzo(): HTMLCanvasElement | null {
    return this.contexto?.canvas ?? null;
  }

  /** Lo que mira el banco. */
  get paraBanco(): { readonly modo: ModoDeLaPantalla; readonly hora: number; readonly conMarca: boolean; readonly repintados: number } {
    return { modo: this.modo, hora: this.loPintado.hora, conMarca: this.loPintado.conMarca, repintados: this.loPintado.veces };
  }

  /** Cambia lo que enseña. Devuelve si cambió: el siguiente `poner` lo repinta. */
  mostrar(modo: ModoDeLaPantalla): boolean {
    if (modo === this.modo) return false;
    this.modo = modo;
    this.pintadoEn = null;
    this.solPintado = null;
    this.datosPintados = null;
    return true;
  }

  dispose(): void {
    this.textura?.dispose();
  }
}
