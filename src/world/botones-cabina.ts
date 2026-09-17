/**
 * Los mandos de la cabina que se pueden pulsar.
 *
 * Pedido jugando, y con las tres formas dichas: «quería también botones que
 * poder pulsar, tanto con clic, tap como tecla».
 *
 * Las teclas ya estaban —la I del contacto, la F de los flaps, la B del
 * freno— y los botones del HUD también. Lo que faltaba es **el mando que está
 * en la cabina**, que es donde lo busca quien se acaba de sentar ahí: un panel
 * lleno de cosas que no responden enseña que los mandos son decoración.
 *
 * ## Pocos y de verdad
 *
 * Cuatro, y los cuatro hacen algo que el juego ya sabe hacer: arrancar y parar
 * el motor, mover los flaps, el freno y —en el avión que lo mete— el tren. Ni
 * uno más. Los interruptores del techo y
 * las palancas del pedestal siguen siendo escenografía y no fingen otra cosa
 * —en una cabina de verdad tampoco se toca casi nada de lo que se ve—, pero lo
 * que se anuncia como mando responde. Es la misma regla que los relojes: lo que
 * está encendido, mide; lo que se pulsa, hace.
 *
 * ## Cómo se enchufa
 *
 * El modelo trae cajas llamadas `boton-<qué>` —ver `boton()` en
 * `modelos/comun.py`—. Aquí se buscan por ese nombre, se iluminan al pasar por
 * encima y se dispara la acción al soltar. Quien decide qué hace cada una es
 * `game.ts`, que es el único que sabe lo que significa arrancar un motor.
 */

import {
  Color,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
  type Camera,
  type Mesh,
  type Object3D,
} from "three";

/** Lo que se puede pulsar en la cabina. */
export type MandoDeCabina = "motor" | "flaps" | "freno" | "tren";

/*
 * El del tren solo existe en el avión que lo mete: en un entrenador de escuela
 * esa palanca no está, y un botón que se pulsa y no hace nada enseña que los
 * mandos son decoración. El modelo solo lo dibuja donde toca, así que aquí
 * basta con buscarlo: si no está, no está.
 */
const CUALES: readonly MandoDeCabina[] = ["motor", "flaps", "freno", "tren"];

/** Cuánto se ilumina el mando cuando el dedo está encima. */
const ENCENDIDO = 0.55;

interface Boton {
  readonly malla: Mesh;
  readonly cual: MandoDeCabina;
  readonly material: MeshStandardMaterial;
  readonly color: Color;
}

export interface BotonesDeCabina {
  /** Cuáles hay. Para poder comprobarlo desde fuera. */
  readonly hay: readonly MandoDeCabina[];
  /**
   * Qué mando cae bajo este punto de la pantalla, si cae alguno.
   *
   * `x` e `y` van de −1 a 1, que es como los quiere el trazador de rayos.
   */
  cualEsta(x: number, y: number, camara: Camera): MandoDeCabina | null;
  /** Enciende el que esté bajo el dedo y apaga los demás. */
  alumbrar(cual: MandoDeCabina | null): void;
  dispose(): void;
}

export function encenderBotones(raiz: Object3D): BotonesDeCabina | null {
  const botones: Boton[] = [];
  raiz.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.name.startsWith("boton-")) return;
    const cual = m.name.slice("boton-".length) as MandoDeCabina;
    if (!CUALES.includes(cual)) return;
    /*
     * **Cada mando con su propio material.** Los seis botones del avión salen
     * del mismo material del fichero, así que iluminar uno los iluminaría
     * todos: se clona al encenderlos, una vez, y cada uno se queda con el suyo.
     */
    const suyo = Array.isArray(m.material) ? m.material[0] : m.material;
    const material = (suyo as MeshStandardMaterial).clone();
    m.material = material;
    botones.push({ malla: m, cual, material, color: material.color.clone() });
  });
  if (!botones.length) return null;

  const rayo = new Raycaster();
  const punto = new Vector2();
  let encendido: MandoDeCabina | null = null;

  return {
    hay: botones.map((b) => b.cual),
    cualEsta(x, y, camara) {
      punto.set(x, y);
      rayo.setFromCamera(punto, camara);
      const tocados = rayo.intersectObjects(
        botones.map((b) => b.malla),
        false,
      );
      const primero = tocados[0]?.object;
      return botones.find((b) => b.malla === primero)?.cual ?? null;
    },
    alumbrar(cual) {
      if (cual === encendido) return;
      encendido = cual;
      for (const b of botones) {
        const suyo = b.cual === cual;
        b.material.emissive.copy(suyo ? b.color : new Color(0x000000));
        b.material.emissiveIntensity = suyo ? ENCENDIDO : 0;
        b.material.needsUpdate = true;
      }
    },
    dispose() {
      for (const b of botones) b.material.dispose();
    },
  };
}
