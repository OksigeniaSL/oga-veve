/**
 * **Luz verde**: que se gana siempre, que dura lo que tiene que durar, que la
 * roja manda al circuito y se celebra, que con la pista ocupada el segundo se
 * va al aire solo —y también se celebra— y que el avión contesta como de
 * verdad: alabeando, salvo en base y en final, y de noche con los faros.
 */
import { describe, expect, it } from "vitest";
import VOZ_DE_ARA from "../../data/voces/ara/manifiesto.json";
import { trozoDe } from "../audio/cancion";
import { ENTRE_FRASES } from "./conversacion";
import type { Peldano } from "./escalera";
import { DICHO_DE_LA_LUZ, JuegoDeLaLuz, type Senal } from "./luz-verde";

const PASO = 0.05;

/** Lo que dura cada frase grabada de Ara, s, más el respiro entre dos. */
const DURA = (clave: string): number =>
  ((VOZ_DE_ARA as { piezas: Record<string, { ms: number } | undefined> }).piezas[clave]?.ms ?? 6000) / 1000 + ENTRE_FRASES;

/**
 * **El rato para jugar**, s: de que se elige la torre a que la tripulante pide
 * guardar el kit. Medido en el banco el 19-10-2026: 175 s entre que lo trae y
 * que lo pide, menos los veinte de la megafonía de La Gomera, que lo pausa, y
 * lo que se tarda en darle las gracias, abrirlo y elegir. Ver `BAJANDO.kit`
 * en `inicio-pasaje.ts`.
 */
const RATO_PARA_JUGAR = 140;

/**
 * Juega como quien hace caso a lo que brilla, tardando `tarda` s en reaccionar.
 * Con `conVoz`, la conversación calla lo que duran las grabaciones de Ara, y se
 * cuenta hasta que acaba el «¡aterrizaron todos!». Devuelve lo que duró y lo dicho.
 */
function jugarHaciendoCaso(
  peldano: Peldano,
  tarda = 1.5,
  tope = 600,
  conVoz = false,
): { segundos: number; dicho: string[]; juego: JuegoDeLaLuz } {
  const j = new JuegoDeLaLuz(peldano);
  const dicho: string[] = [];
  let t = 0;
  let viendo: Senal | null = null;
  let desde = 0;
  const cola: string[] = [];
  let hablaHasta = 0;
  while ((!j.terminado || (conVoz && (cola.length > 0 || t < hablaHasta))) && t < tope) {
    j.paso(PASO, !conVoz || (cola.length === 0 && t >= hablaHasta));
    t += PASO;
    const nuevas = j.tomarLoQueDecir().map((l) => l.clave);
    dicho.push(...nuevas);
    cola.push(...nuevas);
    if (t >= hablaHasta && cola.length) hablaHasta = t + DURA(cola.shift()!);
    const e = j.estado;
    if (e.ayuda !== viendo) {
      viendo = e.ayuda;
      desde = t;
    }
    if (viendo && t - desde >= tarda) {
      j.encender(viendo);
      viendo = null;
    }
  }
  return { segundos: t, dicho, juego: j };
}

describe("luz verde", () => {
  it("lo primero que se dice es el plan B: lo normal es la radio", () => {
    const j = new JuegoDeLaLuz();
    const primero = j.tomarLoQueDecir().map((l) => l.clave);
    expect(primero.slice(0, 2)).toEqual([DICHO_DE_LA_LUZ.radio.clave, DICHO_DE_LA_LUZ.empezar.clave]);
  });

  for (const peldano of ["dibujo", "palabra", "cifra", "cabina"] as const)
    it(`se gana siempre, haciendo caso a lo que brilla, y dura minuto y pico: ${peldano}`, () => {
      const { segundos, dicho, juego } = jugarHaciendoCaso(peldano);
      expect(juego.terminado).toBe(true);
      expect(dicho).toContain(DICHO_DE_LA_LUZ.fin.clave);
      expect(segundos).toBeGreaterThan(55);
      expect(segundos).toBeLessThan(85);
      // Y que se juega con calma: con un niño de cuatro años que tarda en tocar, también se acaba.
      const despacio = jugarHaciendoCaso(peldano, 6);
      expect(despacio.juego.terminado).toBe(true);
    });

  /*
   * **Y cabe en la bajada, con la canción** (19-10-2026): entre que se elige
   * la torre y que la tripulante pide guardar el kit hay unos 140 s; en ellos,
   * lo que cuenta Ara —con lo que dura cada grabación—, las rondas, el «¡aterrizaron
   * todos!» y el trozo de canción, con un cuarto de minuto de margen.
   */
  for (const peldano of ["dibujo", "palabra", "cifra", "cabina"] as const)
    it(`cabe entero en la bajada, con lo que cuenta Ara y la canción: ${peldano}`, () => {
      for (const tarda of [1.5, 3]) {
        const { segundos } = jugarHaciendoCaso(peldano, tarda, 600, true);
        expect(segundos + trozoDe("luz-verde").dura, `${peldano}, tardando ${tarda} s`).toBeLessThan(RATO_PARA_JUGAR - 15);
      }
    });

  for (const [peldano, ademas] of [
    ["dibujo", []],
    ["palabra", []],
    ["cifra", ["destellosRojos", "destellosVerdes"]],
    ["cabina", ["destellosRojos", "destellosVerdes", "noche"]],
  ] as const)
    it(`en cada peldaño se ve entero lo que enseña, sin que nadie se vaya al aire: ${peldano}`, () => {
      const { dicho, juego } = jugarHaciendoCaso(peldano);
      for (const c of ["conRadio", "alas", "sinAlas", "roja", ...ademas] as const)
        expect(dicho, c).toContain(DICHO_DE_LA_LUZ[c].clave);
      expect(juego.estado.rondas).toBe(2);
      expect(juego.estado.alAire).toBe(0);
    });

  it("se gana siempre, aunque se toque cualquier cosa, y al final haciendo caso", () => {
    // Un sorteo fijo: cualquier luz, a cualquier hora, el primer minuto y medio.
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const j = new JuegoDeLaLuz("cifra");
    let t = 0;
    while (!j.terminado && t < 900) {
      j.paso(PASO, true);
      t += PASO;
      j.tomarLoQueDecir();
      if (t < 90 && azar() < 0.02) j.encender(j.luces[Math.floor(azar() * j.luces.length)]!);
      if (t < 90 && azar() < 0.02) {
        const a = j.estado.aviones;
        if (a.length) j.apuntar(a[Math.floor(azar() * a.length)]!.id);
      }
      if (t >= 90 && j.estado.ayuda && azar() < 0.05) j.encender(j.estado.ayuda);
    }
    expect(j.terminado).toBe(true);
  });

  it("la roja manda al circuito: no aterriza, da otra vuelta y se celebra", () => {
    const j = new JuegoDeLaLuz();
    const dicho: string[] = [];
    // Hasta que llegan: el de la radio, que aterriza solo, y el que pide luz.
    while (j.estado.aviones.length === 0) j.paso(PASO, true);
    dicho.push(...j.tomarLoQueDecir().map((l) => l.clave));
    j.encender("roja");
    const conRoja = j.estado.aviones.find((a) => a.luz === "roja")!;
    expect(conRoja.radio).toBe(false);
    const el = () => j.estado.aviones.find((a) => a.id === conRoja.id)!;
    // Una vuelta entera, casi: no toca la pista.
    for (let t = 0; t < 26; t += PASO) {
      j.paso(PASO, true);
      dicho.push(...j.tomarLoQueDecir().map((l) => l.clave));
      expect(el().enVuelo).toBe(true);
    }
    const e = j.estado;
    expect(e.rojas).toBe(1);
    // Solo aterrizó el de la radio.
    expect(e.aterrizados).toBe(1);
    expect(dicho).toContain(DICHO_DE_LA_LUZ.roja.clave);
  });

  it("con verde a los dos y la pista ocupada, el segundo se va al aire solo, y se celebra", () => {
    const j = new JuegoDeLaLuz();
    const dicho: string[] = [];
    // La primera ronda, con verde en cuanto llega.
    while (j.estado.ronda === 0) {
      j.paso(PASO, true);
      if (j.estado.aviones.some((a) => a.enVuelo && !a.autorizado)) j.encender("verde");
      j.tomarLoQueDecir();
    }
    // La segunda: verde a los dos en cuanto aparecen.
    while (j.estado.aviones.filter((a) => a.enVuelo).length < 2) j.paso(PASO, true);
    for (const a of j.estado.aviones) {
      j.apuntar(a.id);
      j.encender("verde");
    }
    for (let t = 0; t < 30; t += PASO) {
      j.paso(PASO, true);
      dicho.push(...j.tomarLoQueDecir().map((l) => l.clave));
    }
    expect(j.estado.alAire).toBeGreaterThanOrEqual(1);
    expect(dicho).toContain(DICHO_DE_LA_LUZ.alAire.clave);
    // Y nunca dos en la pista a la vez.
  });

  it("nunca hay dos en la pista a la vez", () => {
    for (const tarda of [0.2, 1.5, 4]) {
      const j = new JuegoDeLaLuz("cabina");
      let t = 0;
      while (!j.terminado && t < 600) {
        j.paso(PASO, true);
        t += PASO;
        j.tomarLoQueDecir();
        // Verde a todo lo que vuele, sin mirar: lo peor que puede hacer quien juega.
        if (Math.round(t / PASO) % Math.round(tarda / PASO) === 0)
          for (const a of j.estado.aviones) {
            j.apuntar(a.id);
            j.encender("verde");
          }
        const enPista = j.estado.aviones.filter((a) => a.tramo === "pista");
        expect(enPista.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("contesta alabeando, salvo en base y en final; de noche, con los faros", () => {
    const { juego } = jugarHaciendoCaso("cabina");
    const c = juego.estado.contestaciones;
    expect(c.some((x) => x.tipo === "alas")).toBe(true);
    expect(c.some((x) => x.tipo === "sigue")).toBe(true);
    expect(c.some((x) => x.tipo === "faros")).toBe(true);
    for (const x of c) if (x.tramo === "base" || x.tramo === "final") expect(x.tipo).not.toBe("alas");
    for (const x of c) if (x.tipo === "sigue") expect(["base", "final"]).toContain(x.tramo);
  });

  it("abajo, verde y roja fijas; arriba, también los destellos", () => {
    expect(new JuegoDeLaLuz("dibujo").luces).toEqual(["verde", "roja"]);
    expect(new JuegoDeLaLuz("palabra").luces).toEqual(["verde", "roja"]);
    expect(new JuegoDeLaLuz("cifra").luces).toHaveLength(4);
    // Y una luz que no está en la lámpara no se enciende.
    const j = new JuegoDeLaLuz("dibujo");
    while (j.estado.aviones.length === 0) j.paso(PASO, true);
    j.encender("roja-destellos");
    expect(j.estado.haz).toBeNull();
  });

  it("los que tienen la radio bien aterrizan solos, sin luz: lo normal", () => {
    const { dicho, juego } = jugarHaciendoCaso("dibujo");
    expect(dicho).toContain(DICHO_DE_LA_LUZ.conRadio.clave);
    // Dos rondas de dos, con el de la radio en la primera; aterrizan todos.
    expect(juego.estado.aterrizados).toBe(4);
  });
});
