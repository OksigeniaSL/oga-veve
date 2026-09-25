/**
 * Un aeropuerto de noche visto desde muy lejos: el faro y unas pocas luces.
 *
 * La isla de enfrente se dibuja sin su aeródromo a partir de unos cuarenta
 * kilómetros —ver `MundoVecino.alPaso`—, porque su balizamiento entero a
 * cien kilómetros era una mancha verde, blanca y roja pegada a la costa. Pero
 * quitarlo dejaba lo contrario: volando de Gran Canaria a Tenerife de noche,
 * «veo Tenerife, pero no sé si las luces del aeropuerto ya deberían verse».
 *
 * Deberían. De noche un aeropuerto se ve desde muy lejos, y lo que se ve es
 * poco y siempre lo mismo:
 *
 * - **El faro**, que da destellos blancos y verdes alternos: es la señal de
 *   aeródromo civil en tierra, en todo el mundo, y es lo primero que se busca
 *   en el horizonte.
 * - **Las luces de aproximación**, una fila blanca que sale de cada cabecera
 *   hacia el mar, y
 * - **los bordes de la pista**, dos hileras blancas: con el eje de la
 *   aproximación, eso dibuja una cruz alargada que ya dice hacia dónde va la
 *   pista.
 *
 * Todo blanco salvo el faro: las verdes y rojas de cabecera y de fin de pista
 * son justo las que se confundían a esa distancia, y no hacen falta hasta que
 * vuelve el aeródromo de verdad. Son un par de cientos de puntos.
 */

import { BufferAttribute, BufferGeometry, Color, Group, Points } from "three";
import { materialDeLuces, ponerOscuridad } from "./material-de-luces";

interface PistaLocal {
  readonly x: number;
  readonly z: number;
  /** Rumbo verdadero, en grados. */
  readonly heading: number;
  readonly length: number;
  readonly width: number;
}

/** Cada cuánto hay una luz de borde en esta versión de lejos, en metros. */
const CADA_BORDE = 60;
/** Lo que mide la fila de aproximación desde la cabecera, en metros. */
const LARGO_APROXIMACION = 900;
const CADA_APROXIMACION = 30;

const BLANCA = 0xfff0cc;
const FARO_BLANCO = new Color(0xffffff);
const FARO_VERDE = new Color(0x3cff7a);

/**
 * El ritmo del faro: un destello blanco, uno verde y una pausa, cada dos
 * segundos y medio. Un faro gira a una docena de vueltas por minuto con un
 * foco de cada color, así que desde un sitio fijo se ve eso.
 */
export function destelloDelFaro(segundos: number): "blanco" | "verde" | null {
  const t = ((segundos % 2.5) + 2.5) % 2.5;
  if (t < 0.18) return "blanco";
  if (t >= 1.25 && t < 1.43) return "verde";
  return null;
}

/** Los sitios de las luces, en coordenadas del escenario al que pertenecen. */
export function sitiosDelAerodromoLejano(
  pista: PistaLocal,
  torre?: readonly [number, number] | null,
): {
  blancas: [number, number][];
  faro: [number, number];
} {
  const h = (pista.heading * Math.PI) / 180;
  // Delante y través, con la misma cuenta que el resto: ver `enEjes`.
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const tx = Math.cos(h);
  const tz = Math.sin(h);
  const en = (a: number, b: number): [number, number] => [
    pista.x + fx * a + tx * b,
    pista.z + fz * a + tz * b,
  ];
  const blancas: [number, number][] = [];
  const medio = pista.length / 2;
  const n = Math.max(2, Math.round(pista.length / CADA_BORDE));
  for (let k = 0; k <= n; k++) {
    const a = -medio + (pista.length * k) / n;
    blancas.push(en(a, -pista.width / 2 - 3), en(a, pista.width / 2 + 3));
  }
  for (const lado of [-1, 1]) {
    for (let d = CADA_APROXIMACION; d <= LARGO_APROXIMACION; d += CADA_APROXIMACION)
      blancas.push(en(lado * (medio + d), 0));
    // La barra de los trescientos metros, que es lo que hace que la fila se
    // lea como aproximación y no como una calle.
    for (const b of [-12, -6, 6, 12]) blancas.push(en(lado * (medio + 300), b));
  }
  /*
   * El faro, en la torre de control si el fichero la trae —es donde va en
   * muchos aeropuertos, y si no, al lado—; y si no la trae, a un lado de la
   * pista hacia la mitad. A la distancia a la que esto se ve, cien metros
   * arriba o abajo no se distinguen; que el faro esté junto a la pista, sí.
   */
  return { blancas, faro: torre ? [torre[0], torre[1]] : en(0, pista.width / 2 + 350) };
}

export interface AerodromoLejano {
  readonly grupo: Group;
  /** Enciende o apaga según dónde esté el sol. `seno` es `sunDirection.y`. */
  ponerSol(seno: number): void;
  /** Un paso de reloj: el destello del faro. */
  alPaso(segundos: number): void;
  dispose(): void;
}

export function crearAerodromoLejano(
  pista: PistaLocal,
  cota: (x: number, z: number) => number,
  encendido: (seno: number) => number,
  /** Dónde está la torre, en el mismo sistema que la pista (x, z). */
  torre?: readonly [number, number] | null,
): AerodromoLejano {
  const grupo = new Group();
  grupo.name = "aerodromo-lejano";
  const { blancas, faro } = sitiosDelAerodromoLejano(pista, torre);
  const sitios = new Float32Array(blancas.length * 3);
  const colores = new Float32Array(blancas.length * 3);
  const tono = new Color(BLANCA);
  blancas.forEach(([x, z], k) => {
    sitios.set([x, cota(x, z) + 3, z], k * 3);
    colores.set([tono.r, tono.g, tono.b], k * 3);
  });
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(sitios, 3));
  geo.setAttribute("color", new BufferAttribute(colores, 3));
  /*
   * Luces de aeropuerto: mucho más intensas que una farola, así que no
   * empiezan a apagarse hasta lejos y no bajan de un tercio.
   */
  const material = materialDeLuces(3, { cerca: 20000, suelo: 0.35, menor: 0.6 });
  const luces = new Points(geo, material);
  luces.name = "aerodromo-lejano-luces";
  grupo.add(luces);

  const geoFaro = new BufferGeometry();
  geoFaro.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([faro[0], cota(faro[0], faro[1]) + 30, faro[1]]), 3),
  );
  const colorFaro = new BufferAttribute(new Float32Array([0, 0, 0]), 3);
  geoFaro.setAttribute("color", colorFaro);
  const materialFaro = materialDeLuces(5, { cerca: 30000, suelo: 0.6, menor: 0.6 });
  const puntoFaro = new Points(geoFaro, materialFaro);
  puntoFaro.name = "aerodromo-lejano-faro";
  grupo.add(puntoFaro);

  let destello: "blanco" | "verde" | null | undefined;
  return {
    grupo,
    ponerSol(seno) {
      const luce = encendido(seno);
      grupo.visible = luce > 0.01;
      material.opacity = luce;
      materialFaro.opacity = luce;
      ponerOscuridad(material, seno);
      ponerOscuridad(materialFaro, seno);
    },
    alPaso(segundos) {
      const ahora = destelloDelFaro(segundos);
      if (ahora === destello) return;
      destello = ahora;
      const c = ahora === "blanco" ? FARO_BLANCO : ahora === "verde" ? FARO_VERDE : null;
      colorFaro.set(c ? [c.r, c.g, c.b] : [0, 0, 0]);
      colorFaro.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      material.dispose();
      geoFaro.dispose();
      materialFaro.dispose();
    },
  };
}
