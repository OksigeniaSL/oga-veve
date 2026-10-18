/**
 * El kit de viaje de Ara: que cada juego se gana siempre, haga lo que haga
 * quien juega; que se le ayuda en vez de castigarle; que se puede dejar; que
 * se pausa con la megafonía y se recoge para aterrizar. Ver
 * `flight/kit-de-viaje.ts`. Lo mismo dentro del vuelo, con la escena, en
 * `inicio-pasaje.test.ts`; y con el dedo en el navegador, en
 * `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import { ES_PY } from "../i18n/es-PY";
import { Conversacion, type Linea } from "./conversacion";
import { EN } from "../i18n/en";
import {
  DICHO_DE_LAS_PIEZAS,
  DICHO_DEL_CAMINO,
  JuegoDeLasPiezas,
  JuegoDelCamino,
  KitDeViaje,
  LINEAS_DEL_KIT,
  LO_QUE_HAY,
  PARADAS,
  PARA_QUE_SIRVE,
  PIEZAS,
  type Pieza,
} from "./kit-de-viaje";

/** Un azar con semilla, para que lo que falla se pueda repetir. */
function azar(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const claves = (lineas: readonly { clave: string }[]): string[] => lineas.map((l) => l.clave);

describe("las frases del kit", () => {
  it("cada una con su texto en castellano paraguayo y en inglés, de Ara, de vos, y ninguna corta", () => {
    for (const l of LINEAS_DEL_KIT) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
      expect(l.quien, l.clave).toBe("ara");
      expect(es.length, l.clave).toBeGreaterThanOrEqual(30);
      // Ara le habla a quien juega a su lado de vos, como en toda la escena: sin «tú».
      expect(es, l.clave).not.toMatch(/\b(tú|tienes|puedes|quieres|mira|toca|coge)\b/i);
    }
  });
});

describe("armá el avión", () => {
  it("se gana con el dedo, pieza a pieza, y Ara dice para qué sirve cada una", () => {
    const j = new JuegoDeLasPiezas();
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DE_LAS_PIEZAS.empezar.clave]);
    for (const p of ["cola", "ala", "ruedas", "motor"] as const) expect(j.soltar(p, p)).toBe(true);
    expect(j.terminado).toBe(true);
    expect(claves(j.tomarLoQueDecir())).toEqual([
      PARA_QUE_SIRVE.cola.clave,
      PARA_QUE_SIRVE.ala.clave,
      PARA_QUE_SIRVE.ruedas.clave,
      PARA_QUE_SIRVE.motor.clave,
      DICHO_DE_LAS_PIEZAS.fin.clave,
    ]);
  });

  it("una pieza en otro sitio vuelve, su sitio se ilumina, y Ara ayuda sin regañar", () => {
    const j = new JuegoDeLasPiezas();
    j.tomarLoQueDecir();
    expect(j.soltar("motor", "cola")).toBe(false);
    expect(j.estado.puestas).toEqual([]);
    expect(j.estado.ilumina).toBe("motor");
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DE_LAS_PIEZAS.ayuda.clave]);
    // Y soltada en nada, también se ayuda, pero no se le repite al oído enseguida.
    expect(j.soltar("motor", null)).toBe(false);
    expect(j.tomarLoQueDecir()).toEqual([]);
    // Acertar apaga la ayuda.
    j.soltar("motor", "motor");
    expect(j.estado.ilumina).toBeNull();
  });

  it("a la segunda que no encuentra su sitio, tocarla la lleva sola", () => {
    const j = new JuegoDeLasPiezas();
    j.soltar("ruedas", "ala");
    j.soltar("ruedas", "cola");
    j.tocarPieza("ruedas");
    expect(j.puesta("ruedas")).toBe(true);
  });

  it("sin arrastrar: un toque en la pieza y otro en su sitio", () => {
    const j = new JuegoDeLasPiezas();
    j.tocarPieza("ala");
    expect(j.estado.cogida).toBe("ala");
    j.tocarSitio("ala");
    expect(j.puesta("ala")).toBe(true);
    // Y un toque en un sitio vacío, sin nada en la mano, señala su pieza en la bandeja.
    j.tocarSitio("cola");
    expect(j.estado.senala).toBe("cola");
  });

  it("con el teclado, la pieza va directa a su sitio", () => {
    const j = new JuegoDeLasPiezas();
    for (const p of PIEZAS) j.colocar(p);
    expect(j.terminado).toBe(true);
  });

  it("y si pasa un rato sin acertar, se ilumina lo que toca, primero sin palabras", () => {
    const j = new JuegoDeLasPiezas();
    j.tomarLoQueDecir();
    for (let t = 0; t < 13; t += 0.1) j.paso(0.1, true);
    expect(j.estado.ilumina).toBe("ala");
    expect(j.tomarLoQueDecir()).toEqual([]);
    for (let t = 0; t < 13; t += 0.1) j.paso(0.1, true);
    // La segunda vez, con lo que hay que hacer.
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DE_LAS_PIEZAS.empezar.clave]);
  });

  it("se gana siempre: quien arrastra a lo loco acaba con el avión armado", () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const r = azar(semilla);
      const j = new JuegoDeLasPiezas();
      let intentos = 0;
      while (!j.terminado && intentos < 200) {
        const quedan = PIEZAS.filter((p) => !j.puesta(p));
        const p = quedan[Math.floor(r() * quedan.length)]!;
        const sitios: (Pieza | null)[] = [...PIEZAS, null];
        const en = sitios[Math.floor(r() * sitios.length)]!;
        // A veces arrastra, a veces toca la pieza: las dos formas de jugar.
        if (r() < 0.5) j.soltar(p, en);
        else j.tocarPieza(p);
        j.paso(0.5, true);
        intentos++;
      }
      expect(j.terminado, `semilla ${semilla}`).toBe(true);
      expect(intentos, `semilla ${semilla}`).toBeLessThan(60);
    }
  });
});

describe("el camino del avión", () => {
  it("se gana tocando los números en orden, y Ara dice qué es cada sitio", () => {
    const j = new JuegoDelCamino();
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_CAMINO.empezar.clave]);
    for (const p of PARADAS.slice(1)) j.tocar(p);
    expect(j.terminado).toBe(true);
    expect(claves(j.tomarLoQueDecir())).toEqual([
      "inicio.ara.pasaje.kit.camino.teide",
      "inicio.ara.pasaje.kit.camino.gomera",
      "inicio.ara.pasaje.kit.camino.palma",
    ]);
  });

  it("uno de más adelante deja brillar el que va, y uno ya unido no hace nada", () => {
    const j = new JuegoDelCamino();
    j.tomarLoQueDecir();
    j.tocar("palma");
    expect(j.estado.hechas).toBe(1);
    expect(j.estado.ilumina).toBe("teide");
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_CAMINO.ayuda.clave]);
    j.tocar("tenerife");
    expect(j.estado.hechas).toBe(1);
    j.tocar("teide");
    expect(j.estado.hechas).toBe(2);
    expect(j.estado.ilumina).toBeNull();
  });

  it("se gana siempre: quien toca a lo loco acaba con el camino dibujado", () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const r = azar(semilla);
      const j = new JuegoDelCamino();
      let toques = 0;
      while (!j.terminado && toques < 400) {
        j.tocar(PARADAS[Math.floor(r() * PARADAS.length)]!);
        j.paso(0.5, true);
        toques++;
      }
      expect(j.terminado, `semilla ${semilla}`).toBe(true);
    }
  });
});

describe("el kit", () => {
  it("no se abre hasta que la tripulante lo da, y la primera vez Ara dice qué hay", () => {
    const k = new KitDeViaje();
    k.abrir();
    expect(k.estado.abierto).toBe(false);
    k.dar();
    k.abrir();
    expect(k.estado.abierto).toBe(true);
    expect(claves(k.tomarLoQueDecir())).toEqual([LO_QUE_HAY.clave]);
    k.cerrar();
    k.abrir();
    expect(k.tomarLoQueDecir()).toEqual([]);
  });

  it("se puede dejar cuando se quiera, y el juego se queda donde estaba", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("piezas");
    (k.juego as JuegoDeLasPiezas).soltar("ala", "ala");
    k.cerrar();
    expect(k.estado.abierto).toBe(false);
    // Lo que quería decir y no llegó, ya no se dice.
    expect(k.tomarLoQueDecir()).toEqual([]);
    k.abrir();
    k.elegir("piezas");
    expect((k.estado.juego as unknown as { puestas: Pieza[] }).puestas).toEqual(["ala"]);
  });

  it("se pausa con la megafonía: no se juega, y vuelve donde estaba", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("camino");
    k.paso(0.1, { megafonia: true, callada: false });
    expect(k.estado.pausado).toBe(true);
    expect(k.juego).toBeNull();
    k.elegir("piezas");
    expect(k.estado.juego?.juego).toBe("camino");
    // Ni corre el reloj de la ayuda mientras habla.
    for (let t = 0; t < 30; t += 0.1) k.paso(0.1, { megafonia: true, callada: false });
    expect((k.estado.juego as { ilumina: unknown }).ilumina).toBeNull();
    k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.pausado).toBe(false);
    expect(k.juego?.juego).toBe("camino");
  });

  it("se recoge para aterrizar: se cierra y ya no se abre", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("piezas");
    k.recoger();
    expect(k.estado.abierto).toBe(false);
    expect(k.estado.recogido).toBe(true);
    k.abrir();
    expect(k.estado.abierto).toBe(false);
    expect(k.aMano).toBe(false);
  });

  it("un juego terminado se queda a la vista su rato y vuelve a elegir, con su estrella", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("camino");
    for (const p of PARADAS.slice(1)) (k.juego as JuegoDelCamino).tocar(p);
    k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.juego?.terminado).toBe(true);
    for (let t = 0; t < 9; t += 0.1) k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.juego).toBeNull();
    expect(k.estado.hechos).toEqual(["camino"]);
  });

  it("abierto y sin tocarlo, al rato deja de ocupar a Ara: la escena vuelve a contar", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    expect(k.ocupaAAra).toBe(true);
    for (let t = 0; t < 50; t += 0.5) k.paso(0.5, { megafonia: false, callada: true });
    expect(k.ocupaAAra).toBe(false);
    k.tocado();
    expect(k.ocupaAAra).toBe(true);
  });
});

describe("la megafonía sin voz también cuenta", () => {
  it("lo que suena es también lo que se está leyendo, si no pudo sonar", () => {
    let t = 0;
    const anuncio: Linea = { quien: "tripulacion", clave: "inicio.tripulacion.pasaje.oidos", megafonia: true };
    // Una voz que no puede: avisa enseguida, con el rato de leerla.
    const charla = new Conversacion({ decir: (_l, alAcabar) => alAcabar(4), callar: () => {} }, () => t);
    charla.decir([anuncio]);
    charla.atender();
    t = 1;
    expect(charla.suena).toBe(anuncio);
    t = 4.2;
    expect(charla.suena).toBeNull();
  });
});
