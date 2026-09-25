/**
 * La luz de dentro de la cabina: de día, la que entra por el parabrisas; de
 * noche, la roja del panel.
 *
 * **Por qué hace falta.** El juego alumbra con un sol y un relleno de cielo, y
 * eso vale para el mundo, que se ve desde arriba. El panel no: es una pared
 * vertical mirando hacia la cola, metida dentro del fuselaje, y le llega el sol
 * solo cuando se vuela con el sol detrás. El resto del tiempo le llega el
 * relleno y poco más, así que salía **negro a mediodía** — una losa oscura con
 * relojes encima, que es de donde venía buena parte de «la cabina de juguete».
 * En un avión de verdad el panel está bañado por la luz que rebota en el
 * parabrisas, las ventanillas y las piernas del piloto; eso es lo que aquí se
 * pone, como luz propia tenue de cada material del interior.
 *
 * **Y de noche, roja.** Es como se alumbran los paneles de los aviones que
 * vuelan de noche desde hace ochenta años, y tiene su porqué: la luz roja
 * apenas cierra la pupila, así que quien mira el panel sigue viendo fuera. El
 * tablero se queda casi negro con un tinte rojo y lo que se lee —relojes y
 * pantallas— baja un poco de brillo, que es lo que hace el piloto con el
 * reóstato para no deslumbrarse.
 *
 * Cuesta nada: son una docena de materiales y se tocan solo cuando cambia la
 * altura del sol.
 */

import { Color, type Material, type Mesh, type Object3D } from "three";

/**
 * Qué materiales del interior se alumbran y cuánto: `[de día, de noche]`.
 *
 * De día es la fracción de su propio color que devuelve como luz: lo que
 * rebota dentro de la cabina. De noche, cuánto del rojo del panel le llega:
 * la chapa del tablero, entera; la visera, casi nada, porque las luces van
 * debajo de ella y la alumbran por abajo.
 *
 * Los nombres son los de `modelos/comun.py`: es el contrato entre los guiones
 * de Blender y el juego, igual que `reloj_` y `g1000_display`.
 */
const QUE_SE_ALUMBRA: Readonly<Record<string, readonly [number, number]>> = {
  tablero: [0.85, 1],
  chapa: [0.85, 1],
  subpanel: [0.85, 1],
  gris_linea: [0.55, 0.8],
  bisel: [0.7, 0.6],
  visera: [0.55, 0.12],
  forro: [0.45, 0.35],
  tapiceria: [0.45, 0.3],
  pomo: [0.4, 0.4],
  metal: [0.25, 0.3],
  tornillo: [0.25, 0.3],
};

/** El rojo del panel de noche, en lineal: tenue, que es lo que se busca. */
const ROJO_DE_NOCHE = new Color(0.011, 0.0014, 0.0008);

/** Cuánto baja el brillo de lo que se lee, de noche: el reóstato del panel. */
const REOSTATO_DE_NOCHE = 0.72;

/** Lo que se lee: esferas, pantallas y los dibujos de los mandos. */
const SE_LEE = /^(reloj-|pantalla-|dibujo-)/;

export interface LuzDeCabina {
  /**
   * Ajusta la luz a la altura del sol: el seno de su elevación, de −1 a 1,
   * que es la `y` de su dirección.
   */
  ponerSol(alturaDelSol: number): void;
}

/**
 * Cuánto es de día dentro de la cabina, de 0 a 1.
 *
 * No de golpe al ponerse el sol: el cielo sigue claro un rato y la cabina con
 * él. Se apaga entre un poco por encima del horizonte y un poco por debajo.
 */
export function diaEnLaCabina(alturaDelSol: number): number {
  const t = Math.min(1, Math.max(0, (alturaDelSol + 0.1) / 0.3));
  return t * t * (3 - 2 * t);
}

/**
 * Busca los materiales del interior de un modelo y devuelve con qué alumbrarlos.
 * `null` si no trae ninguno: los modelos de fuera y las cajas de respaldo.
 */
export function luzDeCabina(raiz: Object3D): LuzDeCabina | null {
  type ConLuz = Material & { color: Color; emissive: Color };
  const materiales = new Map<ConLuz, { base: Color; dia: number; noche: number }>();
  const leibles = new Set<Material & { color: Color }>();
  raiz.traverse((o) => {
    const m = (o as Mesh).material as Material | Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const cuanto = QUE_SE_ALUMBRA[mat.name];
      const conLuz = mat as Partial<ConLuz>;
      if (cuanto && conLuz.emissive && conLuz.color && !materiales.has(mat as ConLuz))
        materiales.set(mat as ConLuz, {
          base: conLuz.color.clone(),
          dia: cuanto[0],
          noche: cuanto[1],
        });
      // Solo lo que emite: el bisel de un reloj también se llama `reloj-…` y
      // es un material de superficie, que ya se alumbra por su cuenta.
      if (
        SE_LEE.test(o.name) &&
        conLuz.color &&
        (mat as { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial
      )
        leibles.add(mat as Material & { color: Color });
    }
  });
  if (!materiales.size) return null;

  let ultimo = Number.NaN;
  const rojo = new Color();
  return {
    ponerSol(alturaDelSol) {
      if (Math.abs(alturaDelSol - ultimo) < 0.002) return;
      ultimo = alturaDelSol;
      const dia = diaEnLaCabina(alturaDelSol);
      for (const [mat, { base, dia: k, noche }] of materiales) {
        rojo.copy(ROJO_DE_NOCHE).multiplyScalar(noche * (1 - dia));
        mat.emissive.copy(base).multiplyScalar(k * dia).add(rojo);
      }
      const brillo = REOSTATO_DE_NOCHE + (1 - REOSTATO_DE_NOCHE) * dia;
      for (const mat of leibles) mat.color.setScalar(brillo);
    },
  };
}
