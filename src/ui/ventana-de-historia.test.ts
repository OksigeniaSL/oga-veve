/**
 * **La ventana de la historia: sale con la historia, se va con ella y no
 * tapa nada.**
 *
 * Lo que se puede comprobar sin navegador: dónde cabe —con las cajas que mide
 * el juego en pantallas de verdad, apuntadas aquí— y cuándo sale y se va,
 * con el aviso de la voz. Que en el juego se vea donde se calcula lo mira
 * `scripts/verificar-carteles.mjs`, con la ventana puesta en cada pantalla.
 */

import { describe, expect, it } from "vitest";
import { laHistoria } from "../audio/ventanilla";
import { ES_PY } from "../i18n/es-PY";
import type { Hito } from "../world/hitos";
import { FOTOS, SIN_FOTO, fotoDeLaHistoria } from "./fotos-de-las-historias";
import {
  TOPE_DE_LA_VENTANA,
  VENTANA,
  ZONA_DEL_AVION,
  alSonarLaHistoria,
  altoDeLaVentana,
  dondeCabeLaVentana,
  type Caja,
  type Plazos,
} from "./ventana-de-historia";

const caja = (left: number, top: number, ancho: number, alto: number): Caja => ({
  left,
  top,
  right: left + ancho,
  bottom: top + alto,
});

const seTocan = (a: Caja, b: Caja): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/*
 * Las cajas de verdad, medidas en el juego con el JAZ 90 en Guyrami (17-10-2026).
 */
const PORTATIL = {
  pantalla: { ancho: 1366, alto: 768 },
  cuadro: caja(272, 429, 823, 333),
  obstaculos: [
    caja(16, 16, 48, 159), // la cámara, la pausa y el cinturón
    caja(28, 16, 1132, 48), // la barra de arriba
    caja(16, 702, 246, 50), // el volumen
    caja(1210, 64, 140, 128), // el rincón: la tarjeta de qué toca
    caja(1172, 216, 178, 399), // la columna de mandos
  ],
};

const TELEFONO = {
  pantalla: { ancho: 915, alto: 412 },
  cuadro: caja(383, 284, 149, 43), // recogido: solo el asa
  obstaculos: [
    caja(12, 12, 43, 138), // la cámara, la pausa y el cinturón
    caja(65, 12, 343, 45), // la fila de arriba
    caja(20, 245, 150, 145), // la palanca
    caja(350, 337, 215, 53), // los pedales
    caja(657, 65, 143, 42), // tren, aerofrenos, flaps
    caja(678, 115, 122, 50), // el destino
    caja(822, 132, 70, 258), // el motor
    caja(758, 12, 145, 45), // los botones de la derecha
  ],
};

describe("dónde cabe la ventana", () => {
  it("en el portátil, a la izquierda del cuadro, abajo y encima del volumen", () => {
    const d = dondeCabeLaVentana(PORTATIL.pantalla, PORTATIL.cuadro, PORTATIL.obstaculos)!;
    expect(d).not.toBeNull();
    expect(d.right).toBeLessThanOrEqual(PORTATIL.cuadro.left - VENTANA.hueco);
    expect(d.right - d.left).toBe(VENTANA.ancho);
    expect(d.bottom).toBeLessThanOrEqual(702 - VENTANA.hueco);
    // Abajo: pegada al volumen, no a media pantalla.
    expect(d.bottom).toBeGreaterThan(680);
    for (const o of [...PORTATIL.obstaculos, PORTATIL.cuadro]) expect(seTocan(d, o)).toBe(false);
  });

  it("y el alto es el de una foto en 3:2 con su marco", () => {
    const d = dondeCabeLaVentana(PORTATIL.pantalla, PORTATIL.cuadro, PORTATIL.obstaculos)!;
    expect(d.bottom - d.top).toBeCloseTo(altoDeLaVentana(d.right - d.left), 5);
    expect(altoDeLaVentana(240)).toBeCloseTo(((240 - 12) * 2) / 3 + 12, 5);
  });

  it("si a la izquierda hay algo, se va a la derecha del cuadro", () => {
    const tapada = [...PORTATIL.obstaculos, caja(16, 300, 250, 400)];
    const d = dondeCabeLaVentana(PORTATIL.pantalla, PORTATIL.cuadro, tapada)!;
    expect(d.left).toBeGreaterThanOrEqual(PORTATIL.cuadro.right + VENTANA.hueco);
    for (const o of tapada) expect(seTocan(d, o)).toBe(false);
  });

  it("en el teléfono no cabe sin tapar los pulgares o el avión, y no sale", () => {
    expect(dondeCabeLaVentana(TELEFONO.pantalla, TELEFONO.cuadro, TELEFONO.obstaculos)).toBeNull();
  });

  it("si el cuadro llena el ancho, no sale: no se mete encima de él", () => {
    const cuadro = caja(100, 429, 823, 333);
    expect(dondeCabeLaVentana({ ancho: 1024, alto: 768 }, cuadro, [])).toBeNull();
  });

  it("con un hueco estrecho se encoge hasta el mínimo, y por debajo no sale", () => {
    const pantalla = { ancho: 1280, alto: 720 };
    const justo = caja(VENTANA.minimo + 2 * VENTANA.hueco, 400, 1280 - 2 * (VENTANA.minimo + 2 * VENTANA.hueco), 320);
    const d = dondeCabeLaVentana(pantalla, justo, [])!;
    expect(d.right - d.left).toBe(VENTANA.minimo);
    const corto = caja(VENTANA.minimo + 2 * VENTANA.hueco - 4, 400, 1280 - 2 * (VENTANA.minimo + 2 * VENTANA.hueco - 4), 320);
    expect(dondeCabeLaVentana(pantalla, corto, [])).toBeNull();
  });

  it("nunca sube por encima del 35 % ni entra donde va el avión, ni pisa nada", () => {
    // Cien pantallas inventadas con cajas puestas al azar, siempre la misma tanda.
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < 100; n++) {
      const pantalla = { ancho: 700 + azar() * 1300, alto: 360 + azar() * 800 };
      const ancho = pantalla.ancho * (0.3 + azar() * 0.5);
      const cuadro = caja((pantalla.ancho - ancho) / 2, pantalla.alto * 0.55, ancho, pantalla.alto * 0.45);
      const obstaculos = Array.from({ length: 6 }, () =>
        caja(azar() * pantalla.ancho, azar() * pantalla.alto, 30 + azar() * 200, 30 + azar() * 200),
      );
      const d = dondeCabeLaVentana(pantalla, cuadro, obstaculos);
      if (!d) continue;
      expect(d.top).toBeGreaterThanOrEqual(pantalla.alto * VENTANA.arriba);
      expect(d.bottom).toBeLessThanOrEqual(pantalla.alto);
      expect(d.left).toBeGreaterThanOrEqual(0);
      expect(d.right).toBeLessThanOrEqual(pantalla.ancho);
      const avion = caja(
        pantalla.ancho * ZONA_DEL_AVION.izquierda,
        pantalla.alto * ZONA_DEL_AVION.arriba,
        pantalla.ancho * (ZONA_DEL_AVION.derecha - ZONA_DEL_AVION.izquierda),
        pantalla.alto * (ZONA_DEL_AVION.abajo - ZONA_DEL_AVION.arriba),
      );
      expect(seTocan(d, avion)).toBe(false);
      for (const o of [...obstaculos, cuadro]) expect(seTocan(d, o)).toBe(false);
    }
  });
});

/** Una ventana de mentira que apunta lo que le piden. */
function ventanaQueApunta() {
  const pasos: string[] = [];
  let puesta: string | null = null;
  return {
    pasos,
    get puesta() {
      return puesta;
    },
    mostrar(sitio: string) {
      pasos.push(`pone ${sitio}`);
      puesta = sitio;
    },
    quitar(sitio?: string) {
      pasos.push(`quita ${sitio ?? "todo"}`);
      if (sitio === undefined || sitio === puesta) puesta = null;
    },
  };
}

/** Un reloj de mentira: los plazos se disparan a mano. */
function relojDeMentira(): Plazos & { disparar(): void; pendientes: number } {
  const plazos = new Map<number, () => void>();
  let n = 0;
  return {
    poner(f, ms) {
      expect(ms).toBe(TOPE_DE_LA_VENTANA);
      plazos.set(++n, f);
      return n;
    },
    quitar(id) {
      plazos.delete(id as number);
    },
    disparar() {
      for (const [id, f] of [...plazos]) {
        plazos.delete(id);
        f();
      }
    },
    get pendientes() {
      return plazos.size;
    },
  };
}

describe("la ventana sale y se va con la historia", () => {
  it("sale cuando empieza a sonar, no cuando se pide, y se va cuando acaba", () => {
    const v = ventanaQueApunta();
    const reloj = relojDeMentira();
    const alSonar = alSonarLaHistoria(v, "hierro", reloj);
    expect(v.puesta).toBeNull();
    alSonar("empieza");
    expect(v.puesta).toBe("hierro");
    alSonar("acaba");
    expect(v.puesta).toBeNull();
    expect(reloj.pendientes).toBe(0);
  });

  it.each(["cortada", "no-suena", "se-cae"] as const)("y si la historia queda %s, también se va", (que) => {
    const v = ventanaQueApunta();
    const reloj = relojDeMentira();
    const alSonar = alSonarLaHistoria(v, "iguazu", reloj);
    alSonar("empieza");
    alSonar(que);
    expect(v.puesta).toBeNull();
    expect(reloj.pendientes).toBe(0);
  });

  it("si nadie dice que acabó, se va sola al minuto", () => {
    const v = ventanaQueApunta();
    const reloj = relojDeMentira();
    alSonarLaHistoria(v, "teide", reloj)("empieza");
    expect(v.puesta).toBe("teide");
    reloj.disparar();
    expect(v.puesta).toBeNull();
  });

  it("y el final de una historia vieja no quita la foto de la nueva", () => {
    const v = ventanaQueApunta();
    const reloj = relojDeMentira();
    const vieja = alSonarLaHistoria(v, "teide", reloj);
    const nueva = alSonarLaHistoria(v, "anaga", reloj);
    vieja("empieza");
    nueva("empieza");
    vieja("se-cae");
    expect(v.puesta).toBe("anaga");
  });
});

describe("cada historia con foto la enlaza", () => {
  const sitio = (clave: string): Hito => ({ nombre: clave, clase: "montana", x: 0, z: 0, ele: null, clave });
  const historias = Object.keys(ES_PY)
    .map((k) => /^ventanilla\.historia\.(.+)$/.exec(k)?.[1])
    .filter((x): x is string => !!x);

  it.each(historias.map((h) => [h]))("%s lleva su sitio, y el sitio su foto, en los dos registros", (h) => {
    for (const conPasaje of [true, false]) {
      const historia = laHistoria({ hito: sitio(h), lado: "izquierda", distancia: 20_000, desdeElMorro: 70 }, conPasaje)!;
      expect(historia.sitio).toBe(h);
      if (h in SIN_FOTO) expect(fotoDeLaHistoria(h)).toBeNull();
      else expect(fotoDeLaHistoria(historia.sitio!)?.url).toBeTruthy();
    }
    expect(h in FOTOS || h in SIN_FOTO).toBe(true);
  });
});
