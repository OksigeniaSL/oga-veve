/**
 * Los turbohélices de las islas, **dibujados**.
 *
 * Quién cruza, por dónde y a qué altura lo decide
 * `flight/trafico-de-las-islas.ts`. Esto es el avión.
 *
 * ## Por qué no sirve ninguno de la flota
 *
 * Se miró primero, que era lo barato. El JAZ 60 es un turbohélice con cola en
 * T, pero de ala baja y diecinueve plazas; la silueta regional de la fábrica
 * es un bimotor de ala baja. Y lo que une las islas es otra cosa, y se
 * reconoce a la primera: **ala alta encima del fuselaje, las dos góndolas
 * colgadas de ella, cola en T y los carenados del tren a los lados de la
 * panza**, con veintisiete metros de ala y otros tantos de largo. Ponerle ala
 * baja sería enseñar un avión que no pasa por ahí.
 *
 * Así que se monta aquí con las dos primitivas de la fábrica —`tubo` y
 * `superficie`—, que es lo que ella misma dice que es un avión nuevo: una
 * fila más. Unos cuatrocientos triángulos y una llamada de dibujo.
 *
 * ## Las libreas
 *
 * Blanco con la cola de colores, que es como van pintados los de verdad, y
 * **ninguna es la de nadie**: azul y amarillo, amarillo con el cono gris, y
 * verde con azul. Se distinguen entre sí y dicen «islas», que es lo que se
 * pidió; nombres y logotipos, ninguno.
 */

import {
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshLambertMaterial,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { superficie, tubo } from "./fabrica-de-aeronaves";
import { giroDelModelo } from "./rumbo";
import { LIBREAS, type Isleno } from "../flight/trafico-de-las-islas";

/** Los colores de una librea. */
interface Librea {
  /** Deriva y cono de cola. */
  readonly cola: number;
  /** Estabilizador, encima de la deriva. */
  readonly estabilizador: number;
  /** Góndolas de los motores. */
  readonly gondolas: number;
}

const BLANCO = 0xf3f3ef;
const PANZA = 0xc4c8cb;
const HELICE = 0x3a3f44;

export const LIBREAS_DE_LAS_ISLAS: readonly Librea[] = [
  // Azul con el estabilizador amarillo.
  { cola: 0x1d5fa8, estabilizador: 0xf2c200, gondolas: BLANCO },
  // Amarilla, con el cono de cola gris.
  { cola: 0xf2c200, estabilizador: 0xf2c200, gondolas: 0xd9dde0 },
  // Verde, con el estabilizador azul.
  { cola: 0x2e8b57, estabilizador: 0x1d5fa8, gondolas: BLANCO },
];

/**
 * Repinta una geometría vértice a vértice según dónde cae cada uno.
 *
 * `tubo` pinta de un color; el fuselaje lleva tres —la panza gris, el blanco y
 * el cono de cola del color de la librea— y se decide por la posición.
 */
function repintar(
  g: BufferGeometry,
  color: (x: number, y: number, z: number) => number,
): BufferGeometry {
  const p = g.getAttribute("position");
  const c = g.getAttribute("color") as BufferAttribute;
  const k = new Color();
  for (let i = 0; i < p.count; i++) {
    k.set(color(p.getX(i), p.getY(i), p.getZ(i)));
    c.setXYZ(i, k.r, k.g, k.b);
  }
  c.needsUpdate = true;
  return g;
}

/** El turbohélice de las islas con una librea. Morro hacia la Z negativa. */
export function fabricarTurbohelice(librea: Librea): BufferGeometry {
  const piezas: BufferGeometry[] = [];

  // El fuselaje: morro corto y redondo, tubo largo y el cono que sube a la cola.
  const fuselaje = tubo(
    [
      { z: -13.6, ancho: 0.5, alto: 0.6, y: -0.25 },
      { z: -12.7, ancho: 1.9, alto: 1.9, y: -0.08 },
      { z: -11.1, ancho: 2.6, alto: 2.7 },
      { z: -8.6, ancho: 2.8, alto: 2.9 },
      { z: 5.4, ancho: 2.8, alto: 2.9 },
      { z: 9.6, ancho: 2.0, alto: 2.3, y: 0.35 },
      { z: 13.6, ancho: 0.5, alto: 0.9, y: 1.0 },
    ],
    BLANCO,
  );
  piezas.push(
    repintar(fuselaje, (_x, y, z) =>
      z > 8.5 ? librea.cola : y < -0.95 ? PANZA : BLANCO,
    ),
  );

  // El ala alta, encima del fuselaje: casi recta y sin diedro.
  piezas.push(
    superficie(
      {
        cuerdaRaiz: 2.6,
        cuerdaPunta: 1.55,
        largo: 13.5,
        espesor: 0.34,
        flecha: 0.35,
        en: [0, 1.6, -1.3],
      },
      BLANCO,
    ),
  );

  // Las dos góndolas, colgadas del ala, con el cono de la hélice delante.
  for (const lado of [1, -1]) {
    const gondola = tubo(
      [
        { z: -4.5, ancho: 0.75, alto: 0.8 },
        { z: -3.9, ancho: 1.1, alto: 1.25 },
        { z: -0.4, ancho: 1.05, alto: 1.35, y: -0.1 },
        { z: 1.9, ancho: 0.45, alto: 0.6, y: 0.15 },
      ],
      librea.gondolas,
    );
    gondola.translate(lado * 4.1, 1.05, 0);
    piezas.push(gondola);
    /*
     * La hélice, solo el cono. Girando, una hélice de verdad es un disco casi
     * transparente; pintado opaco saldría una tapa negra delante de cada
     * motor, que es peor que no ponerla.
     */
    const cono = tubo(
      [
        { z: -5.1, ancho: 0.12, alto: 0.12 },
        { z: -4.5, ancho: 0.6, alto: 0.6 },
      ],
      HELICE,
    );
    cono.translate(lado * 4.1, 1.05, 0);
    piezas.push(cono);
  }

  // Los carenados del tren, a los lados de la panza.
  for (const lado of [1, -1]) {
    const carenado = tubo(
      [
        { z: -1.8, ancho: 0.5, alto: 0.5 },
        { z: -1.0, ancho: 0.9, alto: 0.9 },
        { z: 2.6, ancho: 0.9, alto: 0.9 },
        { z: 3.6, ancho: 0.4, alto: 0.5 },
      ],
      PANZA,
    );
    carenado.translate(lado * 1.35, -1.05, 0);
    piezas.push(carenado);
  }

  // La deriva, alta y en flecha, y el estabilizador encima: la cola en T.
  piezas.push(
    superficie(
      {
        cuerdaRaiz: 4.6,
        cuerdaPunta: 2.4,
        largo: 4.6,
        espesor: 0.34,
        flecha: 2.6,
        vertical: true,
        en: [0, 1.25, 10.4],
      },
      librea.cola,
    ),
  );
  piezas.push(
    superficie(
      {
        cuerdaRaiz: 1.9,
        cuerdaPunta: 1.2,
        largo: 3.7,
        espesor: 0.24,
        flecha: 0.5,
        en: [0, 1.25 + 4.6, 10.4 + 2.6],
      },
      librea.estabilizador,
    ),
  );

  const junta = mergeGeometries(piezas, false)!;
  for (const p of piezas) p.dispose();
  junta.computeBoundingSphere();
  return junta;
}

export interface AvionesDeLasIslas {
  readonly grupo: Group;
  /** Pone cada uno donde diga el tráfico, y apaga los que no están. */
  poner(quienes: readonly Isleno[]): void;
  dispose(): void;
}

/**
 * Una malla por librea, creadas al principio y escondidas.
 *
 * Como mucho vuela uno a la vez, así que tres mallas sobran; crear y destruir
 * mallas en pleno vuelo es la forma de que el juego dé un tirón justo cuando
 * aparece alguien, que es cuando más se está mirando.
 */
export function crearAvionesDeLasIslas(): AvionesDeLasIslas {
  const grupo = new Group();
  grupo.name = "aviones-de-las-islas";
  const material = new MeshLambertMaterial({ vertexColors: true });
  const mallas = LIBREAS_DE_LAS_ISLAS.slice(0, LIBREAS).map((l, i) => {
    const m = new Mesh(fabricarTurbohelice(l), material);
    m.name = `turbohelice-${i}`;
    m.visible = false;
    grupo.add(m);
    return m;
  });
  return {
    grupo,
    poner(quienes) {
      for (const m of mallas) m.visible = false;
      for (const q of quienes) {
        const m = mallas[q.librea % mallas.length];
        if (!m) continue;
        m.visible = true;
        m.position.set(q.x, q.y, q.z);
        m.rotation.y = (giroDelModelo(q.rumbo) * Math.PI) / 180;
      }
    },
    dispose() {
      for (const m of mallas) m.geometry.dispose();
      material.dispose();
      grupo.clear();
    },
  };
}
